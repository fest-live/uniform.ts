// deno-lint-ignore-file no-explicit-any
import { $moduleLoader, $wrapChannel } from "./loader";
import { $wrapPromise } from "../$core$/Library/Handlers/PromiseHandler";

// wrapper of module loader (with Proxy)
export const moduleLoader = <T extends unknown>(source: string = "") => {
    return $wrapPromise(import("../$worker$/code")?.then?.(async (worker: any) => {
        return $moduleLoader<T>(source, await (worker?.default || ""))?.catch?.(console.trace.bind(console));
    }));
}

// wrapper of module loader (with Proxy)
export const wrapChannel = <T extends unknown>(channel: T) => {
    return $wrapPromise($wrapChannel(channel)?.catch?.(console.trace.bind(console)));
}

//
export default moduleLoader;
export * from "./utils";
