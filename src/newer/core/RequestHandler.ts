/**
 * Request Handler Core - Unified Reflect Action Handling
 *
 * Single source of truth for all action execution:
 * - UnifiedChannel, ChannelContext, Proxy module
 * - Supports both DataBase-backed and direct object targets
 * - Supports custom Reflect implementations
 */

import { UUIDv4, deepOperateAndClone, isPrimitive, isCanJustReturn, isCanTransfer } from "fest/core";
import type { WReflectDescriptor, WReq, WResp } from "../next/types/Interface";
import { WReflectAction } from "../next/types/Interface";
import {
    hasNoPath,
    readByPath,
    registeredInPath,
    removeByData,
    removeByPath,
    writeByPath,
    normalizeRef,
    objectToRef
} from "../next/storage/DataBase";

// ============================================================================
// TYPES
// ============================================================================

export interface RequestContext {
    channel: string;
    sender: string;
    path: string[];
    action: string;
    args: any[];
}

export interface ResponseBuilder {
    result: any;
    path: string[];
    toTransfer: any[];
    canBeReturn: boolean;
}

/** Reflect-like interface for custom implementations */
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

/** Action execution options */
export interface ExecuteOptions {
    /** Channel name for transfer checks */
    channel?: string;
    /** Sender name for transfer checks */
    sender?: string;
    /** Custom Reflect implementation */
    reflect?: ReflectLike;
    /** Direct target object (bypasses DataBase) */
    target?: any;
    /** Context object for function binding */
    context?: any;
}

/** Action execution result */
export interface ExecuteResult {
    result: any;
    toTransfer: any[];
    path: string[];
}

// ============================================================================
// HELPERS
// ============================================================================

const isObject = (obj: any): obj is object =>
    (typeof obj === "object" || typeof obj === "function") && obj != null;

const defaultReflect: ReflectLike = {
    get: (t, p) => t?.[p],
    set: (t, p, v) => { t[p] = v; return true; },
    has: (t, p) => p in t,
    apply: (t, ctx, args) => t.apply(ctx, args),
    construct: (t, args) => new t(...args),
    deleteProperty: (t, p) => delete t[p],
    ownKeys: (t) => Object.keys(t),
    getOwnPropertyDescriptor: (t, p) => Object.getOwnPropertyDescriptor(t, p),
    getPrototypeOf: (t) => Object.getPrototypeOf(t),
    setPrototypeOf: (t, p) => Object.setPrototypeOf(t, p),
    isExtensible: (t) => Object.isExtensible(t),
    preventExtensions: (t) => Object.preventExtensions(t)
};

// ============================================================================
// UNIFIED ACTION EXECUTOR
// ============================================================================

/**
 * Execute a reflect action
 *
 * Unified implementation used by all channel/proxy handlers.
 * Supports both DataBase-backed paths and direct object targets.
 *
 * @param action - Action to execute (WReflectAction or string)
 * @param path - Object path
 * @param args - Action arguments
 * @param options - Execution options
 */
export function executeAction(
    action: WReflectAction | string,
    path: string[],
    args: any[],
    options: ExecuteOptions = {}
): ExecuteResult {
    const { channel = "", sender = "", reflect = defaultReflect } = options;

    // Get target: from options or DataBase
    const obj = options.target ?? readByPath(path);
    const toTransfer: any[] = [];
    let result: any = null;
    let newPath = path;

    // Normalize action string
    const act = String(action).toLowerCase();

    switch (act) {
        case "import":
        case WReflectAction.IMPORT:
            result = import(args?.[0]);
            break;

        case "transfer":
        case WReflectAction.TRANSFER:
            if (isCanTransfer(obj) && channel !== sender) {
                toTransfer.push(obj);
            }
            result = obj;
            break;

        case "get":
        case WReflectAction.GET: {
            const prop = args?.[0];
            const got = reflect.get?.(obj, prop) ?? obj?.[prop];
            result = typeof got === "function" && obj != null ? got.bind(obj) : got;
            newPath = [...path, String(prop)];
            break;
        }

        case "set":
        case WReflectAction.SET: {
            const [prop, value] = args;
            const normalizedValue = deepOperateAndClone(value, normalizeRef);
            if (options.target) {
                result = reflect.set?.(obj, prop, normalizedValue) ?? (obj[prop] = normalizedValue, true);
            } else {
                result = reflect.set?.(obj, prop, normalizedValue) ??
                    writeByPath([...path, String(prop)], normalizedValue);
            }
            break;
        }

        case "apply":
        case "call":
        case WReflectAction.APPLY:
        case WReflectAction.CALL: {
            if (typeof obj === "function") {
                const ctx = options.context ?? (options.target ? undefined : readByPath(path.slice(0, -1)));
                const normalizedArgs = deepOperateAndClone(args?.[0] ?? args ?? [], normalizeRef);
                result = reflect.apply?.(obj, ctx, normalizedArgs) ?? obj.apply(ctx, normalizedArgs);

                if (isCanTransfer(result) && path?.at(-1) === "transfer" && channel !== sender) {
                    toTransfer.push(result);
                }
            }
            break;
        }

        case "construct":
        case WReflectAction.CONSTRUCT: {
            if (typeof obj === "function") {
                const normalizedArgs = deepOperateAndClone(args?.[0] ?? args ?? [], normalizeRef);
                result = reflect.construct?.(obj, normalizedArgs) ?? new obj(...normalizedArgs);
            }
            break;
        }

        case "delete":
        case "deleteproperty":
        case "dispose":
        case WReflectAction.DELETE:
        case WReflectAction.DELETE_PROPERTY:
        case WReflectAction.DISPOSE:
            if (options.target) {
                const prop = path[path.length - 1];
                result = reflect.deleteProperty?.(obj, prop) ?? delete obj[prop];
            } else {
                result = path?.length > 0 ? removeByPath(path) : removeByData(obj);
                if (result) newPath = registeredInPath.get(obj) ?? [];
            }
            break;

        case "has":
        case WReflectAction.HAS:
            result = reflect.has?.(obj, args?.[0]) ?? (isObject(obj) ? args?.[0] in obj : false);
            break;

        case "ownkeys":
        case WReflectAction.OWN_KEYS:
            result = reflect.ownKeys?.(obj) ?? (isObject(obj) ? Object.keys(obj) : []);
            break;

        case "getownpropertydescriptor":
        case "getpropertydescriptor":
        case WReflectAction.GET_OWN_PROPERTY_DESCRIPTOR:
        case WReflectAction.GET_PROPERTY_DESCRIPTOR:
            result = reflect.getOwnPropertyDescriptor?.(obj, args?.[0] ?? path?.at(-1) ?? "") ??
                (isObject(obj) ? Object.getOwnPropertyDescriptor(obj, args?.[0] ?? path?.at(-1) ?? "") : undefined);
            break;

        case "getprototypeof":
        case WReflectAction.GET_PROTOTYPE_OF:
            result = reflect.getPrototypeOf?.(obj) ?? (isObject(obj) ? Object.getPrototypeOf(obj) : null);
            break;

        case "setprototypeof":
        case WReflectAction.SET_PROTOTYPE_OF:
            result = reflect.setPrototypeOf?.(obj, args?.[0]) ??
                (isObject(obj) ? Object.setPrototypeOf(obj, args?.[0]) : false);
            break;

        case "isextensible":
        case WReflectAction.IS_EXTENSIBLE:
            result = reflect.isExtensible?.(obj) ?? (isObject(obj) ? Object.isExtensible(obj) : true);
            break;

        case "preventextensions":
        case WReflectAction.PREVENT_EXTENSIONS:
            result = reflect.preventExtensions?.(obj) ??
                (isObject(obj) ? Object.preventExtensions(obj) : false);
            break;
    }

    return { result, toTransfer, path: newPath };
}

/**
 * Execute action with async result resolution
 */
export async function executeActionAsync(
    action: WReflectAction | string,
    path: string[],
    args: any[],
    options: ExecuteOptions = {}
): Promise<ExecuteResult> {
    const { result, toTransfer, path: newPath } = executeAction(action, path, args, options);
    return { result: await result, toTransfer, path: newPath };
}

// ============================================================================
// RESPONSE BUILDER
// ============================================================================

/**
 * Build response object with descriptor
 */
export async function buildResponse(
    reqId: string,
    action: string,
    channel: string,
    sender: string,
    path: string[],
    rawResult: any,
    toTransfer: any[]
): Promise<{ response: any; transfer: any[] }> {
    const result = await rawResult;

    const canBeReturn = (isCanTransfer(result) && toTransfer.includes(result)) || isCanJustReturn(result);

    // Generate temp path if needed
    let finalPath = path;
    if (!canBeReturn && action !== "get" && action !== WReflectAction.GET &&
        (typeof result === "object" || typeof result === "function")) {
        if (hasNoPath(result)) {
            finalPath = [UUIDv4()];
            writeByPath(finalPath, result);
        } else {
            finalPath = registeredInPath.get(result) ?? [];
        }
    }

    const ctx = readByPath(finalPath);
    const ctxKey = (action === "get" || action === WReflectAction.GET) ? finalPath?.at(-1) : undefined;
    const obj = readByPath(path);

    const payload = deepOperateAndClone(result, (el) => objectToRef(el, channel, toTransfer)) ?? result;

    return {
        response: {
            channel: sender,
            sender: channel,
            reqId,
            action,
            type: "response",
            payload: {
                result: canBeReturn ? payload : null,
                type: typeof result,
                channel: sender,
                sender: channel,
                descriptor: {
                    $isDescriptor: true,
                    path: finalPath,
                    owner: channel,
                    channel,
                    primitive: isPrimitive(result),
                    writable: true,
                    enumerable: true,
                    configurable: true,
                    argumentCount: obj instanceof Function ? obj.length : -1,
                    ...(isObject(ctx) && ctxKey != null ? Object.getOwnPropertyDescriptor(ctx, ctxKey) : {})
                } as WReflectDescriptor<any>
            } as WResp<any>
        },
        transfer: toTransfer
    };
}

// ============================================================================
// UNIFIED REQUEST HANDLER
// ============================================================================

/**
 * Handle request and return response (unified handler)
 */
export async function handleRequest(
    request: WReq,
    reqId: string,
    channelName: string,
    options?: ExecuteOptions
): Promise<{ response: any; transfer: any[] } | null> {
    const { channel, sender, path, action, args } = request;

    if (channel !== channelName) return null;

    const { result, toTransfer, path: newPath } = executeAction(
        action,
        path,
        args,
        { channel, sender, ...options }
    );

    return buildResponse(reqId, action, channelName, sender, newPath, result, toTransfer);
}

// ============================================================================
// SIMPLE EXPOSE HANDLER (For Proxy module)
// ============================================================================

/**
 * Create a simple expose handler for an object
 *
 * Unlike the full executeAction, this works directly on the target
 * without DataBase integration. Used by Proxy.ts createExposeHandler.
 *
 * @param target - Object to expose
 * @param reflect - Optional custom Reflect implementation
 */
export function createObjectHandler<T extends object>(
    target: T,
    reflect: ReflectLike = defaultReflect
): (action: string, path: string[], args: any[]) => Promise<any> {
    return async (action, path, args) => {
        // Navigate to the parent of the final property
        let parent: any = target;
        let current: any = target;

        for (let i = 0; i < path.length; i++) {
            parent = current;
            current = current?.[path[i]];
            if (current === undefined && i < path.length - 1) {
                throw new Error(`Path segment '${path[i]}' not found`);
            }
        }

        const prop = path[path.length - 1];
        const act = String(action).toLowerCase();

        // Handle actions directly on the resolved target
        switch (act) {
            case "get":
            case WReflectAction.GET:
                return current;

            case "set":
            case WReflectAction.SET:
                parent[prop] = args[0];
                return true;

            case "call":
            case "apply":
            case WReflectAction.APPLY:
            case WReflectAction.CALL:
                if (typeof current === "function") {
                    const callArgs = Array.isArray(args[0]) ? args[0] : args;
                    return await current.apply(parent, callArgs);
                }
                throw new Error(`'${prop}' is not a function`);

            case "construct":
            case WReflectAction.CONSTRUCT:
                if (typeof current === "function") {
                    const ctorArgs = Array.isArray(args[0]) ? args[0] : args;
                    return new current(...ctorArgs);
                }
                throw new Error(`'${prop}' is not a constructor`);

            case "has":
            case WReflectAction.HAS:
                return prop in parent;

            case "delete":
            case "deleteproperty":
            case WReflectAction.DELETE_PROPERTY:
                return delete parent[prop];

            case "ownkeys":
            case WReflectAction.OWN_KEYS:
                return Object.keys(current ?? parent);

            default:
                return current;
        }
    };
}

// ============================================================================
// EXPORTS
// ============================================================================

export { defaultReflect, isObject };
