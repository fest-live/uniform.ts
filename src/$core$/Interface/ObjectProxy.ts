// deno-lint-ignore-file no-explicit-any ban-types no-explicit-any
export default class ObjectProxy<T extends object | Function> implements ProxyHandler<T> {
    #handlerUtils: any = {};

    //
    constructor(handlerUtils = {}) {
        this.#handlerUtils = handlerUtils;
    }

    //
    access(target: T, ...args: unknown[]) {
        return this.#handlerUtils.$hnd("access", target, ...args);
    }

    //
    get(target: T, ...args: unknown[]) {
        return this.#handlerUtils.$hnd("get", target, ...args);
    }

    //
    set(target: T, ...args: unknown[]) {
        return this.#handlerUtils.$hnd("set", target, ...args);
    }

    //
    has(target: T, ...args: unknown[]) {
        return this.#handlerUtils.$hnd("has", target, ...args);
    }

    //
    call(target: T, ...args: unknown[]) {
        return this.#handlerUtils.$hnd("call", target, ...args);
    }

    //
    apply(target: T, ...args: unknown[]) {
        return this.#handlerUtils.$hnd("apply", target, ...args);
    }

    //
    construct(target: T, ...args: unknown[]) {
        return this.#handlerUtils.$hnd("construct", target, ...args);
    }

    //
    deleteProperty(target: T, ...args: unknown[]) {
        return this.#handlerUtils.$hnd("deleteProperty", target, ...args);
    }
}
