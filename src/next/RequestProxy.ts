import { SELF_CHANNEL } from "./Channels";

// temporary resolution
import { Promised, UUIDv4, isPrimitive, isNotComplexArray, isCanJustReturn, deepOperateAndClone } from "fest/core";
import { WReflectAction, type WReflectDescriptor } from "./Interface";
import { readByPath, registeredInPath, writeByPath } from "./DataBase";

//
export const handMap = new WeakMap<Function, WReflectDescriptor>();
export const wrapMap = new WeakMap<Function, WReflectDescriptor>();
export const descMap = new WeakMap<WReflectDescriptor, Function>();

//
const READ = (target: any, key: string) => {
    return handMap.get(target)?.[key];
}

//
export const objectToRef = (obj: any, channel: string = SELF_CHANNEL?.name, toTransfer?: any[]): WReflectDescriptor|any|null|undefined =>{
    if ((typeof obj == "object" && obj != null) || typeof obj == "function" && obj != null) {
        if (wrapMap.has(obj)) return wrapMap.get(obj);
        if (handMap.has(obj)) return handMap.get(obj);
        if (isNotComplexArray(obj)) return obj;
        if (toTransfer?.includes?.(obj)) return obj;
        if (channel == SELF_CHANNEL?.name) return obj;
        return {
            $isDescriptor: true,
            path: registeredInPath.get(obj) ?? (()=>{
                const path: string[] = [UUIDv4()];
                writeByPath(path, obj);
                return path;
            })(),
            owner: SELF_CHANNEL?.name,
            channel: channel,
            primitive: isPrimitive(obj),
            writable: true,
            enumerable: true,
            configurable: true,
            argumentCount: obj instanceof Function ? obj.length : -1
        } as WReflectDescriptor;
    }
    return isCanJustReturn(obj) ? obj : null;
}

//
export const $requestHandler = Symbol.for("@requestHandler");
export const $descriptor = Symbol.for("@descriptor");

// wrap back to usable proxies
export const normalizeRef = (v: any)=>{
    if (isCanJustReturn(v)) return v;
    if (v?.[$descriptor]) return v;
    if (v?.$isDescriptor) return makeRequestProxy(v, {});
    if (isNotComplexArray(v)) return v;
    return null;
}

//
export const unwrapDescriptorFromProxy = (target: any)=>{
    if ((typeof target != "function" && typeof target != "object") || target == null) { return target; }
    return wrapMap.get(target) ?? handMap.get(target) ?? target;
}

// unwrap in arrays, objects keys, values, etc. recursively
export const unwrapDescriptorFromProxyRecursive = (target: any)=>{
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
        return Promised(SELF_CHANNEL?.instance?.request?.(READ(target, "channel"), READ(target, "path"), WReflectAction.APPLY, [deepOperateAndClone(args, (el)=>objectToRef(el, READ(target, "channel")))], {}));
    }

    call(target, thisArg, args) {
        return Promised(SELF_CHANNEL?.instance?.request?.(READ(target, "channel"), READ(target, "path"), WReflectAction.CALL, [deepOperateAndClone(args, (el)=>objectToRef(el, READ(target, "channel")))], {}));
    }

    construct(target, args) {
        return Promised(SELF_CHANNEL?.instance?.request?.(READ(target, "channel"), READ(target, "path"), WReflectAction.CONSTRUCT, [deepOperateAndClone(args, (el)=>objectToRef(el, READ(target, "channel")))], {}));
    }

    get(target, prop, receiver) {
        if (prop == $requestHandler) { return true; }
        if (prop == $descriptor) { return target; }
        if (["then", "catch", "finally"].includes(prop) || typeof prop == "symbol") { return target[prop]; }
        return Promised(SELF_CHANNEL?.instance?.request?.(READ(target, "channel"), READ(target, "path"), WReflectAction.GET, [prop], {}));
    }

    set(target, prop, value, receiver) {
        if (typeof prop == "symbol") { return true; }
        return Promised(SELF_CHANNEL?.instance?.request?.(READ(target, "channel"), READ(target, "path"), WReflectAction.SET, [prop, objectToRef(value, READ(target, "channel"))], {}));
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
export const makeRequestProxy = (descriptor: WReflectDescriptor, options: any): any =>{
    if (typeof descriptor != "object" || descriptor == null) { return descriptor; }
    if (descriptor?.owner == SELF_CHANNEL?.name) { return readByPath(descriptor?.path) ?? null; }
    if (descMap.has(descriptor)) { return descMap.get(descriptor); }
    const $function: any = function(){};
    //$function["$descriptor$"] = descriptor;
    const $proxy = new Proxy($function, new RequestProxyHandler(options));
    descMap.set(descriptor, $proxy);
    wrapMap.set($proxy, descriptor);
    handMap.set($function, descriptor);
    return $proxy;
}
