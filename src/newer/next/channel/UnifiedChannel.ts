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
    removeByData,
    removeByPath,
    writeByPath,
    normalizeRef,
    objectToRef,
    descMap,
    wrapMap
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
} from "./Invoker";
import {
    createRemoteProxy,
    wrapDescriptor as wrapProxyDescriptor,
    type ProxyInvoker,
    type RemoteProxy
} from "./Proxy";

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
    /** Custom message handler */
    onMessage?: (handler: (msg: any) => void) => (() => void);
    /** Auto-start MessagePort */
    autoStart?: boolean;
}

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
        target: Worker | MessagePort | BroadcastChannel | WebSocket | any,
        options: ConnectOptions = {}
    ): this {
        const transportType = detectTransportType(target);
        const targetChannel = options.targetChannel ?? this._inferTargetChannel(target, transportType);

        const binding = this._createTransportBinding(target, transportType, targetChannel, options);

        this._transports.set(targetChannel, binding);
        if (!this._defaultTransport) {
            this._defaultTransport = binding;
        }

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
        const handler = (data: any) => this._handleIncoming(data);

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

            case "self":
                addEventListener?.("message", ((e: MessageEvent) => handler(e.data)) as EventListener);
                break;

            default:
                if (options.onMessage) {
                    options.onMessage(handler);
                }
        }

        return this;
    }

    /**
     * Connect and listen on the same transport (bidirectional)
     */
    attach(
        target: Worker | MessagePort | BroadcastChannel | WebSocket | any,
        options: ConnectOptions = {}
    ): this {
        return this.connect(target, options).listen(target, options);
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

    /** Observable: Incoming messages */
    get onMessage() { return this._inbound; }

    /** Observable: Outgoing messages */
    get onOutbound() { return this._outbound; }

    /** Observable: Incoming invocations */
    get onInvocation() { return this._invocations; }

    /** Observable: Outgoing responses */
    get onResponse() { return this._responses; }

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
        this._transports.clear();
        this._defaultTransport = null;
        this._inbound.complete();
        this._outbound.complete();
        this._invocations.complete();
        this._responses.complete();
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
        const reflect = this._config.reflect;
        const obj = readByPath(path);
        const toTransfer: any[] = [];
        let result: any = null;
        let newPath = path;

        switch (action) {
            case WReflectAction.IMPORT:
                result = await import(args?.[0]);
                break;

            case WReflectAction.TRANSFER:
                if (isCanTransfer(obj) && this._name !== sender) {
                    toTransfer.push(obj);
                }
                result = obj;
                break;

            case WReflectAction.GET: {
                const prop = args?.[0];
                const got = reflect.get?.(obj, prop) ?? obj?.[prop];
                result = typeof got === "function" && obj != null ? got.bind(obj) : got;
                newPath = [...path, String(prop)];
                break;
            }

            case WReflectAction.SET: {
                const [prop, value] = args;
                const normalizedValue = deepOperateAndClone(value, normalizeRef);
                result = reflect.set?.(obj, prop, normalizedValue) ??
                    writeByPath([...path, String(prop)], normalizedValue);
                break;
            }

            case WReflectAction.APPLY:
            case WReflectAction.CALL: {
                if (typeof obj === "function") {
                    const ctx = readByPath(path.slice(0, -1));
                    const normalizedArgs = deepOperateAndClone(args?.[0] ?? [], normalizeRef);
                    result = reflect.apply?.(obj, ctx, normalizedArgs) ?? obj.apply(ctx, normalizedArgs);

                    if (isCanTransfer(result) && path?.at(-1) === "transfer" && this._name !== sender) {
                        toTransfer.push(result);
                    }
                }
                break;
            }

            case WReflectAction.CONSTRUCT: {
                if (typeof obj === "function") {
                    const normalizedArgs = deepOperateAndClone(args?.[0] ?? [], normalizeRef);
                    result = reflect.construct?.(obj, normalizedArgs) ?? new obj(...normalizedArgs);
                }
                break;
            }

            case WReflectAction.DELETE:
            case WReflectAction.DELETE_PROPERTY:
            case WReflectAction.DISPOSE:
                result = path?.length > 0 ? removeByPath(path) : removeByData(obj);
                if (result) newPath = registeredInPath.get(obj) ?? [];
                break;

            case WReflectAction.HAS:
                result = reflect.has?.(obj, args?.[0]) ?? (typeof obj === "object" && obj != null ? args?.[0] in obj : false);
                break;

            case WReflectAction.OWN_KEYS:
                result = reflect.ownKeys?.(obj) ?? (typeof obj === "object" && obj != null ? Object.keys(obj) : []);
                break;

            case WReflectAction.GET_OWN_PROPERTY_DESCRIPTOR:
            case WReflectAction.GET_PROPERTY_DESCRIPTOR:
                result = reflect.getOwnPropertyDescriptor?.(obj, path?.at(-1) ?? "") ??
                    (typeof obj === "object" && obj != null ? Object.getOwnPropertyDescriptor(obj, path?.at(-1) ?? "") : undefined);
                break;

            case WReflectAction.GET_PROTOTYPE_OF:
                result = reflect.getPrototypeOf?.(obj) ??
                    (typeof obj === "object" && obj != null ? Object.getPrototypeOf(obj) : null);
                break;

            case WReflectAction.SET_PROTOTYPE_OF:
                result = reflect.setPrototypeOf?.(obj, args?.[0]) ??
                    (typeof obj === "object" && obj != null ? Object.setPrototypeOf(obj, args?.[0]) : false);
                break;

            case WReflectAction.IS_EXTENSIBLE:
                result = reflect.isExtensible?.(obj) ??
                    (typeof obj === "object" && obj != null ? Object.isExtensible(obj) : true);
                break;

            case WReflectAction.PREVENT_EXTENSIONS:
                result = reflect.preventExtensions?.(obj) ??
                    (typeof obj === "object" && obj != null ? Object.preventExtensions(obj) : false);
                break;
        }

        result = await result;
        return { result, toTransfer, newPath };
    }

    private async _sendResponse(
        reqId: string,
        action: string,
        sender: string,
        path: string[],
        rawResult: any,
        toTransfer: any[]
    ): Promise<void> {
        const result = await rawResult;
        const canBeReturn = (isCanTransfer(result) && toTransfer.includes(result)) || isCanJustReturn(result);

        let finalPath = path;
        if (!canBeReturn && action !== "get" && (typeof result === "object" || typeof result === "function")) {
            if (hasNoPath(result)) {
                finalPath = [UUIDv4()];
                writeByPath(finalPath, result);
            } else {
                finalPath = registeredInPath.get(result) ?? [];
            }
        }

        const ctx = readByPath(finalPath);
        const ctxKey = action === "get" ? finalPath?.at(-1) : undefined;
        const obj = readByPath(path);

        const payload = deepOperateAndClone(result, (el) => objectToRef(el, this._name, toTransfer)) ?? result;

        const response: ChannelMessage = {
            id: reqId,
            channel: sender,
            sender: this._name,
            type: "response",
            reqId,
            payload: {
                result: canBeReturn ? payload : null,
                type: typeof result,
                channel: sender,
                sender: this._name,
                descriptor: {
                    $isDescriptor: true,
                    path: finalPath,
                    owner: this._name,
                    channel: this._name,
                    primitive: isPrimitive(result),
                    writable: true,
                    enumerable: true,
                    configurable: true,
                    argumentCount: obj instanceof Function ? obj.length : -1,
                    ...(typeof ctx === "object" && ctx != null && ctxKey != null
                        ? Object.getOwnPropertyDescriptor(ctx, ctxKey)
                        : {})
                } as WReflectDescriptor
            } as WResp,
            timestamp: Date.now(),
            transferable: toTransfer
        };

        this._send(sender, response, toTransfer);
    }

    // ========================================================================
    // PRIVATE: Transport Management
    // ========================================================================

    private _createTransportBinding(
        target: any,
        transportType: TransportType,
        targetChannel: string,
        options: ConnectOptions
    ): TransportBinding {
        let sender: (msg: any, transfer?: Transferable[]) => void;

        switch (transportType) {
            case "worker":
            case "message-port":
            case "broadcast":
                if (options.autoStart !== false && target.start) target.start();
                sender = (msg, transfer) => target.postMessage(msg, { transfer });
                target.addEventListener?.("message", ((e: MessageEvent) => this._handleIncoming(e.data)) as EventListener);
                break;

            case "websocket":
                sender = (msg) => target.send(JSON.stringify(msg));
                target.addEventListener?.("message", ((e: MessageEvent) => {
                    try { this._handleIncoming(JSON.parse(e.data)); } catch {}
                }) as EventListener);
                break;

            case "chrome-runtime":
                sender = (msg) => chrome.runtime.sendMessage(msg);
                chrome.runtime.onMessage?.addListener?.((msg: any) => this._handleIncoming(msg));
                break;

            case "self":
                sender = (msg, transfer) => postMessage(msg, { transfer: transfer ?? [] });
                addEventListener?.("message", ((e: MessageEvent) => this._handleIncoming(e.data)) as EventListener);
                break;

            default:
                if (options.onMessage) {
                    options.onMessage((msg) => this._handleIncoming(msg));
                }
                sender = (msg) => target?.postMessage?.(msg);
        }

        return { target, targetChannel, transportType, sender };
    }

    private _send(targetChannel: string, message: ChannelMessage, transfer?: Transferable[]): void {
        const binding = this._transports.get(targetChannel) ?? this._defaultTransport;
        binding?.sender(message, transfer);
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
interface TransportBinding {
    target: any;
    targetChannel: string;
    transportType: TransportType;
    sender: (msg: any, transfer?: Transferable[]) => void;
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
