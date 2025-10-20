import { isPrimitive } from "fest/core";
import { $descriptor } from "./RequestProxy";
import { SELF_CHANNEL } from "./Channels";

//
export const storedData = new Map();
export const registeredInPath = new WeakMap();

//
export const traverseByPath = (obj: any, path: string[]) => {
    if (path != null && !Array.isArray(path)) { path = [path]; }
    if (path == null || path?.length < 1) { return obj; }

    // if descriptor exists, unwrap it...
    const $desc = obj?.[$descriptor] ?? (obj?.$isDescriptor ? obj : null);
    if ($desc && $desc?.owner == SELF_CHANNEL?.name) {
        obj = readByPath($desc?.path) ?? obj;
    }

    if (isPrimitive(obj)) { return obj; }
    for (const key of path) { obj = obj?.[key]; if (obj == null) { return obj; } }
    return obj;
}

// TODO: async support
export const readByPath = (path: string[]) => {
    if (path != null && !Array.isArray(path)) { path = [path]; }
    if (path == null || path?.length < 1) { return null; }
    const root = storedData?.get?.(path?.[0]) ?? null;
    return root != null ? traverseByPath(root, path?.slice?.(1)) : null;
}

// TODO: async support
export const writeByPath = (path: string[], data: any) => {
    // if descriptor exists, unwrap it...
    const $desc = data?.[$descriptor] ?? (data?.$isDescriptor ? data : null);
    if ($desc && $desc?.owner == SELF_CHANNEL?.name) {
        data = readByPath($desc?.path) ?? data;
    }

    //
    if (path != null && !Array.isArray(path)) { path = [path]; }
    if (path == null || path?.length < 1) { return null; }
    const root = storedData?.get?.(path?.[0]) ?? null;
    if (path?.length > 1) { traverseByPath(root, path?.slice?.(1, -1))[path?.[path?.length - 1]] = data; } else { storedData?.set?.(path?.[0], data); }
    if (typeof data == "object" || typeof data == "function") { registeredInPath?.set?.(data, path); }
    return data;
}

//
export const removeByPath = (path: string[]) => {
    if (path != null && !Array.isArray(path)) { path = [path]; }
    if (path == null || path?.length < 1) { return false; }
    const root = storedData?.get?.(path?.[0]) ?? null;
    if (!root && path?.length <= 1) { storedData?.delete?.(path?.[0]); return true; } else { return false; }
    delete traverseByPath(root, path?.slice?.(1, -1))[path?.[path?.length - 1]];
    if ((typeof root == "object" || typeof root == "function") && path?.length <= 1) { registeredInPath?.delete?.(root); }
    return true;
}

//
export const removeByData = (data: any) => {
    // if descriptor exists, unwrap it...
    const $desc = data?.[$descriptor] ?? (data?.$isDescriptor ? data : null);
    if ($desc && $desc?.owner == SELF_CHANNEL?.name) {
        data = readByPath($desc?.path) ?? data;
    }

    //
    const path = registeredInPath?.get?.(data) ?? $desc?.path;
    if (path == null || path?.length < 1) { return false; }; removeByPath(path);
    if (typeof data == "object" || typeof data == "function") { registeredInPath?.delete?.(data); }
    return true;
}

//
export const hasNoPath = (data: any) => {
    return registeredInPath?.get?.(data) == null;
}
