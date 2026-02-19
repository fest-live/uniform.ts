/**
 * Service Worker Host Channel
 *
 * In PWA context, the Service Worker acts as a HOST that
 * components/views/modules connect TO.
 *
 * This is a REVERSE of the normal worker pattern:
 * - Normal: Main thread is host, Worker connects to it
 * - PWA SW: Service Worker is host, Clients connect to it
 *
 * The Service Worker hosts the channel and:
 * - Receives connections from clients (pages/components)
 * - Manages client registry
 * - Routes messages between clients
 * - Handles offline queueing via IndexedDB storage
 */

import { UUIDv4 } from "fest/core";
import {
    ChannelConnection,
    getConnectionPool,
    type ConnectionOptions
} from "../channel/Connection";
import {
    ChannelSubject,
    type ChannelMessage,
    type Subscription,
    filter
} from "../observable/Observable";
import { getChannelStorage, type ChannelStorage, type StoredMessage } from "../storage/Storage";

// ============================================================================
// TYPES
// ============================================================================

/** Client info tracked by SW host */
export interface SWClientInfo {
    id: string;
    type: "window" | "worker" | "sharedworker" | "all";
    url: string;
    visibilityState: "visible" | "hidden";
    focused: boolean;
    connectedAt: number;
    lastSeen: number;
    channels: Set<string>;
}

/** Message types for SW host protocol */
export type SWHostMessageType =
    | "connect"      // Client connects to SW host
    | "disconnect"   // Client disconnects
    | "subscribe"    // Client subscribes to a channel
    | "unsubscribe"  // Client unsubscribes from channel
    | "request"      // Standard request
    | "response"     // Standard response
    | "event"        // Broadcast event
    | "sync"         // Background sync
    | "push";        // Push notification data

/** SW host configuration */
export interface SWHostConfig {
    /** Channel name for this host */
    channelName: string;
    /** Enable message buffering for offline clients */
    enableOfflineQueue?: boolean;
    /** Maximum messages per client in offline queue */
    maxOfflineQueueSize?: number;
    /** Message TTL in milliseconds */
    messageTTL?: number;
    /** Enable automatic cleanup of stale clients */
    autoCleanup?: boolean;
    /** Cleanup interval in milliseconds */
    cleanupInterval?: number;
}

// ============================================================================
// SERVICE WORKER HOST
// ============================================================================

/**
 * ServiceWorkerHost - The host channel that runs inside Service Worker.
 *
 * Clients (pages, components) connect TO this host.
 * This is the reverse of normal worker pattern.
 */
export class ServiceWorkerHost {
    private _connection: ChannelConnection;
    private _storage: ChannelStorage;
    private _clients = new Map<string, SWClientInfo>();
    private _channelSubscribers = new Map<string, Set<string>>(); // channel -> client IDs
    private _subscriptions: Subscription[] = [];
    private _cleanupInterval: ReturnType<typeof setInterval> | null = null;

    // Observable streams for events
    private _clientEvents = new ChannelSubject<{
        type: "connected" | "disconnected" | "updated";
        client: SWClientInfo;
    }>();

    private _config: Required<SWHostConfig>;

    constructor(config: SWHostConfig) {
        this._config = {
            enableOfflineQueue: true,
            maxOfflineQueueSize: 100,
            messageTTL: 24 * 60 * 60 * 1000, // 24 hours
            autoCleanup: true,
            cleanupInterval: 60 * 1000, // 1 minute
            ...config
        };

        // Initialize connection as host
        this._connection = getConnectionPool().getOrCreate(
            this._config.channelName,
            "service-worker",
            { metadata: { isHost: true } }
        );

        // Initialize storage
        this._storage = getChannelStorage(this._config.channelName);

        this._setupMessageHandlers();

        if (this._config.autoCleanup) {
            this._startCleanupInterval();
        }
    }

    // ========================================================================
    // CLIENT MANAGEMENT
    // ========================================================================

    /**
     * Register a client connection
     */
    async registerClient(clientId: string, clientInfo: Partial<SWClientInfo> = {}): Promise<void> {
        const info: SWClientInfo = {
            id: clientId,
            type: clientInfo.type ?? "window",
            url: clientInfo.url ?? "",
            visibilityState: clientInfo.visibilityState ?? "visible",
            focused: clientInfo.focused ?? false,
            connectedAt: Date.now(),
            lastSeen: Date.now(),
            channels: new Set(clientInfo.channels ?? [])
        };

        this._clients.set(clientId, info);
        this._clientEvents.next({ type: "connected", client: info });

        // Deliver any queued messages
        await this._deliverQueuedMessages(clientId);
    }

    /**
     * Unregister a client
     */
    unregisterClient(clientId: string): void {
        const client = this._clients.get(clientId);
        if (client) {
            // Remove from all channel subscriptions
            for (const subscribers of this._channelSubscribers.values()) {
                subscribers.delete(clientId);
            }

            this._clients.delete(clientId);
            this._clientEvents.next({ type: "disconnected", client });
        }
    }

    /**
     * Update client info
     */
    updateClient(clientId: string, updates: Partial<SWClientInfo>): void {
        const client = this._clients.get(clientId);
        if (client) {
            Object.assign(client, updates, { lastSeen: Date.now() });
            this._clientEvents.next({ type: "updated", client });
        }
    }

    /**
     * Subscribe client to a channel
     */
    subscribeClientToChannel(clientId: string, channel: string): void {
        // Track in client info
        const client = this._clients.get(clientId);
        if (client) {
            client.channels.add(channel);
        }

        // Track in channel subscribers
        if (!this._channelSubscribers.has(channel)) {
            this._channelSubscribers.set(channel, new Set());
        }
        this._channelSubscribers.get(channel)!.add(clientId);
    }

    /**
     * Unsubscribe client from a channel
     */
    unsubscribeClientFromChannel(clientId: string, channel: string): void {
        const client = this._clients.get(clientId);
        if (client) {
            client.channels.delete(channel);
        }

        this._channelSubscribers.get(channel)?.delete(clientId);
    }

    /**
     * Get all connected clients
     */
    getClients(): Map<string, SWClientInfo> {
        return new Map(this._clients);
    }

    /**
     * Get clients subscribed to a channel
     */
    getChannelSubscribers(channel: string): Set<string> {
        return new Set(this._channelSubscribers.get(channel) ?? []);
    }

    // ========================================================================
    // MESSAGING
    // ========================================================================

    /**
     * Send message to specific client
     */
    async sendToClient(clientId: string, message: ChannelMessage): Promise<boolean> {
        const client = this._clients.get(clientId);

        if (!client) {
            // Client not connected, queue if enabled
            if (this._config.enableOfflineQueue) {
                await this._queueMessage(clientId, message);
            }
            return false;
        }

        return this._postToClient(clientId, message);
    }

    /**
     * Broadcast message to all clients subscribed to a channel
     */
    async broadcastToChannel(channel: string, message: ChannelMessage): Promise<number> {
        const subscribers = this._channelSubscribers.get(channel);
        if (!subscribers || subscribers.size === 0) {
            return 0;
        }

        let deliveredCount = 0;
        for (const clientId of subscribers) {
            const delivered = await this.sendToClient(clientId, message);
            if (delivered) deliveredCount++;
        }

        return deliveredCount;
    }

    /**
     * Broadcast to all connected clients
     */
    async broadcastToAll(message: ChannelMessage): Promise<number> {
        let deliveredCount = 0;

        for (const clientId of this._clients.keys()) {
            const delivered = await this.sendToClient(clientId, message);
            if (delivered) deliveredCount++;
        }

        return deliveredCount;
    }

    /**
     * Handle incoming message from client
     */
    async handleClientMessage(
        clientId: string,
        data: any
    ): Promise<void> {
        // Update last seen
        this.updateClient(clientId, { lastSeen: Date.now() });

        if (!data || typeof data !== "object") return;

        const messageType = data.type as SWHostMessageType;

        switch (messageType) {
            case "connect":
                await this.registerClient(clientId, data.payload);
                break;

            case "disconnect":
                this.unregisterClient(clientId);
                break;

            case "subscribe":
                this.subscribeClientToChannel(clientId, data.payload?.channel);
                break;

            case "unsubscribe":
                this.unsubscribeClientFromChannel(clientId, data.payload?.channel);
                break;

            case "request":
                // Handle request and send response
                const response = await this._handleRequest(data);
                if (response) {
                    await this.sendToClient(clientId, response);
                }
                break;

            case "event":
                // Forward event to appropriate channel
                if (data.channel) {
                    await this.broadcastToChannel(data.channel, data);
                }
                break;

            default:
                // Push to connection for other handlers
                this._connection.pushInbound({
                    ...data,
                    _clientId: clientId
                });
        }
    }

    // ========================================================================
    // SUBSCRIPTIONS
    // ========================================================================

    /**
     * Subscribe to client events
     */
    onClientEvent(
        handler: (event: { type: "connected" | "disconnected" | "updated"; client: SWClientInfo }) => void
    ): Subscription {
        return this._clientEvents.subscribe({ next: handler });
    }

    /**
     * Subscribe to messages from clients
     */
    onMessage(handler: (msg: ChannelMessage) => void): Subscription {
        return this._connection.subscribe(handler);
    }

    /**
     * Subscribe to messages of specific type
     */
    onMessageType(
        type: ChannelMessage["type"],
        handler: (msg: ChannelMessage) => void
    ): Subscription {
        return this._connection.onMessageType(type, handler);
    }

    // ========================================================================
    // OFFLINE QUEUE
    // ========================================================================

    /**
     * Queue message for offline client
     */
    private async _queueMessage(clientId: string, message: ChannelMessage): Promise<void> {
        await this._storage.defer(
            {
                channel: message.channel,
                sender: message.sender,
                type: message.type,
                payload: { ...message.payload, _targetClient: clientId }
            },
            {
                expiresIn: this._config.messageTTL,
                priority: 0,
                metadata: { targetClient: clientId }
            }
        );
    }

    /**
     * Deliver queued messages when client reconnects
     */
    private async _deliverQueuedMessages(clientId: string): Promise<void> {
        if (!this._config.enableOfflineQueue) return;

        const messages = await this._storage.getDeferredMessages(clientId, { status: "pending" });

        for (const stored of messages) {
            const message: ChannelMessage = {
                id: stored.id,
                channel: stored.channel,
                sender: stored.sender,
                type: stored.type as ChannelMessage["type"],
                payload: stored.payload,
                timestamp: stored.createdAt
            };

            const delivered = await this._postToClient(clientId, message);
            if (delivered) {
                await this._storage.markDelivered(stored.id);
            }
        }
    }

    // ========================================================================
    // LIFECYCLE
    // ========================================================================

    /**
     * Start the host (call in SW activate)
     */
    async start(): Promise<void> {
        await this._storage.open();
        this._connection.markConnected();

        // Cleanup expired messages
        await this._storage.cleanupExpired();
    }

    /**
     * Stop the host
     */
    stop(): void {
        if (this._cleanupInterval) {
            clearInterval(this._cleanupInterval);
            this._cleanupInterval = null;
        }

        for (const sub of this._subscriptions) {
            sub.unsubscribe();
        }
        this._subscriptions = [];

        this._connection.close();
        this._storage.close();
    }

    // ========================================================================
    // PRIVATE METHODS
    // ========================================================================

    private _setupMessageHandlers(): void {
        // Listen to incoming messages on connection
        const messageSub = this._connection.subscribe({
            next: (msg) => {
                // Route based on message type
                if (msg.type === "request") {
                    this._handleRequest(msg);
                }
            }
        });

        this._subscriptions.push(messageSub);
    }

    private async _handleRequest(msg: ChannelMessage): Promise<ChannelMessage | null> {
        // Generate response
        const response: ChannelMessage = {
            id: UUIDv4(),
            channel: msg.sender,
            sender: this._config.channelName,
            type: "response",
            reqId: msg.reqId,
            payload: {
                result: null,
                error: null
            },
            timestamp: Date.now()
        };

        try {
            // Handle based on payload action
            const action = msg.payload?.action;

            switch (action) {
                case "getClients":
                    response.payload.result = Array.from(this._clients.values()).map((c) => ({
                        ...c,
                        channels: Array.from(c.channels)
                    }));
                    break;

                case "getChannelInfo":
                    const channel = msg.payload?.channel;
                    response.payload.result = {
                        channel,
                        subscriberCount: this._channelSubscribers.get(channel)?.size ?? 0
                    };
                    break;

                case "ping":
                    response.payload.result = "pong";
                    break;

                default:
                    // Emit for custom handlers
                    this._connection.pushInbound(msg);
                    return null;
            }
        } catch (error) {
            response.payload.error = error instanceof Error ? error.message : String(error);
        }

        return response;
    }

    private async _postToClient(clientId: string, message: ChannelMessage): Promise<boolean> {
        // Service Worker specific: use clients API
        if (typeof clients === "undefined") return false;

        try {
            const client = await clients.get(clientId);
            if (client) {
                client.postMessage(message);
                return true;
            }
        } catch (e) {
            console.error("[SWHost] Failed to post to client:", e);
        }

        return false;
    }

    private _startCleanupInterval(): void {
        this._cleanupInterval = setInterval(() => {
            this._cleanupStaleClients();
            this._storage.cleanupExpired();
        }, this._config.cleanupInterval);
    }

    private async _cleanupStaleClients(): Promise<void> {
        if (typeof clients === "undefined") return;

        const allClients = await clients.matchAll({ includeUncontrolled: true });
        const activeIds = new Set(allClients.map((c) => c.id));

        // Remove clients that are no longer active
        for (const clientId of this._clients.keys()) {
            if (!activeIds.has(clientId)) {
                this.unregisterClient(clientId);
            }
        }
    }
}

// ============================================================================
// CLIENT CONNECTOR (for pages/components)
// ============================================================================

/**
 * ServiceWorkerClient - Connects a page/component TO the SW host.
 *
 * This is what runs in the main thread to connect to the SW host.
 */
export class ServiceWorkerClient {
    private _registration: ServiceWorkerRegistration | null = null;
    private _messageHandler: ((event: MessageEvent) => void) | null = null;
    private _subject = new ChannelSubject<ChannelMessage>();
    // @ts-ignore
    private _pendingRequests = new Map<string, PromiseWithResolvers<any>>();
    private _isConnected = false;

    constructor(private _channelName: string) {}

    /**
     * Connect to SW host
     */
    async connect(): Promise<void> {
        if (!("serviceWorker" in navigator)) {
            throw new Error("Service Worker not supported");
        }

        this._registration = await navigator.serviceWorker.ready;

        // Setup message listener
        this._messageHandler = (event: MessageEvent) => {
            const data = event.data;
            if (!data || typeof data !== "object") return;

            // Handle responses
            if (data.type === "response" && data.reqId) {
                const resolvers = this._pendingRequests.get(data.reqId);
                if (resolvers) {
                    this._pendingRequests.delete(data.reqId);
                    if (data.payload?.error) {
                        resolvers.reject(new Error(data.payload.error));
                    } else {
                        resolvers.resolve(data.payload?.result);
                    }
                    return;
                }
            }

            // Push to subject for subscribers
            this._subject.next(data as ChannelMessage);
        };

        navigator.serviceWorker.addEventListener("message", this._messageHandler);

        // Send connect message
        this._sendToSW({
            type: "connect",
            channel: this._channelName,
            payload: {
                url: location.href,
                visibilityState: document.visibilityState,
                focused: document.hasFocus()
            }
        });

        this._isConnected = true;

        // Track visibility changes
        document.addEventListener("visibilitychange", this._onVisibilityChange);
    }

    /**
     * Disconnect from SW host
     */
    disconnect(): void {
        if (this._messageHandler) {
            navigator.serviceWorker.removeEventListener("message", this._messageHandler);
            this._messageHandler = null;
        }

        this._sendToSW({
            type: "disconnect",
            channel: this._channelName
        });

        document.removeEventListener("visibilitychange", this._onVisibilityChange);
        this._isConnected = false;
    }

    /**
     * Subscribe to a channel
     */
    subscribeToChannel(channel: string): void {
        this._sendToSW({
            type: "subscribe",
            channel: this._channelName,
            payload: { channel }
        });
    }

    /**
     * Unsubscribe from a channel
     */
    unsubscribeFromChannel(channel: string): void {
        this._sendToSW({
            type: "unsubscribe",
            channel: this._channelName,
            payload: { channel }
        });
    }

    /**
     * Send request to SW host
     */
    async request<T = any>(action: string, payload: any = {}): Promise<T> {
        const reqId = UUIDv4();

        // @ts-ignore
        const resolvers = Promise.withResolvers<T>();
        this._pendingRequests.set(reqId, resolvers);

        this._sendToSW({
            id: UUIDv4(),
            type: "request",
            channel: this._channelName,
            sender: "client",
            reqId,
            payload: { action, ...payload },
            timestamp: Date.now()
        });

        // Timeout
        setTimeout(() => {
            if (this._pendingRequests.has(reqId)) {
                this._pendingRequests.delete(reqId);
                resolvers.reject(new Error("Request timeout"));
            }
        }, 30000);

        return resolvers.promise;
    }

    /**
     * Send event to SW host
     */
    emit(eventType: string, data: any, targetChannel?: string): void {
        this._sendToSW({
            id: UUIDv4(),
            type: "event",
            channel: targetChannel ?? this._channelName,
            sender: "client",
            payload: { type: eventType, data },
            timestamp: Date.now()
        });
    }

    /**
     * Subscribe to messages from SW host
     */
    subscribe(handler: (msg: ChannelMessage) => void): Subscription {
        return this._subject.subscribe({ next: handler });
    }

    /**
     * Subscribe to specific event type
     */
    on(eventType: string, handler: (data: any) => void): Subscription {
        return filter(
            this._subject,
            (m) => m.type === "event" && m.payload?.type === eventType
        ).subscribe({
            next: (msg) => handler(msg.payload?.data)
        });
    }

    /**
     * Check if connected
     */
    get isConnected(): boolean {
        return this._isConnected;
    }

    // ========================================================================
    // PRIVATE
    // ========================================================================

    private _sendToSW(message: any): void {
        if (!this._registration?.active) return;
        this._registration.active.postMessage(message);
    }

    private _onVisibilityChange = (): void => {
        if (!this._isConnected) return;

        this._sendToSW({
            type: "event",
            channel: this._channelName,
            payload: {
                type: "visibilityChange",
                data: {
                    visibilityState: document.visibilityState,
                    focused: document.hasFocus()
                }
            }
        });
    };
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Create SW host (call in service worker)
 */
export function createServiceWorkerHost(config: SWHostConfig): ServiceWorkerHost {
    return new ServiceWorkerHost(config);
}

/**
 * Create SW client (call in page/component)
 */
export function createServiceWorkerClient(channelName: string): ServiceWorkerClient {
    return new ServiceWorkerClient(channelName);
}
