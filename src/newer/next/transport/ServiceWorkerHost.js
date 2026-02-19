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
import { getConnectionPool } from "../channel/Connection";
import { ChannelSubject, filter } from "../observable/Observable";
import { getChannelStorage } from "../storage/Storage";
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
    _connection;
    _storage;
    _clients = new Map();
    _channelSubscribers = new Map(); // channel -> client IDs
    _subscriptions = [];
    _cleanupInterval = null;
    // Observable streams for events
    _clientEvents = new ChannelSubject();
    _config;
    constructor(config) {
        this._config = {
            enableOfflineQueue: true,
            maxOfflineQueueSize: 100,
            messageTTL: 24 * 60 * 60 * 1000, // 24 hours
            autoCleanup: true,
            cleanupInterval: 60 * 1000, // 1 minute
            ...config
        };
        // Initialize connection as host
        this._connection = getConnectionPool().getOrCreate(this._config.channelName, "service-worker", { metadata: { isHost: true } });
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
    async registerClient(clientId, clientInfo = {}) {
        const info = {
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
    unregisterClient(clientId) {
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
    updateClient(clientId, updates) {
        const client = this._clients.get(clientId);
        if (client) {
            Object.assign(client, updates, { lastSeen: Date.now() });
            this._clientEvents.next({ type: "updated", client });
        }
    }
    /**
     * Subscribe client to a channel
     */
    subscribeClientToChannel(clientId, channel) {
        // Track in client info
        const client = this._clients.get(clientId);
        if (client) {
            client.channels.add(channel);
        }
        // Track in channel subscribers
        if (!this._channelSubscribers.has(channel)) {
            this._channelSubscribers.set(channel, new Set());
        }
        this._channelSubscribers.get(channel).add(clientId);
    }
    /**
     * Unsubscribe client from a channel
     */
    unsubscribeClientFromChannel(clientId, channel) {
        const client = this._clients.get(clientId);
        if (client) {
            client.channels.delete(channel);
        }
        this._channelSubscribers.get(channel)?.delete(clientId);
    }
    /**
     * Get all connected clients
     */
    getClients() {
        return new Map(this._clients);
    }
    /**
     * Get clients subscribed to a channel
     */
    getChannelSubscribers(channel) {
        return new Set(this._channelSubscribers.get(channel) ?? []);
    }
    // ========================================================================
    // MESSAGING
    // ========================================================================
    /**
     * Send message to specific client
     */
    async sendToClient(clientId, message) {
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
    async broadcastToChannel(channel, message) {
        const subscribers = this._channelSubscribers.get(channel);
        if (!subscribers || subscribers.size === 0) {
            return 0;
        }
        let deliveredCount = 0;
        for (const clientId of subscribers) {
            const delivered = await this.sendToClient(clientId, message);
            if (delivered)
                deliveredCount++;
        }
        return deliveredCount;
    }
    /**
     * Broadcast to all connected clients
     */
    async broadcastToAll(message) {
        let deliveredCount = 0;
        for (const clientId of this._clients.keys()) {
            const delivered = await this.sendToClient(clientId, message);
            if (delivered)
                deliveredCount++;
        }
        return deliveredCount;
    }
    /**
     * Handle incoming message from client
     */
    async handleClientMessage(clientId, data) {
        // Update last seen
        this.updateClient(clientId, { lastSeen: Date.now() });
        if (!data || typeof data !== "object")
            return;
        const messageType = data.type;
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
    onClientEvent(handler) {
        return this._clientEvents.subscribe({ next: handler });
    }
    /**
     * Subscribe to messages from clients
     */
    onMessage(handler) {
        return this._connection.subscribe(handler);
    }
    /**
     * Subscribe to messages of specific type
     */
    onMessageType(type, handler) {
        return this._connection.onMessageType(type, handler);
    }
    // ========================================================================
    // OFFLINE QUEUE
    // ========================================================================
    /**
     * Queue message for offline client
     */
    async _queueMessage(clientId, message) {
        await this._storage.defer({
            channel: message.channel,
            sender: message.sender,
            type: message.type,
            payload: { ...message.payload, _targetClient: clientId }
        }, {
            expiresIn: this._config.messageTTL,
            priority: 0,
            metadata: { targetClient: clientId }
        });
    }
    /**
     * Deliver queued messages when client reconnects
     */
    async _deliverQueuedMessages(clientId) {
        if (!this._config.enableOfflineQueue)
            return;
        const messages = await this._storage.getDeferredMessages(clientId, { status: "pending" });
        for (const stored of messages) {
            const message = {
                id: stored.id,
                channel: stored.channel,
                sender: stored.sender,
                type: stored.type,
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
    async start() {
        await this._storage.open();
        this._connection.markConnected();
        // Cleanup expired messages
        await this._storage.cleanupExpired();
    }
    /**
     * Stop the host
     */
    stop() {
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
    _setupMessageHandlers() {
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
    async _handleRequest(msg) {
        // Generate response
        const response = {
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
        }
        catch (error) {
            response.payload.error = error instanceof Error ? error.message : String(error);
        }
        return response;
    }
    async _postToClient(clientId, message) {
        // Service Worker specific: use clients API
        if (typeof clients === "undefined")
            return false;
        try {
            const client = await clients.get(clientId);
            if (client) {
                client.postMessage(message);
                return true;
            }
        }
        catch (e) {
            console.error("[SWHost] Failed to post to client:", e);
        }
        return false;
    }
    _startCleanupInterval() {
        this._cleanupInterval = setInterval(() => {
            this._cleanupStaleClients();
            this._storage.cleanupExpired();
        }, this._config.cleanupInterval);
    }
    async _cleanupStaleClients() {
        if (typeof clients === "undefined")
            return;
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
    _channelName;
    _registration = null;
    _messageHandler = null;
    _subject = new ChannelSubject();
    // @ts-ignore
    _pendingRequests = new Map();
    _isConnected = false;
    constructor(_channelName) {
        this._channelName = _channelName;
    }
    /**
     * Connect to SW host
     */
    async connect() {
        if (!("serviceWorker" in navigator)) {
            throw new Error("Service Worker not supported");
        }
        this._registration = await navigator.serviceWorker.ready;
        // Setup message listener
        this._messageHandler = (event) => {
            const data = event.data;
            if (!data || typeof data !== "object")
                return;
            // Handle responses
            if (data.type === "response" && data.reqId) {
                const resolvers = this._pendingRequests.get(data.reqId);
                if (resolvers) {
                    this._pendingRequests.delete(data.reqId);
                    if (data.payload?.error) {
                        resolvers.reject(new Error(data.payload.error));
                    }
                    else {
                        resolvers.resolve(data.payload?.result);
                    }
                    return;
                }
            }
            // Push to subject for subscribers
            this._subject.next(data);
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
    disconnect() {
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
    subscribeToChannel(channel) {
        this._sendToSW({
            type: "subscribe",
            channel: this._channelName,
            payload: { channel }
        });
    }
    /**
     * Unsubscribe from a channel
     */
    unsubscribeFromChannel(channel) {
        this._sendToSW({
            type: "unsubscribe",
            channel: this._channelName,
            payload: { channel }
        });
    }
    /**
     * Send request to SW host
     */
    async request(action, payload = {}) {
        const reqId = UUIDv4();
        // @ts-ignore
        const resolvers = Promise.withResolvers();
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
    emit(eventType, data, targetChannel) {
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
    subscribe(handler) {
        return this._subject.subscribe({ next: handler });
    }
    /**
     * Subscribe to specific event type
     */
    on(eventType, handler) {
        return filter(this._subject, (m) => m.type === "event" && m.payload?.type === eventType).subscribe({
            next: (msg) => handler(msg.payload?.data)
        });
    }
    /**
     * Check if connected
     */
    get isConnected() {
        return this._isConnected;
    }
    // ========================================================================
    // PRIVATE
    // ========================================================================
    _sendToSW(message) {
        if (!this._registration?.active)
            return;
        this._registration.active.postMessage(message);
    }
    _onVisibilityChange = () => {
        if (!this._isConnected)
            return;
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
export function createServiceWorkerHost(config) {
    return new ServiceWorkerHost(config);
}
/**
 * Create SW client (call in page/component)
 */
export function createServiceWorkerClient(channelName) {
    return new ServiceWorkerClient(channelName);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiU2VydmljZVdvcmtlckhvc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJTZXJ2aWNlV29ya2VySG9zdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7Ozs7Ozs7O0dBZUc7QUFFSCxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sV0FBVyxDQUFDO0FBQ25DLE9BQU8sRUFFSCxpQkFBaUIsRUFFcEIsTUFBTSx1QkFBdUIsQ0FBQztBQUMvQixPQUFPLEVBQ0gsY0FBYyxFQUdkLE1BQU0sRUFDVCxNQUFNLDBCQUEwQixDQUFDO0FBQ2xDLE9BQU8sRUFBRSxpQkFBaUIsRUFBMkMsTUFBTSxvQkFBb0IsQ0FBQztBQThDaEcsK0VBQStFO0FBQy9FLHNCQUFzQjtBQUN0QiwrRUFBK0U7QUFFL0U7Ozs7O0dBS0c7QUFDSCxNQUFNLE9BQU8saUJBQWlCO0lBQ2xCLFdBQVcsQ0FBb0I7SUFDL0IsUUFBUSxDQUFpQjtJQUN6QixRQUFRLEdBQUcsSUFBSSxHQUFHLEVBQXdCLENBQUM7SUFDM0MsbUJBQW1CLEdBQUcsSUFBSSxHQUFHLEVBQXVCLENBQUMsQ0FBQyx3QkFBd0I7SUFDOUUsY0FBYyxHQUFtQixFQUFFLENBQUM7SUFDcEMsZ0JBQWdCLEdBQTBDLElBQUksQ0FBQztJQUV2RSxnQ0FBZ0M7SUFDeEIsYUFBYSxHQUFHLElBQUksY0FBYyxFQUd0QyxDQUFDO0lBRUcsT0FBTyxDQUF5QjtJQUV4QyxZQUFZLE1BQW9CO1FBQzVCLElBQUksQ0FBQyxPQUFPLEdBQUc7WUFDWCxrQkFBa0IsRUFBRSxJQUFJO1lBQ3hCLG1CQUFtQixFQUFFLEdBQUc7WUFDeEIsVUFBVSxFQUFFLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLElBQUksRUFBRSxXQUFXO1lBQzVDLFdBQVcsRUFBRSxJQUFJO1lBQ2pCLGVBQWUsRUFBRSxFQUFFLEdBQUcsSUFBSSxFQUFFLFdBQVc7WUFDdkMsR0FBRyxNQUFNO1NBQ1osQ0FBQztRQUVGLGdDQUFnQztRQUNo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Iiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBTZXJ2aWNlIFdvcmtlciBIb3N0IENoYW5uZWxcbiAqXG4gKiBJbiBQV0EgY29udGV4dCwgdGhlIFNlcnZpY2UgV29ya2VyIGFjdHMgYXMgYSBIT1NUIHRoYXRcbiAqIGNvbXBvbmVudHMvdmlld3MvbW9kdWxlcyBjb25uZWN0IFRPLlxuICpcbiAqIFRoaXMgaXMgYSBSRVZFUlNFIG9mIHRoZSBub3JtYWwgd29ya2VyIHBhdHRlcm46XG4gKiAtIE5vcm1hbDogTWFpbiB0aHJlYWQgaXMgaG9zdCwgV29ya2VyIGNvbm5lY3RzIHRvIGl0XG4gKiAtIFBXQSBTVzogU2VydmljZSBXb3JrZXIgaXMgaG9zdCwgQ2xpZW50cyBjb25uZWN0IHRvIGl0XG4gKlxuICogVGhlIFNlcnZpY2UgV29ya2VyIGhvc3RzIHRoZSBjaGFubmVsIGFuZDpcbiAqIC0gUmVjZWl2ZXMgY29ubmVjdGlvbnMgZnJvbSBjbGllbnRzIChwYWdlcy9jb21wb25lbnRzKVxuICogLSBNYW5hZ2VzIGNsaWVudCByZWdpc3RyeVxuICogLSBSb3V0ZXMgbWVzc2FnZXMgYmV0d2VlbiBjbGllbnRzXG4gKiAtIEhhbmRsZXMgb2ZmbGluZSBxdWV1ZWluZyB2aWEgSW5kZXhlZERCIHN0b3JhZ2VcbiAqL1xuXG5pbXBvcnQgeyBVVUlEdjQgfSBmcm9tIFwiZmVzdC9jb3JlXCI7XG5pbXBvcnQge1xuICAgIENoYW5uZWxDb25uZWN0aW9uLFxuICAgIGdldENvbm5lY3Rpb25Qb29sLFxuICAgIHR5cGUgQ29ubmVjdGlvbk9wdGlvbnNcbn0gZnJvbSBcIi4uL2NoYW5uZWwvQ29ubmVjdGlvblwiO1xuaW1wb3J0IHtcbiAgICBDaGFubmVsU3ViamVjdCxcbiAgICB0eXBlIENoYW5uZWxNZXNzYWdlLFxuICAgIHR5cGUgU3Vic2NyaXB0aW9uLFxuICAgIGZpbHRlclxufSBmcm9tIFwiLi4vb2JzZXJ2YWJsZS9PYnNlcnZhYmxlXCI7XG5pbXBvcnQgeyBnZXRDaGFubmVsU3RvcmFnZSwgdHlwZSBDaGFubmVsU3RvcmFnZSwgdHlwZSBTdG9yZWRNZXNzYWdlIH0gZnJvbSBcIi4uL3N0b3JhZ2UvU3RvcmFnZVwiO1xuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBUWVBFU1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKiogQ2xpZW50IGluZm8gdHJhY2tlZCBieSBTVyBob3N0ICovXG5leHBvcnQgaW50ZXJmYWNlIFNXQ2xpZW50SW5mbyB7XG4gICAgaWQ6IHN0cmluZztcbiAgICB0eXBlOiBcIndpbmRvd1wiIHwgXCJ3b3JrZXJcIiB8IFwic2hhcmVkd29ya2VyXCIgfCBcImFsbFwiO1xuICAgIHVybDogc3RyaW5nO1xuICAgIHZpc2liaWxpdHlTdGF0ZTogXCJ2aXNpYmxlXCIgfCBcImhpZGRlblwiO1xuICAgIGZvY3VzZWQ6IGJvb2xlYW47XG4gICAgY29ubmVjdGVkQXQ6IG51bWJlcjtcbiAgICBsYXN0U2VlbjogbnVtYmVyO1xuICAgIGNoYW5uZWxzOiBTZXQ8c3RyaW5nPjtcbn1cblxuLyoqIE1lc3NhZ2UgdHlwZXMgZm9yIFNXIGhvc3QgcHJvdG9jb2wgKi9cbmV4cG9ydCB0eXBlIFNXSG9zdE1lc3NhZ2VUeXBlID1cbiAgICB8IFwiY29ubmVjdFwiICAgICAgLy8gQ2xpZW50IGNvbm5lY3RzIHRvIFNXIGhvc3RcbiAgICB8IFwiZGlzY29ubmVjdFwiICAgLy8gQ2xpZW50IGRpc2Nvbm5lY3RzXG4gICAgfCBcInN1YnNjcmliZVwiICAgIC8vIENsaWVudCBzdWJzY3JpYmVzIHRvIGEgY2hhbm5lbFxuICAgIHwgXCJ1bnN1YnNjcmliZVwiICAvLyBDbGllbnQgdW5zdWJzY3JpYmVzIGZyb20gY2hhbm5lbFxuICAgIHwgXCJyZXF1ZXN0XCIgICAgICAvLyBTdGFuZGFyZCByZXF1ZXN0XG4gICAgfCBcInJlc3BvbnNlXCIgICAgIC8vIFN0YW5kYXJkIHJlc3BvbnNlXG4gICAgfCBcImV2ZW50XCIgICAgICAgIC8vIEJyb2FkY2FzdCBldmVudFxuICAgIHwgXCJzeW5jXCIgICAgICAgICAvLyBCYWNrZ3JvdW5kIHN5bmNcbiAgICB8IFwicHVzaFwiOyAgICAgICAgLy8gUHVzaCBub3RpZmljYXRpb24gZGF0YVxuXG4vKiogU1cgaG9zdCBjb25maWd1cmF0aW9uICovXG5leHBvcnQgaW50ZXJmYWNlIFNXSG9zdENvbmZpZyB7XG4gICAgLyoqIENoYW5uZWwgbmFtZSBmb3IgdGhpcyBob3N0ICovXG4gICAgY2hhbm5lbE5hbWU6IHN0cmluZztcbiAgICAvKiogRW5hYmxlIG1lc3NhZ2UgYnVmZmVyaW5nIGZvciBvZmZsaW5lIGNsaWVudHMgKi9cbiAgICBlbmFibGVPZmZsaW5lUXVldWU/OiBib29sZWFuO1xuICAgIC8qKiBNYXhpbXVtIG1lc3NhZ2VzIHBlciBjbGllbnQgaW4gb2ZmbGluZSBxdWV1ZSAqL1xuICAgIG1heE9mZmxpbmVRdWV1ZVNpemU/OiBudW1iZXI7XG4gICAgLyoqIE1lc3NhZ2UgVFRMIGluIG1pbGxpc2Vjb25kcyAqL1xuICAgIG1lc3NhZ2VUVEw/OiBudW1iZXI7XG4gICAgLyoqIEVuYWJsZSBhdXRvbWF0aWMgY2xlYW51cCBvZiBzdGFsZSBjbGllbnRzICovXG4gICAgYXV0b0NsZWFudXA/OiBib29sZWFuO1xuICAgIC8qKiBDbGVhbnVwIGludGVydmFsIGluIG1pbGxpc2Vjb25kcyAqL1xuICAgIGNsZWFudXBJbnRlcnZhbD86IG51bWJlcjtcbn1cblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gU0VSVklDRSBXT1JLRVIgSE9TVFxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIFNlcnZpY2VXb3JrZXJIb3N0IC0gVGhlIGhvc3QgY2hhbm5lbCB0aGF0IHJ1bnMgaW5zaWRlIFNlcnZpY2UgV29ya2VyLlxuICpcbiAqIENsaWVudHMgKHBhZ2VzLCBjb21wb25lbnRzKSBjb25uZWN0IFRPIHRoaXMgaG9zdC5cbiAqIFRoaXMgaXMgdGhlIHJldmVyc2Ugb2Ygbm9ybWFsIHdvcmtlciBwYXR0ZXJuLlxuICovXG5leHBvcnQgY2xhc3MgU2VydmljZVdvcmtlckhvc3Qge1xuICAgIHByaXZhdGUgX2Nvbm5lY3Rpb246IENoYW5uZWxDb25uZWN0aW9uO1xuICAgIHByaXZhdGUgX3N0b3JhZ2U6IENoYW5uZWxTdG9yYWdlO1xuICAgIHByaXZhdGUgX2NsaWVudHMgPSBuZXcgTWFwPHN0cmluZywgU1dDbGllbnRJbmZvPigpO1xuICAgIHByaXZhdGUgX2NoYW5uZWxTdWJzY3JpYmVycyA9IG5ldyBNYXA8c3RyaW5nLCBTZXQ8c3RyaW5nPj4oKTsgLy8gY2hhbm5lbCAtPiBjbGllbnQgSURzXG4gICAgcHJpdmF0ZSBfc3Vic2NyaXB0aW9uczogU3Vic2NyaXB0aW9uW10gPSBbXTtcbiAgICBwcml2YXRlIF9jbGVhbnVwSW50ZXJ2YWw6IFJldHVyblR5cGU8dHlwZW9mIHNldEludGVydmFsPiB8IG51bGwgPSBudWxsO1xuXG4gICAgLy8gT2JzZXJ2YWJsZSBzdHJlYW1zIGZvciBldmVudHNcbiAgICBwcml2YXRlIF9jbGllbnRFdmVudHMgPSBuZXcgQ2hhbm5lbFN1YmplY3Q8e1xuICAgICAgICB0eXBlOiBcImNvbm5lY3RlZFwiIHwgXCJkaXNjb25uZWN0ZWRcIiB8IFwidXBkYXRlZFwiO1xuICAgICAgICBjbGllbnQ6IFNXQ2xpZW50SW5mbztcbiAgICB9PigpO1xuXG4gICAgcHJpdmF0ZSBfY29uZmlnOiBSZXF1aXJlZDxTV0hvc3RDb25maWc+O1xuXG4gICAgY29uc3RydWN0b3IoY29uZmlnOiBTV0hvc3RDb25maWcpIHtcbiAgICAgICAgdGhpcy5fY29uZmlnID0ge1xuICAgICAgICAgICAgZW5hYmxlT2ZmbGluZVF1ZXVlOiB0cnVlLFxuICAgICAgICAgICAgbWF4T2ZmbGluZVF1ZXVlU2l6ZTogMTAwLFxuICAgICAgICAgICAgbWVzc2FnZVRUTDogMjQgKiA2MCAqIDYwICogMTAwMCwgLy8gMjQgaG91cnNcbiAgICAgICAgICAgIGF1dG9DbGVhbnVwOiB0cnVlLFxuICAgICAgICAgICAgY2xlYW51cEludGVydmFsOiA2MCAqIDEwMDAsIC8vIDEgbWludXRlXG4gICAgICAgICAgICAuLi5jb25maWdcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIGNvbm5lY3Rpb24gYXMgaG9zdFxuICAgICAgICB0aGlzLl9jb25uZWN0aW9uID0gZ2V0Q29ubmVjdGlvblBvb2woKS5nZXRPckNyZWF0ZShcbiAgICAgICAgICAgIHRoaXMuX2NvbmZpZy5jaGFubmVsTmFtZSxcbiAgICAgICAgICAgIFwic2VydmljZS13b3JrZXJcIixcbiAgICAgICAgICAgIHsgbWV0YWRhdGE6IHsgaXNIb3N0OiB0cnVlIH0gfVxuICAgICAgICApO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgc3RvcmFnZVxuICAgICAgICB0aGlzLl9zdG9yYWdlID0gZ2V0Q2hhbm5lbFN0b3JhZ2UodGhpcy5fY29uZmlnLmNoYW5uZWxOYW1lKTtcblxuICAgICAgICB0aGlzLl9zZXR1cE1lc3NhZ2VIYW5kbGVycygpO1xuXG4gICAgICAgIGlmICh0aGlzLl9jb25maWcuYXV0b0NsZWFudXApIHtcbiAgICAgICAgICAgIHRoaXMuX3N0YXJ0Q2xlYW51cEludGVydmFsKCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAvLyBDTElFTlQgTUFOQUdFTUVOVFxuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4gICAgLyoqXG4gICAgICogUmVnaXN0ZXIgYSBjbGllbnQgY29ubmVjdGlvblxuICAgICAqL1xuICAgIGFzeW5jIHJlZ2lzdGVyQ2xpZW50KGNsaWVudElkOiBzdHJpbmcsIGNsaWVudEluZm86IFBhcnRpYWw8U1dDbGllbnRJbmZvPiA9IHt9KTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGNvbnN0IGluZm86IFNXQ2xpZW50SW5mbyA9IHtcbiAgICAgICAgICAgIGlkOiBjbGllbnRJZCxcbiAgICAgICAgICAgIHR5cGU6IGNsaWVudEluZm8udHlwZSA/PyBcIndpbmRvd1wiLFxuICAgICAgICAgICAgdXJsOiBjbGllbnRJbmZvLnVybCA/PyBcIlwiLFxuICAgICAgICAgICAgdmlzaWJpbGl0eVN0YXRlOiBjbGllbnRJbmZvLnZpc2liaWxpdHlTdGF0ZSA/PyBcInZpc2libGVcIixcbiAgICAgICAgICAgIGZvY3VzZWQ6IGNsaWVudEluZm8uZm9jdXNlZCA/PyBmYWxzZSxcbiAgICAgICAgICAgIGNvbm5lY3RlZEF0OiBEYXRlLm5vdygpLFxuICAgICAgICAgICAgbGFzdFNlZW46IERhdGUubm93KCksXG4gICAgICAgICAgICBjaGFubmVsczogbmV3IFNldChjbGllbnRJbmZvLmNoYW5uZWxzID8/IFtdKVxuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMuX2NsaWVudHMuc2V0KGNsaWVudElkLCBpbmZvKTtcbiAgICAgICAgdGhpcy5fY2xpZW50RXZlbnRzLm5leHQoeyB0eXBlOiBcImNvbm5lY3RlZFwiLCBjbGllbnQ6IGluZm8gfSk7XG5cbiAgICAgICAgLy8gRGVsaXZlciBhbnkgcXVldWVkIG1lc3NhZ2VzXG4gICAgICAgIGF3YWl0IHRoaXMuX2RlbGl2ZXJRdWV1ZWRNZXNzYWdlcyhjbGllbnRJZCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVW5yZWdpc3RlciBhIGNsaWVudFxuICAgICAqL1xuICAgIHVucmVnaXN0ZXJDbGllbnQoY2xpZW50SWQ6IHN0cmluZyk6IHZvaWQge1xuICAgICAgICBjb25zdCBjbGllbnQgPSB0aGlzLl9jbGllbnRzLmdldChjbGllbnRJZCk7XG4gICAgICAgIGlmIChjbGllbnQpIHtcbiAgICAgICAgICAgIC8vIFJlbW92ZSBmcm9tIGFsbCBjaGFubmVsIHN1YnNjcmlwdGlvbnNcbiAgICAgICAgICAgIGZvciAoY29uc3Qgc3Vic2NyaWJlcnMgb2YgdGhpcy5fY2hhbm5lbFN1YnNjcmliZXJzLnZhbHVlcygpKSB7XG4gICAgICAgICAgICAgICAgc3Vic2NyaWJlcnMuZGVsZXRlKGNsaWVudElkKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdGhpcy5fY2xpZW50cy5kZWxldGUoY2xpZW50SWQpO1xuICAgICAgICAgICAgdGhpcy5fY2xpZW50RXZlbnRzLm5leHQoeyB0eXBlOiBcImRpc2Nvbm5lY3RlZFwiLCBjbGllbnQgfSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgY2xpZW50IGluZm9cbiAgICAgKi9cbiAgICB1cGRhdGVDbGllbnQoY2xpZW50SWQ6IHN0cmluZywgdXBkYXRlczogUGFydGlhbDxTV0NsaWVudEluZm8+KTogdm9pZCB7XG4gICAgICAgIGNvbnN0IGNsaWVudCA9IHRoaXMuX2NsaWVudHMuZ2V0KGNsaWVudElkKTtcbiAgICAgICAgaWYgKGNsaWVudCkge1xuICAgICAgICAgICAgT2JqZWN0LmFzc2lnbihjbGllbnQsIHVwZGF0ZXMsIHsgbGFzdFNlZW46IERhdGUubm93KCkgfSk7XG4gICAgICAgICAgICB0aGlzLl9jbGllbnRFdmVudHMubmV4dCh7IHR5cGU6IFwidXBkYXRlZFwiLCBjbGllbnQgfSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBTdWJzY3JpYmUgY2xpZW50IHRvIGEgY2hhbm5lbFxuICAgICAqL1xuICAgIHN1YnNjcmliZUNsaWVudFRvQ2hhbm5lbChjbGllbnRJZDogc3RyaW5nLCBjaGFubmVsOiBzdHJpbmcpOiB2b2lkIHtcbiAgICAgICAgLy8gVHJhY2sgaW4gY2xpZW50IGluZm9cbiAgICAgICAgY29uc3QgY2xpZW50ID0gdGhpcy5fY2xpZW50cy5nZXQoY2xpZW50SWQpO1xuICAgICAgICBpZiAoY2xpZW50KSB7XG4gICAgICAgICAgICBjbGllbnQuY2hhbm5lbHMuYWRkKGNoYW5uZWwpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVHJhY2sgaW4gY2hhbm5lbCBzdWJzY3JpYmVyc1xuICAgICAgICBpZiAoIXRoaXMuX2NoYW5uZWxTdWJzY3JpYmVycy5oYXMoY2hhbm5lbCkpIHtcbiAgICAgICAgICAgIHRoaXMuX2NoYW5uZWxTdWJzY3JpYmVycy5zZXQoY2hhbm5lbCwgbmV3IFNldCgpKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLl9jaGFubmVsU3Vic2NyaWJlcnMuZ2V0KGNoYW5uZWwpIS5hZGQoY2xpZW50SWQpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFVuc3Vic2NyaWJlIGNsaWVudCBmcm9tIGEgY2hhbm5lbFxuICAgICAqL1xuICAgIHVuc3Vic2NyaWJlQ2xpZW50RnJvbUNoYW5uZWwoY2xpZW50SWQ6IHN0cmluZywgY2hhbm5lbDogc3RyaW5nKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IGNsaWVudCA9IHRoaXMuX2NsaWVudHMuZ2V0KGNsaWVudElkKTtcbiAgICAgICAgaWYgKGNsaWVudCkge1xuICAgICAgICAgICAgY2xpZW50LmNoYW5uZWxzLmRlbGV0ZShjaGFubmVsKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuX2NoYW5uZWxTdWJzY3JpYmVycy5nZXQoY2hhbm5lbCk/LmRlbGV0ZShjbGllbnRJZCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IGFsbCBjb25uZWN0ZWQgY2xpZW50c1xuICAgICAqL1xuICAgIGdldENsaWVudHMoKTogTWFwPHN0cmluZywgU1dDbGllbnRJbmZvPiB7XG4gICAgICAgIHJldHVybiBuZXcgTWFwKHRoaXMuX2NsaWVudHMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBjbGllbnRzIHN1YnNjcmliZWQgdG8gYSBjaGFubmVsXG4gICAgICovXG4gICAgZ2V0Q2hhbm5lbFN1YnNjcmliZXJzKGNoYW5uZWw6IHN0cmluZyk6IFNldDxzdHJpbmc+IHtcbiAgICAgICAgcmV0dXJuIG5ldyBTZXQodGhpcy5fY2hhbm5lbFN1YnNjcmliZXJzLmdldChjaGFubmVsKSA/PyBbXSk7XG4gICAgfVxuXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgLy8gTUVTU0FHSU5HXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbiAgICAvKipcbiAgICAgKiBTZW5kIG1lc3NhZ2UgdG8gc3BlY2lmaWMgY2xpZW50XG4gICAgICovXG4gICAgYXN5bmMgc2VuZFRvQ2xpZW50KGNsaWVudElkOiBzdHJpbmcsIG1lc3NhZ2U6IENoYW5uZWxNZXNzYWdlKTogUHJvbWlzZTxib29sZWFuPiB7XG4gICAgICAgIGNvbnN0IGNsaWVudCA9IHRoaXMuX2NsaWVudHMuZ2V0KGNsaWVudElkKTtcblxuICAgICAgICBpZiAoIWNsaWVudCkge1xuICAgICAgICAgICAgLy8gQ2xpZW50IG5vdCBjb25uZWN0ZWQsIHF1ZXVlIGlmIGVuYWJsZWRcbiAgICAgICAgICAgIGlmICh0aGlzLl9jb25maWcuZW5hYmxlT2ZmbGluZVF1ZXVlKSB7XG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5fcXVldWVNZXNzYWdlKGNsaWVudElkLCBtZXNzYWdlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGlzLl9wb3N0VG9DbGllbnQoY2xpZW50SWQsIG1lc3NhZ2UpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEJyb2FkY2FzdCBtZXNzYWdlIHRvIGFsbCBjbGllbnRzIHN1YnNjcmliZWQgdG8gYSBjaGFubmVsXG4gICAgICovXG4gICAgYXN5bmMgYnJvYWRjYXN0VG9DaGFubmVsKGNoYW5uZWw6IHN0cmluZywgbWVzc2FnZTogQ2hhbm5lbE1lc3NhZ2UpOiBQcm9taXNlPG51bWJlcj4ge1xuICAgICAgICBjb25zdCBzdWJzY3JpYmVycyA9IHRoaXMuX2NoYW5uZWxTdWJzY3JpYmVycy5nZXQoY2hhbm5lbCk7XG4gICAgICAgIGlmICghc3Vic2NyaWJlcnMgfHwgc3Vic2NyaWJlcnMuc2l6ZSA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgZGVsaXZlcmVkQ291bnQgPSAwO1xuICAgICAgICBmb3IgKGNvbnN0IGNsaWVudElkIG9mIHN1YnNjcmliZXJzKSB7XG4gICAgICAgICAgICBjb25zdCBkZWxpdmVyZWQgPSBhd2FpdCB0aGlzLnNlbmRUb0NsaWVudChjbGllbnRJZCwgbWVzc2FnZSk7XG4gICAgICAgICAgICBpZiAoZGVsaXZlcmVkKSBkZWxpdmVyZWRDb3VudCsrO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGRlbGl2ZXJlZENvdW50O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEJyb2FkY2FzdCB0byBhbGwgY29ubmVjdGVkIGNsaWVudHNcbiAgICAgKi9cbiAgICBhc3luYyBicm9hZGNhc3RUb0FsbChtZXNzYWdlOiBDaGFubmVsTWVzc2FnZSk6IFByb21pc2U8bnVtYmVyPiB7XG4gICAgICAgIGxldCBkZWxpdmVyZWRDb3VudCA9IDA7XG5cbiAgICAgICAgZm9yIChjb25zdCBjbGllbnRJZCBvZiB0aGlzLl9jbGllbnRzLmtleXMoKSkge1xuICAgICAgICAgICAgY29uc3QgZGVsaXZlcmVkID0gYXdhaXQgdGhpcy5zZW5kVG9DbGllbnQoY2xpZW50SWQsIG1lc3NhZ2UpO1xuICAgICAgICAgICAgaWYgKGRlbGl2ZXJlZCkgZGVsaXZlcmVkQ291bnQrKztcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBkZWxpdmVyZWRDb3VudDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBIYW5kbGUgaW5jb21pbmcgbWVzc2FnZSBmcm9tIGNsaWVudFxuICAgICAqL1xuICAgIGFzeW5jIGhhbmRsZUNsaWVudE1lc3NhZ2UoXG4gICAgICAgIGNsaWVudElkOiBzdHJpbmcsXG4gICAgICAgIGRhdGE6IGFueVxuICAgICk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICAvLyBVcGRhdGUgbGFzdCBzZWVuXG4gICAgICAgIHRoaXMudXBkYXRlQ2xpZW50KGNsaWVudElkLCB7IGxhc3RTZWVuOiBEYXRlLm5vdygpIH0pO1xuXG4gICAgICAgIGlmICghZGF0YSB8fCB0eXBlb2YgZGF0YSAhPT0gXCJvYmplY3RcIikgcmV0dXJuO1xuXG4gICAgICAgIGNvbnN0IG1lc3NhZ2VUeXBlID0gZGF0YS50eXBlIGFzIFNXSG9zdE1lc3NhZ2VUeXBlO1xuXG4gICAgICAgIHN3aXRjaCAobWVzc2FnZVR5cGUpIHtcbiAgICAgICAgICAgIGNhc2UgXCJjb25uZWN0XCI6XG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5yZWdpc3RlckNsaWVudChjbGllbnRJZCwgZGF0YS5wYXlsb2FkKTtcbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgY2FzZSBcImRpc2Nvbm5lY3RcIjpcbiAgICAgICAgICAgICAgICB0aGlzLnVucmVnaXN0ZXJDbGllbnQoY2xpZW50SWQpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICBjYXNlIFwic3Vic2NyaWJlXCI6XG4gICAgICAgICAgICAgICAgdGhpcy5zdWJzY3JpYmVDbGllbnRUb0NoYW5uZWwoY2xpZW50SWQsIGRhdGEucGF5bG9hZD8uY2hhbm5lbCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIGNhc2UgXCJ1bnN1YnNjcmliZVwiOlxuICAgICAgICAgICAgICAgIHRoaXMudW5zdWJzY3JpYmVDbGllbnRGcm9tQ2hhbm5lbChjbGllbnRJZCwgZGF0YS5wYXlsb2FkPy5jaGFubmVsKTtcbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgY2FzZSBcInJlcXVlc3RcIjpcbiAgICAgICAgICAgICAgICAvLyBIYW5kbGUgcmVxdWVzdCBhbmQgc2VuZCByZXNwb25zZVxuICAgICAgICAgICAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgdGhpcy5faGFuZGxlUmVxdWVzdChkYXRhKTtcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5zZW5kVG9DbGllbnQoY2xpZW50SWQsIHJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIGNhc2UgXCJldmVudFwiOlxuICAgICAgICAgICAgICAgIC8vIEZvcndhcmQgZXZlbnQgdG8gYXBwcm9wcmlhdGUgY2hhbm5lbFxuICAgICAgICAgICAgICAgIGlmIChkYXRhLmNoYW5uZWwpIHtcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5icm9hZGNhc3RUb0NoYW5uZWwoZGF0YS5jaGFubmVsLCBkYXRhKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgLy8gUHVzaCB0byBjb25uZWN0aW9uIGZvciBvdGhlciBoYW5kbGVyc1xuICAgICAgICAgICAgICAgIHRoaXMuX2Nvbm5lY3Rpb24ucHVzaEluYm91bmQoe1xuICAgICAgICAgICAgICAgICAgICAuLi5kYXRhLFxuICAgICAgICAgICAgICAgICAgICBfY2xpZW50SWQ6IGNsaWVudElkXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAvLyBTVUJTQ1JJUFRJT05TXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbiAgICAvKipcbiAgICAgKiBTdWJzY3JpYmUgdG8gY2xpZW50IGV2ZW50c1xuICAgICAqL1xuICAgIG9uQ2xpZW50RXZlbnQoXG4gICAgICAgIGhhbmRsZXI6IChldmVudDogeyB0eXBlOiBcImNvbm5lY3RlZFwiIHwgXCJkaXNjb25uZWN0ZWRcIiB8IFwidXBkYXRlZFwiOyBjbGllbnQ6IFNXQ2xpZW50SW5mbyB9KSA9PiB2b2lkXG4gICAgKTogU3Vic2NyaXB0aW9uIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2NsaWVudEV2ZW50cy5zdWJzY3JpYmUoeyBuZXh0OiBoYW5kbGVyIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFN1YnNjcmliZSB0byBtZXNzYWdlcyBmcm9tIGNsaWVudHNcbiAgICAgKi9cbiAgICBvbk1lc3NhZ2UoaGFuZGxlcjogKG1zZzogQ2hhbm5lbE1lc3NhZ2UpID0+IHZvaWQpOiBTdWJzY3JpcHRpb24ge1xuICAgICAgICByZXR1cm4gdGhpcy5fY29ubmVjdGlvbi5zdWJzY3JpYmUoaGFuZGxlcik7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogU3Vic2NyaWJlIHRvIG1lc3NhZ2VzIG9mIHNwZWNpZmljIHR5cGVcbiAgICAgKi9cbiAgICBvbk1lc3NhZ2VUeXBlKFxuICAgICAgICB0eXBlOiBDaGFubmVsTWVzc2FnZVtcInR5cGVcIl0sXG4gICAgICAgIGhhbmRsZXI6IChtc2c6IENoYW5uZWxNZXNzYWdlKSA9PiB2b2lkXG4gICAgKTogU3Vic2NyaXB0aW9uIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2Nvbm5lY3Rpb24ub25NZXNzYWdlVHlwZSh0eXBlLCBoYW5kbGVyKTtcbiAgICB9XG5cbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAvLyBPRkZMSU5FIFFVRVVFXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbiAgICAvKipcbiAgICAgKiBRdWV1ZSBtZXNzYWdlIGZvciBvZmZsaW5lIGNsaWVudFxuICAgICAqL1xuICAgIHByaXZhdGUgYXN5bmMgX3F1ZXVlTWVzc2FnZShjbGllbnRJZDogc3RyaW5nLCBtZXNzYWdlOiBDaGFubmVsTWVzc2FnZSk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBhd2FpdCB0aGlzLl9zdG9yYWdlLmRlZmVyKFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGNoYW5uZWw6IG1lc3NhZ2UuY2hhbm5lbCxcbiAgICAgICAgICAgICAgICBzZW5kZXI6IG1lc3NhZ2Uuc2VuZGVyLFxuICAgICAgICAgICAgICAgIHR5cGU6IG1lc3NhZ2UudHlwZSxcbiAgICAgICAgICAgICAgICBwYXlsb2FkOiB7IC4uLm1lc3NhZ2UucGF5bG9hZCwgX3RhcmdldENsaWVudDogY2xpZW50SWQgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBleHBpcmVzSW46IHRoaXMuX2NvbmZpZy5tZXNzYWdlVFRMLFxuICAgICAgICAgICAgICAgIHByaW9yaXR5OiAwLFxuICAgICAgICAgICAgICAgIG1ldGFkYXRhOiB7IHRhcmdldENsaWVudDogY2xpZW50SWQgfVxuICAgICAgICAgICAgfVxuICAgICAgICApO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIERlbGl2ZXIgcXVldWVkIG1lc3NhZ2VzIHdoZW4gY2xpZW50IHJlY29ubmVjdHNcbiAgICAgKi9cbiAgICBwcml2YXRlIGFzeW5jIF9kZWxpdmVyUXVldWVkTWVzc2FnZXMoY2xpZW50SWQ6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBpZiAoIXRoaXMuX2NvbmZpZy5lbmFibGVPZmZsaW5lUXVldWUpIHJldHVybjtcblxuICAgICAgICBjb25zdCBtZXNzYWdlcyA9IGF3YWl0IHRoaXMuX3N0b3JhZ2UuZ2V0RGVmZXJyZWRNZXNzYWdlcyhjbGllbnRJZCwgeyBzdGF0dXM6IFwicGVuZGluZ1wiIH0pO1xuXG4gICAgICAgIGZvciAoY29uc3Qgc3RvcmVkIG9mIG1lc3NhZ2VzKSB7XG4gICAgICAgICAgICBjb25zdCBtZXNzYWdlOiBDaGFubmVsTWVzc2FnZSA9IHtcbiAgICAgICAgICAgICAgICBpZDogc3RvcmVkLmlkLFxuICAgICAgICAgICAgICAgIGNoYW5uZWw6IHN0b3JlZC5jaGFubmVsLFxuICAgICAgICAgICAgICAgIHNlbmRlcjogc3RvcmVkLnNlbmRlcixcbiAgICAgICAgICAgICAgICB0eXBlOiBzdG9yZWQudHlwZSBhcyBDaGFubmVsTWVzc2FnZVtcInR5cGVcIl0sXG4gICAgICAgICAgICAgICAgcGF5bG9hZDogc3RvcmVkLnBheWxvYWQsXG4gICAgICAgICAgICAgICAgdGltZXN0YW1wOiBzdG9yZWQuY3JlYXRlZEF0XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBjb25zdCBkZWxpdmVyZWQgPSBhd2FpdCB0aGlzLl9wb3N0VG9DbGllbnQoY2xpZW50SWQsIG1lc3NhZ2UpO1xuICAgICAgICAgICAgaWYgKGRlbGl2ZXJlZCkge1xuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuX3N0b3JhZ2UubWFya0RlbGl2ZXJlZChzdG9yZWQuaWQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgLy8gTElGRUNZQ0xFXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbiAgICAvKipcbiAgICAgKiBTdGFydCB0aGUgaG9zdCAoY2FsbCBpbiBTVyBhY3RpdmF0ZSlcbiAgICAgKi9cbiAgICBhc3luYyBzdGFydCgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgYXdhaXQgdGhpcy5fc3RvcmFnZS5vcGVuKCk7XG4gICAgICAgIHRoaXMuX2Nvbm5lY3Rpb24ubWFya0Nvbm5lY3RlZCgpO1xuXG4gICAgICAgIC8vIENsZWFudXAgZXhwaXJlZCBtZXNzYWdlc1xuICAgICAgICBhd2FpdCB0aGlzLl9zdG9yYWdlLmNsZWFudXBFeHBpcmVkKCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogU3RvcCB0aGUgaG9zdFxuICAgICAqL1xuICAgIHN0b3AoKTogdm9pZCB7XG4gICAgICAgIGlmICh0aGlzLl9jbGVhbnVwSW50ZXJ2YWwpIHtcbiAgICAgICAgICAgIGNsZWFySW50ZXJ2YWwodGhpcy5fY2xlYW51cEludGVydmFsKTtcbiAgICAgICAgICAgIHRoaXMuX2NsZWFudXBJbnRlcnZhbCA9IG51bGw7XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKGNvbnN0IHN1YiBvZiB0aGlzLl9zdWJzY3JpcHRpb25zKSB7XG4gICAgICAgICAgICBzdWIudW5zdWJzY3JpYmUoKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLl9zdWJzY3JpcHRpb25zID0gW107XG5cbiAgICAgICAgdGhpcy5fY29ubmVjdGlvbi5jbG9zZSgpO1xuICAgICAgICB0aGlzLl9zdG9yYWdlLmNsb3NlKCk7XG4gICAgfVxuXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgLy8gUFJJVkFURSBNRVRIT0RTXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbiAgICBwcml2YXRlIF9zZXR1cE1lc3NhZ2VIYW5kbGVycygpOiB2b2lkIHtcbiAgICAgICAgLy8gTGlzdGVuIHRvIGluY29taW5nIG1lc3NhZ2VzIG9uIGNvbm5lY3Rpb25cbiAgICAgICAgY29uc3QgbWVzc2FnZVN1YiA9IHRoaXMuX2Nvbm5lY3Rpb24uc3Vic2NyaWJlKHtcbiAgICAgICAgICAgIG5leHQ6IChtc2cpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBSb3V0ZSBiYXNlZCBvbiBtZXNzYWdlIHR5cGVcbiAgICAgICAgICAgICAgICBpZiAobXNnLnR5cGUgPT09IFwicmVxdWVzdFwiKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2hhbmRsZVJlcXVlc3QobXNnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMuX3N1YnNjcmlwdGlvbnMucHVzaChtZXNzYWdlU3ViKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIF9oYW5kbGVSZXF1ZXN0KG1zZzogQ2hhbm5lbE1lc3NhZ2UpOiBQcm9taXNlPENoYW5uZWxNZXNzYWdlIHwgbnVsbD4ge1xuICAgICAgICAvLyBHZW5lcmF0ZSByZXNwb25zZVxuICAgICAgICBjb25zdCByZXNwb25zZTogQ2hhbm5lbE1lc3NhZ2UgPSB7XG4gICAgICAgICAgICBpZDogVVVJRHY0KCksXG4gICAgICAgICAgICBjaGFubmVsOiBtc2cuc2VuZGVyLFxuICAgICAgICAgICAgc2VuZGVyOiB0aGlzLl9jb25maWcuY2hhbm5lbE5hbWUsXG4gICAgICAgICAgICB0eXBlOiBcInJlc3BvbnNlXCIsXG4gICAgICAgICAgICByZXFJZDogbXNnLnJlcUlkLFxuICAgICAgICAgICAgcGF5bG9hZDoge1xuICAgICAgICAgICAgICAgIHJlc3VsdDogbnVsbCxcbiAgICAgICAgICAgICAgICBlcnJvcjogbnVsbFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHRpbWVzdGFtcDogRGF0ZS5ub3coKVxuICAgICAgICB9O1xuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBIYW5kbGUgYmFzZWQgb24gcGF5bG9hZCBhY3Rpb25cbiAgICAgICAgICAgIGNvbnN0IGFjdGlvbiA9IG1zZy5wYXlsb2FkPy5hY3Rpb247XG5cbiAgICAgICAgICAgIHN3aXRjaCAoYWN0aW9uKSB7XG4gICAgICAgICAgICAgICAgY2FzZSBcImdldENsaWVudHNcIjpcbiAgICAgICAgICAgICAgICAgICAgcmVzcG9uc2UucGF5bG9hZC5yZXN1bHQgPSBBcnJheS5mcm9tKHRoaXMuX2NsaWVudHMudmFsdWVzKCkpLm1hcCgoYykgPT4gKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC4uLmMsXG4gICAgICAgICAgICAgICAgICAgICAgICBjaGFubmVsczogQXJyYXkuZnJvbShjLmNoYW5uZWxzKVxuICAgICAgICAgICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAgICAgY2FzZSBcImdldENoYW5uZWxJbmZvXCI6XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGNoYW5uZWwgPSBtc2cucGF5bG9hZD8uY2hhbm5lbDtcbiAgICAgICAgICAgICAgICAgICAgcmVzcG9uc2UucGF5bG9hZC5yZXN1bHQgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjaGFubmVsLFxuICAgICAgICAgICAgICAgICAgICAgICAgc3Vic2NyaWJlckNvdW50OiB0aGlzLl9jaGFubmVsU3Vic2NyaWJlcnMuZ2V0KGNoYW5uZWwpPy5zaXplID8/IDBcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgICBjYXNlIFwicGluZ1wiOlxuICAgICAgICAgICAgICAgICAgICByZXNwb25zZS5wYXlsb2FkLnJlc3VsdCA9IFwicG9uZ1wiO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgIC8vIEVtaXQgZm9yIGN1c3RvbSBoYW5kbGVyc1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9jb25uZWN0aW9uLnB1c2hJbmJvdW5kKG1zZyk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgcmVzcG9uc2UucGF5bG9hZC5lcnJvciA9IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiByZXNwb25zZTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIF9wb3N0VG9DbGllbnQoY2xpZW50SWQ6IHN0cmluZywgbWVzc2FnZTogQ2hhbm5lbE1lc3NhZ2UpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICAgICAgLy8gU2VydmljZSBXb3JrZXIgc3BlY2lmaWM6IHVzZSBjbGllbnRzIEFQSVxuICAgICAgICBpZiAodHlwZW9mIGNsaWVudHMgPT09IFwidW5kZWZpbmVkXCIpIHJldHVybiBmYWxzZTtcblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgY2xpZW50ID0gYXdhaXQgY2xpZW50cy5nZXQoY2xpZW50SWQpO1xuICAgICAgICAgICAgaWYgKGNsaWVudCkge1xuICAgICAgICAgICAgICAgIGNsaWVudC5wb3N0TWVzc2FnZShtZXNzYWdlKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcihcIltTV0hvc3RdIEZhaWxlZCB0byBwb3N0IHRvIGNsaWVudDpcIiwgZSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBfc3RhcnRDbGVhbnVwSW50ZXJ2YWwoKTogdm9pZCB7XG4gICAgICAgIHRoaXMuX2NsZWFudXBJbnRlcnZhbCA9IHNldEludGVydmFsKCgpID0+IHtcbiAgICAgICAgICAgIHRoaXMuX2NsZWFudXBTdGFsZUNsaWVudHMoKTtcbiAgICAgICAgICAgIHRoaXMuX3N0b3JhZ2UuY2xlYW51cEV4cGlyZWQoKTtcbiAgICAgICAgfSwgdGhpcy5fY29uZmlnLmNsZWFudXBJbnRlcnZhbCk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBfY2xlYW51cFN0YWxlQ2xpZW50cygpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgaWYgKHR5cGVvZiBjbGllbnRzID09PSBcInVuZGVmaW5lZFwiKSByZXR1cm47XG5cbiAgICAgICAgY29uc3QgYWxsQ2xpZW50cyA9IGF3YWl0IGNsaWVudHMubWF0Y2hBbGwoeyBpbmNsdWRlVW5jb250cm9sbGVkOiB0cnVlIH0pO1xuICAgICAgICBjb25zdCBhY3RpdmVJZHMgPSBuZXcgU2V0KGFsbENsaWVudHMubWFwKChjKSA9PiBjLmlkKSk7XG5cbiAgICAgICAgLy8gUmVtb3ZlIGNsaWVudHMgdGhhdCBhcmUgbm8gbG9uZ2VyIGFjdGl2ZVxuICAgICAgICBmb3IgKGNvbnN0IGNsaWVudElkIG9mIHRoaXMuX2NsaWVudHMua2V5cygpKSB7XG4gICAgICAgICAgICBpZiAoIWFjdGl2ZUlkcy5oYXMoY2xpZW50SWQpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy51bnJlZ2lzdGVyQ2xpZW50KGNsaWVudElkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn1cblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gQ0xJRU5UIENPTk5FQ1RPUiAoZm9yIHBhZ2VzL2NvbXBvbmVudHMpXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKlxuICogU2VydmljZVdvcmtlckNsaWVudCAtIENvbm5lY3RzIGEgcGFnZS9jb21wb25lbnQgVE8gdGhlIFNXIGhvc3QuXG4gKlxuICogVGhpcyBpcyB3aGF0IHJ1bnMgaW4gdGhlIG1haW4gdGhyZWFkIHRvIGNvbm5lY3QgdG8gdGhlIFNXIGhvc3QuXG4gKi9cbmV4cG9ydCBjbGFzcyBTZXJ2aWNlV29ya2VyQ2xpZW50IHtcbiAgICBwcml2YXRlIF9yZWdpc3RyYXRpb246IFNlcnZpY2VXb3JrZXJSZWdpc3RyYXRpb24gfCBudWxsID0gbnVsbDtcbiAgICBwcml2YXRlIF9tZXNzYWdlSGFuZGxlcjogKChldmVudDogTWVzc2FnZUV2ZW50KSA9PiB2b2lkKSB8IG51bGwgPSBudWxsO1xuICAgIHByaXZhdGUgX3N1YmplY3QgPSBuZXcgQ2hhbm5lbFN1YmplY3Q8Q2hhbm5lbE1lc3NhZ2U+KCk7XG4gICAgLy8gQHRzLWlnbm9yZVxuICAgIHByaXZhdGUgX3BlbmRpbmdSZXF1ZXN0cyA9IG5ldyBNYXA8c3RyaW5nLCBQcm9taXNlV2l0aFJlc29sdmVyczxhbnk+PigpO1xuICAgIHByaXZhdGUgX2lzQ29ubmVjdGVkID0gZmFsc2U7XG5cbiAgICBjb25zdHJ1Y3Rvcihwcml2YXRlIF9jaGFubmVsTmFtZTogc3RyaW5nKSB7fVxuXG4gICAgLyoqXG4gICAgICogQ29ubmVjdCB0byBTVyBob3N0XG4gICAgICovXG4gICAgYXN5bmMgY29ubmVjdCgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgaWYgKCEoXCJzZXJ2aWNlV29ya2VyXCIgaW4gbmF2aWdhdG9yKSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiU2VydmljZSBXb3JrZXIgbm90IHN1cHBvcnRlZFwiKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuX3JlZ2lzdHJhdGlvbiA9IGF3YWl0IG5hdmlnYXRvci5zZXJ2aWNlV29ya2VyLnJlYWR5O1xuXG4gICAgICAgIC8vIFNldHVwIG1lc3NhZ2UgbGlzdGVuZXJcbiAgICAgICAgdGhpcy5fbWVzc2FnZUhhbmRsZXIgPSAoZXZlbnQ6IE1lc3NhZ2VFdmVudCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgZGF0YSA9IGV2ZW50LmRhdGE7XG4gICAgICAgICAgICBpZiAoIWRhdGEgfHwgdHlwZW9mIGRhdGEgIT09IFwib2JqZWN0XCIpIHJldHVybjtcblxuICAgICAgICAgICAgLy8gSGFuZGxlIHJlc3BvbnNlc1xuICAgICAgICAgICAgaWYgKGRhdGEudHlwZSA9PT0gXCJyZXNwb25zZVwiICYmIGRhdGEucmVxSWQpIHtcbiAgICAgICAgICAgICAgICBjb25zdCByZXNvbHZlcnMgPSB0aGlzLl9wZW5kaW5nUmVxdWVzdHMuZ2V0KGRhdGEucmVxSWQpO1xuICAgICAgICAgICAgICAgIGlmIChyZXNvbHZlcnMpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fcGVuZGluZ1JlcXVlc3RzLmRlbGV0ZShkYXRhLnJlcUlkKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGRhdGEucGF5bG9hZD8uZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmVycy5yZWplY3QobmV3IEVycm9yKGRhdGEucGF5bG9hZC5lcnJvcikpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZXJzLnJlc29sdmUoZGF0YS5wYXlsb2FkPy5yZXN1bHQpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFB1c2ggdG8gc3ViamVjdCBmb3Igc3Vic2NyaWJlcnNcbiAgICAgICAgICAgIHRoaXMuX3N1YmplY3QubmV4dChkYXRhIGFzIENoYW5uZWxNZXNzYWdlKTtcbiAgICAgICAgfTtcblxuICAgICAgICBuYXZpZ2F0b3Iuc2VydmljZVdvcmtlci5hZGRFdmVudExpc3RlbmVyKFwibWVzc2FnZVwiLCB0aGlzLl9tZXNzYWdlSGFuZGxlcik7XG5cbiAgICAgICAgLy8gU2VuZCBjb25uZWN0IG1lc3NhZ2VcbiAgICAgICAgdGhpcy5fc2VuZFRvU1coe1xuICAgICAgICAgICAgdHlwZTogXCJjb25uZWN0XCIsXG4gICAgICAgICAgICBjaGFubmVsOiB0aGlzLl9jaGFubmVsTmFtZSxcbiAgICAgICAgICAgIHBheWxvYWQ6IHtcbiAgICAgICAgICAgICAgICB1cmw6IGxvY2F0aW9uLmhyZWYsXG4gICAgICAgICAgICAgICAgdmlzaWJpbGl0eVN0YXRlOiBkb2N1bWVudC52aXNpYmlsaXR5U3RhdGUsXG4gICAgICAgICAgICAgICAgZm9jdXNlZDogZG9jdW1lbnQuaGFzRm9jdXMoKVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLl9pc0Nvbm5lY3RlZCA9IHRydWU7XG5cbiAgICAgICAgLy8gVHJhY2sgdmlzaWJpbGl0eSBjaGFuZ2VzXG4gICAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJ2aXNpYmlsaXR5Y2hhbmdlXCIsIHRoaXMuX29uVmlzaWJpbGl0eUNoYW5nZSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRGlzY29ubmVjdCBmcm9tIFNXIGhvc3RcbiAgICAgKi9cbiAgICBkaXNjb25uZWN0KCk6IHZvaWQge1xuICAgICAgICBpZiAodGhpcy5fbWVzc2FnZUhhbmRsZXIpIHtcbiAgICAgICAgICAgIG5hdmlnYXRvci5zZXJ2aWNlV29ya2VyLnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJtZXNzYWdlXCIsIHRoaXMuX21lc3NhZ2VIYW5kbGVyKTtcbiAgICAgICAgICAgIHRoaXMuX21lc3NhZ2VIYW5kbGVyID0gbnVsbDtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuX3NlbmRUb1NXKHtcbiAgICAgICAgICAgIHR5cGU6IFwiZGlzY29ubmVjdFwiLFxuICAgICAgICAgICAgY2hhbm5lbDogdGhpcy5fY2hhbm5lbE5hbWVcbiAgICAgICAgfSk7XG5cbiAgICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihcInZpc2liaWxpdHljaGFuZ2VcIiwgdGhpcy5fb25WaXNpYmlsaXR5Q2hhbmdlKTtcbiAgICAgICAgdGhpcy5faXNDb25uZWN0ZWQgPSBmYWxzZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBTdWJzY3JpYmUgdG8gYSBjaGFubmVsXG4gICAgICovXG4gICAgc3Vic2NyaWJlVG9DaGFubmVsKGNoYW5uZWw6IHN0cmluZyk6IHZvaWQge1xuICAgICAgICB0aGlzLl9zZW5kVG9TVyh7XG4gICAgICAgICAgICB0eXBlOiBcInN1YnNjcmliZVwiLFxuICAgICAgICAgICAgY2hhbm5lbDogdGhpcy5fY2hhbm5lbE5hbWUsXG4gICAgICAgICAgICBwYXlsb2FkOiB7IGNoYW5uZWwgfVxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBVbnN1YnNjcmliZSBmcm9tIGEgY2hhbm5lbFxuICAgICAqL1xuICAgIHVuc3Vic2NyaWJlRnJvbUNoYW5uZWwoY2hhbm5lbDogc3RyaW5nKTogdm9pZCB7XG4gICAgICAgIHRoaXMuX3NlbmRUb1NXKHtcbiAgICAgICAgICAgIHR5cGU6IFwidW5zdWJzY3JpYmVcIixcbiAgICAgICAgICAgIGNoYW5uZWw6IHRoaXMuX2NoYW5uZWxOYW1lLFxuICAgICAgICAgICAgcGF5bG9hZDogeyBjaGFubmVsIH1cbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogU2VuZCByZXF1ZXN0IHRvIFNXIGhvc3RcbiAgICAgKi9cbiAgICBhc3luYyByZXF1ZXN0PFQgPSBhbnk+KGFjdGlvbjogc3RyaW5nLCBwYXlsb2FkOiBhbnkgPSB7fSk6IFByb21pc2U8VD4ge1xuICAgICAgICBjb25zdCByZXFJZCA9IFVVSUR2NCgpO1xuXG4gICAgICAgIC8vIEB0cy1pZ25vcmVcbiAgICAgICAgY29uc3QgcmVzb2x2ZXJzID0gUHJvbWlzZS53aXRoUmVzb2x2ZXJzPFQ+KCk7XG4gICAgICAgIHRoaXMuX3BlbmRpbmdSZXF1ZXN0cy5zZXQocmVxSWQsIHJlc29sdmVycyk7XG5cbiAgICAgICAgdGhpcy5fc2VuZFRvU1coe1xuICAgICAgICAgICAgaWQ6IFVVSUR2NCgpLFxuICAgICAgICAgICAgdHlwZTogXCJyZXF1ZXN0XCIsXG4gICAgICAgICAgICBjaGFubmVsOiB0aGlzLl9jaGFubmVsTmFtZSxcbiAgICAgICAgICAgIHNlbmRlcjogXCJjbGllbnRcIixcbiAgICAgICAgICAgIHJlcUlkLFxuICAgICAgICAgICAgcGF5bG9hZDogeyBhY3Rpb24sIC4uLnBheWxvYWQgfSxcbiAgICAgICAgICAgIHRpbWVzdGFtcDogRGF0ZS5ub3coKVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBUaW1lb3V0XG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgaWYgKHRoaXMuX3BlbmRpbmdSZXF1ZXN0cy5oYXMocmVxSWQpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fcGVuZGluZ1JlcXVlc3RzLmRlbGV0ZShyZXFJZCk7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZXJzLnJlamVjdChuZXcgRXJyb3IoXCJSZXF1ZXN0IHRpbWVvdXRcIikpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LCAzMDAwMCk7XG5cbiAgICAgICAgcmV0dXJuIHJlc29sdmVycy5wcm9taXNlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFNlbmQgZXZlbnQgdG8gU1cgaG9zdFxuICAgICAqL1xuICAgIGVtaXQoZXZlbnRUeXBlOiBzdHJpbmcsIGRhdGE6IGFueSwgdGFyZ2V0Q2hhbm5lbD86IHN0cmluZyk6IHZvaWQge1xuICAgICAgICB0aGlzLl9zZW5kVG9TVyh7XG4gICAgICAgICAgICBpZDogVVVJRHY0KCksXG4gICAgICAgICAgICB0eXBlOiBcImV2ZW50XCIsXG4gICAgICAgICAgICBjaGFubmVsOiB0YXJnZXRDaGFubmVsID8/IHRoaXMuX2NoYW5uZWxOYW1lLFxuICAgICAgICAgICAgc2VuZGVyOiBcImNsaWVudFwiLFxuICAgICAgICAgICAgcGF5bG9hZDogeyB0eXBlOiBldmVudFR5cGUsIGRhdGEgfSxcbiAgICAgICAgICAgIHRpbWVzdGFtcDogRGF0ZS5ub3coKVxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBTdWJzY3JpYmUgdG8gbWVzc2FnZXMgZnJvbSBTVyBob3N0XG4gICAgICovXG4gICAgc3Vic2NyaWJlKGhhbmRsZXI6IChtc2c6IENoYW5uZWxNZXNzYWdlKSA9PiB2b2lkKTogU3Vic2NyaXB0aW9uIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N1YmplY3Quc3Vic2NyaWJlKHsgbmV4dDogaGFuZGxlciB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBTdWJzY3JpYmUgdG8gc3BlY2lmaWMgZXZlbnQgdHlwZVxuICAgICAqL1xuICAgIG9uKGV2ZW50VHlwZTogc3RyaW5nLCBoYW5kbGVyOiAoZGF0YTogYW55KSA9PiB2b2lkKTogU3Vic2NyaXB0aW9uIHtcbiAgICAgICAgcmV0dXJuIGZpbHRlcihcbiAgICAgICAgICAgIHRoaXMuX3N1YmplY3QsXG4gICAgICAgICAgICAobSkgPT4gbS50eXBlID09PSBcImV2ZW50XCIgJiYgbS5wYXlsb2FkPy50eXBlID09PSBldmVudFR5cGVcbiAgICAgICAgKS5zdWJzY3JpYmUoe1xuICAgICAgICAgICAgbmV4dDogKG1zZykgPT4gaGFuZGxlcihtc2cucGF5bG9hZD8uZGF0YSlcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2hlY2sgaWYgY29ubmVjdGVkXG4gICAgICovXG4gICAgZ2V0IGlzQ29ubmVjdGVkKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5faXNDb25uZWN0ZWQ7XG4gICAgfVxuXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgLy8gUFJJVkFURVxuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4gICAgcHJpdmF0ZSBfc2VuZFRvU1cobWVzc2FnZTogYW55KTogdm9pZCB7XG4gICAgICAgIGlmICghdGhpcy5fcmVnaXN0cmF0aW9uPy5hY3RpdmUpIHJldHVybjtcbiAgICAgICAgdGhpcy5fcmVnaXN0cmF0aW9uLmFjdGl2ZS5wb3N0TWVzc2FnZShtZXNzYWdlKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIF9vblZpc2liaWxpdHlDaGFuZ2UgPSAoKTogdm9pZCA9PiB7XG4gICAgICAgIGlmICghdGhpcy5faXNDb25uZWN0ZWQpIHJldHVybjtcblxuICAgICAgICB0aGlzLl9zZW5kVG9TVyh7XG4gICAgICAgICAgICB0eXBlOiBcImV2ZW50XCIsXG4gICAgICAgICAgICBjaGFubmVsOiB0aGlzLl9jaGFubmVsTmFtZSxcbiAgICAgICAgICAgIHBheWxvYWQ6IHtcbiAgICAgICAgICAgICAgICB0eXBlOiBcInZpc2liaWxpdHlDaGFuZ2VcIixcbiAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgIHZpc2liaWxpdHlTdGF0ZTogZG9jdW1lbnQudmlzaWJpbGl0eVN0YXRlLFxuICAgICAgICAgICAgICAgICAgICBmb2N1c2VkOiBkb2N1bWVudC5oYXNGb2N1cygpXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9O1xufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBGQUNUT1JZIEZVTkNUSU9OU1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIENyZWF0ZSBTVyBob3N0IChjYWxsIGluIHNlcnZpY2Ugd29ya2VyKVxuICovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlU2VydmljZVdvcmtlckhvc3QoY29uZmlnOiBTV0hvc3RDb25maWcpOiBTZXJ2aWNlV29ya2VySG9zdCB7XG4gICAgcmV0dXJuIG5ldyBTZXJ2aWNlV29ya2VySG9zdChjb25maWcpO1xufVxuXG4vKipcbiAqIENyZWF0ZSBTVyBjbGllbnQgKGNhbGwgaW4gcGFnZS9jb21wb25lbnQpXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVTZXJ2aWNlV29ya2VyQ2xpZW50KGNoYW5uZWxOYW1lOiBzdHJpbmcpOiBTZXJ2aWNlV29ya2VyQ2xpZW50IHtcbiAgICByZXR1cm4gbmV3IFNlcnZpY2VXb3JrZXJDbGllbnQoY2hhbm5lbE5hbWUpO1xufVxuIl19