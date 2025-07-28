// deno-lint-ignore-file no-explicit-any
import TS from "../$core$/Library/Utils/Alias";

const loadWorker = (WX: any): Worker | null => {
    if (WX instanceof Worker) { return WX; } else
        if (typeof WX == "function") { try { return new WX(); } catch (e) { return WX(); }; } else
            if (typeof WX == "string") {
                if (URL.canParse(WX)) { return new Worker(WX, { type: "module" }); };
                return new Worker(URL.createObjectURL(new Blob([WX], { type: "application/javascript" })), { type: "module" });
            } else
                if (WX instanceof Blob || WX instanceof File) { return new Worker(URL.createObjectURL(WX), { type: "module" }); }
    return WX ? WX : (typeof self != TS.udf ? self : null) as unknown as Worker;
}

export const $moduleLoader = async <T extends unknown>(moduleSource: string, workerCode: string = ""): Promise<T> => {
    if (!moduleSource || typeof moduleSource != "string") throw new Error("Invalid module source");

    // if url too long, un-compress code
    const uWorker = loadWorker(workerCode);
    const EXChanger = (await import("../$core$/Library/FLOW/ExChanger")).default;
    const exChanger = new EXChanger(uWorker)?.initialize?.();
    const module = await (await exChanger?.access?.("!!import!!") as any)?.(moduleSource);
    return module;
}

export const $wrapChannel = async (uWorker: any) => {
    const { wrapExChanger } = await import("../$core$/Library/Utils/Useful");
    const EXChanger = (await import("../$core$/Library/FLOW/ExChanger")).default;
    return wrapExChanger(await (new EXChanger(await uWorker)?.initialize?.()));
}
