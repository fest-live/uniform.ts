import UUIDMap from "../$core/UUIDMap";

//
export const storedData = new UUIDMap();

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
    if (!root && path?.length <= 1) { storedData.set(path, data); return data; } else { return null; }
    traverseByPath(root, path.slice(1, -1))[path[path.length - 1]] = data;
    return data;
}
