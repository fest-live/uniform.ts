/**
 * SharedArrayBuffer + Atomics Transport
 *
 * High-performance inter-worker communication using shared memory.
 * Uses CBOR-X for efficient binary serialization.
 *
 * Features:
 * - Zero-copy message passing between workers
 * - Lock-free synchronization with Atomics
 * - CBOR-X encoding for compact binary format
 * - Supports ArrayBuffer.transfer() for ownership transfer
 *
 * References:
 * - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Atomics
 * - https://tc39.es/ecma262/multipage/memory-model.html
 * - https://github.com/kriszyp/cbor-x
 */

import { UUIDv4 } from "fest/core";
import { Observable, ChannelSubject, type Subscription, type Observer } from "../observable/Observable";
import type { ChannelMessage, PendingRequest, Subscriber } from "../types/Interface";

// ============================================================================
// CBOR-X INTERFACE (Dynamic Import)
// ============================================================================

interface CBOREncoder {
    encode(value: any): Uint8Array;
    decode(data: Uint8Array): any;
}

let cborEncoder: CBOREncoder | null = null;

async function getCBOREncoder(): Promise<CBOREncoder> {
    if (cborEncoder) return cborEncoder;

    try {
        // @ts-ignore - Dynamic import of cbor-x
        const cborx = await import("cbor-x");
        cborEncoder = {
            encode: (v) => cborx.encode(v),
            decode: (d) => cborx.decode(d)
        };
    } catch {
        // Fallback to JSON with typed array support
        cborEncoder = {
            encode: (v) => new TextEncoder().encode(JSON.stringify(v, replacer)),
            decode: (d) => JSON.parse(new TextDecoder().decode(d), reviver)
        };
    }

    return cborEncoder;
}

// JSON serialization with TypedArray support
function replacer(_key: string, value: any): any {
    if (ArrayBuffer.isView(value) && !(value instanceof DataView)) {
        return {
            __typedArray: true,
            type: value.constructor.name,
            data: Array.from(value as any)
        };
    }
    if (value instanceof ArrayBuffer) {
        return {
            __arrayBuffer: true,
            data: Array.from(new Uint8Array(value))
        };
    }
    return value;
}

function reviver(_key: string, value: any): any {
    if (value?.__typedArray) {
        const TypedArrayCtor = (globalThis as any)[value.type];
        return TypedArrayCtor ? new TypedArrayCtor(value.data) : value.data;
    }
    if (value?.__arrayBuffer) {
        return new Uint8Array(value.data).buffer;
    }
    return value;
}

// ============================================================================
// TYPES
// ============================================================================

export interface AtomicsMessage<T = any> extends ChannelMessage {
    /** Message sequence number */
    seq?: number;
    /** Worker ID that sent the message */
    workerId?: string;
}

export interface AtomicsTransportConfig {
    /** Size of shared buffer in bytes (default: 64KB) */
    bufferSize?: number;
    /** Maximum message size (default: 60KB) */
    maxMessageSize?: number;
    /** Enable message compression (requires CBOR-X) */
    compression?: boolean;
    /** Timeout for atomic wait operations (ms) */
    waitTimeout?: number;
    /** Use Atomics.waitAsync when available (non-blocking) */
    useAsyncWait?: boolean;
}

/** Shared memory layout constants */
const HEADER_SIZE = 32;  // Control header size
const LOCK_OFFSET = 0;   // Lock flag (Int32)
const SEQ_OFFSET = 4;    // Sequence number (Int32)
const SIZE_OFFSET = 8;   // Message size (Int32)
const FLAGS_OFFSET = 12; // Flags (Int32)
const READY_OFFSET = 16; // Ready signal (Int32)
const ACK_OFFSET = 20;   // Acknowledgment (Int32)
const DATA_OFFSET = HEADER_SIZE;

// Flag bits
const FLAG_HAS_TRANSFER = 1 << 0;
const FLAG_COMPRESSED = 1 << 1;
const FLAG_RESPONSE = 1 << 2;

// ============================================================================
// ATOMICS BUFFER MANAGER
// ============================================================================

export class AtomicsBuffer {
    private _sharedBuffer: SharedArrayBuffer;
    private _int32View: Int32Array;
    private _uint8View: Uint8Array;
    private _maxDataSize: number;

    constructor(
        bufferOrSize: SharedArrayBuffer | number = 65536,
        private _config: AtomicsTransportConfig = {}
    ) {
        if (typeof bufferOrSize === "number") {
            this._sharedBuffer = new SharedArrayBuffer(bufferOrSize);
        } else {
            this._sharedBuffer = bufferOrSize;
        }

        this._int32View = new Int32Array(this._sharedBuffer);
        this._uint8View = new Uint8Array(this._sharedBuffer);
        this._maxDataSize = this._config.maxMessageSize ?? (this._sharedBuffer.byteLength - HEADER_SIZE);
    }

    /**
     * Write message to shared buffer with lock
     */
    async write(data: Uint8Array, flags: number = 0): Promise<boolean> {
        if (data.byteLength > this._maxDataSize) {
            throw new Error(`Message too large: ${data.byteLength} > ${this._maxDataSize}`);
        }

        // Acquire lock using compare-and-swap
        while (Atomics.compareExchange(this._int32View, LOCK_OFFSET / 4, 0, 1) !== 0) {
            // Spin-wait with backoff
            const result = this._config.useAsyncWait && "waitAsync" in Atomics
                // @ts-ignore - waitAsync is newer API
                ? await Atomics.waitAsync(this._int32View, LOCK_OFFSET / 4, 1, this._config.waitTimeout ?? 100).value
                : Atomics.wait(this._int32View, LOCK_OFFSET / 4, 1, this._config.waitTimeout ?? 100);

            if (result === "timed-out") continue;
        }

        try {
            // Write message size
            Atomics.store(this._int32View, SIZE_OFFSET / 4, data.byteLength);

            // Write flags
            Atomics.store(this._int32View, FLAGS_OFFSET / 4, flags);

            // Copy data
            this._uint8View.set(data, DATA_OFFSET);

            // Increment sequence
            Atomics.add(this._int32View, SEQ_OFFSET / 4, 1);

            // Signal ready
            Atomics.store(this._int32View, READY_OFFSET / 4, 1);
            Atomics.notify(this._int32View, READY_OFFSET / 4);

            return true;
        } finally {
            // Release lock
            Atomics.store(this._int32View, LOCK_OFFSET / 4, 0);
            Atomics.notify(this._int32View, LOCK_OFFSET / 4);
        }
    }

    /**
     * Read message from shared buffer
     */
    async read(): Promise<{ data: Uint8Array; flags: number; seq: number } | null> {
        // Wait for ready signal
        const readyValue = Atomics.load(this._int32View, READY_OFFSET / 4);
        if (readyValue === 0) {
            const result = this._config.useAsyncWait && "waitAsync" in Atomics
                // @ts-ignore - waitAsync is newer API
                ? await Atomics.waitAsync(this._int32View, READY_OFFSET / 4, 0, this._config.waitTimeout ?? 1000).value
                : Atomics.wait(this._int32View, READY_OFFSET / 4, 0, this._config.waitTimeout ?? 1000);

            if (result === "timed-out") return null;
        }

        // Read message
        const size = Atomics.load(this._int32View, SIZE_OFFSET / 4);
        const flags = Atomics.load(this._int32View, FLAGS_OFFSET / 4);
        const seq = Atomics.load(this._int32View, SEQ_OFFSET / 4);

        if (size <= 0 || size > this._maxDataSize) return null;

        // Copy data out
        const data = new Uint8Array(size);
        data.set(this._uint8View.subarray(DATA_OFFSET, DATA_OFFSET + size));

        // Clear ready signal
        Atomics.store(this._int32View, READY_OFFSET / 4, 0);

        // Send acknowledgment
        Atomics.add(this._int32View, ACK_OFFSET / 4, 1);
        Atomics.notify(this._int32View, ACK_OFFSET / 4);

        return { data, flags, seq };
    }

    /**
     * Wait for acknowledgment
     */
    async waitAck(expectedSeq: number): Promise<boolean> {
        const timeout = this._config.waitTimeout ?? 5000;
        const start = Date.now();

        while (Date.now() - start < timeout) {
            const ack = Atomics.load(this._int32View, ACK_OFFSET / 4);
            if (ack >= expectedSeq) return true;

            if (this._config.useAsyncWait && "waitAsync" in Atomics) {
                // @ts-ignore
                await Atomics.waitAsync(this._int32View, ACK_OFFSET / 4, ack, 100).value;
            } else {
                await new Promise(r => setTimeout(r, 10));
            }
        }

        return false;
    }

    get buffer(): SharedArrayBuffer { return this._sharedBuffer; }
    get currentSeq(): number { return Atomics.load(this._int32View, SEQ_OFFSET / 4); }
}

// ============================================================================
// ATOMICS TRANSPORT
// ============================================================================

export class AtomicsTransport {
    private _sendBuffer: AtomicsBuffer;
    private _recvBuffer: AtomicsBuffer;
    private _encoder: CBOREncoder | null = null;
    private _subs = new Set<Observer<AtomicsMessage>>();
    private _pending = new Map<string, PendingRequest>();
    private _polling = false;
    private _pollAbort: AbortController | null = null;
    private _workerId: string = UUIDv4();
    private _lastSeq = 0;
    private _state = new ChannelSubject<"ready" | "polling" | "stopped" | "error">();

    constructor(
        private _channelName: string,
        sendBuffer: SharedArrayBuffer | AtomicsBuffer,
        recvBuffer: SharedArrayBuffer | AtomicsBuffer,
        private _config: AtomicsTransportConfig = {}
    ) {
        this._sendBuffer = sendBuffer instanceof AtomicsBuffer
            ? sendBuffer : new AtomicsBuffer(sendBuffer, _config);
        this._recvBuffer = recvBuffer instanceof AtomicsBuffer
            ? recvBuffer : new AtomicsBuffer(recvBuffer, _config);

        this._init();
    }

    private async _init(): Promise<void> {
        this._encoder = await getCBOREncoder();
        this._state.next("ready");
    }

    async send(msg: AtomicsMessage, transfer?: Transferable[]): Promise<void> {
        if (!this._encoder) await this._init();

        const { transferable, ...data } = msg as any;
        let flags = 0;

        // Handle transferables - encode references
        if (transfer?.length) {
            flags |= FLAG_HAS_TRANSFER;
            data._transferMeta = transfer.map((t, i) => ({
                index: i,
                type: t.constructor.name,
                // Use ArrayBuffer.transfer() if available (ES2024+)
                // @ts-ignore - Modern API
                transferred: t instanceof ArrayBuffer && "transfer" in t
            }));
        }

        const encoded = this._encoder!.encode(data);

        if (this._config.compression && encoded.length > 1024) {
            // Could add compression here
            flags |= FLAG_COMPRESSED;
        }

        await this._sendBuffer.write(encoded, flags);
    }

    async request(msg: Omit<AtomicsMessage, "reqId"> & { reqId?: string }): Promise<any> {
        const reqId = msg.reqId ?? UUIDv4();
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                this._pending.delete(reqId);
                reject(new Error("Request timeout"));
            }, this._config.waitTimeout ?? 30000);

            this._pending.set(reqId, {
                resolve: (v) => { clearTimeout(timeout); resolve(v); },
                reject: (e) => { clearTimeout(timeout); reject(e); },
                timestamp: Date.now()
            });

            this.send({ ...msg, reqId, type: "request" } as AtomicsMessage);
        });
    }

    subscribe(observer: Observer<AtomicsMessage> | ((v: AtomicsMessage) => void)): Subscription {
        const obs: Observer<AtomicsMessage> = typeof observer === "function" ? { next: observer } : observer;
        this._subs.add(obs);
        if (!this._polling) this._startPolling();
        return {
            closed: false,
            unsubscribe: () => {
                this._subs.delete(obs);
                if (this._subs.size === 0) this._stopPolling();
            }
        };
    }

    private async _startPolling(): Promise<void> {
        if (this._polling) return;
        this._polling = true;
        this._pollAbort = new AbortController();
        this._state.next("polling");

        while (this._polling && !this._pollAbort.signal.aborted) {
            try {
                const result = await this._recvBuffer.read();
                if (!result) continue;

                // Skip already processed messages
                if (result.seq <= this._lastSeq) continue;
                this._lastSeq = result.seq;

                const data = this._encoder!.decode(result.data) as AtomicsMessage;
                data.seq = result.seq;
                data.workerId = data.workerId ?? this._workerId;

                // Handle response
                if ((result.flags & FLAG_RESPONSE) || data.type === "response") {
                    if (data.reqId) {
                        const p = this._pending.get(data.reqId);
                        if (p) {
                            this._pending.delete(data.reqId);
                            if (data.payload?.error) p.reject(new Error(data.payload.error));
                            else p.resolve(data.payload?.result ?? data.payload);
                            continue;
                        }
                    }
                }

                for (const s of this._subs) {
                    try { s.next?.(data); } catch (e) { s.error?.(e as Error); }
                }
            } catch (e) {
                for (const s of this._subs) s.error?.(e as Error);
            }
        }
    }

    private _stopPolling(): void {
        this._polling = false;
        this._pollAbort?.abort();
        this._pollAbort = null;
        this._state.next("stopped");
    }

    close(): void {
        this._subs.forEach(s => s.complete?.());
        this._subs.clear();
        this._stopPolling();
    }

    get sendBuffer(): SharedArrayBuffer { return this._sendBuffer.buffer; }
    get recvBuffer(): SharedArrayBuffer { return this._recvBuffer.buffer; }
    get workerId(): string { return this._workerId; }
    get state() { return this._state; }
    get channelName(): string { return this._channelName; }
}

// ============================================================================
// BIDIRECTIONAL ATOMICS CHANNEL
// ============================================================================

export interface AtomicsChannelPair {
    main: AtomicsTransport;
    worker: { sendBuffer: SharedArrayBuffer; recvBuffer: SharedArrayBuffer };
}

/**
 * Create a bidirectional atomics channel for main<->worker communication
 */
export function createAtomicsChannelPair(
    channelName: string,
    config: AtomicsTransportConfig = {}
): AtomicsChannelPair {
    const bufferSize = config.bufferSize ?? 65536;
    const bufferA = new SharedArrayBuffer(bufferSize);
    const bufferB = new SharedArrayBuffer(bufferSize);

    // Main thread: sends to A, receives from B
    const main = new AtomicsTransport(channelName, bufferA, bufferB, config);

    // Worker: sends to B, receives from A (swapped)
    return {
        main,
        worker: { sendBuffer: bufferB, recvBuffer: bufferA }
    };
}

/**
 * Create worker-side atomics transport from buffers
 */
export function createWorkerAtomicsTransport(
    channelName: string,
    sendBuffer: SharedArrayBuffer,
    recvBuffer: SharedArrayBuffer,
    config: AtomicsTransportConfig = {}
): AtomicsTransport {
    return new AtomicsTransport(channelName, sendBuffer, recvBuffer, config);
}

// ============================================================================
// RING BUFFER (Advanced multi-message queue)
// ============================================================================

export interface RingBufferConfig {
    /** Total buffer size (must be power of 2) */
    bufferSize?: number;
    /** Individual slot size */
    slotSize?: number;
    /** Number of slots */
    slotCount?: number;
}

/**
 * Lock-free ring buffer for high-throughput message passing
 */
export class AtomicsRingBuffer {
    private _buffer: SharedArrayBuffer;
    private _meta: Int32Array;
    private _data: Uint8Array;
    private _slotSize: number;
    private _slotCount: number;
    private _mask: number;

    // Meta layout: [writeIndex, readIndex, overflow]
    private static META_SIZE = 16;
    private static WRITE_IDX = 0;
    private static READ_IDX = 4;
    private static OVERFLOW = 8;

    constructor(bufferOrConfig: SharedArrayBuffer | RingBufferConfig = {}) {
        if (bufferOrConfig instanceof SharedArrayBuffer) {
            this._buffer = bufferOrConfig;
            // Extract config from buffer size
            this._slotCount = 64;
            this._slotSize = (this._buffer.byteLength - AtomicsRingBuffer.META_SIZE) / this._slotCount;
        } else {
            this._slotSize = bufferOrConfig.slotSize ?? 1024;
            this._slotCount = bufferOrConfig.slotCount ?? 64;
            // Round up to power of 2
            this._slotCount = 1 << Math.ceil(Math.log2(this._slotCount));
            const totalSize = AtomicsRingBuffer.META_SIZE + (this._slotSize * this._slotCount);
            this._buffer = new SharedArrayBuffer(totalSize);
        }

        this._meta = new Int32Array(this._buffer, 0, AtomicsRingBuffer.META_SIZE / 4);
        this._data = new Uint8Array(this._buffer, AtomicsRingBuffer.META_SIZE);
        this._mask = this._slotCount - 1;
    }

    /**
     * Write message to ring buffer (non-blocking)
     */
    write(data: Uint8Array): boolean {
        if (data.byteLength > this._slotSize - 4) return false;

        const writeIdx = Atomics.load(this._meta, AtomicsRingBuffer.WRITE_IDX);
        const readIdx = Atomics.load(this._meta, AtomicsRingBuffer.READ_IDX);

        // Check if buffer is full
        if (((writeIdx + 1) & this._mask) === (readIdx & this._mask)) {
            Atomics.add(this._meta, AtomicsRingBuffer.OVERFLOW, 1);
            return false;
        }

        const slot = (writeIdx & this._mask) * this._slotSize;

        // Write size first (4 bytes)
        new DataView(this._buffer, AtomicsRingBuffer.META_SIZE + slot).setUint32(0, data.byteLength, true);

        // Write data
        this._data.set(data, slot + 4);

        // Update write index
        Atomics.store(this._meta, AtomicsRingBuffer.WRITE_IDX, writeIdx + 1);
        Atomics.notify(this._meta, AtomicsRingBuffer.WRITE_IDX);

        return true;
    }

    /**
     * Read message from ring buffer (non-blocking)
     */
    read(): Uint8Array | null {
        const writeIdx = Atomics.load(this._meta, AtomicsRingBuffer.WRITE_IDX);
        const readIdx = Atomics.load(this._meta, AtomicsRingBuffer.READ_IDX);

        // Check if buffer is empty
        if (readIdx === writeIdx) return null;

        const slot = (readIdx & this._mask) * this._slotSize;

        // Read size
        const size = new DataView(this._buffer, AtomicsRingBuffer.META_SIZE + slot).getUint32(0, true);
        if (size === 0 || size > this._slotSize - 4) return null;

        // Copy data
        const data = new Uint8Array(size);
        data.set(this._data.subarray(slot + 4, slot + 4 + size));

        // Update read index
        Atomics.store(this._meta, AtomicsRingBuffer.READ_IDX, readIdx + 1);

        return data;
    }

    /**
     * Wait for data to be available
     */
    async waitRead(timeout?: number): Promise<Uint8Array | null> {
        const writeIdx = Atomics.load(this._meta, AtomicsRingBuffer.WRITE_IDX);
        const readIdx = Atomics.load(this._meta, AtomicsRingBuffer.READ_IDX);

        if (readIdx < writeIdx) return this.read();

        // @ts-ignore
        if ("waitAsync" in Atomics) {
            // @ts-ignore
            const result = await Atomics.waitAsync(this._meta, AtomicsRingBuffer.WRITE_IDX, writeIdx, timeout ?? 1000).value;
            if (result === "ok") return this.read();
        } else {
            await new Promise(r => setTimeout(r, Math.min(timeout ?? 1000, 100)));
            return this.read();
        }

        return null;
    }

    get buffer(): SharedArrayBuffer { return this._buffer; }
    get available(): number {
        const w = Atomics.load(this._meta, AtomicsRingBuffer.WRITE_IDX);
        const r = Atomics.load(this._meta, AtomicsRingBuffer.READ_IDX);
        return (w - r) & this._mask;
    }
    get overflow(): number { return Atomics.load(this._meta, AtomicsRingBuffer.OVERFLOW); }
}

// ============================================================================
// FACTORY
// ============================================================================

export const AtomicsTransportFactory = {
    create: (name: string, send: SharedArrayBuffer, recv: SharedArrayBuffer, config?: AtomicsTransportConfig) =>
        new AtomicsTransport(name, send, recv, config),
    createPair: (name: string, config?: AtomicsTransportConfig) =>
        createAtomicsChannelPair(name, config),
    createBuffer: (sizeOrBuffer?: SharedArrayBuffer | number, config?: AtomicsTransportConfig) =>
        new AtomicsBuffer(sizeOrBuffer, config),
    createRingBuffer: (config?: RingBufferConfig) =>
        new AtomicsRingBuffer(config),
    getCBOR: getCBOREncoder
};
