/**
 * Unified Types & Interfaces
 *
 * All shared types for uniform.ts in one place.
 */

// ============================================================================
// ENUMS
// ============================================================================

export enum WStatus { SUCCESS = "success", ERROR = "error" }

export enum WType {
    PRIMITIVE = "primitive", NUMBER = "number", STRING = "string",
    BOOLEAN = "boolean", BIGINT = "bigint", UNDEFINED = "undefined",
    NULL = "null", OBJECT = "object", FUNCTION = "function",
    ARRAY = "array", MAP = "map", SET = "set", SYMBOL = "symbol",
    WEAK_REF = "weakRef", PROMISE = "promise", UNKNOWN = "unknown"
}

export enum WReflectAction {
    GET = "get", SET = "set", CALL = "call", APPLY = "apply",
    CONSTRUCT = "construct", DELETE = "delete", DELETE_PROPERTY = "deleteProperty",
    HAS = "has", OWN_KEYS = "ownKeys",
    GET_OWN_PROPERTY_DESCRIPTOR = "getOwnPropertyDescriptor",
    GET_PROPERTY_DESCRIPTOR = "getPropertyDescriptor",
    GET_PROTOTYPE_OF = "getPrototypeOf", SET_PROTOTYPE_OF = "setPrototypeOf",
    IS_EXTENSIBLE = "isExtensible", PREVENT_EXTENSIONS = "preventExtensions",
    TRANSFER = "transfer", IMPORT = "import", DISPOSE = "dispose"
}

// ============================================================================
// REQUEST/RESPONSE TYPES
// ============================================================================

export interface WReflectDescriptor<T = any> {
    $isDescriptor?: boolean;
    path: string[];
    channel: string;
    owner: string;
    primitive: boolean;
    writable: boolean;
    enumerable: boolean;
    configurable: boolean;
    argumentCount: number;
}

export interface WReq<T = any> {
    channel: string;
    sender: string;
    path: string[];
    action: WReflectAction | string;
    reqId?: string;
    args: any[] | any;
    params?: Record<string, T>;
    data?: any;
}

export interface WError<T = any> { message: string; }
export interface WSuccess<T = any> { message: string; }

export interface WResp<T = any> {
    status?: number;
    reason?: WError<T> | WSuccess<T>;
    message?: string;
    result?: T | null;
    received?: T | null;
    descriptor?: WReflectDescriptor | null;
    type?: WType | string | null;
    error?: string | null;
}

// ============================================================================
// OBSERVABLE TYPES
// ============================================================================

/** Observer interface (WICG-like) */
export interface Observer<T = any> {
    next?: (value: T) => void;
    error?: (err: Error) => void;
    complete?: () => void;
}

/** Subscription handle */
export interface Subscription {
    unsubscribe(): void;
    readonly closed: boolean;
}

/** Subscribable interface */
export interface Subscribable<T = any> {
    subscribe(observer: Observer<T> | ((value: T) => void)): Subscription;
}

/** Subscriber (passed to Observable producer) */
export interface Subscriber<T = any> {
    next(value: T): void;
    error(err: Error): void;
    complete(): void;
    signal: AbortSignal;
    readonly active: boolean;
}

/** Observable producer function */
export type Producer<T = any> = (subscriber: Subscriber<T>) => (() => void) | void;

// ============================================================================
// CHANNEL TYPES
// ============================================================================

/** Channel message envelope */
export interface ChannelMessage<T = any> {
    id: string;
    channel: string;
    sender: string;
    type: "request" | "response" | "event" | "signal" | "exchange";
    payload?: T;
    reqId?: string;
    timestamp?: number;
    transferable?: Transferable[];
}

/** Channel state */
export type ChannelState = "disconnected" | "connecting" | "connected" | "closed";

/** Channel metadata */
export interface ChannelMeta {
    id?: string;
    name: string;
    state?: ChannelState;
    isHost?: boolean;
    transport?: TransportType;
    target?: string;
    options?: Record<string, any>;
    connectedChannels?: Set<string>;
}

// ============================================================================
// TRANSPORT TYPES
// ============================================================================

/** Transport type identifier */
export type TransportType =
    | "worker"
    | "shared-worker"
    | "service-worker"
    | "broadcast"
    | "message-port"
    | "websocket"
    | "chrome-runtime"
    | "chrome-tabs"
    | "chrome-port"
    | "chrome-external"
    | "socket-io"
    | "rtc-data"
    | "atomics"
    | "ring-buffer"
    | "self"
    | "internal";

/** Transport target (runtime objects or string identifiers) */
export type TransportTarget =
    | Worker
    | MessagePort
    | BroadcastChannel
    | WebSocket
    | RTCDataChannel
    | "chrome-runtime"
    | "chrome-tabs"
    | "chrome-port"
    | "chrome-external"
    | "service-worker-client"
    | "service-worker-host"
    | "shared-worker"
    | "rtc-data"
    | "atomics"
    | "self";

/** Connection options */
export interface ConnectionOptions {
    timeout?: number;
    autoReconnect?: boolean;
    reconnectInterval?: number;
    maxReconnectAttempts?: number;
    bufferMessages?: boolean;
    bufferSize?: number;
    metadata?: Record<string, any>;
}

// ============================================================================
// ADVANCED TRANSPORT TYPES
// ============================================================================

/** SharedArrayBuffer configuration */
export interface AtomicsConfig {
    bufferSize?: number;
    maxMessageSize?: number;
    compression?: boolean;
    waitTimeout?: number;
    useAsyncWait?: boolean;
}

/** WebRTC DataChannel configuration */
export interface RTCConfig {
    iceServers?: RTCIceServer[];
    dataChannelOptions?: RTCDataChannelInit;
    connectionTimeout?: number;
    binaryFormat?: "json" | "cbor" | "msgpack";
}

/** SharedWorker configuration */
export interface SharedWorkerConfig {
    name?: string;
    credentials?: RequestCredentials;
    type?: WorkerType;
    autoConnect?: boolean;
}

/** MessagePort configuration */
export interface PortConfig {
    autoStart?: boolean;
    timeout?: number;
    retryOnError?: boolean;
    maxRetries?: number;
    keepAlive?: boolean;
    keepAliveInterval?: number;
}

/** Transferable storage configuration */
export interface TransferableConfig {
    dbName: string;
    storeName?: string;
    version?: number;
    enableChangeTracking?: boolean;
    autoCleanupExpired?: boolean;
}

/** Transport capability flags */
export interface TransportCapabilities {
    transfer: boolean;
    binary: boolean;
    bidirectional: boolean;
    broadcast: boolean;
    persistent: boolean;
    ordered: boolean;
    reliable: boolean;
}

// ============================================================================
// HANDLER TYPES
// ============================================================================

/** Response function */
export type ResponderFn<T = any> = (result: T, transfer?: Transferable[]) => void;

/** Invoker handler */
export type InvokerHandler<T = ChannelMessage> = (
    data: T,
    respond: ResponderFn<T>,
    subscriber: Subscriber<T>
) => void | Promise<void>;

/** Message handler callback */
export type MessageHandler<T = ChannelMessage> = (
    data: T,
    respond: ResponderFn<T>
) => void | Promise<void>;

/** Send function */
export type SendFn<T = any> = (msg: T, transfer?: Transferable[]) => void;

// ============================================================================
// PENDING REQUEST
// ============================================================================

export interface PendingRequest<T = any> {
    resolve: (value: T) => void;
    reject: (error: Error) => void;
    timestamp: number;
}
