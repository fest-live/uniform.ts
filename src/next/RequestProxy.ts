import { SELF_CHANNEL, type ChannelHandler } from "./Channels";

// temporary resolution
import { Promised } from "fest/core";
import { WReflectAction, type WReflectDescriptor } from "./Interface";
import { readByPath } from "./DataBase";
import { $descriptor, $requestHandler, descMap, handMap, READ, wrapMap } from "./DataBase";

//
export class RequestProxyHandlerV2 {
    constructor(public hostChannelInstance: ChannelHandler | null = SELF_CHANNEL?.instance, public options: any = {}) {

    }

    dispatch(action: WReflectAction, args: any[]) {
        const target = args.unshift?.();
        if (!target) { return null; }
        switch (action) {
            case WReflectAction.GET: {
                const prop = args?.[0] ?? null;
                if (prop == $requestHandler) { return true; }
                if (prop == $descriptor) { return target; }
                if (["then", "catch", "finally"].includes(prop) || typeof prop == "symbol") { return target[prop]; }
            };
            case WReflectAction.SET: {
                const prop = args?.[0] ?? null;
                if (typeof prop == "symbol") { return true; }
            };
            case WReflectAction.HAS: {
                const prop = args?.[0] ?? null;
                if (typeof prop == "symbol") { return false; }
            };
            default: return Promised((this.hostChannelInstance ?? SELF_CHANNEL?.instance)?.request?.(READ(target, "path") ?? [], action, args ?? [], {}, this.options?.connectChannel ?? READ(target, "channel")));
        }
    }
}

//
export class DispatchProxyHandler implements ProxyHandler<Function> {
    constructor(public dispatcher: any) {

    }

    get(...args: any[]) {
        return this.dispatcher.dispatch(WReflectAction.GET, args);
    }

    set(...args: any[]) {
        return this.dispatcher.dispatch(WReflectAction.SET, args);
    }

    has(...args: any[]) {
        return this.dispatcher.dispatch(WReflectAction.HAS, args);
    }

    deleteProperty(...args: any[]) {
        return this.dispatcher.dispatch(WReflectAction.DELETE_PROPERTY, args);
    }

    getOwnPropertyDescriptor(...args: any[]) {
        return this.dispatcher.dispatch(WReflectAction.GET_OWN_PROPERTY_DESCRIPTOR, args);
    }

    getPrototypeOf(...args: any[]) {
        return this.dispatcher.dispatch(WReflectAction.GET_PROTOTYPE_OF, args);
    }

    setPrototypeOf(...args: any[]) {
        return this.dispatcher.dispatch(WReflectAction.SET_PROTOTYPE_OF, args);
    }

    isExtensible(...args: any[]) {
        return this.dispatcher.dispatch(WReflectAction.IS_EXTENSIBLE, args);
    }

    preventExtensions(...args: any[]) {
        return this.dispatcher.dispatch(WReflectAction.PREVENT_EXTENSIONS, args);
    }

    ownKeys(...args: any[]) {
        return this.dispatcher.dispatch(WReflectAction.OWN_KEYS, args) ?? [];
    }

    apply(...args: any[]) {
        return this.dispatcher.dispatch(WReflectAction.APPLY, args);
    }

    call(...args: any[]) {
        return this.dispatcher.dispatch(WReflectAction.CALL, args);
    }

    construct(...args: any[]) {
        return this.dispatcher.dispatch(WReflectAction.CONSTRUCT, args);
    }
}

//
export const makeRequestProxy = (descriptor: WReflectDescriptor, options: any): any =>{
    if (typeof descriptor != "object" || descriptor == null) { return descriptor; }
    if (descriptor?.owner == SELF_CHANNEL?.name) { return readByPath(descriptor?.path) ?? null; }
    if (descMap.has(descriptor)) { return descMap.get(descriptor); }
    const $function: any = function(){};
    //$function["$descriptor$"] = descriptor;
    const $proxy = new Proxy($function, new DispatchProxyHandler(new RequestProxyHandlerV2(SELF_CHANNEL?.instance, options)));
    descMap.set(descriptor, $proxy);
    wrapMap.set($proxy, descriptor);
    handMap.set($function, descriptor);
    return $proxy;
}

//
export const wrapChannel = (connectChannel: string, hostChannelInstance: ChannelHandler | null = SELF_CHANNEL?.instance): any => {
    const $function: any = function(){};
    const $proxy = new Proxy($function, new DispatchProxyHandler(new RequestProxyHandlerV2(hostChannelInstance ?? SELF_CHANNEL?.instance, {
        connectChannel: connectChannel
    })));
    return $proxy;
}
