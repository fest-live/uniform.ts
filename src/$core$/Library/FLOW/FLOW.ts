// deno-lint-ignore-file no-explicit-any
import { Transferable, doOnlyAfterResolve } from "../Utils/Useful";
import PromiseStack from '../Utils/PromiseStack';
import { TS } from "../Utils/Alias";

//
const PM = "postMessage";

// FLOW - is web worker library core (low-level)...
export default class FLOW {
    #worker: any | null = null;
    #promiseStack: PromiseStack<unknown> = new PromiseStack<unknown>();
    #imports: any = {};

    //
    constructor(worker: any | null = null) {
        this.#worker = worker;// || defaultWorker;
        this.#imports = {};

        //
        (worker ??= this.#worker)?.addEventListener("message", (ev: any) => {
            if (!ev?.data) { console.log(ev); return; }
            const { cmd, uuid, dir, status, shared } = ev.data;
            if (dir == "req") {
                if (cmd == "ping") {
                    worker?.[PM]?.({ cmd, uuid, dir: "res", status: "ok", result: "ok", shared: null });
                } else
                    if (cmd == "import") {
                        import(/* @vite-ignore */("" + ev.data.source))?.then?.((m) => {
                            Object.assign(this.#imports, (m.default ?? m));
                            worker?.[PM]?.({ cmd, uuid, dir: "res", status: "ok", result: "ok", shared: null });
                        })?.catch?.((e) => {
                            console.error(e);
                            console.trace(e);
                            worker?.[PM]?.({ cmd, uuid, dir: "res", status: "error", result: "unsupported", shared: null });
                        });
                    } else
                        if (cmd == "call") {
                            // hook shared channels for direct answer
                            (shared ? this.#promiseStack?.hook?.(uuid, shared) : null);

                            // call with FLOW "this" context
                            try {
                                doOnlyAfterResolve(this.#imports[ev.data.handler]?.apply?.(self, [ev.data]) ?? ev.data.args, (syncOrAsync) => {
                                    doOnlyAfterResolve(syncOrAsync, (pass) => {
                                        const [$r, transfer] = pass;
                                        doOnlyAfterResolve($r, (result) => {
                                            worker?.[PM]?.({
                                                handler: "$resolver",
                                                status: "ok",
                                                cmd,
                                                uuid,
                                                dir: "res",
                                                result,
                                                shared
                                            }, [...new Set(Array.from(transfer || []))].filter((e) => Transferable.some((I) => e instanceof I)) as StructuredSerializeOptions);

                                            // resolve when sync supported
                                            // @ts-ignore ""
                                            this.#promiseStack?.[TS.rvb]?.(uuid, result);
                                        });
                                    });
                                });
                            } catch (e: any) {
                                console.error(e);
                                console.trace(e);

                                //
                                const reason = e.message;
                                worker?.[PM]?.({
                                    handler: "$resolver",
                                    status: "error",
                                    cmd,
                                    uuid,
                                    dir: "res",
                                    result: reason,
                                    shared: null
                                }, []);

                                // resolve when sync supported
                                // @ts-ignore ""
                                this.#promiseStack?.[TS.rjb]?.(uuid, reason);
                            }
                        } else {
                            console.error("Internal command: " + cmd + " not supported.");
                            worker?.[PM]?.({ cmd, uuid, dir: "res", status: "error", result: "unk" });
                        }
            } else
                if (dir == "res") {
                    try {
                        const resolved = this.#imports?.[ev.data.handler]?.apply?.(self, [ev.data]) ?? (ev.data.result) ?? null;
                        // @ts-ignore ""
                        this.#promiseStack?.[status != "error" ? TS.rvb : TS.rjb]?.(uuid, resolved ?? null);
                    } catch (e: any) {
                        console.error(e);
                        console.trace(e);
                        // @ts-ignore ""
                        this.#promiseStack?.[TS.rjb]?.(uuid, e?.message);
                    }
                }
        });
    }

    //
    get $imports() {
        return this.#imports;
    }

    importToSelf(module: any) {
        Object.assign(this.#imports, (module)?.default ?? module);
        return this;
    }

    importToUnit(source: string, sync = false) {
        // @ts-ignore ""
        const pair = this.#promiseStack?.[sync ? TS.cs : TS.cr]?.();
        this.#worker?.[PM]?.({
            status: "pending",
            handler: "$import",
            cmd: "import",
            dir: "req",
            shared: pair?.[2],
            uuid: pair?.[0] || "",
            source
        });
        return pair?.[1];
    }

    sync(sync = false) {
        // @ts-ignore ""
        const pair = this.#promiseStack?.[sync ? TS.cs : TS.cr]?.();
        this.#worker?.[PM]?.({
            status: "pending",
            shared: pair?.[2],
            handler: null,
            cmd: "ping",
            dir: "req",
            uuid: pair?.[0] || ""
        });
        return pair?.[1];
    }

    callTask($args: any[] = [], transfer: unknown[] = [], sync = false) {
        // @ts-ignore ""
        const pair = this.#promiseStack?.[sync ? TS.cs : TS.cr]?.();
        doOnlyAfterResolve($args, (args) => {
            this.#worker?.[PM]?.({
                status: "pending",
                handler: "$handler",
                cmd: "call",
                dir: "req",
                uuid: pair?.[0] || "",
                shared: pair?.[2],
                args
            }, [...new Set(transfer || [])] as StructuredSerializeOptions);
        });
        return pair?.[1];
    }
}
