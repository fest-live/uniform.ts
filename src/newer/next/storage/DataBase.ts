// deno-lint-ignore-file no-explicit-any
import { type WReflectDescriptor } from "../types/Interface";
import { makeRequestProxy } from "../proxy/RequestProxy";
import { type dT, type rT } from "../../core/Useful";
import { UUIDv4, deref, isCanJustReturn, isNotComplexArray } from "fest/core";
import { isPrimitive } from "fest/core";
import { SELF_CHANNEL } from "../channel/Channels";

//
const rg = "register";

//
// TODO: planned promised...
export default class UUIDMap<T = dT> {
    #weakMap = new WeakMap<dT, string>();
    #refMap = new Map<string, rT>();
    #registry = new FinalizationRegistry<string>((_: string) => { });
    #linked = new Map<dT, number>();

    //
    constructor() {
        this.#linked = new Map<dT, number>();
        this.#weakMap = new WeakMap<dT, string>();
        this.#refMap = new Map<string, rT>();
        this.#registry = new FinalizationRegistry<string>((key: string) => {
            this.#refMap.delete(key);
        });
    }

    // when transfer out required
    delete<R extends dT | string>(key: R): unknown {
        if (typeof key == "object" || typeof key == "function") {
            return this.#weakMap.delete(<dT>(<unknown>key));
        }
        return this.#refMap.delete(<string>(<unknown>key));
    }

    //
    add(obj: dT, id: string = "", force = false) {
        obj = (obj instanceof WeakRef ? obj?.deref?.() : obj) as any;
        if (!(typeof obj == "object" || typeof obj == "function")) return obj;

        // never override already added, except transfer cases
        if (id && this.#refMap.has(id) && !force) { return id; };
        if (this.#weakMap.has(obj)) { return this.#weakMap.get(obj); };

        //
        this.#weakMap.set(obj, (id ||= UUIDv4()));
        this.#refMap.set(id, new WeakRef<dT>(this.count(obj) ?? obj));
        this.#registry?.[rg]?.(obj, id);

        //
        return id;
    }

    //
    discount(obj?: rT): dT | undefined {
        obj = (obj instanceof WeakRef ? obj?.deref?.() : obj) as any;
        obj = (typeof obj == "object" || typeof obj == "function") ? obj : this.#refMap.get(<string>(<unknown>obj));
        obj = (obj instanceof WeakRef ? obj?.deref?.() : obj) as any;
        if (!obj) return obj;
        const hold = this.#linked?.get?.(obj) || 0;
        if (hold <= 1) { this.#linked.delete(obj); } else { this.#linked.set(obj, hold - 1); }
        return obj;
    }

    //
    count(obj?: dT): dT | undefined {
        obj = obj instanceof WeakRef ? obj?.deref?.() : obj;
        if (!obj) return obj;
        const hold = this.#linked.get(obj);
        if (!hold) { this.#linked.set(obj, 1); } else { this.#linked.set(obj, hold + 1); }
        return obj;
    }

    //
    has<R extends dT | string>(key: R): boolean {
        if (typeof key == "object" || typeof key == "function") {
            return this.#weakMap.has(<dT>(<unknown>key));
        }
        return this.#refMap.has(<string>(<unknown>key));
    }

    //
    get<R extends dT | string>(key: R): unknown {
        if (typeof key == "object" || typeof key == "function") {
            return this.#weakMap.get(<dT>this.count(<any>key));
        }
        return deref(this.#refMap.get(<string>(<unknown>key)));
    }
}


//
export const handMap = new WeakMap<Function, WReflectDescriptor>();
export const wrapMap = new WeakMap<Function, WReflectDescriptor>();
export const descMap = new WeakMap<WReflectDescriptor, Function>();

//
export const READ = <T=any>(target: any, key: string): T => {
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
export const storedData = new Map();
export const registeredInPath = new WeakMap();

//
export const traverseByPath = (obj: any, path: string[]) => {
    if (path != null && !Array.isArray(path)) { path = [path]; }
    if (path == null || path?.length < 1) { return obj; }

    // if descriptor exists, unwrap it...
    const $desc = obj?.[$descriptor] ?? (obj?.$isDescriptor ? obj : null);
    if ($desc && $desc?.owner == SELF_CHANNEL?.name) {
        obj = readByPath($desc?.path) ?? obj;
    }

    if (isPrimitive(obj)) { return obj; }
    for (const key of path) { obj = obj?.[key]; if (obj == null) { return obj; } }
    return obj;
}

// TODO: async support
export const readByPath = (path: string[]) => {
    if (path != null && !Array.isArray(path)) { path = [path]; }
    if (path == null || path?.length < 1) { return null; }
    const root = storedData?.get?.(path?.[0]) ?? null;
    return root != null ? traverseByPath(root, path?.slice?.(1)) : null;
}

// TODO: async support
export const writeByPath = (path: string[], data: any) => {
    // if descriptor exists, unwrap it...
    const $desc = data?.[$descriptor] ?? (data?.$isDescriptor ? data : null);
    if ($desc && $desc?.owner == SELF_CHANNEL?.name) {
        data = readByPath($desc?.path) ?? data;
    }

    //
    if (path != null && !Array.isArray(path)) { path = [path]; }
    if (path == null || path?.length < 1) { return null; }
    const root = storedData?.get?.(path?.[0]) ?? null;
    if (path?.length > 1) { traverseByPath(root, path?.slice?.(1, -1))[path?.[path?.length - 1]] = data; } else { storedData?.set?.(path?.[0], data); }
    if (typeof data == "object" || typeof data == "function") { registeredInPath?.set?.(data, path); }
    return data;
}

//
export const removeByPath = (path: string[]) => {
    if (path != null && !Array.isArray(path)) { path = [path]; }
    if (path == null || path?.length < 1) { return false; }
    const root = storedData?.get?.(path?.[0]) ?? null;
    if (!root && path?.length <= 1) { storedData?.delete?.(path?.[0]); return true; } else { return false; }
    delete traverseByPath(root, path?.slice?.(1, -1))[path?.[path?.length - 1]];
    if ((typeof root == "object" || typeof root == "function") && path?.length <= 1) { registeredInPath?.delete?.(root); }
    return true;
}

//
export const removeByData = (data: any) => {
    // if descriptor exists, unwrap it...
    const $desc = data?.[$descriptor] ?? (data?.$isDescriptor ? data : null);
    if ($desc && $desc?.owner == SELF_CHANNEL?.name) {
        data = readByPath($desc?.path) ?? data;
    }

    //
    const path = registeredInPath?.get?.(data) ?? $desc?.path;
    if (path == null || path?.length < 1) { return false; }; removeByPath(path);
    if (typeof data == "object" || typeof data == "function") { registeredInPath?.delete?.(data); }
    return true;
}

//
export const hasNoPath = (data: any) => {
    const $desc = data?.[$descriptor] ?? (data?.$isDescriptor ? data : null);
    return (registeredInPath?.get?.(data) ?? $desc?.path) == null;
}
