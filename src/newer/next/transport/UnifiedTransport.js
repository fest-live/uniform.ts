/**
 * Unified Transport - Single entry point for all transport types
 *
 * Factory and abstraction layer that provides consistent API
 * across all supported message transports.
 */
import { UUIDv4 } from "fest/core";
import { ChannelSubject } from "../observable/Observable";
import { createTransportSender, createTransportListener, detectTransportType, getTransportMeta, createWebSocketTransport, createBroadcastTransport } from "../../core/TransportCore";
// Import specialized transports
import { SharedWorkerClient, SharedWorkerHost } from "./SharedWorkerTransport";
import { AtomicsTransport, AtomicsBuffer, AtomicsRingBuffer, createAtomicsChannelPair } from "./AtomicsTransport";
import { RTCPeerTransport, RTCPeerManager, createBroadcastSignaling } from "./RTCDataChannelTransport";
import { PortTransport, PortPool, WindowPortConnector, createChannelPair } from "./PortTransport";
import { TransferableStorage, MessageQueueStorage } from "../storage/TransferableStorage";
import { SocketIOObservable } from "../observable/SocketIOObservable";
import { ChromeRuntimeObservable, ChromeTabsObservable, ChromePortObservable, ChromeExternalObservable } from "../observable/ChromeObservable";
import { ServiceWorkerHost, ServiceWorkerClient } from "./ServiceWorkerHost";
// ============================================================================
// ABSTRACT TRANSPORT
// ============================================================================
export class AbstractTransport {
    _type;
    _channelName;
    _config;
    _subs = new Set();
    _pending = new Map();
    _state = new ChannelSubject();
    _ready = false;
    constructor(_type, _channelName, _config) {
        this._type = _type;
        this._channelName = _channelName;
        this._config = _config;
    }
    request(msg) {
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
            this.send({ ...msg, reqId, type: "request" });
        });
    }
    subscribe(observer) {
        const obs = typeof observer === "function" ? { next: observer } : observer;
        this._subs.add(obs);
        return {
            closed: false,
            unsubscribe: () => { this._subs.delete(obs); }
        };
    }
    _handleMessage(data) {
        // Handle response
        if (data.type === "response" && data.reqId) {
            const p = this._pending.get(data.reqId);
            if (p) {
                this._pending.delete(data.reqId);
                if (data.payload?.error)
                    p.reject(new Error(data.payload.error));
                else
                    p.resolve(data.payload?.result ?? data.payload);
                return;
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
    close() {
        this._subs.forEach(s => s.complete?.());
        this._subs.clear();
        this._ready = false;
        this._state.next("disconnected");
    }
    get type() { return this._type; }
    get channelName() { return this._channelName; }
    get isReady() { return this._ready; }
    get state() { return this._state; }
}
// ============================================================================
// NATIVE TRANSPORT WRAPPER
// ============================================================================
class NativeTransport extends AbstractTransport {
    _target;
    _sendFn;
    _cleanup = null;
    constructor(_target, config) {
        super(detectTransportType(_target), config.channelName, config);
        this._target = _target;
        this._sendFn = createTransportSender(_target);
        this._setupListener();
    }
    _setupListener() {
        this._cleanup = createTransportListener(this._target, (data) => this._handleMessage(data), (err) => this._subs.forEach(s => s.error?.(err)), () => this._subs.forEach(s => s.complete?.()));
        this._ready = true;
        this._state.next("connected");
    }
    send(msg, transfer) {
        this._sendFn(msg, transfer);
    }
    close() {
        this._cleanup?.();
        super.close();
    }
}
/**
 * Create transport instance based on options
 */
export function createTransport(channelName, options = {}, config = {}) {
    const baseConfig = {
        channelName,
        timeout: 30000,
        autoConnect: true,
        ...config
    };
    // Worker
    if (options.worker) {
        const worker = options.worker.existing ??
            new Worker(options.worker.scriptUrl, options.worker.options);
        return new NativeTransport(worker, baseConfig);
    }
    // SharedWorker
    if (options.sharedWorker) {
        const client = new SharedWorkerClient(options.sharedWorker.scriptUrl, channelName, options.sharedWorker.options);
        return {
            send: (msg, transfer) => client.send(msg, transfer),
            request: (msg) => client.request(msg),
            subscribe: (obs) => client.subscribe(obs),
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
        const subs = new Set();
        const pending = new Map();
        ws.listen((data) => {
            if (data.type === "response" && data.reqId) {
                const p = pending.get(data.reqId);
                if (p) {
                    pending.delete(data.reqId);
                    if (data.payload?.error)
                        p.reject(new Error(data.payload.error));
                    else
                        p.resolve(data.payload?.result ?? data.payload);
                    return;
                }
            }
            for (const s of subs) {
                try {
                    s.next?.(data);
                }
                catch { }
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
                const o = typeof obs === "function" ? { next: obs } : obs;
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
            subscribe: (obs) => transport.subscribe(obs),
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
                subscribe: (o) => obs.subscribe(o),
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
                subscribe: (o) => obs.subscribe(o),
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
                subscribe: (o) => obs.subscribe(o),
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
                subscribe: (o) => obs.subscribe(o),
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
            subscribe: (o) => obs.subscribe(o),
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
        const transport = new AtomicsTransport(channelName, options.atomics.sendBuffer, options.atomics.recvBuffer, options.atomics.config);
        return {
            send: (msg, transfer) => transport.send(msg),
            request: (msg) => transport.request(msg),
            subscribe: (o) => transport.subscribe(o),
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
                subscribe: (o) => peer.subscribe(o),
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
                subscribe: (o) => manager.subscribe(o),
                close: () => manager.close(),
                type: "rtc-data",
                channelName,
                isReady: true
            };
        }
    }
    // Default: internal observable
    const subject = new ChannelSubject();
    return {
        send: (msg) => subject.next(msg),
        request: () => Promise.reject("Internal transport does not support request"),
        subscribe: (o) => subject.subscribe(o),
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
    _transports = new Map();
    register(name, transport) {
        this._transports.set(name, transport);
    }
    get(name) {
        return this._transports.get(name);
    }
    getOrCreate(name, options = {}, config = {}) {
        let transport = this._transports.get(name);
        if (!transport) {
            transport = createTransport(name, options, config);
            this._transports.set(name, transport);
        }
        return transport;
    }
    remove(name) {
        const transport = this._transports.get(name);
        if (transport) {
            transport.close();
            this._transports.delete(name);
        }
    }
    closeAll() {
        for (const transport of this._transports.values()) {
            transport.close();
        }
        this._transports.clear();
    }
    list() {
        return Array.from(this._transports.keys());
    }
    get size() {
        return this._transports.size;
    }
}
let _registry = null;
export function getTransportRegistry() {
    if (!_registry)
        _registry = new TransportRegistry();
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
    fromWorker: (worker, name, config) => createTransport(name, { worker: { existing: worker } }, config),
    fromPort: (port, name, config) => createTransport(name, { port: { port } }, config),
    fromWebSocket: (url, name, config) => createTransport(name, { websocket: { url } }, config),
    fromBroadcast: (name, config) => createTransport(name, { broadcast: {} }, config),
    // Specialized transports
    sharedWorker: {
        client: (url, name, opts) => new SharedWorkerClient(url, name, opts),
        host: (name) => new SharedWorkerHost(name)
    },
    atomics: {
        create: (name, send, recv, config) => new AtomicsTransport(name, send, recv, config),
        createPair: createAtomicsChannelPair,
        buffer: (size) => new AtomicsBuffer(size),
        ringBuffer: () => new AtomicsRingBuffer()
    },
    rtc: {
        peer: (name, config) => new RTCPeerTransport(name, config),
        manager: (name, config) => new RTCPeerManager(name, config),
        signaling: createBroadcastSignaling
    },
    port: {
        create: (port, name, config) => new PortTransport(port, name, config),
        createPair: createChannelPair,
        pool: (config) => new PortPool(config),
        windowConnector: (target, name) => new WindowPortConnector(target, name)
    },
    storage: {
        create: (config) => new TransferableStorage(config),
        messageQueue: (dbName) => new MessageQueueStorage(dbName)
    },
    serviceWorker: {
        host: (config) => new ServiceWorkerHost(config),
        client: (name) => new ServiceWorkerClient(name)
    },
    socketio: (socket, name, opts) => new SocketIOObservable(socket, name, opts),
    chrome: {
        runtime: (opts) => new ChromeRuntimeObservable(undefined, opts),
        tabs: (tabId, opts) => new ChromeTabsObservable(tabId, opts),
        port: (name, tabId) => new ChromePortObservable(name, tabId)
    },
    // Utilities
    detect: detectTransportType,
    meta: getTransportMeta
};
// Default export
export default UnifiedTransportFactory;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVW5pZmllZFRyYW5zcG9ydC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIlVuaWZpZWRUcmFuc3BvcnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7O0dBS0c7QUFFSCxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sV0FBVyxDQUFDO0FBQ25DLE9BQU8sRUFBYyxjQUFjLEVBQW9DLE1BQU0sMEJBQTBCLENBQUM7QUFFeEcsT0FBTyxFQUNILHFCQUFxQixFQUNyQix1QkFBdUIsRUFDdkIsbUJBQW1CLEVBQ25CLGdCQUFnQixFQUNoQix3QkFBd0IsRUFDeEIsd0JBQXdCLEVBSzNCLE1BQU0sMEJBQTBCLENBQUM7QUFFbEMsZ0NBQWdDO0FBQ2hDLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxnQkFBZ0IsRUFBNEIsTUFBTSx5QkFBeUIsQ0FBQztBQUN6RyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsYUFBYSxFQUFFLGlCQUFpQixFQUFFLHdCQUF3QixFQUErQixNQUFNLG9CQUFvQixDQUFDO0FBQy9JLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxjQUFjLEVBQUUsd0JBQXdCLEVBQTJCLE1BQU0sMkJBQTJCLENBQUM7QUFDaEksT0FBTyxFQUFFLGFBQWEsRUFBRSxRQUFRLEVBQUUsbUJBQW1CLEVBQUUsaUJBQWlCLEVBQTRCLE1BQU0saUJBQWlCLENBQUM7QUFDNUgsT0FBTyxFQUFFLG1CQUFtQixFQUFFLG1CQUFtQixFQUFrQyxNQUFNLGdDQUFnQyxDQUFDO0FBQzFILE9BQU8sRUFBRSxrQkFBa0IsRUFBbUQsTUFBTSxrQ0FBa0MsQ0FBQztBQUN2SCxPQUFPLEVBQ0gsdUJBQXVCLEVBQ3ZCLG9CQUFvQixFQUNwQixvQkFBb0IsRUFDcEIsd0JBQXdCLEVBRTNCLE1BQU0sZ0NBQWdDLENBQUM7QUFDeEMsT0FBTyxFQUFFLGlCQUFpQixFQUFFLG1CQUFtQixFQUFxQixNQUFNLHFCQUFxQixDQUFDO0FBd0JoRywrRUFBK0U7QUFDL0UscUJBQXFCO0FBQ3JCLCtFQUErRTtBQUUvRSxNQUFNLE9BQWdCLGlCQUFpQjtJQU9yQjtJQUNBO0lBQ0E7SUFSSixLQUFLLEdBQUcsSUFBSSxHQUFHLEVBQTRCLENBQUM7SUFDNUMsUUFBUSxHQUFHLElBQUksR0FBRyxFQUEwQixDQUFDO0lBQzdDLE1BQU0sR0FBRyxJQUFJLGNBQWMsRUFBeUQsQ0FBQztJQUNyRixNQUFNLEdBQUcsS0FBSyxDQUFDO0lBRXpCLFlBQ2MsS0FBb0IsRUFDcEIsWUFBb0IsRUFDcEIsT0FBK0I7UUFGL0IsVUFBSyxHQUFMLEtBQUssQ0FBZTtRQUNwQixpQkFBWSxHQUFaLFlBQVksQ0FBUTtRQUNwQixZQUFPLEdBQVAsT0FBTyxDQUF3QjtJQUMxQyxDQUFDO0lBSUosT0FBTyxDQUFDLEdBQW1CO1FBQ3ZCLE1BQU0sS0FBSyxHQUFHLEdBQUcsQ0FBQyxLQUFLLElBQUksTUFBTSxFQUFFLENBQUM7UUFDcEMsT0FBTyxJQUFJLE9BQU8sQ0FBQyxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsRUFBRTtZQUNuQyxNQUFNLE9BQU8sR0FBRyxVQUFVLENBQUMsR0FBRyxFQUFFO2dCQUM1QixJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQztnQkFDNUIsTUFBTSxDQUFDLElBQUksS0FBSyxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQztZQUN6QyxDQUFDLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLElBQUksS0FBSyxDQUFDLENBQUM7WUFFbEMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFO2dCQUNyQixPQUFPLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxHQUFHLFlBQVksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ3RELE1BQU0sRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLEdBQUcsWUFBWSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDcEQsU0FBUyxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUU7YUFDeEIsQ0FBQyxDQUFDO1lBRUgsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLEdBQUcsR0FBRyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFvQixDQUFDLENBQUM7UUFDcEUsQ0FBQyxDQUFDLENBQUM7SUFDUCxDQUFDO0lBRUQsU0FBUyxDQUFDLFFBQWtFO1FBQ3hFLE1BQU0sR0FBRyxHQUE2QixPQUFPLFFBQVEsS0FBSyxVQUFVLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUM7UUFDckcsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDcEIsT0FBTztZQUNILE1BQU0sRUFBRSxLQUFLO1lBQ2IsV0FBVyxFQUFFLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUNqRCxDQUFDO0lBQ04sQ0FBQztJQUVTLGNBQWMsQ0FBQyxJQUFvQjtRQUN6QyxrQkFBa0I7UUFDbEIsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLFVBQVUsSUFBSSxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDekMsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ3hDLElBQUksQ0FBQyxFQUFFLENBQUM7Z0JBQ0osSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO2dCQUNqQyxJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUUsS0FBSztvQkFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksS0FBSyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQzs7b0JBQzVELENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxNQUFNLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO2dCQUNyRCxPQUFPO1lBQ1gsQ0FBQztRQUNMLENBQUM7UUFFRCxLQUFLLE1BQU0sQ0FBQyxJQUFJLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUN6QixJQUFJLENBQUM7Z0JBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQUMsQ0FBQztZQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7Z0JBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQVUsQ0FBQyxDQUFDO1lBQUMsQ0FBQztRQUNoRSxDQUFDO0lBQ0wsQ0FBQztJQUVELEtBQUs7UUFDRCxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDeEMsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUNuQixJQUFJLENBQUMsTUFBTSxHQUFHLEtBQUssQ0FBQztRQUNwQixJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQztJQUNyQyxDQUFDO0lBRUQsSUFBSSxJQUFJLEtBQW9CLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7SUFDaEQsSUFBSSxXQUFXLEtBQWEsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQztJQUN2RCxJQUFJLE9BQU8sS0FBYyxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO0lBQzlDLElBQUksS0FBSyxLQUFLLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7Q0FDdEM7QUFFRCwrRUFBK0U7QUFDL0UsMkJBQTJCO0FBQzNCLCtFQUErRTtBQUUvRSxNQUFNLGVBQWdCLFNBQVEsaUJBQWlCO0lBSy9CO0lBSkosT0FBTyxDQUF5QjtJQUNoQyxRQUFRLEdBQXdCLElBQUksQ0FBQztJQUU3QyxZQUNZLE9BQXdCLEVBQ2hDLE1BQThCO1FBRTlCLEtBQUssQ0FBQyxtQkFBbUIsQ0FBQyxPQUFPLENBQUMsRUFBRSxNQUFNLENBQUMsV0FBVyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBSHhELFlBQU8sR0FBUCxPQUFPLENBQWlCO1FBSWhDLElBQUksQ0FBQyxPQUFPLEdBQUcscUJBQXFCLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDOUMsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO0lBQzFCLENBQUM7SUFFTyxjQUFjO1FBQ2xCLElBQUksQ0FBQyxRQUFRLEdBQUcsdUJBQXVCLENBQ25DLElBQUksQ0FBQyxPQUFPLEVBQ1osQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLEVBQ25DLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUNoRCxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDLENBQ2hELENBQUM7UUFDRixJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQztRQUNuQixJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUNsQyxDQUFDO0lBRUQsSUFBSSxDQUFDLEdBQW1CLEVBQUUsUUFBeUI7UUFDL0MsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsUUFBUSxDQUFDLENBQUM7SUFDaEMsQ0FBQztJQUVELEtBQUs7UUFDRCxJQUFJLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQztRQUNsQixLQUFLLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDbEIsQ0FBQztDQUNKO0FBd0VEOztHQUVHO0FBQ0gsTUFBTSxVQUFVLGVBQWUsQ0FDM0IsV0FBbUIsRUFDbkIsVUFBbUMsRUFBRSxFQUNyQyxTQUEwQyxFQUFFO0lBRTVDLE1BQU0sVUFBVSxHQUEyQjtRQUN2QyxXQUFXO1FBQ1gsT0FBTyxFQUFFLEtBQUs7UUFDZCxXQUFXLEVBQUUsSUFBSTtRQUNqQixHQUFHLE1BQU07S0FDWixDQUFDO0lBRUYsU0FBUztJQUNULElBQUksT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQ2pCLE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsUUFBUTtZQUNsQyxJQUFJLE1BQU0sQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLFNBQVUsRUFBRSxPQUFPLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ2xFLE9BQU8sSUFBSSxlQUFlLENBQUMsTUFBTSxFQUFFLFVBQVUsQ0FBQyxDQUFDO0lBQ25ELENBQUM7SUFFRCxlQUFlO0lBQ2YsSUFBSSxPQUFPLENBQUMsWUFBWSxFQUFFLENBQUM7UUFDdkIsTUFBTSxNQUFNLEdBQUcsSUFBSSxrQkFBa0IsQ0FDakMsT0FBTyxDQUFDLFlBQVksQ0FBQyxTQUFVLEVBQy9CLFdBQVcsRUFDWCxPQUFPLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FDL0IsQ0FBQztRQUNGLE9BQU87WUFDSCxJQUFJLEVBQUUsQ0FBQyxHQUFHLEVBQUUsUUFBUSxFQUFFLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxRQUFRLENBQUM7WUFDbkQsT0FBTyxFQUFFLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQztZQUNyQyxTQUFTLEVBQUUsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsR0FBVSxDQUFDO1lBQ2hELEtBQUssRUFBRSxHQUFHLEVBQUUsQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFO1lBQzNCLElBQUksRUFBRSxlQUFlO1lBQ3JCLFdBQVc7WUFDWCxPQUFPLEVBQUUsSUFBSTtTQUNoQixDQUFDO0lBQ04sQ0FBQztJQUVELFlBQVk7SUFDWixJQUFJLE9BQU8sQ0FBQyxTQUFTLEVBQUUsQ0FBQztRQUNwQixNQUFNLEVBQUUsR0FBRyx3QkFBd0IsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLEdBQUcsRUFBRTtZQUN2RCxTQUFTLEVBQUUsT0FBTyxDQUFDLFNBQVMsQ0FBQyxTQUFTO1lBQ3RDLFNBQVMsRUFBRSxPQUFPLENBQUMsU0FBUyxDQUFDLFNBQVM7U0FDekMsQ0FBQyxDQUFDO1FBQ0gsTUFBTSxJQUFJLEdBQUcsSUFBSSxHQUFHLEVBQTRCLENBQUM7UUFDakQsTUFBTSxPQUFPLEdBQUcsSUFBSSxHQUFHLEVBQTBCLENBQUM7UUFFbEQsRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFO1lBQ2YsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLFVBQVUsSUFBSSxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7Z0JBQ3pDLE1BQU0sQ0FBQyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO2dCQUNsQyxJQUFJLENBQUMsRUFBRSxDQUFDO29CQUNKLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO29CQUMzQixJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUUsS0FBSzt3QkFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksS0FBSyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQzs7d0JBQzVELENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxNQUFNLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO29CQUNyRCxPQUFPO2dCQUNYLENBQUM7WUFDTCxDQUFDO1lBQ0QsS0FBSyxNQUFNLENBQUMsSUFBSSxJQUFJLEVBQUUsQ0FBQztnQkFDbkIsSUFBSSxDQUFDO29CQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFBQyxDQUFDO2dCQUFDLE1BQU0sQ0FBQyxDQUFBLENBQUM7WUFDcEMsQ0FBQztRQUNMLENBQUMsQ0FBQyxDQUFDO1FBRUgsT0FBTztZQUNILElBQUksRUFBRSxDQUFDLEdBQUcsRUFBRSxRQUFRLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLFFBQVEsQ0FBQztZQUMvQyxPQUFPLEVBQUUsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLElBQUksT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxFQUFFO2dCQUM5QyxNQUFNLEtBQUssR0FBRyxHQUFHLENBQUMsS0FBSyxJQUFJLE1BQU0sRUFBRSxDQUFDO2dCQUNwQyxNQUFNLE9BQU8sR0FBRyxVQUFVLENBQUMsR0FBRyxFQUFFO29CQUM1QixPQUFPLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO29CQUN0QixNQUFNLENBQUMsSUFBSSxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDO2dCQUN6QyxDQUFDLEVBQUUsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDO2dCQUN2QixPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRTtvQkFDZixPQUFPLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxHQUFHLFlBQVksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQ3RELE1BQU0sRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLEdBQUcsWUFBWSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDcEQsU0FBUyxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUU7aUJBQ3hCLENBQUMsQ0FBQztnQkFDSCxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsR0FBRyxHQUFHLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsQ0FBQyxDQUFDO1lBQ2hELENBQUMsQ0FBQztZQUNGLFNBQVMsRUFBRSxDQUFDLEdBQUcsRUFBRSxFQUFFO2dCQUNmLE1BQU0sQ0FBQyxHQUE2QixPQUFPLEdBQUcsS0FBSyxVQUFVLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUM7Z0JBQ3BGLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ1osT0FBTyxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsV0FBVyxFQUFFLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztZQUNoRSxDQUFDO1lBQ0QsS0FBSyxFQUFFLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDMUMsSUFBSSxFQUFFLFdBQVc7WUFDakIsV0FBVztZQUNYLE9BQU8sRUFBRSxFQUFFLENBQUMsTUFBTSxDQUFDLFVBQVUsS0FBSyxTQUFTLENBQUMsSUFBSTtTQUNuRCxDQUFDO0lBQ04sQ0FBQztJQUVELG1CQUFtQjtJQUNuQixJQUFJLE9BQU8sQ0FBQyxTQUFTLEVBQUUsQ0FBQztRQUNwQixNQUFNLEVBQUUsR0FBRyx3QkFBd0IsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLElBQUksSUFBSSxXQUFXLENBQUMsQ0FBQztRQUMzRSxPQUFPLElBQUksZUFBZSxDQUFDLEVBQUUsQ0FBQyxPQUFPLEVBQUUsVUFBVSxDQUFDLENBQUM7SUFDdkQsQ0FBQztJQUVELGNBQWM7SUFDZCxJQUFJLE9BQU8sQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLENBQUM7UUFDckIsTUFBTSxTQUFTLEdBQUcsSUFBSSxhQUFhLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsV0FBVyxFQUFFLE9BQU8sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDekYsT0FBTztZQUNILElBQUksRUFBRSxDQUFDLEdBQUcsRUFBRSxRQUFRLEVBQUUsRUFBRSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLFFBQVEsQ0FBQztZQUN0RCxPQUFPLEVBQUUsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDO1lBQ3hDLFNBQVMsRUFBRSxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxHQUFVLENBQUM7WUFDbkQsS0FBSyxFQUFFLEdBQUcsRUFBRSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUU7WUFDOUIsSUFBSSxFQUFFLGNBQWM7WUFDcEIsV0FBVztZQUNYLE9BQU8sRUFBRSxTQUFTLENBQUMsV0FBVztTQUNqQyxDQUFDO0lBQ04sQ0FBQztJQUVELFNBQVM7SUFDVCxJQUFJLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUNqQixJQUFJLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQ3BDLE1BQU0sR0FBRyxHQUFHLElBQUksdUJBQXVCLENBQUMsU0FBUyxFQUFFLE9BQU8sQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDM0UsT0FBTztnQkFDSCxJQUFJLEVBQUUsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDO2dCQUM1QixPQUFPLEVBQUUsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDO2dCQUNsQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBUSxDQUFDO2dCQUN6QyxLQUFLLEVBQUUsR0FBRyxFQUFFLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRTtnQkFDeEIsSUFBSSxFQUFFLGdCQUFnQjtnQkFDdEIsV0FBVztnQkFDWCxPQUFPLEVBQUUsSUFBSTthQUNoQixDQUFDO1FBQ04sQ0FBQztRQUNELElBQUksT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEtBQUssTUFBTSxFQUFFLENBQUM7WUFDakMsTUFBTSxHQUFHLEdBQUcsSUFBSSxvQkFBb0IsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxPQUFPLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQ25GLE9BQU87Z0JBQ0gsSUFBSSxFQUFFLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQztnQkFDNUIsT0FBTyxFQUFFLEdBQUcsRUFBRSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUFDO2dCQUM5QyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBUSxDQUFDO2dCQUN6QyxLQUFLLEVBQUUsR0FBRyxFQUFFLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRTtnQkFDeEIsSUFBSSxFQUFFLGFBQWE7Z0JBQ25CLFdBQVc7Z0JBQ1gsT0FBTyxFQUFFLElBQUk7YUFDaEIsQ0FBQztRQUNOLENBQUM7UUFDRCxJQUFJLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxLQUFLLE1BQU0sRUFBRSxDQUFDO1lBQ2pDLE1BQU0sR0FBRyxHQUFHLElBQUksb0JBQW9CLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxRQUFRLElBQUksV0FBVyxFQUFFLE9BQU8sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDbkcsT0FBTztnQkFDSCxJQUFJLEVBQUUsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDO2dCQUM1QixPQUFPLEVBQUUsR0FBRyxFQUFFLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxlQUFlLENBQUM7Z0JBQzlDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFRLENBQUM7Z0JBQ3pDLEtBQUssRUFBRSxHQUFHLEVBQUUsQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFO2dCQUN4QixJQUFJLEVBQUUsYUFBYTtnQkFDbkIsV0FBVztnQkFDWCxPQUFPLEVBQUUsR0FBRyxDQUFDLFdBQVc7YUFDM0IsQ0FBQztRQUNOLENBQUM7UUFDRCxJQUFJLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxLQUFLLFVBQVUsRUFBRSxDQUFDO1lBQ3JDLE1BQU0sR0FBRyxHQUFHLElBQUksd0JBQXdCLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUNqRSxPQUFPO2dCQUNILElBQUksRUFBRSxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUM7Z0JBQzVCLE9BQU8sRUFBRSxHQUFHLEVBQUUsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLGVBQWUsQ0FBQztnQkFDOUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQVEsQ0FBQztnQkFDekMsS0FBSyxFQUFFLEdBQUcsRUFBRSxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUU7Z0JBQ3hCLElBQUksRUFBRSxpQkFBaUI7Z0JBQ3ZCLFdBQVc7Z0JBQ1gsT0FBTyxFQUFFLElBQUk7YUFDaEIsQ0FBQztRQUNOLENBQUM7SUFDTCxDQUFDO0lBRUQsWUFBWTtJQUNaLElBQUksT0FBTyxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQ25CLE1BQU0sR0FBRyxHQUFHLElBQUksa0JBQWtCLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsV0FBVyxFQUFFLE9BQU8sQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDbkcsT0FBTztZQUNILElBQUksRUFBRSxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUM7WUFDNUIsT0FBTyxFQUFFLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQztZQUNsQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBUSxDQUFDO1lBQ3pDLEtBQUssRUFBRSxHQUFHLEVBQUUsQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFO1lBQ3hCLElBQUksRUFBRSxXQUFXO1lBQ2pCLFdBQVc7WUFDWCxPQUFPLEVBQUUsR0FBRyxDQUFDLFdBQVc7U0FDM0IsQ0FBQztJQUNOLENBQUM7SUFFRCxpQkFBaUI7SUFDakIsSUFBSSxPQUFPLENBQUMsYUFBYSxFQUFFLENBQUM7UUFDeEIsSUFBSSxPQUFPLENBQUMsYUFBYSxDQUFDLElBQUksS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUMxQyxNQUFNLE1BQU0sR0FBRyxJQUFJLG1CQUFtQixDQUFDLFdBQVcsQ0FBQyxDQUFDO1lBQ3BELE1BQU0sQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNqQixPQUFPO2dCQUNILElBQUksRUFBRSxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDLE9BQU8sQ0FBQztnQkFDOUQsT0FBTyxFQUFFLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsTUFBTSxJQUFJLFNBQVMsRUFBRSxHQUFHLENBQUMsT0FBTyxDQUFDO2dCQUMvRSxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLEtBQUssVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ3BGLEtBQUssRUFBRSxHQUFHLEVBQUUsQ0FBQyxNQUFNLENBQUMsVUFBVSxFQUFFO2dCQUNoQyxJQUFJLEVBQUUsZ0JBQWdCO2dCQUN0QixXQUFXO2dCQUNYLE9BQU8sRUFBRSxNQUFNLENBQUMsV0FBVzthQUM5QixDQUFDO1FBQ04sQ0FBQztJQUNMLENBQUM7SUFFRCxVQUFVO0lBQ1YsSUFBSSxPQUFPLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDbEIsTUFBTSxTQUFTLEdBQUcsSUFBSSxnQkFBZ0IsQ0FDbEMsV0FBVyxFQUNYLE9BQU8sQ0FBQyxPQUFPLENBQUMsVUFBVSxFQUMxQixPQUFPLENBQUMsT0FBTyxDQUFDLFVBQVUsRUFDMUIsT0FBTyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQ3pCLENBQUM7UUFDRixPQUFPO1lBQ0gsSUFBSSxFQUFFLENBQUMsR0FBRyxFQUFFLFFBQVEsRUFBRSxFQUFFLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUM7WUFDNUMsT0FBTyxFQUFFLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQztZQUN4QyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsQ0FBUSxDQUFDO1lBQy9DLEtBQUssRUFBRSxHQUFHLEVBQUUsQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFO1lBQzlCLElBQUksRUFBRSxTQUFTO1lBQ2YsV0FBVztZQUNYLE9BQU8sRUFBRSxJQUFJO1NBQ2hCLENBQUM7SUFDTixDQUFDO0lBRUQsTUFBTTtJQUNOLElBQUksT0FBTyxDQUFDLEdBQUcsRUFBRSxDQUFDO1FBQ2QsSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksS0FBSyxNQUFNLEVBQUUsQ0FBQztZQUM5QixNQUFNLElBQUksR0FBRyxJQUFJLGdCQUFnQixDQUFDLFdBQVcsRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ25FLE9BQU87Z0JBQ0gsSUFBSSxFQUFFLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQztnQkFDN0IsT0FBTyxFQUFFLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQztnQkFDbkMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQVEsQ0FBQztnQkFDMUMsS0FBSyxFQUFFLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUU7Z0JBQ3pCLElBQUksRUFBRSxVQUFVO2dCQUNoQixXQUFXO2dCQUNYLE9BQU8sRUFBRSxJQUFJLENBQUMsZUFBZSxLQUFLLFdBQVc7YUFDaEQsQ0FBQztRQUNOLENBQUM7UUFDRCxJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQ2pDLE1BQU0sT0FBTyxHQUFHLElBQUksY0FBYyxDQUFDLFdBQVcsRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3BFLE9BQU87Z0JBQ0gsSUFBSSxFQUFFLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQztnQkFDckMsT0FBTyxFQUFFLEdBQUcsRUFBRSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsMkNBQTJDLENBQUM7Z0JBQzFFLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFRLENBQUM7Z0JBQzdDLEtBQUssRUFBRSxHQUFHLEVBQUUsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFO2dCQUM1QixJQUFJLEVBQUUsVUFBVTtnQkFDaEIsV0FBVztnQkFDWCxPQUFPLEVBQUUsSUFBSTthQUNoQixDQUFDO1FBQ04sQ0FBQztJQUNMLENBQUM7SUFFRCwrQkFBK0I7SUFDL0IsTUFBTSxPQUFPLEdBQUcsSUFBSSxjQUFjLEVBQWtCLENBQUM7SUFDckQsT0FBTztRQUNILElBQUksRUFBRSxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUM7UUFDaEMsT0FBTyxFQUFFLEdBQUcsRUFBRSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsNkNBQTZDLENBQUM7UUFDNUUsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQVEsQ0FBQztRQUM3QyxLQUFLLEVBQUUsR0FBRyxFQUFFLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRTtRQUMvQixJQUFJLEVBQUUsVUFBVTtRQUNoQixXQUFXO1FBQ1gsT0FBTyxFQUFFLElBQUk7S0FDaEIsQ0FBQztBQUNOLENBQUM7QUFFRCwrRUFBK0U7QUFDL0UscUJBQXFCO0FBQ3JCLCtFQUErRTtBQUUvRSxNQUFNLGlCQUFpQjtJQUNYLFdBQVcsR0FBRyxJQUFJLEdBQUcsRUFBNkIsQ0FBQztJQUUzRCxRQUFRLENBQUMsSUFBWSxFQUFFLFNBQTRCO1FBQy9DLElBQUksQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxTQUFTLENBQUMsQ0FBQztJQUMxQyxDQUFDO0lBRUQsR0FBRyxDQUFDLElBQVk7UUFDWixPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3RDLENBQUM7SUFFRCxXQUFXLENBQ1AsSUFBWSxFQUNaLFVBQW1DLEVBQUUsRUFDckMsU0FBMEMsRUFBRTtRQUU1QyxJQUFJLFNBQVMsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUMzQyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDYixTQUFTLEdBQUcsZUFBZSxDQUFDLElBQUksRUFBRSxPQUFPLEVBQUUsTUFBTSxDQUFDLENBQUM7WUFDbkQsSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQzFDLENBQUM7UUFDRCxPQUFPLFNBQVMsQ0FBQztJQUNyQixDQUFDO0lBRUQsTUFBTSxDQUFDLElBQVk7UUFDZixNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUM3QyxJQUFJLFNBQVMsRUFBRSxDQUFDO1lBQ1osU0FBUyxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ2xCLElBQUksQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ2xDLENBQUM7SUFDTCxDQUFDO0lBRUQsUUFBUTtRQUNKLEtBQUssTUFBTSxTQUFTLElBQUksSUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDO1lBQ2hELFNBQVMsQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUN0QixDQUFDO1FBQ0QsSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUM3QixDQUFDO0lBRUQsSUFBSTtRQUNBLE9BQU8sS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUM7SUFDL0MsQ0FBQztJQUVELElBQUksSUFBSTtRQUNKLE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUM7SUFDakMsQ0FBQztDQUNKO0FBRUQsSUFBSSxTQUFTLEdBQTZCLElBQUksQ0FBQztBQUUvQyxNQUFNLFVBQVUsb0JBQW9CO0lBQ2hDLElBQUksQ0FBQyxTQUFTO1FBQUUsU0FBUyxHQUFHLElBQUksaUJBQWlCLEVBQUUsQ0FBQztJQUNwRCxPQUFPLFNBQVMsQ0FBQztBQUNyQixDQUFDO0FBRUQsK0VBQStFO0FBQy9FLFVBQVU7QUFDViwrRUFBK0U7QUFFL0UsTUFBTSxDQUFDLE1BQU0sdUJBQXVCLEdBQUc7SUFDbkMsZUFBZTtJQUNmLE1BQU0sRUFBRSxlQUFlO0lBQ3ZCLFFBQVEsRUFBRSxvQkFBb0I7SUFFOUIsa0JBQWtCO0lBQ2xCLFVBQVUsRUFBRSxDQUFDLE1BQWMsRUFBRSxJQUFZLEVBQUUsTUFBd0MsRUFBRSxFQUFFLENBQ25GLGVBQWUsQ0FBQyxJQUFJLEVBQUUsRUFBRSxNQUFNLEVBQUUsRUFBRSxRQUFRLEVBQUUsTUFBTSxFQUFFLEVBQUUsRUFBRSxNQUFNLENBQUM7SUFDbkUsUUFBUSxFQUFFLENBQUMsSUFBaUIsRUFBRSxJQUFZLEVBQUUsTUFBd0MsRUFBRSxFQUFFLENBQ3BGLGVBQWUsQ0FBQyxJQUFJLEVBQUUsRUFBRSxJQUFJLEVBQUUsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLE1BQU0sQ0FBQztJQUNyRCxhQUFhLEVBQUUsQ0FBQyxHQUFXLEVBQUUsSUFBWSxFQUFFLE1BQXdDLEVBQUUsRUFBRSxDQUNuRixlQUFlLENBQUMsSUFBSSxFQUFFLEVBQUUsU0FBUyxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRSxNQUFNLENBQUM7SUFDekQsYUFBYSxFQUFFLENBQUMsSUFBWSxFQUFFLE1BQXdDLEVBQUUsRUFBRSxDQUN0RSxlQUFlLENBQUMsSUFBSSxFQUFFLEVBQUUsU0FBUyxFQUFFLEVBQUUsRUFBRSxFQUFFLE1BQU0sQ0FBQztJQUVwRCx5QkFBeUI7SUFDekIsWUFBWSxFQUFFO1FBQ1YsTUFBTSxFQUFFLENBQUMsR0FBaUIsRUFBRSxJQUFZLEVBQUUsSUFBMEIsRUFBRSxFQUFFLENBQ3BFLElBQUksa0JBQWtCLENBQUMsR0FBRyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7UUFDM0MsSUFBSSxFQUFFLENBQUMsSUFBWSxFQUFFLEVBQUUsQ0FBQyxJQUFJLGdCQUFnQixDQUFDLElBQUksQ0FBQztLQUNyRDtJQUVELE9BQU8sRUFBRTtRQUNMLE1BQU0sRUFBRSxDQUFDLElBQVksRUFBRSxJQUF1QixFQUFFLElBQXVCLEVBQUUsTUFBK0IsRUFBRSxFQUFFLENBQ3hHLElBQUksZ0JBQWdCLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsTUFBTSxDQUFDO1FBQ2xELFVBQVUsRUFBRSx3QkFBd0I7UUFDcEMsTUFBTSxFQUFFLENBQUMsSUFBYSxFQUFFLEVBQUUsQ0FBQyxJQUFJLGFBQWEsQ0FBQyxJQUFJLENBQUM7UUFDbEQsVUFBVSxFQUFFLEdBQUcsRUFBRSxDQUFDLElBQUksaUJBQWlCLEVBQUU7S0FDNUM7SUFFRCxHQUFHLEVBQUU7UUFDRCxJQUFJLEVBQUUsQ0FBQyxJQUFZLEVBQUUsTUFBMkIsRUFBRSxFQUFFLENBQUMsSUFBSSxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDO1FBQ3ZGLE9BQU8sRUFBRSxDQUFDLElBQVksRUFBRSxNQUEyQixFQUFFLEVBQUUsQ0FBQyxJQUFJLGNBQWMsQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDO1FBQ3hGLFNBQVMsRUFBRSx3QkFBd0I7S0FDdEM7SUFFRCxJQUFJLEVBQUU7UUFDRixNQUFNLEVBQUUsQ0FBQyxJQUFpQixFQUFFLElBQVksRUFBRSxNQUE0QixFQUFFLEVBQUUsQ0FDdEUsSUFBSSxhQUFhLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxNQUFNLENBQUM7UUFDekMsVUFBVSxFQUFFLGlCQUFpQjtRQUM3QixJQUFJLEVBQUUsQ0FBQyxNQUE0QixFQUFFLEVBQUUsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxNQUFNLENBQUM7UUFDNUQsZUFBZSxFQUFFLENBQUMsTUFBYyxFQUFFLElBQVksRUFBRSxFQUFFLENBQUMsSUFBSSxtQkFBbUIsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDO0tBQzNGO0lBRUQsT0FBTyxFQUFFO1FBQ0wsTUFBTSxFQUFFLENBQUksTUFBaUMsRUFBRSxFQUFFLENBQUMsSUFBSSxtQkFBbUIsQ0FBSSxNQUFNLENBQUM7UUFDcEYsWUFBWSxFQUFFLENBQUMsTUFBZSxFQUFFLEVBQUUsQ0FBQyxJQUFJLG1CQUFtQixDQUFDLE1BQU0sQ0FBQztLQUNyRTtJQUVELGFBQWEsRUFBRTtRQUNYLElBQUksRUFBRSxDQUFDLE1BQW9CLEVBQUUsRUFBRSxDQUFDLElBQUksaUJBQWlCLENBQUMsTUFBTSxDQUFDO1FBQzdELE1BQU0sRUFBRSxDQUFDLElBQVksRUFBRSxFQUFFLENBQUMsSUFBSSxtQkFBbUIsQ0FBQyxJQUFJLENBQUM7S0FDMUQ7SUFFRCxRQUFRLEVBQUUsQ0FBQyxNQUFvQixFQUFFLElBQVksRUFBRSxJQUE4QixFQUFFLEVBQUUsQ0FDN0UsSUFBSSxrQkFBa0IsQ0FBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUU5QyxNQUFNLEVBQUU7UUFDSixPQUFPLEVBQUUsQ0FBQyxJQUE4QixFQUFFLEVBQUUsQ0FBQyxJQUFJLHVCQUF1QixDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUM7UUFDekYsSUFBSSxFQUFFLENBQUMsS0FBYyxFQUFFLElBQThCLEVBQUUsRUFBRSxDQUFDLElBQUksb0JBQW9CLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQztRQUMvRixJQUFJLEVBQUUsQ0FBQyxJQUFZLEVBQUUsS0FBYyxFQUFFLEVBQUUsQ0FBQyxJQUFJLG9CQUFvQixDQUFDLElBQUksRUFBRSxLQUFLLENBQUM7S0FDaEY7SUFFRCxZQUFZO0lBQ1osTUFBTSxFQUFFLG1CQUFtQjtJQUMzQixJQUFJLEVBQUUsZ0JBQWdCO0NBQ3pCLENBQUM7QUFFRixpQkFBaUI7QUFDakIsZUFBZSx1QkFBdUIsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogVW5pZmllZCBUcmFuc3BvcnQgLSBTaW5nbGUgZW50cnkgcG9pbnQgZm9yIGFsbCB0cmFuc3BvcnQgdHlwZXNcbiAqXG4gKiBGYWN0b3J5IGFuZCBhYnN0cmFjdGlvbiBsYXllciB0aGF0IHByb3ZpZGVzIGNvbnNpc3RlbnQgQVBJXG4gKiBhY3Jvc3MgYWxsIHN1cHBvcnRlZCBtZXNzYWdlIHRyYW5zcG9ydHMuXG4gKi9cblxuaW1wb3J0IHsgVVVJRHY0IH0gZnJvbSBcImZlc3QvY29yZVwiO1xuaW1wb3J0IHsgT2JzZXJ2YWJsZSwgQ2hhbm5lbFN1YmplY3QsIHR5cGUgU3Vic2NyaXB0aW9uLCB0eXBlIE9ic2VydmVyIH0gZnJvbSBcIi4uL29ic2VydmFibGUvT2JzZXJ2YWJsZVwiO1xuaW1wb3J0IHR5cGUgeyBDaGFubmVsTWVzc2FnZSwgUGVuZGluZ1JlcXVlc3QgfSBmcm9tIFwiLi4vdHlwZXMvSW50ZXJmYWNlXCI7XG5pbXBvcnQge1xuICAgIGNyZWF0ZVRyYW5zcG9ydFNlbmRlcixcbiAgICBjcmVhdGVUcmFuc3BvcnRMaXN0ZW5lcixcbiAgICBkZXRlY3RUcmFuc3BvcnRUeXBlLFxuICAgIGdldFRyYW5zcG9ydE1ldGEsXG4gICAgY3JlYXRlV2ViU29ja2V0VHJhbnNwb3J0LFxuICAgIGNyZWF0ZUJyb2FkY2FzdFRyYW5zcG9ydCxcbiAgICB0eXBlIFRyYW5zcG9ydFRhcmdldCxcbiAgICB0eXBlIFRyYW5zcG9ydFR5cGUsXG4gICAgdHlwZSBUcmFuc3BvcnRNZXRhLFxuICAgIHR5cGUgU2VuZEZuXG59IGZyb20gXCIuLi8uLi9jb3JlL1RyYW5zcG9ydENvcmVcIjtcblxuLy8gSW1wb3J0IHNwZWNpYWxpemVkIHRyYW5zcG9ydHNcbmltcG9ydCB7IFNoYXJlZFdvcmtlckNsaWVudCwgU2hhcmVkV29ya2VySG9zdCwgdHlwZSBTaGFyZWRXb3JrZXJPcHRpb25zIH0gZnJvbSBcIi4vU2hhcmVkV29ya2VyVHJhbnNwb3J0XCI7XG5pbXBvcnQgeyBBdG9taWNzVHJhbnNwb3J0LCBBdG9taWNzQnVmZmVyLCBBdG9taWNzUmluZ0J1ZmZlciwgY3JlYXRlQXRvbWljc0NoYW5uZWxQYWlyLCB0eXBlIEF0b21pY3NUcmFuc3BvcnRDb25maWcgfSBmcm9tIFwiLi9BdG9taWNzVHJhbnNwb3J0XCI7XG5pbXBvcnQgeyBSVENQZWVyVHJhbnNwb3J0LCBSVENQZWVyTWFuYWdlciwgY3JlYXRlQnJvYWRjYXN0U2lnbmFsaW5nLCB0eXBlIFJUQ1RyYW5zcG9ydENvbmZpZyB9IGZyb20gXCIuL1JUQ0RhdGFDaGFubmVsVHJhbnNwb3J0XCI7XG5pbXBvcnQgeyBQb3J0VHJhbnNwb3J0LCBQb3J0UG9vbCwgV2luZG93UG9ydENvbm5lY3RvciwgY3JlYXRlQ2hhbm5lbFBhaXIsIHR5cGUgUG9ydFRyYW5zcG9ydENvbmZpZyB9IGZyb20gXCIuL1BvcnRUcmFuc3BvcnRcIjtcbmltcG9ydCB7IFRyYW5zZmVyYWJsZVN0b3JhZ2UsIE1lc3NhZ2VRdWV1ZVN0b3JhZ2UsIHR5cGUgVHJhbnNmZXJhYmxlU3RvcmFnZUNvbmZpZyB9IGZyb20gXCIuLi9zdG9yYWdlL1RyYW5zZmVyYWJsZVN0b3JhZ2VcIjtcbmltcG9ydCB7IFNvY2tldElPT2JzZXJ2YWJsZSwgdHlwZSBTb2NrZXRJT0xpa2UsIHR5cGUgU29ja2V0T2JzZXJ2YWJsZU9wdGlvbnMgfSBmcm9tIFwiLi4vb2JzZXJ2YWJsZS9Tb2NrZXRJT09ic2VydmFibGVcIjtcbmltcG9ydCB7XG4gICAgQ2hyb21lUnVudGltZU9ic2VydmFibGUsXG4gICAgQ2hyb21lVGFic09ic2VydmFibGUsXG4gICAgQ2hyb21lUG9ydE9ic2VydmFibGUsXG4gICAgQ2hyb21lRXh0ZXJuYWxPYnNlcnZhYmxlLFxuICAgIHR5cGUgQ2hyb21lT2JzZXJ2YWJsZU9wdGlvbnNcbn0gZnJvbSBcIi4uL29ic2VydmFibGUvQ2hyb21lT2JzZXJ2YWJsZVwiO1xuaW1wb3J0IHsgU2VydmljZVdvcmtlckhvc3QsIFNlcnZpY2VXb3JrZXJDbGllbnQsIHR5cGUgU1dIb3N0Q29uZmlnIH0gZnJvbSBcIi4vU2VydmljZVdvcmtlckhvc3RcIjtcblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gVFlQRVNcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuZXhwb3J0IGludGVyZmFjZSBVbmlmaWVkVHJhbnNwb3J0Q29uZmlnIHtcbiAgICBjaGFubmVsTmFtZTogc3RyaW5nO1xuICAgIHR5cGU/OiBUcmFuc3BvcnRUeXBlO1xuICAgIHRpbWVvdXQ/OiBudW1iZXI7XG4gICAgYXV0b0Nvbm5lY3Q/OiBib29sZWFuO1xuICAgIG1ldGFkYXRhPzogUmVjb3JkPHN0cmluZywgYW55Pjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBUcmFuc3BvcnRJbnN0YW5jZSB7XG4gICAgc2VuZChtc2c6IENoYW5uZWxNZXNzYWdlLCB0cmFuc2Zlcj86IFRyYW5zZmVyYWJsZVtdKTogdm9pZDtcbiAgICByZXF1ZXN0KG1zZzogQ2hhbm5lbE1lc3NhZ2UpOiBQcm9taXNlPGFueT47XG4gICAgc3Vic2NyaWJlKG9ic2VydmVyOiBPYnNlcnZlcjxDaGFubmVsTWVzc2FnZT4gfCAoKHY6IENoYW5uZWxNZXNzYWdlKSA9PiB2b2lkKSk6IFN1YnNjcmlwdGlvbjtcbiAgICBjbG9zZSgpOiB2b2lkO1xuICAgIHJlYWRvbmx5IHR5cGU6IFRyYW5zcG9ydFR5cGU7XG4gICAgcmVhZG9ubHkgY2hhbm5lbE5hbWU6IHN0cmluZztcbiAgICByZWFkb25seSBpc1JlYWR5OiBib29sZWFuO1xufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBBQlNUUkFDVCBUUkFOU1BPUlRcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuZXhwb3J0IGFic3RyYWN0IGNsYXNzIEFic3RyYWN0VHJhbnNwb3J0IGltcGxlbWVudHMgVHJhbnNwb3J0SW5zdGFuY2Uge1xuICAgIHByb3RlY3RlZCBfc3VicyA9IG5ldyBTZXQ8T2JzZXJ2ZXI8Q2hhbm5lbE1lc3NhZ2U+PigpO1xuICAgIHByb3RlY3RlZCBfcGVuZGluZyA9IG5ldyBNYXA8c3RyaW5nLCBQZW5kaW5nUmVxdWVzdD4oKTtcbiAgICBwcm90ZWN0ZWQgX3N0YXRlID0gbmV3IENoYW5uZWxTdWJqZWN0PFwiZGlzY29ubmVjdGVkXCIgfCBcImNvbm5lY3RpbmdcIiB8IFwiY29ubmVjdGVkXCIgfCBcImVycm9yXCI+KCk7XG4gICAgcHJvdGVjdGVkIF9yZWFkeSA9IGZhbHNlO1xuXG4gICAgY29uc3RydWN0b3IoXG4gICAgICAgIHByb3RlY3RlZCBfdHlwZTogVHJhbnNwb3J0VHlwZSxcbiAgICAgICAgcHJvdGVjdGVkIF9jaGFubmVsTmFtZTogc3RyaW5nLFxuICAgICAgICBwcm90ZWN0ZWQgX2NvbmZpZzogVW5pZmllZFRyYW5zcG9ydENvbmZpZ1xuICAgICkge31cblxuICAgIGFic3RyYWN0IHNlbmQobXNnOiBDaGFubmVsTWVzc2FnZSwgdHJhbnNmZXI/OiBUcmFuc2ZlcmFibGVbXSk6IHZvaWQ7XG5cbiAgICByZXF1ZXN0KG1zZzogQ2hhbm5lbE1lc3NhZ2UpOiBQcm9taXNlPGFueT4ge1xuICAgICAgICBjb25zdCByZXFJZCA9IG1zZy5yZXFJZCA/PyBVVUlEdjQoKTtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHRpbWVvdXQgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLl9wZW5kaW5nLmRlbGV0ZShyZXFJZCk7XG4gICAgICAgICAgICAgICAgcmVqZWN0KG5ldyBFcnJvcihcIlJlcXVlc3QgdGltZW91dFwiKSk7XG4gICAgICAgICAgICB9LCB0aGlzLl9jb25maWcudGltZW91dCA/PyAzMDAwMCk7XG5cbiAgICAgICAgICAgIHRoaXMuX3BlbmRpbmcuc2V0KHJlcUlkLCB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZTogKHYpID0+IHsgY2xlYXJUaW1lb3V0KHRpbWVvdXQpOyByZXNvbHZlKHYpOyB9LFxuICAgICAgICAgICAgICAgIHJlamVjdDogKGUpID0+IHsgY2xlYXJUaW1lb3V0KHRpbWVvdXQpOyByZWplY3QoZSk7IH0sXG4gICAgICAgICAgICAgICAgdGltZXN0YW1wOiBEYXRlLm5vdygpXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgdGhpcy5zZW5kKHsgLi4ubXNnLCByZXFJZCwgdHlwZTogXCJyZXF1ZXN0XCIgfSBhcyBDaGFubmVsTWVzc2FnZSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHN1YnNjcmliZShvYnNlcnZlcjogT2JzZXJ2ZXI8Q2hhbm5lbE1lc3NhZ2U+IHwgKCh2OiBDaGFubmVsTWVzc2FnZSkgPT4gdm9pZCkpOiBTdWJzY3JpcHRpb24ge1xuICAgICAgICBjb25zdCBvYnM6IE9ic2VydmVyPENoYW5uZWxNZXNzYWdlPiA9IHR5cGVvZiBvYnNlcnZlciA9PT0gXCJmdW5jdGlvblwiID8geyBuZXh0OiBvYnNlcnZlciB9IDogb2JzZXJ2ZXI7XG4gICAgICAgIHRoaXMuX3N1YnMuYWRkKG9icyk7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBjbG9zZWQ6IGZhbHNlLFxuICAgICAgICAgICAgdW5zdWJzY3JpYmU6ICgpID0+IHsgdGhpcy5fc3Vicy5kZWxldGUob2JzKTsgfVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIHByb3RlY3RlZCBfaGFuZGxlTWVzc2FnZShkYXRhOiBDaGFubmVsTWVzc2FnZSk6IHZvaWQge1xuICAgICAgICAvLyBIYW5kbGUgcmVzcG9uc2VcbiAgICAgICAgaWYgKGRhdGEudHlwZSA9PT0gXCJyZXNwb25zZVwiICYmIGRhdGEucmVxSWQpIHtcbiAgICAgICAgICAgIGNvbnN0IHAgPSB0aGlzLl9wZW5kaW5nLmdldChkYXRhLnJlcUlkKTtcbiAgICAgICAgICAgIGlmIChwKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fcGVuZGluZy5kZWxldGUoZGF0YS5yZXFJZCk7XG4gICAgICAgICAgICAgICAgaWYgKGRhdGEucGF5bG9hZD8uZXJyb3IpIHAucmVqZWN0KG5ldyBFcnJvcihkYXRhLnBheWxvYWQuZXJyb3IpKTtcbiAgICAgICAgICAgICAgICBlbHNlIHAucmVzb2x2ZShkYXRhLnBheWxvYWQ/LnJlc3VsdCA/PyBkYXRhLnBheWxvYWQpO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAoY29uc3QgcyBvZiB0aGlzLl9zdWJzKSB7XG4gICAgICAgICAgICB0cnkgeyBzLm5leHQ/LihkYXRhKTsgfSBjYXRjaCAoZSkgeyBzLmVycm9yPy4oZSBhcyBFcnJvcik7IH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGNsb3NlKCk6IHZvaWQge1xuICAgICAgICB0aGlzLl9zdWJzLmZvckVhY2gocyA9PiBzLmNvbXBsZXRlPy4oKSk7XG4gICAgICAgIHRoaXMuX3N1YnMuY2xlYXIoKTtcbiAgICAgICAgdGhpcy5fcmVhZHkgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5fc3RhdGUubmV4dChcImRpc2Nvbm5lY3RlZFwiKTtcbiAgICB9XG5cbiAgICBnZXQgdHlwZSgpOiBUcmFuc3BvcnRUeXBlIHsgcmV0dXJuIHRoaXMuX3R5cGU7IH1cbiAgICBnZXQgY2hhbm5lbE5hbWUoKTogc3RyaW5nIHsgcmV0dXJuIHRoaXMuX2NoYW5uZWxOYW1lOyB9XG4gICAgZ2V0IGlzUmVhZHkoKTogYm9vbGVhbiB7IHJldHVybiB0aGlzLl9yZWFkeTsgfVxuICAgIGdldCBzdGF0ZSgpIHsgcmV0dXJuIHRoaXMuX3N0YXRlOyB9XG59XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIE5BVElWRSBUUkFOU1BPUlQgV1JBUFBFUlxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5jbGFzcyBOYXRpdmVUcmFuc3BvcnQgZXh0ZW5kcyBBYnN0cmFjdFRyYW5zcG9ydCB7XG4gICAgcHJpdmF0ZSBfc2VuZEZuOiBTZW5kRm48Q2hhbm5lbE1lc3NhZ2U+O1xuICAgIHByaXZhdGUgX2NsZWFudXA6ICgoKSA9PiB2b2lkKSB8IG51bGwgPSBudWxsO1xuXG4gICAgY29uc3RydWN0b3IoXG4gICAgICAgIHByaXZhdGUgX3RhcmdldDogVHJhbnNwb3J0VGFyZ2V0LFxuICAgICAgICBjb25maWc6IFVuaWZpZWRUcmFuc3BvcnRDb25maWdcbiAgICApIHtcbiAgICAgICAgc3VwZXIoZGV0ZWN0VHJhbnNwb3J0VHlwZShfdGFyZ2V0KSwgY29uZmlnLmNoYW5uZWxOYW1lLCBjb25maWcpO1xuICAgICAgICB0aGlzLl9zZW5kRm4gPSBjcmVhdGVUcmFuc3BvcnRTZW5kZXIoX3RhcmdldCk7XG4gICAgICAgIHRoaXMuX3NldHVwTGlzdGVuZXIoKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIF9zZXR1cExpc3RlbmVyKCk6IHZvaWQge1xuICAgICAgICB0aGlzLl9jbGVhbnVwID0gY3JlYXRlVHJhbnNwb3J0TGlzdGVuZXIoXG4gICAgICAgICAgICB0aGlzLl90YXJnZXQsXG4gICAgICAgICAgICAoZGF0YSkgPT4gdGhpcy5faGFuZGxlTWVzc2FnZShkYXRhKSxcbiAgICAgICAgICAgIChlcnIpID0+IHRoaXMuX3N1YnMuZm9yRWFjaChzID0+IHMuZXJyb3I/LihlcnIpKSxcbiAgICAgICAgICAgICgpID0+IHRoaXMuX3N1YnMuZm9yRWFjaChzID0+IHMuY29tcGxldGU/LigpKVxuICAgICAgICApO1xuICAgICAgICB0aGlzLl9yZWFkeSA9IHRydWU7XG4gICAgICAgIHRoaXMuX3N0YXRlLm5leHQoXCJjb25uZWN0ZWRcIik7XG4gICAgfVxuXG4gICAgc2VuZChtc2c6IENoYW5uZWxNZXNzYWdlLCB0cmFuc2Zlcj86IFRyYW5zZmVyYWJsZVtdKTogdm9pZCB7XG4gICAgICAgIHRoaXMuX3NlbmRGbihtc2csIHRyYW5zZmVyKTtcbiAgICB9XG5cbiAgICBjbG9zZSgpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fY2xlYW51cD8uKCk7XG4gICAgICAgIHN1cGVyLmNsb3NlKCk7XG4gICAgfVxufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBVTklGSUVEIEZBQ1RPUllcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuZXhwb3J0IGludGVyZmFjZSBUcmFuc3BvcnRGYWN0b3J5T3B0aW9ucyB7XG4gICAgLy8gV29ya2VyXG4gICAgd29ya2VyPzoge1xuICAgICAgICBzY3JpcHRVcmw/OiBzdHJpbmcgfCBVUkw7XG4gICAgICAgIG9wdGlvbnM/OiBXb3JrZXJPcHRpb25zO1xuICAgICAgICBleGlzdGluZz86IFdvcmtlcjtcbiAgICB9O1xuXG4gICAgLy8gU2hhcmVkV29ya2VyXG4gICAgc2hhcmVkV29ya2VyPzoge1xuICAgICAgICBzY3JpcHRVcmw/OiBzdHJpbmcgfCBVUkw7XG4gICAgICAgIG9wdGlvbnM/OiBTaGFyZWRXb3JrZXJPcHRpb25zO1xuICAgIH07XG5cbiAgICAvLyBXZWJTb2NrZXRcbiAgICB3ZWJzb2NrZXQ/OiB7XG4gICAgICAgIHVybDogc3RyaW5nO1xuICAgICAgICBwcm90b2NvbHM/OiBzdHJpbmcgfCBzdHJpbmdbXTtcbiAgICAgICAgcmVjb25uZWN0PzogYm9vbGVhbjtcbiAgICB9O1xuXG4gICAgLy8gQnJvYWRjYXN0Q2hhbm5lbFxuICAgIGJyb2FkY2FzdD86IHtcbiAgICAgICAgbmFtZT86IHN0cmluZztcbiAgICB9O1xuXG4gICAgLy8gTWVzc2FnZVBvcnRcbiAgICBwb3J0Pzoge1xuICAgICAgICBwb3J0PzogTWVzc2FnZVBvcnQ7XG4gICAgICAgIGNvbmZpZz86IFBvcnRUcmFuc3BvcnRDb25maWc7XG4gICAgfTtcblxuICAgIC8vIENocm9tZSBFeHRlbnNpb25cbiAgICBjaHJvbWU/OiB7XG4gICAgICAgIG1vZGU6IFwicnVudGltZVwiIHwgXCJ0YWJzXCIgfCBcInBvcnRcIiB8IFwiZXh0ZXJuYWxcIjtcbiAgICAgICAgdGFiSWQ/OiBudW1iZXI7XG4gICAgICAgIHBvcnROYW1lPzogc3RyaW5nO1xuICAgICAgICBvcHRpb25zPzogQ2hyb21lT2JzZXJ2YWJsZU9wdGlvbnM7XG4gICAgfTtcblxuICAgIC8vIFNvY2tldC5JT1xuICAgIHNvY2tldGlvPzoge1xuICAgICAgICBzb2NrZXQ6IFNvY2tldElPTGlrZTtcbiAgICAgICAgb3B0aW9ucz86IFNvY2tldE9ic2VydmFibGVPcHRpb25zO1xuICAgIH07XG5cbiAgICAvLyBTZXJ2aWNlIFdvcmtlclxuICAgIHNlcnZpY2VXb3JrZXI/OiB7XG4gICAgICAgIG1vZGU6IFwiaG9zdFwiIHwgXCJjbGllbnRcIjtcbiAgICAgICAgY29uZmlnPzogU1dIb3N0Q29uZmlnO1xuICAgIH07XG5cbiAgICAvLyBBdG9taWNzXG4gICAgYXRvbWljcz86IHtcbiAgICAgICAgc2VuZEJ1ZmZlcjogU2hhcmVkQXJyYXlCdWZmZXI7XG4gICAgICAgIHJlY3ZCdWZmZXI6IFNoYXJlZEFycmF5QnVmZmVyO1xuICAgICAgICBjb25maWc/OiBBdG9taWNzVHJhbnNwb3J0Q29uZmlnO1xuICAgIH07XG5cbiAgICAvLyBXZWJSVENcbiAgICBydGM/OiB7XG4gICAgICAgIG1vZGU6IFwicGVlclwiIHwgXCJtYW5hZ2VyXCI7XG4gICAgICAgIGNvbmZpZz86IFJUQ1RyYW5zcG9ydENvbmZpZztcbiAgICB9O1xufVxuXG4vKipcbiAqIENyZWF0ZSB0cmFuc3BvcnQgaW5zdGFuY2UgYmFzZWQgb24gb3B0aW9uc1xuICovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlVHJhbnNwb3J0KFxuICAgIGNoYW5uZWxOYW1lOiBzdHJpbmcsXG4gICAgb3B0aW9uczogVHJhbnNwb3J0RmFjdG9yeU9wdGlvbnMgPSB7fSxcbiAgICBjb25maWc6IFBhcnRpYWw8VW5pZmllZFRyYW5zcG9ydENvbmZpZz4gPSB7fVxuKTogVHJhbnNwb3J0SW5zdGFuY2Uge1xuICAgIGNvbnN0IGJhc2VDb25maWc6IFVuaWZpZWRUcmFuc3BvcnRDb25maWcgPSB7XG4gICAgICAgIGNoYW5uZWxOYW1lLFxuICAgICAgICB0aW1lb3V0OiAzMDAwMCxcbiAgICAgICAgYXV0b0Nvbm5lY3Q6IHRydWUsXG4gICAgICAgIC4uLmNvbmZpZ1xuICAgIH07XG5cbiAgICAvLyBXb3JrZXJcbiAgICBpZiAob3B0aW9ucy53b3JrZXIpIHtcbiAgICAgICAgY29uc3Qgd29ya2VyID0gb3B0aW9ucy53b3JrZXIuZXhpc3RpbmcgPz9cbiAgICAgICAgICAgIG5ldyBXb3JrZXIob3B0aW9ucy53b3JrZXIuc2NyaXB0VXJsISwgb3B0aW9ucy53b3JrZXIub3B0aW9ucyk7XG4gICAgICAgIHJldHVybiBuZXcgTmF0aXZlVHJhbnNwb3J0KHdvcmtlciwgYmFzZUNvbmZpZyk7XG4gICAgfVxuXG4gICAgLy8gU2hhcmVkV29ya2VyXG4gICAgaWYgKG9wdGlvbnMuc2hhcmVkV29ya2VyKSB7XG4gICAgICAgIGNvbnN0IGNsaWVudCA9IG5ldyBTaGFyZWRXb3JrZXJDbGllbnQoXG4gICAgICAgICAgICBvcHRpb25zLnNoYXJlZFdvcmtlci5zY3JpcHRVcmwhLFxuICAgICAgICAgICAgY2hhbm5lbE5hbWUsXG4gICAgICAgICAgICBvcHRpb25zLnNoYXJlZFdvcmtlci5vcHRpb25zXG4gICAgICAgICk7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBzZW5kOiAobXNnLCB0cmFuc2ZlcikgPT4gY2xpZW50LnNlbmQobXNnLCB0cmFuc2ZlciksXG4gICAgICAgICAgICByZXF1ZXN0OiAobXNnKSA9PiBjbGllbnQucmVxdWVzdChtc2cpLFxuICAgICAgICAgICAgc3Vic2NyaWJlOiAob2JzKSA9PiBjbGllbnQuc3Vic2NyaWJlKG9icyBhcyBhbnkpLFxuICAgICAgICAgICAgY2xvc2U6ICgpID0+IGNsaWVudC5jbG9zZSgpLFxuICAgICAgICAgICAgdHlwZTogXCJzaGFyZWQtd29ya2VyXCIsXG4gICAgICAgICAgICBjaGFubmVsTmFtZSxcbiAgICAgICAgICAgIGlzUmVhZHk6IHRydWVcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyBXZWJTb2NrZXRcbiAgICBpZiAob3B0aW9ucy53ZWJzb2NrZXQpIHtcbiAgICAgICAgY29uc3Qgd3MgPSBjcmVhdGVXZWJTb2NrZXRUcmFuc3BvcnQob3B0aW9ucy53ZWJzb2NrZXQudXJsLCB7XG4gICAgICAgICAgICBwcm90b2NvbHM6IG9wdGlvbnMud2Vic29ja2V0LnByb3RvY29scyxcbiAgICAgICAgICAgIHJlY29ubmVjdDogb3B0aW9ucy53ZWJzb2NrZXQucmVjb25uZWN0XG4gICAgICAgIH0pO1xuICAgICAgICBjb25zdCBzdWJzID0gbmV3IFNldDxPYnNlcnZlcjxDaGFubmVsTWVzc2FnZT4+KCk7XG4gICAgICAgIGNvbnN0IHBlbmRpbmcgPSBuZXcgTWFwPHN0cmluZywgUGVuZGluZ1JlcXVlc3Q+KCk7XG5cbiAgICAgICAgd3MubGlzdGVuKChkYXRhKSA9PiB7XG4gICAgICAgICAgICBpZiAoZGF0YS50eXBlID09PSBcInJlc3BvbnNlXCIgJiYgZGF0YS5yZXFJZCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHAgPSBwZW5kaW5nLmdldChkYXRhLnJlcUlkKTtcbiAgICAgICAgICAgICAgICBpZiAocCkge1xuICAgICAgICAgICAgICAgICAgICBwZW5kaW5nLmRlbGV0ZShkYXRhLnJlcUlkKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGRhdGEucGF5bG9hZD8uZXJyb3IpIHAucmVqZWN0KG5ldyBFcnJvcihkYXRhLnBheWxvYWQuZXJyb3IpKTtcbiAgICAgICAgICAgICAgICAgICAgZWxzZSBwLnJlc29sdmUoZGF0YS5wYXlsb2FkPy5yZXN1bHQgPz8gZGF0YS5wYXlsb2FkKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZvciAoY29uc3QgcyBvZiBzdWJzKSB7XG4gICAgICAgICAgICAgICAgdHJ5IHsgcy5uZXh0Py4oZGF0YSk7IH0gY2F0Y2gge31cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHNlbmQ6IChtc2csIHRyYW5zZmVyKSA9PiB3cy5zZW5kKG1zZywgdHJhbnNmZXIpLFxuICAgICAgICAgICAgcmVxdWVzdDogKG1zZykgPT4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IHJlcUlkID0gbXNnLnJlcUlkID8/IFVVSUR2NCgpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHRpbWVvdXQgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgcGVuZGluZy5kZWxldGUocmVxSWQpO1xuICAgICAgICAgICAgICAgICAgICByZWplY3QobmV3IEVycm9yKFwiUmVxdWVzdCB0aW1lb3V0XCIpKTtcbiAgICAgICAgICAgICAgICB9LCBiYXNlQ29uZmlnLnRpbWVvdXQpO1xuICAgICAgICAgICAgICAgIHBlbmRpbmcuc2V0KHJlcUlkLCB7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmU6ICh2KSA9PiB7IGNsZWFyVGltZW91dCh0aW1lb3V0KTsgcmVzb2x2ZSh2KTsgfSxcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0OiAoZSkgPT4geyBjbGVhclRpbWVvdXQodGltZW91dCk7IHJlamVjdChlKTsgfSxcbiAgICAgICAgICAgICAgICAgICAgdGltZXN0YW1wOiBEYXRlLm5vdygpXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgd3Muc2VuZCh7IC4uLm1zZywgcmVxSWQsIHR5cGU6IFwicmVxdWVzdFwiIH0pO1xuICAgICAgICAgICAgfSksXG4gICAgICAgICAgICBzdWJzY3JpYmU6IChvYnMpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBvOiBPYnNlcnZlcjxDaGFubmVsTWVzc2FnZT4gPSB0eXBlb2Ygb2JzID09PSBcImZ1bmN0aW9uXCIgPyB7IG5leHQ6IG9icyB9IDogb2JzO1xuICAgICAgICAgICAgICAgIHN1YnMuYWRkKG8pO1xuICAgICAgICAgICAgICAgIHJldHVybiB7IGNsb3NlZDogZmFsc2UsIHVuc3Vic2NyaWJlOiAoKSA9PiBzdWJzLmRlbGV0ZShvKSB9O1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGNsb3NlOiAoKSA9PiB7IHN1YnMuY2xlYXIoKTsgd3MuY2xvc2UoKTsgfSxcbiAgICAgICAgICAgIHR5cGU6IFwid2Vic29ja2V0XCIsXG4gICAgICAgICAgICBjaGFubmVsTmFtZSxcbiAgICAgICAgICAgIGlzUmVhZHk6IHdzLnNvY2tldC5yZWFkeVN0YXRlID09PSBXZWJTb2NrZXQuT1BFTlxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8vIEJyb2FkY2FzdENoYW5uZWxcbiAgICBpZiAob3B0aW9ucy5icm9hZGNhc3QpIHtcbiAgICAgICAgY29uc3QgYmMgPSBjcmVhdGVCcm9hZGNhc3RUcmFuc3BvcnQob3B0aW9ucy5icm9hZGNhc3QubmFtZSA/PyBjaGFubmVsTmFtZSk7XG4gICAgICAgIHJldHVybiBuZXcgTmF0aXZlVHJhbnNwb3J0KGJjLmNoYW5uZWwsIGJhc2VDb25maWcpO1xuICAgIH1cblxuICAgIC8vIE1lc3NhZ2VQb3J0XG4gICAgaWYgKG9wdGlvbnMucG9ydD8ucG9ydCkge1xuICAgICAgICBjb25zdCB0cmFuc3BvcnQgPSBuZXcgUG9ydFRyYW5zcG9ydChvcHRpb25zLnBvcnQucG9ydCwgY2hhbm5lbE5hbWUsIG9wdGlvbnMucG9ydC5jb25maWcpO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgc2VuZDogKG1zZywgdHJhbnNmZXIpID0+IHRyYW5zcG9ydC5zZW5kKG1zZywgdHJhbnNmZXIpLFxuICAgICAgICAgICAgcmVxdWVzdDogKG1zZykgPT4gdHJhbnNwb3J0LnJlcXVlc3QobXNnKSxcbiAgICAgICAgICAgIHN1YnNjcmliZTogKG9icykgPT4gdHJhbnNwb3J0LnN1YnNjcmliZShvYnMgYXMgYW55KSxcbiAgICAgICAgICAgIGNsb3NlOiAoKSA9PiB0cmFuc3BvcnQuY2xvc2UoKSxcbiAgICAgICAgICAgIHR5cGU6IFwibWVzc2FnZS1wb3J0XCIsXG4gICAgICAgICAgICBjaGFubmVsTmFtZSxcbiAgICAgICAgICAgIGlzUmVhZHk6IHRyYW5zcG9ydC5pc0xpc3RlbmluZ1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8vIENocm9tZVxuICAgIGlmIChvcHRpb25zLmNocm9tZSkge1xuICAgICAgICBpZiAob3B0aW9ucy5jaHJvbWUubW9kZSA9PT0gXCJydW50aW1lXCIpIHtcbiAgICAgICAgICAgIGNvbnN0IG9icyA9IG5ldyBDaHJvbWVSdW50aW1lT2JzZXJ2YWJsZSh1bmRlZmluZWQsIG9wdGlvbnMuY2hyb21lLm9wdGlvbnMpO1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBzZW5kOiAobXNnKSA9PiBvYnMuc2VuZChtc2cpLFxuICAgICAgICAgICAgICAgIHJlcXVlc3Q6IChtc2cpID0+IG9icy5yZXF1ZXN0KG1zZyksXG4gICAgICAgICAgICAgICAgc3Vic2NyaWJlOiAobykgPT4gb2JzLnN1YnNjcmliZShvIGFzIGFueSksXG4gICAgICAgICAgICAgICAgY2xvc2U6ICgpID0+IG9icy5jbG9zZSgpLFxuICAgICAgICAgICAgICAgIHR5cGU6IFwiY2hyb21lLXJ1bnRpbWVcIixcbiAgICAgICAgICAgICAgICBjaGFubmVsTmFtZSxcbiAgICAgICAgICAgICAgICBpc1JlYWR5OiB0cnVlXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIGlmIChvcHRpb25zLmNocm9tZS5tb2RlID09PSBcInRhYnNcIikge1xuICAgICAgICAgICAgY29uc3Qgb2JzID0gbmV3IENocm9tZVRhYnNPYnNlcnZhYmxlKG9wdGlvbnMuY2hyb21lLnRhYklkLCBvcHRpb25zLmNocm9tZS5vcHRpb25zKTtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc2VuZDogKG1zZykgPT4gb2JzLnNlbmQobXNnKSxcbiAgICAgICAgICAgICAgICByZXF1ZXN0OiAoKSA9PiBQcm9taXNlLnJlamVjdChcIk5vdCBzdXBwb3J0ZWRcIiksXG4gICAgICAgICAgICAgICAgc3Vic2NyaWJlOiAobykgPT4gb2JzLnN1YnNjcmliZShvIGFzIGFueSksXG4gICAgICAgICAgICAgICAgY2xvc2U6ICgpID0+IG9icy5jbG9zZSgpLFxuICAgICAgICAgICAgICAgIHR5cGU6IFwiY2hyb21lLXRhYnNcIixcbiAgICAgICAgICAgICAgICBjaGFubmVsTmFtZSxcbiAgICAgICAgICAgICAgICBpc1JlYWR5OiB0cnVlXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIGlmIChvcHRpb25zLmNocm9tZS5tb2RlID09PSBcInBvcnRcIikge1xuICAgICAgICAgICAgY29uc3Qgb2JzID0gbmV3IENocm9tZVBvcnRPYnNlcnZhYmxlKG9wdGlvbnMuY2hyb21lLnBvcnROYW1lID8/IGNoYW5uZWxOYW1lLCBvcHRpb25zLmNocm9tZS50YWJJZCk7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHNlbmQ6IChtc2cpID0+IG9icy5zZW5kKG1zZyksXG4gICAgICAgICAgICAgICAgcmVxdWVzdDogKCkgPT4gUHJvbWlzZS5yZWplY3QoXCJOb3Qgc3VwcG9ydGVkXCIpLFxuICAgICAgICAgICAgICAgIHN1YnNjcmliZTogKG8pID0+IG9icy5zdWJzY3JpYmUobyBhcyBhbnkpLFxuICAgICAgICAgICAgICAgIGNsb3NlOiAoKSA9PiBvYnMuY2xvc2UoKSxcbiAgICAgICAgICAgICAgICB0eXBlOiBcImNocm9tZS1wb3J0XCIsXG4gICAgICAgICAgICAgICAgY2hhbm5lbE5hbWUsXG4gICAgICAgICAgICAgICAgaXNSZWFkeTogb2JzLmlzQ29ubmVjdGVkXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIGlmIChvcHRpb25zLmNocm9tZS5tb2RlID09PSBcImV4dGVybmFsXCIpIHtcbiAgICAgICAgICAgIGNvbnN0IG9icyA9IG5ldyBDaHJvbWVFeHRlcm5hbE9ic2VydmFibGUob3B0aW9ucy5jaHJvbWUub3B0aW9ucyk7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHNlbmQ6IChtc2cpID0+IG9icy5zZW5kKG1zZyksXG4gICAgICAgICAgICAgICAgcmVxdWVzdDogKCkgPT4gUHJvbWlzZS5yZWplY3QoXCJOb3Qgc3VwcG9ydGVkXCIpLFxuICAgICAgICAgICAgICAgIHN1YnNjcmliZTogKG8pID0+IG9icy5zdWJzY3JpYmUobyBhcyBhbnkpLFxuICAgICAgICAgICAgICAgIGNsb3NlOiAoKSA9PiBvYnMuY2xvc2UoKSxcbiAgICAgICAgICAgICAgICB0eXBlOiBcImNocm9tZS1leHRlcm5hbFwiLFxuICAgICAgICAgICAgICAgIGNoYW5uZWxOYW1lLFxuICAgICAgICAgICAgICAgIGlzUmVhZHk6IHRydWVcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBTb2NrZXQuSU9cbiAgICBpZiAob3B0aW9ucy5zb2NrZXRpbykge1xuICAgICAgICBjb25zdCBvYnMgPSBuZXcgU29ja2V0SU9PYnNlcnZhYmxlKG9wdGlvbnMuc29ja2V0aW8uc29ja2V0LCBjaGFubmVsTmFtZSwgb3B0aW9ucy5zb2NrZXRpby5vcHRpb25zKTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHNlbmQ6IChtc2cpID0+IG9icy5zZW5kKG1zZyksXG4gICAgICAgICAgICByZXF1ZXN0OiAobXNnKSA9PiBvYnMucmVxdWVzdChtc2cpLFxuICAgICAgICAgICAgc3Vic2NyaWJlOiAobykgPT4gb2JzLnN1YnNjcmliZShvIGFzIGFueSksXG4gICAgICAgICAgICBjbG9zZTogKCkgPT4gb2JzLmNsb3NlKCksXG4gICAgICAgICAgICB0eXBlOiBcInNvY2tldC1pb1wiLFxuICAgICAgICAgICAgY2hhbm5lbE5hbWUsXG4gICAgICAgICAgICBpc1JlYWR5OiBvYnMuaXNDb25uZWN0ZWRcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyBTZXJ2aWNlIFdvcmtlclxuICAgIGlmIChvcHRpb25zLnNlcnZpY2VXb3JrZXIpIHtcbiAgICAgICAgaWYgKG9wdGlvbnMuc2VydmljZVdvcmtlci5tb2RlID09PSBcImNsaWVudFwiKSB7XG4gICAgICAgICAgICBjb25zdCBjbGllbnQgPSBuZXcgU2VydmljZVdvcmtlckNsaWVudChjaGFubmVsTmFtZSk7XG4gICAgICAgICAgICBjbGllbnQuY29ubmVjdCgpO1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBzZW5kOiAobXNnKSA9PiBjbGllbnQuZW1pdChtc2cudHlwZSwgbXNnLnBheWxvYWQsIG1zZy5jaGFubmVsKSxcbiAgICAgICAgICAgICAgICByZXF1ZXN0OiAobXNnKSA9PiBjbGllbnQucmVxdWVzdChtc2cucGF5bG9hZD8uYWN0aW9uID8/IFwidW5rbm93blwiLCBtc2cucGF5bG9hZCksXG4gICAgICAgICAgICAgICAgc3Vic2NyaWJlOiAobykgPT4gY2xpZW50LnN1YnNjcmliZSh0eXBlb2YgbyA9PT0gXCJmdW5jdGlvblwiID8gbyA6IChtKSA9PiBvLm5leHQ/LihtKSksXG4gICAgICAgICAgICAgICAgY2xvc2U6ICgpID0+IGNsaWVudC5kaXNjb25uZWN0KCksXG4gICAgICAgICAgICAgICAgdHlwZTogXCJzZXJ2aWNlLXdvcmtlclwiLFxuICAgICAgICAgICAgICAgIGNoYW5uZWxOYW1lLFxuICAgICAgICAgICAgICAgIGlzUmVhZHk6IGNsaWVudC5pc0Nvbm5lY3RlZFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIEF0b21pY3NcbiAgICBpZiAob3B0aW9ucy5hdG9taWNzKSB7XG4gICAgICAgIGNvbnN0IHRyYW5zcG9ydCA9IG5ldyBBdG9taWNzVHJhbnNwb3J0KFxuICAgICAgICAgICAgY2hhbm5lbE5hbWUsXG4gICAgICAgICAgICBvcHRpb25zLmF0b21pY3Muc2VuZEJ1ZmZlcixcbiAgICAgICAgICAgIG9wdGlvbnMuYXRvbWljcy5yZWN2QnVmZmVyLFxuICAgICAgICAgICAgb3B0aW9ucy5hdG9taWNzLmNvbmZpZ1xuICAgICAgICApO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgc2VuZDogKG1zZywgdHJhbnNmZXIpID0+IHRyYW5zcG9ydC5zZW5kKG1zZyksXG4gICAgICAgICAgICByZXF1ZXN0OiAobXNnKSA9PiB0cmFuc3BvcnQucmVxdWVzdChtc2cpLFxuICAgICAgICAgICAgc3Vic2NyaWJlOiAobykgPT4gdHJhbnNwb3J0LnN1YnNjcmliZShvIGFzIGFueSksXG4gICAgICAgICAgICBjbG9zZTogKCkgPT4gdHJhbnNwb3J0LmNsb3NlKCksXG4gICAgICAgICAgICB0eXBlOiBcImF0b21pY3NcIixcbiAgICAgICAgICAgIGNoYW5uZWxOYW1lLFxuICAgICAgICAgICAgaXNSZWFkeTogdHJ1ZVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8vIFJUQ1xuICAgIGlmIChvcHRpb25zLnJ0Yykge1xuICAgICAgICBpZiAob3B0aW9ucy5ydGMubW9kZSA9PT0gXCJwZWVyXCIpIHtcbiAgICAgICAgICAgIGNvbnN0IHBlZXIgPSBuZXcgUlRDUGVlclRyYW5zcG9ydChjaGFubmVsTmFtZSwgb3B0aW9ucy5ydGMuY29uZmlnKTtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc2VuZDogKG1zZykgPT4gcGVlci5zZW5kKG1zZyksXG4gICAgICAgICAgICAgICAgcmVxdWVzdDogKG1zZykgPT4gcGVlci5yZXF1ZXN0KG1zZyksXG4gICAgICAgICAgICAgICAgc3Vic2NyaWJlOiAobykgPT4gcGVlci5zdWJzY3JpYmUobyBhcyBhbnkpLFxuICAgICAgICAgICAgICAgIGNsb3NlOiAoKSA9PiBwZWVyLmNsb3NlKCksXG4gICAgICAgICAgICAgICAgdHlwZTogXCJydGMtZGF0YVwiLFxuICAgICAgICAgICAgICAgIGNoYW5uZWxOYW1lLFxuICAgICAgICAgICAgICAgIGlzUmVhZHk6IHBlZXIuY29ubmVjdGlvblN0YXRlID09PSBcImNvbm5lY3RlZFwiXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIGlmIChvcHRpb25zLnJ0Yy5tb2RlID09PSBcIm1hbmFnZXJcIikge1xuICAgICAgICAgICAgY29uc3QgbWFuYWdlciA9IG5ldyBSVENQZWVyTWFuYWdlcihjaGFubmVsTmFtZSwgb3B0aW9ucy5ydGMuY29uZmlnKTtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc2VuZDogKG1zZykgPT4gbWFuYWdlci5icm9hZGNhc3QobXNnKSxcbiAgICAgICAgICAgICAgICByZXF1ZXN0OiAoKSA9PiBQcm9taXNlLnJlamVjdChcIlVzZSBtYW5hZ2VyLnJlcXVlc3QocGVlcklkLCBtc2cpIGRpcmVjdGx5XCIpLFxuICAgICAgICAgICAgICAgIHN1YnNjcmliZTogKG8pID0+IG1hbmFnZXIuc3Vic2NyaWJlKG8gYXMgYW55KSxcbiAgICAgICAgICAgICAgICBjbG9zZTogKCkgPT4gbWFuYWdlci5jbG9zZSgpLFxuICAgICAgICAgICAgICAgIHR5cGU6IFwicnRjLWRhdGFcIixcbiAgICAgICAgICAgICAgICBjaGFubmVsTmFtZSxcbiAgICAgICAgICAgICAgICBpc1JlYWR5OiB0cnVlXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gRGVmYXVsdDogaW50ZXJuYWwgb2JzZXJ2YWJsZVxuICAgIGNvbnN0IHN1YmplY3QgPSBuZXcgQ2hhbm5lbFN1YmplY3Q8Q2hhbm5lbE1lc3NhZ2U+KCk7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgc2VuZDogKG1zZykgPT4gc3ViamVjdC5uZXh0KG1zZyksXG4gICAgICAgIHJlcXVlc3Q6ICgpID0+IFByb21pc2UucmVqZWN0KFwiSW50ZXJuYWwgdHJhbnNwb3J0IGRvZXMgbm90IHN1cHBvcnQgcmVxdWVzdFwiKSxcbiAgICAgICAgc3Vic2NyaWJlOiAobykgPT4gc3ViamVjdC5zdWJzY3JpYmUobyBhcyBhbnkpLFxuICAgICAgICBjbG9zZTogKCkgPT4gc3ViamVjdC5jb21wbGV0ZSgpLFxuICAgICAgICB0eXBlOiBcImludGVybmFsXCIsXG4gICAgICAgIGNoYW5uZWxOYW1lLFxuICAgICAgICBpc1JlYWR5OiB0cnVlXG4gICAgfTtcbn1cblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gVFJBTlNQT1JUIFJFR0lTVFJZXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbmNsYXNzIFRyYW5zcG9ydFJlZ2lzdHJ5IHtcbiAgICBwcml2YXRlIF90cmFuc3BvcnRzID0gbmV3IE1hcDxzdHJpbmcsIFRyYW5zcG9ydEluc3RhbmNlPigpO1xuXG4gICAgcmVnaXN0ZXIobmFtZTogc3RyaW5nLCB0cmFuc3BvcnQ6IFRyYW5zcG9ydEluc3RhbmNlKTogdm9pZCB7XG4gICAgICAgIHRoaXMuX3RyYW5zcG9ydHMuc2V0KG5hbWUsIHRyYW5zcG9ydCk7XG4gICAgfVxuXG4gICAgZ2V0KG5hbWU6IHN0cmluZyk6IFRyYW5zcG9ydEluc3RhbmNlIHwgdW5kZWZpbmVkIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3RyYW5zcG9ydHMuZ2V0KG5hbWUpO1xuICAgIH1cblxuICAgIGdldE9yQ3JlYXRlKFxuICAgICAgICBuYW1lOiBzdHJpbmcsXG4gICAgICAgIG9wdGlvbnM6IFRyYW5zcG9ydEZhY3RvcnlPcHRpb25zID0ge30sXG4gICAgICAgIGNvbmZpZzogUGFydGlhbDxVbmlmaWVkVHJhbnNwb3J0Q29uZmlnPiA9IHt9XG4gICAgKTogVHJhbnNwb3J0SW5zdGFuY2Uge1xuICAgICAgICBsZXQgdHJhbnNwb3J0ID0gdGhpcy5fdHJhbnNwb3J0cy5nZXQobmFtZSk7XG4gICAgICAgIGlmICghdHJhbnNwb3J0KSB7XG4gICAgICAgICAgICB0cmFuc3BvcnQgPSBjcmVhdGVUcmFuc3BvcnQobmFtZSwgb3B0aW9ucywgY29uZmlnKTtcbiAgICAgICAgICAgIHRoaXMuX3RyYW5zcG9ydHMuc2V0KG5hbWUsIHRyYW5zcG9ydCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRyYW5zcG9ydDtcbiAgICB9XG5cbiAgICByZW1vdmUobmFtZTogc3RyaW5nKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IHRyYW5zcG9ydCA9IHRoaXMuX3RyYW5zcG9ydHMuZ2V0KG5hbWUpO1xuICAgICAgICBpZiAodHJhbnNwb3J0KSB7XG4gICAgICAgICAgICB0cmFuc3BvcnQuY2xvc2UoKTtcbiAgICAgICAgICAgIHRoaXMuX3RyYW5zcG9ydHMuZGVsZXRlKG5hbWUpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgY2xvc2VBbGwoKTogdm9pZCB7XG4gICAgICAgIGZvciAoY29uc3QgdHJhbnNwb3J0IG9mIHRoaXMuX3RyYW5zcG9ydHMudmFsdWVzKCkpIHtcbiAgICAgICAgICAgIHRyYW5zcG9ydC5jbG9zZSgpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuX3RyYW5zcG9ydHMuY2xlYXIoKTtcbiAgICB9XG5cbiAgICBsaXN0KCk6IHN0cmluZ1tdIHtcbiAgICAgICAgcmV0dXJuIEFycmF5LmZyb20odGhpcy5fdHJhbnNwb3J0cy5rZXlzKCkpO1xuICAgIH1cblxuICAgIGdldCBzaXplKCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLl90cmFuc3BvcnRzLnNpemU7XG4gICAgfVxufVxuXG5sZXQgX3JlZ2lzdHJ5OiBUcmFuc3BvcnRSZWdpc3RyeSB8IG51bGwgPSBudWxsO1xuXG5leHBvcnQgZnVuY3Rpb24gZ2V0VHJhbnNwb3J0UmVnaXN0cnkoKTogVHJhbnNwb3J0UmVnaXN0cnkge1xuICAgIGlmICghX3JlZ2lzdHJ5KSBfcmVnaXN0cnkgPSBuZXcgVHJhbnNwb3J0UmVnaXN0cnkoKTtcbiAgICByZXR1cm4gX3JlZ2lzdHJ5O1xufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBFWFBPUlRTXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbmV4cG9ydCBjb25zdCBVbmlmaWVkVHJhbnNwb3J0RmFjdG9yeSA9IHtcbiAgICAvLyBNYWluIGZhY3RvcnlcbiAgICBjcmVhdGU6IGNyZWF0ZVRyYW5zcG9ydCxcbiAgICByZWdpc3RyeTogZ2V0VHJhbnNwb3J0UmVnaXN0cnksXG5cbiAgICAvLyBOYXRpdmUgd3JhcHBlcnNcbiAgICBmcm9tV29ya2VyOiAod29ya2VyOiBXb3JrZXIsIG5hbWU6IHN0cmluZywgY29uZmlnPzogUGFydGlhbDxVbmlmaWVkVHJhbnNwb3J0Q29uZmlnPikgPT5cbiAgICAgICAgY3JlYXRlVHJhbnNwb3J0KG5hbWUsIHsgd29ya2VyOiB7IGV4aXN0aW5nOiB3b3JrZXIgfSB9LCBjb25maWcpLFxuICAgIGZyb21Qb3J0OiAocG9ydDogTWVzc2FnZVBvcnQsIG5hbWU6IHN0cmluZywgY29uZmlnPzogUGFydGlhbDxVbmlmaWVkVHJhbnNwb3J0Q29uZmlnPikgPT5cbiAgICAgICAgY3JlYXRlVHJhbnNwb3J0KG5hbWUsIHsgcG9ydDogeyBwb3J0IH0gfSwgY29uZmlnKSxcbiAgICBmcm9tV2ViU29ja2V0OiAodXJsOiBzdHJpbmcsIG5hbWU6IHN0cmluZywgY29uZmlnPzogUGFydGlhbDxVbmlmaWVkVHJhbnNwb3J0Q29uZmlnPikgPT5cbiAgICAgICAgY3JlYXRlVHJhbnNwb3J0KG5hbWUsIHsgd2Vic29ja2V0OiB7IHVybCB9IH0sIGNvbmZpZyksXG4gICAgZnJvbUJyb2FkY2FzdDogKG5hbWU6IHN0cmluZywgY29uZmlnPzogUGFydGlhbDxVbmlmaWVkVHJhbnNwb3J0Q29uZmlnPikgPT5cbiAgICAgICAgY3JlYXRlVHJhbnNwb3J0KG5hbWUsIHsgYnJvYWRjYXN0OiB7fSB9LCBjb25maWcpLFxuXG4gICAgLy8gU3BlY2lhbGl6ZWQgdHJhbnNwb3J0c1xuICAgIHNoYXJlZFdvcmtlcjoge1xuICAgICAgICBjbGllbnQ6ICh1cmw6IHN0cmluZyB8IFVSTCwgbmFtZTogc3RyaW5nLCBvcHRzPzogU2hhcmVkV29ya2VyT3B0aW9ucykgPT5cbiAgICAgICAgICAgIG5ldyBTaGFyZWRXb3JrZXJDbGllbnQodXJsLCBuYW1lLCBvcHRzKSxcbiAgICAgICAgaG9zdDogKG5hbWU6IHN0cmluZykgPT4gbmV3IFNoYXJlZFdvcmtlckhvc3QobmFtZSlcbiAgICB9LFxuXG4gICAgYXRvbWljczoge1xuICAgICAgICBjcmVhdGU6IChuYW1lOiBzdHJpbmcsIHNlbmQ6IFNoYXJlZEFycmF5QnVmZmVyLCByZWN2OiBTaGFyZWRBcnJheUJ1ZmZlciwgY29uZmlnPzogQXRvbWljc1RyYW5zcG9ydENvbmZpZykgPT5cbiAgICAgICAgICAgIG5ldyBBdG9taWNzVHJhbnNwb3J0KG5hbWUsIHNlbmQsIHJlY3YsIGNvbmZpZyksXG4gICAgICAgIGNyZWF0ZVBhaXI6IGNyZWF0ZUF0b21pY3NDaGFubmVsUGFpcixcbiAgICAgICAgYnVmZmVyOiAoc2l6ZT86IG51bWJlcikgPT4gbmV3IEF0b21pY3NCdWZmZXIoc2l6ZSksXG4gICAgICAgIHJpbmdCdWZmZXI6ICgpID0+IG5ldyBBdG9taWNzUmluZ0J1ZmZlcigpXG4gICAgfSxcblxuICAgIHJ0Yzoge1xuICAgICAgICBwZWVyOiAobmFtZTogc3RyaW5nLCBjb25maWc/OiBSVENUcmFuc3BvcnRDb25maWcpID0+IG5ldyBSVENQZWVyVHJhbnNwb3J0KG5hbWUsIGNvbmZpZyksXG4gICAgICAgIG1hbmFnZXI6IChuYW1lOiBzdHJpbmcsIGNvbmZpZz86IFJUQ1RyYW5zcG9ydENvbmZpZykgPT4gbmV3IFJUQ1BlZXJNYW5hZ2VyKG5hbWUsIGNvbmZpZyksXG4gICAgICAgIHNpZ25hbGluZzogY3JlYXRlQnJvYWRjYXN0U2lnbmFsaW5nXG4gICAgfSxcblxuICAgIHBvcnQ6IHtcbiAgICAgICAgY3JlYXRlOiAocG9ydDogTWVzc2FnZVBvcnQsIG5hbWU6IHN0cmluZywgY29uZmlnPzogUG9ydFRyYW5zcG9ydENvbmZpZykgPT5cbiAgICAgICAgICAgIG5ldyBQb3J0VHJhbnNwb3J0KHBvcnQsIG5hbWUsIGNvbmZpZyksXG4gICAgICAgIGNyZWF0ZVBhaXI6IGNyZWF0ZUNoYW5uZWxQYWlyLFxuICAgICAgICBwb29sOiAoY29uZmlnPzogUG9ydFRyYW5zcG9ydENvbmZpZykgPT4gbmV3IFBvcnRQb29sKGNvbmZpZyksXG4gICAgICAgIHdpbmRvd0Nvbm5lY3RvcjogKHRhcmdldDogV2luZG93LCBuYW1lOiBzdHJpbmcpID0+IG5ldyBXaW5kb3dQb3J0Q29ubmVjdG9yKHRhcmdldCwgbmFtZSlcbiAgICB9LFxuXG4gICAgc3RvcmFnZToge1xuICAgICAgICBjcmVhdGU6IDxUPihjb25maWc6IFRyYW5zZmVyYWJsZVN0b3JhZ2VDb25maWcpID0+IG5ldyBUcmFuc2ZlcmFibGVTdG9yYWdlPFQ+KGNvbmZpZyksXG4gICAgICAgIG1lc3NhZ2VRdWV1ZTogKGRiTmFtZT86IHN0cmluZykgPT4gbmV3IE1lc3NhZ2VRdWV1ZVN0b3JhZ2UoZGJOYW1lKVxuICAgIH0sXG5cbiAgICBzZXJ2aWNlV29ya2VyOiB7XG4gICAgICAgIGhvc3Q6IChjb25maWc6IFNXSG9zdENvbmZpZykgPT4gbmV3IFNlcnZpY2VXb3JrZXJIb3N0KGNvbmZpZyksXG4gICAgICAgIGNsaWVudDogKG5hbWU6IHN0cmluZykgPT4gbmV3IFNlcnZpY2VXb3JrZXJDbGllbnQobmFtZSlcbiAgICB9LFxuXG4gICAgc29ja2V0aW86IChzb2NrZXQ6IFNvY2tldElPTGlrZSwgbmFtZTogc3RyaW5nLCBvcHRzPzogU29ja2V0T2JzZXJ2YWJsZU9wdGlvbnMpID0+XG4gICAgICAgIG5ldyBTb2NrZXRJT09ic2VydmFibGUoc29ja2V0LCBuYW1lLCBvcHRzKSxcblxuICAgIGNocm9tZToge1xuICAgICAgICBydW50aW1lOiAob3B0cz86IENocm9tZU9ic2VydmFibGVPcHRpb25zKSA9PiBuZXcgQ2hyb21lUnVudGltZU9ic2VydmFibGUodW5kZWZpbmVkLCBvcHRzKSxcbiAgICAgICAgdGFiczogKHRhYklkPzogbnVtYmVyLCBvcHRzPzogQ2hyb21lT2JzZXJ2YWJsZU9wdGlvbnMpID0+IG5ldyBDaHJvbWVUYWJzT2JzZXJ2YWJsZSh0YWJJZCwgb3B0cyksXG4gICAgICAgIHBvcnQ6IChuYW1lOiBzdHJpbmcsIHRhYklkPzogbnVtYmVyKSA9PiBuZXcgQ2hyb21lUG9ydE9ic2VydmFibGUobmFtZSwgdGFiSWQpXG4gICAgfSxcblxuICAgIC8vIFV0aWxpdGllc1xuICAgIGRldGVjdDogZGV0ZWN0VHJhbnNwb3J0VHlwZSxcbiAgICBtZXRhOiBnZXRUcmFuc3BvcnRNZXRhXG59O1xuXG4vLyBEZWZhdWx0IGV4cG9ydFxuZXhwb3J0IGRlZmF1bHQgVW5pZmllZFRyYW5zcG9ydEZhY3Rvcnk7XG4iXX0=