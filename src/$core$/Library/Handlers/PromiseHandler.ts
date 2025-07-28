// deno-lint-ignore-file no-explicit-any
import ObjectProxy from "../../Interface/ObjectProxy";

//
import { isSymbol, FORBIDDEN_KEYS, META_KEYS, isPromise, doOnlyAfterResolve, type IWrap } from "../Utils/Useful"
import { bindCtx, MakeReference } from "../Utils/InstructionType";
import ORG from "../Utils/OrganicType";

//
import DataHandler from "./DataHandler";
import type SharedChannel from "../Utils/SharedChannel";


export default class PromiseHandler extends DataHandler {
    constructor() { super(); }

    //
    $data(target: unknown | Promise<unknown>) {
        return (isPromise((target as any)?.[ORG.data]) ? (target as any)?.[ORG.data] : target) ?? target;
    }

    //
    $deferOp(target: unknown | Promise<unknown>, cb = (e: any) => e) {
        return doOnlyAfterResolve(target, cb) ?? target;
    }

    //
    $wrapPromise<T extends unknown>(result: T | Promise<T>, handler: DataHandler | null = null): IWrap<T> | null {
        return $wrapPromise(result, handler ?? this);
    }

    //
    $get(_uuid: unknown | string | null): any { return null; };
    $hnd(cmd: string, meta: unknown, ...args: unknown[]) {
        // isn't promise itself
        const data = this.$data(meta);

        //
        if (cmd == "get") {
            if (args[0] == ORG.data) { return data; };
            if (args[0] == ORG.exc) { return this.$exc ?? data?.[ORG.exc] ?? data?.then?.((e: any) => e?.[ORG.exc]) ?? null; };

            // new specific feature for workers
            if (args[0] == "value" || args[0] == Symbol.toPrimitive) {
                const val = ((data as SharedChannel<any>)?.waitAuto?.() ?? data);
                if (typeof val != "object" && typeof val != "function") return val;
            }

            //
            if (["then", "catch", "finally"].indexOf((args as any[])?.[0]) >= 0) {
                // @ts-ignore "no idea"
                return bindCtx(Reflect?.[cmd]?.(data, ...args), data);
            }

            //
            if ( // forbidden actions
                isSymbol(args?.[0]) ||
                FORBIDDEN_KEYS.has(args?.[0] as string) ||
                META_KEYS.has?.(args?.[0] as any)
            ) { return null; };
        }

        // primitive value or non-object/function
        if (data == null || (typeof data != "object" && typeof data != "function")) { return data; };

        // unwrap first-level promise
        return this.$wrapPromise(this.$deferOp(data, (raw) => {
            return super.$hnd(cmd, raw, ...args);
        }));
    }
}

//
export const $wrapPromise = <T extends unknown>(result: T | Promise<T>, handler: DataHandler = new PromiseHandler()): IWrap<T> | null => {
    if (isPromise(result)) {
        return new Proxy(MakeReference(result), new ObjectProxy(handler)) as IWrap<T> | null;
    }
    return result as IWrap<T>;
}
