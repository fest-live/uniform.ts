import { bindWithContext } from "../Library/Utils/OrganicType";

// deno-lint-ignore-file no-explicit-any
export const makeModuleLoader = (exChanger: any, altName: string = "!!import!!") => {
    // make import loader support
    const $import$ = (src: string = ""): Promise<any> => {
        return import(src)?.then(async ($m) => {
            const module = await import("../Library/Utils/Useful");
            const { wrapExChanger, transfer, doTransfer } = module;

            //
            const ctx = wrapExChanger(exChanger);
            const utils = {
                transfer: transfer?.bind?.(module, ctx),
                doTransfer: doTransfer?.bind?.(module, ctx),
            };

            //
            if (typeof $m == "object" || typeof $m == "function") { bindWithContext($m, exChanger); };
            if (typeof $m?.$importContext$ == "function") { $m?.$importContext$?.({ ctx, utils }); } else {
                $m?.$importContext$?.resolve?.(ctx);
                $m?.$importUtils$?.resolve?.(utils);
            }

            //
            return $m;
        });
    };

    // is direct
    if (typeof exChanger?.register == "function") { exChanger?.register?.($import$, altName || "!!import!!"); } else
        if (typeof exChanger == "object" || typeof exChanger == "function") { exChanger["!!import!!"] = $import$; }
    return exChanger;
}

//
export default makeModuleLoader;
