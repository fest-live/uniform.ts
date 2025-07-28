// deno-lint-ignore-file no-explicit-any
import { FORBIDDEN_KEYS, META_KEYS, isSymbol } from "../Utils/Useful";
import { extract } from "../Utils/InstructionType";
import { type IMeta, ORG } from "../Utils/OrganicType";

//
export default class DataHandler {
    constructor() { }
    get $exc(): any { return null; };

    //
    $data(target: unknown | string | null) { return target; };
    $get(_uuid: unknown | string | null): any { return null; };
    $hnd(cmd: string, meta: unknown, ...args: unknown[]) {
        const ref: any = this.$data(meta);

        // return meta as is
        if (cmd == "get") {
            if (args[0] == ORG.data) { return ref; };
            if (args[0] == ORG.exc) { return this.$exc ?? ref?.[ORG.exc] ?? ref?.then?.((e: any) => e?.[ORG.exc]) ?? null; };
            if ((args[0] == "value" || args[0] == Symbol.toPrimitive) && (typeof ref != "object" && typeof ref != "function")) { return ref; }
            if ( // forbidden actions
                isSymbol(args?.[0]) ||
                FORBIDDEN_KEYS.has(args?.[0] as string) ||
                META_KEYS.has?.(args?.[0] as any)
            ) { return null; };
        }

        // any illegal is illegal (after 'then' or defer operation)...
        if (ref == null || (typeof ref != "object" && typeof ref != "function")) { return ref; }

        // needs to return itself
        if (cmd == "access") { return ref; }
        if (cmd == "transfer") {
            // sometimes, `@uuid` may already is known from memory pool
            const wrap = extract(meta) as IMeta;
            return {
                [ORG.type]: "tf",
                [ORG.node]: ref,
                [ORG.uuid]: (wrap as any)?.[ORG.uuid] ?? ""
            };
        };

        //
        try {
            // @ts-ignore "no-idea"
            return Reflect?.[cmd]?.(ref, ...args);
        } catch (e) {
            const err = e as Error;

            //
            console.error("Wrong op: " + err.message);

            //
            console.error(err);
            console.trace(err);
        }

        //
        return ref;
    }
}
