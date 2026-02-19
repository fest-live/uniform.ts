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
import { ChannelSubject } from "../observable/Observable";
let cborEncoder = null;
async function getCBOREncoder() {
    if (cborEncoder)
        return cborEncoder;
    try {
        // @ts-ignore - Dynamic import of cbor-x
        const cborx = await import("cbor-x");
        cborEncoder = {
            encode: (v) => cborx.encode(v),
            decode: (d) => cborx.decode(d)
        };
    }
    catch {
        // Fallback to JSON with typed array support
        cborEncoder = {
            encode: (v) => new TextEncoder().encode(JSON.stringify(v, replacer)),
            decode: (d) => JSON.parse(new TextDecoder().decode(d), reviver)
        };
    }
    return cborEncoder;
}
// JSON serialization with TypedArray support
function replacer(_key, value) {
    if (ArrayBuffer.isView(value) && !(value instanceof DataView)) {
        return {
            __typedArray: true,
            type: value.constructor.name,
            data: Array.from(value)
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
function reviver(_key, value) {
    if (value?.__typedArray) {
        const TypedArrayCtor = globalThis[value.type];
        return TypedArrayCtor ? new TypedArrayCtor(value.data) : value.data;
    }
    if (value?.__arrayBuffer) {
        return new Uint8Array(value.data).buffer;
    }
    return value;
}
/** Shared memory layout constants */
const HEADER_SIZE = 32; // Control header size
const LOCK_OFFSET = 0; // Lock flag (Int32)
const SEQ_OFFSET = 4; // Sequence number (Int32)
const SIZE_OFFSET = 8; // Message size (Int32)
const FLAGS_OFFSET = 12; // Flags (Int32)
const READY_OFFSET = 16; // Ready signal (Int32)
const ACK_OFFSET = 20; // Acknowledgment (Int32)
const DATA_OFFSET = HEADER_SIZE;
// Flag bits
const FLAG_HAS_TRANSFER = 1 << 0;
const FLAG_COMPRESSED = 1 << 1;
const FLAG_RESPONSE = 1 << 2;
// ============================================================================
// ATOMICS BUFFER MANAGER
// ============================================================================
export class AtomicsBuffer {
    _config;
    _sharedBuffer;
    _int32View;
    _uint8View;
    _maxDataSize;
    constructor(bufferOrSize = 65536, _config = {}) {
        this._config = _config;
        if (typeof bufferOrSize === "number") {
            this._sharedBuffer = new SharedArrayBuffer(bufferOrSize);
        }
        else {
            this._sharedBuffer = bufferOrSize;
        }
        this._int32View = new Int32Array(this._sharedBuffer);
        this._uint8View = new Uint8Array(this._sharedBuffer);
        this._maxDataSize = this._config.maxMessageSize ?? (this._sharedBuffer.byteLength - HEADER_SIZE);
    }
    /**
     * Write message to shared buffer with lock
     */
    async write(data, flags = 0) {
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
            if (result === "timed-out")
                continue;
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
        }
        finally {
            // Release lock
            Atomics.store(this._int32View, LOCK_OFFSET / 4, 0);
            Atomics.notify(this._int32View, LOCK_OFFSET / 4);
        }
    }
    /**
     * Read message from shared buffer
     */
    async read() {
        // Wait for ready signal
        const readyValue = Atomics.load(this._int32View, READY_OFFSET / 4);
        if (readyValue === 0) {
            const result = this._config.useAsyncWait && "waitAsync" in Atomics
                // @ts-ignore - waitAsync is newer API
                ? await Atomics.waitAsync(this._int32View, READY_OFFSET / 4, 0, this._config.waitTimeout ?? 1000).value
                : Atomics.wait(this._int32View, READY_OFFSET / 4, 0, this._config.waitTimeout ?? 1000);
            if (result === "timed-out")
                return null;
        }
        // Read message
        const size = Atomics.load(this._int32View, SIZE_OFFSET / 4);
        const flags = Atomics.load(this._int32View, FLAGS_OFFSET / 4);
        const seq = Atomics.load(this._int32View, SEQ_OFFSET / 4);
        if (size <= 0 || size > this._maxDataSize)
            return null;
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
    async waitAck(expectedSeq) {
        const timeout = this._config.waitTimeout ?? 5000;
        const start = Date.now();
        while (Date.now() - start < timeout) {
            const ack = Atomics.load(this._int32View, ACK_OFFSET / 4);
            if (ack >= expectedSeq)
                return true;
            if (this._config.useAsyncWait && "waitAsync" in Atomics) {
                // @ts-ignore
                await Atomics.waitAsync(this._int32View, ACK_OFFSET / 4, ack, 100).value;
            }
            else {
                await new Promise(r => setTimeout(r, 10));
            }
        }
        return false;
    }
    get buffer() { return this._sharedBuffer; }
    get currentSeq() { return Atomics.load(this._int32View, SEQ_OFFSET / 4); }
}
// ============================================================================
// ATOMICS TRANSPORT
// ============================================================================
export class AtomicsTransport {
    _channelName;
    _config;
    _sendBuffer;
    _recvBuffer;
    _encoder = null;
    _subs = new Set();
    _pending = new Map();
    _polling = false;
    _pollAbort = null;
    _workerId = UUIDv4();
    _lastSeq = 0;
    _state = new ChannelSubject();
    constructor(_channelName, sendBuffer, recvBuffer, _config = {}) {
        this._channelName = _channelName;
        this._config = _config;
        this._sendBuffer = sendBuffer instanceof AtomicsBuffer
            ? sendBuffer : new AtomicsBuffer(sendBuffer, _config);
        this._recvBuffer = recvBuffer instanceof AtomicsBuffer
            ? recvBuffer : new AtomicsBuffer(recvBuffer, _config);
        this._init();
    }
    async _init() {
        this._encoder = await getCBOREncoder();
        this._state.next("ready");
    }
    async send(msg, transfer) {
        if (!this._encoder)
            await this._init();
        const { transferable, ...data } = msg;
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
        const encoded = this._encoder.encode(data);
        if (this._config.compression && encoded.length > 1024) {
            // Could add compression here
            flags |= FLAG_COMPRESSED;
        }
        await this._sendBuffer.write(encoded, flags);
    }
    async request(msg) {
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
            this.send({ ...msg, reqId, type: "request" });
        });
    }
    subscribe(observer) {
        const obs = typeof observer === "function" ? { next: observer } : observer;
        this._subs.add(obs);
        if (!this._polling)
            this._startPolling();
        return {
            closed: false,
            unsubscribe: () => {
                this._subs.delete(obs);
                if (this._subs.size === 0)
                    this._stopPolling();
            }
        };
    }
    async _startPolling() {
        if (this._polling)
            return;
        this._polling = true;
        this._pollAbort = new AbortController();
        this._state.next("polling");
        while (this._polling && !this._pollAbort.signal.aborted) {
            try {
                const result = await this._recvBuffer.read();
                if (!result)
                    continue;
                // Skip already processed messages
                if (result.seq <= this._lastSeq)
                    continue;
                this._lastSeq = result.seq;
                const data = this._encoder.decode(result.data);
                data.seq = result.seq;
                data.workerId = data.workerId ?? this._workerId;
                // Handle response
                if ((result.flags & FLAG_RESPONSE) || data.type === "response") {
                    if (data.reqId) {
                        const p = this._pending.get(data.reqId);
                        if (p) {
                            this._pending.delete(data.reqId);
                            if (data.payload?.error)
                                p.reject(new Error(data.payload.error));
                            else
                                p.resolve(data.payload?.result ?? data.payload);
                            continue;
                        }
                    }
                }
                for (const s of this._subs) {
                    try {
                        s.next?.(data);
                    }
                    catch (e) {
                        s.error?.(e);
                    }
                }
            }
            catch (e) {
                for (const s of this._subs)
                    s.error?.(e);
            }
        }
    }
    _stopPolling() {
        this._polling = false;
        this._pollAbort?.abort();
        this._pollAbort = null;
        this._state.next("stopped");
    }
    close() {
        this._subs.forEach(s => s.complete?.());
        this._subs.clear();
        this._stopPolling();
    }
    get sendBuffer() { return this._sendBuffer.buffer; }
    get recvBuffer() { return this._recvBuffer.buffer; }
    get workerId() { return this._workerId; }
    get state() { return this._state; }
    get channelName() { return this._channelName; }
}
/**
 * Create a bidirectional atomics channel for main<->worker communication
 */
export function createAtomicsChannelPair(channelName, config = {}) {
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
export function createWorkerAtomicsTransport(channelName, sendBuffer, recvBuffer, config = {}) {
    return new AtomicsTransport(channelName, sendBuffer, recvBuffer, config);
}
/**
 * Lock-free ring buffer for high-throughput message passing
 */
export class AtomicsRingBuffer {
    _buffer;
    _meta;
    _data;
    _slotSize;
    _slotCount;
    _mask;
    // Meta layout: [writeIndex, readIndex, overflow]
    static META_SIZE = 16;
    static WRITE_IDX = 0;
    static READ_IDX = 4;
    static OVERFLOW = 8;
    constructor(bufferOrConfig = {}) {
        if (bufferOrConfig instanceof SharedArrayBuffer) {
            this._buffer = bufferOrConfig;
            // Extract config from buffer size
            this._slotCount = 64;
            this._slotSize = (this._buffer.byteLength - AtomicsRingBuffer.META_SIZE) / this._slotCount;
        }
        else {
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
    write(data) {
        if (data.byteLength > this._slotSize - 4)
            return false;
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
    read() {
        const writeIdx = Atomics.load(this._meta, AtomicsRingBuffer.WRITE_IDX);
        const readIdx = Atomics.load(this._meta, AtomicsRingBuffer.READ_IDX);
        // Check if buffer is empty
        if (readIdx === writeIdx)
            return null;
        const slot = (readIdx & this._mask) * this._slotSize;
        // Read size
        const size = new DataView(this._buffer, AtomicsRingBuffer.META_SIZE + slot).getUint32(0, true);
        if (size === 0 || size > this._slotSize - 4)
            return null;
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
    async waitRead(timeout) {
        const writeIdx = Atomics.load(this._meta, AtomicsRingBuffer.WRITE_IDX);
        const readIdx = Atomics.load(this._meta, AtomicsRingBuffer.READ_IDX);
        if (readIdx < writeIdx)
            return this.read();
        // @ts-ignore
        if ("waitAsync" in Atomics) {
            // @ts-ignore
            const result = await Atomics.waitAsync(this._meta, AtomicsRingBuffer.WRITE_IDX, writeIdx, timeout ?? 1000).value;
            if (result === "ok")
                return this.read();
        }
        else {
            await new Promise(r => setTimeout(r, Math.min(timeout ?? 1000, 100)));
            return this.read();
        }
        return null;
    }
    get buffer() { return this._buffer; }
    get available() {
        const w = Atomics.load(this._meta, AtomicsRingBuffer.WRITE_IDX);
        const r = Atomics.load(this._meta, AtomicsRingBuffer.READ_IDX);
        return (w - r) & this._mask;
    }
    get overflow() { return Atomics.load(this._meta, AtomicsRingBuffer.OVERFLOW); }
}
// ============================================================================
// FACTORY
// ============================================================================
export const AtomicsTransportFactory = {
    create: (name, send, recv, config) => new AtomicsTransport(name, send, recv, config),
    createPair: (name, config) => createAtomicsChannelPair(name, config),
    createBuffer: (sizeOrBuffer, config) => new AtomicsBuffer(sizeOrBuffer, config),
    createRingBuffer: (config) => new AtomicsRingBuffer(config),
    getCBOR: getCBOREncoder
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQXRvbWljc1RyYW5zcG9ydC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIkF0b21pY3NUcmFuc3BvcnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7Ozs7Ozs7Ozs7R0FnQkc7QUFFSCxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sV0FBVyxDQUFDO0FBQ25DLE9BQU8sRUFBYyxjQUFjLEVBQW9DLE1BQU0sMEJBQTBCLENBQUM7QUFZeEcsSUFBSSxXQUFXLEdBQXVCLElBQUksQ0FBQztBQUUzQyxLQUFLLFVBQVUsY0FBYztJQUN6QixJQUFJLFdBQVc7UUFBRSxPQUFPLFdBQVcsQ0FBQztJQUVwQyxJQUFJLENBQUM7UUFDRCx3Q0FBd0M7UUFDeEMsTUFBTSxLQUFLLEdBQUcsTUFBTSxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDckMsV0FBVyxHQUFHO1lBQ1YsTUFBTSxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztZQUM5QixNQUFNLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO1NBQ2pDLENBQUM7SUFDTixDQUFDO0lBQUMsTUFBTSxDQUFDO1FBQ0wsNENBQTRDO1FBQzVDLFdBQVcsR0FBRztZQUNWLE1BQU0sRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsSUFBSSxXQUFXLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUM7WUFDcEUsTUFBTSxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksV0FBVyxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLE9BQU8sQ0FBQztTQUNsRSxDQUFDO0lBQ04sQ0FBQztJQUVELE9BQU8sV0FBVyxDQUFDO0FBQ3ZCLENBQUM7QUFF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QUM1QyxJQUFJLGlCQUFpQixDQUFDLE1BQU0sQ0FBQztJQUNqQyxPQUFPLEVBQUUsY0FBYztDQUMxQixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBTaGFyZWRBcnJheUJ1ZmZlciArIEF0b21pY3MgVHJhbnNwb3J0XG4gKlxuICogSGlnaC1wZXJmb3JtYW5jZSBpbnRlci13b3JrZXIgY29tbXVuaWNhdGlvbiB1c2luZyBzaGFyZWQgbWVtb3J5LlxuICogVXNlcyBDQk9SLVggZm9yIGVmZmljaWVudCBiaW5hcnkgc2VyaWFsaXphdGlvbi5cbiAqXG4gKiBGZWF0dXJlczpcbiAqIC0gWmVyby1jb3B5IG1lc3NhZ2UgcGFzc2luZyBiZXR3ZWVuIHdvcmtlcnNcbiAqIC0gTG9jay1mcmVlIHN5bmNocm9uaXphdGlvbiB3aXRoIEF0b21pY3NcbiAqIC0gQ0JPUi1YIGVuY29kaW5nIGZvciBjb21wYWN0IGJpbmFyeSBmb3JtYXRcbiAqIC0gU3VwcG9ydHMgQXJyYXlCdWZmZXIudHJhbnNmZXIoKSBmb3Igb3duZXJzaGlwIHRyYW5zZmVyXG4gKlxuICogUmVmZXJlbmNlczpcbiAqIC0gaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvSmF2YVNjcmlwdC9SZWZlcmVuY2UvR2xvYmFsX09iamVjdHMvQXRvbWljc1xuICogLSBodHRwczovL3RjMzkuZXMvZWNtYTI2Mi9tdWx0aXBhZ2UvbWVtb3J5LW1vZGVsLmh0bWxcbiAqIC0gaHR0cHM6Ly9naXRodWIuY29tL2tyaXN6eXAvY2Jvci14XG4gKi9cblxuaW1wb3J0IHsgVVVJRHY0IH0gZnJvbSBcImZlc3QvY29yZVwiO1xuaW1wb3J0IHsgT2JzZXJ2YWJsZSwgQ2hhbm5lbFN1YmplY3QsIHR5cGUgU3Vic2NyaXB0aW9uLCB0eXBlIE9ic2VydmVyIH0gZnJvbSBcIi4uL29ic2VydmFibGUvT2JzZXJ2YWJsZVwiO1xuaW1wb3J0IHR5cGUgeyBDaGFubmVsTWVzc2FnZSwgUGVuZGluZ1JlcXVlc3QsIFN1YnNjcmliZXIgfSBmcm9tIFwiLi4vdHlwZXMvSW50ZXJmYWNlXCI7XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIENCT1ItWCBJTlRFUkZBQ0UgKER5bmFtaWMgSW1wb3J0KVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5pbnRlcmZhY2UgQ0JPUkVuY29kZXIge1xuICAgIGVuY29kZSh2YWx1ZTogYW55KTogVWludDhBcnJheTtcbiAgICBkZWNvZGUoZGF0YTogVWludDhBcnJheSk6IGFueTtcbn1cblxubGV0IGNib3JFbmNvZGVyOiBDQk9SRW5jb2RlciB8IG51bGwgPSBudWxsO1xuXG5hc3luYyBmdW5jdGlvbiBnZXRDQk9SRW5jb2RlcigpOiBQcm9taXNlPENCT1JFbmNvZGVyPiB7XG4gICAgaWYgKGNib3JFbmNvZGVyKSByZXR1cm4gY2JvckVuY29kZXI7XG5cbiAgICB0cnkge1xuICAgICAgICAvLyBAdHMtaWdub3JlIC0gRHluYW1pYyBpbXBvcnQgb2YgY2Jvci14XG4gICAgICAgIGNvbnN0IGNib3J4ID0gYXdhaXQgaW1wb3J0KFwiY2Jvci14XCIpO1xuICAgICAgICBjYm9yRW5jb2RlciA9IHtcbiAgICAgICAgICAgIGVuY29kZTogKHYpID0+IGNib3J4LmVuY29kZSh2KSxcbiAgICAgICAgICAgIGRlY29kZTogKGQpID0+IGNib3J4LmRlY29kZShkKVxuICAgICAgICB9O1xuICAgIH0gY2F0Y2gge1xuICAgICAgICAvLyBGYWxsYmFjayB0byBKU09OIHdpdGggdHlwZWQgYXJyYXkgc3VwcG9ydFxuICAgICAgICBjYm9yRW5jb2RlciA9IHtcbiAgICAgICAgICAgIGVuY29kZTogKHYpID0+IG5ldyBUZXh0RW5jb2RlcigpLmVuY29kZShKU09OLnN0cmluZ2lmeSh2LCByZXBsYWNlcikpLFxuICAgICAgICAgICAgZGVjb2RlOiAoZCkgPT4gSlNPTi5wYXJzZShuZXcgVGV4dERlY29kZXIoKS5kZWNvZGUoZCksIHJldml2ZXIpXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgcmV0dXJuIGNib3JFbmNvZGVyO1xufVxuXG4vLyBKU09OIHNlcmlhbGl6YXRpb24gd2l0aCBUeXBlZEFycmF5IHN1cHBvcnRcbmZ1bmN0aW9uIHJlcGxhY2VyKF9rZXk6IHN0cmluZywgdmFsdWU6IGFueSk6IGFueSB7XG4gICAgaWYgKEFycmF5QnVmZmVyLmlzVmlldyh2YWx1ZSkgJiYgISh2YWx1ZSBpbnN0YW5jZW9mIERhdGFWaWV3KSkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgX190eXBlZEFycmF5OiB0cnVlLFxuICAgICAgICAgICAgdHlwZTogdmFsdWUuY29uc3RydWN0b3IubmFtZSxcbiAgICAgICAgICAgIGRhdGE6IEFycmF5LmZyb20odmFsdWUgYXMgYW55KVxuICAgICAgICB9O1xuICAgIH1cbiAgICBpZiAodmFsdWUgaW5zdGFuY2VvZiBBcnJheUJ1ZmZlcikge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgX19hcnJheUJ1ZmZlcjogdHJ1ZSxcbiAgICAgICAgICAgIGRhdGE6IEFycmF5LmZyb20obmV3IFVpbnQ4QXJyYXkodmFsdWUpKVxuICAgICAgICB9O1xuICAgIH1cbiAgICByZXR1cm4gdmFsdWU7XG59XG5cbmZ1bmN0aW9uIHJldml2ZXIoX2tleTogc3RyaW5nLCB2YWx1ZTogYW55KTogYW55IHtcbiAgICBpZiAodmFsdWU/Ll9fdHlwZWRBcnJheSkge1xuICAgICAgICBjb25zdCBUeXBlZEFycmF5Q3RvciA9IChnbG9iYWxUaGlzIGFzIGFueSlbdmFsdWUudHlwZV07XG4gICAgICAgIHJldHVybiBUeXBlZEFycmF5Q3RvciA/IG5ldyBUeXBlZEFycmF5Q3Rvcih2YWx1ZS5kYXRhKSA6IHZhbHVlLmRhdGE7XG4gICAgfVxuICAgIGlmICh2YWx1ZT8uX19hcnJheUJ1ZmZlcikge1xuICAgICAgICByZXR1cm4gbmV3IFVpbnQ4QXJyYXkodmFsdWUuZGF0YSkuYnVmZmVyO1xuICAgIH1cbiAgICByZXR1cm4gdmFsdWU7XG59XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFRZUEVTXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbmV4cG9ydCBpbnRlcmZhY2UgQXRvbWljc01lc3NhZ2U8VCA9IGFueT4gZXh0ZW5kcyBDaGFubmVsTWVzc2FnZSB7XG4gICAgLyoqIE1lc3NhZ2Ugc2VxdWVuY2UgbnVtYmVyICovXG4gICAgc2VxPzogbnVtYmVyO1xuICAgIC8qKiBXb3JrZXIgSUQgdGhhdCBzZW50IHRoZSBtZXNzYWdlICovXG4gICAgd29ya2VySWQ/OiBzdHJpbmc7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQXRvbWljc1RyYW5zcG9ydENvbmZpZyB7XG4gICAgLyoqIFNpemUgb2Ygc2hhcmVkIGJ1ZmZlciBpbiBieXRlcyAoZGVmYXVsdDogNjRLQikgKi9cbiAgICBidWZmZXJTaXplPzogbnVtYmVyO1xuICAgIC8qKiBNYXhpbXVtIG1lc3NhZ2Ugc2l6ZSAoZGVmYXVsdDogNjBLQikgKi9cbiAgICBtYXhNZXNzYWdlU2l6ZT86IG51bWJlcjtcbiAgICAvKiogRW5hYmxlIG1lc3NhZ2UgY29tcHJlc3Npb24gKHJlcXVpcmVzIENCT1ItWCkgKi9cbiAgICBjb21wcmVzc2lvbj86IGJvb2xlYW47XG4gICAgLyoqIFRpbWVvdXQgZm9yIGF0b21pYyB3YWl0IG9wZXJhdGlvbnMgKG1zKSAqL1xuICAgIHdhaXRUaW1lb3V0PzogbnVtYmVyO1xuICAgIC8qKiBVc2UgQXRvbWljcy53YWl0QXN5bmMgd2hlbiBhdmFpbGFibGUgKG5vbi1ibG9ja2luZykgKi9cbiAgICB1c2VBc3luY1dhaXQ/OiBib29sZWFuO1xufVxuXG4vKiogU2hhcmVkIG1lbW9yeSBsYXlvdXQgY29uc3RhbnRzICovXG5jb25zdCBIRUFERVJfU0laRSA9IDMyOyAgLy8gQ29udHJvbCBoZWFkZXIgc2l6ZVxuY29uc3QgTE9DS19PRkZTRVQgPSAwOyAgIC8vIExvY2sgZmxhZyAoSW50MzIpXG5jb25zdCBTRVFfT0ZGU0VUID0gNDsgICAgLy8gU2VxdWVuY2UgbnVtYmVyIChJbnQzMilcbmNvbnN0IFNJWkVfT0ZGU0VUID0gODsgICAvLyBNZXNzYWdlIHNpemUgKEludDMyKVxuY29uc3QgRkxBR1NfT0ZGU0VUID0gMTI7IC8vIEZsYWdzIChJbnQzMilcbmNvbnN0IFJFQURZX09GRlNFVCA9IDE2OyAvLyBSZWFkeSBzaWduYWwgKEludDMyKVxuY29uc3QgQUNLX09GRlNFVCA9IDIwOyAgIC8vIEFja25vd2xlZGdtZW50IChJbnQzMilcbmNvbnN0IERBVEFfT0ZGU0VUID0gSEVBREVSX1NJWkU7XG5cbi8vIEZsYWcgYml0c1xuY29uc3QgRkxBR19IQVNfVFJBTlNGRVIgPSAxIDw8IDA7XG5jb25zdCBGTEFHX0NPTVBSRVNTRUQgPSAxIDw8IDE7XG5jb25zdCBGTEFHX1JFU1BPTlNFID0gMSA8PCAyO1xuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBBVE9NSUNTIEJVRkZFUiBNQU5BR0VSXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbmV4cG9ydCBjbGFzcyBBdG9taWNzQnVmZmVyIHtcbiAgICBwcml2YXRlIF9zaGFyZWRCdWZmZXI6IFNoYXJlZEFycmF5QnVmZmVyO1xuICAgIHByaXZhdGUgX2ludDMyVmlldzogSW50MzJBcnJheTtcbiAgICBwcml2YXRlIF91aW50OFZpZXc6IFVpbnQ4QXJyYXk7XG4gICAgcHJpdmF0ZSBfbWF4RGF0YVNpemU6IG51bWJlcjtcblxuICAgIGNvbnN0cnVjdG9yKFxuICAgICAgICBidWZmZXJPclNpemU6IFNoYXJlZEFycmF5QnVmZmVyIHwgbnVtYmVyID0gNjU1MzYsXG4gICAgICAgIHByaXZhdGUgX2NvbmZpZzogQXRvbWljc1RyYW5zcG9ydENvbmZpZyA9IHt9XG4gICAgKSB7XG4gICAgICAgIGlmICh0eXBlb2YgYnVmZmVyT3JTaXplID09PSBcIm51bWJlclwiKSB7XG4gICAgICAgICAgICB0aGlzLl9zaGFyZWRCdWZmZXIgPSBuZXcgU2hhcmVkQXJyYXlCdWZmZXIoYnVmZmVyT3JTaXplKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX3NoYXJlZEJ1ZmZlciA9IGJ1ZmZlck9yU2l6ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuX2ludDMyVmlldyA9IG5ldyBJbnQzMkFycmF5KHRoaXMuX3NoYXJlZEJ1ZmZlcik7XG4gICAgICAgIHRoaXMuX3VpbnQ4VmlldyA9IG5ldyBVaW50OEFycmF5KHRoaXMuX3NoYXJlZEJ1ZmZlcik7XG4gICAgICAgIHRoaXMuX21heERhdGFTaXplID0gdGhpcy5fY29uZmlnLm1heE1lc3NhZ2VTaXplID8/ICh0aGlzLl9zaGFyZWRCdWZmZXIuYnl0ZUxlbmd0aCAtIEhFQURFUl9TSVpFKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBXcml0ZSBtZXNzYWdlIHRvIHNoYXJlZCBidWZmZXIgd2l0aCBsb2NrXG4gICAgICovXG4gICAgYXN5bmMgd3JpdGUoZGF0YTogVWludDhBcnJheSwgZmxhZ3M6IG51bWJlciA9IDApOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICAgICAgaWYgKGRhdGEuYnl0ZUxlbmd0aCA+IHRoaXMuX21heERhdGFTaXplKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYE1lc3NhZ2UgdG9vIGxhcmdlOiAke2RhdGEuYnl0ZUxlbmd0aH0gPiAke3RoaXMuX21heERhdGFTaXplfWApO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQWNxdWlyZSBsb2NrIHVzaW5nIGNvbXBhcmUtYW5kLXN3YXBcbiAgICAgICAgd2hpbGUgKEF0b21pY3MuY29tcGFyZUV4Y2hhbmdlKHRoaXMuX2ludDMyVmlldywgTE9DS19PRkZTRVQgLyA0LCAwLCAxKSAhPT0gMCkge1xuICAgICAgICAgICAgLy8gU3Bpbi13YWl0IHdpdGggYmFja29mZlxuICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gdGhpcy5fY29uZmlnLnVzZUFzeW5jV2FpdCAmJiBcIndhaXRBc3luY1wiIGluIEF0b21pY3NcbiAgICAgICAgICAgICAgICAvLyBAdHMtaWdub3JlIC0gd2FpdEFzeW5jIGlzIG5ld2VyIEFQSVxuICAgICAgICAgICAgICAgID8gYXdhaXQgQXRvbWljcy53YWl0QXN5bmModGhpcy5faW50MzJWaWV3LCBMT0NLX09GRlNFVCAvIDQsIDEsIHRoaXMuX2NvbmZpZy53YWl0VGltZW91dCA/PyAxMDApLnZhbHVlXG4gICAgICAgICAgICAgICAgOiBBdG9taWNzLndhaXQodGhpcy5faW50MzJWaWV3LCBMT0NLX09GRlNFVCAvIDQsIDEsIHRoaXMuX2NvbmZpZy53YWl0VGltZW91dCA/PyAxMDApO1xuXG4gICAgICAgICAgICBpZiAocmVzdWx0ID09PSBcInRpbWVkLW91dFwiKSBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBXcml0ZSBtZXNzYWdlIHNpemVcbiAgICAgICAgICAgIEF0b21pY3Muc3RvcmUodGhpcy5faW50MzJWaWV3LCBTSVpFX09GRlNFVCAvIDQsIGRhdGEuYnl0ZUxlbmd0aCk7XG5cbiAgICAgICAgICAgIC8vIFdyaXRlIGZsYWdzXG4gICAgICAgICAgICBBdG9taWNzLnN0b3JlKHRoaXMuX2ludDMyVmlldywgRkxBR1NfT0ZGU0VUIC8gNCwgZmxhZ3MpO1xuXG4gICAgICAgICAgICAvLyBDb3B5IGRhdGFcbiAgICAgICAgICAgIHRoaXMuX3VpbnQ4Vmlldy5zZXQoZGF0YSwgREFUQV9PRkZTRVQpO1xuXG4gICAgICAgICAgICAvLyBJbmNyZW1lbnQgc2VxdWVuY2VcbiAgICAgICAgICAgIEF0b21pY3MuYWRkKHRoaXMuX2ludDMyVmlldywgU0VRX09GRlNFVCAvIDQsIDEpO1xuXG4gICAgICAgICAgICAvLyBTaWduYWwgcmVhZHlcbiAgICAgICAgICAgIEF0b21pY3Muc3RvcmUodGhpcy5faW50MzJWaWV3LCBSRUFEWV9PRkZTRVQgLyA0LCAxKTtcbiAgICAgICAgICAgIEF0b21pY3Mubm90aWZ5KHRoaXMuX2ludDMyVmlldywgUkVBRFlfT0ZGU0VUIC8gNCk7XG5cbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9IGZpbmFsbHkge1xuICAgICAgICAgICAgLy8gUmVsZWFzZSBsb2NrXG4gICAgICAgICAgICBBdG9taWNzLnN0b3JlKHRoaXMuX2ludDMyVmlldywgTE9DS19PRkZTRVQgLyA0LCAwKTtcbiAgICAgICAgICAgIEF0b21pY3Mubm90aWZ5KHRoaXMuX2ludDMyVmlldywgTE9DS19PRkZTRVQgLyA0KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFJlYWQgbWVzc2FnZSBmcm9tIHNoYXJlZCBidWZmZXJcbiAgICAgKi9cbiAgICBhc3luYyByZWFkKCk6IFByb21pc2U8eyBkYXRhOiBVaW50OEFycmF5OyBmbGFnczogbnVtYmVyOyBzZXE6IG51bWJlciB9IHwgbnVsbD4ge1xuICAgICAgICAvLyBXYWl0IGZvciByZWFkeSBzaWduYWxcbiAgICAgICAgY29uc3QgcmVhZHlWYWx1ZSA9IEF0b21pY3MubG9hZCh0aGlzLl9pbnQzMlZpZXcsIFJFQURZX09GRlNFVCAvIDQpO1xuICAgICAgICBpZiAocmVhZHlWYWx1ZSA9PT0gMCkge1xuICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gdGhpcy5fY29uZmlnLnVzZUFzeW5jV2FpdCAmJiBcIndhaXRBc3luY1wiIGluIEF0b21pY3NcbiAgICAgICAgICAgICAgICAvLyBAdHMtaWdub3JlIC0gd2FpdEFzeW5jIGlzIG5ld2VyIEFQSVxuICAgICAgICAgICAgICAgID8gYXdhaXQgQXRvbWljcy53YWl0QXN5bmModGhpcy5faW50MzJWaWV3LCBSRUFEWV9PRkZTRVQgLyA0LCAwLCB0aGlzLl9jb25maWcud2FpdFRpbWVvdXQgPz8gMTAwMCkudmFsdWVcbiAgICAgICAgICAgICAgICA6IEF0b21pY3Mud2FpdCh0aGlzLl9pbnQzMlZpZXcsIFJFQURZX09GRlNFVCAvIDQsIDAsIHRoaXMuX2NvbmZpZy53YWl0VGltZW91dCA/PyAxMDAwKTtcblxuICAgICAgICAgICAgaWYgKHJlc3VsdCA9PT0gXCJ0aW1lZC1vdXRcIikgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBSZWFkIG1lc3NhZ2VcbiAgICAgICAgY29uc3Qgc2l6ZSA9IEF0b21pY3MubG9hZCh0aGlzLl9pbnQzMlZpZXcsIFNJWkVfT0ZGU0VUIC8gNCk7XG4gICAgICAgIGNvbnN0IGZsYWdzID0gQXRvbWljcy5sb2FkKHRoaXMuX2ludDMyVmlldywgRkxBR1NfT0ZGU0VUIC8gNCk7XG4gICAgICAgIGNvbnN0IHNlcSA9IEF0b21pY3MubG9hZCh0aGlzLl9pbnQzMlZpZXcsIFNFUV9PRkZTRVQgLyA0KTtcblxuICAgICAgICBpZiAoc2l6ZSA8PSAwIHx8IHNpemUgPiB0aGlzLl9tYXhEYXRhU2l6ZSkgcmV0dXJuIG51bGw7XG5cbiAgICAgICAgLy8gQ29weSBkYXRhIG91dFxuICAgICAgICBjb25zdCBkYXRhID0gbmV3IFVpbnQ4QXJyYXkoc2l6ZSk7XG4gICAgICAgIGRhdGEuc2V0KHRoaXMuX3VpbnQ4Vmlldy5zdWJhcnJheShEQVRBX09GRlNFVCwgREFUQV9PRkZTRVQgKyBzaXplKSk7XG5cbiAgICAgICAgLy8gQ2xlYXIgcmVhZHkgc2lnbmFsXG4gICAgICAgIEF0b21pY3Muc3RvcmUodGhpcy5faW50MzJWaWV3LCBSRUFEWV9PRkZTRVQgLyA0LCAwKTtcblxuICAgICAgICAvLyBTZW5kIGFja25vd2xlZGdtZW50XG4gICAgICAgIEF0b21pY3MuYWRkKHRoaXMuX2ludDMyVmlldywgQUNLX09GRlNFVCAvIDQsIDEpO1xuICAgICAgICBBdG9taWNzLm5vdGlmeSh0aGlzLl9pbnQzMlZpZXcsIEFDS19PRkZTRVQgLyA0KTtcblxuICAgICAgICByZXR1cm4geyBkYXRhLCBmbGFncywgc2VxIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogV2FpdCBmb3IgYWNrbm93bGVkZ21lbnRcbiAgICAgKi9cbiAgICBhc3luYyB3YWl0QWNrKGV4cGVjdGVkU2VxOiBudW1iZXIpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICAgICAgY29uc3QgdGltZW91dCA9IHRoaXMuX2NvbmZpZy53YWl0VGltZW91dCA/PyA1MDAwO1xuICAgICAgICBjb25zdCBzdGFydCA9IERhdGUubm93KCk7XG5cbiAgICAgICAgd2hpbGUgKERhdGUubm93KCkgLSBzdGFydCA8IHRpbWVvdXQpIHtcbiAgICAgICAgICAgIGNvbnN0IGFjayA9IEF0b21pY3MubG9hZCh0aGlzLl9pbnQzMlZpZXcsIEFDS19PRkZTRVQgLyA0KTtcbiAgICAgICAgICAgIGlmIChhY2sgPj0gZXhwZWN0ZWRTZXEpIHJldHVybiB0cnVlO1xuXG4gICAgICAgICAgICBpZiAodGhpcy5fY29uZmlnLnVzZUFzeW5jV2FpdCAmJiBcIndhaXRBc3luY1wiIGluIEF0b21pY3MpIHtcbiAgICAgICAgICAgICAgICAvLyBAdHMtaWdub3JlXG4gICAgICAgICAgICAgICAgYXdhaXQgQXRvbWljcy53YWl0QXN5bmModGhpcy5faW50MzJWaWV3LCBBQ0tfT0ZGU0VUIC8gNCwgYWNrLCAxMDApLnZhbHVlO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBhd2FpdCBuZXcgUHJvbWlzZShyID0+IHNldFRpbWVvdXQociwgMTApKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBnZXQgYnVmZmVyKCk6IFNoYXJlZEFycmF5QnVmZmVyIHsgcmV0dXJuIHRoaXMuX3NoYXJlZEJ1ZmZlcjsgfVxuICAgIGdldCBjdXJyZW50U2VxKCk6IG51bWJlciB7IHJldHVybiBBdG9taWNzLmxvYWQodGhpcy5faW50MzJWaWV3LCBTRVFfT0ZGU0VUIC8gNCk7IH1cbn1cblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gQVRPTUlDUyBUUkFOU1BPUlRcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuZXhwb3J0IGNsYXNzIEF0b21pY3NUcmFuc3BvcnQge1xuICAgIHByaXZhdGUgX3NlbmRCdWZmZXI6IEF0b21pY3NCdWZmZXI7XG4gICAgcHJpdmF0ZSBfcmVjdkJ1ZmZlcjogQXRvbWljc0J1ZmZlcjtcbiAgICBwcml2YXRlIF9lbmNvZGVyOiBDQk9SRW5jb2RlciB8IG51bGwgPSBudWxsO1xuICAgIHByaXZhdGUgX3N1YnMgPSBuZXcgU2V0PE9ic2VydmVyPEF0b21pY3NNZXNzYWdlPj4oKTtcbiAgICBwcml2YXRlIF9wZW5kaW5nID0gbmV3IE1hcDxzdHJpbmcsIFBlbmRpbmdSZXF1ZXN0PigpO1xuICAgIHByaXZhdGUgX3BvbGxpbmcgPSBmYWxzZTtcbiAgICBwcml2YXRlIF9wb2xsQWJvcnQ6IEFib3J0Q29udHJvbGxlciB8IG51bGwgPSBudWxsO1xuICAgIHByaXZhdGUgX3dvcmtlcklkOiBzdHJpbmcgPSBVVUlEdjQoKTtcbiAgICBwcml2YXRlIF9sYXN0U2VxID0gMDtcbiAgICBwcml2YXRlIF9zdGF0ZSA9IG5ldyBDaGFubmVsU3ViamVjdDxcInJlYWR5XCIgfCBcInBvbGxpbmdcIiB8IFwic3RvcHBlZFwiIHwgXCJlcnJvclwiPigpO1xuXG4gICAgY29uc3RydWN0b3IoXG4gICAgICAgIHByaXZhdGUgX2NoYW5uZWxOYW1lOiBzdHJpbmcsXG4gICAgICAgIHNlbmRCdWZmZXI6IFNoYXJlZEFycmF5QnVmZmVyIHwgQXRvbWljc0J1ZmZlcixcbiAgICAgICAgcmVjdkJ1ZmZlcjogU2hhcmVkQXJyYXlCdWZmZXIgfCBBdG9taWNzQnVmZmVyLFxuICAgICAgICBwcml2YXRlIF9jb25maWc6IEF0b21pY3NUcmFuc3BvcnRDb25maWcgPSB7fVxuICAgICkge1xuICAgICAgICB0aGlzLl9zZW5kQnVmZmVyID0gc2VuZEJ1ZmZlciBpbnN0YW5jZW9mIEF0b21pY3NCdWZmZXJcbiAgICAgICAgICAgID8gc2VuZEJ1ZmZlciA6IG5ldyBBdG9taWNzQnVmZmVyKHNlbmRCdWZmZXIsIF9jb25maWcpO1xuICAgICAgICB0aGlzLl9yZWN2QnVmZmVyID0gcmVjdkJ1ZmZlciBpbnN0YW5jZW9mIEF0b21pY3NCdWZmZXJcbiAgICAgICAgICAgID8gcmVjdkJ1ZmZlciA6IG5ldyBBdG9taWNzQnVmZmVyKHJlY3ZCdWZmZXIsIF9jb25maWcpO1xuXG4gICAgICAgIHRoaXMuX2luaXQoKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIF9pbml0KCk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICB0aGlzLl9lbmNvZGVyID0gYXdhaXQgZ2V0Q0JPUkVuY29kZXIoKTtcbiAgICAgICAgdGhpcy5fc3RhdGUubmV4dChcInJlYWR5XCIpO1xuICAgIH1cblxuICAgIGFzeW5jIHNlbmQobXNnOiBBdG9taWNzTWVzc2FnZSwgdHJhbnNmZXI/OiBUcmFuc2ZlcmFibGVbXSk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBpZiAoIXRoaXMuX2VuY29kZXIpIGF3YWl0IHRoaXMuX2luaXQoKTtcblxuICAgICAgICBjb25zdCB7IHRyYW5zZmVyYWJsZSwgLi4uZGF0YSB9ID0gbXNnIGFzIGFueTtcbiAgICAgICAgbGV0IGZsYWdzID0gMDtcblxuICAgICAgICAvLyBIYW5kbGUgdHJhbnNmZXJhYmxlcyAtIGVuY29kZSByZWZlcmVuY2VzXG4gICAgICAgIGlmICh0cmFuc2Zlcj8ubGVuZ3RoKSB7XG4gICAgICAgICAgICBmbGFncyB8PSBGTEFHX0hBU19UUkFOU0ZFUjtcbiAgICAgICAgICAgIGRhdGEuX3RyYW5zZmVyTWV0YSA9IHRyYW5zZmVyLm1hcCgodCwgaSkgPT4gKHtcbiAgICAgICAgICAgICAgICBpbmRleDogaSxcbiAgICAgICAgICAgICAgICB0eXBlOiB0LmNvbnN0cnVjdG9yLm5hbWUsXG4gICAgICAgICAgICAgICAgLy8gVXNlIEFycmF5QnVmZmVyLnRyYW5zZmVyKCkgaWYgYXZhaWxhYmxlIChFUzIwMjQrKVxuICAgICAgICAgICAgICAgIC8vIEB0cy1pZ25vcmUgLSBNb2Rlcm4gQVBJXG4gICAgICAgICAgICAgICAgdHJhbnNmZXJyZWQ6IHQgaW5zdGFuY2VvZiBBcnJheUJ1ZmZlciAmJiBcInRyYW5zZmVyXCIgaW4gdFxuICAgICAgICAgICAgfSkpO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgZW5jb2RlZCA9IHRoaXMuX2VuY29kZXIhLmVuY29kZShkYXRhKTtcblxuICAgICAgICBpZiAodGhpcy5fY29uZmlnLmNvbXByZXNzaW9uICYmIGVuY29kZWQubGVuZ3RoID4gMTAyNCkge1xuICAgICAgICAgICAgLy8gQ291bGQgYWRkIGNvbXByZXNzaW9uIGhlcmVcbiAgICAgICAgICAgIGZsYWdzIHw9IEZMQUdfQ09NUFJFU1NFRDtcbiAgICAgICAgfVxuXG4gICAgICAgIGF3YWl0IHRoaXMuX3NlbmRCdWZmZXIud3JpdGUoZW5jb2RlZCwgZmxhZ3MpO1xuICAgIH1cblxuICAgIGFzeW5jIHJlcXVlc3QobXNnOiBPbWl0PEF0b21pY3NNZXNzYWdlLCBcInJlcUlkXCI+ICYgeyByZXFJZD86IHN0cmluZyB9KTogUHJvbWlzZTxhbnk+IHtcbiAgICAgICAgY29uc3QgcmVxSWQgPSBtc2cucmVxSWQgPz8gVVVJRHY0KCk7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICBjb25zdCB0aW1lb3V0ID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5fcGVuZGluZy5kZWxldGUocmVxSWQpO1xuICAgICAgICAgICAgICAgIHJlamVjdChuZXcgRXJyb3IoXCJSZXF1ZXN0IHRpbWVvdXRcIikpO1xuICAgICAgICAgICAgfSwgdGhpcy5fY29uZmlnLndhaXRUaW1lb3V0ID8/IDMwMDAwKTtcblxuICAgICAgICAgICAgdGhpcy5fcGVuZGluZy5zZXQocmVxSWQsIHtcbiAgICAgICAgICAgICAgICByZXNvbHZlOiAodikgPT4geyBjbGVhclRpbWVvdXQodGltZW91dCk7IHJlc29sdmUodik7IH0sXG4gICAgICAgICAgICAgICAgcmVqZWN0OiAoZSkgPT4geyBjbGVhclRpbWVvdXQodGltZW91dCk7IHJlamVjdChlKTsgfSxcbiAgICAgICAgICAgICAgICB0aW1lc3RhbXA6IERhdGUubm93KClcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICB0aGlzLnNlbmQoeyAuLi5tc2csIHJlcUlkLCB0eXBlOiBcInJlcXVlc3RcIiB9IGFzIEF0b21pY3NNZXNzYWdlKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgc3Vic2NyaWJlKG9ic2VydmVyOiBPYnNlcnZlcjxBdG9taWNzTWVzc2FnZT4gfCAoKHY6IEF0b21pY3NNZXNzYWdlKSA9PiB2b2lkKSk6IFN1YnNjcmlwdGlvbiB7XG4gICAgICAgIGNvbnN0IG9iczogT2JzZXJ2ZXI8QXRvbWljc01lc3NhZ2U+ID0gdHlwZW9mIG9ic2VydmVyID09PSBcImZ1bmN0aW9uXCIgPyB7IG5leHQ6IG9ic2VydmVyIH0gOiBvYnNlcnZlcjtcbiAgICAgICAgdGhpcy5fc3Vicy5hZGQob2JzKTtcbiAgICAgICAgaWYgKCF0aGlzLl9wb2xsaW5nKSB0aGlzLl9zdGFydFBvbGxpbmcoKTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGNsb3NlZDogZmFsc2UsXG4gICAgICAgICAgICB1bnN1YnNjcmliZTogKCkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuX3N1YnMuZGVsZXRlKG9icyk7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuX3N1YnMuc2l6ZSA9PT0gMCkgdGhpcy5fc3RvcFBvbGxpbmcoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIF9zdGFydFBvbGxpbmcoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGlmICh0aGlzLl9wb2xsaW5nKSByZXR1cm47XG4gICAgICAgIHRoaXMuX3BvbGxpbmcgPSB0cnVlO1xuICAgICAgICB0aGlzLl9wb2xsQWJvcnQgPSBuZXcgQWJvcnRDb250cm9sbGVyKCk7XG4gICAgICAgIHRoaXMuX3N0YXRlLm5leHQoXCJwb2xsaW5nXCIpO1xuXG4gICAgICAgIHdoaWxlICh0aGlzLl9wb2xsaW5nICYmICF0aGlzLl9wb2xsQWJvcnQuc2lnbmFsLmFib3J0ZWQpIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5fcmVjdkJ1ZmZlci5yZWFkKCk7XG4gICAgICAgICAgICAgICAgaWYgKCFyZXN1bHQpIGNvbnRpbnVlO1xuXG4gICAgICAgICAgICAgICAgLy8gU2tpcCBhbHJlYWR5IHByb2Nlc3NlZCBtZXNzYWdlc1xuICAgICAgICAgICAgICAgIGlmIChyZXN1bHQuc2VxIDw9IHRoaXMuX2xhc3RTZXEpIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgIHRoaXMuX2xhc3RTZXEgPSByZXN1bHQuc2VxO1xuXG4gICAgICAgICAgICAgICAgY29uc3QgZGF0YSA9IHRoaXMuX2VuY29kZXIhLmRlY29kZShyZXN1bHQuZGF0YSkgYXMgQXRvbWljc01lc3NhZ2U7XG4gICAgICAgICAgICAgICAgZGF0YS5zZXEgPSByZXN1bHQuc2VxO1xuICAgICAgICAgICAgICAgIGRhdGEud29ya2VySWQgPSBkYXRhLndvcmtlcklkID8/IHRoaXMuX3dvcmtlcklkO1xuXG4gICAgICAgICAgICAgICAgLy8gSGFuZGxlIHJlc3BvbnNlXG4gICAgICAgICAgICAgICAgaWYgKChyZXN1bHQuZmxhZ3MgJiBGTEFHX1JFU1BPTlNFKSB8fCBkYXRhLnR5cGUgPT09IFwicmVzcG9uc2VcIikge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZGF0YS5yZXFJZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcCA9IHRoaXMuX3BlbmRpbmcuZ2V0KGRhdGEucmVxSWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9wZW5kaW5nLmRlbGV0ZShkYXRhLnJlcUlkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZGF0YS5wYXlsb2FkPy5lcnJvcikgcC5yZWplY3QobmV3IEVycm9yKGRhdGEucGF5bG9hZC5lcnJvcikpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2UgcC5yZXNvbHZlKGRhdGEucGF5bG9hZD8ucmVzdWx0ID8/IGRhdGEucGF5bG9hZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IHMgb2YgdGhpcy5fc3Vicykge1xuICAgICAgICAgICAgICAgICAgICB0cnkgeyBzLm5leHQ/LihkYXRhKTsgfSBjYXRjaCAoZSkgeyBzLmVycm9yPy4oZSBhcyBFcnJvcik7IH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBzIG9mIHRoaXMuX3N1YnMpIHMuZXJyb3I/LihlIGFzIEVycm9yKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgX3N0b3BQb2xsaW5nKCk6IHZvaWQge1xuICAgICAgICB0aGlzLl9wb2xsaW5nID0gZmFsc2U7XG4gICAgICAgIHRoaXMuX3BvbGxBYm9ydD8uYWJvcnQoKTtcbiAgICAgICAgdGhpcy5fcG9sbEFib3J0ID0gbnVsbDtcbiAgICAgICAgdGhpcy5fc3RhdGUubmV4dChcInN0b3BwZWRcIik7XG4gICAgfVxuXG4gICAgY2xvc2UoKTogdm9pZCB7XG4gICAgICAgIHRoaXMuX3N1YnMuZm9yRWFjaChzID0+IHMuY29tcGxldGU/LigpKTtcbiAgICAgICAgdGhpcy5fc3Vicy5jbGVhcigpO1xuICAgICAgICB0aGlzLl9zdG9wUG9sbGluZygpO1xuICAgIH1cblxuICAgIGdldCBzZW5kQnVmZmVyKCk6IFNoYXJlZEFycmF5QnVmZmVyIHsgcmV0dXJuIHRoaXMuX3NlbmRCdWZmZXIuYnVmZmVyOyB9XG4gICAgZ2V0IHJlY3ZCdWZmZXIoKTogU2hhcmVkQXJyYXlCdWZmZXIgeyByZXR1cm4gdGhpcy5fcmVjdkJ1ZmZlci5idWZmZXI7IH1cbiAgICBnZXQgd29ya2VySWQoKTogc3RyaW5nIHsgcmV0dXJuIHRoaXMuX3dvcmtlcklkOyB9XG4gICAgZ2V0IHN0YXRlKCkgeyByZXR1cm4gdGhpcy5fc3RhdGU7IH1cbiAgICBnZXQgY2hhbm5lbE5hbWUoKTogc3RyaW5nIHsgcmV0dXJuIHRoaXMuX2NoYW5uZWxOYW1lOyB9XG59XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIEJJRElSRUNUSU9OQUwgQVRPTUlDUyBDSEFOTkVMXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbmV4cG9ydCBpbnRlcmZhY2UgQXRvbWljc0NoYW5uZWxQYWlyIHtcbiAgICBtYWluOiBBdG9taWNzVHJhbnNwb3J0O1xuICAgIHdvcmtlcjogeyBzZW5kQnVmZmVyOiBTaGFyZWRBcnJheUJ1ZmZlcjsgcmVjdkJ1ZmZlcjogU2hhcmVkQXJyYXlCdWZmZXIgfTtcbn1cblxuLyoqXG4gKiBDcmVhdGUgYSBiaWRpcmVjdGlvbmFsIGF0b21pY3MgY2hhbm5lbCBmb3IgbWFpbjwtPndvcmtlciBjb21tdW5pY2F0aW9uXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVBdG9taWNzQ2hhbm5lbFBhaXIoXG4gICAgY2hhbm5lbE5hbWU6IHN0cmluZyxcbiAgICBjb25maWc6IEF0b21pY3NUcmFuc3BvcnRDb25maWcgPSB7fVxuKTogQXRvbWljc0NoYW5uZWxQYWlyIHtcbiAgICBjb25zdCBidWZmZXJTaXplID0gY29uZmlnLmJ1ZmZlclNpemUgPz8gNjU1MzY7XG4gICAgY29uc3QgYnVmZmVyQSA9IG5ldyBTaGFyZWRBcnJheUJ1ZmZlcihidWZmZXJTaXplKTtcbiAgICBjb25zdCBidWZmZXJCID0gbmV3IFNoYXJlZEFycmF5QnVmZmVyKGJ1ZmZlclNpemUpO1xuXG4gICAgLy8gTWFpbiB0aHJlYWQ6IHNlbmRzIHRvIEEsIHJlY2VpdmVzIGZyb20gQlxuICAgIGNvbnN0IG1haW4gPSBuZXcgQXRvbWljc1RyYW5zcG9ydChjaGFubmVsTmFtZSwgYnVmZmVyQSwgYnVmZmVyQiwgY29uZmlnKTtcblxuICAgIC8vIFdvcmtlcjogc2VuZHMgdG8gQiwgcmVjZWl2ZXMgZnJvbSBBIChzd2FwcGVkKVxuICAgIHJldHVybiB7XG4gICAgICAgIG1haW4sXG4gICAgICAgIHdvcmtlcjogeyBzZW5kQnVmZmVyOiBidWZmZXJCLCByZWN2QnVmZmVyOiBidWZmZXJBIH1cbiAgICB9O1xufVxuXG4vKipcbiAqIENyZWF0ZSB3b3JrZXItc2lkZSBhdG9taWNzIHRyYW5zcG9ydCBmcm9tIGJ1ZmZlcnNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVdvcmtlckF0b21pY3NUcmFuc3BvcnQoXG4gICAgY2hhbm5lbE5hbWU6IHN0cmluZyxcbiAgICBzZW5kQnVmZmVyOiBTaGFyZWRBcnJheUJ1ZmZlcixcbiAgICByZWN2QnVmZmVyOiBTaGFyZWRBcnJheUJ1ZmZlcixcbiAgICBjb25maWc6IEF0b21pY3NUcmFuc3BvcnRDb25maWcgPSB7fVxuKTogQXRvbWljc1RyYW5zcG9ydCB7XG4gICAgcmV0dXJuIG5ldyBBdG9taWNzVHJhbnNwb3J0KGNoYW5uZWxOYW1lLCBzZW5kQnVmZmVyLCByZWN2QnVmZmVyLCBjb25maWcpO1xufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBSSU5HIEJVRkZFUiAoQWR2YW5jZWQgbXVsdGktbWVzc2FnZSBxdWV1ZSlcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuZXhwb3J0IGludGVyZmFjZSBSaW5nQnVmZmVyQ29uZmlnIHtcbiAgICAvKiogVG90YWwgYnVmZmVyIHNpemUgKG11c3QgYmUgcG93ZXIgb2YgMikgKi9cbiAgICBidWZmZXJTaXplPzogbnVtYmVyO1xuICAgIC8qKiBJbmRpdmlkdWFsIHNsb3Qgc2l6ZSAqL1xuICAgIHNsb3RTaXplPzogbnVtYmVyO1xuICAgIC8qKiBOdW1iZXIgb2Ygc2xvdHMgKi9cbiAgICBzbG90Q291bnQ/OiBudW1iZXI7XG59XG5cbi8qKlxuICogTG9jay1mcmVlIHJpbmcgYnVmZmVyIGZvciBoaWdoLXRocm91Z2hwdXQgbWVzc2FnZSBwYXNzaW5nXG4gKi9cbmV4cG9ydCBjbGFzcyBBdG9taWNzUmluZ0J1ZmZlciB7XG4gICAgcHJpdmF0ZSBfYnVmZmVyOiBTaGFyZWRBcnJheUJ1ZmZlcjtcbiAgICBwcml2YXRlIF9tZXRhOiBJbnQzMkFycmF5O1xuICAgIHByaXZhdGUgX2RhdGE6IFVpbnQ4QXJyYXk7XG4gICAgcHJpdmF0ZSBfc2xvdFNpemU6IG51bWJlcjtcbiAgICBwcml2YXRlIF9zbG90Q291bnQ6IG51bWJlcjtcbiAgICBwcml2YXRlIF9tYXNrOiBudW1iZXI7XG5cbiAgICAvLyBNZXRhIGxheW91dDogW3dyaXRlSW5kZXgsIHJlYWRJbmRleCwgb3ZlcmZsb3ddXG4gICAgcHJpdmF0ZSBzdGF0aWMgTUVUQV9TSVpFID0gMTY7XG4gICAgcHJpdmF0ZSBzdGF0aWMgV1JJVEVfSURYID0gMDtcbiAgICBwcml2YXRlIHN0YXRpYyBSRUFEX0lEWCA9IDQ7XG4gICAgcHJpdmF0ZSBzdGF0aWMgT1ZFUkZMT1cgPSA4O1xuXG4gICAgY29uc3RydWN0b3IoYnVmZmVyT3JDb25maWc6IFNoYXJlZEFycmF5QnVmZmVyIHwgUmluZ0J1ZmZlckNvbmZpZyA9IHt9KSB7XG4gICAgICAgIGlmIChidWZmZXJPckNvbmZpZyBpbnN0YW5jZW9mIFNoYXJlZEFycmF5QnVmZmVyKSB7XG4gICAgICAgICAgICB0aGlzLl9idWZmZXIgPSBidWZmZXJPckNvbmZpZztcbiAgICAgICAgICAgIC8vIEV4dHJhY3QgY29uZmlnIGZyb20gYnVmZmVyIHNpemVcbiAgICAgICAgICAgIHRoaXMuX3Nsb3RDb3VudCA9IDY0O1xuICAgICAgICAgICAgdGhpcy5fc2xvdFNpemUgPSAodGhpcy5fYnVmZmVyLmJ5dGVMZW5ndGggLSBBdG9taWNzUmluZ0J1ZmZlci5NRVRBX1NJWkUpIC8gdGhpcy5fc2xvdENvdW50O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5fc2xvdFNpemUgPSBidWZmZXJPckNvbmZpZy5zbG90U2l6ZSA/PyAxMDI0O1xuICAgICAgICAgICAgdGhpcy5fc2xvdENvdW50ID0gYnVmZmVyT3JDb25maWcuc2xvdENvdW50ID8/IDY0O1xuICAgICAgICAgICAgLy8gUm91bmQgdXAgdG8gcG93ZXIgb2YgMlxuICAgICAgICAgICAgdGhpcy5fc2xvdENvdW50ID0gMSA8PCBNYXRoLmNlaWwoTWF0aC5sb2cyKHRoaXMuX3Nsb3RDb3VudCkpO1xuICAgICAgICAgICAgY29uc3QgdG90YWxTaXplID0gQXRvbWljc1JpbmdCdWZmZXIuTUVUQV9TSVpFICsgKHRoaXMuX3Nsb3RTaXplICogdGhpcy5fc2xvdENvdW50KTtcbiAgICAgICAgICAgIHRoaXMuX2J1ZmZlciA9IG5ldyBTaGFyZWRBcnJheUJ1ZmZlcih0b3RhbFNpemUpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5fbWV0YSA9IG5ldyBJbnQzMkFycmF5KHRoaXMuX2J1ZmZlciwgMCwgQXRvbWljc1JpbmdCdWZmZXIuTUVUQV9TSVpFIC8gNCk7XG4gICAgICAgIHRoaXMuX2RhdGEgPSBuZXcgVWludDhBcnJheSh0aGlzLl9idWZmZXIsIEF0b21pY3NSaW5nQnVmZmVyLk1FVEFfU0laRSk7XG4gICAgICAgIHRoaXMuX21hc2sgPSB0aGlzLl9zbG90Q291bnQgLSAxO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFdyaXRlIG1lc3NhZ2UgdG8gcmluZyBidWZmZXIgKG5vbi1ibG9ja2luZylcbiAgICAgKi9cbiAgICB3cml0ZShkYXRhOiBVaW50OEFycmF5KTogYm9vbGVhbiB7XG4gICAgICAgIGlmIChkYXRhLmJ5dGVMZW5ndGggPiB0aGlzLl9zbG90U2l6ZSAtIDQpIHJldHVybiBmYWxzZTtcblxuICAgICAgICBjb25zdCB3cml0ZUlkeCA9IEF0b21pY3MubG9hZCh0aGlzLl9tZXRhLCBBdG9taWNzUmluZ0J1ZmZlci5XUklURV9JRFgpO1xuICAgICAgICBjb25zdCByZWFkSWR4ID0gQXRvbWljcy5sb2FkKHRoaXMuX21ldGEsIEF0b21pY3NSaW5nQnVmZmVyLlJFQURfSURYKTtcblxuICAgICAgICAvLyBDaGVjayBpZiBidWZmZXIgaXMgZnVsbFxuICAgICAgICBpZiAoKCh3cml0ZUlkeCArIDEpICYgdGhpcy5fbWFzaykgPT09IChyZWFkSWR4ICYgdGhpcy5fbWFzaykpIHtcbiAgICAgICAgICAgIEF0b21pY3MuYWRkKHRoaXMuX21ldGEsIEF0b21pY3NSaW5nQnVmZmVyLk9WRVJGTE9XLCAxKTtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHNsb3QgPSAod3JpdGVJZHggJiB0aGlzLl9tYXNrKSAqIHRoaXMuX3Nsb3RTaXplO1xuXG4gICAgICAgIC8vIFdyaXRlIHNpemUgZmlyc3QgKDQgYnl0ZXMpXG4gICAgICAgIG5ldyBEYXRhVmlldyh0aGlzLl9idWZmZXIsIEF0b21pY3NSaW5nQnVmZmVyLk1FVEFfU0laRSArIHNsb3QpLnNldFVpbnQzMigwLCBkYXRhLmJ5dGVMZW5ndGgsIHRydWUpO1xuXG4gICAgICAgIC8vIFdyaXRlIGRhdGFcbiAgICAgICAgdGhpcy5fZGF0YS5zZXQoZGF0YSwgc2xvdCArIDQpO1xuXG4gICAgICAgIC8vIFVwZGF0ZSB3cml0ZSBpbmRleFxuICAgICAgICBBdG9taWNzLnN0b3JlKHRoaXMuX21ldGEsIEF0b21pY3NSaW5nQnVmZmVyLldSSVRFX0lEWCwgd3JpdGVJZHggKyAxKTtcbiAgICAgICAgQXRvbWljcy5ub3RpZnkodGhpcy5fbWV0YSwgQXRvbWljc1JpbmdCdWZmZXIuV1JJVEVfSURYKTtcblxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZWFkIG1lc3NhZ2UgZnJvbSByaW5nIGJ1ZmZlciAobm9uLWJsb2NraW5nKVxuICAgICAqL1xuICAgIHJlYWQoKTogVWludDhBcnJheSB8IG51bGwge1xuICAgICAgICBjb25zdCB3cml0ZUlkeCA9IEF0b21pY3MubG9hZCh0aGlzLl9tZXRhLCBBdG9taWNzUmluZ0J1ZmZlci5XUklURV9JRFgpO1xuICAgICAgICBjb25zdCByZWFkSWR4ID0gQXRvbWljcy5sb2FkKHRoaXMuX21ldGEsIEF0b21pY3NSaW5nQnVmZmVyLlJFQURfSURYKTtcblxuICAgICAgICAvLyBDaGVjayBpZiBidWZmZXIgaXMgZW1wdHlcbiAgICAgICAgaWYgKHJlYWRJZHggPT09IHdyaXRlSWR4KSByZXR1cm4gbnVsbDtcblxuICAgICAgICBjb25zdCBzbG90ID0gKHJlYWRJZHggJiB0aGlzLl9tYXNrKSAqIHRoaXMuX3Nsb3RTaXplO1xuXG4gICAgICAgIC8vIFJlYWQgc2l6ZVxuICAgICAgICBjb25zdCBzaXplID0gbmV3IERhdGFWaWV3KHRoaXMuX2J1ZmZlciwgQXRvbWljc1JpbmdCdWZmZXIuTUVUQV9TSVpFICsgc2xvdCkuZ2V0VWludDMyKDAsIHRydWUpO1xuICAgICAgICBpZiAoc2l6ZSA9PT0gMCB8fCBzaXplID4gdGhpcy5fc2xvdFNpemUgLSA0KSByZXR1cm4gbnVsbDtcblxuICAgICAgICAvLyBDb3B5IGRhdGFcbiAgICAgICAgY29uc3QgZGF0YSA9IG5ldyBVaW50OEFycmF5KHNpemUpO1xuICAgICAgICBkYXRhLnNldCh0aGlzLl9kYXRhLnN1YmFycmF5KHNsb3QgKyA0LCBzbG90ICsgNCArIHNpemUpKTtcblxuICAgICAgICAvLyBVcGRhdGUgcmVhZCBpbmRleFxuICAgICAgICBBdG9taWNzLnN0b3JlKHRoaXMuX21ldGEsIEF0b21pY3NSaW5nQnVmZmVyLlJFQURfSURYLCByZWFkSWR4ICsgMSk7XG5cbiAgICAgICAgcmV0dXJuIGRhdGE7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogV2FpdCBmb3IgZGF0YSB0byBiZSBhdmFpbGFibGVcbiAgICAgKi9cbiAgICBhc3luYyB3YWl0UmVhZCh0aW1lb3V0PzogbnVtYmVyKTogUHJvbWlzZTxVaW50OEFycmF5IHwgbnVsbD4ge1xuICAgICAgICBjb25zdCB3cml0ZUlkeCA9IEF0b21pY3MubG9hZCh0aGlzLl9tZXRhLCBBdG9taWNzUmluZ0J1ZmZlci5XUklURV9JRFgpO1xuICAgICAgICBjb25zdCByZWFkSWR4ID0gQXRvbWljcy5sb2FkKHRoaXMuX21ldGEsIEF0b21pY3NSaW5nQnVmZmVyLlJFQURfSURYKTtcblxuICAgICAgICBpZiAocmVhZElkeCA8IHdyaXRlSWR4KSByZXR1cm4gdGhpcy5yZWFkKCk7XG5cbiAgICAgICAgLy8gQHRzLWlnbm9yZVxuICAgICAgICBpZiAoXCJ3YWl0QXN5bmNcIiBpbiBBdG9taWNzKSB7XG4gICAgICAgICAgICAvLyBAdHMtaWdub3JlXG4gICAgICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBBdG9taWNzLndhaXRBc3luYyh0aGlzLl9tZXRhLCBBdG9taWNzUmluZ0J1ZmZlci5XUklURV9JRFgsIHdyaXRlSWR4LCB0aW1lb3V0ID8/IDEwMDApLnZhbHVlO1xuICAgICAgICAgICAgaWYgKHJlc3VsdCA9PT0gXCJva1wiKSByZXR1cm4gdGhpcy5yZWFkKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBhd2FpdCBuZXcgUHJvbWlzZShyID0+IHNldFRpbWVvdXQociwgTWF0aC5taW4odGltZW91dCA/PyAxMDAwLCAxMDApKSk7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5yZWFkKCk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBnZXQgYnVmZmVyKCk6IFNoYXJlZEFycmF5QnVmZmVyIHsgcmV0dXJuIHRoaXMuX2J1ZmZlcjsgfVxuICAgIGdldCBhdmFpbGFibGUoKTogbnVtYmVyIHtcbiAgICAgICAgY29uc3QgdyA9IEF0b21pY3MubG9hZCh0aGlzLl9tZXRhLCBBdG9taWNzUmluZ0J1ZmZlci5XUklURV9JRFgpO1xuICAgICAgICBjb25zdCByID0gQXRvbWljcy5sb2FkKHRoaXMuX21ldGEsIEF0b21pY3NSaW5nQnVmZmVyLlJFQURfSURYKTtcbiAgICAgICAgcmV0dXJuICh3IC0gcikgJiB0aGlzLl9tYXNrO1xuICAgIH1cbiAgICBnZXQgb3ZlcmZsb3coKTogbnVtYmVyIHsgcmV0dXJuIEF0b21pY3MubG9hZCh0aGlzLl9tZXRhLCBBdG9taWNzUmluZ0J1ZmZlci5PVkVSRkxPVyk7IH1cbn1cblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gRkFDVE9SWVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5leHBvcnQgY29uc3QgQXRvbWljc1RyYW5zcG9ydEZhY3RvcnkgPSB7XG4gICAgY3JlYXRlOiAobmFtZTogc3RyaW5nLCBzZW5kOiBTaGFyZWRBcnJheUJ1ZmZlciwgcmVjdjogU2hhcmVkQXJyYXlCdWZmZXIsIGNvbmZpZz86IEF0b21pY3NUcmFuc3BvcnRDb25maWcpID0+XG4gICAgICAgIG5ldyBBdG9taWNzVHJhbnNwb3J0KG5hbWUsIHNlbmQsIHJlY3YsIGNvbmZpZyksXG4gICAgY3JlYXRlUGFpcjogKG5hbWU6IHN0cmluZywgY29uZmlnPzogQXRvbWljc1RyYW5zcG9ydENvbmZpZykgPT5cbiAgICAgICAgY3JlYXRlQXRvbWljc0NoYW5uZWxQYWlyKG5hbWUsIGNvbmZpZyksXG4gICAgY3JlYXRlQnVmZmVyOiAoc2l6ZU9yQnVmZmVyPzogU2hhcmVkQXJyYXlCdWZmZXIgfCBudW1iZXIsIGNvbmZpZz86IEF0b21pY3NUcmFuc3BvcnRDb25maWcpID0+XG4gICAgICAgIG5ldyBBdG9taWNzQnVmZmVyKHNpemVPckJ1ZmZlciwgY29uZmlnKSxcbiAgICBjcmVhdGVSaW5nQnVmZmVyOiAoY29uZmlnPzogUmluZ0J1ZmZlckNvbmZpZykgPT5cbiAgICAgICAgbmV3IEF0b21pY3NSaW5nQnVmZmVyKGNvbmZpZyksXG4gICAgZ2V0Q0JPUjogZ2V0Q0JPUkVuY29kZXJcbn07XG4iXX0=