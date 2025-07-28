// deno-lint-ignore-file no-explicit-any
// Will be used when result are predictable in the pools or return results
import UUIDMap from "../Utils/UUIDMap";
import TypeDetector from "./TypeDetector";
import UniversalHandler from "../Handlers/UniversalHandler";
import { isPromise, doOnlyAfterResolve } from "../Utils/Useful";
import { extract } from "../Utils/InstructionType";
import { wrapMeta } from "../Handlers/UniversalHandler";
import ORG from "../Utils/OrganicType";
import { PMS, TS } from "../Utils/Alias";

//
export const hasMemoryBuffer = (target: any) => {
    // shared array buffer are not transfer, it's sharing
    return ((target as any)?.buffer instanceof ArrayBuffer) || (typeof SharedArrayBuffer != TS.udf && (target as any)?.buffer instanceof SharedArrayBuffer);
}

//
export default class PreCoding {
    $encoder = new Map<string, (organic: boolean, target: unknown, transfer: unknown[]) => unknown>();
    $decoder = new Map<string, (organic: boolean, target: unknown, transfer: unknown[]) => unknown>();
    $mp = new UUIDMap();
    $hndr = new UniversalHandler();
    $typeDetector = new TypeDetector();

    //
    constructor(memoryPool = new UUIDMap()) {
        this.$mp = memoryPool;

        //
        this.$encoder = new Map<string, (organic: boolean, target: unknown, transfer: unknown[]) => unknown>([
            ["a", (organic: boolean, target: unknown, transfer: unknown[] = []) => {
                if (!organic) {
                    const encoded = Array.from((target as []) || []).map((e) => this.encode(e, transfer));
                    return encoded.some(isPromise) ? PMS.all(encoded) : encoded;
                }
                return target;
            }],

            //
            ["tf", (organic: boolean, target: unknown, transfer: unknown[] = []) => {
                if (!organic) {
                    // non-organic just to transfer
                    if (transfer?.indexOf?.(target) < 0 && target != null) {
                        const uuid: string = (this.$mp.get(target) || "") as string;
                        this.$mp.delete(target);

                        // if is typed arrays, they also can be transferred by their buffers
                        // do not transfer shared buffers, but we not detecting as transfer initially
                        const toTransfer = hasMemoryBuffer(target) ? ((target as any)?.buffer ?? target) : target;
                        if (toTransfer != null) { transfer?.push?.(toTransfer); };

                        // for those who will ask where is original
                        if (uuid) {
                            //const meta = {[ORG.type]: "reference", [ORG.uuid]: uuid} as IMeta;
                            // @ts-ignore ""
                            //meta[ORG.uuid] = this.$mp.add(wrapMeta(meta, this.$hndr) as object, meta[ORG.uuid] = uuid, true);

                            // export as organic transfer
                            return {
                                [ORG.type]: "tf",
                                [ORG.uuid]: uuid,
                                [ORG.node]: toTransfer
                            }
                        }
                    };
                } else {
                    // transfers only when is exists
                    const org = (extract(target) || {}) as any;
                    const node = (org as any)?.[ORG.node] ?? this?.$mp?.get((org as any)?.[ORG.uuid] as string);

                    // if exists
                    if (node != null) {

                        // sometimes, `@uuid` may already known in database
                        const uuid: string = ((org as any)?.[ORG.uuid] || this?.$mp?.get?.(node) || "") as string;
                        const meta = { // request to transfer node
                            [ORG.type]: "tf",
                            [ORG.uuid]: uuid,
                            [ORG.node]: node
                        }

                        // add to transfer list (do not transfer shared buffers)
                        // but if transferred to another external worker, should be here an reference
                        if (node != null && transfer?.indexOf?.(node) < 0) {
                            this.$mp.delete(node);
                            transfer?.push?.(hasMemoryBuffer(node) ? ((node as any)?.buffer ?? node) : node);
                        }

                        // doesn't holding it anymore
                        if (org != null && uuid) {
                            // @ts-ignore ""
                            org[ORG.type] = "ref";
                            // @ts-ignore ""
                            org[ORG.node] = null;

                            // @ts-ignore "for who will asking where was transferred"
                            //org[ORG.uuid] = this.$mp.add(wrapMeta(org, this.$hndr), org[ORG.uuid] = uuid, true) as string;
                        };

                        //
                        return meta;
                    }

                    //
                    return org;
                }

                // return as regular
                return target;
            }],

            //
            ["ref", (organic: boolean, target: unknown, _transfer: unknown[] = []) => {
                if (!organic || (target as any)?.[ORG.data]) {
                    const ext = (extract(target) as any)?.[ORG.uuid] as string;
                    const exists = this?.$mp?.get(ext) ?? target;
                    const meta = {
                        [ORG.type]: "ref",
                        [ORG.uuid]: this.$mp.add(exists as any, ext, !organic)
                    };
                    return meta;
                }
                return target;
            }]
        ]);

        //
        this.$decoder = new Map<string, (organic: boolean, target: unknown, transfer: unknown[]) => boolean>([
            ["a", (organic: boolean, target: unknown, transfer: unknown[] = []) => {
                if (!organic) {
                    const decoded = Array.from(target as []).map((e) => this.decode(e, transfer));
                    return decoded.some(isPromise) ? PMS.all(decoded) : decoded;
                }
                // unusual
                return target;
            }],

            //
            ["tf", (organic: boolean, target: unknown, _transfer: unknown[] = []) => {
                if (organic) {
                    // reformat transfer type, add to registry
                    const org = extract(target) as any;
                    const node = ((org as any)?.[ORG.node]) ?? this?.$mp?.get((org as any)?.[ORG.uuid] as string);

                    // unable to override exists
                    if (node != null) {
                        // @ts-ignore "assign"
                        org[ORG.uuid] = this.$mp.add(node, org?.[ORG.uuid] as string, organic) as string;

                        // @ts-ignore "assign"
                        org[ORG.type] = "ref";
                    };

                    // but if transferred to another external worker, should be here an reference
                    return node ?? wrapMeta(org, this.$hndr);
                }
                return target;
            }],

            //
            ["ref", (organic: boolean, target: unknown, _transfer: unknown[] = []) => {
                if (organic) {
                    const org = extract(target) as any;
                    const exists = this?.$mp?.get((org as any)?.[ORG.uuid] as string);
                    return exists ?? wrapMeta(org, this.$hndr);
                }
                // unusual
                return target;
            }]
        ]);
    }

    //
    $decode(target: unknown, transfer: unknown[] = []) {
        const [o, t] = this.$typeDetector.detectType(target, transfer);
        if (this.$decoder.has(t)) {
            return this.$decoder.get(t)?.(o, target, transfer) ?? target;
        }
        return target;
    }

    //
    $encode(target: unknown, transfer: unknown[] = []) {
        const [o, t] = this.$typeDetector.detectType(target, transfer);
        if (this.$encoder.has(t)) {
            return this.$encoder.get(t)?.(o, target, transfer) ?? target;
        }
        return target;
    }

    //
    decode(target: unknown | Promise<unknown>, transfer: unknown[] = []) { return doOnlyAfterResolve(target, (e) => this.$decode(e, transfer)); }
    encode(target: unknown | Promise<unknown>, transfer: unknown[] = []) { return doOnlyAfterResolve(target, (e) => this.$encode(e, transfer)); }
}
