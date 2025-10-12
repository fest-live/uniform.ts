import { SELF_CHANNEL } from "./Channels";

// temporary resolution
import { Promised, WRef } from "fest/object";
import { WReflectAction, type WReflectDescriptor } from "./Interface";
import { readByPath } from "./DataBase";

//
const READ = (target: any, key: string) => {
    return wrapMap.get(target)?.[key];
}

//
const unwrapDescriptorFromProxy = (target: any)=>{
    if ((typeof target != "function" && typeof target != "object") || target == null) { return target; }
    return wrapMap.get(target) ?? target;
}

// unwrap in arrays, objects keys, values, etc. recursively
const unwrapDescriptorFromProxyRecursive = (target: any)=>{
    if ((typeof target != "object" && typeof target != "function") || target == null) { return target; }
    target = unwrapDescriptorFromProxy(target);
    if ((typeof target != "object" && typeof target != "function") || target == null) { return target; }

    if (Array.isArray(target)) {
        return target.map(unwrapDescriptorFromProxyRecursive);
    }
    if (target instanceof Map) {
        return new Map(Array.from(target.entries()).map(([key, value]) => [key, unwrapDescriptorFromProxyRecursive(value)]));
    }
    if (target instanceof Set) {
        return new Set(Array.from(target.values()).map(unwrapDescriptorFromProxyRecursive));
    }
    if (typeof target == "object") {
        for (const key of Object.keys(target)) {
            target[key] = unwrapDescriptorFromProxyRecursive(target[key]);
        }
    }
    return target;
}

//
export class RequestProxyHandler implements ProxyHandler<Function>{
    constructor(private options: any){}

    apply(target, thisArg, args) {
        return Promised(SELF_CHANNEL?.instance?.request?.(READ(target, "channel"), READ(target, "path"), WReflectAction.APPLY, [args], {}));
    }

    call(target, thisArg, args) {
        return Promised(SELF_CHANNEL?.instance?.request?.(READ(target, "channel"), READ(target, "path"), WReflectAction.CALL, [args], {}));
    }

    construct(target, args) {
        return Promised(SELF_CHANNEL?.instance?.request?.(READ(target, "channel"), READ(target, "path"), WReflectAction.CONSTRUCT, [args], {}));
    }

    get(target, prop, receiver) {
        if (["then", "catch", "finally"].includes(prop) || typeof prop == "symbol") { return target[prop]; }
        return Promised(SELF_CHANNEL?.instance?.request?.(READ(target, "channel"), READ(target, "path"), WReflectAction.GET, [prop], {}));
    }

    set(target, prop, value, receiver) {
        if (typeof prop == "symbol") { return true; }
        return Promised(SELF_CHANNEL?.instance?.request?.(READ(target, "channel"), READ(target, "path"), WReflectAction.SET, [prop, value], {}));
    }

    has(target, prop) {
        if (typeof prop == "symbol") { return false; }
        return Promised(SELF_CHANNEL?.instance?.request?.(READ(target, "channel"), READ(target, "path"), WReflectAction.HAS, [prop], {}));
    }

    deleteProperty(target, prop) {
        return Promised(SELF_CHANNEL?.instance?.request?.(READ(target, "channel"), READ(target, "path"), WReflectAction.DELETE_PROPERTY, [prop], {}));
    }

    getOwnPropertyDescriptor(target, prop) {
        return Promised(SELF_CHANNEL?.instance?.request?.(READ(target, "channel"), READ(target, "path"), WReflectAction.GET_OWN_PROPERTY_DESCRIPTOR, [prop], {}));
    }

    getPrototypeOf(target) {
        return Promised(SELF_CHANNEL?.instance?.request?.(READ(target, "channel"), READ(target, "path"), WReflectAction.GET_PROTOTYPE_OF, [], {}));
    }

    setPrototypeOf(target, proto) {
        return Promised(SELF_CHANNEL?.instance?.request?.(READ(target, "channel"), READ(target, "path"), WReflectAction.SET_PROTOTYPE_OF, [proto], {}));
    }

    isExtensible(target) {
        return Promised(SELF_CHANNEL?.instance?.request?.(READ(target, "channel"), READ(target, "path"), WReflectAction.IS_EXTENSIBLE, [], {}));
    }

    preventExtensions(target) {
        return Promised(SELF_CHANNEL?.instance?.request?.(READ(target, "channel"), READ(target, "path"), WReflectAction.PREVENT_EXTENSIONS, [], {}));
    }

    ownKeys(target) {
        const rs = Promised(SELF_CHANNEL?.instance?.request?.(READ(target, "channel"), READ(target, "path"), WReflectAction.OWN_KEYS, [], {}));
        return rs ?? [];
    }
}

//
export const wrapMap = new WeakMap<Function, WReflectDescriptor>();
export const descMap = new WeakMap<WReflectDescriptor, Function>();
export const makeRequestProxy = <T = any>(descriptor: WReflectDescriptor, options: any): T =>{
    if (typeof descriptor != "object" || descriptor == null) { return descriptor as T; }
    if (descriptor?.channel == SELF_CHANNEL?.name) { return readByPath(descriptor?.path) ?? null; }
    if (descMap.has(descriptor)) { return descMap.get(descriptor) as T; }
    const $function: any = function(){};
    //$function["$descriptor$"] = descriptor;
    const $proxy = new Proxy($function, new RequestProxyHandler(options));
    descMap.set(descriptor, $proxy);
    wrapMap.set($function, descriptor);
    return $proxy as T;
}
