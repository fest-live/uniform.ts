import { SELF_CHANNEL } from "./Channels";

// temporary resolution
import { Promised, WRef } from "fest/object";
import { WReflectAction, type WReflectDescriptor } from "./Interface";
import { readByPath, registeredInPath, writeByPath } from "./DataBase";
import { UUIDv4 } from "../$core$/Useful";



//
const READ = (target: any, key: string) => {
    return handMap.get(target)?.[key];
}

//
const unwrapDescriptorFromProxy = (target: any)=>{
    if ((typeof target != "function" && typeof target != "object") || target == null) { return target; }
    return wrapMap.get(target) ?? handMap.get(target) ?? target;
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
const isPrimitive = (obj: any)=>{
    return obj == null || typeof obj == "string" || typeof obj == "number" || typeof obj == "boolean" || typeof obj == "bigint" || /*typeof obj == "symbol" ||*/ typeof obj == "undefined";
}

//
const unwrapArray = (arr: any[])=>{
    if (Array.isArray(arr)) {
        return arr?.flatMap?.((el)=>{
            if (Array.isArray(el)) return unwrapArray(el);
            return el;
        })
    } else {
        return arr;
    }
}

//
const isNotComplexArray = (arr: any[])=>{
    return unwrapArray(arr)?.every?.(isCanJustReturn);
}

//
export const objectToRef = <T = any>(obj: any, channel: string = SELF_CHANNEL?.name, toTransfer?: any[]): WReflectDescriptor<T>|T|null|undefined =>{
    if ((typeof obj == "object" || typeof obj == "function") && obj != null) {
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
        } as WReflectDescriptor<T>;
    }
    return isCanJustReturn(obj) ? obj : null;
}

// wrap back to usable proxies
export const normalizeRef = (v: any)=>{
    if (isCanJustReturn(v)) return v;
    if (v?.[$descriptor]) return v;
    if (v?.$isDescriptor) return makeRequestProxy(v, {});
    if (isNotComplexArray(v)) return v;
    return null;
}

//
export const isTypedArray = (value: any)=>{
    return ArrayBuffer.isView(value) && !(value instanceof DataView);
}


// TODO: review cases when arrays isn't primitive
export const isCanJustReturn = (obj: any)=>{
    return isPrimitive(obj) || (typeof SharedArrayBuffer == "function" && obj instanceof SharedArrayBuffer) || isTypedArray(obj) || (Array.isArray(obj) && isNotComplexArray(obj));
}


//
export const deepOperateAndClone = (obj: any, operation: (el: any, key: number|string, obj: any)=>any, $prev?: [any, number|string]|null)=>{
    if (Array.isArray(obj)) {
        if (obj.every(isCanJustReturn)) return obj.map(operation);
        return obj.map((value, index) => deepOperateAndClone(value, operation, [obj, index] as [any, number|string]));
    }
    if (obj instanceof Map) {
        const entries = Array.from(obj.entries());
        const values = entries.map(([key, value]) => value);
        if (values.every(isCanJustReturn)) return new Map(entries.map(([key, value]) => [key, operation(value, key, obj)]));
        return new Map(entries.map(([key, value]) => [key, deepOperateAndClone(value, operation, [obj, key] as [any, number|string])]));
    }
    if (obj instanceof Set) {
        const entries = Array.from(obj.entries());
        const values = entries.map(([key, value]) => value);
        if (entries.every(isCanJustReturn)) return new Set(values.map(operation));
        return new Set(values.map(value => deepOperateAndClone(value, operation, [obj, value] as [any, number|string])));
    }
    if (typeof obj == "object" && (obj?.constructor == Object && Object.prototype.toString.call(obj) == "[object Object]")) {
        const entries = Array.from(Object.entries(obj));
        const values = entries.map(([key, value]) => value);
        if (values.every(isCanJustReturn)) return Object.fromEntries(entries.map(([key, value]) => [key, operation(value, key, obj)]));
        return Object.fromEntries(entries.map(([key, value]) => [key, deepOperateAndClone(value, operation, [obj, key] as [any, number|string])]));
    }
    return operation(obj, $prev?.[1] ?? "", $prev?.[0] ?? null);
}


//
export const $requestHandler = Symbol.for("@requestHandler");
export const $descriptor = Symbol.for("@descriptor");

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
export const handMap = new WeakMap<Function, WReflectDescriptor>();
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
    wrapMap.set($proxy, descriptor);
    handMap.set($function, descriptor);
    return $proxy as T;
}
