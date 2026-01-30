// deno-lint-ignore-file no-explicit-any ban-types
import { isPromise } from "fest/core";
import { TS } from "./Alias";

//
export type dT = object | Function;
export type rT = WeakRef<dT>;
export type MPromise<T extends unknown> = Promise<T> | T | null;
export type IWrap<T extends unknown> = {
    [pT in keyof T]: MPromise<pT> | IWrap<pT>;
};

//
export type ExChanger = any;

/*
 * Internal types of meta
 * ["@meta"|"@data"]: {
 *   !type: string, // interpretation type (how will resolved)
 *   !uuid: string, // located in remote storage pool
 *   !payload: any, // additional descriptions
 *   !index: number // located in transferable list
 * }
 */

// If someone not in list, will just copy or sharing
// @ts-ignore "Transferable list for web workers (automatic)"
export const Transferable = [
    /* @ts-ignore "" */ typeof ArrayBuffer != TS.udf ? ArrayBuffer : null,
    /* @ts-ignore "" */ typeof MessagePort != TS.udf ? MessagePort : null,
    /* @ts-ignore "" */ typeof ReadableStream != TS.udf ? ReadableStream : null,
    /* @ts-ignore "" */ typeof WritableStream != TS.udf ? WritableStream : null,
    /* @ts-ignore "" */ typeof TransformStream != TS.udf ? TransformStream : null,
    /* @ts-ignore "" */ typeof WebTransportReceiveStream != TS.udf ? WebTransportReceiveStream : null,
    /* @ts-ignore "" */ typeof WebTransportSendStream != TS.udf ? WebTransportSendStream : null,
    /* @ts-ignore "" */ typeof AudioData != TS.udf ? AudioData : null,
    /* @ts-ignore "" */ typeof ImageBitmap != TS.udf ? ImageBitmap : null,
    /* @ts-ignore "" */ typeof VideoFrame != TS.udf ? VideoFrame : null,
    /* @ts-ignore "" */ typeof OffscreenCanvas != TS.udf ? OffscreenCanvas : null,
    /* @ts-ignore "" */ typeof RTCDataChannel != TS.udf ? RTCDataChannel : null
].filter((E) => (E != null));

//
export const FORBIDDEN_KEYS = new Set(["bind", "toString", "then", "catch", "finally"]);
export const doOnlyAfterResolve = <T extends unknown | any>(meta: MPromise<T>, cb: (u: T) => MPromise<T> | null | void): MPromise<any> | null | void => {
    if (isPromise(meta)) {
        const chain = (meta as any)?.then?.(cb)?.catch?.(console.trace.bind(console)) ?? cb(meta as T);
        //console.trace(chain);
        return chain;
    }
    return cb(meta as T);
}
