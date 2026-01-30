/**
 * Observable-Based Channel Handler
 *
 * This module refactors the original Channels.ts to use
 * Observable-based internal API with subscribe/next pattern.
 *
 * Key changes:
 * - request() uses next() instead of postMessage()
 * - createRemoteChannel uses observable.subscribe()
 * - Channels are connections, not workers
 */

import { UUIDv4, Promised, deepOperateAndClone, isPrimitive, isCanJustReturn, isCanTransfer } from "fest/core";
import {
    ChannelConnection,
    type ConnectionOptions,
    type TransportType,
    getConnectionPool,
    getHostConnection,
    getConnection
} from "./Connection";
import {
    type ChannelMessage,
    type Subscription,
    ChannelSubject,
    filter
} from "../observable/Observable";
import {
    TransportAdapter,
    WorkerTransport,
    MessagePortTransport,
    BroadcastChannelTransport,
    ServiceWorkerTransport,
    SelfTransport,
    ChromeRuntimeTransport,
    TransportFactory
} from "../transport/Transport";
import { getChannelStorage, type ChannelStorage } from "../storage/Storage";
import { WReflectAction, type WReflectDescriptor, type WReq, type WResp } from "../types/Interface";
import { makeRequestProxy } from "./RequestProxy";
import {
    hasNoPath,
    readByPath,
    registeredInPath,
    removeByData,
    removeByPath,
    writeByPath,
    normalizeRef,
    objectToRef
} from "../storage/DataBase";

// Worker code - use direct URL (works in both Vite and non-Vite)
const workerCode: string | URL = new URL("../transport/Worker.ts", import.meta.url);

// ============================================================================
// CHANNEL STATE
// ============================================================================

/** Global self channel reference */
export const SELF_CHANNEL = {
    name: "unknown",
    instance: null as ObservableChannelHandler | null
};

/** Channel registry */
export const CHANNEL_MAP = new Map<string, ObservableChannelHandler>();

/** Remote channel helpers */
export const RemoteChannels = new Map<string, RemoteChannelInfo>();

interface RemoteChannelInfo {
    channel: string;
    instance: ObservableChannelHandler | null;
    connection: ChannelConnection;
    transport?: TransportAdapter;
    remote: Promise<RemoteChannelHelper>;
}

// ============================================================================
// REMOTE CHANNEL HELPER
// ============================================================================

/**
 * Helper for making requests to remote channels
 */
export class RemoteChannelHelper {
    private _connection: ChannelConnection;
    private _storage: ChannelStorage;

    constructor(
        private _channel: string,
        private _options: ConnectionOptions = {}
    ) {
        this._connection = getConnection(_channel);
        this._storage = getChannelStorage(_channel);
    }

    /**
     * Make request to remote channel
     */
    async request(
        path: string[] | WReflectDescriptor,
        action: WReflectAction | any[],
        args: any[] | any,
        options: any = {}
    ): Promise<any> {
        // Normalize arguments
        let normalizedPath = typeof path === "string" ? [path] : path;
        let normalizedAction = action;
        let normalizedArgs = args;

        if (Array.isArray(action) && isReflectAction(path)) {
            options = args;
            normalizedArgs = action;
            normalizedAction = path as unknown as WReflectAction;
            normalizedPath = [];
        }

        return SELF_CHANNEL.instance?.request(
            normalizedPath as string[],
            normalizedAction as WReflectAction,
            normalizedArgs,
            options,
            this._channel
        );
    }

    /**
     * Import module in remote channel
     */
    async doImportModule(url: string, options: any = {}): Promise<any> {
        return this.request([], WReflectAction.IMPORT, [url], options);
    }

    /**
     * Defer message for later delivery
     */
    async deferMessage(payload: any, options: { priority?: number; expiresIn?: number } = {}): Promise<string> {
        return this._storage.defer({
            channel: this._channel,
            sender: SELF_CHANNEL.name,
            type: "request",
            payload
        }, options);
    }

    /**
     * Get pending messages
     */
    async getPendingMessages(): Promise<any[]> {
        return this._storage.getDeferredMessages(this._channel, { status: "pending" });
    }

    /**
     * Get connection
     */
    get connection(): ChannelConnection {
        return this._connection;
    }

    /**
     * Get channel name
     */
    get channelName(): string {
        return this._channel;
    }
}

// ============================================================================
// OBSERVABLE CHANNEL HANDLER
// ============================================================================

/**
 * Observable-based channel handler
 *
 * Replaces postMessage/addEventListener with subscribe/next pattern
 */
export class ObservableChannelHandler {
    // Connection management
    private _connection: ChannelConnection;
    private _transports = new Map<string, TransportAdapter>();
    private _subscriptions: Subscription[] = [];

    // Request tracking (for backwards compatibility) // @ts-ignore
    private _forResolves = new Map<string, PromiseWithResolvers<any>>();

    // Storage
    private _storage: ChannelStorage;

    constructor(
        private _channel: string,
        private _options: ConnectionOptions = {}
    ) {
        this._channel ||= (SELF_CHANNEL.name = _channel);
        SELF_CHANNEL.instance = this;

        // Initialize connection
        this._connection = getConnectionPool().getOrCreate(
            _channel,
            "internal",
            _options
        );

        // Initialize storage
        this._storage = getChannelStorage(_channel);

        // Setup request handler
        this._setupRequestHandler();
    }

    // ========================================================================
    // OBSERVABLE API (subscribe/next pattern)
    // ========================================================================

    /**
     * Subscribe to incoming messages
     */
    subscribe(
        handler: (msg: ChannelMessage) => void,
        fromChannel?: string
    ): Subscription {
        return this._connection.subscribe(handler, fromChannel);
    }

    /**
     * Send message via next() - replaces postMessage
     */
    next(message: ChannelMessage): void {
        this._connection.next(message);
    }

    /**
     * Make request using Observable pattern
     * Uses next() instead of postMessage()
     */
    request(
        path: string[] | WReflectAction,
        action: WReflectAction | any[],
        args: any[] | any,
        options: any | string = {},
        toChannel: string = "worker"
    ): Promise<any> | null | undefined {
        // Normalize path
        let normalizedPath = typeof path === "string" ? [path] : path;

        // Shift arguments if action is array and path is reflect action
        if (Array.isArray(action) && isReflectAction(path)) {
            toChannel = options as string;
            options = args;
            args = action;
            action = path as unknown as WReflectAction;
            normalizedPath = [];
        }

        const id = UUIDv4(); // @ts-ignore
        this._forResolves.set(id, Promise.withResolvers<any>());

        // Create message and send via next() instead of postMessage
        const message: ChannelMessage = {
            id: UUIDv4(),
            channel: toChannel,
            sender: this._channel,
            type: "request",
            reqId: id,
            payload: {
                sender: this._channel,
                channel: toChannel,
                path: normalizedPath,
                action: action,
                args: args
            },
            timestamp: Date.now()
        };

        // Send via Observable next()
        this.next(message);

        // Handle response
        return this._forResolves.get(id)?.promise?.then?.((result) => {
            if (result?.result != undefined) {
                return result.result;
            }
            return makeRequestProxy(result.descriptor as WReflectDescriptor, {
                channel: toChannel,
                ...options
            });
        });
    }

    /**
     * Emit event (fire-and-forget)
     */
    emit(toChannel: string, eventType: string, data: any): void {
        this._connection.emit(toChannel, eventType, data);
    }

    // ========================================================================
    // CHANNEL MANAGEMENT
    // ========================================================================

    /**
     * Create remote channel connection using Observable.subscribe()
     */
    createRemoteChannel(
        channel: string,
        options: ConnectionOptions = {},
        broadcast?: Worker | BroadcastChannel | MessagePort | null
    ): Promise<RemoteChannelHelper> {
        // Create or get channel info
        const channelInfo = $createOrUseExistingChannel(channel, options, broadcast);

        if (!channelInfo) {
            return Promise.reject(new Error(`Failed to create channel: ${channel}`));
        }

        // Get transport
        let transport: TransportAdapter;

        if (broadcast instanceof Worker) {
            transport = new WorkerTransport(channel, broadcast, options);
        } else if (broadcast instanceof MessagePort) {
            transport = new MessagePortTransport(channel, broadcast, options);
        } else if (broadcast instanceof BroadcastChannel) {
            transport = new BroadcastChannelTransport(channel, undefined, options);
        } else if (broadcast != null && typeof self !== "undefined" && broadcast === (self as any)) {
            transport = new SelfTransport(channel, options);
        } else {
            // Default: create worker transport
            transport = new WorkerTransport(channel, workerCode, options);
        }

        // Store transport
        this._transports.set(channel, transport);

        // Attach transport (starts listening)
        transport.attach();

        // Subscribe to incoming messages from this channel
        const inboundSub = transport.connection.subscribe({
            next: (msg) => {
                if (msg.type === "request" && msg.channel === this._channel) {
                    this.handleAndResponse(msg.payload, msg.reqId!);
                } else if (msg.type === "response") {
                    this.resolveResponse(msg.reqId!, {
                        result: msg.payload?.result,
                        descriptor: msg.payload?.descriptor,
                        type: msg.payload?.type
                    });
                }
            },
            error: (err) => console.error("[Channel] Error:", err)
        });

        this._subscriptions.push(inboundSub);

        // Subscribe outbound to send via transport
        const outboundSub = this._connection.subscribeOutbound((msg) => {
            if (msg.channel === channel) {
                transport.connection.next(msg);
            }
        });

        this._subscriptions.push(outboundSub);

        return channelInfo.remote;
    }

    /**
     * Get channel name
     */
    getChannel(): string | null {
        return this._channel;
    }

    /**
     * Get connection
     */
    get connection(): ChannelConnection {
        return this._connection;
    }

    /**
     * Get storage
     */
    get storage(): ChannelStorage {
        return this._storage;
    }

    // ========================================================================
    // RESPONSE HANDLING
    // ========================================================================

    /**
     * Resolve a pending response
     */
    resolveResponse(reqId: string, result: any): Promise<any> | undefined {
        this._forResolves.get(reqId)?.resolve?.(result);
        const promise = this._forResolves.get(reqId)?.promise;
        this._forResolves.delete(reqId);
        return promise;
    }

    /**
     * Handle incoming request and send response
     */
    handleAndResponse(
        request: WReq,
        reqId: string,
        response: ((result: any, transfer?: any[]) => void) | null = null
    ): Promise<void> | undefined {
        let { channel, sender, path, action, args } = request;

        if (channel !== this._channel) return;

        const obj = readByPath(path);
        const toTransfer: any[] = [];

        let result: any = null;

        switch (action) {
            case "import":
                result = import(args?.[0]);
                break;

            case "transfer": {
                const $got = obj;
                if (isCanTransfer($got) && channel !== sender) {
                    toTransfer.push($got);
                }
                result = $got;
                break;
            }

            case "get": {
                const $ctx = obj;
                const $got = $ctx?.[args?.[0]];
                if (typeof $got === "function") {
                    result = $ctx != null ? $got?.bind?.($ctx) : $got;
                }
                path?.push?.(args?.[0]);
                result = $got;
                break;
            }

            case "set":
                result = writeByPath(
                    [...path, args?.[0]],
                    deepOperateAndClone(args?.[1], (el) => normalizeRef(el))
                );
                break;

            case "apply":
            case "call": {
                const $ctx = readByPath(path.slice(0, -1));
                if (typeof obj === "function" && obj != null) {
                    result = obj.apply?.(
                        $ctx,
                        deepOperateAndClone(args?.[0], (el) => normalizeRef(el))
                    );
                } else {
                    result = undefined;
                }

                if (isCanTransfer(result) && path?.at(-1) === "transfer" && channel !== sender) {
                    toTransfer.push(result);
                }
                break;
            }

            case "construct":
                if (typeof obj === "function" && obj != null) {
                    result = new obj(
                        deepOperateAndClone(args?.[0], (el) => normalizeRef(el))
                    );
                }
                break;

            case "delete":
            case "deleteProperty":
            case "dispose":
                result = path?.length > 0 ? removeByPath(path) : removeByData(obj);
                if (result) {
                    path = registeredInPath.get(obj) ?? [];
                }
                break;

            case "has":
                if ((typeof obj === "object" || typeof obj === "function") && obj != null) {
                    result = (path?.at(-1) ?? "") in obj;
                } else {
                    result = false;
                }
                break;

            case "ownKeys":
                if ((typeof obj === "object" || typeof obj === "function") && obj != null) {
                    result = Array.from(Object.keys(obj));
                } else {
                    result = [];
                }
                break;

            case "getOwnPropertyDescriptor":
            case "getPropertyDescriptor":
                if ((typeof obj === "object" || typeof obj === "function") && obj != null) {
                    result = Object.getOwnPropertyDescriptor(obj, path?.at(-1) ?? "");
                } else {
                    result = undefined;
                }
                break;

            case "getPrototypeOf":
                if ((typeof obj === "object" || typeof obj === "function") && obj != null) {
                    result = Object.getPrototypeOf(obj);
                } else {
                    result = null;
                }
                break;

            case "setPrototypeOf":
                if ((typeof obj === "object" || typeof obj === "function") && obj != null) {
                    result = Object.setPrototypeOf(obj, args?.[0]);
                } else {
                    result = false;
                }
                break;

            case "isExtensible":
                if ((typeof obj === "object" || typeof obj === "function") && obj != null) {
                    result = Object.isExtensible(obj);
                } else {
                    result = true;
                }
                break;

            case "preventExtensions":
                if ((typeof obj === "object" || typeof obj === "function") && obj != null) {
                    result = Object.preventExtensions(obj);
                } else {
                    result = false;
                }
                break;
        }

        // @ts-ignore
        return Promise.try(async () => {
            result = await result;

            const canBeReturn =
                (isCanTransfer(result) && toTransfer?.includes(result)) ||
                isCanJustReturn(result);

            // Generate new temp path if needed
            if (!canBeReturn && action !== "get" && (typeof result === "object" || typeof result === "function")) {
                if (hasNoPath(result)) {
                    path = [UUIDv4()];
                    writeByPath(path, result);
                } else {
                    path = registeredInPath.get(result) ?? [];
                }
            }

            const $ctx = readByPath(path);
            const $ctxKey = ["get"].includes(action as string) ? path?.at(-1) : undefined;

            result = deepOperateAndClone(result, (el) => objectToRef(el, this._channel, toTransfer)) ?? result;

            // Send response via Observable next() or callback
            const responseMessage: ChannelMessage = {
                id: UUIDv4(),
                channel: sender,
                sender: this._channel,
                reqId: reqId,
                type: "response",
                payload: {
                    result: canBeReturn ? result : null,
                    type: typeof result,
                    channel: sender,
                    sender: this._channel,
                    descriptor: {
                        $isDescriptor: true,
                        path: path,
                        owner: this._channel,
                        channel: channel,
                        primitive: isPrimitive(result),
                        writable: true,
                        enumerable: true,
                        configurable: true,
                        argumentCount: obj instanceof Function ? obj.length : -1,
                        ...((typeof $ctx === "object" || typeof $ctx === "function") &&
                        $ctx != null &&
                        $ctxKey != null
                            ? Object.getOwnPropertyDescriptor($ctx, $ctxKey)
                            : {})
                    } as WReflectDescriptor<any>
                } as unknown as WResp<any>,
                timestamp: Date.now(),
                transferable: toTransfer
            };

            if (response) {
                response(responseMessage, toTransfer);
            } else {
                // Find transport for sender and send
                const transport = this._transports.get(sender);
                if (transport) {
                    transport.connection.next(responseMessage);
                } else {
                    this._connection.next(responseMessage);
                }
            }
        });
    }

    // ========================================================================
    // LIFECYCLE
    // ========================================================================

    /**
     * Close all connections
     */
    close(): void {
        for (const sub of this._subscriptions) {
            sub.unsubscribe();
        }
        this._subscriptions = [];

        for (const transport of this._transports.values()) {
            transport.detach();
        }
        this._transports.clear();

        this._connection.close();
        this._storage.close();
    }

    // ========================================================================
    // PRIVATE
    // ========================================================================

    private _setupRequestHandler(): void {
        // Listen for incoming requests
        const requestSub = this._connection.onRequest((msg) => {
            this.handleAndResponse(msg.payload, msg.reqId!);
        });

        this._subscriptions.push(requestSub);
    }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if value is a reflect action
 */
function isReflectAction(action: any): action is WReflectAction {
    return [...Object.values(WReflectAction)].includes(action);
}

/**
 * Load worker from various sources
 */
export function loadWorker(WX: any): Worker | null {
    if (WX instanceof Worker) return WX;
    if (WX instanceof URL) return new Worker(WX.href, { type: "module" });
    if (typeof WX === "function") {
        try {
            return new WX({ type: "module" });
        } catch (e) {
            return WX({ type: "module" });
        }
    }
    if (typeof WX === "string") {
        if (WX.startsWith("/")) {
            return new Worker(
                new URL(WX?.replace(/^\//, "./"), import.meta.url)?.href,
                { type: "module" }
            );
        }
        if (URL.canParse(WX) || WX.startsWith("./")) {
            return new Worker(new URL(WX, import.meta.url).href, { type: "module" });
        }
        return new Worker(
            URL.createObjectURL(new Blob([WX], { type: "application/javascript" })),
            { type: "module" }
        );
    }
    if (WX instanceof Blob || WX instanceof File) {
        return new Worker(URL.createObjectURL(WX), { type: "module" });
    }
    return WX ? WX : typeof self !== "undefined" ? (self as unknown as Worker) : null;
}

/**
 * Create or use existing channel
 */
export function $createOrUseExistingChannel(
    channel: string,
    options: ConnectionOptions = {},
    broadcast?: Worker | BroadcastChannel | MessagePort | null
): RemoteChannelInfo | null {
    if (channel == null) return null;

    // Check existing
    if (RemoteChannels.has(channel)) {
        return RemoteChannels.get(channel)!;
    }

    // Create new channel
    const $channel = SELF_CHANNEL;
    const msgChannel = new MessageChannel();

    const promise = Promised(
        new Promise<RemoteChannelHelper>((resolve, reject) => {
            const worker = broadcast instanceof Worker ? broadcast : loadWorker(workerCode);

            worker?.addEventListener?.("message", (event: MessageEvent) => {
                if (event.data.type === "channelCreated") {
                    msgChannel?.port1?.start?.();
                    resolve(new RemoteChannelHelper(event.data.channel as string, options));
                }
            });

            worker?.postMessage?.(
                {
                    type: "createChannel",
                    channel: channel,
                    sender: SELF_CHANNEL?.name,
                    options: options,
                    messagePort: msgChannel?.port2
                },
                { transfer: [msgChannel?.port2] }
            );
        })
    );

    const connection = getConnection(channel, "worker", options);

    const info: RemoteChannelInfo = {
        channel: channel,
        instance: $channel?.instance,
        connection,
        remote: promise
    };

    RemoteChannels.set(channel, info);
    return info;
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Initialize channel handler
 */
export function initObservableChannelHandler(
    channel: string = "$host$"
): ObservableChannelHandler | null {
    if (SELF_CHANNEL?.instance && channel === "$host$") {
        return SELF_CHANNEL?.instance;
    }

    if (CHANNEL_MAP.has(channel)) {
        return CHANNEL_MAP.get(channel) ?? null;
    }

    const $channel = new ObservableChannelHandler(channel);

    if (channel === "$host$") {
        Object.assign(SELF_CHANNEL, {
            name: channel,
            instance: $channel
        });
    }

    // @ts-ignore
    return CHANNEL_MAP.getOrInsert?.(channel, $channel) ?? $channel;
}

/**
 * Create host channel
 */
export function createObservableHostChannel(channel: string = "$host$"): ObservableChannelHandler | null {
    return initObservableChannelHandler(channel ?? "$host$");
}

/**
 * Create or use existing channel
 */
export function createOrUseExistingObservableChannel(
    channel: string,
    options: ConnectionOptions = {},
    broadcast: Worker | BroadcastChannel | MessagePort | null = typeof self !== "undefined"
        ? (self as any)
        : null
): Promise<RemoteChannelHelper> | ObservableChannelHandler | null {
    const $host = createObservableHostChannel(channel ?? "$host$");
    return $host?.createRemoteChannel?.(channel, options, broadcast) ?? $host;
}
