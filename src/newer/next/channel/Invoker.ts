/**
 * Invoker - Requestor/Responder Abstraction
 *
 * Clean RPC-like communication between channel contexts:
 * - Requestor: Invokes commands to remote channel objects/methods
 * - Responder: Listens, executes via Reflect, returns proxy-wrapped results
 *
 * Features:
 * - Auto-detection of connection/transport type
 * - ReflectLike implementation for method invocation
 * - Promise-wrapped proxy responses
 * - Support for Worker, Chrome, BroadcastChannel, WebSocket, etc.
 */

import { UUIDv4, Promised, deepOperateAndClone, isPrimitive, isCanJustReturn, isCanTransfer } from "fest/core";
import { ChannelSubject, type Subscription } from "../observable/Observable";
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
    wrapMap,
    handMap,
    $descriptor,
    $requestHandler,
    READ
} from "../storage/DataBase";

// ============================================================================
// TYPES
// ============================================================================

/** Detected context type */
export type ContextType =
    | "window"           // Main window/document
    | "worker"           // Dedicated Worker
    | "shared-worker"    // SharedWorker
    | "service-worker"   // ServiceWorker
    | "chrome-content"   // Chrome content script
    | "chrome-background"// Chrome background/service worker
    | "chrome-popup"     // Chrome popup
    | "chrome-devtools"  // Chrome devtools
    | "node"             // Node.js environment
    | "deno"             // Deno environment
    | "unknown";

/** Invoker configuration */
export interface InvokerConfig {
    /** Channel name for this invoker */
    channel: string;
    /** Auto-detect context type */
    autoDetect?: boolean;
    /** Timeout for requests (ms) */
    timeout?: number;
    /** Enable response caching */
    cacheResponses?: boolean;
    /** Custom ReflectLike implementation */
    reflectImpl?: ReflectLike;
}

/** ReflectLike interface for custom implementations */
export interface ReflectLike {
    get?(target: any, prop: PropertyKey): any;
    set?(target: any, prop: PropertyKey, value: any): boolean;
    has?(target: any, prop: PropertyKey): boolean;
    apply?(target: any, thisArg: any, args: any[]): any;
    construct?(target: any, args: any[]): any;
    deleteProperty?(target: any, prop: PropertyKey): boolean;
    ownKeys?(target: any): (string | symbol)[];
    getOwnPropertyDescriptor?(target: any, prop: PropertyKey): PropertyDescriptor | undefined;
    getPrototypeOf?(target: any): object | null;
    setPrototypeOf?(target: any, proto: object | null): boolean;
    isExtensible?(target: any): boolean;
    preventExtensions?(target: any): boolean;
}

/** Incoming invocation event */
export interface IncomingInvocation {
    id: string;
    channel: string;
    sender: string;
    action: WReflectAction | string;
    path: string[];
    args: any[];
    timestamp: number;
    contextType?: ContextType;
}

/** Outgoing response */
export interface InvocationResponse {
    id: string;
    channel: string;
    sender: string;
    result: any;
    descriptor?: WReflectDescriptor;
    error?: string;
    timestamp: number;
}

// ============================================================================
// CONTEXT DETECTION
// ============================================================================

/**
 * Detect the current execution context type
 */
export function detectContextType(): ContextType {
    // Check for Deno
    if (typeof (globalThis as any).Deno !== "undefined") {
        return "deno";
    }

    // Check for Node.js
    if (typeof (globalThis as any).process !== "undefined" &&
        (globalThis as any).process?.versions?.node) {
        return "node";
    }

    // Check for Service Worker
    if (typeof ServiceWorkerGlobalScope !== "undefined" &&
        self instanceof ServiceWorkerGlobalScope) {
        return "service-worker";
    }

    // Check for Shared Worker
    if (typeof SharedWorkerGlobalScope !== "undefined" &&
        self instanceof SharedWorkerGlobalScope) {
        return "shared-worker";
    }

    // Check for Dedicated Worker
    if (typeof DedicatedWorkerGlobalScope !== "undefined" &&
        self instanceof DedicatedWorkerGlobalScope) {
        return "worker";
    }

    // Check for Chrome extension contexts
    if (typeof chrome !== "undefined" && chrome.runtime?.id) {
        // Check for background/service worker context
        if (typeof chrome.runtime.getBackgroundPage === "function" ||
            (chrome.runtime.getManifest?.()?.background as any)?.service_worker) {
            return "chrome-background";
        }

        // Check for devtools
        if (typeof (chrome as any).devtools !== "undefined") {
            return "chrome-devtools";
        }

        // Check for popup (has window but limited APIs)
        if (typeof document !== "undefined" &&
            window.location.protocol === "chrome-extension:") {
            const views = chrome.extension?.getViews?.({ type: "popup" }) ?? [];
            if (views.includes(window)) {
                return "chrome-popup";
            }
        }

        // Content script (has document but in web page context)
        if (typeof document !== "undefined" &&
            window.location.protocol !== "chrome-extension:") {
            return "chrome-content";
        }
    }

    // Check for window/document (browser main thread)
    if (typeof window !== "undefined" && typeof document !== "undefined") {
        return "window";
    }

    return "unknown";
}

/**
 * Detect transport type from a connection source
 */
export function detectTransportType(
    source: Worker | MessagePort | BroadcastChannel | WebSocket | any
): TransportType {
    if (!source) return "internal";

    // Worker types
    if (typeof Worker !== "undefined" && source instanceof Worker) {
        return "worker";
    }
    if (typeof SharedWorker !== "undefined" && source instanceof SharedWorker) {
        return "shared-worker";
    }

    // MessagePort
    if (typeof MessagePort !== "undefined" && source instanceof MessagePort) {
        return "message-port";
    }

    // BroadcastChannel
    if (typeof BroadcastChannel !== "undefined" && source instanceof BroadcastChannel) {
        return "broadcast";
    }

    // WebSocket
    if (typeof WebSocket !== "undefined" && source instanceof WebSocket) {
        return "websocket";
    }

    // RTCDataChannel
    if (typeof RTCDataChannel !== "undefined" && source instanceof RTCDataChannel) {
        return "rtc-data";
    }

    // Chrome runtime (string identifier)
    if (source === "chrome-runtime" || source === "chrome-tabs") {
        return source as TransportType;
    }

    // Self (same context)
    if (source === self || source === globalThis || source === "self") {
        return "self";
    }

    return "internal";
}

/**
 * Detect incoming connection context from message data
 */
export function detectIncomingContextType(data: any): ContextType {
    if (!data) return "unknown";

    // Check for explicit context type
    if (data.contextType) return data.contextType;

    // Infer from sender name patterns
    const sender = data.sender ?? "";
    if (sender.includes("worker")) return "worker";
    if (sender.includes("sw") || sender.includes("service")) return "service-worker";
    if (sender.includes("chrome") || sender.includes("crx")) return "chrome-content";
    if (sender.includes("background")) return "chrome-background";

    return "unknown";
}

// ============================================================================
// REFLECT-LIKE IMPLEMENTATION
// ============================================================================

/**
 * Default ReflectLike implementation using native Reflect
 */
export const DefaultReflect: ReflectLike = {
    get: (target, prop) => Reflect.get(target, prop),
    set: (target, prop, value) => Reflect.set(target, prop, value),
    has: (target, prop) => Reflect.has(target, prop),
    apply: (target, thisArg, args) => Reflect.apply(target, thisArg, args),
    construct: (target, args) => Reflect.construct(target, args),
    deleteProperty: (target, prop) => Reflect.deleteProperty(target, prop),
    ownKeys: (target) => Reflect.ownKeys(target) as (string | symbol)[],
    getOwnPropertyDescriptor: (target, prop) => Reflect.getOwnPropertyDescriptor(target, prop),
    getPrototypeOf: (target) => Reflect.getPrototypeOf(target),
    setPrototypeOf: (target, proto) => Reflect.setPrototypeOf(target, proto),
    isExtensible: (target) => Reflect.isExtensible(target),
    preventExtensions: (target) => Reflect.preventExtensions(target)
};

// ============================================================================
// REQUESTOR
// ============================================================================

/**
 * Requestor - Invokes commands to remote channel objects/methods
 *
 * The host/context object that sends requests to remote destinations.
 * Returns Promise-wrapped proxy responses.
 */
export class Requestor {
    private _channel: string;
    private _contextType: ContextType;
    private _config: Required<InvokerConfig>;
    // @ts-ignore
    private _pending = new Map<string, PromiseWithResolvers<any>>();
    private _sender: ((msg: any, transfer?: Transferable[]) => void) | null = null;
    private _subscriptions: Subscription[] = [];
    private _responseSubject = new ChannelSubject<InvocationResponse>({ bufferSize: 100 });

    constructor(config: InvokerConfig) {
        this._channel = config.channel;
        this._contextType = config.autoDetect !== false ? detectContextType() : "unknown";
        this._config = {
            channel: config.channel,
            autoDetect: config.autoDetect ?? true,
            timeout: config.timeout ?? 30000,
            cacheResponses: config.cacheResponses ?? false,
            reflectImpl: config.reflectImpl ?? DefaultReflect
        };
    }

    /**
     * Connect to a transport target for sending requests
     */
    connect(
        target: Worker | MessagePort | BroadcastChannel | WebSocket | any,
        options: { onMessage?: (handler: (msg: any) => void) => void } = {}
    ): this {
        const transportType = detectTransportType(target);

        // Setup sender based on transport type
        switch (transportType) {
            case "worker":
            case "message-port":
            case "broadcast":
                this._sender = (msg, transfer) => target.postMessage(msg, { transfer });
                target.addEventListener?.("message", ((e: MessageEvent) => this._handleResponse(e.data)) as EventListener);
                break;

            case "websocket":
                this._sender = (msg) => target.send(JSON.stringify(msg));
                target.addEventListener?.("message", ((e: MessageEvent) => {
                    try { this._handleResponse(JSON.parse(e.data)); } catch {}
                }) as EventListener);
                break;

            case "chrome-runtime":
                this._sender = (msg) => chrome.runtime.sendMessage(msg);
                chrome.runtime.onMessage?.addListener?.((msg: any) => this._handleResponse(msg));
                break;

            case "self":
                this._sender = (msg, transfer) => postMessage(msg, { transfer: transfer ?? [] });
                addEventListener?.("message", ((e: MessageEvent) => this._handleResponse(e.data)) as EventListener);
                break;

            default:
                if (options.onMessage) {
                    options.onMessage((msg) => this._handleResponse(msg));
                }
                this._sender = (msg) => target?.postMessage?.(msg);
        }

        return this;
    }

    /**
     * Invoke a method on a remote object
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

        // Send request
        this._sender?.({
            type: "request",
            id,
            channel: targetChannel,
            sender: this._channel,
            contextType: this._contextType,
            payload: {
                channel: targetChannel,
                sender: this._channel,
                action,
                path,
                args
            },
            timestamp: Date.now()
        });

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

    /**
     * Import module on remote
     */
    importModule<T = any>(targetChannel: string, url: string): Promise<T> {
        return this.invoke(targetChannel, WReflectAction.IMPORT, [], [url]);
    }

    /**
     * Create a proxy wrapper for a remote channel
     *
     * Returns a Proxy that transparently forwards all operations
     * to the remote channel.
     */
    createProxy<T = any>(targetChannel: string, basePath: string[] = []): T {
        return this._createProxyInternal(targetChannel, basePath) as T;
    }

    /**
     * Observable: Response events
     */
    get onResponse() {
        return this._responseSubject;
    }

    /**
     * Get current context type
     */
    get contextType(): ContextType {
        return this._contextType;
    }

    /**
     * Close and cleanup
     */
    close(): void {
        this._subscriptions.forEach(s => s.unsubscribe());
        this._pending.clear();
        this._responseSubject.complete();
    }

    // ========================================================================
    // PRIVATE
    // ========================================================================

    private _handleResponse(data: any): void {
        if (!data || data.type !== "response") return;

        const id = data.reqId ?? data.id;
        const resolvers = this._pending.get(id);

        if (resolvers) {
            this._pending.delete(id);

            if (data.payload?.error) {
                resolvers.reject(new Error(data.payload.error));
            } else {
                // Resolve with result or proxy-wrapped descriptor
                const result = data.payload?.result;
                const descriptor = data.payload?.descriptor;

                if (result !== null && result !== undefined) {
                    resolvers.resolve(result);
                } else if (descriptor) {
                    resolvers.resolve(this._wrapDescriptor(descriptor, data.sender));
                } else {
                    resolvers.resolve(undefined);
                }
            }

            // Emit response event
            this._responseSubject.next({
                id,
                channel: data.channel,
                sender: data.sender,
                result: data.payload?.result,
                descriptor: data.payload?.descriptor,
                timestamp: Date.now()
            });
        }
    }

    private _wrapDescriptor(descriptor: WReflectDescriptor, targetChannel: string): any {
        if (!descriptor || typeof descriptor !== "object") return descriptor;
        if (descriptor.primitive) return descriptor;
        if (descMap.has(descriptor)) return descMap.get(descriptor);

        const proxy = this._createProxyInternal(targetChannel, descriptor.path);
        descMap.set(descriptor, proxy);
        return proxy;
    }

    private _createProxyInternal(targetChannel: string, basePath: string[]): any {
        const self = this;
        const fn: any = function() {};

        const handler: ProxyHandler<any> = {
            get(target, prop) {
                if (prop === $requestHandler) return true;
                if (prop === $descriptor) return { path: basePath, channel: targetChannel };
                if (prop === "then" || prop === "catch" || prop === "finally") return undefined;
                if (typeof prop === "symbol") return undefined;

                const newPath = [...basePath, String(prop)];
                return self._createProxyInternal(targetChannel, newPath);
            },

            set(target, prop, value) {
                self.set(targetChannel, basePath, String(prop), value);
                return true;
            },

            apply(target, thisArg, args) {
                return self.call(targetChannel, basePath, args);
            },

            construct(target, args) {
                return self.construct(targetChannel, basePath, args);
            },

            has(target, prop) {
                return self.invoke(targetChannel, WReflectAction.HAS, basePath, [prop]);
            },

            deleteProperty(target, prop) {
                return self.invoke(targetChannel, WReflectAction.DELETE_PROPERTY, [...basePath, String(prop)], []);
            },

            ownKeys() {
                return [];
            }
        };

        return new Proxy(fn, handler);
    }
}

// ============================================================================
// RESPONDER
// ============================================================================

/**
 * Responder - Listens for invocations and returns proxy-wrapped results
 *
 * Processes incoming requests using ReflectLike operations
 * and sends back proxy-wrapped responses.
 */
export class Responder {
    private _channel: string;
    private _contextType: ContextType;
    private _config: Required<InvokerConfig>;
    private _sender: ((msg: any, transfer?: Transferable[]) => void) | null = null;
    private _subscriptions: Subscription[] = [];
    private _invocationSubject = new ChannelSubject<IncomingInvocation>({ bufferSize: 100 });

    constructor(config: InvokerConfig) {
        this._channel = config.channel;
        this._contextType = config.autoDetect !== false ? detectContextType() : "unknown";
        this._config = {
            channel: config.channel,
            autoDetect: config.autoDetect ?? true,
            timeout: config.timeout ?? 30000,
            cacheResponses: config.cacheResponses ?? false,
            reflectImpl: config.reflectImpl ?? DefaultReflect
        };
    }

    /**
     * Listen on a transport target for incoming requests
     */
    listen(
        source: Worker | MessagePort | BroadcastChannel | WebSocket | any,
        options: { onMessage?: (handler: (msg: any) => void) => (() => void) } = {}
    ): this {
        const transportType = detectTransportType(source);

        // Setup listener and sender based on transport type
        const handler = (data: any) => this._handleRequest(data);

        switch (transportType) {
            case "worker":
            case "message-port":
            case "broadcast":
                source.addEventListener?.("message", ((e: MessageEvent) => handler(e.data)) as EventListener);
                this._sender = (msg, transfer) => source.postMessage(msg, { transfer });
                break;

            case "websocket":
                source.addEventListener?.("message", ((e: MessageEvent) => {
                    try { handler(JSON.parse(e.data)); } catch {}
                }) as EventListener);
                this._sender = (msg) => source.send(JSON.stringify(msg));
                break;

            case "chrome-runtime":
                chrome.runtime.onMessage?.addListener?.((msg: any, sender: any, sendResponse: any) => {
                    handler(msg);
                    return true; // Keep channel open for async response
                });
                this._sender = (msg) => chrome.runtime.sendMessage(msg);
                break;

            case "self":
                addEventListener?.("message", ((e: MessageEvent) => handler(e.data)) as EventListener);
                this._sender = (msg, transfer) => postMessage(msg, { transfer: transfer ?? [] });
                break;

            default:
                if (options.onMessage) {
                    options.onMessage(handler);
                }
                this._sender = (msg) => source?.postMessage?.(msg);
        }

        return this;
    }

    /**
     * Expose an object for remote invocation
     *
     * @param name - Path name for the exposed object
     * @param obj - Object to expose
     */
    expose(name: string, obj: any): this {
        writeByPath([name], obj);
        return this;
    }

    /**
     * Observable: Incoming invocation events
     */
    get onInvocation() {
        return this._invocationSubject;
    }

    /**
     * Subscribe to invocations
     */
    subscribeInvocations(handler: (inv: IncomingInvocation) => void): Subscription {
        return this._invocationSubject.subscribe(handler);
    }

    /**
     * Get current context type
     */
    get contextType(): ContextType {
        return this._contextType;
    }

    /**
     * Close and cleanup
     */
    close(): void {
        this._subscriptions.forEach(s => s.unsubscribe());
        this._invocationSubject.complete();
    }

    // ========================================================================
    // PRIVATE
    // ========================================================================

    private async _handleRequest(data: any): Promise<void> {
        if (!data || data.type !== "request") return;
        if (data.channel !== this._channel) return;

        const payload = data.payload as WReq;
        if (!payload) return;

        const { action, path, args, sender } = payload;
        const reqId = data.reqId ?? data.id;

        // Emit invocation event
        this._invocationSubject.next({
            id: reqId,
            channel: this._channel,
            sender,
            action,
            path,
            args: args ?? [],
            timestamp: Date.now(),
            contextType: detectIncomingContextType(data)
        });

        // Execute action
        const { result, toTransfer, newPath } = await this._executeAction(action, path, args ?? [], sender);

        // Build and send response
        await this._sendResponse(reqId, action, sender, newPath, result, toTransfer);
    }

    private async _executeAction(
        action: string,
        path: string[],
        args: any[],
        sender: string
    ): Promise<{ result: any; toTransfer: any[]; newPath: string[] }> {
        const reflect = this._config.reflectImpl;
        const obj = readByPath(path);
        const toTransfer: any[] = [];
        let result: any = null;
        let newPath = path;

        switch (action) {
            case WReflectAction.IMPORT:
                result = await import(args?.[0]);
                break;

            case WReflectAction.TRANSFER:
                if (isCanTransfer(obj) && this._channel !== sender) {
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

                    if (isCanTransfer(result) && path?.at(-1) === "transfer" && this._channel !== sender) {
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

        // Await if promise
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

        // Generate path for non-primitive results
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

        const payload = deepOperateAndClone(result, (el) => objectToRef(el, this._channel, toTransfer)) ?? result;

        const response = {
            type: "response",
            id: reqId,
            reqId,
            channel: sender,
            sender: this._channel,
            contextType: this._contextType,
            payload: {
                result: canBeReturn ? payload : null,
                type: typeof result,
                channel: sender,
                sender: this._channel,
                descriptor: {
                    $isDescriptor: true,
                    path: finalPath,
                    owner: this._channel,
                    channel: this._channel,
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
            timestamp: Date.now()
        };

        this._sender?.(response, toTransfer);
    }
}

// ============================================================================
// BIDIRECTIONAL INVOKER
// ============================================================================

/**
 * BidirectionalInvoker - Combined Requestor and Responder
 *
 * A single object that can both send and receive invocations,
 * enabling full RPC-style communication.
 */
export class BidirectionalInvoker {
    public readonly requestor: Requestor;
    public readonly responder: Responder;
    private _contextType: ContextType;

    constructor(config: InvokerConfig) {
        this._contextType = config.autoDetect !== false ? detectContextType() : "unknown";
        this.requestor = new Requestor(config);
        this.responder = new Responder(config);
    }

    /**
     * Connect to a transport (for both sending and receiving)
     */
    connect(
        target: Worker | MessagePort | BroadcastChannel | WebSocket | any
    ): this {
        this.requestor.connect(target);
        this.responder.listen(target);
        return this;
    }

    /**
     * Expose an object for remote invocation
     */
    expose(name: string, obj: any): this {
        this.responder.expose(name, obj);
        return this;
    }

    /**
     * Create a proxy for a remote channel
     */
    createProxy<T = any>(targetChannel: string, basePath: string[] = []): T {
        return this.requestor.createProxy(targetChannel, basePath);
    }

    /**
     * Import module on remote
     */
    importModule<T = any>(targetChannel: string, url: string): Promise<T> {
        return this.requestor.importModule(targetChannel, url);
    }

    /**
     * Get context type
     */
    get contextType(): ContextType {
        return this._contextType;
    }

    /**
     * Close and cleanup
     */
    close(): void {
        this.requestor.close();
        this.responder.close();
    }
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Create a Requestor for a channel
 */
export function createRequestor(channel: string, config?: Partial<InvokerConfig>): Requestor {
    return new Requestor({ channel, ...config });
}

/**
 * Create a Responder for a channel
 */
export function createResponder(channel: string, config?: Partial<InvokerConfig>): Responder {
    return new Responder({ channel, ...config });
}

/**
 * Create a bidirectional invoker
 */
export function createInvoker(channel: string, config?: Partial<InvokerConfig>): BidirectionalInvoker {
    return new BidirectionalInvoker({ channel, ...config });
}

/**
 * Quick setup: Create invoker and connect to transport
 */
export function setupInvoker(
    channel: string,
    target: Worker | MessagePort | BroadcastChannel | WebSocket | any,
    config?: Partial<InvokerConfig>
): BidirectionalInvoker {
    return createInvoker(channel, config).connect(target);
}

/**
 * Auto-setup: Detect context and create appropriate invoker
 */
export function autoInvoker(
    channel: string,
    config?: Partial<InvokerConfig>
): BidirectionalInvoker {
    const invoker = createInvoker(channel, { autoDetect: true, ...config });
    const contextType = detectContextType();

    // Auto-connect based on context
    switch (contextType) {
        case "worker":
        case "service-worker":
        case "shared-worker":
            invoker.connect(self);
            break;

        case "chrome-content":
        case "chrome-background":
        case "chrome-popup":
            invoker.connect("chrome-runtime" as any);
            break;

        default:
            // Window or unknown - don't auto-connect
            break;
    }

    return invoker;
}
