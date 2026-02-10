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

import { UUIDv4, Promised, deepOperateAndClone, isPrimitive, isCanJustReturn, isCanTransfer } from "fest/core";
import {
    type ChannelMessage,
    type Subscription,
    ChannelSubject,
    filter
} from "../observable/Observable";
import { WReflectAction, type WReflectDescriptor, type WReq, type WResp, type TransportType } from "../types/Interface";
import {
    hasNoPath,
    readByPath,
    registeredInPath,
    writeByPath,
    objectToRef
} from "../storage/DataBase";
import {
    detectContextType,
    detectTransportType,
    detectIncomingContextType,
    DefaultReflect,
    type ContextType,
    type ReflectLike,
    type IncomingInvocation,
    type InvocationResponse
} from "../proxy/Invoker";
import {
    createRemoteProxy,
    wrapDescriptor as wrapProxyDescriptor,
    type ProxyInvoker,
    type RemoteProxy
} from "../proxy/Proxy";
import {
    executeAction as coreExecuteAction,
    buildResponse as coreBuildResponse,
    type ExecuteOptions
} from "../../core/RequestHandler";
import {
    ConnectionRegistry,
    type ConnectionDirection,
    type ConnectionStatus,
    type ConnectionInfo,
    type ConnectionEvent,
    type QueryConnectionsOptions
} from "./internal/ConnectionModel";
import type { NativeChannelTransport } from "./ChannelContext";

// ============================================================================
// TYPES
// ============================================================================

/** Unified channel configuration */
export interface UnifiedChannelConfig {
    /** Channel name */
    name: string;
    /** Auto-detect context type */
    autoDetect?: boolean;
    /** Request timeout (ms) */
    timeout?: number;
    /** Custom Reflect implementation */
    reflect?: ReflectLike;
    /** Buffer size for observables */
    bufferSize?: number;
    /** Auto-start listening */
    autoListen?: boolean;
}

/** Transport connection options */
export interface ConnectOptions {
    /** Target channel name for requests */
    targetChannel?: string;
    /** Chrome tab id for chrome-tabs transport */
    tabId?: number;
    /** Chrome port name for chrome-port transport */
    portName?: string;
    /** External extension id for chrome-external transport */
    externalId?: string;
    /** Custom message handler */
    onMessage?: (handler: (msg: any) => void) => (() => void);
    /** Auto-start MessagePort */
    autoStart?: boolean;
}

export type UnifiedConnectionDirection = ConnectionDirection;
export type UnifiedConnectionStatus = ConnectionStatus;
export type UnifiedConnectionInfo = ConnectionInfo<TransportType>;
export type UnifiedConnectionEvent = ConnectionEvent<TransportType>;
export type UnifiedQueryConnectionsOptions = QueryConnectionsOptions<TransportType>;

/** Exposed module entry */
interface ExposedEntry {
    name: string;
    obj: any;
    path: string[];
}

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
    private _name: string;
    private _contextType: ContextType;
    private _config: Required<UnifiedChannelConfig>;

    // Transport management
    private _transports = new Map<string, TransportBinding>();
    private _defaultTransport: TransportBinding | null = null;
    private _connectionEvents = new ChannelSubject<UnifiedConnectionEvent>({ bufferSize: 200 });
    private _connectionRegistry = new ConnectionRegistry<TransportType>(
        () => UUIDv4(),
        (event) => this._connectionEvents.next(event)
    );

    // Request/Response tracking
    // @ts-ignore
    private _pending = new Map<string, PromiseWithResolvers<any>>();
    private _subscriptions: Subscription[] = [];

    // Observable subjects
    private _inbound = new ChannelSubject<ChannelMessage>({ bufferSize: 100 });
    private _outbound = new ChannelSubject<ChannelMessage>({ bufferSize: 100 });
    private _invocations = new ChannelSubject<IncomingInvocation>({ bufferSize: 100 });
    private _responses = new ChannelSubject<InvocationResponse>({ bufferSize: 100 });

    // Exposed objects
    private _exposed = new Map<string, ExposedEntry>();

    // Proxy cache
    private _proxyCache = new WeakMap<object, any>();

    public __getPrivate(key: string): any {
        return this[key];
    }
    
    public __setPrivate(key: string, value: any): void {
        this[key] = value;
    }

    constructor(config: UnifiedChannelConfig | string) {
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
    connect(
        target: TransportBinding<NativeChannelTransport>,
        options: ConnectOptions = {}
    ): this {
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
    listen(
        source: Worker | MessagePort | BroadcastChannel | WebSocket | any,
        options: ConnectOptions = {}
    ): this {
        const transportType = detectTransportType(source);
        const sourceChannel = options.targetChannel ?? this._inferTargetChannel(source, transportType);
        const handler = (data: any) => this._handleIncoming(data);

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
                if (options.autoStart !== false && source.start) source.start();
                source.addEventListener?.("message", ((e: MessageEvent) => handler(e.data)) as EventListener);
                break;

            case "websocket":
                source.addEventListener?.("message", ((e: MessageEvent) => {
                    try { handler(JSON.parse(e.data)); } catch {}
                }) as EventListener);
                break;

            case "chrome-runtime":
                chrome.runtime.onMessage?.addListener?.((msg: any, sender: any, sendResponse: any) => {
                    handler(msg);
                    return true;
                });
                break;

            case "chrome-tabs":
                chrome.runtime.onMessage?.addListener?.((msg: any, sender: any) => {
                    if (options.tabId != null && sender?.tab?.id !== options.tabId) return false;
                    handler(msg);
                    return true;
                });
                break;

            case "chrome-port":
                source?.onMessage?.addListener?.((msg: any) => {
                    handler(msg);
                });
                break;

            case "chrome-external":
                chrome.runtime.onMessageExternal?.addListener?.((msg: any) => {
                    handler(msg);
                    return true;
                });
                break;

            case "self":
                addEventListener?.("message", ((e: MessageEvent) => handler(e.data)) as EventListener);
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
    attach(
        target: Worker | MessagePort | BroadcastChannel | WebSocket | any,
        options: ConnectOptions = {}
    ): this {
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
    expose(name: string, obj: any): this {
        const path = [name];
        writeByPath(path, obj);
        this._exposed.set(name, { name, obj, path });
        return this;
    }

    /**
     * Expose multiple objects at once
     */
    exposeAll(entries: Record<string, any>): this {
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
    async import<T = any>(url: string, targetChannel?: string): Promise<T> {
        return this.invoke(
            targetChannel ?? this._getDefaultTarget(),
            WReflectAction.IMPORT,
            [],
            [url]
        );
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
    invoke<T = any>(
        targetChannel: string,
        action: WReflectAction,
        path: string[],
        args: any[] = []
    ): Promise<T> {
        const id = UUIDv4();
        // @ts-ignore
        const resolvers = Promise.withResolvers<T>();
        this._pending.set(id, resolvers);

        // Setup timeout
        const timeout = setTimeout(() => {
            if (this._pending.has(id)) {
                this._pending.delete(id);
                resolvers.reject(new Error(`Request timeout: ${action} on ${path.join(".")}`));
            }
        }, this._config.timeout);

        // Build and send message
        const message: ChannelMessage = {
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
    get<T = any>(targetChannel: string, path: string[], prop: string): Promise<T> {
        return this.invoke(targetChannel, WReflectAction.GET, path, [prop]);
    }

    /**
     * Set property on remote object
     */
    set(targetChannel: string, path: string[], prop: string, value: any): Promise<boolean> {
        return this.invoke(targetChannel, WReflectAction.SET, path, [prop, value]);
    }

    /**
     * Call method on remote object
     */
    call<T = any>(targetChannel: string, path: string[], args: any[] = []): Promise<T> {
        return this.invoke(targetChannel, WReflectAction.APPLY, path, [args]);
    }

    /**
     * Construct new instance on remote
     */
    construct<T = any>(targetChannel: string, path: string[], args: any[] = []): Promise<T> {
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
    proxy<T = any>(targetChannel?: string, basePath: string[] = []): T {
        const target = targetChannel ?? this._getDefaultTarget();
        return this._createProxy(target, basePath) as T;
    }

    /**
     * Create proxy for a specific exposed module on remote
     *
     * @param moduleName - Name of the exposed module
     * @param targetChannel - Target channel
     */
    remote<T = any>(moduleName: string, targetChannel?: string): T {
        return this.proxy<T>(targetChannel, [moduleName]);
    }

    /**
     * Wrap a descriptor as a proxy
     */
    wrapDescriptor(descriptor: WReflectDescriptor, targetChannel?: string): any {
        const invoker: ProxyInvoker = (action, path, args) => {
            const channel = targetChannel ?? descriptor?.channel ?? this._getDefaultTarget();
            return this.invoke(channel, action as WReflectAction, path, args);
        };

        return wrapProxyDescriptor(
            descriptor,
            invoker,
            targetChannel ?? descriptor?.channel ?? this._getDefaultTarget()
        );
    }

    // ========================================================================
    // OBSERVABLE API
    // ========================================================================

    /**
     * Subscribe to incoming messages
     */
    subscribe(handler: (msg: ChannelMessage) => void): Subscription {
        return this._inbound.subscribe(handler);
    }

    /**
     * Send a message (fire-and-forget)
     */
    next(message: ChannelMessage): void {
        this._send(message.channel, message);
        this._outbound.next(message);
    }

    /**
     * Emit an event to a channel
     */
    emit(targetChannel: string, eventType: string, data: any): void {
        const message: ChannelMessage = {
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
    notify(
        targetChannel: string,
        payload: Record<string, any> = {},
        type: "notify" | "connect" = "notify"
    ): boolean {
        const binding = this._transports.get(targetChannel);
        if (!binding) return false;
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

    subscribeConnections(handler: (event: UnifiedConnectionEvent) => void): Subscription {
        return this._connectionEvents.subscribe(handler);
    }

    queryConnections(query: UnifiedQueryConnectionsOptions = {}): UnifiedConnectionInfo[] {
        return this._connectionRegistry.query(query);
    }

    notifyConnections(payload: any = {}, query: UnifiedQueryConnectionsOptions = {}): number {
        let sent = 0;
        const targets = this.queryConnections({ ...query, status: "active", includeClosed: false });

        for (const connection of targets) {
            const binding = this._transports.get(connection.remoteChannel);
            if (!binding) continue;

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
    get name(): string { return this._name; }

    /** Detected context type */
    get contextType(): ContextType { return this._contextType; }

    /** Configuration */
    get config(): Readonly<Required<UnifiedChannelConfig>> { return this._config; }

    /** Connected transport names */
    get connectedChannels(): string[] { return [...this._transports.keys()]; }

    /** Exposed module names */
    get exposedModules(): string[] { return [...this._exposed.keys()]; }

    // ========================================================================
    // LIFECYCLE
    // ========================================================================

    /**
     * Close all connections and cleanup
     */
    close(): void {
        this._subscriptions.forEach(s => s.unsubscribe());
        this._subscriptions = [];
        this._pending.clear();
        this._markAllConnectionsClosed();
        for (const binding of this._transports.values()) {
            try { binding.cleanup?.(); } catch {}
            // Release common channel-like transports so they do not keep event loop alive.
            if (binding.transportType === "message-port" || binding.transportType === "broadcast") {
                try { (binding.target as MessagePort)?.close?.(); } catch {}
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

    private _handleIncoming(data: any): void {
        if (!data || typeof data !== "object") return;

        // Emit to inbound observable
        this._inbound.next(data as ChannelMessage);

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

    private _handleResponse(data: any): void {
        const id = data.reqId ?? data.id;
        const resolvers = this._pending.get(id);

        if (resolvers) {
            this._pending.delete(id);

            if (data.payload?.error) {
                resolvers.reject(new Error(data.payload.error));
            } else {
                const result = data.payload?.result;
                const descriptor = data.payload?.descriptor;

                if (result !== null && result !== undefined) {
                    resolvers.resolve(result);
                } else if (descriptor) {
                    resolvers.resolve(this.wrapDescriptor(descriptor, data.sender));
                } else {
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

    private async _handleRequest(data: any): Promise<void> {
        const payload = data.payload as WReq;
        if (!payload) return;

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

    private async _executeAction(
        action: string,
        path: string[],
        args: any[],
        sender: string
    ): Promise<{ result: any; toTransfer: any[]; newPath: string[] }> {
        // Use unified core executeAction
        const { result, toTransfer, path: newPath } = coreExecuteAction(
            action,
            path,
            args,
            {
                channel: this._name,
                sender,
                reflect: this._config.reflect
            }
        );

        return { result: await result, toTransfer, newPath };
    }

    private async _sendResponse(
        reqId: string,
        action: string,
        sender: string,
        path: string[],
        rawResult: any,
        toTransfer: any[]
    ): Promise<void> {
        // Use unified core buildResponse
        const { response: coreResponse, transfer } = await coreBuildResponse(
            reqId, action, this._name, sender, path, rawResult, toTransfer
        );

        // Wrap as ChannelMessage with extra fields
        const response: ChannelMessage = {
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

    private _handleSignal(data: any): void {
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

    private _registerConnection(params: {
        localChannel: string;
        remoteChannel: string;
        sender: string;
        transportType: TransportType;
        direction: UnifiedConnectionDirection;
        metadata?: Record<string, any>;
    }): UnifiedConnectionInfo {
        return this._connectionRegistry.register(params);
    }

    private _markConnectionNotified(connection: UnifiedConnectionInfo, payload?: any): void {
        this._connectionRegistry.markNotified(connection, payload);
    }

    private _emitConnectionSignal(
        binding: TransportBinding,
        signalType: "connect" | "notify",
        payload: Record<string, any> = {}
    ): void {
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

    private _sendSignalToTarget<TTransport = NativeChannelTransport>(
        target: TTransport,
        transportType: TransportType,
        payload: Record<string, any>,
        signalType: "connect" | "notify"
    ): void {
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
                (target as WebSocket)?.send?.(JSON.stringify(message));
                return;
            }
            if (transportType === "chrome-runtime") {
                chrome.runtime?.sendMessage?.(message);
                return;
            }
            if (transportType === "chrome-tabs") {
                const tabId = payload.tabId;
                if (tabId != null) chrome.tabs?.sendMessage?.(tabId, message);
                return;
            }
            if (transportType === "chrome-port") {
                (target as MessagePort)?.postMessage?.(message);
                return;
            }
            if (transportType === "chrome-external") {
                if (payload.externalId) chrome.runtime?.sendMessage?.(payload.externalId, message);
                return;
            }
            (target as MessagePort)?.postMessage?.(message, { transfer: [] });
        } catch {}
    }

    private _markAllConnectionsClosed(): void {
        this._connectionRegistry.closeAll();
    }

    private _createTransportBinding(
        target: any,
        transportType: TransportType,
        targetChannel: string,
        options: ConnectOptions
    ): TransportBinding {
        let sender: (msg: any, transfer?: Transferable[]) => void;
        let cleanup: (() => void) | undefined;

        switch (transportType) {
            case "worker":
            case "message-port":
            case "broadcast":
                if (options.autoStart !== false && target.start) target.start();
                sender = (msg, transfer) => target.postMessage(msg, { transfer });
                {
                    const listener = ((e: MessageEvent) => this._handleIncoming(e.data)) as EventListener;
                    target.addEventListener?.("message", listener);
                    cleanup = () => target.removeEventListener?.("message", listener);
                }
                break;

            case "websocket":
                sender = (msg) => target.send(JSON.stringify(msg));
                {
                    const listener = ((e: MessageEvent) => {
                        try { this._handleIncoming(JSON.parse(e.data)); } catch {}
                    }) as EventListener;
                    target.addEventListener?.("message", listener);
                    cleanup = () => target.removeEventListener?.("message", listener);
                }
                break;

            case "chrome-runtime":
                sender = (msg) => chrome.runtime.sendMessage(msg);
                {
                    const listener = (msg: any) => this._handleIncoming(msg);
                    chrome.runtime.onMessage?.addListener?.(listener);
                    cleanup = () => chrome.runtime.onMessage?.removeListener?.(listener);
                }
                break;

            case "chrome-tabs":
                sender = (msg) => {
                    if (options.tabId != null) chrome.tabs?.sendMessage?.(options.tabId, msg);
                };
                {
                    const listener = (msg: any, senderMeta: any) => {
                        if (options.tabId != null && senderMeta?.tab?.id !== options.tabId) return false;
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
                    const listener = (msg: any) => this._handleIncoming(msg);
                    target.onMessage.addListener(listener);
                    cleanup = () => {
                        try { target.onMessage.removeListener(listener); } catch {}
                        try { target.disconnect?.(); } catch {}
                    };
                } else {
                    const portName = options.portName ?? targetChannel;
                    const port = options.tabId != null && chrome.tabs?.connect
                        ? chrome.tabs.connect(options.tabId, { name: portName })
                        : chrome.runtime.connect({ name: portName });
                    sender = (msg) => port.postMessage(msg);
                    const listener = (msg: any) => this._handleIncoming(msg);
                    port.onMessage.addListener(listener);
                    cleanup = () => {
                        try { port.onMessage.removeListener(listener); } catch {}
                        try { port.disconnect(); } catch {}
                    };
                }
                break;

            case "chrome-external":
                sender = (msg) => {
                    if (options.externalId) chrome.runtime.sendMessage(options.externalId, msg);
                };
                {
                    const listener = (msg: any) => {
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
                    const listener = ((e: MessageEvent) => this._handleIncoming(e.data)) as EventListener;
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
            postMessage: (message: any, options?: any) => sender?.(message, options),
            start: () => target?.start?.(),
            close: () => target?.close?.()
        };
    }

    private _send(targetChannel: string, message: ChannelMessage, transfer?: Transferable[]): void {
        const binding = this._transports.get(targetChannel) ?? this._defaultTransport;
        (binding?.sender ?? binding?.postMessage)?.call(binding, message, transfer);
    }

    private _getDefaultTarget(): string {
        if (this._defaultTransport) {
            return this._defaultTransport.targetChannel;
        }
        return "worker";
    }

    private _inferTargetChannel(target: any, transportType: TransportType): string {
        if (transportType === "worker") return "worker";
        if (transportType === "broadcast" && target.name) return target.name;
        if (transportType === "self") return "self";
        return `${transportType}-${UUIDv4().slice(0, 8)}`;
    }

    // ========================================================================
    // PRIVATE: Proxy Creation
    // ========================================================================

    private _createProxy(targetChannel: string, basePath: string[]): RemoteProxy {
        const invoker: ProxyInvoker = (action, path, args) => {
            return this.invoke(targetChannel, action as WReflectAction, path, args);
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

    private _isWorkerContext(): boolean {
        return ["worker", "shared-worker", "service-worker"].includes(this._contextType);
    }
}

/** Transport binding info */
export interface TransportBinding<TTransport = NativeChannelTransport> {
    target: TTransport;
    targetChannel: string;
    transportType: TransportType;
    sender: (msg: any, transfer?: Transferable[]) => void;
    cleanup?: () => void;
    postMessage: (message: any, options?: any) => void;
    addEventListener?: (type: string, listener: EventListener) => void;
    removeEventListener?: (type: string, listener: EventListener) => void;
    start?: () => void;
    close?: () => void;
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
export function createUnifiedChannel(config: UnifiedChannelConfig | string): UnifiedChannel {
    return new UnifiedChannel(config);
}

/**
 * Quick setup: Create channel and connect to transport
 */
export function setupUnifiedChannel(
    name: string,
    target: Worker | MessagePort | BroadcastChannel | WebSocket | any,
    options?: Partial<UnifiedChannelConfig> & ConnectOptions
): UnifiedChannel {
    return createUnifiedChannel({ name, ...options }).attach(target, options);
}

/**
 * Create a channel pair for bidirectional communication
 */
export function createUnifiedChannelPair(
    name1: string,
    name2: string,
    options?: Partial<UnifiedChannelConfig>
): { channel1: UnifiedChannel; channel2: UnifiedChannel; messageChannel: MessageChannel } {
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

const CHANNEL_REGISTRY = new Map<string, UnifiedChannel>();

/**
 * Get or create a named channel (singleton per name)
 */
export function getUnifiedChannel(name: string, config?: Partial<UnifiedChannelConfig>): UnifiedChannel {
    if (!CHANNEL_REGISTRY.has(name)) {
        CHANNEL_REGISTRY.set(name, createUnifiedChannel({ name, ...config }));
    }
    return CHANNEL_REGISTRY.get(name)!;
}

/**
 * Get all registered channel names
 */
export function getUnifiedChannelNames(): string[] {
    return [...CHANNEL_REGISTRY.keys()];
}

/**
 * Close and remove a channel from registry
 */
export function closeUnifiedChannel(name: string): boolean {
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

let WORKER_CHANNEL: UnifiedChannel | null = null;

/**
 * Get the worker's unified channel (auto-created in worker context)
 */
export function getWorkerChannel(): UnifiedChannel {
    if (!WORKER_CHANNEL) {
        const contextType = detectContextType();
        if (["worker", "shared-worker", "service-worker"].includes(contextType)) {
            WORKER_CHANNEL = createUnifiedChannel({ name: "worker", autoListen: true });
        } else {
            WORKER_CHANNEL = createUnifiedChannel({ name: "host", autoListen: false });
        }
    }
    return WORKER_CHANNEL;
}

/**
 * Expose an object from the worker channel
 */
export function exposeFromUnified(name: string, obj: any): void {
    getWorkerChannel().expose(name, obj);
}

/**
 * Create a proxy to a remote channel from the worker
 */
export function remoteFromUnified<T = any>(moduleName: string, targetChannel?: string): T {
    return getWorkerChannel().remote<T>(moduleName, targetChannel);
}
