// deno-lint-ignore-file
// !should to be compiled as worker entry!
import { wrapExChanger } from "../$core$/Library/Utils/Useful";
import exChanger from "../$core$/Workers/ExChangerUnit";
import makeModuleLoader from "../$core$/Workers/MakeLoader";
export const moduleLoader = wrapExChanger(makeModuleLoader(exChanger));
export default moduleLoader;
export { exChanger, wrapExChanger };
