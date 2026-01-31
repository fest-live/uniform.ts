/**
 * Channel Context - Multi-Channel Support
 *
 * Provides a way to create multiple independent channel endpoints/ports
 * in the same context. Suitable for:
 * - Lazy-loaded components
 * - Multiple DOM components with isolated communication
 * - Micro-frontend architectures
 * - Component-level channel isolation
 */

import { UUIDv4, Promised, deepOperateAndClone, isPrimitive, isCanJustReturn, isCanTransfer } from "fest/core";
import {
    ChannelConnection,
    type ConnectionOptions,
    type TransportType,
    getConnectionPool,
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
    SelfTransport,
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
// TYPES
// ============================================================================

/** Supported transport types for dynamic channel creation */
export type DynamicTransportType =
    | "worker"
    | "shared-worker"
    | "service-worker"
    | "message-port"
    | "broadcast"
    | "websocket"
    | "rtc"
    | "self";

/** Configuration for dynamic transport creation */
export interface DynamicTransportConfig {
    /** Transport type */
    type: DynamicTransportType;
    /** Worker URL or instance */
    worker?: Worker | SharedWorker | URL | string;
    /** MessagePort instance */
    port?: MessagePort;
    /** BroadcastChannel name or instance */
    broadcast?: BroadcastChannel | string;
    /** WebSocket URL or instance */
    socket?: WebSocket | string;
    /** Additional options */
    options?: ConnectionOptions;
}

export interface ChannelContextOptions {
    /** Context name for identification */
    name?: string;
    /** Auto-connect channels on creation */
    autoConnect?: boolean;
    /** Default connection options for channels */
    defaultOptions?: ConnectionOptions;
    /** Enable isolated storage per context */
    isolatedStorage?: boolean;
    /** Use globalThis/self as default broadcast target */
    useGlobalSelf?: boolean;
}

export interface ChannelEndpoint {
    /** Channel name */
    name: string;
    /** Channel handler instance */
    handler: ChannelHandler;
    /** Channel connection */
    connection: ChannelConnection;
    /** Subscriptions for cleanup */
    subscriptions: Subscription[];
    /** Associated transport if any */
    transport?: TransportAdapter;
    /** Transport type */
    transportType?: DynamicTransportType;
    /** Ready promise */
    ready: Promise<RemoteChannelHelper | null>;
    /** Deferred initialization function */
    deferredInit?: () => Promise<RemoteChannelHelper | null>;
}

export interface RemoteChannelInfo {
    channel: string;
    context: ChannelContext;
    messageChannel?: MessageChannel;
    remote: Promise<RemoteChannelHelper>;
    transport?: Worker | BroadcastChannel | MessagePort | WebSocket;
    transportType?: DynamicTransportType;
}

// ============================================================================
// REMOTE CHANNEL HELPER
// ============================================================================

export class RemoteChannelHelper {
    private _connection: ChannelConnection;
    private _storage: ChannelStorage;

    constructor(
        private _channel: string,
        private _context: ChannelContext,
        private _options: ConnectionOptions = {}
    ) {
        this._connection = getConnection(_channel);
        this._storage = getChannelStorage(_channel);
    }

    async request(
        path: string[] | WReflectDescriptor,
        action: WReflectAction | any[],
        args: any[] | any,
        options: any = {}
    ): Promise<any> {
        let normalizedPath = typeof path === "string" ? [path] : path;
        let normalizedAction = action;
        let normalizedArgs = args;

        if (Array.isArray(action) && isReflectAction(path)) {
            options = args;
            normalizedArgs = action;
            normalizedAction = path as unknown as WReflectAction;
            normalizedPath = [];
        }

        const handler = this._context.getHost();
        return handler?.request(
            normalizedPath as string[],
            normalizedAction as WReflectAction,
            normalizedArgs,
            options,
            this._channel
        );
    }

    async doImportModule(url: string, options: any = {}): Promise<any> {
        return this.request([], WReflectAction.IMPORT, [url], options);
    }

    async deferMessage(payload: any, options: { priority?: number; expiresIn?: number } = {}): Promise<string> {
        return this._storage.defer({
            channel: this._channel,
            sender: this._context.hostName,
            type: "request",
            payload
        }, options);
    }

    async getPendingMessages(): Promise<any[]> {
        return this._storage.getDeferredMessages(this._channel, { status: "pending" });
    }

    get connection(): ChannelConnection { return this._connection; }
    get channelName(): string { return this._channel; }
    get context(): ChannelContext { return this._context; }
}

// ============================================================================
// CHANNEL HANDLER (Per-endpoint)
// ============================================================================

export class ChannelHandler {
    // @ts-ignore
    private _forResolves = new Map<string, PromiseWithResolvers<any>>();
    private _broadcasts: Record<string, Worker | BroadcastChannel | MessagePort> = {};
    private _subscriptions: Subscription[] = [];
    private _connection: ChannelConnection;

    constructor(
        private _channel: string,
        private _context: ChannelContext,
        private _options: ConnectionOptions = {}
    ) {
        this._connection = getConnectionPool().getOrCreate(_channel, "internal", _options);
    }

    createRemoteChannel(
        channel: string,
        options: ConnectionOptions = {},
        broadcast?: Worker | BroadcastChannel | MessagePort | null
    ): Promise<RemoteChannelHelper> {
        const $channel = this._context.$createOrUseExistingRemote(channel, options, broadcast ?? null);
        const msgPort = broadcast ?? $channel?.messageChannel?.port1;

        msgPort?.addEventListener?.('message', ((event: MessageEvent) => {
            if (event.data.type === "request" && event.data.channel === this._channel) {
                this.handleAndResponse(event.data.payload, event.data.reqId);
            } else if (event.data.type === "response") {
                this.resolveResponse(event.data.reqId, {
                    result: event.data.payload.result,
                    descriptor: event.data.payload.descriptor,
                    type: event.data.payload.type
                });
            }
        }) as EventListener);

        msgPort?.addEventListener?.('error', (event) => {
            console.error(event);
            (msgPort as any)?.close?.();
        });

        if (msgPort) this._broadcasts[channel] = msgPort;
        return $channel?.remote ?? Promise.resolve(null as any);
    }

    getChannel(): string { return this._channel; }
    get connection(): ChannelConnection { return this._connection; }

    request(
        path: string[] | WReflectAction,
        action: WReflectAction | any[],
        args: any[] | any,
        options: any | string = {},
        toChannel: string = "worker"
    ): Promise<any> | null {
        let normalizedPath = typeof path === "string" ? [path] : path;

        if (Array.isArray(action) && isReflectAction(path)) {
            toChannel = options as string;
            options = args;
            args = action;
            action = path as unknown as WReflectAction;
            normalizedPath = [];
        }

        const id = UUIDv4();
        // @ts-ignore
        this._forResolves.set(id, Promise.withResolvers<any>());

        this._broadcasts[toChannel]?.postMessage?.({
            channel: toChannel,
            sender: this._channel,
            type: "request",
            reqId: id,
            payload: { sender: this._channel, channel: toChannel, path: normalizedPath, action, args }
        });

        return this._forResolves.get(id)?.promise?.then?.((result) =>
            result?.result != null ? result.result : makeRequestProxy(result.descriptor, { channel: toChannel, ...options })
        ) ?? null;
    }

    resolveResponse(reqId: string, result: any): Promise<any> | undefined {
        this._forResolves.get(reqId)?.resolve?.(result);
        const promise = this._forResolves.get(reqId)?.promise;
        this._forResolves.delete(reqId);
        return promise;
    }

    async handleAndResponse(
        request: WReq,
        reqId: string,
        responseFn?: (result: any, transfer: any[]) => void
    ): Promise<void> {
        const { channel, sender, path, action, args } = request;
        if (channel !== this._channel) return;

        const obj = readByPath(path);
        const toTransfer: any[] = [];
        let result: any = null;
        let newPath = path;

        switch (action) {
            case "import":
                result = import(args?.[0]);
                break;
            case "transfer":
                if (isCanTransfer(obj) && channel !== sender) toTransfer.push(obj);
                result = obj;
                break;
            case "get": {
                const got = obj?.[args?.[0]];
                result = typeof got === "function" && obj != null ? got.bind(obj) : got;
                newPath = [...path, args?.[0]];
                break;
            }
            case "set":
                result = writeByPath([...path, args?.[0]], deepOperateAndClone(args?.[1], normalizeRef));
                break;
            case "apply":
            case "call":
                if (typeof obj === "function") {
                    const ctx = readByPath(path.slice(0, -1));
                    result = obj.apply(ctx, deepOperateAndClone(args?.[0], normalizeRef));
                    if (isCanTransfer(result) && path?.at(-1) === "transfer" && channel !== sender) {
                        toTransfer.push(result);
                    }
                }
                break;
            case "construct":
                if (typeof obj === "function") {
                    result = new obj(deepOperateAndClone(args?.[0], normalizeRef));
                }
                break;
            case "delete":
            case "deleteProperty":
            case "dispose":
                result = path?.length > 0 ? removeByPath(path) : removeByData(obj);
                if (result) newPath = registeredInPath.get(obj) ?? [];
                break;
            case "has":
                result = typeof obj === "object" && obj != null ? (path?.at(-1) ?? "") in obj : false;
                break;
            case "ownKeys":
                result = typeof obj === "object" && obj != null ? Object.keys(obj) : [];
                break;
        }

        result = await result;
        const canBeReturn = (isCanTransfer(result) && toTransfer.includes(result)) || isCanJustReturn(result);

        if (!canBeReturn && action !== "get" && (typeof result === "object" || typeof result === "function")) {
            if (hasNoPath(result)) {
                newPath = [UUIDv4()];
                writeByPath(newPath, result);
            } else {
                newPath = registeredInPath.get(result) ?? [];
            }
        }

        const ctx = readByPath(newPath);
        const ctxKey = action === "get" ? newPath?.at(-1) : undefined;
        const payload = deepOperateAndClone(result, (el) => objectToRef(el, this._channel, toTransfer)) ?? result;

        const response = {
            channel: sender,
            sender: this._channel,
            reqId,
            action,
            type: "response",
            payload: {
                result: canBeReturn ? payload : null,
                type: typeof result,
                channel: sender,
                sender: this._channel,
                descriptor: {
                    $isDescriptor: true,
                    path: newPath,
                    owner: this._channel,
                    channel,
                    primitive: isPrimitive(result),
                    writable: true,
                    enumerable: true,
                    configurable: true,
                    argumentCount: obj instanceof Function ? obj.length : -1,
                    ...(typeof ctx === "object" && ctx != null && ctxKey != null
                        ? Object.getOwnPropertyDescriptor(ctx, ctxKey)
                        : {})
                } as WReflectDescriptor<any>
            } as WResp<any>
        };

        const send = responseFn ?? this._broadcasts[sender]?.postMessage?.bind(this._broadcasts[sender]);
        send?.(response, toTransfer);
    }

    close(): void {
        this._subscriptions.forEach(s => s.unsubscribe());
        this._subscriptions = [];
        this._forResolves.clear();
        Object.values(this._broadcasts).forEach(b => (b as any)?.close?.());
        this._broadcasts = {};
    }
}

// ============================================================================
// CHANNEL CONTEXT
// ============================================================================

/**
 * Channel Context - Manages multiple channels in a single context
 *
 * Use this when you need multiple independent channels in the same
 * JavaScript context (same window, iframe, worker, etc.)
 *
 * Supports:
 * - Creating multiple channels at once or deferred
 * - Dynamic transport addition (workers, ports, sockets, etc.)
 * - Global self/globalThis as default target
 */
export class ChannelContext {
    private _id = UUIDv4();
    private _hostName: string;
    private _host: ChannelHandler | null = null;
    private _endpoints = new Map<string, ChannelEndpoint>();
    private _remoteChannels = new Map<string, RemoteChannelInfo>();
    private _deferredChannels = new Map<string, () => Promise<ChannelEndpoint>>();
    private _closed = false;
    private _globalSelf: typeof globalThis | null = null;

    constructor(private _options: ChannelContextOptions = {}) {
        this._hostName = _options.name ?? `ctx-${this._id.slice(0, 8)}`;

        // Initialize with globalThis/self if requested
        if (_options.useGlobalSelf !== false) {
            this._globalSelf = typeof globalThis !== "undefined" ? globalThis
                : typeof self !== "undefined" ? self
                : null;
        }
    }

    // ========================================================================
    // HOST MANAGEMENT
    // ========================================================================

    /**
     * Initialize/get the host channel for this context
     */
    initHost(name?: string): ChannelHandler {
        if (this._host && !name) return this._host;

        const hostName = name ?? this._hostName;
        this._hostName = hostName;

        if (this._endpoints.has(hostName)) {
            this._host = this._endpoints.get(hostName)!.handler;
            return this._host;
        }

        this._host = new ChannelHandler(hostName, this, this._options.defaultOptions);
        this._endpoints.set(hostName, {
            name: hostName,
            handler: this._host,
            connection: this._host.connection,
            subscriptions: [],
            ready: Promise.resolve(null)
        });

        return this._host;
    }

    /**
     * Get the host channel
     */
    getHost(): ChannelHandler | null {
        return this._host ?? this.initHost();
    }

    /**
     * Get host name
     */
    get hostName(): string {
        return this._hostName;
    }

    /**
     * Get context ID
     */
    get id(): string {
        return this._id;
    }

    // ========================================================================
    // MULTI-CHANNEL CREATION
    // ========================================================================

    /**
     * Create a new channel endpoint in this context
     *
     * @param name - Channel name
     * @param options - Connection options
     * @returns ChannelEndpoint with handler and connection
     */
    createChannel(name: string, options: ConnectionOptions = {}): ChannelEndpoint {
        if (this._endpoints.has(name)) {
            return this._endpoints.get(name)!;
        }

        const handler = new ChannelHandler(name, this, { ...this._options.defaultOptions, ...options });
        const endpoint: ChannelEndpoint = {
            name,
            handler,
            connection: handler.connection,
            subscriptions: [],
            ready: Promise.resolve(null)
        };

        this._endpoints.set(name, endpoint);
        return endpoint;
    }

    /**
     * Create multiple channel endpoints at once
     *
     * @param names - Array of channel names
     * @param options - Shared connection options
     * @returns Map of channel names to endpoints
     */
    createChannels(names: string[], options: ConnectionOptions = {}): Map<string, ChannelEndpoint> {
        const result = new Map<string, ChannelEndpoint>();
        for (const name of names) {
            result.set(name, this.createChannel(name, options));
        }
        return result;
    }

    /**
     * Get an existing channel endpoint
     */
    getChannel(name: string): ChannelEndpoint | undefined {
        return this._endpoints.get(name);
    }

    /**
     * Get or create a channel endpoint
     */
    getOrCreateChannel(name: string, options: ConnectionOptions = {}): ChannelEndpoint {
        return this._endpoints.get(name) ?? this.createChannel(name, options);
    }

    /**
     * Check if channel exists in this context
     */
    hasChannel(name: string): boolean {
        return this._endpoints.has(name);
    }

    /**
     * Get all channel names in this context
     */
    getChannelNames(): string[] {
        return [...this._endpoints.keys()];
    }

    /**
     * Get total number of channels
     */
    get size(): number {
        return this._endpoints.size;
    }

    // ========================================================================
    // DYNAMIC / DEFERRED CHANNEL CREATION
    // ========================================================================

    /**
     * Register a deferred channel that will be initialized on first use
     *
     * @param name - Channel name
     * @param initFn - Function to initialize the channel
     */
    defer(name: string, initFn: () => Promise<ChannelEndpoint>): void {
        this._deferredChannels.set(name, initFn);
    }

    /**
     * Initialize a previously deferred channel
     */
    async initDeferred(name: string): Promise<ChannelEndpoint | null> {
        const initFn = this._deferredChannels.get(name);
        if (!initFn) return null;

        const endpoint = await initFn();
        this._endpoints.set(name, endpoint);
        this._deferredChannels.delete(name);
        return endpoint;
    }

    /**
     * Check if channel is deferred (not yet initialized)
     */
    isDeferred(name: string): boolean {
        return this._deferredChannels.has(name);
    }

    /**
     * Get channel, initializing deferred if needed
     */
    async getChannelAsync(name: string): Promise<ChannelEndpoint | null> {
        if (this._endpoints.has(name)) {
            return this._endpoints.get(name)!;
        }
        if (this._deferredChannels.has(name)) {
            return this.initDeferred(name);
        }
        return null;
    }

    /**
     * Add a Worker channel dynamically
     *
     * @param name - Channel name
     * @param worker - Worker instance, URL, or code string
     * @param options - Connection options
     */
    async addWorker(
        name: string,
        worker: Worker | URL | string,
        options: ConnectionOptions = {}
    ): Promise<ChannelEndpoint> {
        const workerInstance = loadWorker(worker);
        if (!workerInstance) throw new Error(`Failed to create worker for channel: ${name}`);

        const handler = new ChannelHandler(name, this, { ...this._options.defaultOptions, ...options });

        const ready = handler.createRemoteChannel(name, options, workerInstance);

        const endpoint: ChannelEndpoint = {
            name,
            handler,
            connection: handler.connection,
            subscriptions: [],
            transportType: "worker",
            ready
        };

        this._endpoints.set(name, endpoint);

        // Store in remote channels too
        this._remoteChannels.set(name, {
            channel: name,
            context: this,
            remote: ready,
            transport: workerInstance,
            transportType: "worker"
        });

        return endpoint;
    }

    /**
     * Add a MessagePort channel dynamically
     *
     * @param name - Channel name
     * @param port - MessagePort instance
     * @param options - Connection options
     */
    async addPort(
        name: string,
        port: MessagePort,
        options: ConnectionOptions = {}
    ): Promise<ChannelEndpoint> {
        const handler = new ChannelHandler(name, this, { ...this._options.defaultOptions, ...options });
        port.start?.();

        const ready = handler.createRemoteChannel(name, options, port);

        const endpoint: ChannelEndpoint = {
            name,
            handler,
            connection: handler.connection,
            subscriptions: [],
            transportType: "message-port",
            ready
        };

        this._endpoints.set(name, endpoint);
        this._remoteChannels.set(name, {
            channel: name,
            context: this,
            remote: ready,
            transport: port,
            transportType: "message-port"
        });

        return endpoint;
    }

    /**
     * Add a BroadcastChannel dynamically
     *
     * @param name - Channel name (also used as BroadcastChannel name if not provided)
     * @param broadcastName - Optional BroadcastChannel name (defaults to channel name)
     * @param options - Connection options
     */
    async addBroadcast(
        name: string,
        broadcastName?: string,
        options: ConnectionOptions = {}
    ): Promise<ChannelEndpoint> {
        const bc = new BroadcastChannel(broadcastName ?? name);
        const handler = new ChannelHandler(name, this, { ...this._options.defaultOptions, ...options });

        const ready = handler.createRemoteChannel(name, options, bc);

        const endpoint: ChannelEndpoint = {
            name,
            handler,
            connection: handler.connection,
            subscriptions: [],
            transportType: "broadcast",
            ready
        };

        this._endpoints.set(name, endpoint);
        this._remoteChannels.set(name, {
            channel: name,
            context: this,
            remote: ready,
            transport: bc,
            transportType: "broadcast"
        });

        return endpoint;
    }

    /**
     * Add a channel using self/globalThis (for same-context communication)
     *
     * @param name - Channel name
     * @param options - Connection options
     */
    addSelfChannel(
        name: string,
        options: ConnectionOptions = {}
    ): ChannelEndpoint {
        const handler = new ChannelHandler(name, this, { ...this._options.defaultOptions, ...options });
        const selfTarget = this._globalSelf ?? (typeof self !== "undefined" ? self : null);

        const endpoint: ChannelEndpoint = {
            name,
            handler,
            connection: handler.connection,
            subscriptions: [],
            transportType: "self",
            ready: selfTarget ? handler.createRemoteChannel(name, options, selfTarget as any) : Promise.resolve(null)
        };

        this._endpoints.set(name, endpoint);
        return endpoint;
    }

    /**
     * Add channel with dynamic transport configuration
     *
     * @param name - Channel name
     * @param config - Transport configuration
     */
    async addTransport(
        name: string,
        config: DynamicTransportConfig
    ): Promise<ChannelEndpoint> {
        const options = config.options ?? {};

        switch (config.type) {
            case "worker":
                if (!config.worker) throw new Error("Worker required for worker transport");
                return this.addWorker(name, config.worker as Worker | URL | string, options);

            case "message-port":
                if (!config.port) throw new Error("Port required for message-port transport");
                return this.addPort(name, config.port, options);

            case "broadcast":
                const bcName = typeof config.broadcast === "string" ? config.broadcast : undefined;
                return this.addBroadcast(name, bcName, options);

            case "self":
                return this.addSelfChannel(name, options);

            default:
                // Fallback to basic channel
                return this.createChannel(name, options);
        }
    }

    /**
     * Create a MessageChannel pair for bidirectional communication
     *
     * @param name1 - First channel name
     * @param name2 - Second channel name
     * @returns Both endpoints connected via MessageChannel
     */
    createChannelPair(
        name1: string,
        name2: string,
        options: ConnectionOptions = {}
    ): { channel1: ChannelEndpoint; channel2: ChannelEndpoint; messageChannel: MessageChannel } {
        const mc = new MessageChannel();

        const handler1 = new ChannelHandler(name1, this, { ...this._options.defaultOptions, ...options });
        const handler2 = new ChannelHandler(name2, this, { ...this._options.defaultOptions, ...options });

        mc.port1.start();
        mc.port2.start();

        const ready1 = handler1.createRemoteChannel(name2, options, mc.port1);
        const ready2 = handler2.createRemoteChannel(name1, options, mc.port2);

        const channel1: ChannelEndpoint = {
            name: name1,
            handler: handler1,
            connection: handler1.connection,
            subscriptions: [],
            transportType: "message-port",
            ready: ready1
        };

        const channel2: ChannelEndpoint = {
            name: name2,
            handler: handler2,
            connection: handler2.connection,
            subscriptions: [],
            transportType: "message-port",
            ready: ready2
        };

        this._endpoints.set(name1, channel1);
        this._endpoints.set(name2, channel2);

        return { channel1, channel2, messageChannel: mc };
    }

    /**
     * Get the global self reference
     */
    get globalSelf(): typeof globalThis | null {
        return this._globalSelf;
    }

    // ========================================================================
    // REMOTE CHANNEL MANAGEMENT
    // ========================================================================

    /**
     * Connect to a remote channel (e.g., in a Worker)
     */
    async connectRemote(
        channelName: string,
        options: ConnectionOptions = {},
        broadcast?: Worker | BroadcastChannel | MessagePort | null
    ): Promise<RemoteChannelHelper> {
        this.initHost();
        return this._host!.createRemoteChannel(channelName, options, broadcast);
    }

    /**
     * Import a module in a remote channel
     */
    async importModuleInChannel(
        channelName: string,
        url: string,
        options: { channelOptions?: ConnectionOptions; importOptions?: any } = {},
        broadcast?: Worker | BroadcastChannel | MessagePort | null
    ): Promise<any> {
        const remote = await this.connectRemote(channelName, options.channelOptions, broadcast);
        return remote?.doImportModule?.(url, options.importOptions);
    }

    /**
     * Internal: Create or use existing remote channel
     */
    $createOrUseExistingRemote(
        channel: string,
        options: ConnectionOptions = {},
        broadcast: Worker | BroadcastChannel | MessagePort | null
    ): RemoteChannelInfo | null {
        if (channel == null || broadcast) return null;
        if (this._remoteChannels.has(channel)) return this._remoteChannels.get(channel)!;

        const msgChannel = new MessageChannel();
        const promise = Promised(new Promise<RemoteChannelHelper>((resolve) => {
            const worker = loadWorker(workerCode);

            worker?.addEventListener?.('message', (event: MessageEvent) => {
                if (event.data.type === "channelCreated") {
                    msgChannel.port1?.start?.();
                    resolve(new RemoteChannelHelper(event.data.channel, this, options));
                }
            });

            worker?.postMessage?.({
                type: "createChannel",
                channel,
                sender: this._hostName,
                options,
                messagePort: msgChannel.port2
            }, { transfer: [msgChannel.port2] });
        }));

        const info: RemoteChannelInfo = {
            channel,
            context: this,
            messageChannel: msgChannel,
            remote: promise
        };

        this._remoteChannels.set(channel, info);
        return info;
    }

    // ========================================================================
    // LIFECYCLE
    // ========================================================================

    /**
     * Close a specific channel
     */
    closeChannel(name: string): boolean {
        const endpoint = this._endpoints.get(name);
        if (!endpoint) return false;

        endpoint.subscriptions.forEach(s => s.unsubscribe());
        endpoint.handler.close();
        endpoint.transport?.detach();

        this._endpoints.delete(name);

        if (name === this._hostName) {
            this._host = null;
        }

        return true;
    }

    /**
     * Close all channels and cleanup
     */
    close(): void {
        if (this._closed) return;
        this._closed = true;

        for (const [name] of this._endpoints) {
            this.closeChannel(name);
        }

        this._remoteChannels.clear();
        this._host = null;
    }

    /**
     * Check if context is closed
     */
    get closed(): boolean {
        return this._closed;
    }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function isReflectAction(action: any): action is WReflectAction {
    return [...Object.values(WReflectAction)].includes(action);
}

function loadWorker(WX: any): Worker | null {
    if (WX instanceof Worker) return WX;
    if (WX instanceof URL) return new Worker(WX.href, { type: "module" });
    if (typeof WX === "function") {
        try { return new WX({ type: "module" }); }
        catch { return WX({ type: "module" }); }
    }
    if (typeof WX === "string") {
        if (WX.startsWith("/")) return new Worker(new URL(WX.replace(/^\//, "./"), import.meta.url).href, { type: "module" });
        if (URL.canParse(WX) || WX.startsWith("./")) return new Worker(new URL(WX, import.meta.url).href, { type: "module" });
        return new Worker(URL.createObjectURL(new Blob([WX], { type: "application/javascript" })), { type: "module" });
    }
    if (WX instanceof Blob || WX instanceof File) return new Worker(URL.createObjectURL(WX), { type: "module" });
    return WX ?? (typeof self !== "undefined" ? self : null) as unknown as Worker;
}

// ============================================================================
// FACTORY FUNCTIONS & GLOBAL CONTEXT
// ============================================================================

/** Global context registry for shared contexts */
const CONTEXT_REGISTRY = new Map<string, ChannelContext>();

/** Default global context (uses globalThis/self) */
let DEFAULT_CONTEXT: ChannelContext | null = null;

/**
 * Get the default global context
 *
 * This context is shared across the entire JavaScript context
 * and uses globalThis/self for communication by default.
 */
export function getDefaultContext(): ChannelContext {
    if (!DEFAULT_CONTEXT) {
        DEFAULT_CONTEXT = new ChannelContext({
            name: "$default$",
            useGlobalSelf: true
        });
        CONTEXT_REGISTRY.set("$default$", DEFAULT_CONTEXT);
    }
    return DEFAULT_CONTEXT;
}

/**
 * Create a new channel context
 *
 * Use this for isolated channel management in components
 */
export function createChannelContext(options: ChannelContextOptions = {}): ChannelContext {
    const ctx = new ChannelContext(options);
    if (options.name) {
        CONTEXT_REGISTRY.set(options.name, ctx);
    }
    return ctx;
}

/**
 * Get or create a named context (shared across components)
 */
export function getOrCreateContext(name: string, options: ChannelContextOptions = {}): ChannelContext {
    if (CONTEXT_REGISTRY.has(name)) {
        return CONTEXT_REGISTRY.get(name)!;
    }
    return createChannelContext({ ...options, name });
}

/**
 * Get an existing context by name
 */
export function getContext(name: string): ChannelContext | undefined {
    return CONTEXT_REGISTRY.get(name);
}

/**
 * Delete a context from the registry
 */
export function deleteContext(name: string): boolean {
    const ctx = CONTEXT_REGISTRY.get(name);
    if (ctx) {
        ctx.close();
        return CONTEXT_REGISTRY.delete(name);
    }
    return false;
}

/**
 * Get all registered context names
 */
export function getContextNames(): string[] {
    return [...CONTEXT_REGISTRY.keys()];
}

/**
 * Quick helper: Create channels in a new context
 *
 * @example
 * const { context, channels } = createChannelsInContext(["ui", "data", "api"]);
 */
export function createChannelsInContext(
    channelNames: string[],
    contextOptions: ChannelContextOptions = {}
): { context: ChannelContext; channels: Map<string, ChannelEndpoint> } {
    const context = createChannelContext(contextOptions);
    const channels = context.createChannels(channelNames);
    return { context, channels };
}

/**
 * Quick helper: Import module in a new context's channel
 *
 * @example
 * const { context, module } = await importModuleInContext("myChannel", "./worker-module.ts");
 */
export async function importModuleInContext(
    channelName: string,
    url: string,
    options: {
        contextOptions?: ChannelContextOptions;
        channelOptions?: ConnectionOptions;
        importOptions?: any;
    } = {}
): Promise<{ context: ChannelContext; module: any }> {
    const context = createChannelContext(options.contextOptions);
    const module = await context.importModuleInChannel(channelName, url, {
        channelOptions: options.channelOptions,
        importOptions: options.importOptions
    });
    return { context, module };
}

// ============================================================================
// DEFAULT CONTEXT SHORTCUTS
// ============================================================================

/**
 * Add a worker channel to the default global context
 *
 * @example
 * const endpoint = await addWorkerChannel("compute", new Worker("./worker.js"));
 */
export async function addWorkerChannel(
    name: string,
    worker: Worker | URL | string,
    options: ConnectionOptions = {}
): Promise<ChannelEndpoint> {
    return getDefaultContext().addWorker(name, worker, options);
}

/**
 * Add a MessagePort channel to the default global context
 *
 * @example
 * const endpoint = await addPortChannel("iframe-comm", port);
 */
export async function addPortChannel(
    name: string,
    port: MessagePort,
    options: ConnectionOptions = {}
): Promise<ChannelEndpoint> {
    return getDefaultContext().addPort(name, port, options);
}

/**
 * Add a BroadcastChannel to the default global context
 *
 * @example
 * const endpoint = await addBroadcastChannel("cross-tab");
 */
export async function addBroadcastChannel(
    name: string,
    broadcastName?: string,
    options: ConnectionOptions = {}
): Promise<ChannelEndpoint> {
    return getDefaultContext().addBroadcast(name, broadcastName, options);
}

/**
 * Add a self channel to the default global context
 *
 * @example
 * const endpoint = addSelfChannelToDefault("local");
 */
export function addSelfChannelToDefault(
    name: string,
    options: ConnectionOptions = {}
): ChannelEndpoint {
    return getDefaultContext().addSelfChannel(name, options);
}

/**
 * Register a deferred channel in the default context
 *
 * @example
 * deferChannel("heavy-worker", async () => {
 *     const worker = new Worker("./heavy.js");
 *     return getDefaultContext().addWorker("heavy-worker", worker);
 * });
 *
 * // Later, when needed:
 * const endpoint = await initDeferredChannel("heavy-worker");
 */
export function deferChannel(
    name: string,
    initFn: () => Promise<ChannelEndpoint>
): void {
    getDefaultContext().defer(name, initFn);
}

/**
 * Initialize a deferred channel in the default context
 */
export async function initDeferredChannel(name: string): Promise<ChannelEndpoint | null> {
    return getDefaultContext().initDeferred(name);
}

/**
 * Get channel from default context (initializing deferred if needed)
 */
export async function getChannelFromDefault(name: string): Promise<ChannelEndpoint | null> {
    return getDefaultContext().getChannelAsync(name);
}

/**
 * Create a MessageChannel pair in the default context
 *
 * @example
 * const { channel1, channel2 } = createDefaultChannelPair("ui", "worker-proxy");
 */
export function createDefaultChannelPair(
    name1: string,
    name2: string,
    options: ConnectionOptions = {}
) {
    return getDefaultContext().createChannelPair(name1, name2, options);
}
