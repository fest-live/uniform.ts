// deno-lint-ignore-file no-explicit-any
import { type dT, type rT } from "./Useful";
import { UUIDv4, deref } from "fest/core";

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
