export enum WStatus {
    SUCCESS = "success",
    ERROR = "error"
}

export enum WType {
    PRIMITIVE = "primitive",
    NUMBER = "number",
    STRING = "string",
    BOOLEAN = "boolean",
    BIGINT = "bigint",
    UNDEFINED = "undefined",
    NULL = "null",
    OBJECT = "object",
    FUNCTION = "function",
    ARRAY = "array",
    MAP = "map",
    SET = "set",
    SYMBOL = "symbol",
    WEAK_REF = "weakRef",
    PROMISE = "promise",
    UNKNOWN = "unknown"
}

export enum WReflectAction {
    GET = "get",
    SET = "set",
    CALL = "call",
    APPLY = "apply",
    CONSTRUCT = "construct",
    DELETE = "delete",
    DELETE_PROPERTY = "deleteProperty",
    HAS = "has",
    OWN_KEYS = "ownKeys",
    GET_OWN_PROPERTY_DESCRIPTOR = "getOwnPropertyDescriptor",
    GET_PROPERTY_DESCRIPTOR = "getPropertyDescriptor",
    GET_PROTOTYPE_OF = "getPrototypeOf",
    SET_PROTOTYPE_OF = "setPrototypeOf",
    IS_EXTENSIBLE = "isExtensible",
    PREVENT_EXTENSIONS = "preventExtensions",
    TRANSFER = "transfer",
    IMPORT = "import",
    DISPOSE = "dispose",
}

export interface WReflectDescriptor<T = any> {
    path: string[];
    channel: string;
    primitive: boolean;
    writable: boolean;
    enumerable: boolean;
    configurable: boolean;
    argumentCount: number; // -1 is possible infinite, such as '...args' or '...args: any[]'
}

export interface WReq<T = any> {
    channel: string;
    sender: string;
    path: string[]; // path to class method
    action: WReflectAction;
    reqId: string;
    args: any[]|any;

    // currently, don't know how to use it
    params: Record<string, T>;
    data: any;
}

export interface WError<T = any> {
    message: string;
}

export interface WSuccess<T = any> {
    message: string;
}

export interface WResp<T = any> {
    status: number;
    reason: WError<T>|WSuccess<T>;
    message: string;
    received?: T|null;
    descriptor?: WReflectDescriptor|null;
    type?: WType|null;
}
