import UUIDMap from "../$core$/UUIDMap";

//
export const storedData = new UUIDMap();
export const registeredInPath = new WeakMap();

//
const isPrimitive = (obj: any)=>{
    return obj == null || typeof obj == "string" || typeof obj == "number" || typeof obj == "boolean" || typeof obj == "bigint" || typeof obj == "symbol" || typeof obj == "undefined";
}

//
export const traverseByPath = (obj: any, path: string[]) => {
    if (isPrimitive(obj)) { return path?.length < 1 ? obj : null; }
    for (const key of path) {
        obj = obj?.[key];
        if (obj == null) { return null; }
    }
    return obj;
}

// TODO: async support
export const readByPath = (path: string[]) => {
    const root = storedData.get(path);
    if (root == null) { return null; }
    return traverseByPath(root, path.slice(1));
}

// TODO: async support
export const writeByPath = (path: string[], data: any) => {
    const root = storedData.get(path);
    if (!root && path?.length <= 1) { storedData.add(path, data); return data; } else { return null; }
    traverseByPath(root, path.slice(1, -1))[path[path.length - 1]] = data;
    if (typeof data == "object" || typeof data == "function") { registeredInPath.set(data, path); }
    return data;
}

//
export const removeByPath = (path: string[]) => {
    const root = storedData.get(path);
    if (!root && path?.length <= 1) { storedData.delete(path); return true; } else { return false; }
    delete traverseByPath(root, path.slice(1, -1))[path[path.length - 1]];
    if ((typeof root == "object" || typeof root == "function") && path?.length <= 1) { registeredInPath.delete(<any>root); }
    return true;
}

//
export const removeByData = (data: any) => {
    const path = registeredInPath.get(data);
    if (path == null) { return false; }
    removeByPath(path);
    if (typeof data == "object" || typeof data == "function") { registeredInPath.delete(<any>data); }
    return true;
}

//
export const hasNoPath = (data: any) => {
    return registeredInPath.get(data) == null;
}
