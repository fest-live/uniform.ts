import { importModuleInChannel } from "fest/uniform";

//
const module = await importModuleInChannel("test", new URL("./module.ts", import.meta.url).href);
console.log(await module?.remoteFunction(1, 2));

//
const r2 = await (await module?.createArrayBuffer(10))?.transfer?.();
console.log(r2);
