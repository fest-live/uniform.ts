// deno-lint-ignore-file no-explicit-any

export enum $ORG {
    exc = "!#exc#!",
    type = "!#type#!",
    uuid = "!#uuid#!",
    node = "!#node#!",
    index = "!#index#!",
    payload = "!#payload#!",
    dispose = "!#dispose#!"
}

//
const $exc$ = Symbol.for("$@exc@$");
const $data$ = Symbol.for("$@data@$");
const $sync$ = Symbol.for("$@sync@$");

export const ORG = {
    exc: $exc$,
    sync: $sync$,
    data: $data$,
    type: $ORG.type,
    uuid: $ORG.uuid,
    node: $ORG.node,
    index: $ORG.index,
    payload: $ORG.payload,
    dispose: $ORG.dispose
}

export interface IMeta {
    [$ORG.uuid]?: string;
    [$ORG.type]?: string;
    [$ORG.node]?: unknown;
    [$ORG.payload]?: unknown;
    [$ORG.index]?: number;
};

//
export default ORG;
export const $bindings$ = new WeakMap<any, any>();
export const bindWithContext = (context: any, obj: any) => {
    try { context[ORG.exc] = obj; } catch (e: any) { };
    $bindings$.set(context, obj);
    return obj;
}
