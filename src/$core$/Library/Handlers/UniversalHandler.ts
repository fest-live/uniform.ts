// deno-lint-ignore-file no-explicit-any
import ObjectProxy from "../../Interface/ObjectProxy";

//
import { MPromise, FORBIDDEN_KEYS, META_KEYS, isSymbol, doOnlyAfterResolve, isPromise, type IWrap, UUIDv4 } from "../Utils/Useful";
import RemoteReferenceHandler from "./RemoteHandler";
import { extract, MakeReference, wrapWeakMap } from "../Utils/InstructionType";
import { ORG, IMeta } from "../Utils/OrganicType";

//
import DataHandler from "./DataHandler";

//
export default class UniversalHandler extends DataHandler {
    #dataHandler: Map<string, DataHandler>;

    //
    constructor(dataHandler: Map<string, DataHandler> = new Map<string, DataHandler>()) {
        super(); this.#dataHandler = dataHandler;
    }

    //
    get $exc() { return this.#dataHandler?.get?.("rmt")?.$exc; }

    //
    $data(t: unknown | string | null): unknown { return (t as any)?.[ORG.data] ?? t; }
    $addHandler(name: string, handler: DataHandler) { this.#dataHandler.set(name, handler); }
    $getHandler(name: string) { return this.#dataHandler.get(name); }

    //
    $get(uuid: unknown | string | null) { return this.#dataHandler.get("loc")?.$get?.(uuid); };
    $hnd(cmd = "access", t: any, ...args: unknown[]) {
        const data: any = this.$data(t);

        // isn't promise itself
        if (cmd == "get") {
            if (args[0] == ORG.data) { return data; };
            if (args[0] == ORG.exc) { return this.$exc ?? data?.[ORG.exc] ?? data?.then?.((e: any) => e?.[ORG.exc]) ?? null; };
            if ( // forbidden actions
                (isSymbol(args?.[0]) ||
                    FORBIDDEN_KEYS.has(args?.[0] as string) ||
                    META_KEYS.has?.(args?.[0] as any)) &&
                args[0] != ORG.dispose
            ) { return null; };
        }

        //
        let htp = "dir";
        if (isPromise(data)) { htp = "pms"; } else {
            const meta = (extract(t) as IMeta), local = this.$get(meta);
            const overlap = (extract(local) as any)?.[ORG.uuid] == (meta as any)?.[ORG.uuid];

            //
            if (typeof (meta as any)?.[ORG.type] == "string") { htp = "loc"; }
            if (typeof (meta as any)?.[ORG.uuid] == "string" && (!local || overlap)) { htp = "rmt"; }
        }

        //
        return this.#dataHandler?.get(htp)?.$hnd?.(cmd, t, ...args);
    }
}

//
const gc_cb = new Map();
const registry = new FinalizationRegistry((key: string) => {
    gc_cb?.get?.(key)?.();
    gc_cb?.delete?.(key);
});

//
export const wrapMeta = <T extends IMeta | unknown>(meta: MPromise<T> | IWrap<T> | null, handler: UniversalHandler | DataHandler | RemoteReferenceHandler | null = null) => {
    if (!(typeof meta == "object" || typeof meta == "function")) return meta;

    //
    const wrap = (!(meta as any)?.[ORG.data]) ? (new Proxy(MakeReference(meta), new ObjectProxy(handler || new UniversalHandler()))) : meta;
    doOnlyAfterResolve<IMeta>(meta as MPromise<IMeta>, ($m: IMeta) => {
        if ($m) {
            doOnlyAfterResolve(wrap, (w) => {
                if (w != null && (typeof w == "object" || typeof w == "function")) {
                    const organic = (wrapWeakMap.get(w) ?? w) as any;
                    const pt = organic?.[ORG.data] ?? organic;
                    if (pt?.[ORG.uuid] || pt?.[ORG.type]) { wrapWeakMap.set(w, pt); };
                }
            });
        };
    });

    //
    const dispose = wrap?.[ORG.dispose];
    if (dispose) {
        const token = UUIDv4();
        registry.register(wrap, token);
        gc_cb.set(token, dispose);
    }

    //
    return wrap;
}
