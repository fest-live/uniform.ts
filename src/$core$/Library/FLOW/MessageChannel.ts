// deno-lint-ignore-file no-explicit-any
import PreCoding from "../PreCoding/PreCoding";
import { doOnlyAfterResolve, ORG } from "../Utils/Useful";

//
export const $cd = new PreCoding();
export const $mp = $cd.$mp;
export const $dh = $cd.$hndr;

//
export const $resolver = (command: any) => (command.result);
export const $handler = (command: any) => {
    const { args: [cmd, target, ...args] } = command;

    //
    const transfer: unknown[] = [];
    if (cmd == "apply" && args.length >= 3) { transfer.push(...args.splice(2)); }
    if (cmd == "dispose") { $mp.discount(target?.[ORG.uuid] || target); };

    // before you needs decode its
    return doOnlyAfterResolve($cd.decode([cmd, target, ...args], transfer), ([cmd, target, ...args]) => {
        const result = $dh?.$getHandler?.("pms")?.$hnd?.(cmd, target, ...args);
        const ready = $cd.encode(result, transfer);
        return [ready, transfer] // also, needs to recode back
    });
}
