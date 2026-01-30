/**
 * Request Proxy - Simplified
 *
 * Uses subscriber.next() to send requests instead of direct postMessage.
 */

import { SELF_CHANNEL, type ChannelHandler } from "./Channels";
import { Promised, UUIDv4 } from "fest/core";
import { WReflectAction, type WReflectDescriptor } from "../types/Interface";
import { readByPath, $descriptor, $requestHandler, descMap, handMap, READ, wrapMap } from "../storage/DataBase";
import type { ChannelMessage } from "../observable/Observable";
import type { ChannelObservable } from "../observable/Observable";

// ============================================================================
// TYPES
// ============================================================================

export interface ChannelSender<T = ChannelMessage> {
    next(message: T, transfer?: Transferable[]): void;
    request?(message: T): Promise<any>;
}

// ============================================================================
// REQUEST PROXY HANDLER
// ============================================================================

export class RequestProxyHandlerV2 {
    constructor(
        public hostChannelInstance: ChannelHandler | null = SELF_CHANNEL?.instance,
        public options: any = {}
    ) {}

    dispatch(action: WReflectAction, args: any[]) {
        const target = args.shift?.();
        if (!target) return null;

                const prop = args?.[0] ?? null;

        // Handle special cases
        if (action === WReflectAction.GET) {
            if (prop === $requestHandler) return true;
            if (prop === $descriptor) return target;
            if (["then", "catch", "finally"].includes(prop) || typeof prop === "symbol") return target[prop];
                }
        if (action === WReflectAction.SET && typeof prop === "symbol") return true;
        if (action === WReflectAction.HAS && typeof prop === "symbol") return false;

        return Promised(
            (this.hostChannelInstance ?? SELF_CHANNEL?.instance)?.request?.(
                READ(target, "path") ?? [],
                action,
                args ?? [],
                {},
                this.options?.connectChannel ?? READ(target, "channel")
            )
        );
    }
}

// ============================================================================
// OBSERVABLE REQUEST HANDLER
// ============================================================================

export class ObservableRequestProxyHandler {
    private _channel: ChannelObservable | null;
    private _host: string;
    private _target: string;

    constructor(channelOrHandler: ChannelHandler | ChannelObservable | null, public options: any = {}) {
        if (channelOrHandler && "request" in channelOrHandler && typeof channelOrHandler.request === "function") {
            this._channel = channelOrHandler as ChannelObservable;
            this._host = options.channelName ?? "host";
        } else {
            this._channel = null;
            this._host = SELF_CHANNEL?.name ?? "host";
        }
        this._target = options?.connectChannel ?? "worker";
    }

    dispatch(action: WReflectAction, args: any[]): any {
        const target = args.shift?.();
        if (!target) return null;

        const prop = args?.[0] ?? null;

        // Handle special cases
        if (action === WReflectAction.GET) {
            if (prop === $requestHandler) return true;
            if (prop === $descriptor) return target;
            if (["then", "catch", "finally"].includes(prop) || typeof prop === "symbol") return target[prop];
        }
        if (action === WReflectAction.SET && typeof prop === "symbol") return true;
        if (action === WReflectAction.HAS && typeof prop === "symbol") return false;

        // Dispatch via Observable or legacy
        if (this._channel) {
            const path = READ(target, "path") ?? [];
            const channel = this.options?.connectChannel ?? READ(target, "channel") ?? this._target;

            return this._channel.request({
                id: UUIDv4(),
                channel,
                sender: this._host,
                type: "request",
                payload: { channel, sender: this._host, path, action, args },
                timestamp: Date.now()
            });
        }

        return Promised(
            SELF_CHANNEL?.instance?.request?.(
                READ(target, "path") ?? [],
                action,
                args ?? [],
                {},
                this.options?.connectChannel ?? READ(target, "channel")
            )
        );
    }
}

// ============================================================================
// DISPATCH PROXY HANDLER
// ============================================================================

export class DispatchProxyHandler implements ProxyHandler<Function> {
    constructor(public dispatcher: any) {}

    get(...args: any[]) { return this.dispatcher.dispatch(WReflectAction.GET, args); }
    set(...args: any[]) { return this.dispatcher.dispatch(WReflectAction.SET, args); }
    has(...args: any[]) { return this.dispatcher.dispatch(WReflectAction.HAS, args); }
    deleteProperty(...args: any[]) { return this.dispatcher.dispatch(WReflectAction.DELETE_PROPERTY, args); }
    getOwnPropertyDescriptor(...args: any[]) { return this.dispatcher.dispatch(WReflectAction.GET_OWN_PROPERTY_DESCRIPTOR, args); }
    getPrototypeOf(...args: any[]) { return this.dispatcher.dispatch(WReflectAction.GET_PROTOTYPE_OF, args); }
    setPrototypeOf(...args: any[]) { return this.dispatcher.dispatch(WReflectAction.SET_PROTOTYPE_OF, args); }
    isExtensible(...args: any[]) { return this.dispatcher.dispatch(WReflectAction.IS_EXTENSIBLE, args); }
    preventExtensions(...args: any[]) { return this.dispatcher.dispatch(WReflectAction.PREVENT_EXTENSIONS, args); }
    ownKeys(...args: any[]) { return this.dispatcher.dispatch(WReflectAction.OWN_KEYS, args) ?? []; }
    apply(...args: any[]) { return this.dispatcher.dispatch(WReflectAction.APPLY, args); }
    construct(...args: any[]) { return this.dispatcher.dispatch(WReflectAction.CONSTRUCT, args); }
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

export const makeRequestProxy = (descriptor: WReflectDescriptor, options: any): any => {
    if (typeof descriptor !== "object" || descriptor == null) return descriptor;
    if (descriptor?.owner === SELF_CHANNEL?.name) return readByPath(descriptor?.path) ?? null;
    if (descMap.has(descriptor)) return descMap.get(descriptor);

    const fn: any = function(){};
    const proxy = new Proxy(fn, new DispatchProxyHandler(new RequestProxyHandlerV2(SELF_CHANNEL?.instance, options)));

    descMap.set(descriptor, proxy);
    wrapMap.set(proxy, descriptor);
    handMap.set(fn, descriptor);
    return proxy;
};

export const makeObservableRequestProxy = (
    descriptor: WReflectDescriptor,
    channel: ChannelObservable,
    options: any = {}
): any => {
    if (typeof descriptor !== "object" || descriptor == null) return descriptor;
    if (descMap.has(descriptor)) return descMap.get(descriptor);

    const fn: any = function(){};
    const proxy = new Proxy(fn, new DispatchProxyHandler(
        new ObservableRequestProxyHandler(channel, { ...options, connectChannel: descriptor?.channel ?? options?.connectChannel })
    ));

    descMap.set(descriptor, proxy);
    wrapMap.set(proxy, descriptor);
    handMap.set(fn, descriptor);
    return proxy;
};

export const wrapChannel = (connectChannel: string, host: ChannelHandler | null = SELF_CHANNEL?.instance): any => {
    const fn: any = function(){};
    return new Proxy(fn, new DispatchProxyHandler(new RequestProxyHandlerV2(host ?? SELF_CHANNEL?.instance, { connectChannel })));
};

export const wrapObservableChannel = (channel: ChannelObservable, connectChannel: string, options: any = {}): any => {
    const fn: any = function(){};
    return new Proxy(fn, new DispatchProxyHandler(new ObservableRequestProxyHandler(channel, { ...options, connectChannel })));
};

export function createObservableChannel(
    transport: Worker | MessagePort | BroadcastChannel | WebSocket | "chrome-runtime" | "service-worker-client" | "self",
    channelName: string
) {
    // Import dynamically to avoid circular deps
    const { ChannelObservable } = require("../observable/Observable");
    const observable = new ChannelObservable(transport, channelName);

    return {
        observable,
        wrap: (connectChannel: string, opts?: any) => wrapObservableChannel(observable, connectChannel, opts),
        subscribe: observable.subscribe.bind(observable),
        send: observable.next.bind(observable),
        request: observable.request.bind(observable)
    };
}
