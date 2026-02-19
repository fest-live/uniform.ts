/**
 * Channel Context - Multi-Channel Support
 *
 * Provides a way to create multiple independent channel endpoints/ports
 * in the same context. Suitable for:
 * - Lazy-loaded components
 * - Multiple DOM components with isolated communication
 * - Micro-frontend architectures
 * - Component-level channel isolation
 *
 * vNext architecture note:
 * - ChannelContext composes UnifiedChannel instances per endpoint.
 * - UnifiedChannel is the canonical transport/invocation runtime engine.
 */
import { UUIDv4, Promised } from "fest/core";
import { getConnectionPool, getConnection } from "./Connection";
import { ChannelSubject } from "../observable/Observable";
import { getChannelStorage } from "../storage/Storage";
import { WReflectAction } from "../types/Interface";
import { UnifiedChannel } from "./UnifiedChannel";
import { ConnectionRegistry } from "./internal/ConnectionModel";
// Worker code - use direct URL (works in both Vite and non-Vite)
const workerCode = new URL("../transport/Worker.ts", import.meta.url);
// ============================================================================
// REMOTE CHANNEL HELPER
// ============================================================================
export class RemoteChannelHelper {
    _channel;
    _context;
    _options;
    _connection;
    _storage;
    constructor(_channel, _context, _options = {}) {
        this._channel = _channel;
        this._context = _context;
        this._options = _options;
        this._connection = getConnection(_channel);
        this._storage = getChannelStorage(_channel);
    }
    async request(path, action, args, options = {}) {
        let normalizedPath = typeof path === "string" ? [path] : path;
        let normalizedAction = action;
        let normalizedArgs = args;
        if (Array.isArray(action) && isReflectAction(path)) {
            options = args;
            normalizedArgs = action;
            normalizedAction = path;
            normalizedPath = [];
        }
        const handler = this._context.getHost();
        return handler?.request(normalizedPath, normalizedAction, normalizedArgs, options, this._channel);
    }
    async doImportModule(url, options = {}) {
        return this.request([], WReflectAction.IMPORT, [url], options);
    }
    async deferMessage(payload, options = {}) {
        return this._storage.defer({
            channel: this._channel,
            sender: this._context.hostName,
            type: "request",
            payload
        }, options);
    }
    async getPendingMessages() {
        return this._storage.getDeferredMessages(this._channel, { status: "pending" });
    }
    get connection() { return this._connection; }
    get channelName() { return this._channel; }
    get context() { return this._context; }
}
// ============================================================================
// CHANNEL HANDLER (Per-endpoint)
// ============================================================================
export class ChannelHandler {
    _channel;
    _context;
    _options;
    // @ts-ignore
    //private _forResolves = new Map<string, PromiseWithResolvers<any>>();
    //private _broadcasts: Record<string, TransportBinding<NativeChannelTransport>> = {};
    //private _subscriptions: Subscription[] = [];
    _connection;
    _unified;
    get _forResolves() {
        return this._unified.__getPrivate("_pending");
    }
    get _subscriptions() {
        return this._unified.__getPrivate("_subscriptions");
    }
    get _broadcasts() {
        return this._unified.__getPrivate("_transports");
    }
    constructor(_channel, _context, _options = {}) {
        this._channel = _channel;
        this._context = _context;
        this._options = _options;
        this._connection = getConnectionPool().getOrCreate(_channel, "internal", _options);
        this._unified = new UnifiedChannel({
            name: _channel,
            autoListen: false,
            timeout: _options?.timeout
        });
    }
    createRemoteChannel(channel, options = {}, broadcast) {
        const transport = normalizeTransportBinding(broadcast ?? (this._context.$createOrUseExistingRemote(channel, options, broadcast ?? null))?.messageChannel?.port1);
        const transportType = getDynamicTransportType(transport?.target ?? transport);
        //
        this._unified.listen(transport?.target, { targetChannel: channel });
        /*
        transport?.addEventListener?.('message', ((event: MessageEvent) => {
            if (event.data.type === "request" && event.data.channel === this._channel) {
                this.handleAndResponse(event.data.payload, event.data.reqId);
            } else if (event.data.type === "response") {
                this.resolveResponse(event.data.reqId, {
                    result: event.data.payload.result,
                    descriptor: event.data.payload.descriptor,
                    type: event.data.payload.type
                });
            } else if (event.data.type === "signal") {
                this._context.$observeSignal({
                    localChannel: this._channel,
                    remoteChannel: event.data.payload?.from ?? event.data.sender ?? channel,
                    sender: event.data.sender ?? event.data.payload?.from ?? "unknown",
                    transportType: event.data.transportType ?? transportType,
                    payload: event.data.payload
                });
            }
        }) as EventListener);
        
        transport?.addEventListener?.('error', (event) => {
            console.error(event);
            transport?.close?.();
        });*/
        if (transport) {
            this._broadcasts?.set?.(channel, transport);
            const canAttachUnified = !(transportType === "self" && typeof postMessage === "undefined");
            if (canAttachUnified) {
                this._unified.connect(transport, { targetChannel: channel });
            }
            this._context.$registerConnection({
                localChannel: this._channel,
                remoteChannel: channel,
                sender: this._channel,
                direction: "outgoing",
                transportType
            });
            this.notifyChannel(channel, {
                contextId: this._context.id,
                contextName: this._context.hostName
            }, "connect");
        }
        //
        return new RemoteChannelHelper(channel, this._context, options);
    }
    getChannel() { return this._channel; }
    get connection() { return this._connection; }
    request(path, action, args, options = {}, toChannel = "worker") {
        let normalizedPath = typeof path === "string" ? [path] : path;
        let normalizedArgs = args;
        if (Array.isArray(action) && isReflectAction(path)) {
            toChannel = options;
            options = args;
            normalizedArgs = action;
            action = path;
            normalizedPath = [];
        }
        return this._unified.invoke(toChannel, action, normalizedPath ?? [], Array.isArray(normalizedArgs) ? normalizedArgs : [normalizedArgs]);
    }
    resolveResponse(reqId, result) {
        this._forResolves.get(reqId)?.resolve?.(result);
        const promise = this._forResolves.get(reqId)?.promise;
        this._forResolves.delete(reqId);
        return promise;
    }
    async handleAndResponse(request, reqId, responseFn) {
        // Use unified core handleRequest
        /*const result = await coreHandleRequest(request, reqId, this._channel);
        if (!result) return;

        const { response, transfer } = result;
        const send = responseFn ?? this._broadcasts?.get(request.sender)?.postMessage?.bind(this._broadcasts?.get(request.sender));
        send?.(response, transfer);*/
    }
    notifyChannel(targetChannel, payload = {}, type = "notify") {
        // Delegate notify/connect signaling to unified runtime.
        return this._unified.notify(targetChannel, {
            ...payload,
            from: this._channel,
            to: targetChannel
        }, type);
    }
    getConnectedChannels() {
        return this._unified.connectedChannels;
    }
    close() {
        this._subscriptions.forEach(s => s.unsubscribe());
        this._forResolves.clear();
        this._broadcasts?.values?.()?.forEach((transport) => transport.close?.());
        this._broadcasts?.clear?.();
        this._unified.close();
    }
    get unified() {
        return this._unified;
    }
}
// ============================================================================
// CHANNEL CONTEXT
// ============================================================================
/**
 * Channel Context - Manages multiple channels in a single context
 *
 * Use this when you need multiple independent channels in the same
 * JavaScript context (same window, iframe, worker, etc.)
 *
 * Supports:
 * - Creating multiple channels at once or deferred
 * - Dynamic transport addition (workers, ports, sockets, etc.)
 * - Global self/globalThis as default target
 */
export class ChannelContext {
    _options;
    _id = UUIDv4();
    _hostName;
    _host = null;
    _endpoints = new Map();
    _unifiedByChannel = new Map();
    _unifiedConnectionSubs = new Map();
    _remoteChannels = new Map();
    _deferredChannels = new Map();
    _connectionEvents = new ChannelSubject({ bufferSize: 200 });
    _connectionRegistry = new ConnectionRegistry(() => UUIDv4(), (event) => this._emitConnectionEvent(event));
    _closed = false;
    _globalSelf = null;
    constructor(_options = {}) {
        this._options = _options;
        this._hostName = _options.name ?? `ctx-${this._id.slice(0, 8)}`;
        // Initialize with globalThis/self if requested
        if (_options.useGlobalSelf !== false) {
            this._globalSelf = typeof globalThis !== "undefined" ? globalThis
                : typeof self !== "undefined" ? self
                    : null;
        }
    }
    // ========================================================================
    // HOST MANAGEMENT
    // ========================================================================
    /**
     * Initialize/get the host channel for this context
     */
    initHost(name) {
        if (this._host && !name)
            return this._host;
        const hostName = name ?? this._hostName;
        this._hostName = hostName;
        if (this._endpoints.has(hostName)) {
            this._host = this._endpoints.get(hostName).handler;
            return this._host;
        }
        this._host = new ChannelHandler(hostName, this, this._options.defaultOptions);
        const endpoint = {
            name: hostName,
            handler: this._host,
            connection: this._host.connection,
            subscriptions: [],
            ready: Promise.resolve(null),
            unified: this._host.unified
        };
        this._endpoints.set(hostName, endpoint);
        this._registerUnifiedChannel(hostName, this._host.unified);
        return this._host;
    }
    /**
     * Get the host channel
     */
    getHost() {
        return this._host ?? this.initHost();
    }
    /**
     * Get host name
     */
    get hostName() {
        return this._hostName;
    }
    /**
     * Get context ID
     */
    get id() {
        return this._id;
    }
    /**
     * Observable: connection events in this context
     */
    get onConnection() {
        return this._connectionEvents;
    }
    /**
     * Subscribe to connection events
     */
    subscribeConnections(handler) {
        return this._connectionEvents.subscribe(handler);
    }
    /**
     * Notify all currently known active connections.
     * Useful for service worker / cross-tab handshakes.
     */
    notifyConnections(payload = {}, query = {}) {
        let sent = 0;
        for (const endpoint of this._endpoints.values()) {
            const connectedTargets = endpoint.handler.getConnectedChannels();
            for (const remoteChannel of connectedTargets) {
                if (query.localChannel && query.localChannel !== endpoint.name)
                    continue;
                if (query.remoteChannel && query.remoteChannel !== remoteChannel)
                    continue;
                const existing = this.queryConnections({
                    localChannel: endpoint.name,
                    remoteChannel,
                    status: "active"
                })[0];
                if (query.sender && existing?.sender !== query.sender)
                    continue;
                if (query.transportType && existing?.transportType !== query.transportType)
                    continue;
                if (query.channel && query.channel !== endpoint.name && query.channel !== remoteChannel)
                    continue;
                if (endpoint.handler.notifyChannel(remoteChannel, payload, "notify")) {
                    sent++;
                }
            }
        }
        return sent;
    }
    /**
     * Query tracked connections with filters
     */
    queryConnections(query = {}) {
        return this._connectionRegistry
            .query(query)
            .map((connection) => ({
            ...connection,
            contextId: this._id
        }));
    }
    // ========================================================================
    // MULTI-CHANNEL CREATION
    // ========================================================================
    /**
     * Create a new channel endpoint in this context
     *
     * @param name - Channel name
     * @param options - Connection options
     * @returns ChannelEndpoint with handler and connection
     */
    createChannel(name, options = {}) {
        if (this._endpoints.has(name)) {
            return this._endpoints.get(name);
        }
        const handler = new ChannelHandler(name, this, { ...this._options.defaultOptions, ...options });
        const endpoint = {
            name,
            handler,
            connection: handler.connection,
            subscriptions: [],
            ready: Promise.resolve(null),
            unified: handler.unified
        };
        this._endpoints.set(name, endpoint);
        this._registerUnifiedChannel(name, handler.unified);
        return endpoint;
    }
    /**
     * Create multiple channel endpoints at once
     *
     * @param names - Array of channel names
     * @param options - Shared connection options
     * @returns Map of channel names to endpoints
     */
    createChannels(names, options = {}) {
        const result = new Map();
        for (const name of names) {
            result.set(name, this.createChannel(name, options));
        }
        return result;
    }
    /**
     * Get an existing channel endpoint
     */
    getChannel(name) {
        return this._endpoints.get(name);
    }
    /**
     * Get or create a channel endpoint
     */
    getOrCreateChannel(name, options = {}) {
        return this._endpoints.get(name) ?? this.createChannel(name, options);
    }
    /**
     * Check if channel exists in this context
     */
    hasChannel(name) {
        return this._endpoints.has(name);
    }
    /**
     * Get all channel names in this context
     */
    getChannelNames() {
        return [...this._endpoints.keys()];
    }
    /**
     * Get total number of channels
     */
    get size() {
        return this._endpoints.size;
    }
    // ========================================================================
    // DYNAMIC / DEFERRED CHANNEL CREATION
    // ========================================================================
    /**
     * Register a deferred channel that will be initialized on first use
     *
     * @param name - Channel name
     * @param initFn - Function to initialize the channel
     */
    defer(name, initFn) {
        this._deferredChannels.set(name, initFn);
    }
    /**
     * Initialize a previously deferred channel
     */
    async initDeferred(name) {
        const initFn = this._deferredChannels.get(name);
        if (!initFn)
            return null;
        const endpoint = await initFn();
        this._endpoints.set(name, endpoint);
        this._deferredChannels.delete(name);
        return endpoint;
    }
    /**
     * Check if channel is deferred (not yet initialized)
     */
    isDeferred(name) {
        return this._deferredChannels.has(name);
    }
    /**
     * Get channel, initializing deferred if needed
     */
    async getChannelAsync(name) {
        if (this._endpoints.has(name)) {
            return this._endpoints.get(name);
        }
        if (this._deferredChannels.has(name)) {
            return this.initDeferred(name);
        }
        return null;
    }
    /**
     * Add a Worker channel dynamically
     *
     * @param name - Channel name
     * @param worker - Worker instance, URL, or code string
     * @param options - Connection options
     */
    async addWorker(name, worker, options = {}) {
        const workerInstance = loadWorker(worker);
        if (!workerInstance)
            throw new Error(`Failed to create worker for channel: ${name}`);
        const handler = new ChannelHandler(name, this, { ...this._options.defaultOptions, ...options });
        const ready = handler.createRemoteChannel(name, options, workerInstance);
        const endpoint = {
            name,
            handler,
            connection: handler.connection,
            subscriptions: [],
            transportType: "worker",
            ready: Promise.resolve(ready),
            unified: handler.unified
        };
        this._endpoints.set(name, endpoint);
        this._registerUnifiedChannel(name, handler.unified);
        // Store in remote channels too
        this._remoteChannels.set(name, {
            channel: name,
            context: this,
            remote: Promise.resolve(ready),
            transport: workerInstance,
            transportType: "worker"
        });
        return endpoint;
    }
    /**
     * Add a MessagePort channel dynamically
     *
     * @param name - Channel name
     * @param port - MessagePort instance
     * @param options - Connection options
     */
    async addPort(name, port, options = {}) {
        const handler = new ChannelHandler(name, this, { ...this._options.defaultOptions, ...options });
        port.start?.();
        const ready = handler.createRemoteChannel(name, options, port);
        const endpoint = {
            name,
            handler,
            connection: handler.connection,
            subscriptions: [],
            transportType: "message-port",
            ready: Promise.resolve(ready),
            unified: handler.unified
        };
        this._endpoints.set(name, endpoint);
        this._registerUnifiedChannel(name, handler.unified);
        this._remoteChannels.set(name, {
            channel: name,
            context: this,
            remote: Promise.resolve(ready),
            transport: port,
            transportType: "message-port"
        });
        return endpoint;
    }
    /**
     * Add a BroadcastChannel dynamically
     *
     * @param name - Channel name (also used as BroadcastChannel name if not provided)
     * @param broadcastName - Optional BroadcastChannel name (defaults to channel name)
     * @param options - Connection options
     */
    async addBroadcast(name, broadcastName, options = {}) {
        const bc = new BroadcastChannel(broadcastName ?? name);
        const handler = new ChannelHandler(name, this, { ...this._options.defaultOptions, ...options });
        const ready = handler.createRemoteChannel(name, options, bc);
        const endpoint = {
            name,
            handler,
            connection: handler.connection,
            subscriptions: [],
            transportType: "broadcast",
            ready: Promise.resolve(ready),
            unified: handler.unified
        };
        this._endpoints.set(name, endpoint);
        this._registerUnifiedChannel(name, handler.unified);
        this._remoteChannels.set(name, {
            channel: name,
            context: this,
            remote: Promise.resolve(ready),
            transport: bc,
            transportType: "broadcast"
        });
        return endpoint;
    }
    /**
     * Add a channel using self/globalThis (for same-context communication)
     *
     * @param name - Channel name
     * @param options - Connection options
     */
    addSelfChannel(name, options = {}) {
        const handler = new ChannelHandler(name, this, { ...this._options.defaultOptions, ...options });
        const selfTarget = this._globalSelf ?? (typeof self !== "undefined" ? self : null);
        const endpoint = {
            name,
            handler,
            connection: handler.connection,
            subscriptions: [],
            transportType: "self",
            ready: Promise.resolve(selfTarget ? handler.createRemoteChannel(name, options, selfTarget) : null),
            unified: handler.unified
        };
        this._endpoints.set(name, endpoint);
        this._registerUnifiedChannel(name, handler.unified);
        return endpoint;
    }
    /**
     * Add channel with dynamic transport configuration
     *
     * @param name - Channel name
     * @param config - Transport configuration
     */
    async addTransport(name, config) {
        const options = config.options ?? {};
        switch (config.type) {
            case "worker":
                if (!config.worker)
                    throw new Error("Worker required for worker transport");
                return this.addWorker(name, config.worker, options);
            case "message-port":
                if (!config.port)
                    throw new Error("Port required for message-port transport");
                return this.addPort(name, config.port, options);
            case "broadcast":
                const bcName = typeof config.broadcast === "string" ? config.broadcast : undefined;
                return this.addBroadcast(name, bcName, options);
            case "self":
                return this.addSelfChannel(name, options);
            default:
                // Fallback to basic channel
                return this.createChannel(name, options);
        }
    }
    /**
     * Create a MessageChannel pair for bidirectional communication
     *
     * @param name1 - First channel name
     * @param name2 - Second channel name
     * @returns Both endpoints connected via MessageChannel
     */
    createChannelPair(name1, name2, options = {}) {
        const mc = new MessageChannel();
        const handler1 = new ChannelHandler(name1, this, { ...this._options.defaultOptions, ...options });
        const handler2 = new ChannelHandler(name2, this, { ...this._options.defaultOptions, ...options });
        mc.port1.start();
        mc.port2.start();
        const ready1 = handler1.createRemoteChannel(name2, options, mc.port1);
        const ready2 = handler2.createRemoteChannel(name1, options, mc.port2);
        const channel1 = {
            name: name1,
            handler: handler1,
            connection: handler1.connection,
            subscriptions: [],
            transportType: "message-port",
            ready: ready1,
            unified: handler1.unified
        };
        const channel2 = {
            name: name2,
            handler: handler2,
            connection: handler2.connection,
            subscriptions: [],
            transportType: "message-port",
            ready: ready2,
            unified: handler2.unified
        };
        this._endpoints.set(name1, channel1);
        this._endpoints.set(name2, channel2);
        this._registerUnifiedChannel(name1, handler1.unified);
        this._registerUnifiedChannel(name2, handler2.unified);
        return { channel1, channel2, messageChannel: mc };
    }
    /**
     * Get the global self reference
     */
    get globalSelf() {
        return this._globalSelf;
    }
    // ========================================================================
    // REMOTE CHANNEL MANAGEMENT
    // ========================================================================
    /**
     * Connect to a remote channel (e.g., in a Worker)
     */
    async connectRemote(channelName, options = {}, broadcast) {
        this.initHost();
        return this._host.createRemoteChannel(channelName, options, broadcast);
    }
    /**
     * Import a module in a remote channel
     */
    async importModuleInChannel(channelName, url, options = {}, broadcast) {
        const remote = await this.connectRemote(channelName, options.channelOptions, broadcast);
        return remote?.doImportModule?.(url, options.importOptions);
    }
    /**
     * Internal: Create or use existing remote channel
     */
    $createOrUseExistingRemote(channel, options = {}, broadcast) {
        if (channel == null || broadcast)
            return null;
        if (this._remoteChannels.has(channel))
            return this._remoteChannels.get(channel);
        const msgChannel = new MessageChannel();
        const promise = Promised(new Promise((resolve) => {
            const worker = loadWorker(workerCode);
            worker?.addEventListener?.('message', (event) => {
                if (event.data.type === "channelCreated") {
                    msgChannel.port1?.start?.();
                    resolve(new RemoteChannelHelper(event.data.channel, this, options));
                }
            });
            worker?.postMessage?.({
                type: "createChannel",
                channel,
                sender: this._hostName,
                options,
                messagePort: msgChannel.port2
            }, { transfer: [msgChannel.port2] });
        }));
        const info = {
            channel,
            context: this,
            messageChannel: msgChannel,
            remote: promise
        };
        this._remoteChannels.set(channel, info);
        return info;
    }
    $registerConnection(params) {
        return {
            ...this._connectionRegistry.register(params),
            contextId: this._id
        };
    }
    $markNotified(params) {
        const connection = this._connectionRegistry.register({
            localChannel: params.localChannel,
            remoteChannel: params.remoteChannel,
            sender: params.sender,
            direction: params.direction,
            transportType: params.transportType
        });
        this._connectionRegistry.markNotified(connection, params.payload);
    }
    $observeSignal(params) {
        const signalType = params.payload?.type ?? "notify";
        const direction = signalType === "connect" ? "incoming" : "incoming";
        this.$markNotified({
            localChannel: params.localChannel,
            remoteChannel: params.remoteChannel,
            sender: params.sender,
            direction,
            transportType: params.transportType,
            payload: params.payload
        });
    }
    $forwardUnifiedConnectionEvent(channel, event) {
        const mappedTransportType = (event.connection.transportType ?? "internal");
        const connection = this._connectionRegistry.register({
            localChannel: event.connection.localChannel || channel,
            remoteChannel: event.connection.remoteChannel,
            sender: event.connection.sender,
            direction: event.connection.direction,
            transportType: mappedTransportType,
            metadata: event.connection.metadata
        });
        if (event.type === "notified") {
            this._connectionRegistry.markNotified(connection, event.payload);
        }
        else if (event.type === "disconnected") {
            this._connectionRegistry.closeByChannel(event.connection.localChannel);
        }
    }
    // ========================================================================
    // LIFECYCLE
    // ========================================================================
    /**
     * Close a specific channel
     */
    closeChannel(name) {
        const endpoint = this._endpoints.get(name);
        if (!endpoint)
            return false;
        endpoint.subscriptions.forEach(s => s.unsubscribe());
        endpoint.handler.close();
        endpoint.transport?.detach();
        this._unifiedConnectionSubs.get(name)?.unsubscribe();
        this._unifiedConnectionSubs.delete(name);
        this._unifiedByChannel.delete(name);
        this._endpoints.delete(name);
        if (name === this._hostName) {
            this._host = null;
        }
        this._connectionRegistry.closeByChannel(name);
        return true;
    }
    /**
     * Close all channels and cleanup
     */
    close() {
        if (this._closed)
            return;
        this._closed = true;
        for (const [name] of this._endpoints) {
            this.closeChannel(name);
        }
        this._remoteChannels.clear();
        this._host = null;
        this._unifiedConnectionSubs.forEach((sub) => sub.unsubscribe());
        this._unifiedConnectionSubs.clear();
        this._unifiedByChannel.clear();
        this._connectionRegistry.clear();
        this._connectionEvents.complete();
    }
    /**
     * Check if context is closed
     */
    get closed() {
        return this._closed;
    }
    _registerUnifiedChannel(name, unified) {
        this._unifiedByChannel.set(name, unified);
        this._unifiedConnectionSubs.get(name)?.unsubscribe();
        const subscription = unified.subscribeConnections((event) => {
            this.$forwardUnifiedConnectionEvent(name, event);
        });
        this._unifiedConnectionSubs.set(name, subscription);
    }
    _emitConnectionEvent(event) {
        this._connectionEvents.next({
            ...event,
            connection: {
                ...event.connection,
                contextId: this._id
            }
        });
    }
}
// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
function isReflectAction(action) {
    return [...Object.values(WReflectAction)].includes(action);
}
function normalizeTransportBinding(target) {
    if (!target)
        return null;
    if (isTransportBinding(target))
        return target;
    const nativeTarget = target;
    return {
        target: nativeTarget,
        postMessage: (message, options) => {
            nativeTarget.postMessage?.(message, options);
        },
        addEventListener: nativeTarget.addEventListener?.bind(nativeTarget),
        removeEventListener: nativeTarget.removeEventListener?.bind(nativeTarget),
        start: nativeTarget.start?.bind(nativeTarget),
        close: nativeTarget.close?.bind(nativeTarget)
    };
}
function isTransportBinding(value) {
    return !!value && typeof value === "object" && "target" in value && typeof value.postMessage === "function";
}
function getDynamicTransportType(target) {
    const effectiveTarget = isTransportBinding(target) ? target.target : target;
    if (!effectiveTarget)
        return "internal";
    if (effectiveTarget === "chrome-runtime")
        return "chrome-runtime";
    if (effectiveTarget === "chrome-tabs")
        return "chrome-tabs";
    if (effectiveTarget === "chrome-port")
        return "chrome-port";
    if (effectiveTarget === "chrome-external")
        return "chrome-external";
    if (typeof MessagePort !== "undefined" && effectiveTarget instanceof MessagePort)
        return "message-port";
    if (typeof BroadcastChannel !== "undefined" && effectiveTarget instanceof BroadcastChannel)
        return "broadcast";
    if (typeof Worker !== "undefined" && effectiveTarget instanceof Worker)
        return "worker";
    if (typeof WebSocket !== "undefined" && effectiveTarget instanceof WebSocket)
        return "websocket";
    if (typeof chrome !== "undefined" &&
        typeof effectiveTarget === "object" &&
        effectiveTarget &&
        typeof effectiveTarget.postMessage === "function" &&
        effectiveTarget.onMessage?.addListener)
        return "chrome-port";
    if (typeof self !== "undefined" && effectiveTarget === self)
        return "self";
    return "internal";
}
function loadWorker(WX) {
    if (WX instanceof Worker)
        return WX;
    if (WX instanceof URL)
        return new Worker(WX.href, { type: "module" });
    if (typeof WX === "function") {
        try {
            return new WX({ type: "module" });
        }
        catch {
            return WX({ type: "module" });
        }
    }
    if (typeof WX === "string") {
        if (WX.startsWith("/"))
            return new Worker(new URL(WX.replace(/^\//, "./"), import.meta.url).href, { type: "module" });
        if (URL.canParse(WX) || WX.startsWith("./"))
            return new Worker(new URL(WX, import.meta.url).href, { type: "module" });
        return new Worker(URL.createObjectURL(new Blob([WX], { type: "application/javascript" })), { type: "module" });
    }
    if (WX instanceof Blob || WX instanceof File)
        return new Worker(URL.createObjectURL(WX), { type: "module" });
    return WX ?? (typeof self !== "undefined" ? self : null);
}
// ============================================================================
// FACTORY FUNCTIONS & GLOBAL CONTEXT
// ============================================================================
/** Global context registry for shared contexts */
const CONTEXT_REGISTRY = new Map();
/** Default global context (uses globalThis/self) */
let DEFAULT_CONTEXT = null;
/**
 * Get the default global context
 *
 * This context is shared across the entire JavaScript context
 * and uses globalThis/self for communication by default.
 */
export function getDefaultContext() {
    if (!DEFAULT_CONTEXT) {
        DEFAULT_CONTEXT = new ChannelContext({
            name: "$default$",
            useGlobalSelf: true
        });
        CONTEXT_REGISTRY.set("$default$", DEFAULT_CONTEXT);
    }
    return DEFAULT_CONTEXT;
}
/**
 * Create a new channel context
 *
 * Use this for isolated channel management in components
 */
export function createChannelContext(options = {}) {
    const ctx = new ChannelContext(options);
    if (options.name) {
        CONTEXT_REGISTRY.set(options.name, ctx);
    }
    return ctx;
}
/**
 * Get or create a named context (shared across components)
 */
export function getOrCreateContext(name, options = {}) {
    if (CONTEXT_REGISTRY.has(name)) {
        return CONTEXT_REGISTRY.get(name);
    }
    return createChannelContext({ ...options, name });
}
/**
 * Get an existing context by name
 */
export function getContext(name) {
    return CONTEXT_REGISTRY.get(name);
}
/**
 * Delete a context from the registry
 */
export function deleteContext(name) {
    const ctx = CONTEXT_REGISTRY.get(name);
    if (ctx) {
        ctx.close();
        return CONTEXT_REGISTRY.delete(name);
    }
    return false;
}
/**
 * Get all registered context names
 */
export function getContextNames() {
    return [...CONTEXT_REGISTRY.keys()];
}
/**
 * Quick helper: Create channels in a new context
 *
 * @example
 * const { context, channels } = createChannelsInContext(["ui", "data", "api"]);
 */
export function createChannelsInContext(channelNames, contextOptions = {}) {
    const context = createChannelContext(contextOptions);
    const channels = context.createChannels(channelNames);
    return { context, channels };
}
/**
 * Quick helper: Import module in a new context's channel
 *
 * @example
 * const { context, module } = await importModuleInContext("myChannel", "./worker-module.ts");
 */
export async function importModuleInContext(channelName, url, options = {}) {
    const context = createChannelContext(options.contextOptions);
    const module = await context.importModuleInChannel(channelName, url, {
        channelOptions: options.channelOptions,
        importOptions: options.importOptions
    });
    return { context, module };
}
// ============================================================================
// DEFAULT CONTEXT SHORTCUTS
// ============================================================================
/**
 * Add a worker channel to the default global context
 *
 * @example
 * const endpoint = await addWorkerChannel("compute", new Worker("./worker.js"));
 */
export async function addWorkerChannel(name, worker, options = {}) {
    return getDefaultContext().addWorker(name, worker, options);
}
/**
 * Add a MessagePort channel to the default global context
 *
 * @example
 * const endpoint = await addPortChannel("iframe-comm", port);
 */
export async function addPortChannel(name, port, options = {}) {
    return getDefaultContext().addPort(name, port, options);
}
/**
 * Add a BroadcastChannel to the default global context
 *
 * @example
 * const endpoint = await addBroadcastChannel("cross-tab");
 */
export async function addBroadcastChannel(name, broadcastName, options = {}) {
    return getDefaultContext().addBroadcast(name, broadcastName, options);
}
/**
 * Add a self channel to the default global context
 *
 * @example
 * const endpoint = addSelfChannelToDefault("local");
 */
export function addSelfChannelToDefault(name, options = {}) {
    return getDefaultContext().addSelfChannel(name, options);
}
/**
 * Register a deferred channel in the default context
 *
 * @example
 * deferChannel("heavy-worker", async () => {
 *     const worker = new Worker("./heavy.js");
 *     return getDefaultContext().addWorker("heavy-worker", worker);
 * });
 *
 * // Later, when needed:
 * const endpoint = await initDeferredChannel("heavy-worker");
 */
export function deferChannel(name, initFn) {
    getDefaultContext().defer(name, initFn);
}
/**
 * Initialize a deferred channel in the default context
 */
export async function initDeferredChannel(name) {
    return getDefaultContext().initDeferred(name);
}
/**
 * Get channel from default context (initializing deferred if needed)
 */
export async function getChannelFromDefault(name) {
    return getDefaultContext().getChannelAsync(name);
}
/**
 * Create a MessageChannel pair in the default context
 *
 * @example
 * const { channel1, channel2 } = createDefaultChannelPair("ui", "worker-proxy");
 */
export function createDefaultChannelPair(name1, name2, options = {}) {
    return getDefaultContext().createChannelPair(name1, name2, options);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQ2hhbm5lbENvbnRleHQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJDaGFubmVsQ29udGV4dC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7Ozs7OztHQWFHO0FBRUgsT0FBTyxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUUsTUFBTSxXQUFXLENBQUM7QUFDN0MsT0FBTyxFQUlILGlCQUFpQixFQUNqQixhQUFhLEVBQ2hCLE1BQU0sY0FBYyxDQUFDO0FBQ3RCLE9BQU8sRUFHSCxjQUFjLEVBRWpCLE1BQU0sMEJBQTBCLENBQUM7QUFTbEMsT0FBTyxFQUFFLGlCQUFpQixFQUF1QixNQUFNLG9CQUFvQixDQUFDO0FBQzVFLE9BQU8sRUFBRSxjQUFjLEVBQWtELE1BQU0sb0JBQW9CLENBQUM7QUFJcEcsT0FBTyxFQUFFLGNBQWMsRUFBeUIsTUFBTSxrQkFBa0IsQ0FBQztBQUN6RSxPQUFPLEVBQ0gsa0JBQWtCLEVBTXJCLE1BQU0sNEJBQTRCLENBQUM7QUFFcEMsaUVBQWlFO0FBQ2pFLE1BQU0sVUFBVSxHQUFpQixJQUFJLEdBQUcsQ0FBQyx3QkFBd0IsRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBZ0dwRiwrRUFBK0U7QUFDL0Usd0JBQXdCO0FBQ3hCLCtFQUErRTtBQUUvRSxNQUFNLE9BQU8sbUJBQW1CO0lBS2hCO0lBQ0E7SUFDQTtJQU5KLFdBQVcsQ0FBb0I7SUFDL0IsUUFBUSxDQUFpQjtJQUVqQyxZQUNZLFFBQWdCLEVBQ2hCLFFBQXdCLEVBQ3hCLFdBQThCLEVBQUU7UUFGaEMsYUFBUSxHQUFSLFFBQVEsQ0FBUTtRQUNoQixhQUFRLEdBQVIsUUFBUSxDQUFnQjtRQUN4QixhQUFRLEdBQVIsUUFBUSxDQUF3QjtRQUV4QyxJQUFJLENBQUMsV0FBVyxHQUFHLGFBQWEsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUMzQyxJQUFJLENBQUMsUUFBUSxHQUFHLGlCQUFpQixDQUFDLFFBQVEsQ0FBQyxDQUFD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WixVQUE2QixFQUFFO0lBRS9CLE9BQU8saUJBQWlCLEVBQUUsQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDO0FBQzdELENBQUM7QUFFRDs7Ozs7Ozs7Ozs7R0FXRztBQUNILE1BQU0sVUFBVSxZQUFZLENBQ3hCLElBQVksRUFDWixNQUFzQztJQUV0QyxpQkFBaUIsRUFBRSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUM7QUFDNUMsQ0FBQztBQUVEOztHQUVHO0FBQ0gsTUFBTSxDQUFDLEtBQUssVUFBVSxtQkFBbUIsQ0FBQyxJQUFZO0lBQ2xELE9BQU8saUJBQWlCLEVBQUUsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDbEQsQ0FBQztBQUVEOztHQUVHO0FBQ0gsTUFBTSxDQUFDLEtBQUssVUFBVSxxQkFBcUIsQ0FBQyxJQUFZO0lBQ3BELE9BQU8saUJBQWlCLEVBQUUsQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDckQsQ0FBQztBQUVEOzs7OztHQUtHO0FBQ0gsTUFBTSxVQUFVLHdCQUF3QixDQUNwQyxLQUFhLEVBQ2IsS0FBYSxFQUNiLFVBQTZCLEVBQUU7SUFFL0IsT0FBTyxpQkFBaUIsRUFBRSxDQUFDLGlCQUFpQixDQUFDLEtBQUssRUFBRSxLQUFLLEVBQUUsT0FBTyxDQUFDLENBQUM7QUFDeEUsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQ2hhbm5lbCBDb250ZXh0IC0gTXVsdGktQ2hhbm5lbCBTdXBwb3J0XG4gKlxuICogUHJvdmlkZXMgYSB3YXkgdG8gY3JlYXRlIG11bHRpcGxlIGluZGVwZW5kZW50IGNoYW5uZWwgZW5kcG9pbnRzL3BvcnRzXG4gKiBpbiB0aGUgc2FtZSBjb250ZXh0LiBTdWl0YWJsZSBmb3I6XG4gKiAtIExhenktbG9hZGVkIGNvbXBvbmVudHNcbiAqIC0gTXVsdGlwbGUgRE9NIGNvbXBvbmVudHMgd2l0aCBpc29sYXRlZCBjb21tdW5pY2F0aW9uXG4gKiAtIE1pY3JvLWZyb250ZW5kIGFyY2hpdGVjdHVyZXNcbiAqIC0gQ29tcG9uZW50LWxldmVsIGNoYW5uZWwgaXNvbGF0aW9uXG4gKlxuICogdk5leHQgYXJjaGl0ZWN0dXJlIG5vdGU6XG4gKiAtIENoYW5uZWxDb250ZXh0IGNvbXBvc2VzIFVuaWZpZWRDaGFubmVsIGluc3RhbmNlcyBwZXIgZW5kcG9pbnQuXG4gKiAtIFVuaWZpZWRDaGFubmVsIGlzIHRoZSBjYW5vbmljYWwgdHJhbnNwb3J0L2ludm9jYXRpb24gcnVudGltZSBlbmdpbmUuXG4gKi9cblxuaW1wb3J0IHsgVVVJRHY0LCBQcm9taXNlZCB9IGZyb20gXCJmZXN0L2NvcmVcIjtcbmltcG9ydCB7XG4gICAgQ2hhbm5lbENvbm5lY3Rpb24sXG4gICAgdHlwZSBDb25uZWN0aW9uT3B0aW9ucyxcbiAgICB0eXBlIFRyYW5zcG9ydFR5cGUsXG4gICAgZ2V0Q29ubmVjdGlvblBvb2wsXG4gICAgZ2V0Q29ubmVjdGlvblxufSBmcm9tIFwiLi9Db25uZWN0aW9uXCI7XG5pbXBvcnQge1xuICAgIHR5cGUgQ2hhbm5lbE1lc3NhZ2UsXG4gICAgdHlwZSBTdWJzY3JpcHRpb24sXG4gICAgQ2hhbm5lbFN1YmplY3QsXG4gICAgZmlsdGVyXG59IGZyb20gXCIuLi9vYnNlcnZhYmxlL09ic2VydmFibGVcIjtcbmltcG9ydCB7XG4gICAgVHJhbnNwb3J0QWRhcHRlcixcbiAgICBXb3JrZXJUcmFuc3BvcnQsXG4gICAgTWVzc2FnZVBvcnRUcmFuc3BvcnQsXG4gICAgQnJvYWRjYXN0Q2hhbm5lbFRyYW5zcG9ydCxcbiAgICBTZWxmVHJhbnNwb3J0LFxuICAgIFRyYW5zcG9ydEZhY3Rvcnlcbn0gZnJvbSBcIi4uL3RyYW5zcG9ydC9UcmFuc3BvcnRcIjtcbmltcG9ydCB7IGdldENoYW5uZWxTdG9yYWdlLCB0eXBlIENoYW5uZWxTdG9yYWdlIH0gZnJvbSBcIi4uL3N0b3JhZ2UvU3RvcmFnZVwiO1xuaW1wb3J0IHsgV1JlZmxlY3RBY3Rpb24sIHR5cGUgV1JlZmxlY3REZXNjcmlwdG9yLCB0eXBlIFdSZXEsIHR5cGUgV1Jlc3AgfSBmcm9tIFwiLi4vdHlwZXMvSW50ZXJmYWNlXCI7XG5pbXBvcnQgeyBtYWtlUmVxdWVzdFByb3h5IH0gZnJvbSBcIi4uL3Byb3h5L1JlcXVlc3RQcm94eVwiO1xuaW1wb3J0IHsgcmVhZEJ5UGF0aCwgcmVnaXN0ZXJlZEluUGF0aCB9IGZyb20gXCIuLi9zdG9yYWdlL0RhdGFCYXNlXCI7XG5pbXBvcnQgeyBoYW5kbGVSZXF1ZXN0IGFzIGNvcmVIYW5kbGVSZXF1ZXN0IH0gZnJvbSBcIi4uLy4uL2NvcmUvUmVxdWVzdEhhbmRsZXJcIjtcbmltcG9ydCB7IFVuaWZpZWRDaGFubmVsLCB0eXBlIFRyYW5zcG9ydEJpbmRpbmcgfSBmcm9tIFwiLi9VbmlmaWVkQ2hhbm5lbFwiO1xuaW1wb3J0IHtcbiAgICBDb25uZWN0aW9uUmVnaXN0cnksXG4gICAgdHlwZSBDb25uZWN0aW9uRGlyZWN0aW9uLFxuICAgIHR5cGUgQ29ubmVjdGlvblN0YXR1cyxcbiAgICB0eXBlIENvbm5lY3Rpb25JbmZvLFxuICAgIHR5cGUgQ29ubmVjdGlvbkV2ZW50IGFzIEJhc2VDb25uZWN0aW9uRXZlbnQsXG4gICAgdHlwZSBRdWVyeUNvbm5lY3Rpb25zT3B0aW9ucyBhcyBCYXNlUXVlcnlDb25uZWN0aW9uc09wdGlvbnNcbn0gZnJvbSBcIi4vaW50ZXJuYWwvQ29ubmVjdGlvbk1vZGVsXCI7XG5cbi8vIFdvcmtlciBjb2RlIC0gdXNlIGRpcmVjdCBVUkwgKHdvcmtzIGluIGJvdGggVml0ZSBhbmQgbm9uLVZpdGUpXG5jb25zdCB3b3JrZXJDb2RlOiBzdHJpbmcgfCBVUkwgPSBuZXcgVVJMKFwiLi4vdHJhbnNwb3J0L1dvcmtlci50c1wiLCBpbXBvcnQubWV0YS51cmwpO1xuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBUWVBFU1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKiogU3VwcG9ydGVkIHRyYW5zcG9ydCB0eXBlcyBmb3IgZHluYW1pYyBjaGFubmVsIGNyZWF0aW9uICovXG5leHBvcnQgdHlwZSBEeW5hbWljVHJhbnNwb3J0VHlwZSA9XG4gICAgfCBcIndvcmtlclwiXG4gICAgfCBcInNoYXJlZC13b3JrZXJcIlxuICAgIHwgXCJzZXJ2aWNlLXdvcmtlclwiXG4gICAgfCBcIm1lc3NhZ2UtcG9ydFwiXG4gICAgfCBcImJyb2FkY2FzdFwiXG4gICAgfCBcImNocm9tZS1ydW50aW1lXCJcbiAgICB8IFwiY2hyb21lLXRhYnNcIlxuICAgIHwgXCJjaHJvbWUtcG9ydFwiXG4gICAgfCBcImNocm9tZS1leHRlcm5hbFwiXG4gICAgfCBcIndlYnNvY2tldFwiXG4gICAgfCBcInJ0Y1wiXG4gICAgfCBcInNlbGZcIjtcblxuLyoqIENvbmZpZ3VyYXRpb24gZm9yIGR5bmFtaWMgdHJhbnNwb3J0IGNyZWF0aW9uICovXG5leHBvcnQgaW50ZXJmYWNlIER5bmFtaWNUcmFuc3BvcnRDb25maWcge1xuICAgIC8qKiBUcmFuc3BvcnQgdHlwZSAqL1xuICAgIHR5cGU6IER5bmFtaWNUcmFuc3BvcnRUeXBlO1xuICAgIC8qKiBXb3JrZXIgVVJMIG9yIGluc3RhbmNlICovXG4gICAgd29ya2VyPzogV29ya2VyIHwgU2hhcmVkV29ya2VyIHwgVVJMIHwgc3RyaW5nO1xuICAgIC8qKiBNZXNzYWdlUG9ydCBpbnN0YW5jZSAqL1xuICAgIHBvcnQ/OiBNZXNzYWdlUG9ydDtcbiAgICAvKiogQnJvYWRjYXN0Q2hhbm5lbCBuYW1lIG9yIGluc3RhbmNlICovXG4gICAgYnJvYWRjYXN0PzogQnJvYWRjYXN0Q2hhbm5lbCB8IHN0cmluZztcbiAgICAvKiogV2ViU29ja2V0IFVSTCBvciBpbnN0YW5jZSAqL1xuICAgIHNvY2tldD86IFdlYlNvY2tldCB8IHN0cmluZztcbiAgICAvKiogQWRkaXRpb25hbCBvcHRpb25zICovXG4gICAgb3B0aW9ucz86IENvbm5lY3Rpb25PcHRpb25zO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIENoYW5uZWxDb250ZXh0T3B0aW9ucyB7XG4gICAgLyoqIENvbnRleHQgbmFtZSBmb3IgaWRlbnRpZmljYXRpb24gKi9cbiAgICBuYW1lPzogc3RyaW5nO1xuICAgIC8qKiBBdXRvLWNvbm5lY3QgY2hhbm5lbHMgb24gY3JlYXRpb24gKi9cbiAgICBhdXRvQ29ubmVjdD86IGJvb2xlYW47XG4gICAgLyoqIERlZmF1bHQgY29ubmVjdGlvbiBvcHRpb25zIGZvciBjaGFubmVscyAqL1xuICAgIGRlZmF1bHRPcHRpb25zPzogQ29ubmVjdGlvbk9wdGlvbnM7XG4gICAgLyoqIEVuYWJsZSBpc29sYXRlZCBzdG9yYWdlIHBlciBjb250ZXh0ICovXG4gICAgaXNvbGF0ZWRTdG9yYWdlPzogYm9vbGVhbjtcbiAgICAvKiogVXNlIGdsb2JhbFRoaXMvc2VsZiBhcyBkZWZhdWx0IGJyb2FkY2FzdCB0YXJnZXQgKi9cbiAgICB1c2VHbG9iYWxTZWxmPzogYm9vbGVhbjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBDaGFubmVsRW5kcG9pbnQge1xuICAgIC8qKiBDaGFubmVsIG5hbWUgKi9cbiAgICBuYW1lOiBzdHJpbmc7XG4gICAgLyoqIENoYW5uZWwgaGFuZGxlciBpbnN0YW5jZSAqL1xuICAgIGhhbmRsZXI6IENoYW5uZWxIYW5kbGVyO1xuICAgIC8qKiBDaGFubmVsIGNvbm5lY3Rpb24gKi9cbiAgICBjb25uZWN0aW9uOiBDaGFubmVsQ29ubmVjdGlvbjtcbiAgICAvKiogU3Vic2NyaXB0aW9ucyBmb3IgY2xlYW51cCAqL1xuICAgIHN1YnNjcmlwdGlvbnM6IFN1YnNjcmlwdGlvbltdO1xuICAgIC8qKiBBc3NvY2lhdGVkIHRyYW5zcG9ydCBpZiBhbnkgKi9cbiAgICB0cmFuc3BvcnQ/OiBUcmFuc3BvcnRBZGFwdGVyO1xuICAgIC8qKiBUcmFuc3BvcnQgdHlwZSAqL1xuICAgIHRyYW5zcG9ydFR5cGU/OiBEeW5hbWljVHJhbnNwb3J0VHlwZTtcbiAgICAvKiogUmVhZHkgcHJvbWlzZSAqL1xuICAgIHJlYWR5OiBQcm9taXNlPFJlbW90ZUNoYW5uZWxIZWxwZXIgfCBudWxsPjtcbiAgICAvKiogRGVmZXJyZWQgaW5pdGlhbGl6YXRpb24gZnVuY3Rpb24gKi9cbiAgICBkZWZlcnJlZEluaXQ/OiAoKSA9PiBQcm9taXNlPFJlbW90ZUNoYW5uZWxIZWxwZXIgfCBudWxsPjtcbiAgICAvKiogQmFja2luZyB1bmlmaWVkIGNoYW5uZWwgZW5naW5lICh2TmV4dCBjb3JlKSAqL1xuICAgIHVuaWZpZWQ/OiBVbmlmaWVkQ2hhbm5lbDtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBSZW1vdGVDaGFubmVsSW5mbyB7XG4gICAgY2hhbm5lbDogc3RyaW5nO1xuICAgIGNvbnRleHQ6IENoYW5uZWxDb250ZXh0O1xuICAgIG1lc3NhZ2VDaGFubmVsPzogTWVzc2FnZUNoYW5uZWw7XG4gICAgcmVtb3RlOiBQcm9taXNlPFJlbW90ZUNoYW5uZWxIZWxwZXI+O1xuICAgIHRyYW5zcG9ydD86IFdvcmtlciB8IEJyb2FkY2FzdENoYW5uZWwgfCBNZXNzYWdlUG9ydCB8IFdlYlNvY2tldDtcbiAgICB0cmFuc3BvcnRUeXBlPzogRHluYW1pY1RyYW5zcG9ydFR5cGU7XG59XG5cbmV4cG9ydCB0eXBlIENvbnRleHRDb25uZWN0aW9uRGlyZWN0aW9uID0gQ29ubmVjdGlvbkRpcmVjdGlvbjtcbmV4cG9ydCB0eXBlIENvbnRleHRDb25uZWN0aW9uU3RhdHVzID0gQ29ubmVjdGlvblN0YXR1cztcbmV4cG9ydCB0eXBlIENvbnRleHRDb25uZWN0aW9uSW5mbyA9IENvbm5lY3Rpb25JbmZvPER5bmFtaWNUcmFuc3BvcnRUeXBlIHwgVHJhbnNwb3J0VHlwZSB8IFwiaW50ZXJuYWxcIj4gJiB7IGNvbnRleHRJZDogc3RyaW5nIH07XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ29ubmVjdGlvbkV2ZW50IGV4dGVuZHMgT21pdDxCYXNlQ29ubmVjdGlvbkV2ZW50PER5bmFtaWNUcmFuc3BvcnRUeXBlIHwgVHJhbnNwb3J0VHlwZSB8IFwiaW50ZXJuYWxcIj4sIFwiY29ubmVjdGlvblwiPiB7XG4gICAgdHlwZTogXCJjb25uZWN0ZWRcIiB8IFwibm90aWZpZWRcIiB8IFwiZGlzY29ubmVjdGVkXCI7XG4gICAgY29ubmVjdGlvbjogQ29udGV4dENvbm5lY3Rpb25JbmZvO1xuICAgIHRpbWVzdGFtcDogbnVtYmVyO1xuICAgIHBheWxvYWQ/OiBhbnk7XG59XG5cbmV4cG9ydCB0eXBlIFF1ZXJ5Q29ubmVjdGlvbnNPcHRpb25zID0gQmFzZVF1ZXJ5Q29ubmVjdGlvbnNPcHRpb25zPER5bmFtaWNUcmFuc3BvcnRUeXBlIHwgVHJhbnNwb3J0VHlwZSB8IFwiaW50ZXJuYWxcIj47XG5cbmV4cG9ydCB0eXBlIE5hdGl2ZUNoYW5uZWxUcmFuc3BvcnQgPSBXb3JrZXIgfCBCcm9hZGNhc3RDaGFubmVsIHwgTWVzc2FnZVBvcnQgfCBXZWJTb2NrZXQ7XG5cblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gUkVNT1RFIENIQU5ORUwgSEVMUEVSXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbmV4cG9ydCBjbGFzcyBSZW1vdGVDaGFubmVsSGVscGVyIHtcbiAgICBwcml2YXRlIF9jb25uZWN0aW9uOiBDaGFubmVsQ29ubmVjdGlvbjtcbiAgICBwcml2YXRlIF9zdG9yYWdlOiBDaGFubmVsU3RvcmFnZTtcblxuICAgIGNvbnN0cnVjdG9yKFxuICAgICAgICBwcml2YXRlIF9jaGFubmVsOiBzdHJpbmcsXG4gICAgICAgIHByaXZhdGUgX2NvbnRleHQ6IENoYW5uZWxDb250ZXh0LFxuICAgICAgICBwcml2YXRlIF9vcHRpb25zOiBDb25uZWN0aW9uT3B0aW9ucyA9IHt9XG4gICAgKSB7XG4gICAgICAgIHRoaXMuX2Nvbm5lY3Rpb24gPSBnZXRDb25uZWN0aW9uKF9jaGFubmVsKTtcbiAgICAgICAgdGhpcy5fc3RvcmFnZSA9IGdldENoYW5uZWxTdG9yYWdlKF9jaGFubmVsKTtcbiAgICB9XG5cbiAgICBhc3luYyByZXF1ZXN0KFxuICAgICAgICBwYXRoOiBzdHJpbmdbXSB8IFdSZWZsZWN0RGVzY3JpcHRvcixcbiAgICAgICAgYWN0aW9uOiBXUmVmbGVjdEFjdGlvbiB8IGFueVtdLFxuICAgICAgICBhcmdzOiBhbnlbXSB8IGFueSxcbiAgICAgICAgb3B0aW9uczogYW55ID0ge31cbiAgICApOiBQcm9taXNlPGFueT4ge1xuICAgICAgICBsZXQgbm9ybWFsaXplZFBhdGggPSB0eXBlb2YgcGF0aCA9PT0gXCJzdHJpbmdcIiA/IFtwYXRoXSA6IHBhdGg7XG4gICAgICAgIGxldCBub3JtYWxpemVkQWN0aW9uID0gYWN0aW9uO1xuICAgICAgICBsZXQgbm9ybWFsaXplZEFyZ3MgPSBhcmdzO1xuXG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KGFjdGlvbikgJiYgaXNSZWZsZWN0QWN0aW9uKHBhdGgpKSB7XG4gICAgICAgICAgICBvcHRpb25zID0gYXJncztcbiAgICAgICAgICAgIG5vcm1hbGl6ZWRBcmdzID0gYWN0aW9uO1xuICAgICAgICAgICAgbm9ybWFsaXplZEFjdGlvbiA9IHBhdGggYXMgdW5rbm93biBhcyBXUmVmbGVjdEFjdGlvbjtcbiAgICAgICAgICAgIG5vcm1hbGl6ZWRQYXRoID0gW107XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBoYW5kbGVyID0gdGhpcy5fY29udGV4dC5nZXRIb3N0KCk7XG4gICAgICAgIHJldHVybiBoYW5kbGVyPy5yZXF1ZXN0KFxuICAgICAgICAgICAgbm9ybWFsaXplZFBhdGggYXMgc3RyaW5nW10sXG4gICAgICAgICAgICBub3JtYWxpemVkQWN0aW9uIGFzIFdSZWZsZWN0QWN0aW9uLFxuICAgICAgICAgICAgbm9ybWFsaXplZEFyZ3MsXG4gICAgICAgICAgICBvcHRpb25zLFxuICAgICAgICAgICAgdGhpcy5fY2hhbm5lbFxuICAgICAgICApO1xuICAgIH1cblxuICAgIGFzeW5jIGRvSW1wb3J0TW9kdWxlKHVybDogc3RyaW5nLCBvcHRpb25zOiBhbnkgPSB7fSk6IFByb21pc2U8YW55PiB7XG4gICAgICAgIHJldHVybiB0aGlzLnJlcXVlc3QoW10sIFdSZWZsZWN0QWN0aW9uLklNUE9SVCwgW3VybF0sIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIGFzeW5jIGRlZmVyTWVzc2FnZShwYXlsb2FkOiBhbnksIG9wdGlvbnM6IHsgcHJpb3JpdHk/OiBudW1iZXI7IGV4cGlyZXNJbj86IG51bWJlciB9ID0ge30pOiBQcm9taXNlPHN0cmluZz4ge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3RvcmFnZS5kZWZlcih7XG4gICAgICAgICAgICBjaGFubmVsOiB0aGlzLl9jaGFubmVsLFxuICAgICAgICAgICAgc2VuZGVyOiB0aGlzLl9jb250ZXh0Lmhvc3ROYW1lLFxuICAgICAgICAgICAgdHlwZTogXCJyZXF1ZXN0XCIsXG4gICAgICAgICAgICBwYXlsb2FkXG4gICAgICAgIH0sIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIGFzeW5jIGdldFBlbmRpbmdNZXNzYWdlcygpOiBQcm9taXNlPGFueVtdPiB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zdG9yYWdlLmdldERlZmVycmVkTWVzc2FnZXModGhpcy5fY2hhbm5lbCwgeyBzdGF0dXM6IFwicGVuZGluZ1wiIH0pO1xuICAgIH1cblxuICAgIGdldCBjb25uZWN0aW9uKCk6IENoYW5uZWxDb25uZWN0aW9uIHsgcmV0dXJuIHRoaXMuX2Nvbm5lY3Rpb247IH1cbiAgICBnZXQgY2hhbm5lbE5hbWUoKTogc3RyaW5nIHsgcmV0dXJuIHRoaXMuX2NoYW5uZWw7IH1cbiAgICBnZXQgY29udGV4dCgpOiBDaGFubmVsQ29udGV4dCB7IHJldHVybiB0aGlzLl9jb250ZXh0OyB9XG59XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIENIQU5ORUwgSEFORExFUiAoUGVyLWVuZHBvaW50KVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5leHBvcnQgY2xhc3MgQ2hhbm5lbEhhbmRsZXIge1xuICAgIC8vIEB0cy1pZ25vcmVcbiAgICAvL3ByaXZhdGUgX2ZvclJlc29sdmVzID0gbmV3IE1hcDxzdHJpbmcsIFByb21pc2VXaXRoUmVzb2x2ZXJzPGFueT4+KCk7XG4gICAgLy9wcml2YXRlIF9icm9hZGNhc3RzOiBSZWNvcmQ8c3RyaW5nLCBUcmFuc3BvcnRCaW5kaW5nPE5hdGl2ZUNoYW5uZWxUcmFuc3BvcnQ+PiA9IHt9O1xuICAgIC8vcHJpdmF0ZSBfc3Vic2NyaXB0aW9uczogU3Vic2NyaXB0aW9uW10gPSBbXTtcbiAgICBwcml2YXRlIF9jb25uZWN0aW9uOiBDaGFubmVsQ29ubmVjdGlvbjtcbiAgICBwcml2YXRlIF91bmlmaWVkOiBVbmlmaWVkQ2hhbm5lbDtcblxuICAgIHByaXZhdGUgZ2V0IF9mb3JSZXNvbHZlcygpOiBNYXA8c3RyaW5nLCBQcm9taXNlV2l0aFJlc29sdmVyczxhbnk+PiB7XG4gICAgICAgIHJldHVybiB0aGlzLl91bmlmaWVkLl9fZ2V0UHJpdmF0ZShcIl9wZW5kaW5nXCIpO1xuICAgIH1cblxuICAgIHByaXZhdGUgZ2V0IF9zdWJzY3JpcHRpb25zKCk6IFN1YnNjcmlwdGlvbltdIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3VuaWZpZWQuX19nZXRQcml2YXRlKFwiX3N1YnNjcmlwdGlvbnNcIik7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBnZXQgX2Jyb2FkY2FzdHMoKTogTWFwPHN0cmluZywgVHJhbnNwb3J0QmluZGluZz4ge1xuICAgICAgICByZXR1cm4gdGhpcy5fdW5pZmllZC5fX2dldFByaXZhdGUoXCJfdHJhbnNwb3J0c1wiKTtcbiAgICB9XG4gICAgXG5cbiAgICBjb25zdHJ1Y3RvcihcbiAgICAgICAgcHJpdmF0ZSBfY2hhbm5lbDogc3RyaW5nLFxuICAgICAgICBwcml2YXRlIF9jb250ZXh0OiBDaGFubmVsQ29udGV4dCxcbiAgICAgICAgcHJpdmF0ZSBfb3B0aW9uczogQ29ubmVjdGlvbk9wdGlvbnMgPSB7fVxuICAgICkge1xuICAgICAgICB0aGlzLl9jb25uZWN0aW9uID0gZ2V0Q29ubmVjdGlvblBvb2woKS5nZXRPckNyZWF0ZShfY2hhbm5lbCwgXCJpbnRlcm5hbFwiLCBfb3B0aW9ucyk7XG4gICAgICAgIHRoaXMuX3VuaWZpZWQgPSBuZXcgVW5pZmllZENoYW5uZWwoe1xuICAgICAgICAgICAgbmFtZTogX2NoYW5uZWwsXG4gICAgICAgICAgICBhdXRvTGlzdGVuOiBmYWxzZSxcbiAgICAgICAgICAgIHRpbWVvdXQ6IF9vcHRpb25zPy50aW1lb3V0XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGNyZWF0ZVJlbW90ZUNoYW5uZWwoXG4gICAgICAgIGNoYW5uZWw6IHN0cmluZyxcbiAgICAgICAgb3B0aW9uczogQ29ubmVjdGlvbk9wdGlvbnMgPSB7fSxcbiAgICAgICAgYnJvYWRjYXN0PzogVHJhbnNwb3J0QmluZGluZzxOYXRpdmVDaGFubmVsVHJhbnNwb3J0PiB8IE5hdGl2ZUNoYW5uZWxUcmFuc3BvcnQgfCBudWxsXG4gICAgKTogUmVtb3RlQ2hhbm5lbEhlbHBlciB7XG4gICAgICAgIGNvbnN0IHRyYW5zcG9ydCA9IG5vcm1hbGl6ZVRyYW5zcG9ydEJpbmRpbmcoKGJyb2FkY2FzdCBhcyBhbnkpID8/ICh0aGlzLl9jb250ZXh0LiRjcmVhdGVPclVzZUV4aXN0aW5nUmVtb3RlKGNoYW5uZWwsIG9wdGlvbnMsIGJyb2FkY2FzdCA/PyBudWxsKSk/Lm1lc3NhZ2VDaGFubmVsPy5wb3J0MSk7XG4gICAgICAgIGNvbnN0IHRyYW5zcG9ydFR5cGUgPSBnZXREeW5hbWljVHJhbnNwb3J0VHlwZSh0cmFuc3BvcnQ/LnRhcmdldCA/PyB0cmFuc3BvcnQpO1xuXG4gICAgICAgIC8vXG4gICAgICAgIHRoaXMuX3VuaWZpZWQubGlzdGVuKHRyYW5zcG9ydD8udGFyZ2V0LCB7IHRhcmdldENoYW5uZWw6IGNoYW5uZWwgfSk7XG5cbiAgICAgICAgLypcbiAgICAgICAgdHJhbnNwb3J0Py5hZGRFdmVudExpc3RlbmVyPy4oJ21lc3NhZ2UnLCAoKGV2ZW50OiBNZXNzYWdlRXZlbnQpID0+IHtcbiAgICAgICAgICAgIGlmIChldmVudC5kYXRhLnR5cGUgPT09IFwicmVxdWVzdFwiICYmIGV2ZW50LmRhdGEuY2hhbm5lbCA9PT0gdGhpcy5fY2hhbm5lbCkge1xuICAgICAgICAgICAgICAgIHRoaXMuaGFuZGxlQW5kUmVzcG9uc2UoZXZlbnQuZGF0YS5wYXlsb2FkLCBldmVudC5kYXRhLnJlcUlkKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoZXZlbnQuZGF0YS50eXBlID09PSBcInJlc3BvbnNlXCIpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnJlc29sdmVSZXNwb25zZShldmVudC5kYXRhLnJlcUlkLCB7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdDogZXZlbnQuZGF0YS5wYXlsb2FkLnJlc3VsdCxcbiAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRvcjogZXZlbnQuZGF0YS5wYXlsb2FkLmRlc2NyaXB0b3IsXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IGV2ZW50LmRhdGEucGF5bG9hZC50eXBlXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGV2ZW50LmRhdGEudHlwZSA9PT0gXCJzaWduYWxcIikge1xuICAgICAgICAgICAgICAgIHRoaXMuX2NvbnRleHQuJG9ic2VydmVTaWduYWwoe1xuICAgICAgICAgICAgICAgICAgICBsb2NhbENoYW5uZWw6IHRoaXMuX2NoYW5uZWwsXG4gICAgICAgICAgICAgICAgICAgIHJlbW90ZUNoYW5uZWw6IGV2ZW50LmRhdGEucGF5bG9hZD8uZnJvbSA/PyBldmVudC5kYXRhLnNlbmRlciA/PyBjaGFubmVsLFxuICAgICAgICAgICAgICAgICAgICBzZW5kZXI6IGV2ZW50LmRhdGEuc2VuZGVyID8/IGV2ZW50LmRhdGEucGF5bG9hZD8uZnJvbSA/PyBcInVua25vd25cIixcbiAgICAgICAgICAgICAgICAgICAgdHJhbnNwb3J0VHlwZTogZXZlbnQuZGF0YS50cmFuc3BvcnRUeXBlID8/IHRyYW5zcG9ydFR5cGUsXG4gICAgICAgICAgICAgICAgICAgIHBheWxvYWQ6IGV2ZW50LmRhdGEucGF5bG9hZFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KSBhcyBFdmVudExpc3RlbmVyKTtcbiAgICAgICAgXG4gICAgICAgIHRyYW5zcG9ydD8uYWRkRXZlbnRMaXN0ZW5lcj8uKCdlcnJvcicsIChldmVudCkgPT4ge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcihldmVudCk7XG4gICAgICAgICAgICB0cmFuc3BvcnQ/LmNsb3NlPy4oKTtcbiAgICAgICAgfSk7Ki9cblxuICAgICAgICBpZiAodHJhbnNwb3J0KSB7XG4gICAgICAgICAgICB0aGlzLl9icm9hZGNhc3RzPy5zZXQ/LihjaGFubmVsLCB0cmFuc3BvcnQpO1xuICAgICAgICAgICAgY29uc3QgY2FuQXR0YWNoVW5pZmllZCA9ICEodHJhbnNwb3J0VHlwZSA9PT0gXCJzZWxmXCIgJiYgdHlwZW9mIHBvc3RNZXNzYWdlID09PSBcInVuZGVmaW5lZFwiKTtcbiAgICAgICAgICAgIGlmIChjYW5BdHRhY2hVbmlmaWVkKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fdW5pZmllZC5jb25uZWN0KHRyYW5zcG9ydCwgeyB0YXJnZXRDaGFubmVsOiBjaGFubmVsIH0pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0aGlzLl9jb250ZXh0LiRyZWdpc3RlckNvbm5lY3Rpb24oe1xuICAgICAgICAgICAgICAgIGxvY2FsQ2hhbm5lbDogdGhpcy5fY2hhbm5lbCxcbiAgICAgICAgICAgICAgICByZW1vdGVDaGFubmVsOiBjaGFubmVsLFxuICAgICAgICAgICAgICAgIHNlbmRlcjogdGhpcy5fY2hhbm5lbCxcbiAgICAgICAgICAgICAgICBkaXJlY3Rpb246IFwib3V0Z29pbmdcIixcbiAgICAgICAgICAgICAgICB0cmFuc3BvcnRUeXBlXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdGhpcy5ub3RpZnlDaGFubmVsKGNoYW5uZWwsIHtcbiAgICAgICAgICAgICAgICBjb250ZXh0SWQ6IHRoaXMuX2NvbnRleHQuaWQsXG4gICAgICAgICAgICAgICAgY29udGV4dE5hbWU6IHRoaXMuX2NvbnRleHQuaG9zdE5hbWVcbiAgICAgICAgICAgIH0sIFwiY29ubmVjdFwiKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vXG4gICAgICAgIHJldHVybiBuZXcgUmVtb3RlQ2hhbm5lbEhlbHBlcihjaGFubmVsLCB0aGlzLl9jb250ZXh0LCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICBnZXRDaGFubmVsKCk6IHN0cmluZyB7IHJldHVybiB0aGlzLl9jaGFubmVsOyB9XG4gICAgZ2V0IGNvbm5lY3Rpb24oKTogQ2hhbm5lbENvbm5lY3Rpb24geyByZXR1cm4gdGhpcy5fY29ubmVjdGlvbjsgfVxuXG4gICAgcmVxdWVzdChcbiAgICAgICAgcGF0aDogc3RyaW5nW10gfCBXUmVmbGVjdEFjdGlvbixcbiAgICAgICAgYWN0aW9uOiBXUmVmbGVjdEFjdGlvbiB8IGFueVtdLFxuICAgICAgICBhcmdzOiBhbnlbXSB8IGFueSxcbiAgICAgICAgb3B0aW9uczogYW55IHwgc3RyaW5nID0ge30sXG4gICAgICAgIHRvQ2hhbm5lbDogc3RyaW5nID0gXCJ3b3JrZXJcIlxuICAgICk6IFByb21pc2U8YW55PiB8IG51bGwge1xuICAgICAgICBsZXQgbm9ybWFsaXplZFBhdGggPSB0eXBlb2YgcGF0aCA9PT0gXCJzdHJpbmdcIiA/IFtwYXRoXSA6IHBhdGg7XG4gICAgICAgIGxldCBub3JtYWxpemVkQXJncyA9IGFyZ3M7XG5cbiAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkoYWN0aW9uKSAmJiBpc1JlZmxlY3RBY3Rpb24ocGF0aCkpIHtcbiAgICAgICAgICAgIHRvQ2hhbm5lbCA9IG9wdGlvbnMgYXMgc3RyaW5nO1xuICAgICAgICAgICAgb3B0aW9ucyA9IGFyZ3M7XG4gICAgICAgICAgICBub3JtYWxpemVkQXJncyA9IGFjdGlvbjtcbiAgICAgICAgICAgIGFjdGlvbiA9IHBhdGggYXMgdW5rbm93biBhcyBXUmVmbGVjdEFjdGlvbjtcbiAgICAgICAgICAgIG5vcm1hbGl6ZWRQYXRoID0gW107XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuX3VuaWZpZWQuaW52b2tlKFxuICAgICAgICAgICAgdG9DaGFubmVsLFxuICAgICAgICAgICAgYWN0aW9uIGFzIFdSZWZsZWN0QWN0aW9uLFxuICAgICAgICAgICAgKG5vcm1hbGl6ZWRQYXRoIGFzIHN0cmluZ1tdKSA/PyBbXSxcbiAgICAgICAgICAgIEFycmF5LmlzQXJyYXkobm9ybWFsaXplZEFyZ3MpID8gbm9ybWFsaXplZEFyZ3MgOiBbbm9ybWFsaXplZEFyZ3NdXG4gICAgICAgICkgYXMgUHJvbWlzZTxhbnk+O1xuICAgIH1cblxuICAgIHByaXZhdGUgcmVzb2x2ZVJlc3BvbnNlKHJlcUlkOiBzdHJpbmcsIHJlc3VsdDogYW55KTogUHJvbWlzZTxhbnk+IHwgdW5kZWZpbmVkIHtcbiAgICAgICAgdGhpcy5fZm9yUmVzb2x2ZXMuZ2V0KHJlcUlkKT8ucmVzb2x2ZT8uKHJlc3VsdCk7XG4gICAgICAgIGNvbnN0IHByb21pc2UgPSB0aGlzLl9mb3JSZXNvbHZlcy5nZXQocmVxSWQpPy5wcm9taXNlO1xuICAgICAgICB0aGlzLl9mb3JSZXNvbHZlcy5kZWxldGUocmVxSWQpO1xuICAgICAgICByZXR1cm4gcHJvbWlzZTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGhhbmRsZUFuZFJlc3BvbnNlKFxuICAgICAgICByZXF1ZXN0OiBXUmVxLFxuICAgICAgICByZXFJZDogc3RyaW5nLFxuICAgICAgICByZXNwb25zZUZuPzogKHJlc3VsdDogYW55LCB0cmFuc2ZlcjogYW55W10pID0+IHZvaWRcbiAgICApOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgLy8gVXNlIHVuaWZpZWQgY29yZSBoYW5kbGVSZXF1ZXN0XG4gICAgICAgIC8qY29uc3QgcmVzdWx0ID0gYXdhaXQgY29yZUhhbmRsZVJlcXVlc3QocmVxdWVzdCwgcmVxSWQsIHRoaXMuX2NoYW5uZWwpO1xuICAgICAgICBpZiAoIXJlc3VsdCkgcmV0dXJuO1xuXG4gICAgICAgIGNvbnN0IHsgcmVzcG9uc2UsIHRyYW5zZmVyIH0gPSByZXN1bHQ7XG4gICAgICAgIGNvbnN0IHNlbmQgPSByZXNwb25zZUZuID8/IHRoaXMuX2Jyb2FkY2FzdHM/LmdldChyZXF1ZXN0LnNlbmRlcik/LnBvc3RNZXNzYWdlPy5iaW5kKHRoaXMuX2Jyb2FkY2FzdHM/LmdldChyZXF1ZXN0LnNlbmRlcikpO1xuICAgICAgICBzZW5kPy4ocmVzcG9uc2UsIHRyYW5zZmVyKTsqL1xuICAgIH1cblxuICAgIG5vdGlmeUNoYW5uZWwoXG4gICAgICAgIHRhcmdldENoYW5uZWw6IHN0cmluZyxcbiAgICAgICAgcGF5bG9hZDogYW55ID0ge30sXG4gICAgICAgIHR5cGU6IFwibm90aWZ5XCIgfCBcImNvbm5lY3RcIiA9IFwibm90aWZ5XCJcbiAgICApOiBib29sZWFuIHtcbiAgICAgICAgLy8gRGVsZWdhdGUgbm90aWZ5L2Nvbm5lY3Qgc2lnbmFsaW5nIHRvIHVuaWZpZWQgcnVudGltZS5cbiAgICAgICAgcmV0dXJuIHRoaXMuX3VuaWZpZWQubm90aWZ5KHRhcmdldENoYW5uZWwsIHtcbiAgICAgICAgICAgIC4uLnBheWxvYWQsXG4gICAgICAgICAgICBmcm9tOiB0aGlzLl9jaGFubmVsLFxuICAgICAgICAgICAgdG86IHRhcmdldENoYW5uZWxcbiAgICAgICAgfSwgdHlwZSk7XG4gICAgfVxuXG4gICAgZ2V0Q29ubmVjdGVkQ2hhbm5lbHMoKTogc3RyaW5nW10ge1xuICAgICAgICByZXR1cm4gdGhpcy5fdW5pZmllZC5jb25uZWN0ZWRDaGFubmVscztcbiAgICB9XG5cbiAgICBjbG9zZSgpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fc3Vic2NyaXB0aW9ucy5mb3JFYWNoKHMgPT4gcy51bnN1YnNjcmliZSgpKTtcbiAgICAgICAgdGhpcy5fZm9yUmVzb2x2ZXMuY2xlYXIoKTtcbiAgICAgICAgdGhpcy5fYnJvYWRjYXN0cz8udmFsdWVzPy4oKT8uZm9yRWFjaCgodHJhbnNwb3J0KSA9PiB0cmFuc3BvcnQuY2xvc2U/LigpKTtcbiAgICAgICAgdGhpcy5fYnJvYWRjYXN0cz8uY2xlYXI/LigpO1xuICAgICAgICB0aGlzLl91bmlmaWVkLmNsb3NlKCk7XG4gICAgfVxuXG4gICAgZ2V0IHVuaWZpZWQoKTogVW5pZmllZENoYW5uZWwge1xuICAgICAgICByZXR1cm4gdGhpcy5fdW5pZmllZDtcbiAgICB9XG59XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIENIQU5ORUwgQ09OVEVYVFxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIENoYW5uZWwgQ29udGV4dCAtIE1hbmFnZXMgbXVsdGlwbGUgY2hhbm5lbHMgaW4gYSBzaW5nbGUgY29udGV4dFxuICpcbiAqIFVzZSB0aGlzIHdoZW4geW91IG5lZWQgbXVsdGlwbGUgaW5kZXBlbmRlbnQgY2hhbm5lbHMgaW4gdGhlIHNhbWVcbiAqIEphdmFTY3JpcHQgY29udGV4dCAoc2FtZSB3aW5kb3csIGlmcmFtZSwgd29ya2VyLCBldGMuKVxuICpcbiAqIFN1cHBvcnRzOlxuICogLSBDcmVhdGluZyBtdWx0aXBsZSBjaGFubmVscyBhdCBvbmNlIG9yIGRlZmVycmVkXG4gKiAtIER5bmFtaWMgdHJhbnNwb3J0IGFkZGl0aW9uICh3b3JrZXJzLCBwb3J0cywgc29ja2V0cywgZXRjLilcbiAqIC0gR2xvYmFsIHNlbGYvZ2xvYmFsVGhpcyBhcyBkZWZhdWx0IHRhcmdldFxuICovXG5leHBvcnQgY2xhc3MgQ2hhbm5lbENvbnRleHQge1xuICAgIHByaXZhdGUgX2lkID0gVVVJRHY0KCk7XG4gICAgcHJpdmF0ZSBfaG9zdE5hbWU6IHN0cmluZztcbiAgICBwcml2YXRlIF9ob3N0OiBDaGFubmVsSGFuZGxlciB8IG51bGwgPSBudWxsO1xuICAgIHByaXZhdGUgX2VuZHBvaW50cyA9IG5ldyBNYXA8c3RyaW5nLCBDaGFubmVsRW5kcG9pbnQ+KCk7XG4gICAgcHJpdmF0ZSBfdW5pZmllZEJ5Q2hhbm5lbCA9IG5ldyBNYXA8c3RyaW5nLCBVbmlmaWVkQ2hhbm5lbD4oKTtcbiAgICBwcml2YXRlIF91bmlmaWVkQ29ubmVjdGlvblN1YnMgPSBuZXcgTWFwPHN0cmluZywgU3Vic2NyaXB0aW9uPigpO1xuICAgIHByaXZhdGUgX3JlbW90ZUNoYW5uZWxzID0gbmV3IE1hcDxzdHJpbmcsIFJlbW90ZUNoYW5uZWxJbmZvPigpO1xuICAgIHByaXZhdGUgX2RlZmVycmVkQ2hhbm5lbHMgPSBuZXcgTWFwPHN0cmluZywgKCkgPT4gUHJvbWlzZTxDaGFubmVsRW5kcG9pbnQ+PigpO1xuICAgIHByaXZhdGUgX2Nvbm5lY3Rpb25FdmVudHMgPSBuZXcgQ2hhbm5lbFN1YmplY3Q8Q29ubmVjdGlvbkV2ZW50Pih7IGJ1ZmZlclNpemU6IDIwMCB9KTtcbiAgICBwcml2YXRlIF9jb25uZWN0aW9uUmVnaXN0cnkgPSBuZXcgQ29ubmVjdGlvblJlZ2lzdHJ5PER5bmFtaWNUcmFuc3BvcnRUeXBlIHwgVHJhbnNwb3J0VHlwZSB8IFwiaW50ZXJuYWxcIj4oXG4gICAgICAgICgpID0+IFVVSUR2NCgpLFxuICAgICAgICAoZXZlbnQpID0+IHRoaXMuX2VtaXRDb25uZWN0aW9uRXZlbnQoZXZlbnQpXG4gICAgKTtcbiAgICBwcml2YXRlIF9jbG9zZWQgPSBmYWxzZTtcbiAgICBwcml2YXRlIF9nbG9iYWxTZWxmOiB0eXBlb2YgZ2xvYmFsVGhpcyB8IG51bGwgPSBudWxsO1xuXG4gICAgY29uc3RydWN0b3IocHJpdmF0ZSBfb3B0aW9uczogQ2hhbm5lbENvbnRleHRPcHRpb25zID0ge30pIHtcbiAgICAgICAgdGhpcy5faG9zdE5hbWUgPSBfb3B0aW9ucy5uYW1lID8/IGBjdHgtJHt0aGlzLl9pZC5zbGljZSgwLCA4KX1gO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgd2l0aCBnbG9iYWxUaGlzL3NlbGYgaWYgcmVxdWVzdGVkXG4gICAgICAgIGlmIChfb3B0aW9ucy51c2VHbG9iYWxTZWxmICE9PSBmYWxzZSkge1xuICAgICAgICAgICAgdGhpcy5fZ2xvYmFsU2VsZiA9IHR5cGVvZiBnbG9iYWxUaGlzICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsVGhpc1xuICAgICAgICAgICAgICAgIDogdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmXG4gICAgICAgICAgICAgICAgOiBudWxsO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgLy8gSE9TVCBNQU5BR0VNRU5UXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplL2dldCB0aGUgaG9zdCBjaGFubmVsIGZvciB0aGlzIGNvbnRleHRcbiAgICAgKi9cbiAgICBpbml0SG9zdChuYW1lPzogc3RyaW5nKTogQ2hhbm5lbEhhbmRsZXIge1xuICAgICAgICBpZiAodGhpcy5faG9zdCAmJiAhbmFtZSkgcmV0dXJuIHRoaXMuX2hvc3Q7XG5cbiAgICAgICAgY29uc3QgaG9zdE5hbWUgPSBuYW1lID8/IHRoaXMuX2hvc3ROYW1lO1xuICAgICAgICB0aGlzLl9ob3N0TmFtZSA9IGhvc3ROYW1lO1xuXG4gICAgICAgIGlmICh0aGlzLl9lbmRwb2ludHMuaGFzKGhvc3ROYW1lKSkge1xuICAgICAgICAgICAgdGhpcy5faG9zdCA9IHRoaXMuX2VuZHBvaW50cy5nZXQoaG9zdE5hbWUpIS5oYW5kbGVyO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2hvc3Q7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLl9ob3N0ID0gbmV3IENoYW5uZWxIYW5kbGVyKGhvc3ROYW1lLCB0aGlzLCB0aGlzLl9vcHRpb25zLmRlZmF1bHRPcHRpb25zKTtcbiAgICAgICAgY29uc3QgZW5kcG9pbnQ6IENoYW5uZWxFbmRwb2ludCA9IHtcbiAgICAgICAgICAgIG5hbWU6IGhvc3ROYW1lLFxuICAgICAgICAgICAgaGFuZGxlcjogdGhpcy5faG9zdCxcbiAgICAgICAgICAgIGNvbm5lY3Rpb246IHRoaXMuX2hvc3QuY29ubmVjdGlvbixcbiAgICAgICAgICAgIHN1YnNjcmlwdGlvbnM6IFtdLFxuICAgICAgICAgICAgcmVhZHk6IFByb21pc2UucmVzb2x2ZShudWxsKSxcbiAgICAgICAgICAgIHVuaWZpZWQ6IHRoaXMuX2hvc3QudW5pZmllZFxuICAgICAgICB9O1xuICAgICAgICB0aGlzLl9lbmRwb2ludHMuc2V0KGhvc3ROYW1lLCBlbmRwb2ludCk7XG4gICAgICAgIHRoaXMuX3JlZ2lzdGVyVW5pZmllZENoYW5uZWwoaG9zdE5hbWUsIHRoaXMuX2hvc3QudW5pZmllZCk7XG5cbiAgICAgICAgcmV0dXJuIHRoaXMuX2hvc3Q7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IHRoZSBob3N0IGNoYW5uZWxcbiAgICAgKi9cbiAgICBnZXRIb3N0KCk6IENoYW5uZWxIYW5kbGVyIHwgbnVsbCB7XG4gICAgICAgIHJldHVybiB0aGlzLl9ob3N0ID8/IHRoaXMuaW5pdEhvc3QoKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgaG9zdCBuYW1lXG4gICAgICovXG4gICAgZ2V0IGhvc3ROYW1lKCk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiB0aGlzLl9ob3N0TmFtZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgY29udGV4dCBJRFxuICAgICAqL1xuICAgIGdldCBpZCgpOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gdGhpcy5faWQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogT2JzZXJ2YWJsZTogY29ubmVjdGlvbiBldmVudHMgaW4gdGhpcyBjb250ZXh0XG4gICAgICovXG4gICAgZ2V0IG9uQ29ubmVjdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2Nvbm5lY3Rpb25FdmVudHM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogU3Vic2NyaWJlIHRvIGNvbm5lY3Rpb24gZXZlbnRzXG4gICAgICovXG4gICAgc3Vic2NyaWJlQ29ubmVjdGlvbnMoaGFuZGxlcjogKGV2ZW50OiBDb25uZWN0aW9uRXZlbnQpID0+IHZvaWQpOiBTdWJzY3JpcHRpb24ge1xuICAgICAgICByZXR1cm4gdGhpcy5fY29ubmVjdGlvbkV2ZW50cy5zdWJzY3JpYmUoaGFuZGxlcik7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogTm90aWZ5IGFsbCBjdXJyZW50bHkga25vd24gYWN0aXZlIGNvbm5lY3Rpb25zLlxuICAgICAqIFVzZWZ1bCBmb3Igc2VydmljZSB3b3JrZXIgLyBjcm9zcy10YWIgaGFuZHNoYWtlcy5cbiAgICAgKi9cbiAgICBub3RpZnlDb25uZWN0aW9ucyhwYXlsb2FkOiBhbnkgPSB7fSwgcXVlcnk6IFF1ZXJ5Q29ubmVjdGlvbnNPcHRpb25zID0ge30pOiBudW1iZXIge1xuICAgICAgICBsZXQgc2VudCA9IDA7XG5cbiAgICAgICAgZm9yIChjb25zdCBlbmRwb2ludCBvZiB0aGlzLl9lbmRwb2ludHMudmFsdWVzKCkpIHtcbiAgICAgICAgICAgIGNvbnN0IGNvbm5lY3RlZFRhcmdldHMgPSBlbmRwb2ludC5oYW5kbGVyLmdldENvbm5lY3RlZENoYW5uZWxzKCk7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IHJlbW90ZUNoYW5uZWwgb2YgY29ubmVjdGVkVGFyZ2V0cykge1xuICAgICAgICAgICAgICAgIGlmIChxdWVyeS5sb2NhbENoYW5uZWwgJiYgcXVlcnkubG9jYWxDaGFubmVsICE9PSBlbmRwb2ludC5uYW1lKSBjb250aW51ZTtcbiAgICAgICAgICAgICAgICBpZiAocXVlcnkucmVtb3RlQ2hhbm5lbCAmJiBxdWVyeS5yZW1vdGVDaGFubmVsICE9PSByZW1vdGVDaGFubmVsKSBjb250aW51ZTtcblxuICAgICAgICAgICAgICAgIGNvbnN0IGV4aXN0aW5nID0gdGhpcy5xdWVyeUNvbm5lY3Rpb25zKHtcbiAgICAgICAgICAgICAgICAgICAgbG9jYWxDaGFubmVsOiBlbmRwb2ludC5uYW1lLFxuICAgICAgICAgICAgICAgICAgICByZW1vdGVDaGFubmVsLFxuICAgICAgICAgICAgICAgICAgICBzdGF0dXM6IFwiYWN0aXZlXCJcbiAgICAgICAgICAgICAgICB9KVswXTtcblxuICAgICAgICAgICAgICAgIGlmIChxdWVyeS5zZW5kZXIgJiYgZXhpc3Rpbmc/LnNlbmRlciAhPT0gcXVlcnkuc2VuZGVyKSBjb250aW51ZTtcbiAgICAgICAgICAgICAgICBpZiAocXVlcnkudHJhbnNwb3J0VHlwZSAmJiBleGlzdGluZz8udHJhbnNwb3J0VHlwZSAhPT0gcXVlcnkudHJhbnNwb3J0VHlwZSkgY29udGludWU7XG4gICAgICAgICAgICAgICAgaWYgKHF1ZXJ5LmNoYW5uZWwgJiYgcXVlcnkuY2hhbm5lbCAhPT0gZW5kcG9pbnQubmFtZSAmJiBxdWVyeS5jaGFubmVsICE9PSByZW1vdGVDaGFubmVsKSBjb250aW51ZTtcblxuICAgICAgICAgICAgICAgIGlmIChlbmRwb2ludC5oYW5kbGVyLm5vdGlmeUNoYW5uZWwocmVtb3RlQ2hhbm5lbCwgcGF5bG9hZCwgXCJub3RpZnlcIikpIHtcbiAgICAgICAgICAgICAgICAgICAgc2VudCsrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBzZW50O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFF1ZXJ5IHRyYWNrZWQgY29ubmVjdGlvbnMgd2l0aCBmaWx0ZXJzXG4gICAgICovXG4gICAgcXVlcnlDb25uZWN0aW9ucyhxdWVyeTogUXVlcnlDb25uZWN0aW9uc09wdGlvbnMgPSB7fSk6IENvbnRleHRDb25uZWN0aW9uSW5mb1tdIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2Nvbm5lY3Rpb25SZWdpc3RyeVxuICAgICAgICAgICAgLnF1ZXJ5KHF1ZXJ5KVxuICAgICAgICAgICAgLm1hcCgoY29ubmVjdGlvbikgPT4gKHtcbiAgICAgICAgICAgICAgICAuLi5jb25uZWN0aW9uLFxuICAgICAgICAgICAgICAgIGNvbnRleHRJZDogdGhpcy5faWRcbiAgICAgICAgICAgIH0pKTtcbiAgICB9XG5cbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAvLyBNVUxUSS1DSEFOTkVMIENSRUFUSU9OXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGUgYSBuZXcgY2hhbm5lbCBlbmRwb2ludCBpbiB0aGlzIGNvbnRleHRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBuYW1lIC0gQ2hhbm5lbCBuYW1lXG4gICAgICogQHBhcmFtIG9wdGlvbnMgLSBDb25uZWN0aW9uIG9wdGlvbnNcbiAgICAgKiBAcmV0dXJucyBDaGFubmVsRW5kcG9pbnQgd2l0aCBoYW5kbGVyIGFuZCBjb25uZWN0aW9uXG4gICAgICovXG4gICAgY3JlYXRlQ2hhbm5lbChuYW1lOiBzdHJpbmcsIG9wdGlvbnM6IENvbm5lY3Rpb25PcHRpb25zID0ge30pOiBDaGFubmVsRW5kcG9pbnQge1xuICAgICAgICBpZiAodGhpcy5fZW5kcG9pbnRzLmhhcyhuYW1lKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2VuZHBvaW50cy5nZXQobmFtZSkhO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgaGFuZGxlciA9IG5ldyBDaGFubmVsSGFuZGxlcihuYW1lLCB0aGlzLCB7IC4uLnRoaXMuX29wdGlvbnMuZGVmYXVsdE9wdGlvbnMsIC4uLm9wdGlvbnMgfSk7XG4gICAgICAgIGNvbnN0IGVuZHBvaW50OiBDaGFubmVsRW5kcG9pbnQgPSB7XG4gICAgICAgICAgICBuYW1lLFxuICAgICAgICAgICAgaGFuZGxlcixcbiAgICAgICAgICAgIGNvbm5lY3Rpb246IGhhbmRsZXIuY29ubmVjdGlvbixcbiAgICAgICAgICAgIHN1YnNjcmlwdGlvbnM6IFtdLFxuICAgICAgICAgICAgcmVhZHk6IFByb21pc2UucmVzb2x2ZShudWxsKSxcbiAgICAgICAgICAgIHVuaWZpZWQ6IGhhbmRsZXIudW5pZmllZFxuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMuX2VuZHBvaW50cy5zZXQobmFtZSwgZW5kcG9pbnQpO1xuICAgICAgICB0aGlzLl9yZWdpc3RlclVuaWZpZWRDaGFubmVsKG5hbWUsIGhhbmRsZXIudW5pZmllZCk7XG4gICAgICAgIHJldHVybiBlbmRwb2ludDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGUgbXVsdGlwbGUgY2hhbm5lbCBlbmRwb2ludHMgYXQgb25jZVxuICAgICAqXG4gICAgICogQHBhcmFtIG5hbWVzIC0gQXJyYXkgb2YgY2hhbm5lbCBuYW1lc1xuICAgICAqIEBwYXJhbSBvcHRpb25zIC0gU2hhcmVkIGNvbm5lY3Rpb24gb3B0aW9uc1xuICAgICAqIEByZXR1cm5zIE1hcCBvZiBjaGFubmVsIG5hbWVzIHRvIGVuZHBvaW50c1xuICAgICAqL1xuICAgIGNyZWF0ZUNoYW5uZWxzKG5hbWVzOiBzdHJpbmdbXSwgb3B0aW9uczogQ29ubmVjdGlvbk9wdGlvbnMgPSB7fSk6IE1hcDxzdHJpbmcsIENoYW5uZWxFbmRwb2ludD4ge1xuICAgICAgICBjb25zdCByZXN1bHQgPSBuZXcgTWFwPHN0cmluZywgQ2hhbm5lbEVuZHBvaW50PigpO1xuICAgICAgICBmb3IgKGNvbnN0IG5hbWUgb2YgbmFtZXMpIHtcbiAgICAgICAgICAgIHJlc3VsdC5zZXQobmFtZSwgdGhpcy5jcmVhdGVDaGFubmVsKG5hbWUsIG9wdGlvbnMpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBhbiBleGlzdGluZyBjaGFubmVsIGVuZHBvaW50XG4gICAgICovXG4gICAgZ2V0Q2hhbm5lbChuYW1lOiBzdHJpbmcpOiBDaGFubmVsRW5kcG9pbnQgfCB1bmRlZmluZWQge1xuICAgICAgICByZXR1cm4gdGhpcy5fZW5kcG9pbnRzLmdldChuYW1lKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgb3IgY3JlYXRlIGEgY2hhbm5lbCBlbmRwb2ludFxuICAgICAqL1xuICAgIGdldE9yQ3JlYXRlQ2hhbm5lbChuYW1lOiBzdHJpbmcsIG9wdGlvbnM6IENvbm5lY3Rpb25PcHRpb25zID0ge30pOiBDaGFubmVsRW5kcG9pbnQge1xuICAgICAgICByZXR1cm4gdGhpcy5fZW5kcG9pbnRzLmdldChuYW1lKSA/PyB0aGlzLmNyZWF0ZUNoYW5uZWwobmFtZSwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2hlY2sgaWYgY2hhbm5lbCBleGlzdHMgaW4gdGhpcyBjb250ZXh0XG4gICAgICovXG4gICAgaGFzQ2hhbm5lbChuYW1lOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2VuZHBvaW50cy5oYXMobmFtZSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IGFsbCBjaGFubmVsIG5hbWVzIGluIHRoaXMgY29udGV4dFxuICAgICAqL1xuICAgIGdldENoYW5uZWxOYW1lcygpOiBzdHJpbmdbXSB7XG4gICAgICAgIHJldHVybiBbLi4udGhpcy5fZW5kcG9pbnRzLmtleXMoKV07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IHRvdGFsIG51bWJlciBvZiBjaGFubmVsc1xuICAgICAqL1xuICAgIGdldCBzaXplKCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLl9lbmRwb2ludHMuc2l6ZTtcbiAgICB9XG5cbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAvLyBEWU5BTUlDIC8gREVGRVJSRUQgQ0hBTk5FTCBDUkVBVElPTlxuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4gICAgLyoqXG4gICAgICogUmVnaXN0ZXIgYSBkZWZlcnJlZCBjaGFubmVsIHRoYXQgd2lsbCBiZSBpbml0aWFsaXplZCBvbiBmaXJzdCB1c2VcbiAgICAgKlxuICAgICAqIEBwYXJhbSBuYW1lIC0gQ2hhbm5lbCBuYW1lXG4gICAgICogQHBhcmFtIGluaXRGbiAtIEZ1bmN0aW9uIHRvIGluaXRpYWxpemUgdGhlIGNoYW5uZWxcbiAgICAgKi9cbiAgICBkZWZlcihuYW1lOiBzdHJpbmcsIGluaXRGbjogKCkgPT4gUHJvbWlzZTxDaGFubmVsRW5kcG9pbnQ+KTogdm9pZCB7XG4gICAgICAgIHRoaXMuX2RlZmVycmVkQ2hhbm5lbHMuc2V0KG5hbWUsIGluaXRGbik7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBhIHByZXZpb3VzbHkgZGVmZXJyZWQgY2hhbm5lbFxuICAgICAqL1xuICAgIGFzeW5jIGluaXREZWZlcnJlZChuYW1lOiBzdHJpbmcpOiBQcm9taXNlPENoYW5uZWxFbmRwb2ludCB8IG51bGw+IHtcbiAgICAgICAgY29uc3QgaW5pdEZuID0gdGhpcy5fZGVmZXJyZWRDaGFubmVscy5nZXQobmFtZSk7XG4gICAgICAgIGlmICghaW5pdEZuKSByZXR1cm4gbnVsbDtcblxuICAgICAgICBjb25zdCBlbmRwb2ludCA9IGF3YWl0IGluaXRGbigpO1xuICAgICAgICB0aGlzLl9lbmRwb2ludHMuc2V0KG5hbWUsIGVuZHBvaW50KTtcbiAgICAgICAgdGhpcy5fZGVmZXJyZWRDaGFubmVscy5kZWxldGUobmFtZSk7XG4gICAgICAgIHJldHVybiBlbmRwb2ludDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDaGVjayBpZiBjaGFubmVsIGlzIGRlZmVycmVkIChub3QgeWV0IGluaXRpYWxpemVkKVxuICAgICAqL1xuICAgIGlzRGVmZXJyZWQobmFtZTogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzLl9kZWZlcnJlZENoYW5uZWxzLmhhcyhuYW1lKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgY2hhbm5lbCwgaW5pdGlhbGl6aW5nIGRlZmVycmVkIGlmIG5lZWRlZFxuICAgICAqL1xuICAgIGFzeW5jIGdldENoYW5uZWxBc3luYyhuYW1lOiBzdHJpbmcpOiBQcm9taXNlPENoYW5uZWxFbmRwb2ludCB8IG51bGw+IHtcbiAgICAgICAgaWYgKHRoaXMuX2VuZHBvaW50cy5oYXMobmFtZSkpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9lbmRwb2ludHMuZ2V0KG5hbWUpITtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5fZGVmZXJyZWRDaGFubmVscy5oYXMobmFtZSkpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmluaXREZWZlcnJlZChuYW1lKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBBZGQgYSBXb3JrZXIgY2hhbm5lbCBkeW5hbWljYWxseVxuICAgICAqXG4gICAgICogQHBhcmFtIG5hbWUgLSBDaGFubmVsIG5hbWVcbiAgICAgKiBAcGFyYW0gd29ya2VyIC0gV29ya2VyIGluc3RhbmNlLCBVUkwsIG9yIGNvZGUgc3RyaW5nXG4gICAgICogQHBhcmFtIG9wdGlvbnMgLSBDb25uZWN0aW9uIG9wdGlvbnNcbiAgICAgKi9cbiAgICBhc3luYyBhZGRXb3JrZXIoXG4gICAgICAgIG5hbWU6IHN0cmluZyxcbiAgICAgICAgd29ya2VyOiBXb3JrZXIgfCBVUkwgfCBzdHJpbmcsXG4gICAgICAgIG9wdGlvbnM6IENvbm5lY3Rpb25PcHRpb25zID0ge31cbiAgICApOiBQcm9taXNlPENoYW5uZWxFbmRwb2ludD4ge1xuICAgICAgICBjb25zdCB3b3JrZXJJbnN0YW5jZSA9IGxvYWRXb3JrZXIod29ya2VyKTtcbiAgICAgICAgaWYgKCF3b3JrZXJJbnN0YW5jZSkgdGhyb3cgbmV3IEVycm9yKGBGYWlsZWQgdG8gY3JlYXRlIHdvcmtlciBmb3IgY2hhbm5lbDogJHtuYW1lfWApO1xuXG4gICAgICAgIGNvbnN0IGhhbmRsZXIgPSBuZXcgQ2hhbm5lbEhhbmRsZXIobmFtZSwgdGhpcywgeyAuLi50aGlzLl9vcHRpb25zLmRlZmF1bHRPcHRpb25zLCAuLi5vcHRpb25zIH0pO1xuICAgICAgICBjb25zdCByZWFkeSA9IGhhbmRsZXIuY3JlYXRlUmVtb3RlQ2hhbm5lbChuYW1lLCBvcHRpb25zLCB3b3JrZXJJbnN0YW5jZSk7XG5cbiAgICAgICAgY29uc3QgZW5kcG9pbnQ6IENoYW5uZWxFbmRwb2ludCA9IHtcbiAgICAgICAgICAgIG5hbWUsXG4gICAgICAgICAgICBoYW5kbGVyLFxuICAgICAgICAgICAgY29ubmVjdGlvbjogaGFuZGxlci5jb25uZWN0aW9uLFxuICAgICAgICAgICAgc3Vic2NyaXB0aW9uczogW10sXG4gICAgICAgICAgICB0cmFuc3BvcnRUeXBlOiBcIndvcmtlclwiLFxuICAgICAgICAgICAgcmVhZHk6IFByb21pc2UucmVzb2x2ZShyZWFkeSksXG4gICAgICAgICAgICB1bmlmaWVkOiBoYW5kbGVyLnVuaWZpZWRcbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLl9lbmRwb2ludHMuc2V0KG5hbWUsIGVuZHBvaW50KTtcbiAgICAgICAgdGhpcy5fcmVnaXN0ZXJVbmlmaWVkQ2hhbm5lbChuYW1lLCBoYW5kbGVyLnVuaWZpZWQpO1xuXG4gICAgICAgIC8vIFN0b3JlIGluIHJlbW90ZSBjaGFubmVscyB0b29cbiAgICAgICAgdGhpcy5fcmVtb3RlQ2hhbm5lbHMuc2V0KG5hbWUsIHtcbiAgICAgICAgICAgIGNoYW5uZWw6IG5hbWUsXG4gICAgICAgICAgICBjb250ZXh0OiB0aGlzLFxuICAgICAgICAgICAgcmVtb3RlOiBQcm9taXNlLnJlc29sdmUocmVhZHkpLFxuICAgICAgICAgICAgdHJhbnNwb3J0OiB3b3JrZXJJbnN0YW5jZSxcbiAgICAgICAgICAgIHRyYW5zcG9ydFR5cGU6IFwid29ya2VyXCJcbiAgICAgICAgfSk7XG5cbiAgICAgICAgcmV0dXJuIGVuZHBvaW50O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEFkZCBhIE1lc3NhZ2VQb3J0IGNoYW5uZWwgZHluYW1pY2FsbHlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBuYW1lIC0gQ2hhbm5lbCBuYW1lXG4gICAgICogQHBhcmFtIHBvcnQgLSBNZXNzYWdlUG9ydCBpbnN0YW5jZVxuICAgICAqIEBwYXJhbSBvcHRpb25zIC0gQ29ubmVjdGlvbiBvcHRpb25zXG4gICAgICovXG4gICAgYXN5bmMgYWRkUG9ydChcbiAgICAgICAgbmFtZTogc3RyaW5nLFxuICAgICAgICBwb3J0OiBNZXNzYWdlUG9ydCxcbiAgICAgICAgb3B0aW9uczogQ29ubmVjdGlvbk9wdGlvbnMgPSB7fVxuICAgICk6IFByb21pc2U8Q2hhbm5lbEVuZHBvaW50PiB7XG4gICAgICAgIGNvbnN0IGhhbmRsZXIgPSBuZXcgQ2hhbm5lbEhhbmRsZXIobmFtZSwgdGhpcywgeyAuLi50aGlzLl9vcHRpb25zLmRlZmF1bHRPcHRpb25zLCAuLi5vcHRpb25zIH0pO1xuICAgICAgICBwb3J0LnN0YXJ0Py4oKTtcblxuICAgICAgICBjb25zdCByZWFkeSA9IGhhbmRsZXIuY3JlYXRlUmVtb3RlQ2hhbm5lbChuYW1lLCBvcHRpb25zLCBwb3J0KTtcblxuICAgICAgICBjb25zdCBlbmRwb2ludDogQ2hhbm5lbEVuZHBvaW50ID0ge1xuICAgICAgICAgICAgbmFtZSxcbiAgICAgICAgICAgIGhhbmRsZXIsXG4gICAgICAgICAgICBjb25uZWN0aW9uOiBoYW5kbGVyLmNvbm5lY3Rpb24sXG4gICAgICAgICAgICBzdWJzY3JpcHRpb25zOiBbXSxcbiAgICAgICAgICAgIHRyYW5zcG9ydFR5cGU6IFwibWVzc2FnZS1wb3J0XCIsXG4gICAgICAgICAgICByZWFkeTogUHJvbWlzZS5yZXNvbHZlKHJlYWR5KSxcbiAgICAgICAgICAgIHVuaWZpZWQ6IGhhbmRsZXIudW5pZmllZFxuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMuX2VuZHBvaW50cy5zZXQobmFtZSwgZW5kcG9pbnQpO1xuICAgICAgICB0aGlzLl9yZWdpc3RlclVuaWZpZWRDaGFubmVsKG5hbWUsIGhhbmRsZXIudW5pZmllZCk7XG4gICAgICAgIHRoaXMuX3JlbW90ZUNoYW5uZWxzLnNldChuYW1lLCB7XG4gICAgICAgICAgICBjaGFubmVsOiBuYW1lLFxuICAgICAgICAgICAgY29udGV4dDogdGhpcyxcbiAgICAgICAgICAgIHJlbW90ZTogUHJvbWlzZS5yZXNvbHZlKHJlYWR5KSxcbiAgICAgICAgICAgIHRyYW5zcG9ydDogcG9ydCxcbiAgICAgICAgICAgIHRyYW5zcG9ydFR5cGU6IFwibWVzc2FnZS1wb3J0XCJcbiAgICAgICAgfSk7XG5cbiAgICAgICAgcmV0dXJuIGVuZHBvaW50O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEFkZCBhIEJyb2FkY2FzdENoYW5uZWwgZHluYW1pY2FsbHlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBuYW1lIC0gQ2hhbm5lbCBuYW1lIChhbHNvIHVzZWQgYXMgQnJvYWRjYXN0Q2hhbm5lbCBuYW1lIGlmIG5vdCBwcm92aWRlZClcbiAgICAgKiBAcGFyYW0gYnJvYWRjYXN0TmFtZSAtIE9wdGlvbmFsIEJyb2FkY2FzdENoYW5uZWwgbmFtZSAoZGVmYXVsdHMgdG8gY2hhbm5lbCBuYW1lKVxuICAgICAqIEBwYXJhbSBvcHRpb25zIC0gQ29ubmVjdGlvbiBvcHRpb25zXG4gICAgICovXG4gICAgYXN5bmMgYWRkQnJvYWRjYXN0KFxuICAgICAgICBuYW1lOiBzdHJpbmcsXG4gICAgICAgIGJyb2FkY2FzdE5hbWU/OiBzdHJpbmcsXG4gICAgICAgIG9wdGlvbnM6IENvbm5lY3Rpb25PcHRpb25zID0ge31cbiAgICApOiBQcm9taXNlPENoYW5uZWxFbmRwb2ludD4ge1xuICAgICAgICBjb25zdCBiYyA9IG5ldyBCcm9hZGNhc3RDaGFubmVsKGJyb2FkY2FzdE5hbWUgPz8gbmFtZSk7XG4gICAgICAgIGNvbnN0IGhhbmRsZXIgPSBuZXcgQ2hhbm5lbEhhbmRsZXIobmFtZSwgdGhpcywgeyAuLi50aGlzLl9vcHRpb25zLmRlZmF1bHRPcHRpb25zLCAuLi5vcHRpb25zIH0pO1xuXG4gICAgICAgIGNvbnN0IHJlYWR5ID0gaGFuZGxlci5jcmVhdGVSZW1vdGVDaGFubmVsKG5hbWUsIG9wdGlvbnMsIGJjKTtcblxuICAgICAgICBjb25zdCBlbmRwb2ludDogQ2hhbm5lbEVuZHBvaW50ID0ge1xuICAgICAgICAgICAgbmFtZSxcbiAgICAgICAgICAgIGhhbmRsZXIsXG4gICAgICAgICAgICBjb25uZWN0aW9uOiBoYW5kbGVyLmNvbm5lY3Rpb24sXG4gICAgICAgICAgICBzdWJzY3JpcHRpb25zOiBbXSxcbiAgICAgICAgICAgIHRyYW5zcG9ydFR5cGU6IFwiYnJvYWRjYXN0XCIsXG4gICAgICAgICAgICByZWFkeTogUHJvbWlzZS5yZXNvbHZlKHJlYWR5KSxcbiAgICAgICAgICAgIHVuaWZpZWQ6IGhhbmRsZXIudW5pZmllZFxuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMuX2VuZHBvaW50cy5zZXQobmFtZSwgZW5kcG9pbnQpO1xuICAgICAgICB0aGlzLl9yZWdpc3RlclVuaWZpZWRDaGFubmVsKG5hbWUsIGhhbmRsZXIudW5pZmllZCk7XG4gICAgICAgIHRoaXMuX3JlbW90ZUNoYW5uZWxzLnNldChuYW1lLCB7XG4gICAgICAgICAgICBjaGFubmVsOiBuYW1lLFxuICAgICAgICAgICAgY29udGV4dDogdGhpcyxcbiAgICAgICAgICAgIHJlbW90ZTogUHJvbWlzZS5yZXNvbHZlKHJlYWR5KSxcbiAgICAgICAgICAgIHRyYW5zcG9ydDogYmMsXG4gICAgICAgICAgICB0cmFuc3BvcnRUeXBlOiBcImJyb2FkY2FzdFwiXG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJldHVybiBlbmRwb2ludDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBBZGQgYSBjaGFubmVsIHVzaW5nIHNlbGYvZ2xvYmFsVGhpcyAoZm9yIHNhbWUtY29udGV4dCBjb21tdW5pY2F0aW9uKVxuICAgICAqXG4gICAgICogQHBhcmFtIG5hbWUgLSBDaGFubmVsIG5hbWVcbiAgICAgKiBAcGFyYW0gb3B0aW9ucyAtIENvbm5lY3Rpb24gb3B0aW9uc1xuICAgICAqL1xuICAgIGFkZFNlbGZDaGFubmVsKFxuICAgICAgICBuYW1lOiBzdHJpbmcsXG4gICAgICAgIG9wdGlvbnM6IENvbm5lY3Rpb25PcHRpb25zID0ge31cbiAgICApOiBDaGFubmVsRW5kcG9pbnQge1xuICAgICAgICBjb25zdCBoYW5kbGVyID0gbmV3IENoYW5uZWxIYW5kbGVyKG5hbWUsIHRoaXMsIHsgLi4udGhpcy5fb3B0aW9ucy5kZWZhdWx0T3B0aW9ucywgLi4ub3B0aW9ucyB9KTtcbiAgICAgICAgY29uc3Qgc2VsZlRhcmdldCA9IHRoaXMuX2dsb2JhbFNlbGYgPz8gKHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IG51bGwpO1xuXG4gICAgICAgIGNvbnN0IGVuZHBvaW50OiBDaGFubmVsRW5kcG9pbnQgPSB7XG4gICAgICAgICAgICBuYW1lLFxuICAgICAgICAgICAgaGFuZGxlcixcbiAgICAgICAgICAgIGNvbm5lY3Rpb246IGhhbmRsZXIuY29ubmVjdGlvbixcbiAgICAgICAgICAgIHN1YnNjcmlwdGlvbnM6IFtdLFxuICAgICAgICAgICAgdHJhbnNwb3J0VHlwZTogXCJzZWxmXCIsXG4gICAgICAgICAgICByZWFkeTogUHJvbWlzZS5yZXNvbHZlKHNlbGZUYXJnZXQgPyBoYW5kbGVyLmNyZWF0ZVJlbW90ZUNoYW5uZWwobmFtZSwgb3B0aW9ucywgc2VsZlRhcmdldCBhcyBhbnkpIDogbnVsbCksXG4gICAgICAgICAgICB1bmlmaWVkOiBoYW5kbGVyLnVuaWZpZWRcbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLl9lbmRwb2ludHMuc2V0KG5hbWUsIGVuZHBvaW50KTtcbiAgICAgICAgdGhpcy5fcmVnaXN0ZXJVbmlmaWVkQ2hhbm5lbChuYW1lLCBoYW5kbGVyLnVuaWZpZWQpO1xuICAgICAgICByZXR1cm4gZW5kcG9pbnQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQWRkIGNoYW5uZWwgd2l0aCBkeW5hbWljIHRyYW5zcG9ydCBjb25maWd1cmF0aW9uXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbmFtZSAtIENoYW5uZWwgbmFtZVxuICAgICAqIEBwYXJhbSBjb25maWcgLSBUcmFuc3BvcnQgY29uZmlndXJhdGlvblxuICAgICAqL1xuICAgIGFzeW5jIGFkZFRyYW5zcG9ydChcbiAgICAgICAgbmFtZTogc3RyaW5nLFxuICAgICAgICBjb25maWc6IER5bmFtaWNUcmFuc3BvcnRDb25maWdcbiAgICApOiBQcm9taXNlPENoYW5uZWxFbmRwb2ludD4ge1xuICAgICAgICBjb25zdCBvcHRpb25zID0gY29uZmlnLm9wdGlvbnMgPz8ge307XG5cbiAgICAgICAgc3dpdGNoIChjb25maWcudHlwZSkge1xuICAgICAgICAgICAgY2FzZSBcIndvcmtlclwiOlxuICAgICAgICAgICAgICAgIGlmICghY29uZmlnLndvcmtlcikgdGhyb3cgbmV3IEVycm9yKFwiV29ya2VyIHJlcXVpcmVkIGZvciB3b3JrZXIgdHJhbnNwb3J0XCIpO1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmFkZFdvcmtlcihuYW1lLCBjb25maWcud29ya2VyIGFzIFdvcmtlciB8IFVSTCB8IHN0cmluZywgb3B0aW9ucyk7XG5cbiAgICAgICAgICAgIGNhc2UgXCJtZXNzYWdlLXBvcnRcIjpcbiAgICAgICAgICAgICAgICBpZiAoIWNvbmZpZy5wb3J0KSB0aHJvdyBuZXcgRXJyb3IoXCJQb3J0IHJlcXVpcmVkIGZvciBtZXNzYWdlLXBvcnQgdHJhbnNwb3J0XCIpO1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmFkZFBvcnQobmFtZSwgY29uZmlnLnBvcnQsIG9wdGlvbnMpO1xuXG4gICAgICAgICAgICBjYXNlIFwiYnJvYWRjYXN0XCI6XG4gICAgICAgICAgICAgICAgY29uc3QgYmNOYW1lID0gdHlwZW9mIGNvbmZpZy5icm9hZGNhc3QgPT09IFwic3RyaW5nXCIgPyBjb25maWcuYnJvYWRjYXN0IDogdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmFkZEJyb2FkY2FzdChuYW1lLCBiY05hbWUsIG9wdGlvbnMpO1xuXG4gICAgICAgICAgICBjYXNlIFwic2VsZlwiOlxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmFkZFNlbGZDaGFubmVsKG5hbWUsIG9wdGlvbnMpO1xuXG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIC8vIEZhbGxiYWNrIHRvIGJhc2ljIGNoYW5uZWxcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5jcmVhdGVDaGFubmVsKG5hbWUsIG9wdGlvbnMpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlIGEgTWVzc2FnZUNoYW5uZWwgcGFpciBmb3IgYmlkaXJlY3Rpb25hbCBjb21tdW5pY2F0aW9uXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbmFtZTEgLSBGaXJzdCBjaGFubmVsIG5hbWVcbiAgICAgKiBAcGFyYW0gbmFtZTIgLSBTZWNvbmQgY2hhbm5lbCBuYW1lXG4gICAgICogQHJldHVybnMgQm90aCBlbmRwb2ludHMgY29ubmVjdGVkIHZpYSBNZXNzYWdlQ2hhbm5lbFxuICAgICAqL1xuICAgIGNyZWF0ZUNoYW5uZWxQYWlyKFxuICAgICAgICBuYW1lMTogc3RyaW5nLFxuICAgICAgICBuYW1lMjogc3RyaW5nLFxuICAgICAgICBvcHRpb25zOiBDb25uZWN0aW9uT3B0aW9ucyA9IHt9XG4gICAgKTogeyBjaGFubmVsMTogQ2hhbm5lbEVuZHBvaW50OyBjaGFubmVsMjogQ2hhbm5lbEVuZHBvaW50OyBtZXNzYWdlQ2hhbm5lbDogTWVzc2FnZUNoYW5uZWwgfSB7XG4gICAgICAgIGNvbnN0IG1jID0gbmV3IE1lc3NhZ2VDaGFubmVsKCk7XG5cbiAgICAgICAgY29uc3QgaGFuZGxlcjEgPSBuZXcgQ2hhbm5lbEhhbmRsZXIobmFtZTEsIHRoaXMsIHsgLi4udGhpcy5fb3B0aW9ucy5kZWZhdWx0T3B0aW9ucywgLi4ub3B0aW9ucyB9KTtcbiAgICAgICAgY29uc3QgaGFuZGxlcjIgPSBuZXcgQ2hhbm5lbEhhbmRsZXIobmFtZTIsIHRoaXMsIHsgLi4udGhpcy5fb3B0aW9ucy5kZWZhdWx0T3B0aW9ucywgLi4ub3B0aW9ucyB9KTtcblxuICAgICAgICBtYy5wb3J0MS5zdGFydCgpO1xuICAgICAgICBtYy5wb3J0Mi5zdGFydCgpO1xuXG4gICAgICAgIGNvbnN0IHJlYWR5MSA9IGhhbmRsZXIxLmNyZWF0ZVJlbW90ZUNoYW5uZWwobmFtZTIsIG9wdGlvbnMsIG1jLnBvcnQxKTtcbiAgICAgICAgY29uc3QgcmVhZHkyID0gaGFuZGxlcjIuY3JlYXRlUmVtb3RlQ2hhbm5lbChuYW1lMSwgb3B0aW9ucywgbWMucG9ydDIpO1xuXG4gICAgICAgIGNvbnN0IGNoYW5uZWwxOiBDaGFubmVsRW5kcG9pbnQgPSB7XG4gICAgICAgICAgICBuYW1lOiBuYW1lMSxcbiAgICAgICAgICAgIGhhbmRsZXI6IGhhbmRsZXIxLFxuICAgICAgICAgICAgY29ubmVjdGlvbjogaGFuZGxlcjEuY29ubmVjdGlvbixcbiAgICAgICAgICAgIHN1YnNjcmlwdGlvbnM6IFtdLFxuICAgICAgICAgICAgdHJhbnNwb3J0VHlwZTogXCJtZXNzYWdlLXBvcnRcIixcbiAgICAgICAgICAgIHJlYWR5OiByZWFkeTEsXG4gICAgICAgICAgICB1bmlmaWVkOiBoYW5kbGVyMS51bmlmaWVkXG4gICAgICAgIH07XG5cbiAgICAgICAgY29uc3QgY2hhbm5lbDI6IENoYW5uZWxFbmRwb2ludCA9IHtcbiAgICAgICAgICAgIG5hbWU6IG5hbWUyLFxuICAgICAgICAgICAgaGFuZGxlcjogaGFuZGxlcjIsXG4gICAgICAgICAgICBjb25uZWN0aW9uOiBoYW5kbGVyMi5jb25uZWN0aW9uLFxuICAgICAgICAgICAgc3Vic2NyaXB0aW9uczogW10sXG4gICAgICAgICAgICB0cmFuc3BvcnRUeXBlOiBcIm1lc3NhZ2UtcG9ydFwiLFxuICAgICAgICAgICAgcmVhZHk6IHJlYWR5MixcbiAgICAgICAgICAgIHVuaWZpZWQ6IGhhbmRsZXIyLnVuaWZpZWRcbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLl9lbmRwb2ludHMuc2V0KG5hbWUxLCBjaGFubmVsMSk7XG4gICAgICAgIHRoaXMuX2VuZHBvaW50cy5zZXQobmFtZTIsIGNoYW5uZWwyKTtcbiAgICAgICAgdGhpcy5fcmVnaXN0ZXJVbmlmaWVkQ2hhbm5lbChuYW1lMSwgaGFuZGxlcjEudW5pZmllZCk7XG4gICAgICAgIHRoaXMuX3JlZ2lzdGVyVW5pZmllZENoYW5uZWwobmFtZTIsIGhhbmRsZXIyLnVuaWZpZWQpO1xuXG4gICAgICAgIHJldHVybiB7IGNoYW5uZWwxLCBjaGFubmVsMiwgbWVzc2FnZUNoYW5uZWw6IG1jIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IHRoZSBnbG9iYWwgc2VsZiByZWZlcmVuY2VcbiAgICAgKi9cbiAgICBnZXQgZ2xvYmFsU2VsZigpOiB0eXBlb2YgZ2xvYmFsVGhpcyB8IG51bGwge1xuICAgICAgICByZXR1cm4gdGhpcy5fZ2xvYmFsU2VsZjtcbiAgICB9XG5cbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAvLyBSRU1PVEUgQ0hBTk5FTCBNQU5BR0VNRU5UXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbiAgICAvKipcbiAgICAgKiBDb25uZWN0IHRvIGEgcmVtb3RlIGNoYW5uZWwgKGUuZy4sIGluIGEgV29ya2VyKVxuICAgICAqL1xuICAgIGFzeW5jIGNvbm5lY3RSZW1vdGUoXG4gICAgICAgIGNoYW5uZWxOYW1lOiBzdHJpbmcsXG4gICAgICAgIG9wdGlvbnM6IENvbm5lY3Rpb25PcHRpb25zID0ge30sXG4gICAgICAgIGJyb2FkY2FzdD86IFRyYW5zcG9ydEJpbmRpbmc8TmF0aXZlQ2hhbm5lbFRyYW5zcG9ydD4gfCBOYXRpdmVDaGFubmVsVHJhbnNwb3J0IHwgbnVsbFxuICAgICk6IFByb21pc2U8UmVtb3RlQ2hhbm5lbEhlbHBlcj4ge1xuICAgICAgICB0aGlzLmluaXRIb3N0KCk7XG4gICAgICAgIHJldHVybiB0aGlzLl9ob3N0IS5jcmVhdGVSZW1vdGVDaGFubmVsKGNoYW5uZWxOYW1lLCBvcHRpb25zLCBicm9hZGNhc3QpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEltcG9ydCBhIG1vZHVsZSBpbiBhIHJlbW90ZSBjaGFubmVsXG4gICAgICovXG4gICAgYXN5bmMgaW1wb3J0TW9kdWxlSW5DaGFubmVsKFxuICAgICAgICBjaGFubmVsTmFtZTogc3RyaW5nLFxuICAgICAgICB1cmw6IHN0cmluZyxcbiAgICAgICAgb3B0aW9uczogeyBjaGFubmVsT3B0aW9ucz86IENvbm5lY3Rpb25PcHRpb25zOyBpbXBvcnRPcHRpb25zPzogYW55IH0gPSB7fSxcbiAgICAgICAgYnJvYWRjYXN0PzogVHJhbnNwb3J0QmluZGluZzxOYXRpdmVDaGFubmVsVHJhbnNwb3J0PiB8IE5hdGl2ZUNoYW5uZWxUcmFuc3BvcnQgfCBudWxsXG4gICAgKTogUHJvbWlzZTxhbnk+IHtcbiAgICAgICAgY29uc3QgcmVtb3RlID0gYXdhaXQgdGhpcy5jb25uZWN0UmVtb3RlKGNoYW5uZWxOYW1lLCBvcHRpb25zLmNoYW5uZWxPcHRpb25zLCBicm9hZGNhc3QpO1xuICAgICAgICByZXR1cm4gcmVtb3RlPy5kb0ltcG9ydE1vZHVsZT8uKHVybCwgb3B0aW9ucy5pbXBvcnRPcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBJbnRlcm5hbDogQ3JlYXRlIG9yIHVzZSBleGlzdGluZyByZW1vdGUgY2hhbm5lbFxuICAgICAqL1xuICAgICRjcmVhdGVPclVzZUV4aXN0aW5nUmVtb3RlKFxuICAgICAgICBjaGFubmVsOiBzdHJpbmcsXG4gICAgICAgIG9wdGlvbnM6IENvbm5lY3Rpb25PcHRpb25zID0ge30sXG4gICAgICAgIGJyb2FkY2FzdDogVHJhbnNwb3J0QmluZGluZzxOYXRpdmVDaGFubmVsVHJhbnNwb3J0PiB8IE5hdGl2ZUNoYW5uZWxUcmFuc3BvcnQgfCBudWxsXG4gICAgKTogUmVtb3RlQ2hhbm5lbEluZm8gfCBudWxsIHtcbiAgICAgICAgaWYgKGNoYW5uZWwgPT0gbnVsbCB8fCBicm9hZGNhc3QpIHJldHVybiBudWxsO1xuICAgICAgICBpZiAodGhpcy5fcmVtb3RlQ2hhbm5lbHMuaGFzKGNoYW5uZWwpKSByZXR1cm4gdGhpcy5fcmVtb3RlQ2hhbm5lbHMuZ2V0KGNoYW5uZWwpITtcblxuICAgICAgICBjb25zdCBtc2dDaGFubmVsID0gbmV3IE1lc3NhZ2VDaGFubmVsKCk7XG4gICAgICAgIGNvbnN0IHByb21pc2UgPSBQcm9taXNlZChuZXcgUHJvbWlzZTxSZW1vdGVDaGFubmVsSGVscGVyPigocmVzb2x2ZSkgPT4ge1xuICAgICAgICAgICAgY29uc3Qgd29ya2VyID0gbG9hZFdvcmtlcih3b3JrZXJDb2RlKTtcblxuICAgICAgICAgICAgd29ya2VyPy5hZGRFdmVudExpc3RlbmVyPy4oJ21lc3NhZ2UnLCAoZXZlbnQ6IE1lc3NhZ2VFdmVudCkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChldmVudC5kYXRhLnR5cGUgPT09IFwiY2hhbm5lbENyZWF0ZWRcIikge1xuICAgICAgICAgICAgICAgICAgICBtc2dDaGFubmVsLnBvcnQxPy5zdGFydD8uKCk7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUobmV3IFJlbW90ZUNoYW5uZWxIZWxwZXIoZXZlbnQuZGF0YS5jaGFubmVsLCB0aGlzLCBvcHRpb25zKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIHdvcmtlcj8ucG9zdE1lc3NhZ2U/Lih7XG4gICAgICAgICAgICAgICAgdHlwZTogXCJjcmVhdGVDaGFubmVsXCIsXG4gICAgICAgICAgICAgICAgY2hhbm5lbCxcbiAgICAgICAgICAgICAgICBzZW5kZXI6IHRoaXMuX2hvc3ROYW1lLFxuICAgICAgICAgICAgICAgIG9wdGlvbnMsXG4gICAgICAgICAgICAgICAgbWVzc2FnZVBvcnQ6IG1zZ0NoYW5uZWwucG9ydDJcbiAgICAgICAgICAgIH0sIHsgdHJhbnNmZXI6IFttc2dDaGFubmVsLnBvcnQyXSB9KTtcbiAgICAgICAgfSkpO1xuXG4gICAgICAgIGNvbnN0IGluZm86IFJlbW90ZUNoYW5uZWxJbmZvID0ge1xuICAgICAgICAgICAgY2hhbm5lbCxcbiAgICAgICAgICAgIGNvbnRleHQ6IHRoaXMsXG4gICAgICAgICAgICBtZXNzYWdlQ2hhbm5lbDogbXNnQ2hhbm5lbCxcbiAgICAgICAgICAgIHJlbW90ZTogcHJvbWlzZVxuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMuX3JlbW90ZUNoYW5uZWxzLnNldChjaGFubmVsLCBpbmZvKTtcbiAgICAgICAgcmV0dXJuIGluZm87XG4gICAgfVxuXG4gICAgJHJlZ2lzdGVyQ29ubmVjdGlvbihwYXJhbXM6IHtcbiAgICAgICAgbG9jYWxDaGFubmVsOiBzdHJpbmc7XG4gICAgICAgIHJlbW90ZUNoYW5uZWw6IHN0cmluZztcbiAgICAgICAgc2VuZGVyOiBzdHJpbmc7XG4gICAgICAgIGRpcmVjdGlvbjogQ29udGV4dENvbm5lY3Rpb25EaXJlY3Rpb247XG4gICAgICAgIHRyYW5zcG9ydFR5cGU6IER5bmFtaWNUcmFuc3BvcnRUeXBlIHwgVHJhbnNwb3J0VHlwZSB8IFwiaW50ZXJuYWxcIjtcbiAgICAgICAgbWV0YWRhdGE/OiBSZWNvcmQ8c3RyaW5nLCBhbnk+O1xuICAgIH0pOiBDb250ZXh0Q29ubmVjdGlvbkluZm8ge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgLi4udGhpcy5fY29ubmVjdGlvblJlZ2lzdHJ5LnJlZ2lzdGVyKHBhcmFtcyksXG4gICAgICAgICAgICBjb250ZXh0SWQ6IHRoaXMuX2lkXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgJG1hcmtOb3RpZmllZChwYXJhbXM6IHtcbiAgICAgICAgbG9jYWxDaGFubmVsOiBzdHJpbmc7XG4gICAgICAgIHJlbW90ZUNoYW5uZWw6IHN0cmluZztcbiAgICAgICAgc2VuZGVyOiBzdHJpbmc7XG4gICAgICAgIGRpcmVjdGlvbjogQ29udGV4dENvbm5lY3Rpb25EaXJlY3Rpb247XG4gICAgICAgIHRyYW5zcG9ydFR5cGU6IER5bmFtaWNUcmFuc3BvcnRUeXBlIHwgVHJhbnNwb3J0VHlwZSB8IFwiaW50ZXJuYWxcIjtcbiAgICAgICAgcGF5bG9hZD86IGFueTtcbiAgICB9KTogdm9pZCB7XG4gICAgICAgIGNvbnN0IGNvbm5lY3Rpb24gPSB0aGlzLl9jb25uZWN0aW9uUmVnaXN0cnkucmVnaXN0ZXIoe1xuICAgICAgICAgICAgbG9jYWxDaGFubmVsOiBwYXJhbXMubG9jYWxDaGFubmVsLFxuICAgICAgICAgICAgcmVtb3RlQ2hhbm5lbDogcGFyYW1zLnJlbW90ZUNoYW5uZWwsXG4gICAgICAgICAgICBzZW5kZXI6IHBhcmFtcy5zZW5kZXIsXG4gICAgICAgICAgICBkaXJlY3Rpb246IHBhcmFtcy5kaXJlY3Rpb24sXG4gICAgICAgICAgICB0cmFuc3BvcnRUeXBlOiBwYXJhbXMudHJhbnNwb3J0VHlwZVxuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5fY29ubmVjdGlvblJlZ2lzdHJ5Lm1hcmtOb3RpZmllZChjb25uZWN0aW9uLCBwYXJhbXMucGF5bG9hZCk7XG4gICAgfVxuXG4gICAgJG9ic2VydmVTaWduYWwocGFyYW1zOiB7XG4gICAgICAgIGxvY2FsQ2hhbm5lbDogc3RyaW5nO1xuICAgICAgICByZW1vdGVDaGFubmVsOiBzdHJpbmc7XG4gICAgICAgIHNlbmRlcjogc3RyaW5nO1xuICAgICAgICB0cmFuc3BvcnRUeXBlOiBEeW5hbWljVHJhbnNwb3J0VHlwZSB8IFRyYW5zcG9ydFR5cGUgfCBcImludGVybmFsXCI7XG4gICAgICAgIHBheWxvYWQ/OiBhbnk7XG4gICAgfSk6IHZvaWQge1xuICAgICAgICBjb25zdCBzaWduYWxUeXBlID0gcGFyYW1zLnBheWxvYWQ/LnR5cGUgPz8gXCJub3RpZnlcIjtcbiAgICAgICAgY29uc3QgZGlyZWN0aW9uOiBDb250ZXh0Q29ubmVjdGlvbkRpcmVjdGlvbiA9IHNpZ25hbFR5cGUgPT09IFwiY29ubmVjdFwiID8gXCJpbmNvbWluZ1wiIDogXCJpbmNvbWluZ1wiO1xuICAgICAgICB0aGlzLiRtYXJrTm90aWZpZWQoe1xuICAgICAgICAgICAgbG9jYWxDaGFubmVsOiBwYXJhbXMubG9jYWxDaGFubmVsLFxuICAgICAgICAgICAgcmVtb3RlQ2hhbm5lbDogcGFyYW1zLnJlbW90ZUNoYW5uZWwsXG4gICAgICAgICAgICBzZW5kZXI6IHBhcmFtcy5zZW5kZXIsXG4gICAgICAgICAgICBkaXJlY3Rpb24sXG4gICAgICAgICAgICB0cmFuc3BvcnRUeXBlOiBwYXJhbXMudHJhbnNwb3J0VHlwZSxcbiAgICAgICAgICAgIHBheWxvYWQ6IHBhcmFtcy5wYXlsb2FkXG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgICRmb3J3YXJkVW5pZmllZENvbm5lY3Rpb25FdmVudChjaGFubmVsOiBzdHJpbmcsIGV2ZW50OiBpbXBvcnQoXCIuL1VuaWZpZWRDaGFubmVsXCIpLlVuaWZpZWRDb25uZWN0aW9uRXZlbnQpOiB2b2lkIHtcbiAgICAgICAgY29uc3QgbWFwcGVkVHJhbnNwb3J0VHlwZSA9IChldmVudC5jb25uZWN0aW9uLnRyYW5zcG9ydFR5cGUgPz8gXCJpbnRlcm5hbFwiKSBhcyBEeW5hbWljVHJhbnNwb3J0VHlwZSB8IFRyYW5zcG9ydFR5cGUgfCBcImludGVybmFsXCI7XG4gICAgICAgIGNvbnN0IGNvbm5lY3Rpb24gPSB0aGlzLl9jb25uZWN0aW9uUmVnaXN0cnkucmVnaXN0ZXIoe1xuICAgICAgICAgICAgbG9jYWxDaGFubmVsOiBldmVudC5jb25uZWN0aW9uLmxvY2FsQ2hhbm5lbCB8fCBjaGFubmVsLFxuICAgICAgICAgICAgcmVtb3RlQ2hhbm5lbDogZXZlbnQuY29ubmVjdGlvbi5yZW1vdGVDaGFubmVsLFxuICAgICAgICAgICAgc2VuZGVyOiBldmVudC5jb25uZWN0aW9uLnNlbmRlcixcbiAgICAgICAgICAgIGRpcmVjdGlvbjogZXZlbnQuY29ubmVjdGlvbi5kaXJlY3Rpb24gYXMgQ29udGV4dENvbm5lY3Rpb25EaXJlY3Rpb24sXG4gICAgICAgICAgICB0cmFuc3BvcnRUeXBlOiBtYXBwZWRUcmFuc3BvcnRUeXBlLFxuICAgICAgICAgICAgbWV0YWRhdGE6IGV2ZW50LmNvbm5lY3Rpb24ubWV0YWRhdGFcbiAgICAgICAgfSk7XG4gICAgICAgIGlmIChldmVudC50eXBlID09PSBcIm5vdGlmaWVkXCIpIHtcbiAgICAgICAgICAgIHRoaXMuX2Nvbm5lY3Rpb25SZWdpc3RyeS5tYXJrTm90aWZpZWQoY29ubmVjdGlvbiwgZXZlbnQucGF5bG9hZCk7XG4gICAgICAgIH0gZWxzZSBpZiAoZXZlbnQudHlwZSA9PT0gXCJkaXNjb25uZWN0ZWRcIikge1xuICAgICAgICAgICAgdGhpcy5fY29ubmVjdGlvblJlZ2lzdHJ5LmNsb3NlQnlDaGFubmVsKGV2ZW50LmNvbm5lY3Rpb24ubG9jYWxDaGFubmVsKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIC8vIExJRkVDWUNMRVxuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4gICAgLyoqXG4gICAgICogQ2xvc2UgYSBzcGVjaWZpYyBjaGFubmVsXG4gICAgICovXG4gICAgY2xvc2VDaGFubmVsKG5hbWU6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgICAgICBjb25zdCBlbmRwb2ludCA9IHRoaXMuX2VuZHBvaW50cy5nZXQobmFtZSk7XG4gICAgICAgIGlmICghZW5kcG9pbnQpIHJldHVybiBmYWxzZTtcblxuICAgICAgICBlbmRwb2ludC5zdWJzY3JpcHRpb25zLmZvckVhY2gocyA9PiBzLnVuc3Vic2NyaWJlKCkpO1xuICAgICAgICBlbmRwb2ludC5oYW5kbGVyLmNsb3NlKCk7XG4gICAgICAgIGVuZHBvaW50LnRyYW5zcG9ydD8uZGV0YWNoKCk7XG4gICAgICAgIHRoaXMuX3VuaWZpZWRDb25uZWN0aW9uU3Vicy5nZXQobmFtZSk/LnVuc3Vic2NyaWJlKCk7XG4gICAgICAgIHRoaXMuX3VuaWZpZWRDb25uZWN0aW9uU3Vicy5kZWxldGUobmFtZSk7XG4gICAgICAgIHRoaXMuX3VuaWZpZWRCeUNoYW5uZWwuZGVsZXRlKG5hbWUpO1xuXG4gICAgICAgIHRoaXMuX2VuZHBvaW50cy5kZWxldGUobmFtZSk7XG5cbiAgICAgICAgaWYgKG5hbWUgPT09IHRoaXMuX2hvc3ROYW1lKSB7XG4gICAgICAgICAgICB0aGlzLl9ob3N0ID0gbnVsbDtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuX2Nvbm5lY3Rpb25SZWdpc3RyeS5jbG9zZUJ5Q2hhbm5lbChuYW1lKTtcblxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDbG9zZSBhbGwgY2hhbm5lbHMgYW5kIGNsZWFudXBcbiAgICAgKi9cbiAgICBjbG9zZSgpOiB2b2lkIHtcbiAgICAgICAgaWYgKHRoaXMuX2Nsb3NlZCkgcmV0dXJuO1xuICAgICAgICB0aGlzLl9jbG9zZWQgPSB0cnVlO1xuXG4gICAgICAgIGZvciAoY29uc3QgW25hbWVdIG9mIHRoaXMuX2VuZHBvaW50cykge1xuICAgICAgICAgICAgdGhpcy5jbG9zZUNoYW5uZWwobmFtZSk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLl9yZW1vdGVDaGFubmVscy5jbGVhcigpO1xuICAgICAgICB0aGlzLl9ob3N0ID0gbnVsbDtcbiAgICAgICAgdGhpcy5fdW5pZmllZENvbm5lY3Rpb25TdWJzLmZvckVhY2goKHN1YikgPT4gc3ViLnVuc3Vic2NyaWJlKCkpO1xuICAgICAgICB0aGlzLl91bmlmaWVkQ29ubmVjdGlvblN1YnMuY2xlYXIoKTtcbiAgICAgICAgdGhpcy5fdW5pZmllZEJ5Q2hhbm5lbC5jbGVhcigpO1xuICAgICAgICB0aGlzLl9jb25uZWN0aW9uUmVnaXN0cnkuY2xlYXIoKTtcbiAgICAgICAgdGhpcy5fY29ubmVjdGlvbkV2ZW50cy5jb21wbGV0ZSgpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENoZWNrIGlmIGNvbnRleHQgaXMgY2xvc2VkXG4gICAgICovXG4gICAgZ2V0IGNsb3NlZCgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2Nsb3NlZDtcbiAgICB9XG5cbiAgICBwcml2YXRlIF9yZWdpc3RlclVuaWZpZWRDaGFubmVsKG5hbWU6IHN0cmluZywgdW5pZmllZDogVW5pZmllZENoYW5uZWwpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fdW5pZmllZEJ5Q2hhbm5lbC5zZXQobmFtZSwgdW5pZmllZCk7XG4gICAgICAgIHRoaXMuX3VuaWZpZWRDb25uZWN0aW9uU3Vicy5nZXQobmFtZSk/LnVuc3Vic2NyaWJlKCk7XG4gICAgICAgIGNvbnN0IHN1YnNjcmlwdGlvbiA9IHVuaWZpZWQuc3Vic2NyaWJlQ29ubmVjdGlvbnMoKGV2ZW50KSA9PiB7XG4gICAgICAgICAgICB0aGlzLiRmb3J3YXJkVW5pZmllZENvbm5lY3Rpb25FdmVudChuYW1lLCBldmVudCk7XG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLl91bmlmaWVkQ29ubmVjdGlvblN1YnMuc2V0KG5hbWUsIHN1YnNjcmlwdGlvbik7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBfZW1pdENvbm5lY3Rpb25FdmVudChldmVudDogQmFzZUNvbm5lY3Rpb25FdmVudDxEeW5hbWljVHJhbnNwb3J0VHlwZSB8IFRyYW5zcG9ydFR5cGUgfCBcImludGVybmFsXCI+KTogdm9pZCB7XG4gICAgICAgIHRoaXMuX2Nvbm5lY3Rpb25FdmVudHMubmV4dCh7XG4gICAgICAgICAgICAuLi5ldmVudCxcbiAgICAgICAgICAgIGNvbm5lY3Rpb246IHtcbiAgICAgICAgICAgICAgICAuLi5ldmVudC5jb25uZWN0aW9uLFxuICAgICAgICAgICAgICAgIGNvbnRleHRJZDogdGhpcy5faWRcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBIRUxQRVIgRlVOQ1RJT05TXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbmZ1bmN0aW9uIGlzUmVmbGVjdEFjdGlvbihhY3Rpb246IGFueSk6IGFjdGlvbiBpcyBXUmVmbGVjdEFjdGlvbiB7XG4gICAgcmV0dXJuIFsuLi5PYmplY3QudmFsdWVzKFdSZWZsZWN0QWN0aW9uKV0uaW5jbHVkZXMoYWN0aW9uKTtcbn1cblxuZnVuY3Rpb24gbm9ybWFsaXplVHJhbnNwb3J0QmluZGluZyhcbiAgICB0YXJnZXQ6IFRyYW5zcG9ydEJpbmRpbmc8TmF0aXZlQ2hhbm5lbFRyYW5zcG9ydD4gfCBOYXRpdmVDaGFubmVsVHJhbnNwb3J0IHwgbnVsbCB8IHVuZGVmaW5lZFxuKTogVHJhbnNwb3J0QmluZGluZzxOYXRpdmVDaGFubmVsVHJhbnNwb3J0PiB8IG51bGwge1xuICAgIGlmICghdGFyZ2V0KSByZXR1cm4gbnVsbDtcbiAgICBpZiAoaXNUcmFuc3BvcnRCaW5kaW5nKHRhcmdldCkpIHJldHVybiB0YXJnZXQ7XG5cbiAgICBjb25zdCBuYXRpdmVUYXJnZXQgPSB0YXJnZXQgYXMgTmF0aXZlQ2hhbm5lbFRyYW5zcG9ydDtcbiAgICByZXR1cm4ge1xuICAgICAgICB0YXJnZXQ6IG5hdGl2ZVRhcmdldCxcbiAgICAgICAgcG9zdE1lc3NhZ2U6IChtZXNzYWdlOiBhbnksIG9wdGlvbnM/OiBhbnkpID0+IHtcbiAgICAgICAgICAgIG5hdGl2ZVRhcmdldC5wb3N0TWVzc2FnZT8uKG1lc3NhZ2UsIG9wdGlvbnMpO1xuICAgICAgICB9LFxuICAgICAgICBhZGRFdmVudExpc3RlbmVyOiBuYXRpdmVUYXJnZXQuYWRkRXZlbnRMaXN0ZW5lcj8uYmluZChuYXRpdmVUYXJnZXQpLFxuICAgICAgICByZW1vdmVFdmVudExpc3RlbmVyOiBuYXRpdmVUYXJnZXQucmVtb3ZlRXZlbnRMaXN0ZW5lcj8uYmluZChuYXRpdmVUYXJnZXQpLFxuICAgICAgICBzdGFydDogKG5hdGl2ZVRhcmdldCBhcyBhbnkpLnN0YXJ0Py5iaW5kKG5hdGl2ZVRhcmdldCksXG4gICAgICAgIGNsb3NlOiAobmF0aXZlVGFyZ2V0IGFzIGFueSkuY2xvc2U/LmJpbmQobmF0aXZlVGFyZ2V0KVxuICAgIH07XG59XG5cbmZ1bmN0aW9uIGlzVHJhbnNwb3J0QmluZGluZyh2YWx1ZTogYW55KTogdmFsdWUgaXMgVHJhbnNwb3J0QmluZGluZzxOYXRpdmVDaGFubmVsVHJhbnNwb3J0PiB7XG4gICAgcmV0dXJuICEhdmFsdWUgJiYgdHlwZW9mIHZhbHVlID09PSBcIm9iamVjdFwiICYmIFwidGFyZ2V0XCIgaW4gdmFsdWUgJiYgdHlwZW9mIHZhbHVlLnBvc3RNZXNzYWdlID09PSBcImZ1bmN0aW9uXCI7XG59XG5cbmZ1bmN0aW9uIGdldER5bmFtaWNUcmFuc3BvcnRUeXBlKFxuICAgIHRhcmdldDogVHJhbnNwb3J0QmluZGluZzxOYXRpdmVDaGFubmVsVHJhbnNwb3J0PiB8IFdvcmtlciB8IEJyb2FkY2FzdENoYW5uZWwgfCBNZXNzYWdlUG9ydCB8IFdlYlNvY2tldCB8IHR5cGVvZiBnbG9iYWxUaGlzIHwgc3RyaW5nIHwgbnVsbCB8IHVuZGVmaW5lZFxuKTogRHluYW1pY1RyYW5zcG9ydFR5cGUgfCBUcmFuc3BvcnRUeXBlIHwgXCJpbnRlcm5hbFwiIHtcbiAgICBjb25zdCBlZmZlY3RpdmVUYXJnZXQgPSBpc1RyYW5zcG9ydEJpbmRpbmcodGFyZ2V0KSA/IHRhcmdldC50YXJnZXQgOiB0YXJnZXQ7XG4gICAgaWYgKCFlZmZlY3RpdmVUYXJnZXQpIHJldHVybiBcImludGVybmFsXCI7XG4gICAgaWYgKGVmZmVjdGl2ZVRhcmdldCA9PT0gXCJjaHJvbWUtcnVudGltZVwiKSByZXR1cm4gXCJjaHJvbWUtcnVudGltZVwiO1xuICAgIGlmIChlZmZlY3RpdmVUYXJnZXQgPT09IFwiY2hyb21lLXRhYnNcIikgcmV0dXJuIFwiY2hyb21lLXRhYnNcIjtcbiAgICBpZiAoZWZmZWN0aXZlVGFyZ2V0ID09PSBcImNocm9tZS1wb3J0XCIpIHJldHVybiBcImNocm9tZS1wb3J0XCI7XG4gICAgaWYgKGVmZmVjdGl2ZVRhcmdldCA9PT0gXCJjaHJvbWUtZXh0ZXJuYWxcIikgcmV0dXJuIFwiY2hyb21lLWV4dGVybmFsXCI7XG4gICAgaWYgKHR5cGVvZiBNZXNzYWdlUG9ydCAhPT0gXCJ1bmRlZmluZWRcIiAmJiBlZmZlY3RpdmVUYXJnZXQgaW5zdGFuY2VvZiBNZXNzYWdlUG9ydCkgcmV0dXJuIFwibWVzc2FnZS1wb3J0XCI7XG4gICAgaWYgKHR5cGVvZiBCcm9hZGNhc3RDaGFubmVsICE9PSBcInVuZGVmaW5lZFwiICYmIGVmZmVjdGl2ZVRhcmdldCBpbnN0YW5jZW9mIEJyb2FkY2FzdENoYW5uZWwpIHJldHVybiBcImJyb2FkY2FzdFwiO1xuICAgIGlmICh0eXBlb2YgV29ya2VyICE9PSBcInVuZGVmaW5lZFwiICYmIGVmZmVjdGl2ZVRhcmdldCBpbnN0YW5jZW9mIFdvcmtlcikgcmV0dXJuIFwid29ya2VyXCI7XG4gICAgaWYgKHR5cGVvZiBXZWJTb2NrZXQgIT09IFwidW5kZWZpbmVkXCIgJiYgZWZmZWN0aXZlVGFyZ2V0IGluc3RhbmNlb2YgV2ViU29ja2V0KSByZXR1cm4gXCJ3ZWJzb2NrZXRcIjtcbiAgICBpZiAoXG4gICAgICAgIHR5cGVvZiBjaHJvbWUgIT09IFwidW5kZWZpbmVkXCIgJiZcbiAgICAgICAgdHlwZW9mIGVmZmVjdGl2ZVRhcmdldCA9PT0gXCJvYmplY3RcIiAmJlxuICAgICAgICBlZmZlY3RpdmVUYXJnZXQgJiZcbiAgICAgICAgdHlwZW9mIChlZmZlY3RpdmVUYXJnZXQgYXMgYW55KS5wb3N0TWVzc2FnZSA9PT0gXCJmdW5jdGlvblwiICYmXG4gICAgICAgIChlZmZlY3RpdmVUYXJnZXQgYXMgYW55KS5vbk1lc3NhZ2U/LmFkZExpc3RlbmVyXG4gICAgKSByZXR1cm4gXCJjaHJvbWUtcG9ydFwiO1xuICAgIGlmICh0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiAmJiBlZmZlY3RpdmVUYXJnZXQgPT09IHNlbGYpIHJldHVybiBcInNlbGZcIjtcbiAgICByZXR1cm4gXCJpbnRlcm5hbFwiO1xufVxuXG5mdW5jdGlvbiBsb2FkV29ya2VyKFdYOiBhbnkpOiBXb3JrZXIgfCBudWxsIHtcbiAgICBpZiAoV1ggaW5zdGFuY2VvZiBXb3JrZXIpIHJldHVybiBXWDtcbiAgICBpZiAoV1ggaW5zdGFuY2VvZiBVUkwpIHJldHVybiBuZXcgV29ya2VyKFdYLmhyZWYsIHsgdHlwZTogXCJtb2R1bGVcIiB9KTtcbiAgICBpZiAodHlwZW9mIFdYID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgdHJ5IHsgcmV0dXJuIG5ldyBXWCh7IHR5cGU6IFwibW9kdWxlXCIgfSk7IH1cbiAgICAgICAgY2F0Y2ggeyByZXR1cm4gV1goeyB0eXBlOiBcIm1vZHVsZVwiIH0pOyB9XG4gICAgfVxuICAgIGlmICh0eXBlb2YgV1ggPT09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgaWYgKFdYLnN0YXJ0c1dpdGgoXCIvXCIpKSByZXR1cm4gbmV3IFdvcmtlcihuZXcgVVJMKFdYLnJlcGxhY2UoL15cXC8vLCBcIi4vXCIpLCBpbXBvcnQubWV0YS51cmwpLmhyZWYsIHsgdHlwZTogXCJtb2R1bGVcIiB9KTtcbiAgICAgICAgaWYgKFVSTC5jYW5QYXJzZShXWCkgfHwgV1guc3RhcnRzV2l0aChcIi4vXCIpKSByZXR1cm4gbmV3IFdvcmtlcihuZXcgVVJMKFdYLCBpbXBvcnQubWV0YS51cmwpLmhyZWYsIHsgdHlwZTogXCJtb2R1bGVcIiB9KTtcbiAgICAgICAgcmV0dXJuIG5ldyBXb3JrZXIoVVJMLmNyZWF0ZU9iamVjdFVSTChuZXcgQmxvYihbV1hdLCB7IHR5cGU6IFwiYXBwbGljYXRpb24vamF2YXNjcmlwdFwiIH0pKSwgeyB0eXBlOiBcIm1vZHVsZVwiIH0pO1xuICAgIH1cbiAgICBpZiAoV1ggaW5zdGFuY2VvZiBCbG9iIHx8IFdYIGluc3RhbmNlb2YgRmlsZSkgcmV0dXJuIG5ldyBXb3JrZXIoVVJMLmNyZWF0ZU9iamVjdFVSTChXWCksIHsgdHlwZTogXCJtb2R1bGVcIiB9KTtcbiAgICByZXR1cm4gV1ggPz8gKHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IG51bGwpIGFzIHVua25vd24gYXMgV29ya2VyO1xufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBGQUNUT1JZIEZVTkNUSU9OUyAmIEdMT0JBTCBDT05URVhUXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKiBHbG9iYWwgY29udGV4dCByZWdpc3RyeSBmb3Igc2hhcmVkIGNvbnRleHRzICovXG5jb25zdCBDT05URVhUX1JFR0lTVFJZID0gbmV3IE1hcDxzdHJpbmcsIENoYW5uZWxDb250ZXh0PigpO1xuXG4vKiogRGVmYXVsdCBnbG9iYWwgY29udGV4dCAodXNlcyBnbG9iYWxUaGlzL3NlbGYpICovXG5sZXQgREVGQVVMVF9DT05URVhUOiBDaGFubmVsQ29udGV4dCB8IG51bGwgPSBudWxsO1xuXG4vKipcbiAqIEdldCB0aGUgZGVmYXVsdCBnbG9iYWwgY29udGV4dFxuICpcbiAqIFRoaXMgY29udGV4dCBpcyBzaGFyZWQgYWNyb3NzIHRoZSBlbnRpcmUgSmF2YVNjcmlwdCBjb250ZXh0XG4gKiBhbmQgdXNlcyBnbG9iYWxUaGlzL3NlbGYgZm9yIGNvbW11bmljYXRpb24gYnkgZGVmYXVsdC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldERlZmF1bHRDb250ZXh0KCk6IENoYW5uZWxDb250ZXh0IHtcbiAgICBpZiAoIURFRkFVTFRfQ09OVEVYVCkge1xuICAgICAgICBERUZBVUxUX0NPTlRFWFQgPSBuZXcgQ2hhbm5lbENvbnRleHQoe1xuICAgICAgICAgICAgbmFtZTogXCIkZGVmYXVsdCRcIixcbiAgICAgICAgICAgIHVzZUdsb2JhbFNlbGY6IHRydWVcbiAgICAgICAgfSk7XG4gICAgICAgIENPTlRFWFRfUkVHSVNUUlkuc2V0KFwiJGRlZmF1bHQkXCIsIERFRkFVTFRfQ09OVEVYVCk7XG4gICAgfVxuICAgIHJldHVybiBERUZBVUxUX0NPTlRFWFQ7XG59XG5cbi8qKlxuICogQ3JlYXRlIGEgbmV3IGNoYW5uZWwgY29udGV4dFxuICpcbiAqIFVzZSB0aGlzIGZvciBpc29sYXRlZCBjaGFubmVsIG1hbmFnZW1lbnQgaW4gY29tcG9uZW50c1xuICovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlQ2hhbm5lbENvbnRleHQob3B0aW9uczogQ2hhbm5lbENvbnRleHRPcHRpb25zID0ge30pOiBDaGFubmVsQ29udGV4dCB7XG4gICAgY29uc3QgY3R4ID0gbmV3IENoYW5uZWxDb250ZXh0KG9wdGlvbnMpO1xuICAgIGlmIChvcHRpb25zLm5hbWUpIHtcbiAgICAgICAgQ09OVEVYVF9SRUdJU1RSWS5zZXQob3B0aW9ucy5uYW1lLCBjdHgpO1xuICAgIH1cbiAgICByZXR1cm4gY3R4O1xufVxuXG4vKipcbiAqIEdldCBvciBjcmVhdGUgYSBuYW1lZCBjb250ZXh0IChzaGFyZWQgYWNyb3NzIGNvbXBvbmVudHMpXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRPckNyZWF0ZUNvbnRleHQobmFtZTogc3RyaW5nLCBvcHRpb25zOiBDaGFubmVsQ29udGV4dE9wdGlvbnMgPSB7fSk6IENoYW5uZWxDb250ZXh0IHtcbiAgICBpZiAoQ09OVEVYVF9SRUdJU1RSWS5oYXMobmFtZSkpIHtcbiAgICAgICAgcmV0dXJuIENPTlRFWFRfUkVHSVNUUlkuZ2V0KG5hbWUpITtcbiAgICB9XG4gICAgcmV0dXJuIGNyZWF0ZUNoYW5uZWxDb250ZXh0KHsgLi4ub3B0aW9ucywgbmFtZSB9KTtcbn1cblxuLyoqXG4gKiBHZXQgYW4gZXhpc3RpbmcgY29udGV4dCBieSBuYW1lXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRDb250ZXh0KG5hbWU6IHN0cmluZyk6IENoYW5uZWxDb250ZXh0IHwgdW5kZWZpbmVkIHtcbiAgICByZXR1cm4gQ09OVEVYVF9SRUdJU1RSWS5nZXQobmFtZSk7XG59XG5cbi8qKlxuICogRGVsZXRlIGEgY29udGV4dCBmcm9tIHRoZSByZWdpc3RyeVxuICovXG5leHBvcnQgZnVuY3Rpb24gZGVsZXRlQ29udGV4dChuYW1lOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICBjb25zdCBjdHggPSBDT05URVhUX1JFR0lTVFJZLmdldChuYW1lKTtcbiAgICBpZiAoY3R4KSB7XG4gICAgICAgIGN0eC5jbG9zZSgpO1xuICAgICAgICByZXR1cm4gQ09OVEVYVF9SRUdJU1RSWS5kZWxldGUobmFtZSk7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbn1cblxuLyoqXG4gKiBHZXQgYWxsIHJlZ2lzdGVyZWQgY29udGV4dCBuYW1lc1xuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0Q29udGV4dE5hbWVzKCk6IHN0cmluZ1tdIHtcbiAgICByZXR1cm4gWy4uLkNPTlRFWFRfUkVHSVNUUlkua2V5cygpXTtcbn1cblxuLyoqXG4gKiBRdWljayBoZWxwZXI6IENyZWF0ZSBjaGFubmVscyBpbiBhIG5ldyBjb250ZXh0XG4gKlxuICogQGV4YW1wbGVcbiAqIGNvbnN0IHsgY29udGV4dCwgY2hhbm5lbHMgfSA9IGNyZWF0ZUNoYW5uZWxzSW5Db250ZXh0KFtcInVpXCIsIFwiZGF0YVwiLCBcImFwaVwiXSk7XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVDaGFubmVsc0luQ29udGV4dChcbiAgICBjaGFubmVsTmFtZXM6IHN0cmluZ1tdLFxuICAgIGNvbnRleHRPcHRpb25zOiBDaGFubmVsQ29udGV4dE9wdGlvbnMgPSB7fVxuKTogeyBjb250ZXh0OiBDaGFubmVsQ29udGV4dDsgY2hhbm5lbHM6IE1hcDxzdHJpbmcsIENoYW5uZWxFbmRwb2ludD4gfSB7XG4gICAgY29uc3QgY29udGV4dCA9IGNyZWF0ZUNoYW5uZWxDb250ZXh0KGNvbnRleHRPcHRpb25zKTtcbiAgICBjb25zdCBjaGFubmVscyA9IGNvbnRleHQuY3JlYXRlQ2hhbm5lbHMoY2hhbm5lbE5hbWVzKTtcbiAgICByZXR1cm4geyBjb250ZXh0LCBjaGFubmVscyB9O1xufVxuXG4vKipcbiAqIFF1aWNrIGhlbHBlcjogSW1wb3J0IG1vZHVsZSBpbiBhIG5ldyBjb250ZXh0J3MgY2hhbm5lbFxuICpcbiAqIEBleGFtcGxlXG4gKiBjb25zdCB7IGNvbnRleHQsIG1vZHVsZSB9ID0gYXdhaXQgaW1wb3J0TW9kdWxlSW5Db250ZXh0KFwibXlDaGFubmVsXCIsIFwiLi93b3JrZXItbW9kdWxlLnRzXCIpO1xuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gaW1wb3J0TW9kdWxlSW5Db250ZXh0KFxuICAgIGNoYW5uZWxOYW1lOiBzdHJpbmcsXG4gICAgdXJsOiBzdHJpbmcsXG4gICAgb3B0aW9uczoge1xuICAgICAgICBjb250ZXh0T3B0aW9ucz86IENoYW5uZWxDb250ZXh0T3B0aW9ucztcbiAgICAgICAgY2hhbm5lbE9wdGlvbnM/OiBDb25uZWN0aW9uT3B0aW9ucztcbiAgICAgICAgaW1wb3J0T3B0aW9ucz86IGFueTtcbiAgICB9ID0ge31cbik6IFByb21pc2U8eyBjb250ZXh0OiBDaGFubmVsQ29udGV4dDsgbW9kdWxlOiBhbnkgfT4ge1xuICAgIGNvbnN0IGNvbnRleHQgPSBjcmVhdGVDaGFubmVsQ29udGV4dChvcHRpb25zLmNvbnRleHRPcHRpb25zKTtcbiAgICBjb25zdCBtb2R1bGUgPSBhd2FpdCBjb250ZXh0LmltcG9ydE1vZHVsZUluQ2hhbm5lbChjaGFubmVsTmFtZSwgdXJsLCB7XG4gICAgICAgIGNoYW5uZWxPcHRpb25zOiBvcHRpb25zLmNoYW5uZWxPcHRpb25zLFxuICAgICAgICBpbXBvcnRPcHRpb25zOiBvcHRpb25zLmltcG9ydE9wdGlvbnNcbiAgICB9KTtcbiAgICByZXR1cm4geyBjb250ZXh0LCBtb2R1bGUgfTtcbn1cblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gREVGQVVMVCBDT05URVhUIFNIT1JUQ1VUU1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIEFkZCBhIHdvcmtlciBjaGFubmVsIHRvIHRoZSBkZWZhdWx0IGdsb2JhbCBjb250ZXh0XG4gKlxuICogQGV4YW1wbGVcbiAqIGNvbnN0IGVuZHBvaW50ID0gYXdhaXQgYWRkV29ya2VyQ2hhbm5lbChcImNvbXB1dGVcIiwgbmV3IFdvcmtlcihcIi4vd29ya2VyLmpzXCIpKTtcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGFkZFdvcmtlckNoYW5uZWwoXG4gICAgbmFtZTogc3RyaW5nLFxuICAgIHdvcmtlcjogV29ya2VyIHwgVVJMIHwgc3RyaW5nLFxuICAgIG9wdGlvbnM6IENvbm5lY3Rpb25PcHRpb25zID0ge31cbik6IFByb21pc2U8Q2hhbm5lbEVuZHBvaW50PiB7XG4gICAgcmV0dXJuIGdldERlZmF1bHRDb250ZXh0KCkuYWRkV29ya2VyKG5hbWUsIHdvcmtlciwgb3B0aW9ucyk7XG59XG5cbi8qKlxuICogQWRkIGEgTWVzc2FnZVBvcnQgY2hhbm5lbCB0byB0aGUgZGVmYXVsdCBnbG9iYWwgY29udGV4dFxuICpcbiAqIEBleGFtcGxlXG4gKiBjb25zdCBlbmRwb2ludCA9IGF3YWl0IGFkZFBvcnRDaGFubmVsKFwiaWZyYW1lLWNvbW1cIiwgcG9ydCk7XG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBhZGRQb3J0Q2hhbm5lbChcbiAgICBuYW1lOiBzdHJpbmcsXG4gICAgcG9ydDogTWVzc2FnZVBvcnQsXG4gICAgb3B0aW9uczogQ29ubmVjdGlvbk9wdGlvbnMgPSB7fVxuKTogUHJvbWlzZTxDaGFubmVsRW5kcG9pbnQ+IHtcbiAgICByZXR1cm4gZ2V0RGVmYXVsdENvbnRleHQoKS5hZGRQb3J0KG5hbWUsIHBvcnQsIG9wdGlvbnMpO1xufVxuXG4vKipcbiAqIEFkZCBhIEJyb2FkY2FzdENoYW5uZWwgdG8gdGhlIGRlZmF1bHQgZ2xvYmFsIGNvbnRleHRcbiAqXG4gKiBAZXhhbXBsZVxuICogY29uc3QgZW5kcG9pbnQgPSBhd2FpdCBhZGRCcm9hZGNhc3RDaGFubmVsKFwiY3Jvc3MtdGFiXCIpO1xuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gYWRkQnJvYWRjYXN0Q2hhbm5lbChcbiAgICBuYW1lOiBzdHJpbmcsXG4gICAgYnJvYWRjYXN0TmFtZT86IHN0cmluZyxcbiAgICBvcHRpb25zOiBDb25uZWN0aW9uT3B0aW9ucyA9IHt9XG4pOiBQcm9taXNlPENoYW5uZWxFbmRwb2ludD4ge1xuICAgIHJldHVybiBnZXREZWZhdWx0Q29udGV4dCgpLmFkZEJyb2FkY2FzdChuYW1lLCBicm9hZGNhc3ROYW1lLCBvcHRpb25zKTtcbn1cblxuLyoqXG4gKiBBZGQgYSBzZWxmIGNoYW5uZWwgdG8gdGhlIGRlZmF1bHQgZ2xvYmFsIGNvbnRleHRcbiAqXG4gKiBAZXhhbXBsZVxuICogY29uc3QgZW5kcG9pbnQgPSBhZGRTZWxmQ2hhbm5lbFRvRGVmYXVsdChcImxvY2FsXCIpO1xuICovXG5leHBvcnQgZnVuY3Rpb24gYWRkU2VsZkNoYW5uZWxUb0RlZmF1bHQoXG4gICAgbmFtZTogc3RyaW5nLFxuICAgIG9wdGlvbnM6IENvbm5lY3Rpb25PcHRpb25zID0ge31cbik6IENoYW5uZWxFbmRwb2ludCB7XG4gICAgcmV0dXJuIGdldERlZmF1bHRDb250ZXh0KCkuYWRkU2VsZkNoYW5uZWwobmFtZSwgb3B0aW9ucyk7XG59XG5cbi8qKlxuICogUmVnaXN0ZXIgYSBkZWZlcnJlZCBjaGFubmVsIGluIHRoZSBkZWZhdWx0IGNvbnRleHRcbiAqXG4gKiBAZXhhbXBsZVxuICogZGVmZXJDaGFubmVsKFwiaGVhdnktd29ya2VyXCIsIGFzeW5jICgpID0+IHtcbiAqICAgICBjb25zdCB3b3JrZXIgPSBuZXcgV29ya2VyKFwiLi9oZWF2eS5qc1wiKTtcbiAqICAgICByZXR1cm4gZ2V0RGVmYXVsdENvbnRleHQoKS5hZGRXb3JrZXIoXCJoZWF2eS13b3JrZXJcIiwgd29ya2VyKTtcbiAqIH0pO1xuICpcbiAqIC8vIExhdGVyLCB3aGVuIG5lZWRlZDpcbiAqIGNvbnN0IGVuZHBvaW50ID0gYXdhaXQgaW5pdERlZmVycmVkQ2hhbm5lbChcImhlYXZ5LXdvcmtlclwiKTtcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRlZmVyQ2hhbm5lbChcbiAgICBuYW1lOiBzdHJpbmcsXG4gICAgaW5pdEZuOiAoKSA9PiBQcm9taXNlPENoYW5uZWxFbmRwb2ludD5cbik6IHZvaWQge1xuICAgIGdldERlZmF1bHRDb250ZXh0KCkuZGVmZXIobmFtZSwgaW5pdEZuKTtcbn1cblxuLyoqXG4gKiBJbml0aWFsaXplIGEgZGVmZXJyZWQgY2hhbm5lbCBpbiB0aGUgZGVmYXVsdCBjb250ZXh0XG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBpbml0RGVmZXJyZWRDaGFubmVsKG5hbWU6IHN0cmluZyk6IFByb21pc2U8Q2hhbm5lbEVuZHBvaW50IHwgbnVsbD4ge1xuICAgIHJldHVybiBnZXREZWZhdWx0Q29udGV4dCgpLmluaXREZWZlcnJlZChuYW1lKTtcbn1cblxuLyoqXG4gKiBHZXQgY2hhbm5lbCBmcm9tIGRlZmF1bHQgY29udGV4dCAoaW5pdGlhbGl6aW5nIGRlZmVycmVkIGlmIG5lZWRlZClcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldENoYW5uZWxGcm9tRGVmYXVsdChuYW1lOiBzdHJpbmcpOiBQcm9taXNlPENoYW5uZWxFbmRwb2ludCB8IG51bGw+IHtcbiAgICByZXR1cm4gZ2V0RGVmYXVsdENvbnRleHQoKS5nZXRDaGFubmVsQXN5bmMobmFtZSk7XG59XG5cbi8qKlxuICogQ3JlYXRlIGEgTWVzc2FnZUNoYW5uZWwgcGFpciBpbiB0aGUgZGVmYXVsdCBjb250ZXh0XG4gKlxuICogQGV4YW1wbGVcbiAqIGNvbnN0IHsgY2hhbm5lbDEsIGNoYW5uZWwyIH0gPSBjcmVhdGVEZWZhdWx0Q2hhbm5lbFBhaXIoXCJ1aVwiLCBcIndvcmtlci1wcm94eVwiKTtcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZURlZmF1bHRDaGFubmVsUGFpcihcbiAgICBuYW1lMTogc3RyaW5nLFxuICAgIG5hbWUyOiBzdHJpbmcsXG4gICAgb3B0aW9uczogQ29ubmVjdGlvbk9wdGlvbnMgPSB7fVxuKSB7XG4gICAgcmV0dXJuIGdldERlZmF1bHRDb250ZXh0KCkuY3JlYXRlQ2hhbm5lbFBhaXIobmFtZTEsIG5hbWUyLCBvcHRpb25zKTtcbn1cbiJdfQ==