/**
 * Proxy - Unified Remote Proxy Creation
 *
 * Single source of truth for all proxy-related functionality:
 * - Remote object proxies (transparent RPC)
 * - Descriptor-based proxies
 * - Type-safe proxy creation
 * - Expose/listen patterns
 */

import { UUIDv4 } from "fest/core";
import { WReflectAction, type WReflectDescriptor } from "../types/Interface";
import {
    $descriptor,
    $requestHandler,
    descMap,
    wrapMap
} from "../storage/DataBase";
import { createObjectHandler, type ReflectLike as CoreReflectLike } from "../../core/RequestHandler";

// ============================================================================
// TYPES
// ============================================================================

/** Proxy invoker function - sends requests to remote */
export type ProxyInvoker = (
    action: WReflectAction | string,
    path: string[],
    args: any[]
) => Promise<any>;

/** Proxy descriptor with metadata */
export interface ProxyDescriptor {
    /** Object path on remote */
    path: string[];
    /** Target channel name */
    channel: string;
    /** Owner channel */
    owner?: string;
    /** Is primitive value */
    primitive?: boolean;
}

/** Proxy configuration */
export interface ProxyConfig {
    /** Target channel for requests */
    channel: string;
    /** Base path for property access */
    basePath?: string[];
    /** Custom invoker function */
    invoker?: ProxyInvoker;
    /** Cache created proxies */
    cache?: boolean;
    /** Timeout for requests (ms) */
    timeout?: number;
}

/** Convert object methods to Promise-returning versions */
export type ProxyMethods<T> = {
    [K in keyof T]: T[K] extends (...args: infer A) => infer R
        ? (...args: A) => Promise<Awaited<R>>
        : Promise<T[K]>;
};

/** Remote proxy with metadata access */
export type RemoteProxy<T = any> = ProxyMethods<T> & {
    /** Get the proxy path */
    readonly $path: string[];
    /** Get the target channel */
    readonly $channel: string;
    /** Get the descriptor */
    readonly $descriptor: ProxyDescriptor;
    /** Direct invoke method */
    $invoke: ProxyInvoker;
};

/** Exposer handler for incoming requests */
export type ExposeHandler = (
    action: string,
    path: string[],
    args: any[]
) => Promise<any>;

// ============================================================================
// SYMBOLS
// ============================================================================

/** Symbol to identify proxy objects */
export const PROXY_MARKER = Symbol.for("uniform.proxy");

/** Symbol to access proxy internals */
export const PROXY_INTERNALS = Symbol.for("uniform.proxy.internals");

// ============================================================================
// PROXY HANDLER
// ============================================================================

/**
 * RemoteProxyHandler - Unified proxy handler for remote invocation
 *
 * Handles all Reflect operations and forwards them to the invoker.
 */
export class RemoteProxyHandler implements ProxyHandler<Function> {
    private _config: Required<ProxyConfig>;
    private _childCache = new Map<string, any>();

    constructor(
        private _invoker: ProxyInvoker,
        config: ProxyConfig
    ) {
        this._config = {
            channel: config.channel,
            basePath: config.basePath ?? [],
            invoker: _invoker,
            cache: config.cache ?? true,
            timeout: config.timeout ?? 30000
        };
    }

    /** Get property - returns nested proxy or invokes GET */
    get(target: Function, prop: PropertyKey, receiver: any): any {
        const propStr = String(prop);

        // Handle special properties
        if (prop === PROXY_MARKER) return true;
        if (prop === PROXY_INTERNALS) return this._config;
        if (prop === $requestHandler) return true;
        if (prop === $descriptor) return this._getDescriptor();

        // Promise methods - return undefined to allow await
        if (prop === "then" || prop === "catch" || prop === "finally") return undefined;

        // Symbol properties
        if (typeof prop === "symbol") return undefined;

        // Metadata accessors
        if (prop === "$path") return this._config.basePath;
        if (prop === "$channel") return this._config.channel;
        if (prop === "$descriptor") return this._getDescriptor();
        if (prop === "$invoke") return this._invoker;

        // Create child proxy for nested access
        const childPath = [...this._config.basePath, propStr];

        if (this._config.cache && this._childCache.has(propStr)) {
            return this._childCache.get(propStr);
        }

        const childProxy = createRemoteProxy(this._invoker, {
            ...this._config,
            basePath: childPath
        });

        if (this._config.cache) {
            this._childCache.set(propStr, childProxy);
        }

        return childProxy;
    }

    /** Set property */
    set(target: Function, prop: PropertyKey, value: any, receiver: any): boolean {
        if (typeof prop === "symbol") return true;

        this._invoker(
            WReflectAction.SET,
            [...this._config.basePath, String(prop)],
            [value]
        );
        return true;
    }

    /** Apply function */
    apply(target: Function, thisArg: any, args: any[]): any {
        return this._invoker(
            WReflectAction.APPLY,
            this._config.basePath,
            [args]
        );
    }

    /** Construct new instance */
    construct(target: Function, args: any[], newTarget: Function): object {
        return this._invoker(
            WReflectAction.CONSTRUCT,
            this._config.basePath,
            [args]
        ) as any;
    }

    /** Check if property exists */
    has(target: Function, prop: PropertyKey): boolean {
        if (typeof prop === "symbol") return false;
        return this._invoker(
            WReflectAction.HAS,
            this._config.basePath,
            [prop]
        ) as any;
    }

    /** Delete property */
    deleteProperty(target: Function, prop: PropertyKey): boolean {
        if (typeof prop === "symbol") return true;
        return this._invoker(
            WReflectAction.DELETE_PROPERTY,
            [...this._config.basePath, String(prop)],
            []
        ) as any;
    }

    /** Get own keys */
    ownKeys(target: Function): ArrayLike<string | symbol> {
        return [];
    }

    /** Get property descriptor */
    getOwnPropertyDescriptor(target: Function, prop: PropertyKey): PropertyDescriptor | undefined {
        return { configurable: true, enumerable: true, writable: true };
    }

    /** Get prototype */
    getPrototypeOf(target: Function): object | null {
        return Function.prototype;
    }

    /** Set prototype */
    setPrototypeOf(target: Function, proto: object | null): boolean {
        return this._invoker(
            WReflectAction.SET_PROTOTYPE_OF,
            this._config.basePath,
            [proto]
        ) as any;
    }

    /** Check if extensible */
    isExtensible(target: Function): boolean {
        return true;
    }

    /** Prevent extensions */
    preventExtensions(target: Function): boolean {
        return this._invoker(
            WReflectAction.PREVENT_EXTENSIONS,
            this._config.basePath,
            []
        ) as any;
    }

    /** Get descriptor for this proxy */
    private _getDescriptor(): ProxyDescriptor {
        return {
            path: this._config.basePath,
            channel: this._config.channel,
            primitive: false
        };
    }
}

// ============================================================================
// DISPATCH HANDLER (Legacy compatible)
// ============================================================================

/**
 * DispatchProxyHandler - Delegates all operations to a dispatcher
 *
 * Used for backward compatibility with RequestProxyHandlerV2.
 */
export class DispatchProxyHandler implements ProxyHandler<Function> {
    constructor(private _dispatch: (action: WReflectAction, args: any[]) => any) {}

    get(...args: any[]) { return this._dispatch(WReflectAction.GET, args); }
    set(...args: any[]) { return this._dispatch(WReflectAction.SET, args); }
    has(...args: any[]) { return this._dispatch(WReflectAction.HAS, args); }
    deleteProperty(...args: any[]) { return this._dispatch(WReflectAction.DELETE_PROPERTY, args); }
    getOwnPropertyDescriptor(...args: any[]) { return this._dispatch(WReflectAction.GET_OWN_PROPERTY_DESCRIPTOR, args); }
    getPrototypeOf(...args: any[]) { return this._dispatch(WReflectAction.GET_PROTOTYPE_OF, args); }
    setPrototypeOf(...args: any[]) { return this._dispatch(WReflectAction.SET_PROTOTYPE_OF, args); }
    isExtensible(...args: any[]) { return this._dispatch(WReflectAction.IS_EXTENSIBLE, args); }
    preventExtensions(...args: any[]) { return this._dispatch(WReflectAction.PREVENT_EXTENSIONS, args); }
    ownKeys(...args: any[]) { return this._dispatch(WReflectAction.OWN_KEYS, args) ?? []; }
    apply(...args: any[]) { return this._dispatch(WReflectAction.APPLY, args); }
    construct(...args: any[]) { return this._dispatch(WReflectAction.CONSTRUCT, args); }
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Create a remote proxy for transparent RPC
 *
 * @param invoker - Function to invoke remote operations
 * @param config - Proxy configuration
 * @returns Proxy object that forwards all operations to remote
 *
 * @example
 * const proxy = createRemoteProxy(
 *     (action, path, args) => channel.invoke(targetChannel, action, path, args),
 *     { channel: "worker" }
 * );
 *
 * // All operations are forwarded
 * await proxy.math.add(1, 2);
 * await proxy.user.name;
 * proxy.config.debug = true;
 */
export function createRemoteProxy<T = any>(
    invoker: ProxyInvoker,
    config: ProxyConfig
): RemoteProxy<T> {
    const fn: any = function() {};
    const handler = new RemoteProxyHandler(invoker, config);
    return new Proxy(fn, handler) as RemoteProxy<T>;
}

/**
 * Create proxy from descriptor
 *
 * Wraps a WReflectDescriptor into a usable proxy object.
 *
 * @param descriptor - Remote object descriptor
 * @param invoker - Function to invoke remote operations
 * @param targetChannel - Override channel from descriptor
 */
export function wrapDescriptor<T = any>(
    descriptor: WReflectDescriptor,
    invoker: ProxyInvoker,
    targetChannel?: string
): RemoteProxy<T> | T {
    if (!descriptor || typeof descriptor !== "object") return descriptor as T;
    if (descriptor.primitive) return descriptor as unknown as T;

    // Check cache (use any for map compatibility)
    const cached = descMap.get(descriptor);
    if (cached) return cached as unknown as RemoteProxy<T>;

    const proxy = createRemoteProxy<T>(invoker, {
        channel: targetChannel ?? descriptor.channel ?? "unknown",
        basePath: descriptor.path ?? []
    });

    // Cache the proxy
    (descMap as Map<any, any>).set(descriptor, proxy);
    (wrapMap as Map<any, any>).set(proxy, descriptor);

    return proxy;
}

/**
 * Check if value is a remote proxy
 */
export function isRemoteProxy(value: any): value is RemoteProxy {
    if (!value) return false;
    if (typeof value !== "object" && typeof value !== "function") return false;
    try {
        // Access via Reflect to trigger proxy trap
        return Reflect.get(value, PROXY_MARKER) === true;
    } catch {
        return false;
    }
}

/**
 * Get proxy descriptor if value is a proxy
 */
export function getProxyDescriptor(value: any): ProxyDescriptor | null {
    if (!isRemoteProxy(value)) return null;
    return value.$descriptor ?? null;
}

/**
 * Get proxy internals (config)
 */
export function getProxyInternals(value: any): ProxyConfig | null {
    if (!isRemoteProxy(value)) return null;
    try {
        // Use Reflect to get symbol property
        const internals = Reflect.get(value, PROXY_INTERNALS);
        if (!internals || typeof internals !== "object") return null;
        return internals as ProxyConfig;
    } catch {
        return null;
    }
}

// ============================================================================
// EXPOSE UTILITIES
// ============================================================================

/**
 * Create an expose handler for an object
 *
 * Uses the unified RequestHandler for consistent behavior.
 *
 * @param target - Object to expose
 * @param reflect - Optional custom Reflect implementation
 * @returns Handler function for incoming requests
 */
export function createExposeHandler<T extends object>(
    target: T,
    reflect?: CoreReflectLike
): ExposeHandler {
    return createObjectHandler(target, reflect);
}

// ============================================================================
// PORT-BASED PROXY (Simplified)
// ============================================================================

/** Sender interface for port-based proxy */
export interface ProxySender {
    request(msg: any): Promise<any>;
    readonly channelName: string;
    readonly senderId?: string;
}

/**
 * Create a proxy for remote object over a sender (MessagePort, etc.)
 *
 * @param sender - Object with request() method
 * @param basePath - Base path for property access
 */
export function createSenderProxy<T extends object>(
    sender: ProxySender,
    basePath: string[] = []
): ProxyMethods<T> {
    const invoker: ProxyInvoker = (action, path, args) => {
        return sender.request({
            id: UUIDv4(),
            channel: sender.channelName,
            sender: sender.senderId ?? "proxy",
            type: "request",
            payload: { action, path, args }
        });
    };

    return createRemoteProxy<T>(invoker, {
        channel: sender.channelName,
        basePath
    }) as ProxyMethods<T>;
}

// ============================================================================
// PROXY BUILDER (Fluent API)
// ============================================================================

/**
 * ProxyBuilder - Fluent API for creating proxies
 *
 * @example
 * const proxy = new ProxyBuilder()
 *     .channel("worker")
 *     .path(["modules", "math"])
 *     .invoker((action, path, args) => channel.invoke(...))
 *     .timeout(5000)
 *     .build();
 */
export class ProxyBuilder<T = any> {
    private _config: Partial<ProxyConfig> = {};
    private _invoker: ProxyInvoker | null = null;

    /** Set target channel */
    channel(name: string): this {
        this._config.channel = name;
        return this;
    }

    /** Set base path */
    path(basePath: string[]): this {
        this._config.basePath = basePath;
        return this;
    }

    /** Set invoker function */
    invoker(fn: ProxyInvoker): this {
        this._invoker = fn;
        return this;
    }

    /** Set timeout */
    timeout(ms: number): this {
        this._config.timeout = ms;
        return this;
    }

    /** Enable/disable caching */
    cache(enabled: boolean): this {
        this._config.cache = enabled;
        return this;
    }

    /** Build the proxy */
    build(): RemoteProxy<T> {
        if (!this._invoker) {
            throw new Error("Invoker is required. Call .invoker() before .build()");
        }
        if (!this._config.channel) {
            throw new Error("Channel is required. Call .channel() before .build()");
        }
        return createRemoteProxy<T>(this._invoker, this._config as ProxyConfig);
    }
}

/**
 * Create a new proxy builder
 */
export function proxyBuilder<T = any>(): ProxyBuilder<T> {
    return new ProxyBuilder<T>();
}

// ============================================================================
// LEGACY EXPORTS (Backward Compatibility)
// ============================================================================

/** @deprecated Use RemoteProxyHandler */
export { RemoteProxyHandler as RequestProxyHandler };

/** @deprecated Use createRemoteProxy */
export const makeProxy = createRemoteProxy;

/** @deprecated Use wrapDescriptor */
export const makeRequestProxy = wrapDescriptor;
