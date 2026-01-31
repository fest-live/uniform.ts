/**
 * MessagePort/MessageChannel Enhanced Transport
 *
 * Advanced port-based communication with:
 * - MessageChannel pair creation
 * - Port pooling and management
 * - Cross-context transfer (iframe, worker, window)
 * - Automatic reconnection
 * - Request/response with timeout
 */

import { UUIDv4 } from "fest/core";
import { Observable, ChannelSubject, type Subscription, type Observer } from "../observable/Observable";
import type { ChannelMessage, PendingRequest, Subscriber } from "../types/Interface";

// ============================================================================
// TYPES
// ============================================================================

export interface PortMessage<T = any> extends ChannelMessage {
    portId?: string;
    sourceContext?: "main" | "worker" | "iframe" | "window";
}

export interface PortTransportConfig {
    autoStart?: boolean;
    timeout?: number;
    retryOnError?: boolean;
    maxRetries?: number;
    keepAlive?: boolean;
    keepAliveInterval?: number;
}

export interface PortPair {
    local: MessagePort;
    remote: MessagePort;
}

// ============================================================================
// MESSAGE PORT TRANSPORT
// ============================================================================

export class PortTransport {
    private _port: MessagePort;
    private _subs = new Set<Observer<PortMessage>>();
    private _pending = new Map<string, PendingRequest>();
    private _listening = false;
    private _cleanup: (() => void) | null = null;
    private _portId: string = UUIDv4();
    private _state = new ChannelSubject<"closed" | "ready" | "error">();
    private _keepAliveTimer: ReturnType<typeof setInterval> | null = null;

    constructor(
        port: MessagePort,
        private _channelName: string,
        private _config: PortTransportConfig = {}
    ) {
        this._port = port;
        this._setupPort();
        if (_config.autoStart !== false) this.start();
    }

    private _setupPort(): void {
        const msgHandler = (e: MessageEvent) => {
            const data = e.data as PortMessage;

            // Handle response
            if (data.type === "response" && data.reqId) {
                const p = this._pending.get(data.reqId);
                if (p) {
                    this._pending.delete(data.reqId);
                    if (data.payload?.error) p.reject(new Error(data.payload.error));
                    else p.resolve(data.payload?.result ?? data.payload);
                    return;
                }
            }

            // Handle keep-alive ping
            if (data.type === "signal" && data.payload?.action === "ping") {
                this.send({
                    id: UUIDv4(),
                    channel: this._channelName,
                    sender: this._portId,
                    type: "signal",
                    payload: { action: "pong" }
                });
                return;
            }

            data.portId = data.portId ?? this._portId;

            for (const s of this._subs) {
                try { s.next?.(data); } catch (e) { s.error?.(e as Error); }
            }
        };

        const errHandler = () => {
            this._state.next("error");
            const err = new Error("Port error");
            for (const s of this._subs) s.error?.(err);
        };

        this._port.addEventListener("message", msgHandler);
        this._port.addEventListener("messageerror", errHandler);

        this._cleanup = () => {
            this._port.removeEventListener("message", msgHandler);
            this._port.removeEventListener("messageerror", errHandler);
        };
    }

    start(): void {
        if (this._listening) return;
        this._port.start();
        this._listening = true;
        this._state.next("ready");

        if (this._config.keepAlive) {
            this._startKeepAlive();
        }
    }

    send(msg: PortMessage, transfer?: Transferable[]): void {
        const { transferable, ...data } = msg as any;
        this._port.postMessage({ ...data, portId: this._portId }, transfer ?? []);
    }

    request(msg: Omit<PortMessage, "reqId"> & { reqId?: string }): Promise<any> {
        const reqId = msg.reqId ?? UUIDv4();
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                this._pending.delete(reqId);
                reject(new Error("Request timeout"));
            }, this._config.timeout ?? 30000);

            this._pending.set(reqId, {
                resolve: (v) => { clearTimeout(timeout); resolve(v); },
                reject: (e) => { clearTimeout(timeout); reject(e); },
                timestamp: Date.now()
            });

            this.send({ ...msg, reqId, type: "request" } as PortMessage);
        });
    }

    subscribe(observer: Observer<PortMessage> | ((v: PortMessage) => void)): Subscription {
        const obs: Observer<PortMessage> = typeof observer === "function" ? { next: observer } : observer;
        this._subs.add(obs);
        return {
            closed: false,
            unsubscribe: () => { this._subs.delete(obs); }
        };
    }

    private _startKeepAlive(): void {
        this._keepAliveTimer = setInterval(() => {
            this.send({
                id: UUIDv4(),
                channel: this._channelName,
                sender: this._portId,
                type: "signal",
                payload: { action: "ping" }
            });
        }, this._config.keepAliveInterval ?? 30000);
    }

    close(): void {
        if (this._keepAliveTimer) {
            clearInterval(this._keepAliveTimer);
            this._keepAliveTimer = null;
        }
        this._cleanup?.();
        this._subs.forEach(s => s.complete?.());
        this._subs.clear();
        this._port.close();
        this._state.next("closed");
    }

    get port(): MessagePort { return this._port; }
    get portId(): string { return this._portId; }
    get isListening(): boolean { return this._listening; }
    get state() { return this._state; }
    get channelName(): string { return this._channelName; }
}

// ============================================================================
// MESSAGE CHANNEL FACTORY
// ============================================================================

export interface ChannelPairResult {
    local: PortTransport;
    remote: MessagePort;
    transfer(): MessagePort;
}

/**
 * Create a MessageChannel pair with configured local transport
 */
export function createChannelPair(
    channelName: string,
    config?: PortTransportConfig
): ChannelPairResult {
    const channel = new MessageChannel();

    const local = new PortTransport(channel.port1, channelName, config);

    return {
        local,
        remote: channel.port2,
        transfer: () => {
            // Use ArrayBuffer.transfer-like semantics for port
            const port = channel.port2;
            return port;
        }
    };
}

/**
 * Create transport from remote port
 */
export function createFromPort(
    port: MessagePort,
    channelName: string,
    config?: PortTransportConfig
): PortTransport {
    return new PortTransport(port, channelName, config);
}

// ============================================================================
// PORT POOL (Multiplexed Channels)
// ============================================================================

export class PortPool {
    private _channels = new Map<string, PortTransport>();
    private _mainPort: PortTransport | null = null;
    private _subs = new Set<Observer<PortMessage>>();

    constructor(
        private _defaultConfig: PortTransportConfig = {}
    ) {}

    /**
     * Create new channel in pool
     */
    create(channelName: string, config?: PortTransportConfig): ChannelPairResult {
        const result = createChannelPair(channelName, { ...this._defaultConfig, ...config });

        result.local.subscribe({
            next: (msg) => {
                for (const s of this._subs) {
                    try { s.next?.(msg); } catch (e) { s.error?.(e as Error); }
                }
            }
        });

        this._channels.set(channelName, result.local);
        return result;
    }

    /**
     * Add existing port to pool
     */
    add(channelName: string, port: MessagePort, config?: PortTransportConfig): PortTransport {
        const transport = new PortTransport(port, channelName, { ...this._defaultConfig, ...config });

        transport.subscribe({
            next: (msg) => {
                for (const s of this._subs) {
                    try { s.next?.(msg); } catch (e) { s.error?.(e as Error); }
                }
            }
        });

        this._channels.set(channelName, transport);
        return transport;
    }

    /**
     * Get channel by name
     */
    get(channelName: string): PortTransport | undefined {
        return this._channels.get(channelName);
    }

    /**
     * Send to specific channel
     */
    send(channelName: string, msg: PortMessage, transfer?: Transferable[]): void {
        this._channels.get(channelName)?.send(msg, transfer);
    }

    /**
     * Broadcast to all channels
     */
    broadcast(msg: PortMessage, transfer?: Transferable[]): void {
        for (const transport of this._channels.values()) {
            transport.send(msg, transfer);
        }
    }

    /**
     * Request on specific channel
     */
    request(channelName: string, msg: PortMessage): Promise<any> {
        const channel = this._channels.get(channelName);
        if (!channel) return Promise.reject(new Error(`Channel ${channelName} not found`));
        return channel.request(msg);
    }

    /**
     * Subscribe to all channels
     */
    subscribe(observer: Observer<PortMessage> | ((v: PortMessage) => void)): Subscription {
        const obs: Observer<PortMessage> = typeof observer === "function" ? { next: observer } : observer;
        this._subs.add(obs);
        return {
            closed: false,
            unsubscribe: () => { this._subs.delete(obs); }
        };
    }

    /**
     * Remove channel
     */
    remove(channelName: string): void {
        const channel = this._channels.get(channelName);
        if (channel) {
            channel.close();
            this._channels.delete(channelName);
        }
    }

    /**
     * Close all channels
     */
    close(): void {
        this._subs.forEach(s => s.complete?.());
        this._subs.clear();
        for (const channel of this._channels.values()) {
            channel.close();
        }
        this._channels.clear();
    }

    get channelNames(): string[] { return Array.from(this._channels.keys()); }
    get size(): number { return this._channels.size; }
}

// ============================================================================
// WINDOW/IFRAME PORT CONNECTOR
// ============================================================================

export interface WindowPortConnectorConfig extends PortTransportConfig {
    targetOrigin?: string;
    handshakeTimeout?: number;
}

/**
 * Connect to window/iframe via MessageChannel
 */
export class WindowPortConnector {
    private _transport: PortTransport | null = null;
    private _state = new ChannelSubject<"disconnected" | "connecting" | "connected" | "error">();
    private _handshakeComplete = false;

    constructor(
        private _target: Window,
        private _channelName: string,
        private _config: WindowPortConnectorConfig = {}
    ) {}

    /**
     * Initiate connection to target window
     */
    async connect(): Promise<PortTransport> {
        if (this._transport && this._handshakeComplete) {
            return this._transport;
        }

        this._state.next("connecting");

        const { local, remote } = createChannelPair(this._channelName, this._config);

        // Send port to target window
        this._target.postMessage(
            {
                type: "port-connect",
                channelName: this._channelName,
                portId: local.portId
            },
            this._config.targetOrigin ?? "*",
            [remote]
        );

        // Wait for handshake
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error("Handshake timeout"));
                this._state.next("error");
            }, this._config.handshakeTimeout ?? 10000);

            const sub = local.subscribe({
                next: (msg) => {
                    if (msg.type === "signal" && msg.payload?.action === "handshake-ack") {
                        clearTimeout(timeout);
                        this._handshakeComplete = true;
                        this._transport = local;
                        this._state.next("connected");
                        sub.unsubscribe();
                        resolve(local);
                    }
                }
            });
        });
    }

    /**
     * Listen for incoming connections (target side)
     */
    static listen(
        channelName: string,
        handler: (transport: PortTransport) => void,
        config?: WindowPortConnectorConfig
    ): () => void {
        const msgHandler = (e: MessageEvent) => {
            if (e.data?.type !== "port-connect" || e.data?.channelName !== channelName) return;
            if (!e.ports[0]) return;

            const transport = new PortTransport(e.ports[0], channelName, config);

            // Send handshake acknowledgment
            transport.send({
                id: UUIDv4(),
                channel: channelName,
                sender: transport.portId,
                type: "signal",
                payload: { action: "handshake-ack" }
            });

            handler(transport);
        };

        window.addEventListener("message", msgHandler);
        return () => window.removeEventListener("message", msgHandler);
    }

    disconnect(): void {
        this._transport?.close();
        this._transport = null;
        this._handshakeComplete = false;
        this._state.next("disconnected");
    }

    get isConnected(): boolean { return this._handshakeComplete; }
    get state() { return this._state; }
    get transport(): PortTransport | null { return this._transport; }
}

// ============================================================================
// COMLINK-LIKE PROXY OVER PORT (using unified Proxy module)
// ============================================================================

import {
    createSenderProxy,
    createExposeHandler,
    type ProxyMethods
} from "../channel/Proxy";

// Re-export for backward compatibility
export type { ProxyMethods };

/**
 * Create proxy for remote object over PortTransport
 *
 * Uses unified Proxy module for consistent behavior.
 */
export function createPortProxy<T extends object>(
    transport: PortTransport,
    targetPath: string[] = []
): ProxyMethods<T> {
    return createSenderProxy<T>({
        request: (msg) => transport.request(msg),
        channelName: transport.channelName,
        senderId: transport.portId
    }, targetPath);
}

/**
 * Expose object methods over PortTransport
 *
 * Uses unified Proxy module's expose handler.
 */
export function exposeOverPort<T extends object>(
    transport: PortTransport,
    target: T
): Subscription {
    const handler = createExposeHandler(target);

    return transport.subscribe({
        next: async (msg) => {
            if (msg.type !== "request" || !msg.payload?.path) return;

            const { action, path, args } = msg.payload;
            let result: any;
            let error: string | undefined;

            try {
                result = await handler(action, path, args ?? []);
            } catch (e) {
                error = e instanceof Error ? e.message : String(e);
            }

            transport.send({
                id: UUIDv4(),
                channel: msg.sender,
                sender: transport.portId,
                type: "response",
                reqId: msg.reqId,
                payload: error ? { error } : { result }
            });
        }
    });
}

// ============================================================================
// FACTORY
// ============================================================================

export const PortTransportFactory = {
    create: (port: MessagePort, name: string, config?: PortTransportConfig) =>
        new PortTransport(port, name, config),
    createPair: (name: string, config?: PortTransportConfig) =>
        createChannelPair(name, config),
    createPool: (config?: PortTransportConfig) =>
        new PortPool(config),
    createWindowConnector: (target: Window, name: string, config?: WindowPortConnectorConfig) =>
        new WindowPortConnector(target, name, config),
    listen: WindowPortConnector.listen,
    createProxy: createPortProxy,
    expose: exposeOverPort
};
