/**
 * Request Handler Core - Unified reflect action handling
 *
 * Single implementation of handleAndResponse logic
 * used by both Channels.ts and Observable handlers.
 */

import { UUIDv4, deepOperateAndClone, isPrimitive, isCanJustReturn, isCanTransfer } from "fest/core";
import type { WReflectDescriptor, WReq, WResp } from "../next/types/Interface";
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

// ============================================================================
// ACTION HANDLERS
// ============================================================================

const objCheck = (obj: any): obj is object =>
    (typeof obj === "object" || typeof obj === "function") && obj != null;

/**
 * Execute reflect action and return result
 */
export function executeAction(
    action: string,
    path: string[],
    args: any[],
    channel: string,
    sender: string
): { result: any; toTransfer: any[]; path: string[] } {
    const obj = readByPath(path);
    const toTransfer: any[] = [];
    let result: any = null;
    let newPath = path;

    switch (action) {
        case "import":
            result = import(args?.[0]);
            break;

        case "transfer":
            if (isCanTransfer(obj) && channel !== sender) toTransfer.push(obj);
            result = obj;
            break;

        case "get": {
            const got = obj?.[args?.[0]];
            result = typeof got === "function" && obj != null ? got.bind(obj) : got;
            newPath = [...path, args?.[0]];
            break;
        }

        case "set":
            result = writeByPath([...path, args?.[0]], deepOperateAndClone(args?.[1], normalizeRef));
            break;

        case "apply":
        case "call":
            if (typeof obj === "function") {
                const ctx = readByPath(path.slice(0, -1));
                result = obj.apply(ctx, deepOperateAndClone(args?.[0], normalizeRef));
                if (isCanTransfer(result) && path?.at(-1) === "transfer" && channel !== sender) {
                    toTransfer.push(result);
                }
            }
            break;

        case "construct":
            if (typeof obj === "function") {
                result = new obj(deepOperateAndClone(args?.[0], normalizeRef));
            }
            break;

        case "delete":
        case "deleteProperty":
        case "dispose":
            result = path?.length > 0 ? removeByPath(path) : removeByData(obj);
            if (result) newPath = registeredInPath.get(obj) ?? [];
            break;

        case "has":
            result = objCheck(obj) ? (path?.at(-1) ?? "") in obj : false;
            break;

        case "ownKeys":
            result = objCheck(obj) ? Object.keys(obj) : [];
            break;

        case "getOwnPropertyDescriptor":
        case "getPropertyDescriptor":
            result = objCheck(obj) ? Object.getOwnPropertyDescriptor(obj, path?.at(-1) ?? "") : undefined;
            break;

        case "getPrototypeOf":
            result = objCheck(obj) ? Object.getPrototypeOf(obj) : null;
            break;

        case "setPrototypeOf":
            result = objCheck(obj) ? Object.setPrototypeOf(obj, args?.[0]) : false;
            break;

        case "isExtensible":
            result = objCheck(obj) ? Object.isExtensible(obj) : true;
            break;

        case "preventExtensions":
            result = objCheck(obj) ? Object.preventExtensions(obj) : false;
            break;
    }

    return { result, toTransfer, path: newPath };
}

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
                    ...(objCheck(ctx) && ctxKey != null ? Object.getOwnPropertyDescriptor(ctx, ctxKey) : {})
                } as WReflectDescriptor<any>
            } as WResp<any>
        },
        transfer: toTransfer
    };
}

/**
 * Handle request and return response (unified handler)
 */
export async function handleRequest(
    request: WReq,
    reqId: string,
    channelName: string
): Promise<{ response: any; transfer: any[] } | null> {
    const { channel, sender, path, action, args } = request;

    if (channel !== channelName) return null;

    const { result, toTransfer, path: newPath } = executeAction(action, path, args, channel, sender);

    return buildResponse(reqId, action, channelName, sender, newPath, result, toTransfer);
}
