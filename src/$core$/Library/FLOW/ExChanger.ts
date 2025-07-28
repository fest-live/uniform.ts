// deno-lint-ignore-file no-explicit-any ban-types
import ObjectProxy from "../../Interface/ObjectProxy";
import { doOnlyAfterResolve, isPromise, UUIDv4, type IWrap } from "../Utils/Useful";
import { extract, MakeReference } from "../Utils/InstructionType";
import RemoteReferenceHandler from "../Handlers/RemoteHandler";
import MemoryHandler from "../Handlers/MemoryHandler";
import DataHandler from "../Handlers/DataHandler";
import PromiseHandler from "../Handlers/PromiseHandler";
import type UniversalHandler from "../Handlers/UniversalHandler";
import type PreCoding from "../PreCoding/PreCoding";
import type UUIDMap from "../Utils/UUIDMap";
import FLOW from "./FLOW";
import * as $M from "./MessageChannel";
import { ORG, IMeta, bindWithContext } from "../Utils/OrganicType";
import { TS } from "../Utils/Alias";

export default class ExChanger {
    #flow: FLOW | null = null;
    #handler: UniversalHandler | null = null;
    #memoryPool: UUIDMap | null = null;
    #coder: PreCoding | null = null;

    constructor(context: any) {
        if (typeof context != TS.udf && context != null) {
            bindWithContext(context, this);
            this.#flow = new FLOW(context);
        } else {
            console.warn("Context not bounded!");
        }
    }

    initialize() {
        if (this.#flow?.importToSelf?.($M) != null) {
            this.#coder = this.#flow?.$imports?.$cd ?? this.#coder;
            this.#memoryPool = this.#flow?.$imports?.$mp ?? this.#memoryPool;
        } else {
            throw Error("Worker Engine Not Defined!");
        }

        if ((this.#handler = this.#flow?.$imports?.$dh ?? this.#handler) != null) {
            this.#handler?.$addHandler("loc", new MemoryHandler(this.#memoryPool));
            this.#handler?.$addHandler("rmt", new RemoteReferenceHandler(this));
            this.#handler?.$addHandler("pms", new PromiseHandler());
            this.#handler?.$addHandler("dir", new DataHandler());
        } else {
            throw Error("Invalid Native Module!");
        }

        return this;
    }

    get $imports() { return this.#flow?.$imports || {}; }
    get $sync() { return this.#flow?.sync?.(); }
    async sync() {
        await this.$sync;
        return this;
    }

    $makePromise<T extends unknown>(target: T | Promise<T>): IWrap<T> | null {
        try {
            const ext = (target as any)?.[ORG.data] ?? target;
            if (isPromise(target)) {
                return new Proxy(MakeReference(ext), new ObjectProxy(this.#handler?.$getHandler?.("pms"))) as IWrap<T>;
            }
            return target as IWrap<T>;
        } catch (e) {
            console.error(e);
            return null;
        }
    }

    $act<T extends unknown>(result: T | Promise<T>, cb: (result: T) => void): IWrap<T> | null {
        try {
            return this.$makePromise(doOnlyAfterResolve(result, cb));
        } catch (e) {
            console.error(e);
            return null;
        }
    }

    $request<T extends unknown>(cmd: string, meta: unknown, args: unknown[]): IWrap<T> | null {
        const transfer: unknown[] = [];
        const encoded = this.#coder?.encode([cmd, meta, ...args], transfer) as any[];
        const result = this.#flow?.callTask?.(encoded, transfer);

        try {
            return this.$act(result, (res) => this.#coder?.decode?.(res, transfer)) as IWrap<T> | null;
        } catch (e) {
            console.error(e);
            return null;
        }
    }

    $importToUnit(source: string) { return this.#flow?.importToUnit(source); }
    $importToSelf(module: unknown) { return this.#flow?.importToSelf(module); }

    register<T extends object | Function>(object: T, name = ""): string | null {
        return this.#memoryPool?.add?.(object, name) || "";
    }

    access<T extends unknown>(name = ""): IWrap<T> | null {
        if (this.#memoryPool?.has?.(name)) {
            return this.#memoryPool?.get?.(name) as IWrap<T> | null;
        }
        const com = this.$request("access", { [ORG.type]: "ref", [ORG.uuid]: name }, []) as IWrap<T> | null;
        return com;
    }

    transfer<T extends unknown>($node: T | null = null, name: string = "") {
        return this.$act($node, (node) => {
            const meta: IMeta = extract(node) as IMeta;
            const uuid: string = (name || (meta as any)?.[ORG.uuid] || UUIDv4()) as string;
            const real: T = (meta as any)?.[ORG.node] ?? this.#memoryPool?.get?.(uuid) ?? node;

            if (this.#handler) {
                return new Proxy(
                    MakeReference({ [ORG.type]: "tf", [ORG.uuid]: uuid, [ORG.node]: real }),
                    new ObjectProxy(this.#handler)
                );
            }

            return null;
        });
    }

    doTransfer<T extends unknown>($name: string | IMeta | IWrap<IMeta> = "", node: T | null = null): IWrap<T> | null {
        return this.$act<any>($name, (name: any): IWrap<T> | null => {
            return this.$act(node, (result: any): IWrap<T> | null => {
                // @ts-ignore "sometimes, may got new UUID, or exists"
                const esm: IMeta = extract(name) as IMeta;
                const meta: IMeta = extract(result) as IMeta;
                const uuid: string = ((esm as any)?.[ORG.uuid] || name || (meta as any)?.[ORG.uuid] || UUIDv4() || "") as string;
                const real: T = (meta as any)?.[ORG.node] ?? this.#memoryPool?.get?.(uuid) ?? result ?? (esm as any)?.[ORG.node];

                // @ts-ignore "make meta uuid equal"
                if (esm != null) { esm[ORG.uuid] = (uuid || "") as string; }
                // @ts-ignore "make meta uuid equal"
                if (meta != null) { meta[ORG.uuid] = (uuid || "") as string; }

                if (!result && real) { return real as IWrap<T>; }

                result = real != null
                    ? this.$request("access", { [ORG.type]: "tf", [ORG.uuid]: uuid, [ORG.node]: real }, [])
                    : this.$request("transfer", esm ?? { [ORG.type]: "ref", [ORG.uuid]: uuid }, []);

                return result as IWrap<T>;
            });
        });
    }
}
