// deno-lint-ignore-file no-explicit-any
import TS from "../Utils/Alias";
import { extract } from "../Utils/InstructionType";
import { ORG, isPromise } from "../Utils/Useful";

//
export default class TypeDetector {

    detection: Map<string, (d: unknown) => boolean> = new Map<string, (d: unknown) => boolean>();

    // we working only with unwrapped data, we doesn't accept any promise directly
    constructor() {
        //
        this.detection = new Map<string, (d: unknown) => boolean>([
            ["p", (a: unknown): boolean => {
                return (typeof a != "object" && typeof a != "function" || typeof a == TS.udf || a == null);
            }],

            //
            //["tf", (a:any):boolean=>{
            //return (a instanceof ArrayBuffer || a instanceof MessagePort || a instanceof ImageBitmap || a instanceof OffscreenCanvas || a instanceof ReadableStream || a instanceof WritableStream);
            //}],

            //
            ["a", (a: unknown): boolean => {
                return Array.isArray(a);
            }],

            //
            ["ab", (a: unknown): boolean => {
                return (a instanceof ArrayBuffer || (typeof SharedArrayBuffer != TS.udf && a instanceof SharedArrayBuffer));
            }],

            //
            ["ta", (a: unknown): boolean => {
                const $buffer: unknown = (a as any)?.buffer;
                return ($buffer instanceof ArrayBuffer || (typeof SharedArrayBuffer != TS.udf && $buffer instanceof SharedArrayBuffer));
            }],

            //
            ["pms", (a: unknown | Promise<unknown>): boolean => {
                const valid = isPromise(a);
                if (valid) {
                    console.warn("Potentially invalid type");
                    console.trace(a);
                }
                return valid;
            }],

            //
            ["sym", (a: unknown): boolean => {
                return typeof a === 'symbol' || typeof a === 'object' && Object.prototype.toString.call(a) === '[object Symbol]';
            }],

            // may needs to save into temp object pool for remote access
            ["ref", (a: unknown): boolean => {
                const fx = (typeof a == "object" || typeof a == "function");
                return fx;
            }]
        ]);
    }

    // [is organic, defined type]
    detectType(data: unknown, transfer: unknown[] = []): [boolean, string] {
        // are data meta type, skip definition
        const organic = extract(data) as any;
        if ((organic as any)?.[ORG.type]) {
            return [true, (organic as any)?.[ORG.type] as string];
        } else

            //
            if (transfer.indexOf(data) >= 0) {
                return [false, "tf"];
            }

        // other data are primitives
        for (const [type, def] of this.detection) {
            if (def(data)) {
                return [false, type];
            }
        }

        //
        return [false, "unk"];
    }
}
