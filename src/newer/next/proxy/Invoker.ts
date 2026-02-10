/**
 * Invoker - Requestor/Responder Abstraction
 *
 * Thin wrapper around UnifiedChannel providing:
 * - Requestor: Invokes commands to remote channel objects/methods
 * - Responder: Listens, executes via Reflect, returns proxy-wrapped results
 * - Auto-detection of connection/transport type
 */

import { UUIDv4 } from "fest/core";
import { UnifiedChannel, createUnifiedChannel, type UnifiedChannelConfig, type ConnectOptions } from "../channel/UnifiedChannel";
import type { Subscription, ChannelMessage } from "../observable/Observable";
import { WReflectAction, type WReflectDescriptor, type TransportType } from "../types/Interface";

// ============================================================================
// TYPES
// ============================================================================

/** Detected context type */
export type ContextType =
    | "window" | "worker" | "shared-worker" | "service-worker"
    | "chrome-content" | "chrome-background" | "chrome-popup" | "chrome-devtools"
    | "node" | "deno" | "unknown";

/** Invoker configuration */
export interface InvokerConfig {
    channel: string;
    autoDetect?: boolean;
    timeout?: number;
    cacheResponses?: boolean;
    reflectImpl?: ReflectLike;
}

/** ReflectLike interface */
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

export function detectContextType(): ContextType {
    if (typeof (globalThis as any).Deno !== "undefined") return "deno";
    if (typeof (globalThis as any).process !== "undefined" && (globalThis as any).process?.versions?.node) return "node";
    if (typeof ServiceWorkerGlobalScope !== "undefined" && self instanceof ServiceWorkerGlobalScope) return "service-worker";
    if (typeof SharedWorkerGlobalScope !== "undefined" && self instanceof SharedWorkerGlobalScope) return "shared-worker";
    if (typeof DedicatedWorkerGlobalScope !== "undefined" && self instanceof DedicatedWorkerGlobalScope) return "worker";

    if (typeof chrome !== "undefined" && chrome.runtime?.id) {
        if (typeof chrome.runtime.getBackgroundPage === "function" || (chrome.runtime.getManifest?.()?.background as any)?.service_worker) return "chrome-background";
        if (typeof (chrome as any).devtools !== "undefined") return "chrome-devtools";
        if (typeof document !== "undefined" && window.location.protocol === "chrome-extension:") {
            const views = chrome.extension?.getViews?.({ type: "popup" }) ?? [];
            if (views.includes(window)) return "chrome-popup";
        }
        if (typeof document !== "undefined" && window.location.protocol !== "chrome-extension:") return "chrome-content";
    }

    if (typeof window !== "undefined" && typeof document !== "undefined") return "window";
    return "unknown";
}

export function detectTransportType(source: Worker | MessagePort | BroadcastChannel | WebSocket | any): TransportType {
    if (!source) return "internal";
    if (typeof Worker !== "undefined" && source instanceof Worker) return "worker";
    if (typeof SharedWorker !== "undefined" && source instanceof SharedWorker) return "shared-worker";
    if (typeof MessagePort !== "undefined" && source instanceof MessagePort) return "message-port";
    if (typeof BroadcastChannel !== "undefined" && source instanceof BroadcastChannel) return "broadcast";
    if (typeof WebSocket !== "undefined" && source instanceof WebSocket) return "websocket";
    if (typeof RTCDataChannel !== "undefined" && source instanceof RTCDataChannel) return "rtc-data";
    if (source === "chrome-runtime" || source === "chrome-tabs" || source === "chrome-port" || source === "chrome-external") {
        return source as TransportType;
    }
    if (
        typeof chrome !== "undefined" &&
        source &&
        typeof source === "object" &&
        typeof source.postMessage === "function" &&
        source.onMessage?.addListener
    ) {
        return "chrome-port";
    }
    if (source === self || source === globalThis || source === "self") return "self";
    return "internal";
}

export function detectIncomingContextType(data: any): ContextType {
    if (!data) return "unknown";
    if (data.contextType) return data.contextType;
    const sender = data.sender ?? "";
    if (sender.includes("worker")) return "worker";
    if (sender.includes("sw") || sender.includes("service")) return "service-worker";
    if (sender.includes("chrome") || sender.includes("crx")) return "chrome-content";
    if (sender.includes("background")) return "chrome-background";
    return "unknown";
}

// ============================================================================
// DEFAULT REFLECT
// ============================================================================

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
// REQUESTOR (Wrapper around UnifiedChannel for sending)
// ============================================================================

export class Requestor {
    private _channel: UnifiedChannel;
    private _contextType: ContextType;

    constructor(config: InvokerConfig) {
        this._contextType = config.autoDetect !== false ? detectContextType() : "unknown";
        this._channel = createUnifiedChannel({
            name: config.channel,
            timeout: config.timeout,
            autoListen: false
        });
    }

    connect(target: Worker | MessagePort | BroadcastChannel | WebSocket | any, options?: ConnectOptions): this {
        this._channel.connect(target, options);
        return this;
    }

    invoke<T = any>(targetChannel: string, action: WReflectAction, path: string[], args: any[] = []): Promise<T> {
        return this._channel.invoke(targetChannel, action, path, args);
    }

    get<T = any>(targetChannel: string, path: string[], prop: string): Promise<T> {
        return this._channel.get(targetChannel, path, prop);
    }

    set(targetChannel: string, path: string[], prop: string, value: any): Promise<boolean> {
        return this._channel.set(targetChannel, path, prop, value);
    }

    call<T = any>(targetChannel: string, path: string[], args: any[] = []): Promise<T> {
        return this._channel.call(targetChannel, path, args);
    }

    construct<T = any>(targetChannel: string, path: string[], args: any[] = []): Promise<T> {
        return this._channel.construct(targetChannel, path, args);
    }

    importModule<T = any>(targetChannel: string, url: string): Promise<T> {
        return this._channel.import(url, targetChannel);
    }

    createProxy<T = any>(targetChannel: string, basePath: string[] = []): T {
        return this._channel.proxy(targetChannel, basePath);
    }

    get onResponse() { return this._channel.onResponse; }
    get contextType(): ContextType { return this._contextType; }
    close(): void { this._channel.close(); }
}

// ============================================================================
// RESPONDER (Wrapper around UnifiedChannel for receiving)
// ============================================================================

export class Responder {
    private _channel: UnifiedChannel;
    private _contextType: ContextType;

    constructor(config: InvokerConfig) {
        this._contextType = config.autoDetect !== false ? detectContextType() : "unknown";
        this._channel = createUnifiedChannel({
            name: config.channel,
            timeout: config.timeout,
            autoListen: false
        });
    }

    listen(source: Worker | MessagePort | BroadcastChannel | WebSocket | any, options?: ConnectOptions): this {
        this._channel.listen(source, options);
        return this;
    }

    expose(name: string, obj: any): this {
        this._channel.expose(name, obj);
        return this;
    }

    get onInvocation() { return this._channel.onInvocation; }
    subscribeInvocations(handler: (inv: IncomingInvocation) => void): Subscription {
        return this._channel.onInvocation.subscribe(handler as any);
    }
    get contextType(): ContextType { return this._contextType; }
    close(): void { this._channel.close(); }
}

// ============================================================================
// BIDIRECTIONAL INVOKER
// ============================================================================

export class BidirectionalInvoker {
    public readonly requestor: Requestor;
    public readonly responder: Responder;
    private _contextType: ContextType;

    constructor(config: InvokerConfig) {
        this._contextType = config.autoDetect !== false ? detectContextType() : "unknown";
        this.requestor = new Requestor(config);
        this.responder = new Responder(config);
    }

    connect(target: Worker | MessagePort | BroadcastChannel | WebSocket | any): this {
        this.requestor.connect(target);
        this.responder.listen(target);
        return this;
    }

    expose(name: string, obj: any): this { this.responder.expose(name, obj); return this; }
    createProxy<T = any>(targetChannel: string, basePath: string[] = []): T { return this.requestor.createProxy(targetChannel, basePath); }
    importModule<T = any>(targetChannel: string, url: string): Promise<T> { return this.requestor.importModule(targetChannel, url); }
    get contextType(): ContextType { return this._contextType; }
    close(): void { this.requestor.close(); this.responder.close(); }
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

export function createRequestor(channel: string, config?: Partial<InvokerConfig>): Requestor {
    return new Requestor({ channel, ...config });
}

export function createResponder(channel: string, config?: Partial<InvokerConfig>): Responder {
    return new Responder({ channel, ...config });
}

export function createInvoker(channel: string, config?: Partial<InvokerConfig>): BidirectionalInvoker {
    return new BidirectionalInvoker({ channel, ...config });
}

export function setupInvoker(
    channel: string,
    target: Worker | MessagePort | BroadcastChannel | WebSocket | any,
    config?: Partial<InvokerConfig>
): BidirectionalInvoker {
    return createInvoker(channel, config).connect(target);
}

export function autoInvoker(channel: string, config?: Partial<InvokerConfig>): BidirectionalInvoker {
    const invoker = createInvoker(channel, { autoDetect: true, ...config });
    const contextType = detectContextType();

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
    }

    return invoker;
}
