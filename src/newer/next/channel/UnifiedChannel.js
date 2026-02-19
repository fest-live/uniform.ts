/**
 * Unified Channel System
 *
 * Merges and unifies:
 * - RequestProxy (proxy creation and dispatch)
 * - Invoker (Requestor/Responder abstraction)
 * - ChannelContext (multi-channel management)
 * - ObservableChannels (Observable-based messaging)
 *
 * Single entry point for all channel communication patterns:
 * - `createChannel()` - Create a unified channel
 * - `channel.expose()` - Expose objects for remote invocation
 * - `channel.import()` - Import remote modules
 * - `channel.proxy()` - Create transparent proxy to remote
 * - `channel.connect()` - Connect to transport
 */
import { UUIDv4 } from "fest/core";
import { ChannelSubject } from "../observable/Observable";
import { WReflectAction } from "../types/Interface";
import { writeByPath } from "../storage/DataBase";
import { detectContextType, detectTransportType, detectIncomingContextType, DefaultReflect } from "../proxy/Invoker";
import { createRemoteProxy, wrapDescriptor as wrapProxyDescriptor } from "../proxy/Proxy";
import { executeAction as coreExecuteAction, buildResponse as coreBuildResponse } from "../../core/RequestHandler";
import { ConnectionRegistry } from "./internal/ConnectionModel";
// ============================================================================
// UNIFIED CHANNEL
// ============================================================================
/**
 * UnifiedChannel - Single entry point for all channel communication
 *
 * Combines:
 * - Requestor functionality (invoke remote methods)
 * - Responder functionality (handle incoming requests)
 * - Proxy creation (transparent remote access)
 * - Observable messaging (subscribe/next pattern)
 * - Multi-transport support (Worker, Port, Broadcast, WebSocket, Chrome)
 */
export class UnifiedChannel {
    _name;
    _contextType;
    _config;
    // Transport management
    _transports = new Map();
    _defaultTransport = null;
    _connectionEvents = new ChannelSubject({ bufferSize: 200 });
    _connectionRegistry = new ConnectionRegistry(() => UUIDv4(), (event) => this._connectionEvents.next(event));
    // Request/Response tracking
    // @ts-ignore
    _pending = new Map();
    _subscriptions = [];
    // Observable subjects
    _inbound = new ChannelSubject({ bufferSize: 100 });
    _outbound = new ChannelSubject({ bufferSize: 100 });
    _invocations = new ChannelSubject({ bufferSize: 100 });
    _responses = new ChannelSubject({ bufferSize: 100 });
    // Exposed objects
    _exposed = new Map();
    // Proxy cache
    _proxyCache = new WeakMap();
    __getPrivate(key) {
        return this[key];
    }
    __setPrivate(key, value) {
        this[key] = value;
    }
    constructor(config) {
        const cfg = typeof config === "string" ? { name: config } : config;
        this._name = cfg.name;
        this._contextType = cfg.autoDetect !== false ? detectContextType() : "unknown";
        this._config = {
            name: cfg.name,
            autoDetect: cfg.autoDetect ?? true,
            timeout: cfg.timeout ?? 30000,
            reflect: cfg.reflect ?? DefaultReflect,
            bufferSize: cfg.bufferSize ?? 100,
            autoListen: cfg.autoListen ?? true
        };
        // Auto-listen on self if in worker context
        if (this._config.autoListen && this._isWorkerContext()) {
            this.listen(self);
        }
    }
    // ========================================================================
    // TRANSPORT CONNECTION
    // ========================================================================
    /**
     * Connect to a transport for sending requests
     *
     * @param target - Worker, MessagePort, BroadcastChannel, WebSocket, or string identifier
     * @param options - Connection options
     */
    connect(target, options = {}) {
        const transportType = detectTransportType(target);
        const targetChannel = options.targetChannel ?? this._inferTargetChannel(target, transportType);
        const binding = this._createTransportBinding(target, transportType, targetChannel, options);
        this._transports.set(targetChannel, binding);
        if (!this._defaultTransport) {
            this._defaultTransport = binding;
        }
        const connection = this._registerConnection({
            localChannel: this._name,
            remoteChannel: targetChannel,
            sender: this._name,
            transportType,
            direction: "outgoing",
            metadata: { phase: "connect" }
        });
        this._emitConnectionSignal(binding, "connect", {
            connectionId: connection.id,
            from: this._name,
            to: targetChannel
        });
        return this;
    }
    /**
     * Listen on a transport for incoming requests
     *
     * @param source - Transport source to listen on
     * @param options - Connection options
     */
    listen(source, options = {}) {
        const transportType = detectTransportType(source);
        const sourceChannel = options.targetChannel ?? this._inferTargetChannel(source, transportType);
        const handler = (data) => this._handleIncoming(data);
        const connection = this._registerConnection({
            localChannel: this._name,
            remoteChannel: sourceChannel,
            sender: sourceChannel,
            transportType,
            direction: "incoming",
            metadata: { phase: "listen" }
        });
        switch (transportType) {
            case "worker":
            case "message-port":
            case "broadcast":
                if (options.autoStart !== false && source.start)
                    source.start();
                source.addEventListener?.("message", ((e) => handler(e.data)));
                break;
            case "websocket":
                source.addEventListener?.("message", ((e) => {
                    try {
                        handler(JSON.parse(e.data));
                    }
                    catch { }
                }));
                break;
            case "chrome-runtime":
                chrome.runtime.onMessage?.addListener?.((msg, sender, sendResponse) => {
                    handler(msg);
                    return true;
                });
                break;
            case "chrome-tabs":
                chrome.runtime.onMessage?.addListener?.((msg, sender) => {
                    if (options.tabId != null && sender?.tab?.id !== options.tabId)
                        return false;
                    handler(msg);
                    return true;
                });
                break;
            case "chrome-port":
                source?.onMessage?.addListener?.((msg) => {
                    handler(msg);
                });
                break;
            case "chrome-external":
                chrome.runtime.onMessageExternal?.addListener?.((msg) => {
                    handler(msg);
                    return true;
                });
                break;
            case "self":
                addEventListener?.("message", ((e) => handler(e.data)));
                break;
            default:
                if (options.onMessage) {
                    options.onMessage(handler);
                }
        }
        this._sendSignalToTarget(source, transportType, {
            connectionId: connection.id,
            from: this._name,
            to: sourceChannel,
            tabId: options.tabId,
            externalId: options.externalId
        }, "notify");
        return this;
    }
    /**
     * Connect and listen on the same transport (bidirectional)
     */
    attach(target, options = {}) {
        // connect() already installs inbound listeners for response/request flow.
        // Avoid duplicate listeners and duplicate notify storms in attach mode.
        return this.connect(target, options);
    }
    // ========================================================================
    // EXPOSE / IMPORT
    // ========================================================================
    /**
     * Expose an object for remote invocation
     *
     * @param name - Path name for the exposed object
     * @param obj - Object to expose
     */
    expose(name, obj) {
        const path = [name];
        writeByPath(path, obj);
        this._exposed.set(name, { name, obj, path });
        return this;
    }
    /**
     * Expose multiple objects at once
     */
    exposeAll(entries) {
        for (const [name, obj] of Object.entries(entries)) {
            this.expose(name, obj);
        }
        return this;
    }
    /**
     * Import a module from a remote channel
     *
     * @param url - Module URL to import
     * @param targetChannel - Target channel (defaults to first connected)
     */
    async import(url, targetChannel) {
        return this.invoke(targetChannel ?? this._getDefaultTarget(), WReflectAction.IMPORT, [], [url]);
    }
    // ========================================================================
    // INVOKE / REQUEST
    // ========================================================================
    /**
     * Invoke a method on a remote object
     *
     * @param targetChannel - Target channel name
     * @param action - Reflect action
     * @param path - Object path
     * @param args - Arguments
     */
    invoke(targetChannel, action, path, args = []) {
        const id = UUIDv4();
        // @ts-ignore
        const resolvers = Promise.withResolvers();
        this._pending.set(id, resolvers);
        // Setup timeout
        const timeout = setTimeout(() => {
            if (this._pending.has(id)) {
                this._pending.delete(id);
                resolvers.reject(new Error(`Request timeout: ${action} on ${path.join(".")}`));
            }
        }, this._config.timeout);
        // Build and send message
        const message = {
            id,
            channel: targetChannel,
            sender: this._name,
            type: "request",
            payload: {
                channel: targetChannel,
                sender: this._name,
                action,
                path,
                args
            },
            timestamp: Date.now()
        };
        this._send(targetChannel, message);
        this._outbound.next(message);
        return resolvers.promise.finally(() => clearTimeout(timeout));
    }
    /**
     * Get property from remote object
     */
    get(targetChannel, path, prop) {
        return this.invoke(targetChannel, WReflectAction.GET, path, [prop]);
    }
    /**
     * Set property on remote object
     */
    set(targetChannel, path, prop, value) {
        return this.invoke(targetChannel, WReflectAction.SET, path, [prop, value]);
    }
    /**
     * Call method on remote object
     */
    call(targetChannel, path, args = []) {
        return this.invoke(targetChannel, WReflectAction.APPLY, path, [args]);
    }
    /**
     * Construct new instance on remote
     */
    construct(targetChannel, path, args = []) {
        return this.invoke(targetChannel, WReflectAction.CONSTRUCT, path, [args]);
    }
    // ========================================================================
    // PROXY CREATION
    // ========================================================================
    /**
     * Create a transparent proxy to a remote channel
     *
     * All operations on the proxy are forwarded to the remote.
     *
     * @param targetChannel - Target channel name
     * @param basePath - Base path for the proxy
     */
    proxy(targetChannel, basePath = []) {
        const target = targetChannel ?? this._getDefaultTarget();
        return this._createProxy(target, basePath);
    }
    /**
     * Create proxy for a specific exposed module on remote
     *
     * @param moduleName - Name of the exposed module
     * @param targetChannel - Target channel
     */
    remote(moduleName, targetChannel) {
        return this.proxy(targetChannel, [moduleName]);
    }
    /**
     * Wrap a descriptor as a proxy
     */
    wrapDescriptor(descriptor, targetChannel) {
        const invoker = (action, path, args) => {
            const channel = targetChannel ?? descriptor?.channel ?? this._getDefaultTarget();
            return this.invoke(channel, action, path, args);
        };
        return wrapProxyDescriptor(descriptor, invoker, targetChannel ?? descriptor?.channel ?? this._getDefaultTarget());
    }
    // ========================================================================
    // OBSERVABLE API
    // ========================================================================
    /**
     * Subscribe to incoming messages
     */
    subscribe(handler) {
        return this._inbound.subscribe(handler);
    }
    /**
     * Send a message (fire-and-forget)
     */
    next(message) {
        this._send(message.channel, message);
        this._outbound.next(message);
    }
    /**
     * Emit an event to a channel
     */
    emit(targetChannel, eventType, data) {
        const message = {
            id: UUIDv4(),
            channel: targetChannel,
            sender: this._name,
            type: "event",
            payload: { type: eventType, data },
            timestamp: Date.now()
        };
        this.next(message);
    }
    /**
     * Emit connection-level signal to a specific connected channel.
     * This is the canonical notify/connect API for facade layers.
     */
    notify(targetChannel, payload = {}, type = "notify") {
        const binding = this._transports.get(targetChannel);
        if (!binding)
            return false;
        this._emitConnectionSignal(binding, type, {
            from: this._name,
            to: targetChannel,
            ...payload
        });
        return true;
    }
    /** Observable: Incoming messages */
    get onMessage() { return this._inbound; }
    /** Observable: Outgoing messages */
    get onOutbound() { return this._outbound; }
    /** Observable: Incoming invocations */
    get onInvocation() { return this._invocations; }
    /** Observable: Outgoing responses */
    get onResponse() { return this._responses; }
    /** Observable: Connection events (connected/notified/disconnected) */
    get onConnection() { return this._connectionEvents; }
    subscribeConnections(handler) {
        return this._connectionEvents.subscribe(handler);
    }
    queryConnections(query = {}) {
        return this._connectionRegistry.query(query);
    }
    notifyConnections(payload = {}, query = {}) {
        let sent = 0;
        const targets = this.queryConnections({ ...query, status: "active", includeClosed: false });
        for (const connection of targets) {
            const binding = this._transports.get(connection.remoteChannel);
            if (!binding)
                continue;
            this._emitConnectionSignal(binding, "notify", {
                connectionId: connection.id,
                from: this._name,
                to: connection.remoteChannel,
                ...payload
            });
            sent++;
        }
        return sent;
    }
    // ========================================================================
    // PROPERTIES
    // ========================================================================
    /** Channel name */
    get name() { return this._name; }
    /** Detected context type */
    get contextType() { return this._contextType; }
    /** Configuration */
    get config() { return this._config; }
    /** Connected transport names */
    get connectedChannels() { return [...this._transports.keys()]; }
    /** Exposed module names */
    get exposedModules() { return [...this._exposed.keys()]; }
    // ========================================================================
    // LIFECYCLE
    // ========================================================================
    /**
     * Close all connections and cleanup
     */
    close() {
        this._subscriptions.forEach(s => s.unsubscribe());
        this._subscriptions = [];
        this._pending.clear();
        this._markAllConnectionsClosed();
        for (const binding of this._transports.values()) {
            try {
                binding.cleanup?.();
            }
            catch { }
            // Release common channel-like transports so they do not keep event loop alive.
            if (binding.transportType === "message-port" || binding.transportType === "broadcast") {
                try {
                    binding.target?.close?.();
                }
                catch { }
            }
        }
        this._transports.clear();
        this._defaultTransport = null;
        this._connectionRegistry.clear();
        this._inbound.complete();
        this._outbound.complete();
        this._invocations.complete();
        this._responses.complete();
        this._connectionEvents.complete();
    }
    // ========================================================================
    // PRIVATE: Message Handling
    // ========================================================================
    _handleIncoming(data) {
        if (!data || typeof data !== "object")
            return;
        // Emit to inbound observable
        this._inbound.next(data);
        switch (data.type) {
            case "request":
                if (data.channel === this._name) {
                    this._handleRequest(data);
                }
                break;
            case "response":
                this._handleResponse(data);
                break;
            case "event":
                // Events are handled via subscribe
                break;
            case "signal":
                this._handleSignal(data);
                break;
        }
    }
    _handleResponse(data) {
        const id = data.reqId ?? data.id;
        const resolvers = this._pending.get(id);
        if (resolvers) {
            this._pending.delete(id);
            if (data.payload?.error) {
                resolvers.reject(new Error(data.payload.error));
            }
            else {
                const result = data.payload?.result;
                const descriptor = data.payload?.descriptor;
                if (result !== null && result !== undefined) {
                    resolvers.resolve(result);
                }
                else if (descriptor) {
                    resolvers.resolve(this.wrapDescriptor(descriptor, data.sender));
                }
                else {
                    resolvers.resolve(undefined);
                }
            }
            // Emit response event
            this._responses.next({
                id,
                channel: data.channel,
                sender: data.sender,
                result: data.payload?.result,
                descriptor: data.payload?.descriptor,
                timestamp: Date.now()
            });
        }
    }
    async _handleRequest(data) {
        const payload = data.payload;
        if (!payload)
            return;
        const { action, path, args, sender } = payload;
        const reqId = data.reqId ?? data.id;
        // Emit invocation event
        this._invocations.next({
            id: reqId,
            channel: this._name,
            sender,
            action,
            path,
            args: args ?? [],
            timestamp: Date.now(),
            contextType: detectIncomingContextType(data)
        });
        // Execute action
        const { result, toTransfer, newPath } = await this._executeAction(action, path, args ?? [], sender);
        // Send response
        await this._sendResponse(reqId, action, sender, newPath, result, toTransfer);
    }
    async _executeAction(action, path, args, sender) {
        // Use unified core executeAction
        const { result, toTransfer, path: newPath } = coreExecuteAction(action, path, args, {
            channel: this._name,
            sender,
            reflect: this._config.reflect
        });
        return { result: await result, toTransfer, newPath };
    }
    async _sendResponse(reqId, action, sender, path, rawResult, toTransfer) {
        // Use unified core buildResponse
        const { response: coreResponse, transfer } = await coreBuildResponse(reqId, action, this._name, sender, path, rawResult, toTransfer);
        // Wrap as ChannelMessage with extra fields
        const response = {
            id: reqId,
            ...coreResponse,
            timestamp: Date.now(),
            transferable: transfer
        };
        this._send(sender, response, transfer);
    }
    // ========================================================================
    // PRIVATE: Transport Management
    // ========================================================================
    _handleSignal(data) {
        const payload = data?.payload ?? {};
        const remoteChannel = payload.from ?? data.sender ?? "unknown";
        const transportType = data.transportType ?? this._transports.get(data.channel)?.transportType ?? "internal";
        const connection = this._registerConnection({
            localChannel: this._name,
            remoteChannel,
            sender: data.sender ?? remoteChannel,
            transportType,
            direction: "incoming"
        });
        this._markConnectionNotified(connection, payload);
    }
    _registerConnection(params) {
        return this._connectionRegistry.register(params);
    }
    _markConnectionNotified(connection, payload) {
        this._connectionRegistry.markNotified(connection, payload);
    }
    _emitConnectionSignal(binding, signalType, payload = {}) {
        const message = {
            id: UUIDv4(),
            type: "signal",
            channel: binding.targetChannel,
            sender: this._name,
            transportType: binding.transportType,
            payload: {
                type: signalType,
                from: this._name,
                to: binding.targetChannel,
                ...payload
            },
            timestamp: Date.now()
        };
        (binding?.sender ?? binding?.postMessage)?.call(binding, message);
        const connection = this._registerConnection({
            localChannel: this._name,
            remoteChannel: binding.targetChannel,
            sender: this._name,
            transportType: binding.transportType,
            direction: "outgoing"
        });
        this._markConnectionNotified(connection, message.payload);
    }
    _sendSignalToTarget(target, transportType, payload, signalType) {
        const message = {
            id: UUIDv4(),
            type: "signal",
            channel: payload.to ?? this._name,
            sender: this._name,
            transportType,
            payload: {
                type: signalType,
                ...payload
            },
            timestamp: Date.now()
        };
        try {
            if (transportType === "websocket") {
                target?.send?.(JSON.stringify(message));
                return;
            }
            if (transportType === "chrome-runtime") {
                chrome.runtime?.sendMessage?.(message);
                return;
            }
            if (transportType === "chrome-tabs") {
                const tabId = payload.tabId;
                if (tabId != null)
                    chrome.tabs?.sendMessage?.(tabId, message);
                return;
            }
            if (transportType === "chrome-port") {
                target?.postMessage?.(message);
                return;
            }
            if (transportType === "chrome-external") {
                if (payload.externalId)
                    chrome.runtime?.sendMessage?.(payload.externalId, message);
                return;
            }
            target?.postMessage?.(message, { transfer: [] });
        }
        catch { }
    }
    _markAllConnectionsClosed() {
        this._connectionRegistry.closeAll();
    }
    _createTransportBinding(target, transportType, targetChannel, options) {
        let sender;
        let cleanup;
        switch (transportType) {
            case "worker":
            case "message-port":
            case "broadcast":
                if (options.autoStart !== false && target.start)
                    target.start();
                sender = (msg, transfer) => target.postMessage(msg, { transfer });
                {
                    const listener = ((e) => this._handleIncoming(e.data));
                    target.addEventListener?.("message", listener);
                    cleanup = () => target.removeEventListener?.("message", listener);
                }
                break;
            case "websocket":
                sender = (msg) => target.send(JSON.stringify(msg));
                {
                    const listener = ((e) => {
                        try {
                            this._handleIncoming(JSON.parse(e.data));
                        }
                        catch { }
                    });
                    target.addEventListener?.("message", listener);
                    cleanup = () => target.removeEventListener?.("message", listener);
                }
                break;
            case "chrome-runtime":
                sender = (msg) => chrome.runtime.sendMessage(msg);
                {
                    const listener = (msg) => this._handleIncoming(msg);
                    chrome.runtime.onMessage?.addListener?.(listener);
                    cleanup = () => chrome.runtime.onMessage?.removeListener?.(listener);
                }
                break;
            case "chrome-tabs":
                sender = (msg) => {
                    if (options.tabId != null)
                        chrome.tabs?.sendMessage?.(options.tabId, msg);
                };
                {
                    const listener = (msg, senderMeta) => {
                        if (options.tabId != null && senderMeta?.tab?.id !== options.tabId)
                            return false;
                        this._handleIncoming(msg);
                        return true;
                    };
                    chrome.runtime.onMessage?.addListener?.(listener);
                    cleanup = () => chrome.runtime.onMessage?.removeListener?.(listener);
                }
                break;
            case "chrome-port":
                if (target?.postMessage && target?.onMessage?.addListener) {
                    sender = (msg) => target.postMessage(msg);
                    const listener = (msg) => this._handleIncoming(msg);
                    target.onMessage.addListener(listener);
                    cleanup = () => {
                        try {
                            target.onMessage.removeListener(listener);
                        }
                        catch { }
                        try {
                            target.disconnect?.();
                        }
                        catch { }
                    };
                }
                else {
                    const portName = options.portName ?? targetChannel;
                    const port = options.tabId != null && chrome.tabs?.connect
                        ? chrome.tabs.connect(options.tabId, { name: portName })
                        : chrome.runtime.connect({ name: portName });
                    sender = (msg) => port.postMessage(msg);
                    const listener = (msg) => this._handleIncoming(msg);
                    port.onMessage.addListener(listener);
                    cleanup = () => {
                        try {
                            port.onMessage.removeListener(listener);
                        }
                        catch { }
                        try {
                            port.disconnect();
                        }
                        catch { }
                    };
                }
                break;
            case "chrome-external":
                sender = (msg) => {
                    if (options.externalId)
                        chrome.runtime.sendMessage(options.externalId, msg);
                };
                {
                    const listener = (msg) => {
                        this._handleIncoming(msg);
                        return true;
                    };
                    chrome.runtime.onMessageExternal?.addListener?.(listener);
                    cleanup = () => chrome.runtime.onMessageExternal?.removeListener?.(listener);
                }
                break;
            case "self":
                sender = (msg, transfer) => postMessage(msg, { transfer: transfer ?? [] });
                {
                    const listener = ((e) => this._handleIncoming(e.data));
                    addEventListener?.("message", listener);
                    cleanup = () => removeEventListener?.("message", listener);
                }
                break;
            default:
                if (options.onMessage) {
                    cleanup = options.onMessage((msg) => this._handleIncoming(msg));
                }
                sender = (msg) => target?.postMessage?.(msg);
        }
        return {
            target, targetChannel, transportType, sender, cleanup,
            postMessage: (message, options) => sender?.(message, options),
            start: () => target?.start?.(),
            close: () => target?.close?.()
        };
    }
    _send(targetChannel, message, transfer) {
        const binding = this._transports.get(targetChannel) ?? this._defaultTransport;
        (binding?.sender ?? binding?.postMessage)?.call(binding, message, transfer);
    }
    _getDefaultTarget() {
        if (this._defaultTransport) {
            return this._defaultTransport.targetChannel;
        }
        return "worker";
    }
    _inferTargetChannel(target, transportType) {
        if (transportType === "worker")
            return "worker";
        if (transportType === "broadcast" && target.name)
            return target.name;
        if (transportType === "self")
            return "self";
        return `${transportType}-${UUIDv4().slice(0, 8)}`;
    }
    // ========================================================================
    // PRIVATE: Proxy Creation
    // ========================================================================
    _createProxy(targetChannel, basePath) {
        const invoker = (action, path, args) => {
            return this.invoke(targetChannel, action, path, args);
        };
        return createRemoteProxy(invoker, {
            channel: targetChannel,
            basePath,
            cache: true,
            timeout: this._config.timeout
        });
    }
    // ========================================================================
    // PRIVATE: Utilities
    // ========================================================================
    _isWorkerContext() {
        return ["worker", "shared-worker", "service-worker"].includes(this._contextType);
    }
}
// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================
/**
 * Create a unified channel
 *
 * @example
 * // In worker
 * const channel = createUnifiedChannel("worker");
 * channel.expose("calc", { add: (a, b) => a + b });
 *
 * // In host
 * const channel = createUnifiedChannel("host");
 * channel.connect(worker);
 * const calc = channel.proxy("worker", ["calc"]);
 * await calc.add(2, 3); // 5
 */
export function createUnifiedChannel(config) {
    return new UnifiedChannel(config);
}
/**
 * Quick setup: Create channel and connect to transport
 */
export function setupUnifiedChannel(name, target, options) {
    return createUnifiedChannel({ name, ...options }).attach(target, options);
}
/**
 * Create a channel pair for bidirectional communication
 */
export function createUnifiedChannelPair(name1, name2, options) {
    const mc = new MessageChannel();
    mc.port1.start();
    mc.port2.start();
    const channel1 = createUnifiedChannel({ name: name1, autoListen: false, ...options }).attach(mc.port1, { targetChannel: name2 });
    const channel2 = createUnifiedChannel({ name: name2, autoListen: false, ...options }).attach(mc.port2, { targetChannel: name1 });
    return { channel1, channel2, messageChannel: mc };
}
// ============================================================================
// GLOBAL CHANNEL REGISTRY
// ============================================================================
const CHANNEL_REGISTRY = new Map();
/**
 * Get or create a named channel (singleton per name)
 */
export function getUnifiedChannel(name, config) {
    if (!CHANNEL_REGISTRY.has(name)) {
        CHANNEL_REGISTRY.set(name, createUnifiedChannel({ name, ...config }));
    }
    return CHANNEL_REGISTRY.get(name);
}
/**
 * Get all registered channel names
 */
export function getUnifiedChannelNames() {
    return [...CHANNEL_REGISTRY.keys()];
}
/**
 * Close and remove a channel from registry
 */
export function closeUnifiedChannel(name) {
    const channel = CHANNEL_REGISTRY.get(name);
    if (channel) {
        channel.close();
        return CHANNEL_REGISTRY.delete(name);
    }
    return false;
}
// ============================================================================
// AUTO-INIT FOR WORKERS
// ============================================================================
let WORKER_CHANNEL = null;
/**
 * Get the worker's unified channel (auto-created in worker context)
 */
export function getWorkerChannel() {
    if (!WORKER_CHANNEL) {
        const contextType = detectContextType();
        if (["worker", "shared-worker", "service-worker"].includes(contextType)) {
            WORKER_CHANNEL = createUnifiedChannel({ name: "worker", autoListen: true });
        }
        else {
            WORKER_CHANNEL = createUnifiedChannel({ name: "host", autoListen: false });
        }
    }
    return WORKER_CHANNEL;
}
/**
 * Expose an object from the worker channel
 */
export function exposeFromUnified(name, obj) {
    getWorkerChannel().expose(name, obj);
}
/**
 * Create a proxy to a remote channel from the worker
 */
export function remoteFromUnified(moduleName, targetChannel) {
    return getWorkerChannel().remote(moduleName, targetChannel);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVW5pZmllZENoYW5uZWwuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJVbmlmaWVkQ2hhbm5lbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7Ozs7Ozs7O0dBZUc7QUFFSCxPQUFPLEVBQUUsTUFBTSxFQUE4RSxNQUFNLFdBQVcsQ0FBQztBQUMvRyxPQUFPLEVBR0gsY0FBYyxFQUVqQixNQUFNLDBCQUEwQixDQUFDO0FBQ2xDLE9BQU8sRUFBRSxjQUFjLEVBQXNFLE1BQU0sb0JBQW9CLENBQUM7QUFDeEgsT0FBTyxFQUlILFdBQVcsRUFFZCxNQUFNLHFCQUFxQixDQUFDO0FBQzdCLE9BQU8sRUFDSCxpQkFBaUIsRUFDakIsbUJBQW1CLEVBQ25CLHlCQUF5QixFQUN6QixjQUFjLEVBS2pCLE1BQU0sa0JBQWtCLENBQUM7QUFDMUIsT0FBTyxFQUNILGlCQUFpQixFQUNqQixjQUFjLElBQUksbUJBQW1CLEVBR3hDLE1BQU0sZ0JBQWdCLENBQUM7QUFDeEIsT0FBTyxFQUNILGFBQWEsSUFBSSxpQkFBaUIsRUFDbEMsYUFBYSxJQUFJLGlCQUFpQixFQUVyQyxNQUFNLDJCQUEyQixDQUFDO0FBQ25DLE9BQU8sRUFDSCxrQkFBa0IsRUFNckIsTUFBTSw0QkFBNEIsQ0FBQztBQW9EcEMsK0VBQStFO0FBQy9FLGtCQUFrQjtBQUNsQiwrRUFBK0U7QUFFL0U7Ozs7Ozs7OztHQVNHO0FBQ0gsTUFBTSxPQUFPLGNBQWM7SUFDZixLQUFLLENBQVM7SUFDZCxZQUFZLENBQWM7SUFDMUIsT0FBTyxDQUFpQztJQUVoRCx1QkFBdUI7SUFDZixXQUFXLEdBQUcsSUFBSSxHQUFHLEVBQTRCLENBQUM7SUFDbEQsaUJBQWlCLEdBQTRCLElBQUksQ0FBQztJQUNsRCxpQkFBaUIsR0FBRyxJQUFJLGNBQWMsQ0FBeUIsRUFBRSxVQUFVLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQztJQUNwRixtQkFBbUIsR0FBRyxJQUFJLGtCQUFrQixDQUNoRCxHQUFHLEVB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RSxRQUFRLEVBQUUsVUFBVSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7UUFDaEYsQ0FBQzthQUFNLENBQUM7WUFDSixjQUFjLEdBQUcsb0JBQW9CLENBQUMsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLFVBQVUsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDO1FBQy9FLENBQUM7SUFDTCxDQUFDO0lBQ0QsT0FBTyxjQUFjLENBQUM7QUFDMUIsQ0FBQztBQUVEOztHQUVHO0FBQ0gsTUFBTSxVQUFVLGlCQUFpQixDQUFDLElBQVksRUFBRSxHQUFRO0lBQ3BELGdCQUFnQixFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQztBQUN6QyxDQUFDO0FBRUQ7O0dBRUc7QUFDSCxNQUFNLFVBQVUsaUJBQWlCLENBQVUsVUFBa0IsRUFBRSxhQUFzQjtJQUNqRixPQUFPLGdCQUFnQixFQUFFLENBQUMsTUFBTSxDQUFJLFVBQVUsRUFBRSxhQUFhLENBQUMsQ0FBQztBQUNuRSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBVbmlmaWVkIENoYW5uZWwgU3lzdGVtXG4gKlxuICogTWVyZ2VzIGFuZCB1bmlmaWVzOlxuICogLSBSZXF1ZXN0UHJveHkgKHByb3h5IGNyZWF0aW9uIGFuZCBkaXNwYXRjaClcbiAqIC0gSW52b2tlciAoUmVxdWVzdG9yL1Jlc3BvbmRlciBhYnN0cmFjdGlvbilcbiAqIC0gQ2hhbm5lbENvbnRleHQgKG11bHRpLWNoYW5uZWwgbWFuYWdlbWVudClcbiAqIC0gT2JzZXJ2YWJsZUNoYW5uZWxzIChPYnNlcnZhYmxlLWJhc2VkIG1lc3NhZ2luZylcbiAqXG4gKiBTaW5nbGUgZW50cnkgcG9pbnQgZm9yIGFsbCBjaGFubmVsIGNvbW11bmljYXRpb24gcGF0dGVybnM6XG4gKiAtIGBjcmVhdGVDaGFubmVsKClgIC0gQ3JlYXRlIGEgdW5pZmllZCBjaGFubmVsXG4gKiAtIGBjaGFubmVsLmV4cG9zZSgpYCAtIEV4cG9zZSBvYmplY3RzIGZvciByZW1vdGUgaW52b2NhdGlvblxuICogLSBgY2hhbm5lbC5pbXBvcnQoKWAgLSBJbXBvcnQgcmVtb3RlIG1vZHVsZXNcbiAqIC0gYGNoYW5uZWwucHJveHkoKWAgLSBDcmVhdGUgdHJhbnNwYXJlbnQgcHJveHkgdG8gcmVtb3RlXG4gKiAtIGBjaGFubmVsLmNvbm5lY3QoKWAgLSBDb25uZWN0IHRvIHRyYW5zcG9ydFxuICovXG5cbmltcG9ydCB7IFVVSUR2NCwgUHJvbWlzZWQsIGRlZXBPcGVyYXRlQW5kQ2xvbmUsIGlzUHJpbWl0aXZlLCBpc0Nhbkp1c3RSZXR1cm4sIGlzQ2FuVHJhbnNmZXIgfSBmcm9tIFwiZmVzdC9jb3JlXCI7XG5pbXBvcnQge1xuICAgIHR5cGUgQ2hhbm5lbE1lc3NhZ2UsXG4gICAgdHlwZSBTdWJzY3JpcHRpb24sXG4gICAgQ2hhbm5lbFN1YmplY3QsXG4gICAgZmlsdGVyXG59IGZyb20gXCIuLi9vYnNlcnZhYmxlL09ic2VydmFibGVcIjtcbmltcG9ydCB7IFdSZWZsZWN0QWN0aW9uLCB0eXBlIFdSZWZsZWN0RGVzY3JpcHRvciwgdHlwZSBXUmVxLCB0eXBlIFdSZXNwLCB0eXBlIFRyYW5zcG9ydFR5cGUgfSBmcm9tIFwiLi4vdHlwZXMvSW50ZXJmYWNlXCI7XG5pbXBvcnQge1xuICAgIGhhc05vUGF0aCxcbiAgICByZWFkQnlQYXRoLFxuICAgIHJlZ2lzdGVyZWRJblBhdGgsXG4gICAgd3JpdGVCeVBhdGgsXG4gICAgb2JqZWN0VG9SZWZcbn0gZnJvbSBcIi4uL3N0b3JhZ2UvRGF0YUJhc2VcIjtcbmltcG9ydCB7XG4gICAgZGV0ZWN0Q29udGV4dFR5cGUsXG4gICAgZGV0ZWN0VHJhbnNwb3J0VHlwZSxcbiAgICBkZXRlY3RJbmNvbWluZ0NvbnRleHRUeXBlLFxuICAgIERlZmF1bHRSZWZsZWN0LFxuICAgIHR5cGUgQ29udGV4dFR5cGUsXG4gICAgdHlwZSBSZWZsZWN0TGlrZSxcbiAgICB0eXBlIEluY29taW5nSW52b2NhdGlvbixcbiAgICB0eXBlIEludm9jYXRpb25SZXNwb25zZVxufSBmcm9tIFwiLi4vcHJveHkvSW52b2tlclwiO1xuaW1wb3J0IHtcbiAgICBjcmVhdGVSZW1vdGVQcm94eSxcbiAgICB3cmFwRGVzY3JpcHRvciBhcyB3cmFwUHJveHlEZXNjcmlwdG9yLFxuICAgIHR5cGUgUHJveHlJbnZva2VyLFxuICAgIHR5cGUgUmVtb3RlUHJveHlcbn0gZnJvbSBcIi4uL3Byb3h5L1Byb3h5XCI7XG5pbXBvcnQge1xuICAgIGV4ZWN1dGVBY3Rpb24gYXMgY29yZUV4ZWN1dGVBY3Rpb24sXG4gICAgYnVpbGRSZXNwb25zZSBhcyBjb3JlQnVpbGRSZXNwb25zZSxcbiAgICB0eXBlIEV4ZWN1dGVPcHRpb25zXG59IGZyb20gXCIuLi8uLi9jb3JlL1JlcXVlc3RIYW5kbGVyXCI7XG5pbXBvcnQge1xuICAgIENvbm5lY3Rpb25SZWdpc3RyeSxcbiAgICB0eXBlIENvbm5lY3Rpb25EaXJlY3Rpb24sXG4gICAgdHlwZSBDb25uZWN0aW9uU3RhdHVzLFxuICAgIHR5cGUgQ29ubmVjdGlvbkluZm8sXG4gICAgdHlwZSBDb25uZWN0aW9uRXZlbnQsXG4gICAgdHlwZSBRdWVyeUNvbm5lY3Rpb25zT3B0aW9uc1xufSBmcm9tIFwiLi9pbnRlcm5hbC9Db25uZWN0aW9uTW9kZWxcIjtcbmltcG9ydCB0eXBlIHsgTmF0aXZlQ2hhbm5lbFRyYW5zcG9ydCB9IGZyb20gXCIuL0NoYW5uZWxDb250ZXh0XCI7XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFRZUEVTXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKiBVbmlmaWVkIGNoYW5uZWwgY29uZmlndXJhdGlvbiAqL1xuZXhwb3J0IGludGVyZmFjZSBVbmlmaWVkQ2hhbm5lbENvbmZpZyB7XG4gICAgLyoqIENoYW5uZWwgbmFtZSAqL1xuICAgIG5hbWU6IHN0cmluZztcbiAgICAvKiogQXV0by1kZXRlY3QgY29udGV4dCB0eXBlICovXG4gICAgYXV0b0RldGVjdD86IGJvb2xlYW47XG4gICAgLyoqIFJlcXVlc3QgdGltZW91dCAobXMpICovXG4gICAgdGltZW91dD86IG51bWJlcjtcbiAgICAvKiogQ3VzdG9tIFJlZmxlY3QgaW1wbGVtZW50YXRpb24gKi9cbiAgICByZWZsZWN0PzogUmVmbGVjdExpa2U7XG4gICAgLyoqIEJ1ZmZlciBzaXplIGZvciBvYnNlcnZhYmxlcyAqL1xuICAgIGJ1ZmZlclNpemU/OiBudW1iZXI7XG4gICAgLyoqIEF1dG8tc3RhcnQgbGlzdGVuaW5nICovXG4gICAgYXV0b0xpc3Rlbj86IGJvb2xlYW47XG59XG5cbi8qKiBUcmFuc3BvcnQgY29ubmVjdGlvbiBvcHRpb25zICovXG5leHBvcnQgaW50ZXJmYWNlIENvbm5lY3RPcHRpb25zIHtcbiAgICAvKiogVGFyZ2V0IGNoYW5uZWwgbmFtZSBmb3IgcmVxdWVzdHMgKi9cbiAgICB0YXJnZXRDaGFubmVsPzogc3RyaW5nO1xuICAgIC8qKiBDaHJvbWUgdGFiIGlkIGZvciBjaHJvbWUtdGFicyB0cmFuc3BvcnQgKi9cbiAgICB0YWJJZD86IG51bWJlcjtcbiAgICAvKiogQ2hyb21lIHBvcnQgbmFtZSBmb3IgY2hyb21lLXBvcnQgdHJhbnNwb3J0ICovXG4gICAgcG9ydE5hbWU/OiBzdHJpbmc7XG4gICAgLyoqIEV4dGVybmFsIGV4dGVuc2lvbiBpZCBmb3IgY2hyb21lLWV4dGVybmFsIHRyYW5zcG9ydCAqL1xuICAgIGV4dGVybmFsSWQ/OiBzdHJpbmc7XG4gICAgLyoqIEN1c3RvbSBtZXNzYWdlIGhhbmRsZXIgKi9cbiAgICBvbk1lc3NhZ2U/OiAoaGFuZGxlcjogKG1zZzogYW55KSA9PiB2b2lkKSA9PiAoKCkgPT4gdm9pZCk7XG4gICAgLyoqIEF1dG8tc3RhcnQgTWVzc2FnZVBvcnQgKi9cbiAgICBhdXRvU3RhcnQ/OiBib29sZWFuO1xufVxuXG5leHBvcnQgdHlwZSBVbmlmaWVkQ29ubmVjdGlvbkRpcmVjdGlvbiA9IENvbm5lY3Rpb25EaXJlY3Rpb247XG5leHBvcnQgdHlwZSBVbmlmaWVkQ29ubmVjdGlvblN0YXR1cyA9IENvbm5lY3Rpb25TdGF0dXM7XG5leHBvcnQgdHlwZSBVbmlmaWVkQ29ubmVjdGlvbkluZm8gPSBDb25uZWN0aW9uSW5mbzxUcmFuc3BvcnRUeXBlPjtcbmV4cG9ydCB0eXBlIFVuaWZpZWRDb25uZWN0aW9uRXZlbnQgPSBDb25uZWN0aW9uRXZlbnQ8VHJhbnNwb3J0VHlwZT47XG5leHBvcnQgdHlwZSBVbmlmaWVkUXVlcnlDb25uZWN0aW9uc09wdGlvbnMgPSBRdWVyeUNvbm5lY3Rpb25zT3B0aW9uczxUcmFuc3BvcnRUeXBlPjtcblxuLyoqIEV4cG9zZWQgbW9kdWxlIGVudHJ5ICovXG5pbnRlcmZhY2UgRXhwb3NlZEVudHJ5IHtcbiAgICBuYW1lOiBzdHJpbmc7XG4gICAgb2JqOiBhbnk7XG4gICAgcGF0aDogc3RyaW5nW107XG59XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFVOSUZJRUQgQ0hBTk5FTFxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIFVuaWZpZWRDaGFubmVsIC0gU2luZ2xlIGVudHJ5IHBvaW50IGZvciBhbGwgY2hhbm5lbCBjb21tdW5pY2F0aW9uXG4gKlxuICogQ29tYmluZXM6XG4gKiAtIFJlcXVlc3RvciBmdW5jdGlvbmFsaXR5IChpbnZva2UgcmVtb3RlIG1ldGhvZHMpXG4gKiAtIFJlc3BvbmRlciBmdW5jdGlvbmFsaXR5IChoYW5kbGUgaW5jb21pbmcgcmVxdWVzdHMpXG4gKiAtIFByb3h5IGNyZWF0aW9uICh0cmFuc3BhcmVudCByZW1vdGUgYWNjZXNzKVxuICogLSBPYnNlcnZhYmxlIG1lc3NhZ2luZyAoc3Vic2NyaWJlL25leHQgcGF0dGVybilcbiAqIC0gTXVsdGktdHJhbnNwb3J0IHN1cHBvcnQgKFdvcmtlciwgUG9ydCwgQnJvYWRjYXN0LCBXZWJTb2NrZXQsIENocm9tZSlcbiAqL1xuZXhwb3J0IGNsYXNzIFVuaWZpZWRDaGFubmVsIHtcbiAgICBwcml2YXRlIF9uYW1lOiBzdHJpbmc7XG4gICAgcHJpdmF0ZSBfY29udGV4dFR5cGU6IENvbnRleHRUeXBlO1xuICAgIHByaXZhdGUgX2NvbmZpZzogUmVxdWlyZWQ8VW5pZmllZENoYW5uZWxDb25maWc+O1xuXG4gICAgLy8gVHJhbnNwb3J0IG1hbmFnZW1lbnRcbiAgICBwcml2YXRlIF90cmFuc3BvcnRzID0gbmV3IE1hcDxzdHJpbmcsIFRyYW5zcG9ydEJpbmRpbmc+KCk7XG4gICAgcHJpdmF0ZSBfZGVmYXVsdFRyYW5zcG9ydDogVHJhbnNwb3J0QmluZGluZyB8IG51bGwgPSBudWxsO1xuICAgIHByaXZhdGUgX2Nvbm5lY3Rpb25FdmVudHMgPSBuZXcgQ2hhbm5lbFN1YmplY3Q8VW5pZmllZENvbm5lY3Rpb25FdmVudD4oeyBidWZmZXJTaXplOiAyMDAgfSk7XG4gICAgcHJpdmF0ZSBfY29ubmVjdGlvblJlZ2lzdHJ5ID0gbmV3IENvbm5lY3Rpb25SZWdpc3RyeTxUcmFuc3BvcnRUeXBlPihcbiAgICAgICAgKCkgPT4gVVVJRHY0KCksXG4gICAgICAgIChldmVudCkgPT4gdGhpcy5fY29ubmVjdGlvbkV2ZW50cy5uZXh0KGV2ZW50KVxuICAgICk7XG5cbiAgICAvLyBSZXF1ZXN0L1Jlc3BvbnNlIHRyYWNraW5nXG4gICAgLy8gQHRzLWlnbm9yZVxuICAgIHByaXZhdGUgX3BlbmRpbmcgPSBuZXcgTWFwPHN0cmluZywgUHJvbWlzZVdpdGhSZXNvbHZlcnM8YW55Pj4oKTtcbiAgICBwcml2YXRlIF9zdWJzY3JpcHRpb25zOiBTdWJzY3JpcHRpb25bXSA9IFtdO1xuXG4gICAgLy8gT2JzZXJ2YWJsZSBzdWJqZWN0c1xuICAgIHByaXZhdGUgX2luYm91bmQgPSBuZXcgQ2hhbm5lbFN1YmplY3Q8Q2hhbm5lbE1lc3NhZ2U+KHsgYnVmZmVyU2l6ZTogMTAwIH0pO1xuICAgIHByaXZhdGUgX291dGJvdW5kID0gbmV3IENoYW5uZWxTdWJqZWN0PENoYW5uZWxNZXNzYWdlPih7IGJ1ZmZlclNpemU6IDEwMCB9KTtcbiAgICBwcml2YXRlIF9pbnZvY2F0aW9ucyA9IG5ldyBDaGFubmVsU3ViamVjdDxJbmNvbWluZ0ludm9jYXRpb24+KHsgYnVmZmVyU2l6ZTogMTAwIH0pO1xuICAgIHByaXZhdGUgX3Jlc3BvbnNlcyA9IG5ldyBDaGFubmVsU3ViamVjdDxJbnZvY2F0aW9uUmVzcG9uc2U+KHsgYnVmZmVyU2l6ZTogMTAwIH0pO1xuXG4gICAgLy8gRXhwb3NlZCBvYmplY3RzXG4gICAgcHJpdmF0ZSBfZXhwb3NlZCA9IG5ldyBNYXA8c3RyaW5nLCBFeHBvc2VkRW50cnk+KCk7XG5cbiAgICAvLyBQcm94eSBjYWNoZVxuICAgIHByaXZhdGUgX3Byb3h5Q2FjaGUgPSBuZXcgV2Vha01hcDxvYmplY3QsIGFueT4oKTtcblxuICAgIHB1YmxpYyBfX2dldFByaXZhdGUoa2V5OiBzdHJpbmcpOiBhbnkge1xuICAgICAgICByZXR1cm4gdGhpc1trZXldO1xuICAgIH1cbiAgICBcbiAgICBwdWJsaWMgX19zZXRQcml2YXRlKGtleTogc3RyaW5nLCB2YWx1ZTogYW55KTogdm9pZCB7XG4gICAgICAgIHRoaXNba2V5XSA9IHZhbHVlO1xuICAgIH1cblxuICAgIGNvbnN0cnVjdG9yKGNvbmZpZzogVW5pZmllZENoYW5uZWxDb25maWcgfCBzdHJpbmcpIHtcbiAgICAgICAgY29uc3QgY2ZnID0gdHlwZW9mIGNvbmZpZyA9PT0gXCJzdHJpbmdcIiA/IHsgbmFtZTogY29uZmlnIH0gOiBjb25maWc7XG5cbiAgICAgICAgdGhpcy5fbmFtZSA9IGNmZy5uYW1lO1xuICAgICAgICB0aGlzLl9jb250ZXh0VHlwZSA9IGNmZy5hdXRvRGV0ZWN0ICE9PSBmYWxzZSA/IGRldGVjdENvbnRleHRUeXBlKCkgOiBcInVua25vd25cIjtcbiAgICAgICAgdGhpcy5fY29uZmlnID0ge1xuICAgICAgICAgICAgbmFtZTogY2ZnLm5hbWUsXG4gICAgICAgICAgICBhdXRvRGV0ZWN0OiBjZmcuYXV0b0RldGVjdCA/PyB0cnVlLFxuICAgICAgICAgICAgdGltZW91dDogY2ZnLnRpbWVvdXQgPz8gMzAwMDAsXG4gICAgICAgICAgICByZWZsZWN0OiBjZmcucmVmbGVjdCA/PyBEZWZhdWx0UmVmbGVjdCxcbiAgICAgICAgICAgIGJ1ZmZlclNpemU6IGNmZy5idWZmZXJTaXplID8/IDEwMCxcbiAgICAgICAgICAgIGF1dG9MaXN0ZW46IGNmZy5hdXRvTGlzdGVuID8/IHRydWVcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBBdXRvLWxpc3RlbiBvbiBzZWxmIGlmIGluIHdvcmtlciBjb250ZXh0XG4gICAgICAgIGlmICh0aGlzLl9jb25maWcuYXV0b0xpc3RlbiAmJiB0aGlzLl9pc1dvcmtlckNvbnRleHQoKSkge1xuICAgICAgICAgICAgdGhpcy5saXN0ZW4oc2VsZik7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAvLyBUUkFOU1BPUlQgQ09OTkVDVElPTlxuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4gICAgLyoqXG4gICAgICogQ29ubmVjdCB0byBhIHRyYW5zcG9ydCBmb3Igc2VuZGluZyByZXF1ZXN0c1xuICAgICAqXG4gICAgICogQHBhcmFtIHRhcmdldCAtIFdvcmtlciwgTWVzc2FnZVBvcnQsIEJyb2FkY2FzdENoYW5uZWwsIFdlYlNvY2tldCwgb3Igc3RyaW5nIGlkZW50aWZpZXJcbiAgICAgKiBAcGFyYW0gb3B0aW9ucyAtIENvbm5lY3Rpb24gb3B0aW9uc1xuICAgICAqL1xuICAgIGNvbm5lY3QoXG4gICAgICAgIHRhcmdldDogVHJhbnNwb3J0QmluZGluZzxOYXRpdmVDaGFubmVsVHJhbnNwb3J0PixcbiAgICAgICAgb3B0aW9uczogQ29ubmVjdE9wdGlvbnMgPSB7fVxuICAgICk6IHRoaXMge1xuICAgICAgICBjb25zdCB0cmFuc3BvcnRUeXBlID0gZGV0ZWN0VHJhbnNwb3J0VHlwZSh0YXJnZXQpO1xuICAgICAgICBjb25zdCB0YXJnZXRDaGFubmVsID0gb3B0aW9ucy50YXJnZXRDaGFubmVsID8/IHRoaXMuX2luZmVyVGFyZ2V0Q2hhbm5lbCh0YXJnZXQsIHRyYW5zcG9ydFR5cGUpO1xuXG4gICAgICAgIGNvbnN0IGJpbmRpbmcgPSB0aGlzLl9jcmVhdGVUcmFuc3BvcnRCaW5kaW5nKHRhcmdldCwgdHJhbnNwb3J0VHlwZSwgdGFyZ2V0Q2hhbm5lbCwgb3B0aW9ucyk7XG5cbiAgICAgICAgdGhpcy5fdHJhbnNwb3J0cy5zZXQodGFyZ2V0Q2hhbm5lbCwgYmluZGluZyk7XG4gICAgICAgIGlmICghdGhpcy5fZGVmYXVsdFRyYW5zcG9ydCkge1xuICAgICAgICAgICAgdGhpcy5fZGVmYXVsdFRyYW5zcG9ydCA9IGJpbmRpbmc7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgY29ubmVjdGlvbiA9IHRoaXMuX3JlZ2lzdGVyQ29ubmVjdGlvbih7XG4gICAgICAgICAgICBsb2NhbENoYW5uZWw6IHRoaXMuX25hbWUsXG4gICAgICAgICAgICByZW1vdGVDaGFubmVsOiB0YXJnZXRDaGFubmVsLFxuICAgICAgICAgICAgc2VuZGVyOiB0aGlzLl9uYW1lLFxuICAgICAgICAgICAgdHJhbnNwb3J0VHlwZSxcbiAgICAgICAgICAgIGRpcmVjdGlvbjogXCJvdXRnb2luZ1wiLFxuICAgICAgICAgICAgbWV0YWRhdGE6IHsgcGhhc2U6IFwiY29ubmVjdFwiIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMuX2VtaXRDb25uZWN0aW9uU2lnbmFsKGJpbmRpbmcsIFwiY29ubmVjdFwiLCB7XG4gICAgICAgICAgICBjb25uZWN0aW9uSWQ6IGNvbm5lY3Rpb24uaWQsXG4gICAgICAgICAgICBmcm9tOiB0aGlzLl9uYW1lLFxuICAgICAgICAgICAgdG86IHRhcmdldENoYW5uZWxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogTGlzdGVuIG9uIGEgdHJhbnNwb3J0IGZvciBpbmNvbWluZyByZXF1ZXN0c1xuICAgICAqXG4gICAgICogQHBhcmFtIHNvdXJjZSAtIFRyYW5zcG9ydCBzb3VyY2UgdG8gbGlzdGVuIG9uXG4gICAgICogQHBhcmFtIG9wdGlvbnMgLSBDb25uZWN0aW9uIG9wdGlvbnNcbiAgICAgKi9cbiAgICBsaXN0ZW4oXG4gICAgICAgIHNvdXJjZTogV29ya2VyIHwgTWVzc2FnZVBvcnQgfCBCcm9hZGNhc3RDaGFubmVsIHwgV2ViU29ja2V0IHwgYW55LFxuICAgICAgICBvcHRpb25zOiBDb25uZWN0T3B0aW9ucyA9IHt9XG4gICAgKTogdGhpcyB7XG4gICAgICAgIGNvbnN0IHRyYW5zcG9ydFR5cGUgPSBkZXRlY3RUcmFuc3BvcnRUeXBlKHNvdXJjZSk7XG4gICAgICAgIGNvbnN0IHNvdXJjZUNoYW5uZWwgPSBvcHRpb25zLnRhcmdldENoYW5uZWwgPz8gdGhpcy5faW5mZXJUYXJnZXRDaGFubmVsKHNvdXJjZSwgdHJhbnNwb3J0VHlwZSk7XG4gICAgICAgIGNvbnN0IGhhbmRsZXIgPSAoZGF0YTogYW55KSA9PiB0aGlzLl9oYW5kbGVJbmNvbWluZyhkYXRhKTtcblxuICAgICAgICBjb25zdCBjb25uZWN0aW9uID0gdGhpcy5fcmVnaXN0ZXJDb25uZWN0aW9uKHtcbiAgICAgICAgICAgIGxvY2FsQ2hhbm5lbDogdGhpcy5fbmFtZSxcbiAgICAgICAgICAgIHJlbW90ZUNoYW5uZWw6IHNvdXJjZUNoYW5uZWwsXG4gICAgICAgICAgICBzZW5kZXI6IHNvdXJjZUNoYW5uZWwsXG4gICAgICAgICAgICB0cmFuc3BvcnRUeXBlLFxuICAgICAgICAgICAgZGlyZWN0aW9uOiBcImluY29taW5nXCIsXG4gICAgICAgICAgICBtZXRhZGF0YTogeyBwaGFzZTogXCJsaXN0ZW5cIiB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHN3aXRjaCAodHJhbnNwb3J0VHlwZSkge1xuICAgICAgICAgICAgY2FzZSBcIndvcmtlclwiOlxuICAgICAgICAgICAgY2FzZSBcIm1lc3NhZ2UtcG9ydFwiOlxuICAgICAgICAgICAgY2FzZSBcImJyb2FkY2FzdFwiOlxuICAgICAgICAgICAgICAgIGlmIChvcHRpb25zLmF1dG9TdGFydCAhPT0gZmFsc2UgJiYgc291cmNlLnN0YXJ0KSBzb3VyY2Uuc3RhcnQoKTtcbiAgICAgICAgICAgICAgICBzb3VyY2UuYWRkRXZlbnRMaXN0ZW5lcj8uKFwibWVzc2FnZVwiLCAoKGU6IE1lc3NhZ2VFdmVudCkgPT4gaGFuZGxlcihlLmRhdGEpKSBhcyBFdmVudExpc3RlbmVyKTtcbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgY2FzZSBcIndlYnNvY2tldFwiOlxuICAgICAgICAgICAgICAgIHNvdXJjZS5hZGRFdmVudExpc3RlbmVyPy4oXCJtZXNzYWdlXCIsICgoZTogTWVzc2FnZUV2ZW50KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHRyeSB7IGhhbmRsZXIoSlNPTi5wYXJzZShlLmRhdGEpKTsgfSBjYXRjaCB7fVxuICAgICAgICAgICAgICAgIH0pIGFzIEV2ZW50TGlzdGVuZXIpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICBjYXNlIFwiY2hyb21lLXJ1bnRpbWVcIjpcbiAgICAgICAgICAgICAgICBjaHJvbWUucnVudGltZS5vbk1lc3NhZ2U/LmFkZExpc3RlbmVyPy4oKG1zZzogYW55LCBzZW5kZXI6IGFueSwgc2VuZFJlc3BvbnNlOiBhbnkpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaGFuZGxlcihtc2cpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgY2FzZSBcImNocm9tZS10YWJzXCI6XG4gICAgICAgICAgICAgICAgY2hyb21lLnJ1bnRpbWUub25NZXNzYWdlPy5hZGRMaXN0ZW5lcj8uKChtc2c6IGFueSwgc2VuZGVyOiBhbnkpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG9wdGlvbnMudGFiSWQgIT0gbnVsbCAmJiBzZW5kZXI/LnRhYj8uaWQgIT09IG9wdGlvbnMudGFiSWQpIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgaGFuZGxlcihtc2cpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgY2FzZSBcImNocm9tZS1wb3J0XCI6XG4gICAgICAgICAgICAgICAgc291cmNlPy5vbk1lc3NhZ2U/LmFkZExpc3RlbmVyPy4oKG1zZzogYW55KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGhhbmRsZXIobXNnKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgY2FzZSBcImNocm9tZS1leHRlcm5hbFwiOlxuICAgICAgICAgICAgICAgIGNocm9tZS5ydW50aW1lLm9uTWVzc2FnZUV4dGVybmFsPy5hZGRMaXN0ZW5lcj8uKChtc2c6IGFueSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBoYW5kbGVyKG1zZyk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICBjYXNlIFwic2VsZlwiOlxuICAgICAgICAgICAgICAgIGFkZEV2ZW50TGlzdGVuZXI/LihcIm1lc3NhZ2VcIiwgKChlOiBNZXNzYWdlRXZlbnQpID0+IGhhbmRsZXIoZS5kYXRhKSkgYXMgRXZlbnRMaXN0ZW5lcik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgaWYgKG9wdGlvbnMub25NZXNzYWdlKSB7XG4gICAgICAgICAgICAgICAgICAgIG9wdGlvbnMub25NZXNzYWdlKGhhbmRsZXIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuX3NlbmRTaWduYWxUb1RhcmdldChzb3VyY2UsIHRyYW5zcG9ydFR5cGUsIHtcbiAgICAgICAgICAgIGNvbm5lY3Rpb25JZDogY29ubmVjdGlvbi5pZCxcbiAgICAgICAgICAgIGZyb206IHRoaXMuX25hbWUsXG4gICAgICAgICAgICB0bzogc291cmNlQ2hhbm5lbCxcbiAgICAgICAgICAgIHRhYklkOiBvcHRpb25zLnRhYklkLFxuICAgICAgICAgICAgZXh0ZXJuYWxJZDogb3B0aW9ucy5leHRlcm5hbElkXG4gICAgICAgIH0sIFwibm90aWZ5XCIpO1xuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENvbm5lY3QgYW5kIGxpc3RlbiBvbiB0aGUgc2FtZSB0cmFuc3BvcnQgKGJpZGlyZWN0aW9uYWwpXG4gICAgICovXG4gICAgYXR0YWNoKFxuICAgICAgICB0YXJnZXQ6IFdvcmtlciB8IE1lc3NhZ2VQb3J0IHwgQnJvYWRjYXN0Q2hhbm5lbCB8IFdlYlNvY2tldCB8IGFueSxcbiAgICAgICAgb3B0aW9uczogQ29ubmVjdE9wdGlvbnMgPSB7fVxuICAgICk6IHRoaXMge1xuICAgICAgICAvLyBjb25uZWN0KCkgYWxyZWFkeSBpbnN0YWxscyBpbmJvdW5kIGxpc3RlbmVycyBmb3IgcmVzcG9uc2UvcmVxdWVzdCBmbG93LlxuICAgICAgICAvLyBBdm9pZCBkdXBsaWNhdGUgbGlzdGVuZXJzIGFuZCBkdXBsaWNhdGUgbm90aWZ5IHN0b3JtcyBpbiBhdHRhY2ggbW9kZS5cbiAgICAgICAgcmV0dXJuIHRoaXMuY29ubmVjdCh0YXJnZXQsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIC8vIEVYUE9TRSAvIElNUE9SVFxuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4gICAgLyoqXG4gICAgICogRXhwb3NlIGFuIG9iamVjdCBmb3IgcmVtb3RlIGludm9jYXRpb25cbiAgICAgKlxuICAgICAqIEBwYXJhbSBuYW1lIC0gUGF0aCBuYW1lIGZvciB0aGUgZXhwb3NlZCBvYmplY3RcbiAgICAgKiBAcGFyYW0gb2JqIC0gT2JqZWN0IHRvIGV4cG9zZVxuICAgICAqL1xuICAgIGV4cG9zZShuYW1lOiBzdHJpbmcsIG9iajogYW55KTogdGhpcyB7XG4gICAgICAgIGNvbnN0IHBhdGggPSBbbmFtZV07XG4gICAgICAgIHdyaXRlQnlQYXRoKHBhdGgsIG9iaik7XG4gICAgICAgIHRoaXMuX2V4cG9zZWQuc2V0KG5hbWUsIHsgbmFtZSwgb2JqLCBwYXRoIH0pO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBFeHBvc2UgbXVsdGlwbGUgb2JqZWN0cyBhdCBvbmNlXG4gICAgICovXG4gICAgZXhwb3NlQWxsKGVudHJpZXM6IFJlY29yZDxzdHJpbmcsIGFueT4pOiB0aGlzIHtcbiAgICAgICAgZm9yIChjb25zdCBbbmFtZSwgb2JqXSBvZiBPYmplY3QuZW50cmllcyhlbnRyaWVzKSkge1xuICAgICAgICAgICAgdGhpcy5leHBvc2UobmFtZSwgb2JqKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBJbXBvcnQgYSBtb2R1bGUgZnJvbSBhIHJlbW90ZSBjaGFubmVsXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdXJsIC0gTW9kdWxlIFVSTCB0byBpbXBvcnRcbiAgICAgKiBAcGFyYW0gdGFyZ2V0Q2hhbm5lbCAtIFRhcmdldCBjaGFubmVsIChkZWZhdWx0cyB0byBmaXJzdCBjb25uZWN0ZWQpXG4gICAgICovXG4gICAgYXN5bmMgaW1wb3J0PFQgPSBhbnk+KHVybDogc3RyaW5nLCB0YXJnZXRDaGFubmVsPzogc3RyaW5nKTogUHJvbWlzZTxUPiB7XG4gICAgICAgIHJldHVybiB0aGlzLmludm9rZShcbiAgICAgICAgICAgIHRhcmdldENoYW5uZWwgPz8gdGhpcy5fZ2V0RGVmYXVsdFRhcmdldCgpLFxuICAgICAgICAgICAgV1JlZmxlY3RBY3Rpb24uSU1QT1JULFxuICAgICAgICAgICAgW10sXG4gICAgICAgICAgICBbdXJsXVxuICAgICAgICApO1xuICAgIH1cblxuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIC8vIElOVk9LRSAvIFJFUVVFU1RcbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuICAgIC8qKlxuICAgICAqIEludm9rZSBhIG1ldGhvZCBvbiBhIHJlbW90ZSBvYmplY3RcbiAgICAgKlxuICAgICAqIEBwYXJhbSB0YXJnZXRDaGFubmVsIC0gVGFyZ2V0IGNoYW5uZWwgbmFtZVxuICAgICAqIEBwYXJhbSBhY3Rpb24gLSBSZWZsZWN0IGFjdGlvblxuICAgICAqIEBwYXJhbSBwYXRoIC0gT2JqZWN0IHBhdGhcbiAgICAgKiBAcGFyYW0gYXJncyAtIEFyZ3VtZW50c1xuICAgICAqL1xuICAgIGludm9rZTxUID0gYW55PihcbiAgICAgICAgdGFyZ2V0Q2hhbm5lbDogc3RyaW5nLFxuICAgICAgICBhY3Rpb246IFdSZWZsZWN0QWN0aW9uLFxuICAgICAgICBwYXRoOiBzdHJpbmdbXSxcbiAgICAgICAgYXJnczogYW55W10gPSBbXVxuICAgICk6IFByb21pc2U8VD4ge1xuICAgICAgICBjb25zdCBpZCA9IFVVSUR2NCgpO1xuICAgICAgICAvLyBAdHMtaWdub3JlXG4gICAgICAgIGNvbnN0IHJlc29sdmVycyA9IFByb21pc2Uud2l0aFJlc29sdmVyczxUPigpO1xuICAgICAgICB0aGlzLl9wZW5kaW5nLnNldChpZCwgcmVzb2x2ZXJzKTtcblxuICAgICAgICAvLyBTZXR1cCB0aW1lb3V0XG4gICAgICAgIGNvbnN0IHRpbWVvdXQgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgIGlmICh0aGlzLl9wZW5kaW5nLmhhcyhpZCkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9wZW5kaW5nLmRlbGV0ZShpZCk7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZXJzLnJlamVjdChuZXcgRXJyb3IoYFJlcXVlc3QgdGltZW91dDogJHthY3Rpb259IG9uICR7cGF0aC5qb2luKFwiLlwiKX1gKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIHRoaXMuX2NvbmZpZy50aW1lb3V0KTtcblxuICAgICAgICAvLyBCdWlsZCBhbmQgc2VuZCBtZXNzYWdlXG4gICAgICAgIGNvbnN0IG1lc3NhZ2U6IENoYW5uZWxNZXNzYWdlID0ge1xuICAgICAgICAgICAgaWQsXG4gICAgICAgICAgICBjaGFubmVsOiB0YXJnZXRDaGFubmVsLFxuICAgICAgICAgICAgc2VuZGVyOiB0aGlzLl9uYW1lLFxuICAgICAgICAgICAgdHlwZTogXCJyZXF1ZXN0XCIsXG4gICAgICAgICAgICBwYXlsb2FkOiB7XG4gICAgICAgICAgICAgICAgY2hhbm5lbDogdGFyZ2V0Q2hhbm5lbCxcbiAgICAgICAgICAgICAgICBzZW5kZXI6IHRoaXMuX25hbWUsXG4gICAgICAgICAgICAgICAgYWN0aW9uLFxuICAgICAgICAgICAgICAgIHBhdGgsXG4gICAgICAgICAgICAgICAgYXJnc1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHRpbWVzdGFtcDogRGF0ZS5ub3coKVxuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMuX3NlbmQodGFyZ2V0Q2hhbm5lbCwgbWVzc2FnZSk7XG4gICAgICAgIHRoaXMuX291dGJvdW5kLm5leHQobWVzc2FnZSk7XG5cbiAgICAgICAgcmV0dXJuIHJlc29sdmVycy5wcm9taXNlLmZpbmFsbHkoKCkgPT4gY2xlYXJUaW1lb3V0KHRpbWVvdXQpKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgcHJvcGVydHkgZnJvbSByZW1vdGUgb2JqZWN0XG4gICAgICovXG4gICAgZ2V0PFQgPSBhbnk+KHRhcmdldENoYW5uZWw6IHN0cmluZywgcGF0aDogc3RyaW5nW10sIHByb3A6IHN0cmluZyk6IFByb21pc2U8VD4ge1xuICAgICAgICByZXR1cm4gdGhpcy5pbnZva2UodGFyZ2V0Q2hhbm5lbCwgV1JlZmxlY3RBY3Rpb24uR0VULCBwYXRoLCBbcHJvcF0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFNldCBwcm9wZXJ0eSBvbiByZW1vdGUgb2JqZWN0XG4gICAgICovXG4gICAgc2V0KHRhcmdldENoYW5uZWw6IHN0cmluZywgcGF0aDogc3RyaW5nW10sIHByb3A6IHN0cmluZywgdmFsdWU6IGFueSk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICAgICAgICByZXR1cm4gdGhpcy5pbnZva2UodGFyZ2V0Q2hhbm5lbCwgV1JlZmxlY3RBY3Rpb24uU0VULCBwYXRoLCBbcHJvcCwgdmFsdWVdKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDYWxsIG1ldGhvZCBvbiByZW1vdGUgb2JqZWN0XG4gICAgICovXG4gICAgY2FsbDxUID0gYW55Pih0YXJnZXRDaGFubmVsOiBzdHJpbmcsIHBhdGg6IHN0cmluZ1tdLCBhcmdzOiBhbnlbXSA9IFtdKTogUHJvbWlzZTxUPiB7XG4gICAgICAgIHJldHVybiB0aGlzLmludm9rZSh0YXJnZXRDaGFubmVsLCBXUmVmbGVjdEFjdGlvbi5BUFBMWSwgcGF0aCwgW2FyZ3NdKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDb25zdHJ1Y3QgbmV3IGluc3RhbmNlIG9uIHJlbW90ZVxuICAgICAqL1xuICAgIGNvbnN0cnVjdDxUID0gYW55Pih0YXJnZXRDaGFubmVsOiBzdHJpbmcsIHBhdGg6IHN0cmluZ1tdLCBhcmdzOiBhbnlbXSA9IFtdKTogUHJvbWlzZTxUPiB7XG4gICAgICAgIHJldHVybiB0aGlzLmludm9rZSh0YXJnZXRDaGFubmVsLCBXUmVmbGVjdEFjdGlvbi5DT05TVFJVQ1QsIHBhdGgsIFthcmdzXSk7XG4gICAgfVxuXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgLy8gUFJPWFkgQ1JFQVRJT05cbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuICAgIC8qKlxuICAgICAqIENyZWF0ZSBhIHRyYW5zcGFyZW50IHByb3h5IHRvIGEgcmVtb3RlIGNoYW5uZWxcbiAgICAgKlxuICAgICAqIEFsbCBvcGVyYXRpb25zIG9uIHRoZSBwcm94eSBhcmUgZm9yd2FyZGVkIHRvIHRoZSByZW1vdGUuXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdGFyZ2V0Q2hhbm5lbCAtIFRhcmdldCBjaGFubmVsIG5hbWVcbiAgICAgKiBAcGFyYW0gYmFzZVBhdGggLSBCYXNlIHBhdGggZm9yIHRoZSBwcm94eVxuICAgICAqL1xuICAgIHByb3h5PFQgPSBhbnk+KHRhcmdldENoYW5uZWw/OiBzdHJpbmcsIGJhc2VQYXRoOiBzdHJpbmdbXSA9IFtdKTogVCB7XG4gICAgICAgIGNvbnN0IHRhcmdldCA9IHRhcmdldENoYW5uZWwgPz8gdGhpcy5fZ2V0RGVmYXVsdFRhcmdldCgpO1xuICAgICAgICByZXR1cm4gdGhpcy5fY3JlYXRlUHJveHkodGFyZ2V0LCBiYXNlUGF0aCkgYXMgVDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGUgcHJveHkgZm9yIGEgc3BlY2lmaWMgZXhwb3NlZCBtb2R1bGUgb24gcmVtb3RlXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbW9kdWxlTmFtZSAtIE5hbWUgb2YgdGhlIGV4cG9zZWQgbW9kdWxlXG4gICAgICogQHBhcmFtIHRhcmdldENoYW5uZWwgLSBUYXJnZXQgY2hhbm5lbFxuICAgICAqL1xuICAgIHJlbW90ZTxUID0gYW55Pihtb2R1bGVOYW1lOiBzdHJpbmcsIHRhcmdldENoYW5uZWw/OiBzdHJpbmcpOiBUIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucHJveHk8VD4odGFyZ2V0Q2hhbm5lbCwgW21vZHVsZU5hbWVdKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBXcmFwIGEgZGVzY3JpcHRvciBhcyBhIHByb3h5XG4gICAgICovXG4gICAgd3JhcERlc2NyaXB0b3IoZGVzY3JpcHRvcjogV1JlZmxlY3REZXNjcmlwdG9yLCB0YXJnZXRDaGFubmVsPzogc3RyaW5nKTogYW55IHtcbiAgICAgICAgY29uc3QgaW52b2tlcjogUHJveHlJbnZva2VyID0gKGFjdGlvbiwgcGF0aCwgYXJncykgPT4ge1xuICAgICAgICAgICAgY29uc3QgY2hhbm5lbCA9IHRhcmdldENoYW5uZWwgPz8gZGVzY3JpcHRvcj8uY2hhbm5lbCA/PyB0aGlzLl9nZXREZWZhdWx0VGFyZ2V0KCk7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5pbnZva2UoY2hhbm5lbCwgYWN0aW9uIGFzIFdSZWZsZWN0QWN0aW9uLCBwYXRoLCBhcmdzKTtcbiAgICAgICAgfTtcblxuICAgICAgICByZXR1cm4gd3JhcFByb3h5RGVzY3JpcHRvcihcbiAgICAgICAgICAgIGRlc2NyaXB0b3IsXG4gICAgICAgICAgICBpbnZva2VyLFxuICAgICAgICAgICAgdGFyZ2V0Q2hhbm5lbCA/PyBkZXNjcmlwdG9yPy5jaGFubmVsID8/IHRoaXMuX2dldERlZmF1bHRUYXJnZXQoKVxuICAgICAgICApO1xuICAgIH1cblxuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIC8vIE9CU0VSVkFCTEUgQVBJXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbiAgICAvKipcbiAgICAgKiBTdWJzY3JpYmUgdG8gaW5jb21pbmcgbWVzc2FnZXNcbiAgICAgKi9cbiAgICBzdWJzY3JpYmUoaGFuZGxlcjogKG1zZzogQ2hhbm5lbE1lc3NhZ2UpID0+IHZvaWQpOiBTdWJzY3JpcHRpb24ge1xuICAgICAgICByZXR1cm4gdGhpcy5faW5ib3VuZC5zdWJzY3JpYmUoaGFuZGxlcik7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogU2VuZCBhIG1lc3NhZ2UgKGZpcmUtYW5kLWZvcmdldClcbiAgICAgKi9cbiAgICBuZXh0KG1lc3NhZ2U6IENoYW5uZWxNZXNzYWdlKTogdm9pZCB7XG4gICAgICAgIHRoaXMuX3NlbmQobWVzc2FnZS5jaGFubmVsLCBtZXNzYWdlKTtcbiAgICAgICAgdGhpcy5fb3V0Ym91bmQubmV4dChtZXNzYWdlKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBFbWl0IGFuIGV2ZW50IHRvIGEgY2hhbm5lbFxuICAgICAqL1xuICAgIGVtaXQodGFyZ2V0Q2hhbm5lbDogc3RyaW5nLCBldmVudFR5cGU6IHN0cmluZywgZGF0YTogYW55KTogdm9pZCB7XG4gICAgICAgIGNvbnN0IG1lc3NhZ2U6IENoYW5uZWxNZXNzYWdlID0ge1xuICAgICAgICAgICAgaWQ6IFVVSUR2NCgpLFxuICAgICAgICAgICAgY2hhbm5lbDogdGFyZ2V0Q2hhbm5lbCxcbiAgICAgICAgICAgIHNlbmRlcjogdGhpcy5fbmFtZSxcbiAgICAgICAgICAgIHR5cGU6IFwiZXZlbnRcIixcbiAgICAgICAgICAgIHBheWxvYWQ6IHsgdHlwZTogZXZlbnRUeXBlLCBkYXRhIH0sXG4gICAgICAgICAgICB0aW1lc3RhbXA6IERhdGUubm93KClcbiAgICAgICAgfTtcbiAgICAgICAgdGhpcy5uZXh0KG1lc3NhZ2UpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEVtaXQgY29ubmVjdGlvbi1sZXZlbCBzaWduYWwgdG8gYSBzcGVjaWZpYyBjb25uZWN0ZWQgY2hhbm5lbC5cbiAgICAgKiBUaGlzIGlzIHRoZSBjYW5vbmljYWwgbm90aWZ5L2Nvbm5lY3QgQVBJIGZvciBmYWNhZGUgbGF5ZXJzLlxuICAgICAqL1xuICAgIG5vdGlmeShcbiAgICAgICAgdGFyZ2V0Q2hhbm5lbDogc3RyaW5nLFxuICAgICAgICBwYXlsb2FkOiBSZWNvcmQ8c3RyaW5nLCBhbnk+ID0ge30sXG4gICAgICAgIHR5cGU6IFwibm90aWZ5XCIgfCBcImNvbm5lY3RcIiA9IFwibm90aWZ5XCJcbiAgICApOiBib29sZWFuIHtcbiAgICAgICAgY29uc3QgYmluZGluZyA9IHRoaXMuX3RyYW5zcG9ydHMuZ2V0KHRhcmdldENoYW5uZWwpO1xuICAgICAgICBpZiAoIWJpbmRpbmcpIHJldHVybiBmYWxzZTtcbiAgICAgICAgdGhpcy5fZW1pdENvbm5lY3Rpb25TaWduYWwoYmluZGluZywgdHlwZSwge1xuICAgICAgICAgICAgZnJvbTogdGhpcy5fbmFtZSxcbiAgICAgICAgICAgIHRvOiB0YXJnZXRDaGFubmVsLFxuICAgICAgICAgICAgLi4ucGF5bG9hZFxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgLyoqIE9ic2VydmFibGU6IEluY29taW5nIG1lc3NhZ2VzICovXG4gICAgZ2V0IG9uTWVzc2FnZSgpIHsgcmV0dXJuIHRoaXMuX2luYm91bmQ7IH1cblxuICAgIC8qKiBPYnNlcnZhYmxlOiBPdXRnb2luZyBtZXNzYWdlcyAqL1xuICAgIGdldCBvbk91dGJvdW5kKCkgeyByZXR1cm4gdGhpcy5fb3V0Ym91bmQ7IH1cblxuICAgIC8qKiBPYnNlcnZhYmxlOiBJbmNvbWluZyBpbnZvY2F0aW9ucyAqL1xuICAgIGdldCBvbkludm9jYXRpb24oKSB7IHJldHVybiB0aGlzLl9pbnZvY2F0aW9uczsgfVxuXG4gICAgLyoqIE9ic2VydmFibGU6IE91dGdvaW5nIHJlc3BvbnNlcyAqL1xuICAgIGdldCBvblJlc3BvbnNlKCkgeyByZXR1cm4gdGhpcy5fcmVzcG9uc2VzOyB9XG5cbiAgICAvKiogT2JzZXJ2YWJsZTogQ29ubmVjdGlvbiBldmVudHMgKGNvbm5lY3RlZC9ub3RpZmllZC9kaXNjb25uZWN0ZWQpICovXG4gICAgZ2V0IG9uQ29ubmVjdGlvbigpIHsgcmV0dXJuIHRoaXMuX2Nvbm5lY3Rpb25FdmVudHM7IH1cblxuICAgIHN1YnNjcmliZUNvbm5lY3Rpb25zKGhhbmRsZXI6IChldmVudDogVW5pZmllZENvbm5lY3Rpb25FdmVudCkgPT4gdm9pZCk6IFN1YnNjcmlwdGlvbiB7XG4gICAgICAgIHJldHVybiB0aGlzLl9jb25uZWN0aW9uRXZlbnRzLnN1YnNjcmliZShoYW5kbGVyKTtcbiAgICB9XG5cbiAgICBxdWVyeUNvbm5lY3Rpb25zKHF1ZXJ5OiBVbmlmaWVkUXVlcnlDb25uZWN0aW9uc09wdGlvbnMgPSB7fSk6IFVuaWZpZWRDb25uZWN0aW9uSW5mb1tdIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2Nvbm5lY3Rpb25SZWdpc3RyeS5xdWVyeShxdWVyeSk7XG4gICAgfVxuXG4gICAgbm90aWZ5Q29ubmVjdGlvbnMocGF5bG9hZDogYW55ID0ge30sIHF1ZXJ5OiBVbmlmaWVkUXVlcnlDb25uZWN0aW9uc09wdGlvbnMgPSB7fSk6IG51bWJlciB7XG4gICAgICAgIGxldCBzZW50ID0gMDtcbiAgICAgICAgY29uc3QgdGFyZ2V0cyA9IHRoaXMucXVlcnlDb25uZWN0aW9ucyh7IC4uLnF1ZXJ5LCBzdGF0dXM6IFwiYWN0aXZlXCIsIGluY2x1ZGVDbG9zZWQ6IGZhbHNlIH0pO1xuXG4gICAgICAgIGZvciAoY29uc3QgY29ubmVjdGlvbiBvZiB0YXJnZXRzKSB7XG4gICAgICAgICAgICBjb25zdCBiaW5kaW5nID0gdGhpcy5fdHJhbnNwb3J0cy5nZXQoY29ubmVjdGlvbi5yZW1vdGVDaGFubmVsKTtcbiAgICAgICAgICAgIGlmICghYmluZGluZykgY29udGludWU7XG5cbiAgICAgICAgICAgIHRoaXMuX2VtaXRDb25uZWN0aW9uU2lnbmFsKGJpbmRpbmcsIFwibm90aWZ5XCIsIHtcbiAgICAgICAgICAgICAgICBjb25uZWN0aW9uSWQ6IGNvbm5lY3Rpb24uaWQsXG4gICAgICAgICAgICAgICAgZnJvbTogdGhpcy5fbmFtZSxcbiAgICAgICAgICAgICAgICB0bzogY29ubmVjdGlvbi5yZW1vdGVDaGFubmVsLFxuICAgICAgICAgICAgICAgIC4uLnBheWxvYWRcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgc2VudCsrO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHNlbnQ7XG4gICAgfVxuXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgLy8gUFJPUEVSVElFU1xuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4gICAgLyoqIENoYW5uZWwgbmFtZSAqL1xuICAgIGdldCBuYW1lKCk6IHN0cmluZyB7IHJldHVybiB0aGlzLl9uYW1lOyB9XG5cbiAgICAvKiogRGV0ZWN0ZWQgY29udGV4dCB0eXBlICovXG4gICAgZ2V0IGNvbnRleHRUeXBlKCk6IENvbnRleHRUeXBlIHsgcmV0dXJuIHRoaXMuX2NvbnRleHRUeXBlOyB9XG5cbiAgICAvKiogQ29uZmlndXJhdGlvbiAqL1xuICAgIGdldCBjb25maWcoKTogUmVhZG9ubHk8UmVxdWlyZWQ8VW5pZmllZENoYW5uZWxDb25maWc+PiB7IHJldHVybiB0aGlzLl9jb25maWc7IH1cblxuICAgIC8qKiBDb25uZWN0ZWQgdHJhbnNwb3J0IG5hbWVzICovXG4gICAgZ2V0IGNvbm5lY3RlZENoYW5uZWxzKCk6IHN0cmluZ1tdIHsgcmV0dXJuIFsuLi50aGlzLl90cmFuc3BvcnRzLmtleXMoKV07IH1cblxuICAgIC8qKiBFeHBvc2VkIG1vZHVsZSBuYW1lcyAqL1xuICAgIGdldCBleHBvc2VkTW9kdWxlcygpOiBzdHJpbmdbXSB7IHJldHVybiBbLi4udGhpcy5fZXhwb3NlZC5rZXlzKCldOyB9XG5cbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAvLyBMSUZFQ1lDTEVcbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuICAgIC8qKlxuICAgICAqIENsb3NlIGFsbCBjb25uZWN0aW9ucyBhbmQgY2xlYW51cFxuICAgICAqL1xuICAgIGNsb3NlKCk6IHZvaWQge1xuICAgICAgICB0aGlzLl9zdWJzY3JpcHRpb25zLmZvckVhY2gocyA9PiBzLnVuc3Vic2NyaWJlKCkpO1xuICAgICAgICB0aGlzLl9zdWJzY3JpcHRpb25zID0gW107XG4gICAgICAgIHRoaXMuX3BlbmRpbmcuY2xlYXIoKTtcbiAgICAgICAgdGhpcy5fbWFya0FsbENvbm5lY3Rpb25zQ2xvc2VkKCk7XG4gICAgICAgIGZvciAoY29uc3QgYmluZGluZyBvZiB0aGlzLl90cmFuc3BvcnRzLnZhbHVlcygpKSB7XG4gICAgICAgICAgICB0cnkgeyBiaW5kaW5nLmNsZWFudXA/LigpOyB9IGNhdGNoIHt9XG4gICAgICAgICAgICAvLyBSZWxlYXNlIGNvbW1vbiBjaGFubmVsLWxpa2UgdHJhbnNwb3J0cyBzbyB0aGV5IGRvIG5vdCBrZWVwIGV2ZW50IGxvb3AgYWxpdmUuXG4gICAgICAgICAgICBpZiAoYmluZGluZy50cmFuc3BvcnRUeXBlID09PSBcIm1lc3NhZ2UtcG9ydFwiIHx8IGJpbmRpbmcudHJhbnNwb3J0VHlwZSA9PT0gXCJicm9hZGNhc3RcIikge1xuICAgICAgICAgICAgICAgIHRyeSB7IChiaW5kaW5nLnRhcmdldCBhcyBNZXNzYWdlUG9ydCk/LmNsb3NlPy4oKTsgfSBjYXRjaCB7fVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRoaXMuX3RyYW5zcG9ydHMuY2xlYXIoKTtcbiAgICAgICAgdGhpcy5fZGVmYXVsdFRyYW5zcG9ydCA9IG51bGw7XG4gICAgICAgIHRoaXMuX2Nvbm5lY3Rpb25SZWdpc3RyeS5jbGVhcigpO1xuICAgICAgICB0aGlzLl9pbmJvdW5kLmNvbXBsZXRlKCk7XG4gICAgICAgIHRoaXMuX291dGJvdW5kLmNvbXBsZXRlKCk7XG4gICAgICAgIHRoaXMuX2ludm9jYXRpb25zLmNvbXBsZXRlKCk7XG4gICAgICAgIHRoaXMuX3Jlc3BvbnNlcy5jb21wbGV0ZSgpO1xuICAgICAgICB0aGlzLl9jb25uZWN0aW9uRXZlbnRzLmNvbXBsZXRlKCk7XG4gICAgfVxuXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgLy8gUFJJVkFURTogTWVzc2FnZSBIYW5kbGluZ1xuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4gICAgcHJpdmF0ZSBfaGFuZGxlSW5jb21pbmcoZGF0YTogYW55KTogdm9pZCB7XG4gICAgICAgIGlmICghZGF0YSB8fCB0eXBlb2YgZGF0YSAhPT0gXCJvYmplY3RcIikgcmV0dXJuO1xuXG4gICAgICAgIC8vIEVtaXQgdG8gaW5ib3VuZCBvYnNlcnZhYmxlXG4gICAgICAgIHRoaXMuX2luYm91bmQubmV4dChkYXRhIGFzIENoYW5uZWxNZXNzYWdlKTtcblxuICAgICAgICBzd2l0Y2ggKGRhdGEudHlwZSkge1xuICAgICAgICAgICAgY2FzZSBcInJlcXVlc3RcIjpcbiAgICAgICAgICAgICAgICBpZiAoZGF0YS5jaGFubmVsID09PSB0aGlzLl9uYW1lKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2hhbmRsZVJlcXVlc3QoZGF0YSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICBjYXNlIFwicmVzcG9uc2VcIjpcbiAgICAgICAgICAgICAgICB0aGlzLl9oYW5kbGVSZXNwb25zZShkYXRhKTtcbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgY2FzZSBcImV2ZW50XCI6XG4gICAgICAgICAgICAgICAgLy8gRXZlbnRzIGFyZSBoYW5kbGVkIHZpYSBzdWJzY3JpYmVcbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgY2FzZSBcInNpZ25hbFwiOlxuICAgICAgICAgICAgICAgIHRoaXMuX2hhbmRsZVNpZ25hbChkYXRhKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgX2hhbmRsZVJlc3BvbnNlKGRhdGE6IGFueSk6IHZvaWQge1xuICAgICAgICBjb25zdCBpZCA9IGRhdGEucmVxSWQgPz8gZGF0YS5pZDtcbiAgICAgICAgY29uc3QgcmVzb2x2ZXJzID0gdGhpcy5fcGVuZGluZy5nZXQoaWQpO1xuXG4gICAgICAgIGlmIChyZXNvbHZlcnMpIHtcbiAgICAgICAgICAgIHRoaXMuX3BlbmRpbmcuZGVsZXRlKGlkKTtcblxuICAgICAgICAgICAgaWYgKGRhdGEucGF5bG9hZD8uZXJyb3IpIHtcbiAgICAgICAgICAgICAgICByZXNvbHZlcnMucmVqZWN0KG5ldyBFcnJvcihkYXRhLnBheWxvYWQuZXJyb3IpKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gZGF0YS5wYXlsb2FkPy5yZXN1bHQ7XG4gICAgICAgICAgICAgICAgY29uc3QgZGVzY3JpcHRvciA9IGRhdGEucGF5bG9hZD8uZGVzY3JpcHRvcjtcblxuICAgICAgICAgICAgICAgIGlmIChyZXN1bHQgIT09IG51bGwgJiYgcmVzdWx0ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZXJzLnJlc29sdmUocmVzdWx0KTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGRlc2NyaXB0b3IpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZXJzLnJlc29sdmUodGhpcy53cmFwRGVzY3JpcHRvcihkZXNjcmlwdG9yLCBkYXRhLnNlbmRlcikpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmVycy5yZXNvbHZlKHVuZGVmaW5lZCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBFbWl0IHJlc3BvbnNlIGV2ZW50XG4gICAgICAgICAgICB0aGlzLl9yZXNwb25zZXMubmV4dCh7XG4gICAgICAgICAgICAgICAgaWQsXG4gICAgICAgICAgICAgICAgY2hhbm5lbDogZGF0YS5jaGFubmVsLFxuICAgICAgICAgICAgICAgIHNlbmRlcjogZGF0YS5zZW5kZXIsXG4gICAgICAgICAgICAgICAgcmVzdWx0OiBkYXRhLnBheWxvYWQ/LnJlc3VsdCxcbiAgICAgICAgICAgICAgICBkZXNjcmlwdG9yOiBkYXRhLnBheWxvYWQ/LmRlc2NyaXB0b3IsXG4gICAgICAgICAgICAgICAgdGltZXN0YW1wOiBEYXRlLm5vdygpXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgX2hhbmRsZVJlcXVlc3QoZGF0YTogYW55KTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGNvbnN0IHBheWxvYWQgPSBkYXRhLnBheWxvYWQgYXMgV1JlcTtcbiAgICAgICAgaWYgKCFwYXlsb2FkKSByZXR1cm47XG5cbiAgICAgICAgY29uc3QgeyBhY3Rpb24sIHBhdGgsIGFyZ3MsIHNlbmRlciB9ID0gcGF5bG9hZDtcbiAgICAgICAgY29uc3QgcmVxSWQgPSBkYXRhLnJlcUlkID8/IGRhdGEuaWQ7XG5cbiAgICAgICAgLy8gRW1pdCBpbnZvY2F0aW9uIGV2ZW50XG4gICAgICAgIHRoaXMuX2ludm9jYXRpb25zLm5leHQoe1xuICAgICAgICAgICAgaWQ6IHJlcUlkLFxuICAgICAgICAgICAgY2hhbm5lbDogdGhpcy5fbmFtZSxcbiAgICAgICAgICAgIHNlbmRlcixcbiAgICAgICAgICAgIGFjdGlvbixcbiAgICAgICAgICAgIHBhdGgsXG4gICAgICAgICAgICBhcmdzOiBhcmdzID8/IFtdLFxuICAgICAgICAgICAgdGltZXN0YW1wOiBEYXRlLm5vdygpLFxuICAgICAgICAgICAgY29udGV4dFR5cGU6IGRldGVjdEluY29taW5nQ29udGV4dFR5cGUoZGF0YSlcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gRXhlY3V0ZSBhY3Rpb25cbiAgICAgICAgY29uc3QgeyByZXN1bHQsIHRvVHJhbnNmZXIsIG5ld1BhdGggfSA9IGF3YWl0IHRoaXMuX2V4ZWN1dGVBY3Rpb24oYWN0aW9uLCBwYXRoLCBhcmdzID8/IFtdLCBzZW5kZXIpO1xuXG4gICAgICAgIC8vIFNlbmQgcmVzcG9uc2VcbiAgICAgICAgYXdhaXQgdGhpcy5fc2VuZFJlc3BvbnNlKHJlcUlkLCBhY3Rpb24sIHNlbmRlciwgbmV3UGF0aCwgcmVzdWx0LCB0b1RyYW5zZmVyKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIF9leGVjdXRlQWN0aW9uKFxuICAgICAgICBhY3Rpb246IHN0cmluZyxcbiAgICAgICAgcGF0aDogc3RyaW5nW10sXG4gICAgICAgIGFyZ3M6IGFueVtdLFxuICAgICAgICBzZW5kZXI6IHN0cmluZ1xuICAgICk6IFByb21pc2U8eyByZXN1bHQ6IGFueTsgdG9UcmFuc2ZlcjogYW55W107IG5ld1BhdGg6IHN0cmluZ1tdIH0+IHtcbiAgICAgICAgLy8gVXNlIHVuaWZpZWQgY29yZSBleGVjdXRlQWN0aW9uXG4gICAgICAgIGNvbnN0IHsgcmVzdWx0LCB0b1RyYW5zZmVyLCBwYXRoOiBuZXdQYXRoIH0gPSBjb3JlRXhlY3V0ZUFjdGlvbihcbiAgICAgICAgICAgIGFjdGlvbixcbiAgICAgICAgICAgIHBhdGgsXG4gICAgICAgICAgICBhcmdzLFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGNoYW5uZWw6IHRoaXMuX25hbWUsXG4gICAgICAgICAgICAgICAgc2VuZGVyLFxuICAgICAgICAgICAgICAgIHJlZmxlY3Q6IHRoaXMuX2NvbmZpZy5yZWZsZWN0XG4gICAgICAgICAgICB9XG4gICAgICAgICk7XG5cbiAgICAgICAgcmV0dXJuIHsgcmVzdWx0OiBhd2FpdCByZXN1bHQsIHRvVHJhbnNmZXIsIG5ld1BhdGggfTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIF9zZW5kUmVzcG9uc2UoXG4gICAgICAgIHJlcUlkOiBzdHJpbmcsXG4gICAgICAgIGFjdGlvbjogc3RyaW5nLFxuICAgICAgICBzZW5kZXI6IHN0cmluZyxcbiAgICAgICAgcGF0aDogc3RyaW5nW10sXG4gICAgICAgIHJhd1Jlc3VsdDogYW55LFxuICAgICAgICB0b1RyYW5zZmVyOiBhbnlbXVxuICAgICk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICAvLyBVc2UgdW5pZmllZCBjb3JlIGJ1aWxkUmVzcG9uc2VcbiAgICAgICAgY29uc3QgeyByZXNwb25zZTogY29yZVJlc3BvbnNlLCB0cmFuc2ZlciB9ID0gYXdhaXQgY29yZUJ1aWxkUmVzcG9uc2UoXG4gICAgICAgICAgICByZXFJZCwgYWN0aW9uLCB0aGlzLl9uYW1lLCBzZW5kZXIsIHBhdGgsIHJhd1Jlc3VsdCwgdG9UcmFuc2ZlclxuICAgICAgICApO1xuXG4gICAgICAgIC8vIFdyYXAgYXMgQ2hhbm5lbE1lc3NhZ2Ugd2l0aCBleHRyYSBmaWVsZHNcbiAgICAgICAgY29uc3QgcmVzcG9uc2U6IENoYW5uZWxNZXNzYWdlID0ge1xuICAgICAgICAgICAgaWQ6IHJlcUlkLFxuICAgICAgICAgICAgLi4uY29yZVJlc3BvbnNlLFxuICAgICAgICAgICAgdGltZXN0YW1wOiBEYXRlLm5vdygpLFxuICAgICAgICAgICAgdHJhbnNmZXJhYmxlOiB0cmFuc2ZlclxuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMuX3NlbmQoc2VuZGVyLCByZXNwb25zZSwgdHJhbnNmZXIpO1xuICAgIH1cblxuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIC8vIFBSSVZBVEU6IFRyYW5zcG9ydCBNYW5hZ2VtZW50XG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbiAgICBwcml2YXRlIF9oYW5kbGVTaWduYWwoZGF0YTogYW55KTogdm9pZCB7XG4gICAgICAgIGNvbnN0IHBheWxvYWQgPSBkYXRhPy5wYXlsb2FkID8/IHt9O1xuICAgICAgICBjb25zdCByZW1vdGVDaGFubmVsID0gcGF5bG9hZC5mcm9tID8/IGRhdGEuc2VuZGVyID8/IFwidW5rbm93blwiO1xuICAgICAgICBjb25zdCB0cmFuc3BvcnRUeXBlID0gZGF0YS50cmFuc3BvcnRUeXBlID8/IHRoaXMuX3RyYW5zcG9ydHMuZ2V0KGRhdGEuY2hhbm5lbCk/LnRyYW5zcG9ydFR5cGUgPz8gXCJpbnRlcm5hbFwiO1xuXG4gICAgICAgIGNvbnN0IGNvbm5lY3Rpb24gPSB0aGlzLl9yZWdpc3RlckNvbm5lY3Rpb24oe1xuICAgICAgICAgICAgbG9jYWxDaGFubmVsOiB0aGlzLl9uYW1lLFxuICAgICAgICAgICAgcmVtb3RlQ2hhbm5lbCxcbiAgICAgICAgICAgIHNlbmRlcjogZGF0YS5zZW5kZXIgPz8gcmVtb3RlQ2hhbm5lbCxcbiAgICAgICAgICAgIHRyYW5zcG9ydFR5cGUsXG4gICAgICAgICAgICBkaXJlY3Rpb246IFwiaW5jb21pbmdcIlxuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLl9tYXJrQ29ubmVjdGlvbk5vdGlmaWVkKGNvbm5lY3Rpb24sIHBheWxvYWQpO1xuICAgIH1cblxuICAgIHByaXZhdGUgX3JlZ2lzdGVyQ29ubmVjdGlvbihwYXJhbXM6IHtcbiAgICAgICAgbG9jYWxDaGFubmVsOiBzdHJpbmc7XG4gICAgICAgIHJlbW90ZUNoYW5uZWw6IHN0cmluZztcbiAgICAgICAgc2VuZGVyOiBzdHJpbmc7XG4gICAgICAgIHRyYW5zcG9ydFR5cGU6IFRyYW5zcG9ydFR5cGU7XG4gICAgICAgIGRpcmVjdGlvbjogVW5pZmllZENvbm5lY3Rpb25EaXJlY3Rpb247XG4gICAgICAgIG1ldGFkYXRhPzogUmVjb3JkPHN0cmluZywgYW55PjtcbiAgICB9KTogVW5pZmllZENvbm5lY3Rpb25JbmZvIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2Nvbm5lY3Rpb25SZWdpc3RyeS5yZWdpc3RlcihwYXJhbXMpO1xuICAgIH1cblxuICAgIHByaXZhdGUgX21hcmtDb25uZWN0aW9uTm90aWZpZWQoY29ubmVjdGlvbjogVW5pZmllZENvbm5lY3Rpb25JbmZvLCBwYXlsb2FkPzogYW55KTogdm9pZCB7XG4gICAgICAgIHRoaXMuX2Nvbm5lY3Rpb25SZWdpc3RyeS5tYXJrTm90aWZpZWQoY29ubmVjdGlvbiwgcGF5bG9hZCk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBfZW1pdENvbm5lY3Rpb25TaWduYWwoXG4gICAgICAgIGJpbmRpbmc6IFRyYW5zcG9ydEJpbmRpbmcsXG4gICAgICAgIHNpZ25hbFR5cGU6IFwiY29ubmVjdFwiIHwgXCJub3RpZnlcIixcbiAgICAgICAgcGF5bG9hZDogUmVjb3JkPHN0cmluZywgYW55PiA9IHt9XG4gICAgKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IG1lc3NhZ2UgPSB7XG4gICAgICAgICAgICBpZDogVVVJRHY0KCksXG4gICAgICAgICAgICB0eXBlOiBcInNpZ25hbFwiLFxuICAgICAgICAgICAgY2hhbm5lbDogYmluZGluZy50YXJnZXRDaGFubmVsLFxuICAgICAgICAgICAgc2VuZGVyOiB0aGlzLl9uYW1lLFxuICAgICAgICAgICAgdHJhbnNwb3J0VHlwZTogYmluZGluZy50cmFuc3BvcnRUeXBlLFxuICAgICAgICAgICAgcGF5bG9hZDoge1xuICAgICAgICAgICAgICAgIHR5cGU6IHNpZ25hbFR5cGUsXG4gICAgICAgICAgICAgICAgZnJvbTogdGhpcy5fbmFtZSxcbiAgICAgICAgICAgICAgICB0bzogYmluZGluZy50YXJnZXRDaGFubmVsLFxuICAgICAgICAgICAgICAgIC4uLnBheWxvYWRcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB0aW1lc3RhbXA6IERhdGUubm93KClcbiAgICAgICAgfTtcblxuICAgICAgICAoYmluZGluZz8uc2VuZGVyID8/IGJpbmRpbmc/LnBvc3RNZXNzYWdlKT8uY2FsbChiaW5kaW5nLCBtZXNzYWdlKTtcblxuICAgICAgICBjb25zdCBjb25uZWN0aW9uID0gdGhpcy5fcmVnaXN0ZXJDb25uZWN0aW9uKHtcbiAgICAgICAgICAgIGxvY2FsQ2hhbm5lbDogdGhpcy5fbmFtZSxcbiAgICAgICAgICAgIHJlbW90ZUNoYW5uZWw6IGJpbmRpbmcudGFyZ2V0Q2hhbm5lbCxcbiAgICAgICAgICAgIHNlbmRlcjogdGhpcy5fbmFtZSxcbiAgICAgICAgICAgIHRyYW5zcG9ydFR5cGU6IGJpbmRpbmcudHJhbnNwb3J0VHlwZSxcbiAgICAgICAgICAgIGRpcmVjdGlvbjogXCJvdXRnb2luZ1wiXG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLl9tYXJrQ29ubmVjdGlvbk5vdGlmaWVkKGNvbm5lY3Rpb24sIG1lc3NhZ2UucGF5bG9hZCk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBfc2VuZFNpZ25hbFRvVGFyZ2V0PFRUcmFuc3BvcnQgPSBOYXRpdmVDaGFubmVsVHJhbnNwb3J0PihcbiAgICAgICAgdGFyZ2V0OiBUVHJhbnNwb3J0LFxuICAgICAgICB0cmFuc3BvcnRUeXBlOiBUcmFuc3BvcnRUeXBlLFxuICAgICAgICBwYXlsb2FkOiBSZWNvcmQ8c3RyaW5nLCBhbnk+LFxuICAgICAgICBzaWduYWxUeXBlOiBcImNvbm5lY3RcIiB8IFwibm90aWZ5XCJcbiAgICApOiB2b2lkIHtcbiAgICAgICAgY29uc3QgbWVzc2FnZSA9IHtcbiAgICAgICAgICAgIGlkOiBVVUlEdjQoKSxcbiAgICAgICAgICAgIHR5cGU6IFwic2lnbmFsXCIsXG4gICAgICAgICAgICBjaGFubmVsOiBwYXlsb2FkLnRvID8/IHRoaXMuX25hbWUsXG4gICAgICAgICAgICBzZW5kZXI6IHRoaXMuX25hbWUsXG4gICAgICAgICAgICB0cmFuc3BvcnRUeXBlLFxuICAgICAgICAgICAgcGF5bG9hZDoge1xuICAgICAgICAgICAgICAgIHR5cGU6IHNpZ25hbFR5cGUsXG4gICAgICAgICAgICAgICAgLi4ucGF5bG9hZFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHRpbWVzdGFtcDogRGF0ZS5ub3coKVxuICAgICAgICB9O1xuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBpZiAodHJhbnNwb3J0VHlwZSA9PT0gXCJ3ZWJzb2NrZXRcIikge1xuICAgICAgICAgICAgICAgICh0YXJnZXQgYXMgV2ViU29ja2V0KT8uc2VuZD8uKEpTT04uc3RyaW5naWZ5KG1lc3NhZ2UpKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodHJhbnNwb3J0VHlwZSA9PT0gXCJjaHJvbWUtcnVudGltZVwiKSB7XG4gICAgICAgICAgICAgICAgY2hyb21lLnJ1bnRpbWU/LnNlbmRNZXNzYWdlPy4obWVzc2FnZSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHRyYW5zcG9ydFR5cGUgPT09IFwiY2hyb21lLXRhYnNcIikge1xuICAgICAgICAgICAgICAgIGNvbnN0IHRhYklkID0gcGF5bG9hZC50YWJJZDtcbiAgICAgICAgICAgICAgICBpZiAodGFiSWQgIT0gbnVsbCkgY2hyb21lLnRhYnM/LnNlbmRNZXNzYWdlPy4odGFiSWQsIG1lc3NhZ2UpO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0cmFuc3BvcnRUeXBlID09PSBcImNocm9tZS1wb3J0XCIpIHtcbiAgICAgICAgICAgICAgICAodGFyZ2V0IGFzIE1lc3NhZ2VQb3J0KT8ucG9zdE1lc3NhZ2U/LihtZXNzYWdlKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodHJhbnNwb3J0VHlwZSA9PT0gXCJjaHJvbWUtZXh0ZXJuYWxcIikge1xuICAgICAgICAgICAgICAgIGlmIChwYXlsb2FkLmV4dGVybmFsSWQpIGNocm9tZS5ydW50aW1lPy5zZW5kTWVzc2FnZT8uKHBheWxvYWQuZXh0ZXJuYWxJZCwgbWVzc2FnZSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgKHRhcmdldCBhcyBNZXNzYWdlUG9ydCk/LnBvc3RNZXNzYWdlPy4obWVzc2FnZSwgeyB0cmFuc2ZlcjogW10gfSk7XG4gICAgICAgIH0gY2F0Y2gge31cbiAgICB9XG5cbiAgICBwcml2YXRlIF9tYXJrQWxsQ29ubmVjdGlvbnNDbG9zZWQoKTogdm9pZCB7XG4gICAgICAgIHRoaXMuX2Nvbm5lY3Rpb25SZWdpc3RyeS5jbG9zZUFsbCgpO1xuICAgIH1cblxuICAgIHByaXZhdGUgX2NyZWF0ZVRyYW5zcG9ydEJpbmRpbmcoXG4gICAgICAgIHRhcmdldDogYW55LFxuICAgICAgICB0cmFuc3BvcnRUeXBlOiBUcmFuc3BvcnRUeXBlLFxuICAgICAgICB0YXJnZXRDaGFubmVsOiBzdHJpbmcsXG4gICAgICAgIG9wdGlvbnM6IENvbm5lY3RPcHRpb25zXG4gICAgKTogVHJhbnNwb3J0QmluZGluZyB7XG4gICAgICAgIGxldCBzZW5kZXI6IChtc2c6IGFueSwgdHJhbnNmZXI/OiBUcmFuc2ZlcmFibGVbXSkgPT4gdm9pZDtcbiAgICAgICAgbGV0IGNsZWFudXA6ICgoKSA9PiB2b2lkKSB8IHVuZGVmaW5lZDtcblxuICAgICAgICBzd2l0Y2ggKHRyYW5zcG9ydFR5cGUpIHtcbiAgICAgICAgICAgIGNhc2UgXCJ3b3JrZXJcIjpcbiAgICAgICAgICAgIGNhc2UgXCJtZXNzYWdlLXBvcnRcIjpcbiAgICAgICAgICAgIGNhc2UgXCJicm9hZGNhc3RcIjpcbiAgICAgICAgICAgICAgICBpZiAob3B0aW9ucy5hdXRvU3RhcnQgIT09IGZhbHNlICYmIHRhcmdldC5zdGFydCkgdGFyZ2V0LnN0YXJ0KCk7XG4gICAgICAgICAgICAgICAgc2VuZGVyID0gKG1zZywgdHJhbnNmZXIpID0+IHRhcmdldC5wb3N0TWVzc2FnZShtc2csIHsgdHJhbnNmZXIgfSk7XG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBsaXN0ZW5lciA9ICgoZTogTWVzc2FnZUV2ZW50KSA9PiB0aGlzLl9oYW5kbGVJbmNvbWluZyhlLmRhdGEpKSBhcyBFdmVudExpc3RlbmVyO1xuICAgICAgICAgICAgICAgICAgICB0YXJnZXQuYWRkRXZlbnRMaXN0ZW5lcj8uKFwibWVzc2FnZVwiLCBsaXN0ZW5lcik7XG4gICAgICAgICAgICAgICAgICAgIGNsZWFudXAgPSAoKSA9PiB0YXJnZXQucmVtb3ZlRXZlbnRMaXN0ZW5lcj8uKFwibWVzc2FnZVwiLCBsaXN0ZW5lcik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICBjYXNlIFwid2Vic29ja2V0XCI6XG4gICAgICAgICAgICAgICAgc2VuZGVyID0gKG1zZykgPT4gdGFyZ2V0LnNlbmQoSlNPTi5zdHJpbmdpZnkobXNnKSk7XG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBsaXN0ZW5lciA9ICgoZTogTWVzc2FnZUV2ZW50KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0cnkgeyB0aGlzLl9oYW5kbGVJbmNvbWluZyhKU09OLnBhcnNlKGUuZGF0YSkpOyB9IGNhdGNoIHt9XG4gICAgICAgICAgICAgICAgICAgIH0pIGFzIEV2ZW50TGlzdGVuZXI7XG4gICAgICAgICAgICAgICAgICAgIHRhcmdldC5hZGRFdmVudExpc3RlbmVyPy4oXCJtZXNzYWdlXCIsIGxpc3RlbmVyKTtcbiAgICAgICAgICAgICAgICAgICAgY2xlYW51cCA9ICgpID0+IHRhcmdldC5yZW1vdmVFdmVudExpc3RlbmVyPy4oXCJtZXNzYWdlXCIsIGxpc3RlbmVyKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIGNhc2UgXCJjaHJvbWUtcnVudGltZVwiOlxuICAgICAgICAgICAgICAgIHNlbmRlciA9IChtc2cpID0+IGNocm9tZS5ydW50aW1lLnNlbmRNZXNzYWdlKG1zZyk7XG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBsaXN0ZW5lciA9IChtc2c6IGFueSkgPT4gdGhpcy5faGFuZGxlSW5jb21pbmcobXNnKTtcbiAgICAgICAgICAgICAgICAgICAgY2hyb21lLnJ1bnRpbWUub25NZXNzYWdlPy5hZGRMaXN0ZW5lcj8uKGxpc3RlbmVyKTtcbiAgICAgICAgICAgICAgICAgICAgY2xlYW51cCA9ICgpID0+IGNocm9tZS5ydW50aW1lLm9uTWVzc2FnZT8ucmVtb3ZlTGlzdGVuZXI/LihsaXN0ZW5lcik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICBjYXNlIFwiY2hyb21lLXRhYnNcIjpcbiAgICAgICAgICAgICAgICBzZW5kZXIgPSAobXNnKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChvcHRpb25zLnRhYklkICE9IG51bGwpIGNocm9tZS50YWJzPy5zZW5kTWVzc2FnZT8uKG9wdGlvbnMudGFiSWQsIG1zZyk7XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGxpc3RlbmVyID0gKG1zZzogYW55LCBzZW5kZXJNZXRhOiBhbnkpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChvcHRpb25zLnRhYklkICE9IG51bGwgJiYgc2VuZGVyTWV0YT8udGFiPy5pZCAhPT0gb3B0aW9ucy50YWJJZCkgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5faGFuZGxlSW5jb21pbmcobXNnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICBjaHJvbWUucnVudGltZS5vbk1lc3NhZ2U/LmFkZExpc3RlbmVyPy4obGlzdGVuZXIpO1xuICAgICAgICAgICAgICAgICAgICBjbGVhbnVwID0gKCkgPT4gY2hyb21lLnJ1bnRpbWUub25NZXNzYWdlPy5yZW1vdmVMaXN0ZW5lcj8uKGxpc3RlbmVyKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIGNhc2UgXCJjaHJvbWUtcG9ydFwiOlxuICAgICAgICAgICAgICAgIGlmICh0YXJnZXQ/LnBvc3RNZXNzYWdlICYmIHRhcmdldD8ub25NZXNzYWdlPy5hZGRMaXN0ZW5lcikge1xuICAgICAgICAgICAgICAgICAgICBzZW5kZXIgPSAobXNnKSA9PiB0YXJnZXQucG9zdE1lc3NhZ2UobXNnKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbGlzdGVuZXIgPSAobXNnOiBhbnkpID0+IHRoaXMuX2hhbmRsZUluY29taW5nKG1zZyk7XG4gICAgICAgICAgICAgICAgICAgIHRhcmdldC5vbk1lc3NhZ2UuYWRkTGlzdGVuZXIobGlzdGVuZXIpO1xuICAgICAgICAgICAgICAgICAgICBjbGVhbnVwID0gKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHJ5IHsgdGFyZ2V0Lm9uTWVzc2FnZS5yZW1vdmVMaXN0ZW5lcihsaXN0ZW5lcik7IH0gY2F0Y2gge31cbiAgICAgICAgICAgICAgICAgICAgICAgIHRyeSB7IHRhcmdldC5kaXNjb25uZWN0Py4oKTsgfSBjYXRjaCB7fVxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHBvcnROYW1lID0gb3B0aW9ucy5wb3J0TmFtZSA/PyB0YXJnZXRDaGFubmVsO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBwb3J0ID0gb3B0aW9ucy50YWJJZCAhPSBudWxsICYmIGNocm9tZS50YWJzPy5jb25uZWN0XG4gICAgICAgICAgICAgICAgICAgICAgICA/IGNocm9tZS50YWJzLmNvbm5lY3Qob3B0aW9ucy50YWJJZCwgeyBuYW1lOiBwb3J0TmFtZSB9KVxuICAgICAgICAgICAgICAgICAgICAgICAgOiBjaHJvbWUucnVudGltZS5jb25uZWN0KHsgbmFtZTogcG9ydE5hbWUgfSk7XG4gICAgICAgICAgICAgICAgICAgIHNlbmRlciA9IChtc2cpID0+IHBvcnQucG9zdE1lc3NhZ2UobXNnKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbGlzdGVuZXIgPSAobXNnOiBhbnkpID0+IHRoaXMuX2hhbmRsZUluY29taW5nKG1zZyk7XG4gICAgICAgICAgICAgICAgICAgIHBvcnQub25NZXNzYWdlLmFkZExpc3RlbmVyKGxpc3RlbmVyKTtcbiAgICAgICAgICAgICAgICAgICAgY2xlYW51cCA9ICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRyeSB7IHBvcnQub25NZXNzYWdlLnJlbW92ZUxpc3RlbmVyKGxpc3RlbmVyKTsgfSBjYXRjaCB7fVxuICAgICAgICAgICAgICAgICAgICAgICAgdHJ5IHsgcG9ydC5kaXNjb25uZWN0KCk7IH0gY2F0Y2gge31cbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIGNhc2UgXCJjaHJvbWUtZXh0ZXJuYWxcIjpcbiAgICAgICAgICAgICAgICBzZW5kZXIgPSAobXNnKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChvcHRpb25zLmV4dGVybmFsSWQpIGNocm9tZS5ydW50aW1lLnNlbmRNZXNzYWdlKG9wdGlvbnMuZXh0ZXJuYWxJZCwgbXNnKTtcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbGlzdGVuZXIgPSAobXNnOiBhbnkpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX2hhbmRsZUluY29taW5nKG1zZyk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgY2hyb21lLnJ1bnRpbWUub25NZXNzYWdlRXh0ZXJuYWw/LmFkZExpc3RlbmVyPy4obGlzdGVuZXIpO1xuICAgICAgICAgICAgICAgICAgICBjbGVhbnVwID0gKCkgPT4gY2hyb21lLnJ1bnRpbWUub25NZXNzYWdlRXh0ZXJuYWw/LnJlbW92ZUxpc3RlbmVyPy4obGlzdGVuZXIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgY2FzZSBcInNlbGZcIjpcbiAgICAgICAgICAgICAgICBzZW5kZXIgPSAobXNnLCB0cmFuc2ZlcikgPT4gcG9zdE1lc3NhZ2UobXNnLCB7IHRyYW5zZmVyOiB0cmFuc2ZlciA/PyBbXSB9KTtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGxpc3RlbmVyID0gKChlOiBNZXNzYWdlRXZlbnQpID0+IHRoaXMuX2hhbmRsZUluY29taW5nKGUuZGF0YSkpIGFzIEV2ZW50TGlzdGVuZXI7XG4gICAgICAgICAgICAgICAgICAgIGFkZEV2ZW50TGlzdGVuZXI/LihcIm1lc3NhZ2VcIiwgbGlzdGVuZXIpO1xuICAgICAgICAgICAgICAgICAgICBjbGVhbnVwID0gKCkgPT4gcmVtb3ZlRXZlbnRMaXN0ZW5lcj8uKFwibWVzc2FnZVwiLCBsaXN0ZW5lcik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIGlmIChvcHRpb25zLm9uTWVzc2FnZSkge1xuICAgICAgICAgICAgICAgICAgICBjbGVhbnVwID0gb3B0aW9ucy5vbk1lc3NhZ2UoKG1zZykgPT4gdGhpcy5faGFuZGxlSW5jb21pbmcobXNnKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHNlbmRlciA9IChtc2cpID0+IHRhcmdldD8ucG9zdE1lc3NhZ2U/Lihtc2cpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHRhcmdldCwgdGFyZ2V0Q2hhbm5lbCwgdHJhbnNwb3J0VHlwZSwgc2VuZGVyLCBjbGVhbnVwLFxuICAgICAgICAgICAgcG9zdE1lc3NhZ2U6IChtZXNzYWdlOiBhbnksIG9wdGlvbnM/OiBhbnkpID0+IHNlbmRlcj8uKG1lc3NhZ2UsIG9wdGlvbnMpLFxuICAgICAgICAgICAgc3RhcnQ6ICgpID0+IHRhcmdldD8uc3RhcnQ/LigpLFxuICAgICAgICAgICAgY2xvc2U6ICgpID0+IHRhcmdldD8uY2xvc2U/LigpXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBfc2VuZCh0YXJnZXRDaGFubmVsOiBzdHJpbmcsIG1lc3NhZ2U6IENoYW5uZWxNZXNzYWdlLCB0cmFuc2Zlcj86IFRyYW5zZmVyYWJsZVtdKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IGJpbmRpbmcgPSB0aGlzLl90cmFuc3BvcnRzLmdldCh0YXJnZXRDaGFubmVsKSA/PyB0aGlzLl9kZWZhdWx0VHJhbnNwb3J0O1xuICAgICAgICAoYmluZGluZz8uc2VuZGVyID8/IGJpbmRpbmc/LnBvc3RNZXNzYWdlKT8uY2FsbChiaW5kaW5nLCBtZXNzYWdlLCB0cmFuc2Zlcik7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBfZ2V0RGVmYXVsdFRhcmdldCgpOiBzdHJpbmcge1xuICAgICAgICBpZiAodGhpcy5fZGVmYXVsdFRyYW5zcG9ydCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2RlZmF1bHRUcmFuc3BvcnQudGFyZ2V0Q2hhbm5lbDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gXCJ3b3JrZXJcIjtcbiAgICB9XG5cbiAgICBwcml2YXRlIF9pbmZlclRhcmdldENoYW5uZWwodGFyZ2V0OiBhbnksIHRyYW5zcG9ydFR5cGU6IFRyYW5zcG9ydFR5cGUpOiBzdHJpbmcge1xuICAgICAgICBpZiAodHJhbnNwb3J0VHlwZSA9PT0gXCJ3b3JrZXJcIikgcmV0dXJuIFwid29ya2VyXCI7XG4gICAgICAgIGlmICh0cmFuc3BvcnRUeXBlID09PSBcImJyb2FkY2FzdFwiICYmIHRhcmdldC5uYW1lKSByZXR1cm4gdGFyZ2V0Lm5hbWU7XG4gICAgICAgIGlmICh0cmFuc3BvcnRUeXBlID09PSBcInNlbGZcIikgcmV0dXJuIFwic2VsZlwiO1xuICAgICAgICByZXR1cm4gYCR7dHJhbnNwb3J0VHlwZX0tJHtVVUlEdjQoKS5zbGljZSgwLCA4KX1gO1xuICAgIH1cblxuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIC8vIFBSSVZBVEU6IFByb3h5IENyZWF0aW9uXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbiAgICBwcml2YXRlIF9jcmVhdGVQcm94eSh0YXJnZXRDaGFubmVsOiBzdHJpbmcsIGJhc2VQYXRoOiBzdHJpbmdbXSk6IFJlbW90ZVByb3h5IHtcbiAgICAgICAgY29uc3QgaW52b2tlcjogUHJveHlJbnZva2VyID0gKGFjdGlvbiwgcGF0aCwgYXJncykgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuaW52b2tlKHRhcmdldENoYW5uZWwsIGFjdGlvbiBhcyBXUmVmbGVjdEFjdGlvbiwgcGF0aCwgYXJncyk7XG4gICAgICAgIH07XG5cbiAgICAgICAgcmV0dXJuIGNyZWF0ZVJlbW90ZVByb3h5KGludm9rZXIsIHtcbiAgICAgICAgICAgIGNoYW5uZWw6IHRhcmdldENoYW5uZWwsXG4gICAgICAgICAgICBiYXNlUGF0aCxcbiAgICAgICAgICAgIGNhY2hlOiB0cnVlLFxuICAgICAgICAgICAgdGltZW91dDogdGhpcy5fY29uZmlnLnRpbWVvdXRcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgLy8gUFJJVkFURTogVXRpbGl0aWVzXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbiAgICBwcml2YXRlIF9pc1dvcmtlckNvbnRleHQoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiBbXCJ3b3JrZXJcIiwgXCJzaGFyZWQtd29ya2VyXCIsIFwic2VydmljZS13b3JrZXJcIl0uaW5jbHVkZXModGhpcy5fY29udGV4dFR5cGUpO1xuICAgIH1cbn1cblxuLyoqIFRyYW5zcG9ydCBiaW5kaW5nIGluZm8gKi9cbmV4cG9ydCBpbnRlcmZhY2UgVHJhbnNwb3J0QmluZGluZzxUVHJhbnNwb3J0ID0gTmF0aXZlQ2hhbm5lbFRyYW5zcG9ydD4ge1xuICAgIHRhcmdldDogVFRyYW5zcG9ydDtcbiAgICB0YXJnZXRDaGFubmVsOiBzdHJpbmc7XG4gICAgdHJhbnNwb3J0VHlwZTogVHJhbnNwb3J0VHlwZTtcbiAgICBzZW5kZXI6IChtc2c6IGFueSwgdHJhbnNmZXI/OiBUcmFuc2ZlcmFibGVbXSkgPT4gdm9pZDtcbiAgICBjbGVhbnVwPzogKCkgPT4gdm9pZDtcbiAgICBwb3N0TWVzc2FnZTogKG1lc3NhZ2U6IGFueSwgb3B0aW9ucz86IGFueSkgPT4gdm9pZDtcbiAgICBhZGRFdmVudExpc3RlbmVyPzogKHR5cGU6IHN0cmluZywgbGlzdGVuZXI6IEV2ZW50TGlzdGVuZXIpID0+IHZvaWQ7XG4gICAgcmVtb3ZlRXZlbnRMaXN0ZW5lcj86ICh0eXBlOiBzdHJpbmcsIGxpc3RlbmVyOiBFdmVudExpc3RlbmVyKSA9PiB2b2lkO1xuICAgIHN0YXJ0PzogKCkgPT4gdm9pZDtcbiAgICBjbG9zZT86ICgpID0+IHZvaWQ7XG59XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIEZBQ1RPUlkgRlVOQ1RJT05TXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKlxuICogQ3JlYXRlIGEgdW5pZmllZCBjaGFubmVsXG4gKlxuICogQGV4YW1wbGVcbiAqIC8vIEluIHdvcmtlclxuICogY29uc3QgY2hhbm5lbCA9IGNyZWF0ZVVuaWZpZWRDaGFubmVsKFwid29ya2VyXCIpO1xuICogY2hhbm5lbC5leHBvc2UoXCJjYWxjXCIsIHsgYWRkOiAoYSwgYikgPT4gYSArIGIgfSk7XG4gKlxuICogLy8gSW4gaG9zdFxuICogY29uc3QgY2hhbm5lbCA9IGNyZWF0ZVVuaWZpZWRDaGFubmVsKFwiaG9zdFwiKTtcbiAqIGNoYW5uZWwuY29ubmVjdCh3b3JrZXIpO1xuICogY29uc3QgY2FsYyA9IGNoYW5uZWwucHJveHkoXCJ3b3JrZXJcIiwgW1wiY2FsY1wiXSk7XG4gKiBhd2FpdCBjYWxjLmFkZCgyLCAzKTsgLy8gNVxuICovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlVW5pZmllZENoYW5uZWwoY29uZmlnOiBVbmlmaWVkQ2hhbm5lbENvbmZpZyB8IHN0cmluZyk6IFVuaWZpZWRDaGFubmVsIHtcbiAgICByZXR1cm4gbmV3IFVuaWZpZWRDaGFubmVsKGNvbmZpZyk7XG59XG5cbi8qKlxuICogUXVpY2sgc2V0dXA6IENyZWF0ZSBjaGFubmVsIGFuZCBjb25uZWN0IHRvIHRyYW5zcG9ydFxuICovXG5leHBvcnQgZnVuY3Rpb24gc2V0dXBVbmlmaWVkQ2hhbm5lbChcbiAgICBuYW1lOiBzdHJpbmcsXG4gICAgdGFyZ2V0OiBXb3JrZXIgfCBNZXNzYWdlUG9ydCB8IEJyb2FkY2FzdENoYW5uZWwgfCBXZWJTb2NrZXQgfCBhbnksXG4gICAgb3B0aW9ucz86IFBhcnRpYWw8VW5pZmllZENoYW5uZWxDb25maWc+ICYgQ29ubmVjdE9wdGlvbnNcbik6IFVuaWZpZWRDaGFubmVsIHtcbiAgICByZXR1cm4gY3JlYXRlVW5pZmllZENoYW5uZWwoeyBuYW1lLCAuLi5vcHRpb25zIH0pLmF0dGFjaCh0YXJnZXQsIG9wdGlvbnMpO1xufVxuXG4vKipcbiAqIENyZWF0ZSBhIGNoYW5uZWwgcGFpciBmb3IgYmlkaXJlY3Rpb25hbCBjb21tdW5pY2F0aW9uXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVVbmlmaWVkQ2hhbm5lbFBhaXIoXG4gICAgbmFtZTE6IHN0cmluZyxcbiAgICBuYW1lMjogc3RyaW5nLFxuICAgIG9wdGlvbnM/OiBQYXJ0aWFsPFVuaWZpZWRDaGFubmVsQ29uZmlnPlxuKTogeyBjaGFubmVsMTogVW5pZmllZENoYW5uZWw7IGNoYW5uZWwyOiBVbmlmaWVkQ2hhbm5lbDsgbWVzc2FnZUNoYW5uZWw6IE1lc3NhZ2VDaGFubmVsIH0ge1xuICAgIGNvbnN0IG1jID0gbmV3IE1lc3NhZ2VDaGFubmVsKCk7XG4gICAgbWMucG9ydDEuc3RhcnQoKTtcbiAgICBtYy5wb3J0Mi5zdGFydCgpO1xuXG4gICAgY29uc3QgY2hhbm5lbDEgPSBjcmVhdGVVbmlmaWVkQ2hhbm5lbCh7IG5hbWU6IG5hbWUxLCBhdXRvTGlzdGVuOiBmYWxzZSwgLi4ub3B0aW9ucyB9KS5hdHRhY2gobWMucG9ydDEsIHsgdGFyZ2V0Q2hhbm5lbDogbmFtZTIgfSk7XG4gICAgY29uc3QgY2hhbm5lbDIgPSBjcmVhdGVVbmlmaWVkQ2hhbm5lbCh7IG5hbWU6IG5hbWUyLCBhdXRvTGlzdGVuOiBmYWxzZSwgLi4ub3B0aW9ucyB9KS5hdHRhY2gobWMucG9ydDIsIHsgdGFyZ2V0Q2hhbm5lbDogbmFtZTEgfSk7XG5cbiAgICByZXR1cm4geyBjaGFubmVsMSwgY2hhbm5lbDIsIG1lc3NhZ2VDaGFubmVsOiBtYyB9O1xufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBHTE9CQUwgQ0hBTk5FTCBSRUdJU1RSWVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5jb25zdCBDSEFOTkVMX1JFR0lTVFJZID0gbmV3IE1hcDxzdHJpbmcsIFVuaWZpZWRDaGFubmVsPigpO1xuXG4vKipcbiAqIEdldCBvciBjcmVhdGUgYSBuYW1lZCBjaGFubmVsIChzaW5nbGV0b24gcGVyIG5hbWUpXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRVbmlmaWVkQ2hhbm5lbChuYW1lOiBzdHJpbmcsIGNvbmZpZz86IFBhcnRpYWw8VW5pZmllZENoYW5uZWxDb25maWc+KTogVW5pZmllZENoYW5uZWwge1xuICAgIGlmICghQ0hBTk5FTF9SRUdJU1RSWS5oYXMobmFtZSkpIHtcbiAgICAgICAgQ0hBTk5FTF9SRUdJU1RSWS5zZXQobmFtZSwgY3JlYXRlVW5pZmllZENoYW5uZWwoeyBuYW1lLCAuLi5jb25maWcgfSkpO1xuICAgIH1cbiAgICByZXR1cm4gQ0hBTk5FTF9SRUdJU1RSWS5nZXQobmFtZSkhO1xufVxuXG4vKipcbiAqIEdldCBhbGwgcmVnaXN0ZXJlZCBjaGFubmVsIG5hbWVzXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRVbmlmaWVkQ2hhbm5lbE5hbWVzKCk6IHN0cmluZ1tdIHtcbiAgICByZXR1cm4gWy4uLkNIQU5ORUxfUkVHSVNUUlkua2V5cygpXTtcbn1cblxuLyoqXG4gKiBDbG9zZSBhbmQgcmVtb3ZlIGEgY2hhbm5lbCBmcm9tIHJlZ2lzdHJ5XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjbG9zZVVuaWZpZWRDaGFubmVsKG5hbWU6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgIGNvbnN0IGNoYW5uZWwgPSBDSEFOTkVMX1JFR0lTVFJZLmdldChuYW1lKTtcbiAgICBpZiAoY2hhbm5lbCkge1xuICAgICAgICBjaGFubmVsLmNsb3NlKCk7XG4gICAgICAgIHJldHVybiBDSEFOTkVMX1JFR0lTVFJZLmRlbGV0ZShuYW1lKTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBBVVRPLUlOSVQgRk9SIFdPUktFUlNcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxubGV0IFdPUktFUl9DSEFOTkVMOiBVbmlmaWVkQ2hhbm5lbCB8IG51bGwgPSBudWxsO1xuXG4vKipcbiAqIEdldCB0aGUgd29ya2VyJ3MgdW5pZmllZCBjaGFubmVsIChhdXRvLWNyZWF0ZWQgaW4gd29ya2VyIGNvbnRleHQpXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRXb3JrZXJDaGFubmVsKCk6IFVuaWZpZWRDaGFubmVsIHtcbiAgICBpZiAoIVdPUktFUl9DSEFOTkVMKSB7XG4gICAgICAgIGNvbnN0IGNvbnRleHRUeXBlID0gZGV0ZWN0Q29udGV4dFR5cGUoKTtcbiAgICAgICAgaWYgKFtcIndvcmtlclwiLCBcInNoYXJlZC13b3JrZXJcIiwgXCJzZXJ2aWNlLXdvcmtlclwiXS5pbmNsdWRlcyhjb250ZXh0VHlwZSkpIHtcbiAgICAgICAgICAgIFdPUktFUl9DSEFOTkVMID0gY3JlYXRlVW5pZmllZENoYW5uZWwoeyBuYW1lOiBcIndvcmtlclwiLCBhdXRvTGlzdGVuOiB0cnVlIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgV09SS0VSX0NIQU5ORUwgPSBjcmVhdGVVbmlmaWVkQ2hhbm5lbCh7IG5hbWU6IFwiaG9zdFwiLCBhdXRvTGlzdGVuOiBmYWxzZSB9KTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gV09SS0VSX0NIQU5ORUw7XG59XG5cbi8qKlxuICogRXhwb3NlIGFuIG9iamVjdCBmcm9tIHRoZSB3b3JrZXIgY2hhbm5lbFxuICovXG5leHBvcnQgZnVuY3Rpb24gZXhwb3NlRnJvbVVuaWZpZWQobmFtZTogc3RyaW5nLCBvYmo6IGFueSk6IHZvaWQge1xuICAgIGdldFdvcmtlckNoYW5uZWwoKS5leHBvc2UobmFtZSwgb2JqKTtcbn1cblxuLyoqXG4gKiBDcmVhdGUgYSBwcm94eSB0byBhIHJlbW90ZSBjaGFubmVsIGZyb20gdGhlIHdvcmtlclxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVtb3RlRnJvbVVuaWZpZWQ8VCA9IGFueT4obW9kdWxlTmFtZTogc3RyaW5nLCB0YXJnZXRDaGFubmVsPzogc3RyaW5nKTogVCB7XG4gICAgcmV0dXJuIGdldFdvcmtlckNoYW5uZWwoKS5yZW1vdGU8VD4obW9kdWxlTmFtZSwgdGFyZ2V0Q2hhbm5lbCk7XG59XG4iXX0=