// deno-lint-ignore-file no-explicit-any
//import moduleLoader, {doTransfer, getContext, sync} from "../src/$main$/index";
import moduleLoader, {doTransfer, getContext, sync} from "../dist/uniform.js";
//import moduleLoader, {doTransfer, getContext, sync} from "../dist-wp/main.mjs";

// typescript modules doesn't supported directly...
const module = (await (moduleLoader( new URL("./Worker.mjs", import.meta.url).href )?.catch?.(console.trace.bind(console)))) as any;
const ctx = getContext(module);
if (!ctx) throw new Error("Invalid context or worker...");

//
const transferCheck = (ab: any)=>{ try { console.log(ab); } catch(e) {}; return ab; };
const hostAction = async ()=>{
    // @ts-ignore ""
    const TestClass: any = module.TestClass;
    console.log(await TestClass.lab);

    //
    const tgn = (new TestClass());
    await tgn?.callback?.(6);

    // get arrayBuffer from context registry
    console.log(await doTransfer(ctx, "", module?.regrets));
}

// set context extras (visible in worker)
ctx["transferCheck"] = transferCheck;
ctx["hostAction"] = hostAction;

// synchronize
await ctx[sync];

//
const workerAction = (await module?.workerAction);

//
await hostAction();
await workerAction?.();
