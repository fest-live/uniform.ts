/**
 * Worker Entry Point - Multi-Channel Support
 *
 * This worker context supports:
 * - Multiple channel creation/initialization
 * - Observing new incoming channel connections
 * - Dynamic channel addition after initialization
 * - Connection from remote/host contexts
 */

import { UUIDv4 } from "fest/core";
import {
    ChannelContext,
    createChannelContext,
    type ChannelEndpoint,
    type ChannelContextOptions,
    type QueryConnectionsOptions,
    type ContextConnectionInfo
} from "../channel/ChannelContext";
import { ChannelSubject, type Subscription } from "../observable/Observable";

// ============================================================================
// TYPES
// ============================================================================

/** Incoming connection event */
export interface IncomingConnection {
    /** Connection ID */
    id: string;
    /** Channel name */
    channel: string;
    /** Sender context name */
    sender: string;
    /** Connection type */
    type: "channel" | "port" | "broadcast" | "socket";
    /** MessagePort if provided */
    port?: MessagePort;
    /** Timestamp */
    timestamp: number;
    /** Connection options */
    options?: any;
}

/** Channel created event */
export interface ChannelCreatedEvent {
    /** Channel name */
    channel: string;
    /** Endpoint reference */
    endpoint: ChannelEndpoint;
    /** Remote sender */
    sender: string;
    /** Timestamp */
    timestamp: number;
}

/** Worker context configuration */
export interface WorkerContextConfig extends ChannelContextOptions {
    /** Worker name/identifier */
    workerName?: string;
    /** Auto-accept incoming channels */
    autoAcceptChannels?: boolean;
    /** Channel whitelist (if set, only these channels are accepted) */
    allowedChannels?: string[];
    /** Maximum concurrent channels */
    maxChannels?: number;
}

// ============================================================================
// WORKER CONTEXT
// ============================================================================

/**
 * WorkerContext - Manages channels within a Worker
 *
 * Supports observing new incoming connections from host/remote contexts.
 */
export class WorkerContext {
    private _context: ChannelContext;
    private _config: Required<WorkerContextConfig>;
    private _subscriptions: Subscription[] = [];

    // Observable streams for incoming connections
    private _incomingConnections = new ChannelSubject<IncomingConnection>({ bufferSize: 100 });
    private _channelCreated = new ChannelSubject<ChannelCreatedEvent>({ bufferSize: 100 });
    private _channelClosed = new ChannelSubject<{ channel: string; timestamp: number }>();

    constructor(config: WorkerContextConfig = {}) {
        this._config = {
            name: config.name ?? "worker",
            workerName: config.workerName ?? `worker-${UUIDv4().slice(0, 8)}`,
            autoAcceptChannels: config.autoAcceptChannels ?? true,
            allowedChannels: config.allowedChannels ?? [],
            maxChannels: config.maxChannels ?? 100,
            autoConnect: config.autoConnect ?? true,
            useGlobalSelf: true,
            defaultOptions: config.defaultOptions ?? {},
            isolatedStorage: config.isolatedStorage ?? false,
            ...config
        };

        this._context = createChannelContext({
            name: this._config.name,
            useGlobalSelf: true,
            defaultOptions: config.defaultOptions
        });

        this._setupMessageListener();
    }

    // ========================================================================
    // INCOMING CONNECTION OBSERVABLES
    // ========================================================================

    /**
     * Observable: New incoming connection requests
     */
    get onConnection() {
        return this._incomingConnections;
    }

    /**
     * Observable: Channel created events
     */
    get onChannelCreated() {
        return this._channelCreated;
    }

    /**
     * Observable: Channel closed events
     */
    get onChannelClosed() {
        return this._channelClosed;
    }

    /**
     * Subscribe to incoming connections
     */
    subscribeConnections(
        handler: (conn: IncomingConnection) => void
    ): Subscription {
        return this._incomingConnections.subscribe(handler);
    }

    /**
     * Subscribe to channel creation
     */
    subscribeChannelCreated(
        handler: (event: ChannelCreatedEvent) => void
    ): Subscription {
        return this._channelCreated.subscribe(handler);
    }

    // ========================================================================
    // CHANNEL MANAGEMENT
    // ========================================================================

    /**
     * Accept an incoming connection and create the channel
     */
    acceptConnection(connection: IncomingConnection): ChannelEndpoint | null {
        if (!this._canAcceptChannel(connection.channel)) {
            return null;
        }

        const endpoint = this._context.createChannel(connection.channel, connection.options);

        // Setup remote connection
        if (connection.port) {
            connection.port.start?.();
            endpoint.handler.createRemoteChannel(
                connection.sender,
                connection.options,
                connection.port
            );
        }

        this._channelCreated.next({
            channel: connection.channel,
            endpoint,
            sender: connection.sender,
            timestamp: Date.now()
        });

        // Notify sender
        this._postChannelCreated(connection.channel, connection.sender, connection.id);

        return endpoint;
    }

    /**
     * Create a new channel in this worker context
     */
    createChannel(name: string, options?: any): ChannelEndpoint {
        return this._context.createChannel(name, options);
    }

    /**
     * Get an existing channel
     */
    getChannel(name: string): ChannelEndpoint | undefined {
        return this._context.getChannel(name);
    }

    /**
     * Check if channel exists
     */
    hasChannel(name: string): boolean {
        return this._context.hasChannel(name);
    }

    /**
     * Get all channel names
     */
    getChannelNames(): string[] {
        return this._context.getChannelNames();
    }

    /**
     * Query currently tracked channel connections in this worker.
     */
    queryConnections(query: QueryConnectionsOptions = {}): ContextConnectionInfo[] {
        return this._context.queryConnections(query);
    }

    /**
     * Notify active connections (useful for worker<->host sync).
     */
    notifyConnections(payload: any = {}, query: QueryConnectionsOptions = {}): number {
        return this._context.notifyConnections(payload, query);
    }

    /**
     * Close a specific channel
     */
    closeChannel(name: string): boolean {
        const closed = this._context.closeChannel(name);
        if (closed) {
            this._channelClosed.next({ channel: name, timestamp: Date.now() });
        }
        return closed;
    }

    /**
     * Get the underlying context
     */
    get context(): ChannelContext {
        return this._context;
    }

    /**
     * Get worker configuration
     */
    get config(): Readonly<Required<WorkerContextConfig>> {
        return this._config;
    }

    // ========================================================================
    // PRIVATE METHODS
    // ========================================================================

    private _setupMessageListener(): void {
        addEventListener("message", ((event: MessageEvent) => {
            this._handleIncomingMessage(event);
        }) as EventListener);
    }

    private _handleIncomingMessage(event: MessageEvent): void {
        const data = event.data;
        if (!data || typeof data !== "object") return;

        switch (data.type) {
            case "createChannel":
                this._handleCreateChannel(data);
                break;

            case "connectChannel":
                this._handleConnectChannel(data);
                break;

            case "addPort":
                this._handleAddPort(data);
                break;

            case "listChannels":
                this._handleListChannels(data);
                break;

            case "closeChannel":
                this._handleCloseChannel(data);
                break;

            case "ping":
                postMessage({ type: "pong", id: data.id, timestamp: Date.now() });
                break;

            default:
                // Pass to existing handler or log
                if (data.channel && this._context.hasChannel(data.channel)) {
                    // Route to specific channel
                    const endpoint = this._context.getChannel(data.channel);
                    endpoint?.handler?.handleAndResponse?.(data.payload, data.reqId);
                }
        }
    }

    private _handleCreateChannel(data: any): void {
        const connection: IncomingConnection = {
            id: data.reqId ?? UUIDv4(),
            channel: data.channel,
            sender: data.sender ?? "unknown",
            type: "channel",
            port: data.messagePort,
            timestamp: Date.now(),
            options: data.options
        };

        // Emit to observers
        this._incomingConnections.next(connection);

        // Auto-accept if configured
        if (this._config.autoAcceptChannels) {
            this.acceptConnection(connection);
        }
    }

    private _handleConnectChannel(data: any): void {
        const connection: IncomingConnection = {
            id: data.reqId ?? UUIDv4(),
            channel: data.channel,
            sender: data.sender ?? "unknown",
            type: data.portType ?? "channel",
            port: data.port,
            timestamp: Date.now(),
            options: data.options
        };

        this._incomingConnections.next(connection);

        if (this._config.autoAcceptChannels && this._canAcceptChannel(data.channel)) {
            // Connect to existing channel or create new
            const endpoint = this._context.getOrCreateChannel(data.channel, data.options);

            if (data.port) {
                data.port.start?.();
                endpoint.handler.createRemoteChannel(data.sender, data.options, data.port);
            }

            postMessage({
                type: "channelConnected",
                channel: data.channel,
                reqId: data.reqId
            });
        }
    }

    private _handleAddPort(data: any): void {
        if (!data.port || !data.channel) return;

        const connection: IncomingConnection = {
            id: data.reqId ?? UUIDv4(),
            channel: data.channel,
            sender: data.sender ?? "unknown",
            type: "port",
            port: data.port,
            timestamp: Date.now(),
            options: data.options
        };

        this._incomingConnections.next(connection);

        if (this._config.autoAcceptChannels) {
            this.acceptConnection(connection);
        }
    }

    private _handleListChannels(data: any): void {
        postMessage({
            type: "channelList",
            channels: this.getChannelNames(),
            reqId: data.reqId
        });
    }

    private _handleCloseChannel(data: any): void {
        if (data.channel) {
            this.closeChannel(data.channel);
            postMessage({
                type: "channelClosed",
                channel: data.channel,
                reqId: data.reqId
            });
        }
    }

    private _canAcceptChannel(channel: string): boolean {
        // Check max channels
        if (this._context.size >= this._config.maxChannels) {
            return false;
        }

        // Check whitelist
        if (this._config.allowedChannels.length > 0) {
            return this._config.allowedChannels.includes(channel);
        }

        return true;
    }

    private _postChannelCreated(channel: string, sender: string, reqId?: string): void {
        postMessage({
            type: "channelCreated",
            channel,
            sender,
            reqId,
            timestamp: Date.now()
        });
    }

    // ========================================================================
    // LIFECYCLE
    // ========================================================================

    close(): void {
        this._subscriptions.forEach(s => s.unsubscribe());
        this._subscriptions = [];
        this._incomingConnections.complete();
        this._channelCreated.complete();
        this._channelClosed.complete();
        this._context.close();
    }
}

// ============================================================================
// GLOBAL WORKER CONTEXT (Singleton)
// ============================================================================

let WORKER_CONTEXT: WorkerContext | null = null;

/**
 * Get or create the worker context singleton
 */
export function getWorkerContext(config?: WorkerContextConfig): WorkerContext {
    if (!WORKER_CONTEXT) {
        WORKER_CONTEXT = new WorkerContext(config);
    }
    return WORKER_CONTEXT;
}

/**
 * Initialize worker context with config
 */
export function initWorkerContext(config?: WorkerContextConfig): WorkerContext {
    WORKER_CONTEXT?.close();
    WORKER_CONTEXT = new WorkerContext(config);
    return WORKER_CONTEXT;
}

/**
 * Subscribe to incoming connections in the global worker context
 */
export function onWorkerConnection(
    handler: (conn: IncomingConnection) => void
): Subscription {
    return getWorkerContext().subscribeConnections(handler);
}

/**
 * Subscribe to channel creation in the global worker context
 */
export function onWorkerChannelCreated(
    handler: (event: ChannelCreatedEvent) => void
): Subscription {
    return getWorkerContext().subscribeChannelCreated(handler);
}

// ============================================================================
// INVOKER INTEGRATION
// ============================================================================

import {
    Responder,
    BidirectionalInvoker,
    createResponder,
    createInvoker,
    detectContextType,
    detectTransportType,
    type ContextType,
    type IncomingInvocation
} from "../proxy/Invoker";

let WORKER_RESPONDER: Responder | null = null;
let WORKER_INVOKER: BidirectionalInvoker | null = null;

/**
 * Get the worker's Responder (for handling incoming invocations)
 */
export function getWorkerResponder(channel?: string): Responder {
    if (!WORKER_RESPONDER) {
        WORKER_RESPONDER = createResponder(channel ?? "worker");
        WORKER_RESPONDER.listen(self);
    }
    return WORKER_RESPONDER;
}

/**
 * Get the worker's bidirectional Invoker
 */
export function getWorkerInvoker(channel?: string): BidirectionalInvoker {
    if (!WORKER_INVOKER) {
        WORKER_INVOKER = createInvoker(channel ?? "worker");
        WORKER_INVOKER.connect(self);
    }
    return WORKER_INVOKER;
}

/**
 * Expose an object for remote invocation from the worker
 */
export function exposeFromWorker(name: string, obj: any): void {
    getWorkerResponder().expose(name, obj);
}

/**
 * Subscribe to incoming invocations in the worker
 */
export function onWorkerInvocation(
    handler: (inv: IncomingInvocation) => void
): Subscription {
    return getWorkerResponder().subscribeInvocations(handler);
}

/**
 * Create a proxy to invoke methods on the host from the worker
 */
export function createHostProxy<T = any>(hostChannel: string = "host", basePath: string[] = []): T {
    return getWorkerInvoker().createProxy<T>(hostChannel, basePath);
}

/**
 * Import a module in the host context from the worker
 */
export function importInHost<T = any>(url: string, hostChannel: string = "host"): Promise<T> {
    return getWorkerInvoker().importModule<T>(hostChannel, url);
}

// Re-export detection utilities
export { detectContextType, detectTransportType };
export type { ContextType, IncomingInvocation };

// ============================================================================
// AUTO-INITIALIZE (Compatible with legacy usage)
// ============================================================================

// Initialize the worker context
const ctx = getWorkerContext({ name: "worker" });

// Export for direct access
export { ctx as workerContext };
