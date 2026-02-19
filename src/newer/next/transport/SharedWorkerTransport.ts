/**
 * SharedWorker Transport
 *
 * Enables shared worker communication across multiple tabs/windows.
 * SharedWorker provides a shared context that persists across all
 * connected browsing contexts.
 */

import { UUIDv4 } from "fest/core";
import { Observable, ChannelSubject, type Subscription, type Observer } from "../observable/Observable";
import type { ChannelMessage, PendingRequest, Subscriber } from "../types/Interface";

// ============================================================================
// TYPES
// ============================================================================

export interface SharedWorkerMessage<T = any> extends ChannelMessage {
    portId?: string;
    broadcast?: boolean;
}

export interface SharedWorkerOptions {
    name?: string;
    credentials?: RequestCredentials;
    type?: WorkerType;
    autoConnect?: boolean;
}

export interface SharedWorkerPortInfo {
    id: string;
    connectedAt: number;
    lastSeen: number;
    metadata?: Record<string, any>;
}

// ============================================================================
// SHARED WORKER CLIENT (Page/Tab Side)
// ============================================================================

/**
 * SharedWorker client - connects to a shared worker from page/tab
 */
export class SharedWorkerClient {
    private _worker: SharedWorker | null = null;
    private _port: MessagePort | null = null;
    private _subs = new Set<Observer<SharedWorkerMessage>>();
    private _pending = new Map<string, PendingRequest>();
    private _listening = false;
    private _cleanup: (() => void) | null = null;
    private _portId: string = UUIDv4();
    private _state = new ChannelSubject<"connecting" | "connected" | "disconnected" | "error">();

    constructor(
        private _scriptUrl: string | URL,
        private _channelName: string,
        private _options: SharedWorkerOptions = {}
    ) {
        if (_options.autoConnect !== false) this.connect();
    }

    connect(): void {
        if (this._worker) return;

        try {
            this._worker = new SharedWorker(this._scriptUrl, {
                name: this._options.name,
                credentials: this._options.credentials,
                type: this._options.type
            });
            this._port = this._worker.port;
            this._setupListeners();
            this._port.start();
            this._state.next("connecting");

            // Send handshake
            this.send({
                id: UUIDv4(),
                channel: this._channelName,
                sender: this._portId,
                type: "signal",
                payload: { action: "connect", portId: this._portId }
            });
        } catch (e) {
            this._state.next("error");
            throw e;
        }
    }

    send(msg: SharedWorkerMessage, transfer?: Transferable[]): void {
        if (!this._port) return;
        const { transferable, ...data } = msg as any;
        this._port.postMessage({ ...data, portId: this._portId }, transfer ?? []);
    }

    request(msg: Omit<SharedWorkerMessage, "reqId"> & { reqId?: string }): Promise<any> {
        const reqId = msg.reqId ?? UUIDv4();
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                if (this._pending.has(reqId)) {
                    this._pending.delete(reqId);
                    reject(new Error("Request timeout"));
                }
            }, 30000);

            this._pending.set(reqId, {
                resolve: (v) => { clearTimeout(timeout); resolve(v); },
                reject: (e) => { clearTimeout(timeout); reject(e); },
                timestamp: Date.now()
            });

            this.send({ ...msg, reqId, type: "request" } as SharedWorkerMessage);
        });
    }

    broadcast(msg: SharedWorkerMessage, transfer?: Transferable[]): void {
        this.send({ ...msg, broadcast: true }, transfer);
    }

    subscribe(observer: Observer<SharedWorkerMessage> | ((v: SharedWorkerMessage) => void)): Subscription {
        const obs: Observer<SharedWorkerMessage> = typeof observer === "function" ? { next: observer } : observer;
        this._subs.add(obs);
        if (!this._listening) this._activate();
        return {
            closed: false,
            unsubscribe: () => {
                this._subs.delete(obs);
                if (this._subs.size === 0) this._deactivate();
            }
        };
    }

    private _setupListeners(): void {
        if (!this._port) return;

        const msgHandler = (e: MessageEvent) => {
            const data = e.data as SharedWorkerMessage;

            // Handle connection acknowledgment
            if (data.type === "signal" && data.payload?.action === "connected") {
                this._state.next("connected");
            }

            // Handle response
            if (data.type === "response" && data.reqId) {
                const p = this._pending.get(data.reqId);
                if (p) {
                    this._pending.delete(data.reqId);
                    if (data.payload?.error) p.reject(new Error(data.payload.error));
                    else p.resolve(data.payload?.result ?? data.payload);
                }
            }

            for (const s of this._subs) {
                try { s.next?.(data); } catch (e) { s.error?.(e as Error); }
            }
        };

        const errHandler = (e: MessageEvent) => {
            this._state.next("error");
            const err = new Error("SharedWorker error");
            for (const s of this._subs) s.error?.(err);
        };

        this._port.addEventListener("message", msgHandler);
        this._port.addEventListener("messageerror", errHandler);
        this._cleanup = () => {
            this._port?.removeEventListener("message", msgHandler);
            this._port?.removeEventListener("messageerror", errHandler);
        };
    }

    private _activate(): void { this._listening = true; }
    private _deactivate(): void {
        this._cleanup?.();
        this._cleanup = null;
        this._listening = false;
    }

    disconnect(): void {
        this.send({
            id: UUIDv4(),
            channel: this._channelName,
            sender: this._portId,
            type: "signal",
            payload: { action: "disconnect", portId: this._portId }
        });
        this._deactivate();
        this._port?.close();
        this._port = null;
        this._worker = null;
        this._state.next("disconnected");
    }

    close(): void {
        this._subs.forEach(s => s.complete?.());
        this._subs.clear();
        this.disconnect();
    }

    get port(): MessagePort | null { return this._port; }
    get portId(): string { return this._portId; }
    get isConnected(): boolean { return this._state.getValue() === "connected"; }
    get state() { return this._state; }
    get channelName(): string { return this._channelName; }
}

// ============================================================================
// SHARED WORKER HOST (Inside SharedWorker)
// ============================================================================

/**
 * SharedWorker host - runs inside the shared worker context
 */
export class SharedWorkerHost {
    private _ports = new Map<string, { port: MessagePort; info: SharedWorkerPortInfo }>();
    private _subs = new Set<Observer<SharedWorkerMessage>>();
    private _state = new ChannelSubject<"ready" | "error">();

    constructor(private _channelName: string) {
        this._setupGlobalHandler();
    }

    private _setupGlobalHandler(): void {
        // In SharedWorker context, `self` has `onconnect`
        if (typeof self !== "undefined" && "onconnect" in self) {
            (self as any).onconnect = (e: MessageEvent) => {
                const port = e.ports[0];
                const portId = UUIDv4();
                this._registerPort(portId, port);
            };
            this._state.next("ready");
        }
    }

    private _registerPort(portId: string, port: MessagePort): void {
        const info: SharedWorkerPortInfo = {
            id: portId,
            connectedAt: Date.now(),
            lastSeen: Date.now()
        };

        port.onmessage = (e: MessageEvent) => {
            const data = e.data as SharedWorkerMessage;
            info.lastSeen = Date.now();

            // Handle connection message
            if (data.type === "signal") {
                if (data.payload?.action === "connect") {
                    const realPortId = data.payload.portId || portId;
                    // Update mapping with real portId
                    this._ports.delete(portId);
                    info.id = realPortId;
                    this._ports.set(realPortId, { port, info });

                    // Send acknowledgment
                    port.postMessage({
                        id: UUIDv4(),
                        channel: this._channelName,
                        sender: "host",
                        type: "signal",
                        payload: { action: "connected", portId: realPortId }
                    });
                    return;
                }

                if (data.payload?.action === "disconnect") {
                    this._unregisterPort(data.portId ?? portId);
                    return;
                }
            }

            // Handle broadcast
            if (data.broadcast) {
                this.broadcast(data, data.portId ?? portId);
            }

            // Notify subscribers
            for (const s of this._subs) {
                try { s.next?.({ ...data, portId: data.portId ?? portId }); }
                catch (e) { s.error?.(e as Error); }
            }
        };

        port.onmessageerror = (e: MessageEvent) => {
            const err = new Error("Port message error");
            for (const s of this._subs) s.error?.(err);
        };

        port.start();
        this._ports.set(portId, { port, info });
    }

    private _unregisterPort(portId: string): void {
        const entry = this._ports.get(portId);
        if (entry) {
            entry.port.close();
            this._ports.delete(portId);
        }
    }

    send(portId: string, msg: SharedWorkerMessage, transfer?: Transferable[]): void {
        const entry = this._ports.get(portId);
        if (!entry) return;
        const { transferable, ...data } = msg as any;
        entry.port.postMessage(data, transfer ?? []);
    }

    broadcast(msg: SharedWorkerMessage, excludePortId?: string): void {
        const { transferable, ...data } = msg as any;
        for (const [id, entry] of this._ports) {
            if (id !== excludePortId) {
                entry.port.postMessage({ ...data, broadcast: true });
            }
        }
    }

    respond(msg: SharedWorkerMessage, result: any, transfer?: Transferable[]): void {
        if (!msg.portId || !msg.reqId) return;
        this.send(msg.portId, {
            id: UUIDv4(),
            channel: msg.sender,
            sender: this._channelName,
            type: "response",
            reqId: msg.reqId,
            payload: { result }
        }, transfer);
    }

    subscribe(observer: Observer<SharedWorkerMessage> | ((v: SharedWorkerMessage) => void)): Subscription {
        const obs: Observer<SharedWorkerMessage> = typeof observer === "function" ? { next: observer } : observer;
        this._subs.add(obs);
        return {
            closed: false,
            unsubscribe: () => { this._subs.delete(obs); }
        };
    }

    getPorts(): Map<string, SharedWorkerPortInfo> {
        const result = new Map<string, SharedWorkerPortInfo>();
        for (const [id, entry] of this._ports) {
            result.set(id, { ...entry.info });
        }
        return result;
    }

    get portCount(): number { return this._ports.size; }
    get state() { return this._state; }
    get channelName(): string { return this._channelName; }
}

// ============================================================================
// OBSERVABLE WRAPPER
// ============================================================================

export function createSharedWorkerObservable(
    scriptUrl: string | URL,
    channelName: string,
    options?: SharedWorkerOptions
): SharedWorkerClient {
    return new SharedWorkerClient(scriptUrl, channelName, options);
}

export function createSharedWorkerHostObservable(channelName: string): SharedWorkerHost {
    return new SharedWorkerHost(channelName);
}

// ============================================================================
// FACTORY
// ============================================================================

export const SharedWorkerObservableFactory = {
    client: (url: string | URL, name: string, opts?: SharedWorkerOptions) =>
        new SharedWorkerClient(url, name, opts),
    host: (name: string) => new SharedWorkerHost(name)
};
