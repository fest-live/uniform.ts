// deno-lint-ignore-file no-explicit-any
import { isSymbol, FORBIDDEN_KEYS, META_KEYS } from "../Utils/Useful";
import { extract } from "../Utils/InstructionType";
import ORG from "../Utils/OrganicType";

//
import DataHandler from "./DataHandler";

//
export default class RemoteReferenceHandler extends DataHandler {
    #exChanger: any | null;

    //
    constructor(exChanger: any | null) {
        super();
        this.#exChanger = exChanger;
    }

    //
    get $exc() { return this.#exChanger; }

    //
    $data(t: unknown) { return extract(t) ?? t; }
    $get(_: unknown | string | null): any { return null; };
    $hnd(cmd: string, meta: unknown, ...args: unknown[]) {
        const data: any = this.$data(meta);

        // return meta as is
        if (cmd == "get") { // any remote is disposable
            if (args[0] == ORG.dispose) { return () => { return this.#exChanger?.$request("dispose", meta, []); }; };
            if (args[0] == ORG.data) { return data; };
            if (args[0] == ORG.exc) { return this.$exc ?? data?.[ORG.exc] ?? data?.then?.((e: any) => e?.[ORG.exc]) ?? null; };
            if ((args[0] == "value" || args[0] == Symbol.toPrimitive) && (typeof data != "object" && typeof data != "function")) { return data; };
            if ( // forbidden actions
                isSymbol(args?.[0]) ||
                FORBIDDEN_KEYS.has(args?.[0] as string) ||
                META_KEYS.has?.(args?.[0] as any)
            ) { return null; };
        }

        //
        return this.#exChanger?.$request(cmd, meta, args);
    }
}
