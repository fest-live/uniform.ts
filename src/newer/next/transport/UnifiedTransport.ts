/**
 * Unified Transport - Single entry point for all transport types
 *
 * Factory and abstraction layer that provides consistent API
 * across all supported message transports.
 */

import { UUIDv4 } from "fest/core";
import { Observable, ChannelSubject, type Subscription, type Observer } from "../observable/Observable";
import type { ChannelMessage, PendingRequest } from "../types/Interface";
import {
    createTransportSender,
    createTransportListener,
    detectTransportType,
    getTransportMeta,
    createWebSocketTransport,
    createBroadcastTransport,
    type TransportTarget,
    type TransportType,
    type TransportMeta,
    type SendFn
} from "../../core/TransportCore";

// Import specialized transports
import { SharedWorkerClient, SharedWorkerHost, type SharedWorkerOptions } from "./SharedWorkerTransport";
import { AtomicsTransport, AtomicsBuffer, AtomicsRingBuffer, createAtomicsChannelPair, type AtomicsTransportConfig } from "./AtomicsTransport";
import { RTCPeerTransport, RTCPeerManager, createBroadcastSignaling, type RTCTransportConfig } from "./RTCDataChannelTransport";
import { PortTransport, PortPool, WindowPortConnector, createChannelPair, type PortTransportConfig } from "./PortTransport";
import { TransferableStorage, MessageQueueStorage, type TransferableStorageConfig } from "../storage/TransferableStorage";
import { SocketIOObservable, type SocketIOLike, type SocketObservableOptions } from "../observable/SocketIOObservable";
import {
    ChromeRuntimeObservable,
    ChromeTabsObservable,
    ChromePortObservable,
    ChromeExternalObservable,
    type ChromeObservableOptions
} from "../observable/ChromeObservable";
import { ServiceWorkerHost, ServiceWorkerClient, type SWHostConfig } from "./ServiceWorkerHost";

// ============================================================================
// TYPES
// ============================================================================

export interface UnifiedTransportConfig {
    channelName: string;
    type?: TransportType;
    timeout?: number;
    autoConnect?: boolean;
    metadata?: Record<string, any>;
}

export interface TransportInstance {
    send(msg: ChannelMessage, transfer?: Transferable[]): void;
    request(msg: ChannelMessage): Promise<any>;
    subscribe(observer: Observer<ChannelMessage> | ((v: ChannelMessage) => void)): Subscription;
    close(): void;
    readonly type: TransportType;
    readonly channelName: string;
    readonly isReady: boolean;
}

// ============================================================================
// ABSTRACT TRANSPORT
// ============================================================================

export abstract class AbstractTransport implements TransportInstance {
    protected _subs = new Set<Observer<ChannelMessage>>();
    protected _pending = new Map<string, PendingRequest>();
    protected _state = new ChannelSubject<"disconnected" | "connecting" | "connected" | "error">();
    protected _ready = false;

    constructor(
        protected _type: TransportType,
        protected _channelName: string,
        protected _config: UnifiedTransportConfig
    ) {}

    abstract send(msg: ChannelMessage, transfer?: Transferable[]): void;

    request(msg: ChannelMessage): Promise<any> {
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

            this.send({ ...msg, reqId, type: "request" } as ChannelMessage);
        });
    }

    subscribe(observer: Observer<ChannelMessage> | ((v: ChannelMessage) => void)): Subscription {
        const obs: Observer<ChannelMessage> = typeof observer === "function" ? { next: observer } : observer;
        this._subs.add(obs);
        return {
            closed: false,
            unsubscribe: () => { this._subs.delete(obs); }
        };
    }

    protected _handleMessage(data: ChannelMessage): void {
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

        for (const s of this._subs) {
            try { s.next?.(data); } catch (e) { s.error?.(e as Error); }
        }
    }

    close(): void {
        this._subs.forEach(s => s.complete?.());
        this._subs.clear();
        this._ready = false;
        this._state.next("disconnected");
    }

    get type(): TransportType { return this._type; }
    get channelName(): string { return this._channelName; }
    get isReady(): boolean { return this._ready; }
    get state() { return this._state; }
}

// ============================================================================
// NATIVE TRANSPORT WRAPPER
// ============================================================================

class NativeTransport extends AbstractTransport {
    private _sendFn: SendFn<ChannelMessage>;
    private _cleanup: (() => void) | null = null;

    constructor(
        private _target: TransportTarget,
        config: UnifiedTransportConfig
    ) {
        super(detectTransportType(_target), config.channelName, config);
        this._sendFn = createTransportSender(_target);
        this._setupListener();
    }

    private _setupListener(): void {
        this._cleanup = createTransportListener(
            this._target,
            (data) => this._handleMessage(data),
            (err) => this._subs.forEach(s => s.error?.(err)),
            () => this._subs.forEach(s => s.complete?.())
        );
        this._ready = true;
        this._state.next("connected");
    }

    send(msg: ChannelMessage, transfer?: Transferable[]): void {
        this._sendFn(msg, transfer);
    }

    close(): void {
        this._cleanup?.();
        super.close();
    }
}

// ============================================================================
// UNIFIED FACTORY
// ============================================================================

export interface TransportFactoryOptions {
    // Worker
    worker?: {
        scriptUrl?: string | URL;
        options?: WorkerOptions;
        existing?: Worker;
    };

    // SharedWorker
    sharedWorker?: {
        scriptUrl?: string | URL;
        options?: SharedWorkerOptions;
    };

    // WebSocket
    websocket?: {
        url: string;
        protocols?: string | string[];
        reconnect?: boolean;
    };

    // BroadcastChannel
    broadcast?: {
        name?: string;
    };

    // MessagePort
    port?: {
        port?: MessagePort;
        config?: PortTransportConfig;
    };

    // Chrome Extension
    chrome?: {
        mode: "runtime" | "tabs" | "port" | "external";
        tabId?: number;
        portName?: string;
        options?: ChromeObservableOptions;
    };

    // Socket.IO
    socketio?: {
        socket: SocketIOLike;
        options?: SocketObservableOptions;
    };

    // Service Worker
    serviceWorker?: {
        mode: "host" | "client";
        config?: SWHostConfig;
    };

    // Atomics
    atomics?: {
        sendBuffer: SharedArrayBuffer;
        recvBuffer: SharedArrayBuffer;
        config?: AtomicsTransportConfig;
    };

    // WebRTC
    rtc?: {
        mode: "peer" | "manager";
        config?: RTCTransportConfig;
    };
}

/**
 * Create transport instance based on options
 */
export function createTransport(
    channelName: string,
    options: TransportFactoryOptions = {},
    config: Partial<UnifiedTransportConfig> = {}
): TransportInstance {
    const baseConfig: UnifiedTransportConfig = {
        channelName,
        timeout: 30000,
        autoConnect: true,
        ...config
    };

    // Worker
    if (options.worker) {
        const worker = options.worker.existing ??
            new Worker(options.worker.scriptUrl!, options.worker.options);
        return new NativeTransport(worker, baseConfig);
    }

    // SharedWorker
    if (options.sharedWorker) {
        const client = new SharedWorkerClient(
            options.sharedWorker.scriptUrl!,
            channelName,
            options.sharedWorker.options
        );
        return {
            send: (msg, transfer) => client.send(msg, transfer),
            request: (msg) => client.request(msg),
            subscribe: (obs) => client.subscribe(obs as any),
            close: () => client.close(),
            type: "shared-worker",
            channelName,
            isReady: true
        };
    }

    // WebSocket
    if (options.websocket) {
        const ws = createWebSocketTransport(options.websocket.url, {
            protocols: options.websocket.protocols,
            reconnect: options.websocket.reconnect
        });
        const subs = new Set<Observer<ChannelMessage>>();
        const pending = new Map<string, PendingRequest>();

        ws.listen((data) => {
            if (data.type === "response" && data.reqId) {
                const p = pending.get(data.reqId);
                if (p) {
                    pending.delete(data.reqId);
                    if (data.payload?.error) p.reject(new Error(data.payload.error));
                    else p.resolve(data.payload?.result ?? data.payload);
                    return;
                }
            }
            for (const s of subs) {
                try { s.next?.(data); } catch {}
            }
        });

        return {
            send: (msg, transfer) => ws.send(msg, transfer),
            request: (msg) => new Promise((resolve, reject) => {
                const reqId = msg.reqId ?? UUIDv4();
                const timeout = setTimeout(() => {
                    pending.delete(reqId);
                    reject(new Error("Request timeout"));
                }, baseConfig.timeout);
                pending.set(reqId, {
                    resolve: (v) => { clearTimeout(timeout); resolve(v); },
                    reject: (e) => { clearTimeout(timeout); reject(e); },
                    timestamp: Date.now()
                });
                ws.send({ ...msg, reqId, type: "request" });
            }),
            subscribe: (obs) => {
                const o: Observer<ChannelMessage> = typeof obs === "function" ? { next: obs } : obs;
                subs.add(o);
                return { closed: false, unsubscribe: () => subs.delete(o) };
            },
            close: () => { subs.clear(); ws.close(); },
            type: "websocket",
            channelName,
            isReady: ws.socket.readyState === WebSocket.OPEN
        };
    }

    // BroadcastChannel
    if (options.broadcast) {
        const bc = createBroadcastTransport(options.broadcast.name ?? channelName);
        return new NativeTransport(bc.channel, baseConfig);
    }

    // MessagePort
    if (options.port?.port) {
        const transport = new PortTransport(options.port.port, channelName, options.port.config);
        return {
            send: (msg, transfer) => transport.send(msg, transfer),
            request: (msg) => transport.request(msg),
            subscribe: (obs) => transport.subscribe(obs as any),
            close: () => transport.close(),
            type: "message-port",
            channelName,
            isReady: transport.isListening
        };
    }

    // Chrome
    if (options.chrome) {
        if (options.chrome.mode === "runtime") {
            const obs = new ChromeRuntimeObservable(undefined, options.chrome.options);
            return {
                send: (msg) => obs.send(msg),
                request: (msg) => obs.request(msg),
                subscribe: (o) => obs.subscribe(o as any),
                close: () => obs.close(),
                type: "chrome-runtime",
                channelName,
                isReady: true
            };
        }
        if (options.chrome.mode === "tabs") {
            const obs = new ChromeTabsObservable(options.chrome.tabId, options.chrome.options);
            return {
                send: (msg) => obs.send(msg),
                request: () => Promise.reject("Not supported"),
                subscribe: (o) => obs.subscribe(o as any),
                close: () => obs.close(),
                type: "chrome-tabs",
                channelName,
                isReady: true
            };
        }
        if (options.chrome.mode === "port") {
            const obs = new ChromePortObservable(options.chrome.portName ?? channelName, options.chrome.tabId);
            return {
                send: (msg) => obs.send(msg),
                request: () => Promise.reject("Not supported"),
                subscribe: (o) => obs.subscribe(o as any),
                close: () => obs.close(),
                type: "chrome-port",
                channelName,
                isReady: obs.isConnected
            };
        }
        if (options.chrome.mode === "external") {
            const obs = new ChromeExternalObservable(options.chrome.options);
            return {
                send: (msg) => obs.send(msg),
                request: () => Promise.reject("Not supported"),
                subscribe: (o) => obs.subscribe(o as any),
                close: () => obs.close(),
                type: "chrome-external",
                channelName,
                isReady: true
            };
        }
    }

    // Socket.IO
    if (options.socketio) {
        const obs = new SocketIOObservable(options.socketio.socket, channelName, options.socketio.options);
        return {
            send: (msg) => obs.send(msg),
            request: (msg) => obs.request(msg),
            subscribe: (o) => obs.subscribe(o as any),
            close: () => obs.close(),
            type: "socket-io",
            channelName,
            isReady: obs.isConnected
        };
    }

    // Service Worker
    if (options.serviceWorker) {
        if (options.serviceWorker.mode === "client") {
            const client = new ServiceWorkerClient(channelName);
            client.connect();
            return {
                send: (msg) => client.emit(msg.type, msg.payload, msg.channel),
                request: (msg) => client.request(msg.payload?.action ?? "unknown", msg.payload),
                subscribe: (o) => client.subscribe(typeof o === "function" ? o : (m) => o.next?.(m)),
                close: () => client.disconnect(),
                type: "service-worker",
                channelName,
                isReady: client.isConnected
            };
        }
    }

    // Atomics
    if (options.atomics) {
        const transport = new AtomicsTransport(
            channelName,
            options.atomics.sendBuffer,
            options.atomics.recvBuffer,
            options.atomics.config
        );
        return {
            send: (msg, transfer) => transport.send(msg),
            request: (msg) => transport.request(msg),
            subscribe: (o) => transport.subscribe(o as any),
            close: () => transport.close(),
            type: "atomics",
            channelName,
            isReady: true
        };
    }

    // RTC
    if (options.rtc) {
        if (options.rtc.mode === "peer") {
            const peer = new RTCPeerTransport(channelName, options.rtc.config);
            return {
                send: (msg) => peer.send(msg),
                request: (msg) => peer.request(msg),
                subscribe: (o) => peer.subscribe(o as any),
                close: () => peer.close(),
                type: "rtc-data",
                channelName,
                isReady: peer.connectionState === "connected"
            };
        }
        if (options.rtc.mode === "manager") {
            const manager = new RTCPeerManager(channelName, options.rtc.config);
            return {
                send: (msg) => manager.broadcast(msg),
                request: () => Promise.reject("Use manager.request(peerId, msg) directly"),
                subscribe: (o) => manager.subscribe(o as any),
                close: () => manager.close(),
                type: "rtc-data",
                channelName,
                isReady: true
            };
        }
    }

    // Default: internal observable
    const subject = new ChannelSubject<ChannelMessage>();
    return {
        send: (msg) => subject.next(msg),
        request: () => Promise.reject("Internal transport does not support request"),
        subscribe: (o) => subject.subscribe(o as any),
        close: () => subject.complete(),
        type: "internal",
        channelName,
        isReady: true
    };
}

// ============================================================================
// TRANSPORT REGISTRY
// ============================================================================

class TransportRegistry {
    private _transports = new Map<string, TransportInstance>();

    register(name: string, transport: TransportInstance): void {
        this._transports.set(name, transport);
    }

    get(name: string): TransportInstance | undefined {
        return this._transports.get(name);
    }

    getOrCreate(
        name: string,
        options: TransportFactoryOptions = {},
        config: Partial<UnifiedTransportConfig> = {}
    ): TransportInstance {
        let transport = this._transports.get(name);
        if (!transport) {
            transport = createTransport(name, options, config);
            this._transports.set(name, transport);
        }
        return transport;
    }

    remove(name: string): void {
        const transport = this._transports.get(name);
        if (transport) {
            transport.close();
            this._transports.delete(name);
        }
    }

    closeAll(): void {
        for (const transport of this._transports.values()) {
            transport.close();
        }
        this._transports.clear();
    }

    list(): string[] {
        return Array.from(this._transports.keys());
    }

    get size(): number {
        return this._transports.size;
    }
}

let _registry: TransportRegistry | null = null;

export function getTransportRegistry(): TransportRegistry {
    if (!_registry) _registry = new TransportRegistry();
    return _registry;
}

// ============================================================================
// EXPORTS
// ============================================================================

export const UnifiedTransportFactory = {
    // Main factory
    create: createTransport,
    registry: getTransportRegistry,

    // Native wrappers
    fromWorker: (worker: Worker, name: string, config?: Partial<UnifiedTransportConfig>) =>
        createTransport(name, { worker: { existing: worker } }, config),
    fromPort: (port: MessagePort, name: string, config?: Partial<UnifiedTransportConfig>) =>
        createTransport(name, { port: { port } }, config),
    fromWebSocket: (url: string, name: string, config?: Partial<UnifiedTransportConfig>) =>
        createTransport(name, { websocket: { url } }, config),
    fromBroadcast: (name: string, config?: Partial<UnifiedTransportConfig>) =>
        createTransport(name, { broadcast: {} }, config),

    // Specialized transports
    sharedWorker: {
        client: (url: string | URL, name: string, opts?: SharedWorkerOptions) =>
            new SharedWorkerClient(url, name, opts),
        host: (name: string) => new SharedWorkerHost(name)
    },

    atomics: {
        create: (name: string, send: SharedArrayBuffer, recv: SharedArrayBuffer, config?: AtomicsTransportConfig) =>
            new AtomicsTransport(name, send, recv, config),
        createPair: createAtomicsChannelPair,
        buffer: (size?: number) => new AtomicsBuffer(size),
        ringBuffer: () => new AtomicsRingBuffer()
    },

    rtc: {
        peer: (name: string, config?: RTCTransportConfig) => new RTCPeerTransport(name, config),
        manager: (name: string, config?: RTCTransportConfig) => new RTCPeerManager(name, config),
        signaling: createBroadcastSignaling
    },

    port: {
        create: (port: MessagePort, name: string, config?: PortTransportConfig) =>
            new PortTransport(port, name, config),
        createPair: createChannelPair,
        pool: (config?: PortTransportConfig) => new PortPool(config),
        windowConnector: (target: Window, name: string) => new WindowPortConnector(target, name)
    },

    storage: {
        create: <T>(config: TransferableStorageConfig) => new TransferableStorage<T>(config),
        messageQueue: (dbName?: string) => new MessageQueueStorage(dbName)
    },

    serviceWorker: {
        host: (config: SWHostConfig) => new ServiceWorkerHost(config),
        client: (name: string) => new ServiceWorkerClient(name)
    },

    socketio: (socket: SocketIOLike, name: string, opts?: SocketObservableOptions) =>
        new SocketIOObservable(socket, name, opts),

    chrome: {
        runtime: (opts?: ChromeObservableOptions) => new ChromeRuntimeObservable(undefined, opts),
        tabs: (tabId?: number, opts?: ChromeObservableOptions) => new ChromeTabsObservable(tabId, opts),
        port: (name: string, tabId?: number) => new ChromePortObservable(name, tabId)
    },

    // Utilities
    detect: detectTransportType,
    meta: getTransportMeta
};

// Default export
export default UnifiedTransportFactory;
