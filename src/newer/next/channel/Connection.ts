/**
 * Channel Connection - Connection abstraction layer
 *
 * Provides connection pooling, state management, and message routing.
 */

import { UUIDv4 } from "fest/core";
import { ChannelSubject, MessageObservable, filter } from "../observable/Observable";
import type {
    ChannelMessage,
    ChannelState,
    ChannelMeta,
    Observer,
    Subscription,
    TransportType,
    ConnectionOptions,
    PendingRequest
} from "../types/Interface";

// Re-export types
export type { TransportType, ConnectionOptions };

// ============================================================================
// CONNECTION STATS
// ============================================================================

export interface ConnectionStats {
    messagesSent: number;
    messagesReceived: number;
    bytesTransferred: number;
    latencyMs: number;
    uptime: number;
    reconnectCount: number;
}

// ============================================================================
// CHANNEL CONNECTION
// ============================================================================

export class ChannelConnection {
    private _id = UUIDv4();
    private _state: ChannelState = "disconnected";
    private _inbound = new ChannelSubject<ChannelMessage>({ bufferSize: 1000 });
    private _outbound = new ChannelSubject<ChannelMessage>({ bufferSize: 1000 });
    private _stateChanges = new ChannelSubject<ChannelState>();
    private _connectedPeers = new Map<string, ChannelMeta>();
    private _subs: Subscription[] = [];
    private _stats: ConnectionStats = { messagesSent: 0, messagesReceived: 0, bytesTransferred: 0, latencyMs: 0, uptime: 0, reconnectCount: 0 };
    private _startTime = 0;
    // @ts-ignore
    private _pending = new Map<string, PromiseWithResolvers<any>>();
    private _buffer: ChannelMessage[] = [];
    private _opts: Required<ConnectionOptions>;

    constructor(
        private _name: string,
        private _transportType: TransportType = "internal",
        options: ConnectionOptions = {}
    ) {
        this._opts = {
            timeout: 30000,
            autoReconnect: true,
            reconnectInterval: 1000,
            maxReconnectAttempts: 5,
            bufferMessages: true,
            bufferSize: 1000,
            metadata: {},
            ...options
        };
        this._setupSubscriptions();
    }

    // Observable API
    subscribe(observer: Observer<ChannelMessage> | ((msg: ChannelMessage) => void), fromChannel?: string): Subscription {
        const src = fromChannel ? filter((m: ChannelMessage) => m.sender === fromChannel)(this._inbound) : this._inbound;
        return src.subscribe(typeof observer === "function" ? { next: observer } : observer);
    }

    next(message: ChannelMessage): void {
        if (this._state !== "connected") {
            if (this._opts.bufferMessages && this._buffer.length < this._opts.bufferSize) {
                this._buffer.push(message);
            }
            return;
        }
        this._outbound.next(message);
        this._stats.messagesSent++;
    }

    async request<T = any>(toChannel: string, payload: any, opts: { timeout?: number; action?: string; path?: string[] } = {}): Promise<T> {
        const reqId = UUIDv4();
        // @ts-ignore
        const resolvers = Promise.withResolvers<T>();
        this._pending.set(reqId, resolvers);

        const timeout = setTimeout(() => {
            if (this._pending.has(reqId)) {
                this._pending.delete(reqId);
                resolvers.reject(new Error(`Request timeout`));
            }
        }, opts.timeout ?? this._opts.timeout);

        this.next({
            id: UUIDv4(), channel: toChannel, sender: this._name, type: "request",
            reqId, payload: { ...payload, action: opts.action, path: opts.path }, timestamp: Date.now()
        });

        return resolvers.promise.finally(() => clearTimeout(timeout));
    }

    respond(original: ChannelMessage, payload: any): void {
        this.next({ id: UUIDv4(), channel: original.sender, sender: this._name, type: "response", reqId: original.reqId, payload, timestamp: Date.now() });
    }

    emit(toChannel: string, eventType: string, data: any): void {
        this.next({ id: UUIDv4(), channel: toChannel, sender: this._name, type: "event", payload: { type: eventType, data }, timestamp: Date.now() });
    }

    subscribeOutbound(observer: Observer<ChannelMessage> | ((msg: ChannelMessage) => void)): Subscription {
        return this._outbound.subscribe(typeof observer === "function" ? { next: observer } : observer);
    }

    pushInbound(message: ChannelMessage): void {
        this._stats.messagesReceived++;
        if (message.type === "response" && message.reqId) {
            const r = this._pending.get(message.reqId);
            if (r) { this._pending.delete(message.reqId); r.resolve(message.payload); return; }
        }
        this._inbound.next(message);
    }

    // Connection lifecycle
    async connect(): Promise<void> {
        if (this._state === "connected") return;
        this._setState("connecting");
        this._startTime = Date.now();
        this._setState("connected");
        this._flushBuffer();
    }

    disconnect(): void {
        if (this._state === "disconnected" || this._state === "closed") return;
        this._setState("disconnected");
        this._subs.forEach((s) => s.unsubscribe());
        this._subs = [];
    }

    close(): void {
        this.disconnect();
        this._setState("closed");
        this._inbound.complete();
        this._outbound.complete();
        this._stateChanges.complete();
    }

    markConnected(): void { this._setState("connected"); this._flushBuffer(); }
    markDisconnected(): void { this._setState("disconnected"); }

    // State management
    private _setState(state: ChannelState): void {
        if (this._state !== state) { this._state = state; this._stateChanges.next(state); }
    }

    private _flushBuffer(): void {
        for (const msg of this._buffer) this._outbound.next(msg);
        this._buffer = [];
    }

    private _setupSubscriptions(): void {
        this._subs.push(this._inbound.subscribe({
            next: (msg) => {
                if (msg.type === "signal" && msg.payload?.type === "connect") {
                    this._connectedPeers.set(msg.sender, { name: msg.sender, state: "connected", isHost: false });
                }
            }
        }));
    }

    // Getters
    get id(): string { return this._id; }
    get name(): string { return this._name; }
    get state(): ChannelState { return this._state; }
    get transportType(): TransportType { return this._transportType; }
    get stats(): ConnectionStats { return { ...this._stats, uptime: this._startTime ? Date.now() - this._startTime : 0 }; }
    get stateChanges() { return this._stateChanges; }
    get connectedPeers(): string[] { return [...this._connectedPeers.keys()]; }
    get meta(): ChannelMeta { return { id: this._id, name: this._name, state: this._state, isHost: false, connectedChannels: new Set(this._connectedPeers.keys()) }; }
}

// ============================================================================
// CONNECTION POOL
// ============================================================================

export class ConnectionPool {
    private _connections = new Map<string, ChannelConnection>();
    private static _instance: ConnectionPool | null = null;

    static getInstance(): ConnectionPool {
        if (!ConnectionPool._instance) ConnectionPool._instance = new ConnectionPool();
        return ConnectionPool._instance;
    }

    getOrCreate(name: string, transportType: TransportType = "internal", options: ConnectionOptions = {}): ChannelConnection {
        if (!this._connections.has(name)) {
            this._connections.set(name, new ChannelConnection(name, transportType, options));
        }
        return this._connections.get(name)!;
    }

    get(name: string): ChannelConnection | undefined { return this._connections.get(name); }
    has(name: string): boolean { return this._connections.has(name); }
    delete(name: string): boolean { this._connections.get(name)?.close(); return this._connections.delete(name); }
    clear(): void { this._connections.forEach((c) => c.close()); this._connections.clear(); }
    get size(): number { return this._connections.size; }
    get names(): string[] { return [...this._connections.keys()]; }
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

export const getConnectionPool = (): ConnectionPool => ConnectionPool.getInstance();
export const getConnection = (name: string, transportType?: TransportType, options?: ConnectionOptions): ChannelConnection =>
    getConnectionPool().getOrCreate(name, transportType, options);
export const getHostConnection = (name: string = "$host$", options?: ConnectionOptions): ChannelConnection =>
    getConnection(name, "internal", { ...options, metadata: { ...options?.metadata, isHost: true } });
