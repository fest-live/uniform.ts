
//! loads worker, used by host code!
import $raw$ from "./index?worker&compress&inline"; const IW = $raw$;
const loadCompressed = async (b64c: string): Promise<string | null> => {
    const blob = new Blob([Uint8Array.from(atob(b64c), c => c.charCodeAt(0))], { type: "application/gzip" });
    const ds = new DecompressionStream("gzip");
    const decompressedStream = blob.stream().pipeThrough(ds);
    const response = await (new Response(decompressedStream, { headers: new Headers({ "Content-Type": "application/javascript" }) })).blob();
    return URL.createObjectURL(response);
}
export const PRELOAD = (typeof IW == "string" && !URL.canParse(IW)) ? loadCompressed(IW as unknown as string) : IW;
export default PRELOAD;
