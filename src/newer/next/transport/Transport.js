/**
 * Transport Adapters - Unified transport implementations
 *
 * Uses core/TransportCore for consistent send/listen patterns.
 * Supports observing incoming channel connections.
 */
import { UUIDv4 } from "fest/core";
import { createTransportSender, createTransportListener } from "../../core/TransportCore";
import { ChannelSubject } from "../observable/Observable";
// ============================================================================
// BASE TRANSPORT
// ============================================================================
export class TransportAdapter {
    _channelName;
    _transportType;
    _options;
    _subscriptions = [];
    _isAttached = false;
    _inbound = new ChannelSubject({ bufferSize: 100 });
    _outbound = new ChannelSubject({ bufferSize: 100 });
    // Incoming connection observability
    _incomingConnections = new ChannelSubject({ bufferSize: 50 });
    _acceptCallback = null;
    constructor(_channelName, _transportType, _options = {}) {
        this._channelName = _channelName;
        this._transportType = _transportType;
        this._options = _options;
    }
    detach() {
        this._subscriptions.forEach((s) => s.unsubscribe());
        this._subscriptions = [];
        this._isAttached = false;
    }
    /** Subscribe to incoming messages */
    subscribe(observer) {
        return this._inbound.subscribe(observer);
    }
    /** Send message */
    send(msg, transfer) {
        this._outbound.next({ ...msg, transferable: transfer });
    }
    // ========================================================================
    // INCOMING CONNECTION OBSERVABILITY
    // ========================================================================
    /**
     * Observable: Incoming connection requests
     */
    get onIncomingConnection() {
        return this._incomingConnections;
    }
    /**
     * Subscribe to incoming connection requests
     */
    subscribeIncoming(handler) {
        return this._incomingConnections.subscribe(handler);
    }
    /**
     * Set callback to auto-accept/reject connections
     */
    setAcceptCallback(callback) {
        this._acceptCallback = callback;
    }
    /**
     * Emit incoming connection event
     * Called by subclasses when a new connection request is detected
     */
    _emitIncomingConnection(connection) {
        this._incomingConnections.next(connection);
    }
    /**
     * Check if connection should be accepted (via callback)
     */
    async _shouldAcceptConnection(connection) {
        if (!this._acceptCallback)
            return true;
        return this._acceptCallback(connection);
    }
    // ========================================================================
    // GETTERS
    // ========================================================================
    get channelName() { return this._channelName; }
    get isAttached() { return this._isAttached; }
    get inbound() { return this._inbound; }
    get outbound() { return this._outbound; }
}
// ============================================================================
// WORKER TRANSPORT
// ============================================================================
export class WorkerTransport extends TransportAdapter {
    _workerSource;
    _worker = null;
    _cleanup = null;
    _ownWorker = false;
    constructor(channelName, _workerSource, options = {}) {
        super(channelName, "worker", options);
        this._workerSource = _workerSource;
    }
    attach() {
        if (this._isAttached)
            return;
        this._worker = this._resolveWorker();
        const send = createTransportSender(this._worker);
        this._cleanup = createTransportListener(this._worker, (data) => this._handleIncoming(data), (err) => this._inbound.error(err));
        this._subscriptions.push(this._outbound.subscribe((msg) => send(msg, msg.transferable)));
        this._isAttached = true;
    }
    detach() {
        this._cleanup?.();
        if (this._ownWorker && this._worker)
            this._worker.terminate();
        this._worker = null;
        super.detach();
    }
    /**
     * Request a new channel in the worker
     */
    requestChannel(channel, sender, options, port) {
        const transfer = port ? [port] : [];
        this._worker?.postMessage({
            type: "createChannel",
            channel,
            sender,
            options,
            messagePort: port,
            reqId: UUIDv4()
        }, { transfer });
    }
    /**
     * Connect to an existing channel in the worker
     */
    connectChannel(channel, sender, port, options) {
        const transfer = port ? [port] : [];
        this._worker?.postMessage({
            type: "connectChannel",
            channel,
            sender,
            port,
            options,
            reqId: UUIDv4()
        }, { transfer });
    }
    /**
     * List all channels in the worker
     */
    listChannels() {
        return new Promise((resolve) => {
            const reqId = UUIDv4();
            const handler = (msg) => {
                if (msg.type === "channelList" && msg.reqId === reqId) {
                    sub.unsubscribe();
                    resolve(msg.channels ?? []);
                }
            };
            const sub = this._inbound.subscribe(handler);
            this._worker?.postMessage({ type: "listChannels", reqId });
            // Timeout fallback
            setTimeout(() => { sub.unsubscribe(); resolve([]); }, 5000);
        });
    }
    _handleIncoming(data) {
        // Detect channel creation/connection events
        if (data?.type === "channelCreated" || data?.type === "channelConnected") {
            this._emitIncomingConnection({
                id: data.reqId ?? UUIDv4(),
                channel: data.channel,
                sender: data.sender ?? "worker",
                transportType: "worker",
                data,
                timestamp: Date.now()
            });
        }
        // Forward to inbound stream
        this._inbound.next(data);
    }
    _resolveWorker() {
        if (this._workerSource instanceof Worker)
            return this._workerSource;
        this._ownWorker = true;
        if (typeof this._workerSource === "function")
            return this._workerSource();
        if (this._workerSource instanceof URL)
            return new Worker(this._workerSource.href, { type: "module" });
        if (typeof this._workerSource === "string") {
            if (this._workerSource.startsWith("/"))
                return new Worker(new URL(this._workerSource.replace(/^\//, "./"), import.meta.url).href, { type: "module" });
            if (URL.canParse(this._workerSource) || this._workerSource.startsWith("./"))
                return new Worker(new URL(this._workerSource, import.meta.url).href, { type: "module" });
            return new Worker(URL.createObjectURL(new Blob([this._workerSource], { type: "application/javascript" })), { type: "module" });
        }
        throw new Error("Invalid worker source");
    }
    get worker() { return this._worker; }
}
// ============================================================================
// MESSAGE PORT TRANSPORT
// ============================================================================
export class MessagePortTransport extends TransportAdapter {
    _port;
    _cleanup = null;
    constructor(channelName, _port, options = {}) {
        super(channelName, "message-port", options);
        this._port = _port;
    }
    attach() {
        if (this._isAttached)
            return;
        const send = createTransportSender(this._port);
        this._cleanup = createTransportListener(this._port, (data) => this._inbound.next(data));
        this._subscriptions.push(this._outbound.subscribe((msg) => send(msg, msg.transferable)));
        this._isAttached = true;
    }
    detach() { this._cleanup?.(); this._port.close(); super.detach(); }
    get port() { return this._port; }
}
// ============================================================================
// BROADCAST CHANNEL TRANSPORT
// ============================================================================
export class BroadcastChannelTransport extends TransportAdapter {
    _bcName;
    _channel = null;
    _cleanup = null;
    _connectedPeers = new Set();
    constructor(channelName, _bcName, options = {}) {
        super(channelName, "broadcast", options);
        this._bcName = _bcName;
    }
    attach() {
        if (this._isAttached)
            return;
        this._channel = new BroadcastChannel(this._bcName ?? this._channelName);
        const send = createTransportSender(this._channel);
        this._cleanup = createTransportListener(this._channel, (data) => {
            if (data?.sender !== this._channelName) {
                this._handleIncoming(data);
            }
        });
        this._subscriptions.push(this._outbound.subscribe((msg) => send(msg)));
        this._isAttached = true;
        // Announce presence
        this._announcePresence();
    }
    _handleIncoming(data) {
        // Detect connection announcements
        if (data?.type === "announce" || data?.type === "connect") {
            const sender = data.sender ?? "unknown";
            const isNew = !this._connectedPeers.has(sender);
            this._connectedPeers.add(sender);
            if (isNew) {
                this._emitIncomingConnection({
                    id: data.reqId ?? UUIDv4(),
                    channel: data.channel ?? this._channelName,
                    sender,
                    transportType: "broadcast",
                    data,
                    timestamp: Date.now()
                });
                // Respond to announcement
                if (data.type === "announce") {
                    this._channel?.postMessage({
                        type: "announce-ack",
                        channel: this._channelName,
                        sender: this._channelName
                    });
                }
            }
        }
        this._inbound.next(data);
    }
    _announcePresence() {
        this._channel?.postMessage({
            type: "announce",
            channel: this._channelName,
            sender: this._channelName,
            timestamp: Date.now()
        });
    }
    /**
     * Get connected peers
     */
    get connectedPeers() {
        return [...this._connectedPeers];
    }
    detach() {
        this._cleanup?.();
        this._channel?.close();
        this._channel = null;
        this._connectedPeers.clear();
        super.detach();
    }
}
// ============================================================================
// WEBSOCKET TRANSPORT
// ============================================================================
export class WebSocketTransport extends TransportAdapter {
    _url;
    _protocols;
    _ws = null;
    _cleanup = null;
    _pending = [];
    _state = new ChannelSubject();
    _connectedChannels = new Set();
    constructor(channelName, _url, _protocols, options = {}) {
        super(channelName, "websocket", options);
        this._url = _url;
        this._protocols = _protocols;
    }
    attach() {
        if (this._isAttached)
            return;
        const url = typeof this._url === "string" ? this._url : this._url.href;
        this._ws = new WebSocket(url, this._protocols);
        this._state.next("connecting");
        const send = (msg) => {
            if (this._ws?.readyState === WebSocket.OPEN) {
                const { transferable: _, ...data } = msg;
                this._ws.send(JSON.stringify(data));
            }
            else {
                this._pending.push(msg);
            }
        };
        this._ws.addEventListener("open", () => {
            this._state.next("open");
            this._pending.forEach((m) => send(m));
            this._pending = [];
            // Emit self as connected
            this._emitIncomingConnection({
                id: UUIDv4(),
                channel: this._channelName,
                sender: "server",
                transportType: "websocket",
                timestamp: Date.now()
            });
        });
        this._cleanup = createTransportListener(this._ws, (data) => this._handleIncoming(data), (err) => this._inbound.error(err), () => { this._state.next("closed"); this._inbound.complete(); });
        this._subscriptions.push(this._outbound.subscribe((msg) => send(msg)));
        this._isAttached = true;
    }
    _handleIncoming(data) {
        // Detect channel connection events from server
        if (data?.type === "channel-connect" || data?.type === "peer-connect" || data?.type === "join") {
            const channel = data.channel ?? data.room ?? this._channelName;
            const isNew = !this._connectedChannels.has(channel);
            if (isNew) {
                this._connectedChannels.add(channel);
                this._emitIncomingConnection({
                    id: data.id ?? UUIDv4(),
                    channel,
                    sender: data.sender ?? data.peerId ?? "remote",
                    transportType: "websocket",
                    data,
                    timestamp: Date.now()
                });
            }
        }
        this._inbound.next(data);
    }
    /**
     * Join/subscribe to a channel on the server
     */
    joinChannel(channel) {
        this.send({
            id: UUIDv4(),
            type: "join",
            channel,
            sender: this._channelName,
            timestamp: Date.now()
        });
    }
    /**
     * Leave/unsubscribe from a channel
     */
    leaveChannel(channel) {
        this._connectedChannels.delete(channel);
        this.send({
            id: UUIDv4(),
            type: "leave",
            channel,
            sender: this._channelName,
            timestamp: Date.now()
        });
    }
    /**
     * Get connected channels
     */
    get connectedChannels() {
        return [...this._connectedChannels];
    }
    detach() {
        this._cleanup?.();
        this._ws?.close();
        this._ws = null;
        this._connectedChannels.clear();
        super.detach();
    }
    get ws() { return this._ws; }
    get state() { return this._state; }
}
// ============================================================================
// CHROME RUNTIME TRANSPORT
// ============================================================================
export class ChromeRuntimeTransport extends TransportAdapter {
    _cleanup = null;
    constructor(channelName, options = {}) {
        super(channelName, "chrome-runtime", options);
    }
    attach() {
        if (this._isAttached)
            return;
        if (typeof chrome === "undefined" || !chrome.runtime)
            return;
        const send = createTransportSender("chrome-runtime");
        this._cleanup = createTransportListener("chrome-tabs", (data) => this._inbound.next(data), undefined, undefined, { tabId: this._tabId });
        this._subscriptions.push(this._outbound.subscribe((msg) => send(msg)));
        this._isAttached = true;
    }
    detach() { this._cleanup?.(); super.detach(); }
}
// ============================================================================
// CHROME TABS TRANSPORT
// ============================================================================
export class ChromeTabsTransport extends TransportAdapter {
    _tabId;
    _cleanup = null;
    constructor(channelName, _tabId, options = {}) {
        super(channelName, "chrome-tabs", options);
        this._tabId = _tabId;
    }
    attach() {
        if (this._isAttached)
            return;
        if (typeof chrome === "undefined" || !chrome.tabs)
            return;
        const send = (msg) => {
            if (this._tabId != null) {
                const { transferable: _, ...data } = msg;
                chrome.tabs.sendMessage(this._tabId, data);
            }
        };
        this._cleanup = createTransportListener("chrome-runtime", (data) => this._inbound.next(data));
        this._subscriptions.push(this._outbound.subscribe((msg) => send(msg)));
        this._isAttached = true;
    }
    detach() { this._cleanup?.(); super.detach(); }
    setTabId(tabId) { this._tabId = tabId; }
}
// ============================================================================
// CHROME PORT TRANSPORT
// ============================================================================
export class ChromePortTransport extends TransportAdapter {
    _portName;
    _tabId;
    _cleanup = null;
    _port = null;
    constructor(channelName, _portName, _tabId, options = {}) {
        super(channelName, "chrome-port", options);
        this._portName = _portName;
        this._tabId = _tabId;
    }
    attach() {
        if (this._isAttached)
            return;
        if (typeof chrome === "undefined" || !chrome.runtime)
            return;
        this._port = this._tabId != null && chrome.tabs?.connect
            ? chrome.tabs.connect(this._tabId, { name: this._portName })
            : chrome.runtime.connect({ name: this._portName });
        const send = (msg) => this._port?.postMessage(msg);
        const onMessage = (msg) => this._inbound.next(msg);
        this._port.onMessage.addListener(onMessage);
        this._cleanup = () => {
            try {
                this._port?.onMessage.removeListener(onMessage);
            }
            catch { }
            try {
                this._port?.disconnect();
            }
            catch { }
            this._port = null;
        };
        this._subscriptions.push(this._outbound.subscribe((msg) => send(msg)));
        this._isAttached = true;
    }
    detach() { this._cleanup?.(); super.detach(); }
}
// ============================================================================
// CHROME EXTERNAL TRANSPORT
// ============================================================================
export class ChromeExternalTransport extends TransportAdapter {
    _externalId;
    _cleanup = null;
    constructor(channelName, _externalId, options = {}) {
        super(channelName, "chrome-external", options);
        this._externalId = _externalId;
    }
    attach() {
        if (this._isAttached)
            return;
        if (typeof chrome === "undefined" || !chrome.runtime)
            return;
        const send = (msg) => chrome.runtime.sendMessage(this._externalId, msg);
        const listener = (msg) => {
            this._inbound.next(msg);
            return false;
        };
        chrome.runtime.onMessageExternal?.addListener?.(listener);
        this._cleanup = () => chrome.runtime.onMessageExternal?.removeListener?.(listener);
        this._subscriptions.push(this._outbound.subscribe((msg) => send(msg)));
        this._isAttached = true;
    }
    detach() { this._cleanup?.(); super.detach(); }
}
// ============================================================================
// SERVICE WORKER TRANSPORT
// ============================================================================
export class ServiceWorkerTransport extends TransportAdapter {
    _isHost;
    _cleanup = null;
    constructor(channelName, _isHost = false, options = {}) {
        super(channelName, "service-worker", options);
        this._isHost = _isHost;
    }
    attach() {
        if (this._isAttached)
            return;
        const target = this._isHost ? "service-worker-host" : "service-worker-client";
        const send = createTransportSender(target);
        this._cleanup = createTransportListener(target, (data) => this._inbound.next(data));
        this._subscriptions.push(this._outbound.subscribe((msg) => send(msg, msg.transferable)));
        this._isAttached = true;
    }
    detach() { this._cleanup?.(); super.detach(); }
}
// ============================================================================
// SELF TRANSPORT (inside worker)
// ============================================================================
export class SelfTransport extends TransportAdapter {
    _cleanup = null;
    constructor(channelName, options = {}) {
        super(channelName, "self", options);
    }
    attach() {
        if (this._isAttached)
            return;
        const send = createTransportSender("self");
        this._cleanup = createTransportListener("self", (data) => this._handleIncoming(data));
        this._subscriptions.push(this._outbound.subscribe((msg) => send(msg, msg.transferable)));
        this._isAttached = true;
    }
    _handleIncoming(data) {
        // Detect channel creation/connection requests
        if (data?.type === "createChannel" || data?.type === "connectChannel") {
            this._emitIncomingConnection({
                id: data.reqId ?? UUIDv4(),
                channel: data.channel,
                sender: data.sender ?? "unknown",
                transportType: "self",
                port: data.messagePort ?? data.port,
                data,
                timestamp: Date.now()
            });
        }
        this._inbound.next(data);
    }
    /**
     * Notify sender that channel was created
     */
    notifyChannelCreated(channel, sender, reqId) {
        postMessage({
            type: "channelCreated",
            channel,
            sender,
            reqId,
            timestamp: Date.now()
        });
    }
    detach() { this._cleanup?.(); super.detach(); }
}
// ============================================================================
// FACTORY
// ============================================================================
export const TransportFactory = {
    worker: (name, source, opts) => new WorkerTransport(name, source, opts),
    messagePort: (name, port, opts) => new MessagePortTransport(name, port, opts),
    broadcast: (name, bcName, opts) => new BroadcastChannelTransport(name, bcName, opts),
    websocket: (name, url, protocols, opts) => new WebSocketTransport(name, url, protocols, opts),
    chromeRuntime: (name, opts) => new ChromeRuntimeTransport(name, opts),
    chromeTabs: (name, tabId, opts) => new ChromeTabsTransport(name, tabId, opts),
    chromePort: (name, portName, tabId, opts) => new ChromePortTransport(name, portName, tabId, opts),
    chromeExternal: (name, externalId, opts) => new ChromeExternalTransport(name, externalId, opts),
    serviceWorker: (name, isHost, opts) => new ServiceWorkerTransport(name, isHost, opts),
    self: (name, opts) => new SelfTransport(name, opts)
};
// ============================================================================
// CONNECTION OBSERVER UTILITIES
// ============================================================================
/**
 * Create a connection observer that aggregates incoming connections
 * from multiple transports
 */
export function createConnectionObserver(transports) {
    const connections = [];
    const subject = new ChannelSubject({ bufferSize: 100 });
    for (const transport of transports) {
        transport.subscribeIncoming((conn) => {
            connections.push(conn);
            subject.next(conn);
        });
    }
    return {
        subscribe: (handler) => subject.subscribe(handler),
        getConnections: () => [...connections]
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVHJhbnNwb3J0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiVHJhbnNwb3J0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7OztHQUtHO0FBRUgsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLFdBQVcsQ0FBQztBQUNuQyxPQUFPLEVBQ0gscUJBQXFCLEVBQ3JCLHVCQUF1QixFQUUxQixNQUFNLDBCQUEwQixDQUFDO0FBU2xDLE9BQU8sRUFBRSxjQUFjLEVBQXFCLE1BQU0sMEJBQTBCLENBQUM7QUE2QjdFLCtFQUErRTtBQUMvRSxpQkFBaUI7QUFDakIsK0VBQStFO0FBRS9FLE1BQU0sT0FBZ0IsZ0JBQWdCO0lBV3BCO0lBQ0E7SUFDQTtJQVpKLGNBQWMsR0FBbUIsRUFBRSxDQUFDO0lBQ3BDLFdBQVcsR0FBRyxLQUFLLENBQUM7SUFDcEIsUUFBUSxHQUFHLElBQUksY0FBYyxDQUFpQixFQUFFLFVBQVUsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDO0lBQ25FLFNBQVMsR0FBRyxJQUFJLGNBQWMsQ0FBaUIsRUFBRSxVQUFVLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQztJQUU5RSxvQ0FBb0M7SUFDMUIsb0JBQW9CLEdBQUcsSUFBSSxjQUFjLENBQThCLEVBQUUsVUFBVSxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFDM0YsZUFBZSxHQUFvQyxJQUFJLENBQUM7SUFFbEUsWUFDYyxZQUFvQixFQUNwQixjQUE2QixFQUM3QixXQUE4QixFQUFFO1FBRmhDLGlCQUFZLEdBQVosWUFBWSxDQUFRO1FBQ3BCLG1CQUFjLEdBQWQsY0FBYyxDQUFlO1FBQzdCLGFBQVEsR0FBUixRQUFRLENBQXdCO0lBQzNDLENBQUM7SUFJSixNQUFNO1FBQ0YsSUFBSSxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDO1FBQ3BELElBQUksQ0FBQyxjQUFjLEdBQUcsRUFB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QUFDLFNBQVMsQ0FBQyxPQUFPLENBQUM7UUFDbEQsY0FBYyxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUMsR0FBRyxXQUFXLENBQUM7S0FDekMsQ0FBQztBQUNOLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIFRyYW5zcG9ydCBBZGFwdGVycyAtIFVuaWZpZWQgdHJhbnNwb3J0IGltcGxlbWVudGF0aW9uc1xuICpcbiAqIFVzZXMgY29yZS9UcmFuc3BvcnRDb3JlIGZvciBjb25zaXN0ZW50IHNlbmQvbGlzdGVuIHBhdHRlcm5zLlxuICogU3VwcG9ydHMgb2JzZXJ2aW5nIGluY29taW5nIGNoYW5uZWwgY29ubmVjdGlvbnMuXG4gKi9cblxuaW1wb3J0IHsgVVVJRHY0IH0gZnJvbSBcImZlc3QvY29yZVwiO1xuaW1wb3J0IHtcbiAgICBjcmVhdGVUcmFuc3BvcnRTZW5kZXIsXG4gICAgY3JlYXRlVHJhbnNwb3J0TGlzdGVuZXIsXG4gICAgdHlwZSBUcmFuc3BvcnRUYXJnZXRcbn0gZnJvbSBcIi4uLy4uL2NvcmUvVHJhbnNwb3J0Q29yZVwiO1xuaW1wb3J0IHR5cGUge1xuICAgIENoYW5uZWxNZXNzYWdlLFxuICAgIFN1YnNjcmlwdGlvbixcbiAgICBPYnNlcnZlcixcbiAgICBUcmFuc3BvcnRUeXBlLFxuICAgIENvbm5lY3Rpb25PcHRpb25zLFxuICAgIFNlbmRGblxufSBmcm9tIFwiLi4vdHlwZXMvSW50ZXJmYWNlXCI7XG5pbXBvcnQgeyBDaGFubmVsU3ViamVjdCwgdHlwZSBTdWJzY3JpYmFibGUgfSBmcm9tIFwiLi4vb2JzZXJ2YWJsZS9PYnNlcnZhYmxlXCI7XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIElOQ09NSU5HIENPTk5FQ1RJT04gVFlQRVNcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqIEluY29taW5nIGNoYW5uZWwgY29ubmVjdGlvbiBldmVudCAqL1xuZXhwb3J0IGludGVyZmFjZSBUcmFuc3BvcnRJbmNvbWluZ0Nvbm5lY3Rpb24ge1xuICAgIC8qKiBDb25uZWN0aW9uIElEICovXG4gICAgaWQ6IHN0cmluZztcbiAgICAvKiogQ2hhbm5lbCBuYW1lIGJlaW5nIHJlcXVlc3RlZCAqL1xuICAgIGNoYW5uZWw6IHN0cmluZztcbiAgICAvKiogU2VuZGVyIGlkZW50aWZpZXIgKi9cbiAgICBzZW5kZXI6IHN0cmluZztcbiAgICAvKiogVHJhbnNwb3J0IHR5cGUgKi9cbiAgICB0cmFuc3BvcnRUeXBlOiBUcmFuc3BvcnRUeXBlO1xuICAgIC8qKiBNZXNzYWdlUG9ydCBpZiBhcHBsaWNhYmxlICovXG4gICAgcG9ydD86IE1lc3NhZ2VQb3J0O1xuICAgIC8qKiBPcmlnaW5hbCBtZXNzYWdlIGRhdGEgKi9cbiAgICBkYXRhPzogYW55O1xuICAgIC8qKiBUaW1lc3RhbXAgKi9cbiAgICB0aW1lc3RhbXA6IG51bWJlcjtcbn1cblxuLyoqIENvbm5lY3Rpb24gYWNjZXB0ZWQgY2FsbGJhY2sgKi9cbmV4cG9ydCB0eXBlIEFjY2VwdENvbm5lY3Rpb25DYWxsYmFjayA9IChcbiAgICBjb25uZWN0aW9uOiBUcmFuc3BvcnRJbmNvbWluZ0Nvbm5lY3Rpb25cbikgPT4gYm9vbGVhbiB8IFByb21pc2U8Ym9vbGVhbj47XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIEJBU0UgVFJBTlNQT1JUXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBUcmFuc3BvcnRBZGFwdGVyIHtcbiAgICBwcm90ZWN0ZWQgX3N1YnNjcmlwdGlvbnM6IFN1YnNjcmlwdGlvbltdID0gW107XG4gICAgcHJvdGVjdGVkIF9pc0F0dGFjaGVkID0gZmFsc2U7XG4gICAgcHJvdGVjdGVkIF9pbmJvdW5kID0gbmV3IENoYW5uZWxTdWJqZWN0PENoYW5uZWxNZXNzYWdlPih7IGJ1ZmZlclNpemU6IDEwMCB9KTtcbiAgICBwcm90ZWN0ZWQgX291dGJvdW5kID0gbmV3IENoYW5uZWxTdWJqZWN0PENoYW5uZWxNZXNzYWdlPih7IGJ1ZmZlclNpemU6IDEwMCB9KTtcblxuICAgIC8vIEluY29taW5nIGNvbm5lY3Rpb24gb2JzZXJ2YWJpbGl0eVxuICAgIHByb3RlY3RlZCBfaW5jb21pbmdDb25uZWN0aW9ucyA9IG5ldyBDaGFubmVsU3ViamVjdDxUcmFuc3BvcnRJbmNvbWluZ0Nvbm5lY3Rpb24+KHsgYnVmZmVyU2l6ZTogNTAgfSk7XG4gICAgcHJvdGVjdGVkIF9hY2NlcHRDYWxsYmFjazogQWNjZXB0Q29ubmVjdGlvbkNhbGxiYWNrIHwgbnVsbCA9IG51bGw7XG5cbiAgICBjb25zdHJ1Y3RvcihcbiAgICAgICAgcHJvdGVjdGVkIF9jaGFubmVsTmFtZTogc3RyaW5nLFxuICAgICAgICBwcm90ZWN0ZWQgX3RyYW5zcG9ydFR5cGU6IFRyYW5zcG9ydFR5cGUsXG4gICAgICAgIHByb3RlY3RlZCBfb3B0aW9uczogQ29ubmVjdGlvbk9wdGlvbnMgPSB7fVxuICAgICkge31cblxuICAgIGFic3RyYWN0IGF0dGFjaCgpOiB2b2lkO1xuXG4gICAgZGV0YWNoKCk6IHZvaWQge1xuICAgICAgICB0aGlzLl9zdWJzY3JpcHRpb25zLmZvckVhY2goKHMpID0+IHMudW5zdWJzY3JpYmUoKSk7XG4gICAgICAgIHRoaXMuX3N1YnNjcmlwdGlvbnMgPSBbXTtcbiAgICAgICAgdGhpcy5faXNBdHRhY2hlZCA9IGZhbHNlO1xuICAgIH1cblxuICAgIC8qKiBTdWJzY3JpYmUgdG8gaW5jb21pbmcgbWVzc2FnZXMgKi9cbiAgICBzdWJzY3JpYmUob2JzZXJ2ZXI6IE9ic2VydmVyPENoYW5uZWxNZXNzYWdlPiB8ICgodjogQ2hhbm5lbE1lc3NhZ2UpID0+IHZvaWQpKTogU3Vic2NyaXB0aW9uIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2luYm91bmQuc3Vic2NyaWJlKG9ic2VydmVyKTtcbiAgICB9XG5cbiAgICAvKiogU2VuZCBtZXNzYWdlICovXG4gICAgc2VuZChtc2c6IENoYW5uZWxNZXNzYWdlLCB0cmFuc2Zlcj86IFRyYW5zZmVyYWJsZVtdKTogdm9pZCB7XG4gICAgICAgIHRoaXMuX291dGJvdW5kLm5leHQoeyAuLi5tc2csIHRyYW5zZmVyYWJsZTogdHJhbnNmZXIgfSk7XG4gICAgfVxuXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgLy8gSU5DT01JTkcgQ09OTkVDVElPTiBPQlNFUlZBQklMSVRZXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbiAgICAvKipcbiAgICAgKiBPYnNlcnZhYmxlOiBJbmNvbWluZyBjb25uZWN0aW9uIHJlcXVlc3RzXG4gICAgICovXG4gICAgZ2V0IG9uSW5jb21pbmdDb25uZWN0aW9uKCk6IFN1YnNjcmliYWJsZTxUcmFuc3BvcnRJbmNvbWluZ0Nvbm5lY3Rpb24+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2luY29taW5nQ29ubmVjdGlvbnM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogU3Vic2NyaWJlIHRvIGluY29taW5nIGNvbm5lY3Rpb24gcmVxdWVzdHNcbiAgICAgKi9cbiAgICBzdWJzY3JpYmVJbmNvbWluZyhcbiAgICAgICAgaGFuZGxlcjogKGNvbm46IFRyYW5zcG9ydEluY29taW5nQ29ubmVjdGlvbikgPT4gdm9pZFxuICAgICk6IFN1YnNjcmlwdGlvbiB7XG4gICAgICAgIHJldHVybiB0aGlzLl9pbmNvbWluZ0Nvbm5lY3Rpb25zLnN1YnNjcmliZShoYW5kbGVyKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBTZXQgY2FsbGJhY2sgdG8gYXV0by1hY2NlcHQvcmVqZWN0IGNvbm5lY3Rpb25zXG4gICAgICovXG4gICAgc2V0QWNjZXB0Q2FsbGJhY2soY2FsbGJhY2s6IEFjY2VwdENvbm5lY3Rpb25DYWxsYmFjayB8IG51bGwpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fYWNjZXB0Q2FsbGJhY2sgPSBjYWxsYmFjaztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBFbWl0IGluY29taW5nIGNvbm5lY3Rpb24gZXZlbnRcbiAgICAgKiBDYWxsZWQgYnkgc3ViY2xhc3NlcyB3aGVuIGEgbmV3IGNvbm5lY3Rpb24gcmVxdWVzdCBpcyBkZXRlY3RlZFxuICAgICAqL1xuICAgIHByb3RlY3RlZCBfZW1pdEluY29taW5nQ29ubmVjdGlvbihjb25uZWN0aW9uOiBUcmFuc3BvcnRJbmNvbWluZ0Nvbm5lY3Rpb24pOiB2b2lkIHtcbiAgICAgICAgdGhpcy5faW5jb21pbmdDb25uZWN0aW9ucy5uZXh0KGNvbm5lY3Rpb24pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENoZWNrIGlmIGNvbm5lY3Rpb24gc2hvdWxkIGJlIGFjY2VwdGVkICh2aWEgY2FsbGJhY2spXG4gICAgICovXG4gICAgcHJvdGVjdGVkIGFzeW5jIF9zaG91bGRBY2NlcHRDb25uZWN0aW9uKGNvbm5lY3Rpb246IFRyYW5zcG9ydEluY29taW5nQ29ubmVjdGlvbik6IFByb21pc2U8Ym9vbGVhbj4ge1xuICAgICAgICBpZiAoIXRoaXMuX2FjY2VwdENhbGxiYWNrKSByZXR1cm4gdHJ1ZTtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2FjY2VwdENhbGxiYWNrKGNvbm5lY3Rpb24pO1xuICAgIH1cblxuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIC8vIEdFVFRFUlNcbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuICAgIGdldCBjaGFubmVsTmFtZSgpOiBzdHJpbmcgeyByZXR1cm4gdGhpcy5fY2hhbm5lbE5hbWU7IH1cbiAgICBnZXQgaXNBdHRhY2hlZCgpOiBib29sZWFuIHsgcmV0dXJuIHRoaXMuX2lzQXR0YWNoZWQ7IH1cbiAgICBnZXQgaW5ib3VuZCgpOiBTdWJzY3JpYmFibGU8Q2hhbm5lbE1lc3NhZ2U+IHsgcmV0dXJuIHRoaXMuX2luYm91bmQ7IH1cbiAgICBnZXQgb3V0Ym91bmQoKTogU3Vic2NyaWJhYmxlPENoYW5uZWxNZXNzYWdlPiB7IHJldHVybiB0aGlzLl9vdXRib3VuZDsgfVxufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBXT1JLRVIgVFJBTlNQT1JUXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbmV4cG9ydCBjbGFzcyBXb3JrZXJUcmFuc3BvcnQgZXh0ZW5kcyBUcmFuc3BvcnRBZGFwdGVyIHtcbiAgICBwcml2YXRlIF93b3JrZXI6IFdvcmtlciB8IG51bGwgPSBudWxsO1xuICAgIHByaXZhdGUgX2NsZWFudXA6ICgoKSA9PiB2b2lkKSB8IG51bGwgPSBudWxsO1xuICAgIHByaXZhdGUgX293bldvcmtlciA9IGZhbHNlO1xuXG4gICAgY29uc3RydWN0b3IoXG4gICAgICAgIGNoYW5uZWxOYW1lOiBzdHJpbmcsXG4gICAgICAgIHByaXZhdGUgX3dvcmtlclNvdXJjZTogV29ya2VyIHwgVVJMIHwgc3RyaW5nIHwgKCgpID0+IFdvcmtlciksXG4gICAgICAgIG9wdGlvbnM6IENvbm5lY3Rpb25PcHRpb25zID0ge31cbiAgICApIHtcbiAgICAgICAgc3VwZXIoY2hhbm5lbE5hbWUsIFwid29ya2VyXCIsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIGF0dGFjaCgpOiB2b2lkIHtcbiAgICAgICAgaWYgKHRoaXMuX2lzQXR0YWNoZWQpIHJldHVybjtcblxuICAgICAgICB0aGlzLl93b3JrZXIgPSB0aGlzLl9yZXNvbHZlV29ya2VyKCk7XG4gICAgICAgIGNvbnN0IHNlbmQgPSBjcmVhdGVUcmFuc3BvcnRTZW5kZXIodGhpcy5fd29ya2VyKTtcblxuICAgICAgICB0aGlzLl9jbGVhbnVwID0gY3JlYXRlVHJhbnNwb3J0TGlzdGVuZXIoXG4gICAgICAgICAgICB0aGlzLl93b3JrZXIsXG4gICAgICAgICAgICAoZGF0YSkgPT4gdGhpcy5faGFuZGxlSW5jb21pbmcoZGF0YSksXG4gICAgICAgICAgICAoZXJyKSA9PiB0aGlzLl9pbmJvdW5kLmVycm9yKGVycilcbiAgICAgICAgKTtcblxuICAgICAgICB0aGlzLl9zdWJzY3JpcHRpb25zLnB1c2godGhpcy5fb3V0Ym91bmQuc3Vic2NyaWJlKChtc2cpID0+IHNlbmQobXNnLCBtc2cudHJhbnNmZXJhYmxlKSkpO1xuICAgICAgICB0aGlzLl9pc0F0dGFjaGVkID0gdHJ1ZTtcbiAgICB9XG5cbiAgICBkZXRhY2goKTogdm9pZCB7XG4gICAgICAgIHRoaXMuX2NsZWFudXA/LigpO1xuICAgICAgICBpZiAodGhpcy5fb3duV29ya2VyICYmIHRoaXMuX3dvcmtlcikgdGhpcy5fd29ya2VyLnRlcm1pbmF0ZSgpO1xuICAgICAgICB0aGlzLl93b3JrZXIgPSBudWxsO1xuICAgICAgICBzdXBlci5kZXRhY2goKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZXF1ZXN0IGEgbmV3IGNoYW5uZWwgaW4gdGhlIHdvcmtlclxuICAgICAqL1xuICAgIHJlcXVlc3RDaGFubmVsKFxuICAgICAgICBjaGFubmVsOiBzdHJpbmcsXG4gICAgICAgIHNlbmRlcjogc3RyaW5nLFxuICAgICAgICBvcHRpb25zPzogQ29ubmVjdGlvbk9wdGlvbnMsXG4gICAgICAgIHBvcnQ/OiBNZXNzYWdlUG9ydFxuICAgICk6IHZvaWQge1xuICAgICAgICBjb25zdCB0cmFuc2ZlciA9IHBvcnQgPyBbcG9ydF0gOiBbXTtcbiAgICAgICAgdGhpcy5fd29ya2VyPy5wb3N0TWVzc2FnZSh7XG4gICAgICAgICAgICB0eXBlOiBcImNyZWF0ZUNoYW5uZWxcIixcbiAgICAgICAgICAgIGNoYW5uZWwsXG4gICAgICAgICAgICBzZW5kZXIsXG4gICAgICAgICAgICBvcHRpb25zLFxuICAgICAgICAgICAgbWVzc2FnZVBvcnQ6IHBvcnQsXG4gICAgICAgICAgICByZXFJZDogVVVJRHY0KClcbiAgICAgICAgfSwgeyB0cmFuc2ZlciB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDb25uZWN0IHRvIGFuIGV4aXN0aW5nIGNoYW5uZWwgaW4gdGhlIHdvcmtlclxuICAgICAqL1xuICAgIGNvbm5lY3RDaGFubmVsKFxuICAgICAgICBjaGFubmVsOiBzdHJpbmcsXG4gICAgICAgIHNlbmRlcjogc3RyaW5nLFxuICAgICAgICBwb3J0PzogTWVzc2FnZVBvcnQsXG4gICAgICAgIG9wdGlvbnM/OiBDb25uZWN0aW9uT3B0aW9uc1xuICAgICk6IHZvaWQge1xuICAgICAgICBjb25zdCB0cmFuc2ZlciA9IHBvcnQgPyBbcG9ydF0gOiBbXTtcbiAgICAgICAgdGhpcy5fd29ya2VyPy5wb3N0TWVzc2FnZSh7XG4gICAgICAgICAgICB0eXBlOiBcImNvbm5lY3RDaGFubmVsXCIsXG4gICAgICAgICAgICBjaGFubmVsLFxuICAgICAgICAgICAgc2VuZGVyLFxuICAgICAgICAgICAgcG9ydCxcbiAgICAgICAgICAgIG9wdGlvbnMsXG4gICAgICAgICAgICByZXFJZDogVVVJRHY0KClcbiAgICAgICAgfSwgeyB0cmFuc2ZlciB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBMaXN0IGFsbCBjaGFubmVscyBpbiB0aGUgd29ya2VyXG4gICAgICovXG4gICAgbGlzdENoYW5uZWxzKCk6IFByb21pc2U8c3RyaW5nW10+IHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XG4gICAgICAgICAgICBjb25zdCByZXFJZCA9IFVVSUR2NCgpO1xuICAgICAgICAgICAgY29uc3QgaGFuZGxlciA9IChtc2c6IENoYW5uZWxNZXNzYWdlKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKG1zZy50eXBlID09PSBcImNoYW5uZWxMaXN0XCIgJiYgKG1zZyBhcyBhbnkpLnJlcUlkID09PSByZXFJZCkge1xuICAgICAgICAgICAgICAgICAgICBzdWIudW5zdWJzY3JpYmUoKTtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSgobXNnIGFzIGFueSkuY2hhbm5lbHMgPz8gW10pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBjb25zdCBzdWIgPSB0aGlzLl9pbmJvdW5kLnN1YnNjcmliZShoYW5kbGVyKTtcbiAgICAgICAgICAgIHRoaXMuX3dvcmtlcj8ucG9zdE1lc3NhZ2UoeyB0eXBlOiBcImxpc3RDaGFubmVsc1wiLCByZXFJZCB9KTtcblxuICAgICAgICAgICAgLy8gVGltZW91dCBmYWxsYmFja1xuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7IHN1Yi51bnN1YnNjcmliZSgpOyByZXNvbHZlKFtdKTsgfSwgNTAwMCk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHByaXZhdGUgX2hhbmRsZUluY29taW5nKGRhdGE6IGFueSk6IHZvaWQge1xuICAgICAgICAvLyBEZXRlY3QgY2hhbm5lbCBjcmVhdGlvbi9jb25uZWN0aW9uIGV2ZW50c1xuICAgICAgICBpZiAoZGF0YT8udHlwZSA9PT0gXCJjaGFubmVsQ3JlYXRlZFwiIHx8IGRhdGE/LnR5cGUgPT09IFwiY2hhbm5lbENvbm5lY3RlZFwiKSB7XG4gICAgICAgICAgICB0aGlzLl9lbWl0SW5jb21pbmdDb25uZWN0aW9uKHtcbiAgICAgICAgICAgICAgICBpZDogZGF0YS5yZXFJZCA/PyBVVUlEdjQoKSxcbiAgICAgICAgICAgICAgICBjaGFubmVsOiBkYXRhLmNoYW5uZWwsXG4gICAgICAgICAgICAgICAgc2VuZGVyOiBkYXRhLnNlbmRlciA/PyBcIndvcmtlclwiLFxuICAgICAgICAgICAgICAgIHRyYW5zcG9ydFR5cGU6IFwid29ya2VyXCIsXG4gICAgICAgICAgICAgICAgZGF0YSxcbiAgICAgICAgICAgICAgICB0aW1lc3RhbXA6IERhdGUubm93KClcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gRm9yd2FyZCB0byBpbmJvdW5kIHN0cmVhbVxuICAgICAgICB0aGlzLl9pbmJvdW5kLm5leHQoZGF0YSk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBfcmVzb2x2ZVdvcmtlcigpOiBXb3JrZXIge1xuICAgICAgICBpZiAodGhpcy5fd29ya2VyU291cmNlIGluc3RhbmNlb2YgV29ya2VyKSByZXR1cm4gdGhpcy5fd29ya2VyU291cmNlO1xuICAgICAgICB0aGlzLl9vd25Xb3JrZXIgPSB0cnVlO1xuXG4gICAgICAgIGlmICh0eXBlb2YgdGhpcy5fd29ya2VyU291cmNlID09PSBcImZ1bmN0aW9uXCIpIHJldHVybiB0aGlzLl93b3JrZXJTb3VyY2UoKTtcbiAgICAgICAgaWYgKHRoaXMuX3dvcmtlclNvdXJjZSBpbnN0YW5jZW9mIFVSTCkgcmV0dXJuIG5ldyBXb3JrZXIodGhpcy5fd29ya2VyU291cmNlLmhyZWYsIHsgdHlwZTogXCJtb2R1bGVcIiB9KTtcblxuICAgICAgICBpZiAodHlwZW9mIHRoaXMuX3dvcmtlclNvdXJjZSA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgICAgICAgaWYgKHRoaXMuX3dvcmtlclNvdXJjZS5zdGFydHNXaXRoKFwiL1wiKSlcbiAgICAgICAgICAgICAgICByZXR1cm4gbmV3IFdvcmtlcihuZXcgVVJMKHRoaXMuX3dvcmtlclNvdXJjZS5yZXBsYWNlKC9eXFwvLywgXCIuL1wiKSwgaW1wb3J0Lm1ldGEudXJsKS5ocmVmLCB7IHR5cGU6IFwibW9kdWxlXCIgfSk7XG4gICAgICAgICAgICBpZiAoVVJMLmNhblBhcnNlKHRoaXMuX3dvcmtlclNvdXJjZSkgfHwgdGhpcy5fd29ya2VyU291cmNlLnN0YXJ0c1dpdGgoXCIuL1wiKSlcbiAgICAgICAgICAgICAgICByZXR1cm4gbmV3IFdvcmtlcihuZXcgVVJMKHRoaXMuX3dvcmtlclNvdXJjZSwgaW1wb3J0Lm1ldGEudXJsKS5ocmVmLCB7IHR5cGU6IFwibW9kdWxlXCIgfSk7XG4gICAgICAgICAgICByZXR1cm4gbmV3IFdvcmtlcihVUkwuY3JlYXRlT2JqZWN0VVJMKG5ldyBCbG9iKFt0aGlzLl93b3JrZXJTb3VyY2VdLCB7IHR5cGU6IFwiYXBwbGljYXRpb24vamF2YXNjcmlwdFwiIH0pKSwgeyB0eXBlOiBcIm1vZHVsZVwiIH0pO1xuICAgICAgICB9XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIkludmFsaWQgd29ya2VyIHNvdXJjZVwiKTtcbiAgICB9XG5cbiAgICBnZXQgd29ya2VyKCk6IFdvcmtlciB8IG51bGwgeyByZXR1cm4gdGhpcy5fd29ya2VyOyB9XG59XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIE1FU1NBR0UgUE9SVCBUUkFOU1BPUlRcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuZXhwb3J0IGNsYXNzIE1lc3NhZ2VQb3J0VHJhbnNwb3J0IGV4dGVuZHMgVHJhbnNwb3J0QWRhcHRlciB7XG4gICAgcHJpdmF0ZSBfY2xlYW51cDogKCgpID0+IHZvaWQpIHwgbnVsbCA9IG51bGw7XG5cbiAgICBjb25zdHJ1Y3RvcihjaGFubmVsTmFtZTogc3RyaW5nLCBwcml2YXRlIF9wb3J0OiBNZXNzYWdlUG9ydCwgb3B0aW9uczogQ29ubmVjdGlvbk9wdGlvbnMgPSB7fSkge1xuICAgICAgICBzdXBlcihjaGFubmVsTmFtZSwgXCJtZXNzYWdlLXBvcnRcIiwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgYXR0YWNoKCk6IHZvaWQge1xuICAgICAgICBpZiAodGhpcy5faXNBdHRhY2hlZCkgcmV0dXJuO1xuXG4gICAgICAgIGNvbnN0IHNlbmQgPSBjcmVhdGVUcmFuc3BvcnRTZW5kZXIodGhpcy5fcG9ydCk7XG4gICAgICAgIHRoaXMuX2NsZWFudXAgPSBjcmVhdGVUcmFuc3BvcnRMaXN0ZW5lcih0aGlzLl9wb3J0LCAoZGF0YSkgPT4gdGhpcy5faW5ib3VuZC5uZXh0KGRhdGEpKTtcbiAgICAgICAgdGhpcy5fc3Vic2NyaXB0aW9ucy5wdXNoKHRoaXMuX291dGJvdW5kLnN1YnNjcmliZSgobXNnKSA9PiBzZW5kKG1zZywgbXNnLnRyYW5zZmVyYWJsZSkpKTtcbiAgICAgICAgdGhpcy5faXNBdHRhY2hlZCA9IHRydWU7XG4gICAgfVxuXG4gICAgZGV0YWNoKCk6IHZvaWQgeyB0aGlzLl9jbGVhbnVwPy4oKTsgdGhpcy5fcG9ydC5jbG9zZSgpOyBzdXBlci5kZXRhY2goKTsgfVxuICAgIGdldCBwb3J0KCk6IE1lc3NhZ2VQb3J0IHsgcmV0dXJuIHRoaXMuX3BvcnQ7IH1cbn1cblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gQlJPQURDQVNUIENIQU5ORUwgVFJBTlNQT1JUXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbmV4cG9ydCBjbGFzcyBCcm9hZGNhc3RDaGFubmVsVHJhbnNwb3J0IGV4dGVuZHMgVHJhbnNwb3J0QWRhcHRlciB7XG4gICAgcHJpdmF0ZSBfY2hhbm5lbDogQnJvYWRjYXN0Q2hhbm5lbCB8IG51bGwgPSBudWxsO1xuICAgIHByaXZhdGUgX2NsZWFudXA6ICgoKSA9PiB2b2lkKSB8IG51bGwgPSBudWxsO1xuICAgIHByaXZhdGUgX2Nvbm5lY3RlZFBlZXJzID0gbmV3IFNldDxzdHJpbmc+KCk7XG5cbiAgICBjb25zdHJ1Y3RvcihjaGFubmVsTmFtZTogc3RyaW5nLCBwcml2YXRlIF9iY05hbWU/OiBzdHJpbmcsIG9wdGlvbnM6IENvbm5lY3Rpb25PcHRpb25zID0ge30pIHtcbiAgICAgICAgc3VwZXIoY2hhbm5lbE5hbWUsIFwiYnJvYWRjYXN0XCIsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIGF0dGFjaCgpOiB2b2lkIHtcbiAgICAgICAgaWYgKHRoaXMuX2lzQXR0YWNoZWQpIHJldHVybjtcblxuICAgICAgICB0aGlzLl9jaGFubmVsID0gbmV3IEJyb2FkY2FzdENoYW5uZWwodGhpcy5fYmNOYW1lID8/IHRoaXMuX2NoYW5uZWxOYW1lKTtcbiAgICAgICAgY29uc3Qgc2VuZCA9IGNyZWF0ZVRyYW5zcG9ydFNlbmRlcih0aGlzLl9jaGFubmVsKTtcbiAgICAgICAgdGhpcy5fY2xlYW51cCA9IGNyZWF0ZVRyYW5zcG9ydExpc3RlbmVyKHRoaXMuX2NoYW5uZWwsIChkYXRhKSA9PiB7XG4gICAgICAgICAgICBpZiAoZGF0YT8uc2VuZGVyICE9PSB0aGlzLl9jaGFubmVsTmFtZSkge1xuICAgICAgICAgICAgICAgIHRoaXMuX2hhbmRsZUluY29taW5nKGRhdGEpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5fc3Vic2NyaXB0aW9ucy5wdXNoKHRoaXMuX291dGJvdW5kLnN1YnNjcmliZSgobXNnKSA9PiBzZW5kKG1zZykpKTtcbiAgICAgICAgdGhpcy5faXNBdHRhY2hlZCA9IHRydWU7XG5cbiAgICAgICAgLy8gQW5ub3VuY2UgcHJlc2VuY2VcbiAgICAgICAgdGhpcy5fYW5ub3VuY2VQcmVzZW5jZSgpO1xuICAgIH1cblxuICAgIHByaXZhdGUgX2hhbmRsZUluY29taW5nKGRhdGE6IGFueSk6IHZvaWQge1xuICAgICAgICAvLyBEZXRlY3QgY29ubmVjdGlvbiBhbm5vdW5jZW1lbnRzXG4gICAgICAgIGlmIChkYXRhPy50eXBlID09PSBcImFubm91bmNlXCIgfHwgZGF0YT8udHlwZSA9PT0gXCJjb25uZWN0XCIpIHtcbiAgICAgICAgICAgIGNvbnN0IHNlbmRlciA9IGRhdGEuc2VuZGVyID8/IFwidW5rbm93blwiO1xuICAgICAgICAgICAgY29uc3QgaXNOZXcgPSAhdGhpcy5fY29ubmVjdGVkUGVlcnMuaGFzKHNlbmRlcik7XG4gICAgICAgICAgICB0aGlzLl9jb25uZWN0ZWRQZWVycy5hZGQoc2VuZGVyKTtcblxuICAgICAgICAgICAgaWYgKGlzTmV3KSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fZW1pdEluY29taW5nQ29ubmVjdGlvbih7XG4gICAgICAgICAgICAgICAgICAgIGlkOiBkYXRhLnJlcUlkID8/IFVVSUR2NCgpLFxuICAgICAgICAgICAgICAgICAgICBjaGFubmVsOiBkYXRhLmNoYW5uZWwgPz8gdGhpcy5fY2hhbm5lbE5hbWUsXG4gICAgICAgICAgICAgICAgICAgIHNlbmRlcixcbiAgICAgICAgICAgICAgICAgICAgdHJhbnNwb3J0VHlwZTogXCJicm9hZGNhc3RcIixcbiAgICAgICAgICAgICAgICAgICAgZGF0YSxcbiAgICAgICAgICAgICAgICAgICAgdGltZXN0YW1wOiBEYXRlLm5vdygpXG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAvLyBSZXNwb25kIHRvIGFubm91bmNlbWVudFxuICAgICAgICAgICAgICAgIGlmIChkYXRhLnR5cGUgPT09IFwiYW5ub3VuY2VcIikge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9jaGFubmVsPy5wb3N0TWVzc2FnZSh7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBcImFubm91bmNlLWFja1wiLFxuICAgICAgICAgICAgICAgICAgICAgICAgY2hhbm5lbDogdGhpcy5fY2hhbm5lbE5hbWUsXG4gICAgICAgICAgICAgICAgICAgICAgICBzZW5kZXI6IHRoaXMuX2NoYW5uZWxOYW1lXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuX2luYm91bmQubmV4dChkYXRhKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIF9hbm5vdW5jZVByZXNlbmNlKCk6IHZvaWQge1xuICAgICAgICB0aGlzLl9jaGFubmVsPy5wb3N0TWVzc2FnZSh7XG4gICAgICAgICAgICB0eXBlOiBcImFubm91bmNlXCIsXG4gICAgICAgICAgICBjaGFubmVsOiB0aGlzLl9jaGFubmVsTmFtZSxcbiAgICAgICAgICAgIHNlbmRlcjogdGhpcy5fY2hhbm5lbE5hbWUsXG4gICAgICAgICAgICB0aW1lc3RhbXA6IERhdGUubm93KClcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IGNvbm5lY3RlZCBwZWVyc1xuICAgICAqL1xuICAgIGdldCBjb25uZWN0ZWRQZWVycygpOiBzdHJpbmdbXSB7XG4gICAgICAgIHJldHVybiBbLi4udGhpcy5fY29ubmVjdGVkUGVlcnNdO1xuICAgIH1cblxuICAgIGRldGFjaCgpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fY2xlYW51cD8uKCk7XG4gICAgICAgIHRoaXMuX2NoYW5uZWw/LmNsb3NlKCk7XG4gICAgICAgIHRoaXMuX2NoYW5uZWwgPSBudWxsO1xuICAgICAgICB0aGlzLl9jb25uZWN0ZWRQZWVycy5jbGVhcigpO1xuICAgICAgICBzdXBlci5kZXRhY2goKTtcbiAgICB9XG59XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFdFQlNPQ0tFVCBUUkFOU1BPUlRcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuZXhwb3J0IGNsYXNzIFdlYlNvY2tldFRyYW5zcG9ydCBleHRlbmRzIFRyYW5zcG9ydEFkYXB0ZXIge1xuICAgIHByaXZhdGUgX3dzOiBXZWJTb2NrZXQgfCBudWxsID0gbnVsbDtcbiAgICBwcml2YXRlIF9jbGVhbnVwOiAoKCkgPT4gdm9pZCkgfCBudWxsID0gbnVsbDtcbiAgICBwcml2YXRlIF9wZW5kaW5nOiBDaGFubmVsTWVzc2FnZVtdID0gW107XG4gICAgcHJpdmF0ZSBfc3RhdGUgPSBuZXcgQ2hhbm5lbFN1YmplY3Q8XCJjb25uZWN0aW5nXCIgfCBcIm9wZW5cIiB8IFwiY2xvc2luZ1wiIHwgXCJjbG9zZWRcIj4oKTtcbiAgICBwcml2YXRlIF9jb25uZWN0ZWRDaGFubmVscyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuXG4gICAgY29uc3RydWN0b3IoY2hhbm5lbE5hbWU6IHN0cmluZywgcHJpdmF0ZSBfdXJsOiBzdHJpbmcgfCBVUkwsIHByaXZhdGUgX3Byb3RvY29scz86IHN0cmluZyB8IHN0cmluZ1tdLCBvcHRpb25zOiBDb25uZWN0aW9uT3B0aW9ucyA9IHt9KSB7XG4gICAgICAgIHN1cGVyKGNoYW5uZWxOYW1lLCBcIndlYnNvY2tldFwiLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICBhdHRhY2goKTogdm9pZCB7XG4gICAgICAgIGlmICh0aGlzLl9pc0F0dGFjaGVkKSByZXR1cm47XG5cbiAgICAgICAgY29uc3QgdXJsID0gdHlwZW9mIHRoaXMuX3VybCA9PT0gXCJzdHJpbmdcIiA/IHRoaXMuX3VybCA6IHRoaXMuX3VybC5ocmVmO1xuICAgICAgICB0aGlzLl93cyA9IG5ldyBXZWJTb2NrZXQodXJsLCB0aGlzLl9wcm90b2NvbHMpO1xuICAgICAgICB0aGlzLl9zdGF0ZS5uZXh0KFwiY29ubmVjdGluZ1wiKTtcblxuICAgICAgICBjb25zdCBzZW5kOiBTZW5kRm48Q2hhbm5lbE1lc3NhZ2U+ID0gKG1zZykgPT4ge1xuICAgICAgICAgICAgaWYgKHRoaXMuX3dzPy5yZWFkeVN0YXRlID09PSBXZWJTb2NrZXQuT1BFTikge1xuICAgICAgICAgICAgICAgIGNvbnN0IHsgdHJhbnNmZXJhYmxlOiBfLCAuLi5kYXRhIH0gPSBtc2cgYXMgYW55O1xuICAgICAgICAgICAgICAgIHRoaXMuX3dzLnNlbmQoSlNPTi5zdHJpbmdpZnkoZGF0YSkpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9wZW5kaW5nLnB1c2gobXNnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLl93cy5hZGRFdmVudExpc3RlbmVyKFwib3BlblwiLCAoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLl9zdGF0ZS5uZXh0KFwib3BlblwiKTtcbiAgICAgICAgICAgIHRoaXMuX3BlbmRpbmcuZm9yRWFjaCgobSkgPT4gc2VuZChtKSk7XG4gICAgICAgICAgICB0aGlzLl9wZW5kaW5nID0gW107XG5cbiAgICAgICAgICAgIC8vIEVtaXQgc2VsZiBhcyBjb25uZWN0ZWRcbiAgICAgICAgICAgIHRoaXMuX2VtaXRJbmNvbWluZ0Nvbm5lY3Rpb24oe1xuICAgICAgICAgICAgICAgIGlkOiBVVUlEdjQoKSxcbiAgICAgICAgICAgICAgICBjaGFubmVsOiB0aGlzLl9jaGFubmVsTmFtZSxcbiAgICAgICAgICAgICAgICBzZW5kZXI6IFwic2VydmVyXCIsXG4gICAgICAgICAgICAgICAgdHJhbnNwb3J0VHlwZTogXCJ3ZWJzb2NrZXRcIixcbiAgICAgICAgICAgICAgICB0aW1lc3RhbXA6IERhdGUubm93KClcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLl9jbGVhbnVwID0gY3JlYXRlVHJhbnNwb3J0TGlzdGVuZXIoXG4gICAgICAgICAgICB0aGlzLl93cyxcbiAgICAgICAgICAgIChkYXRhKSA9PiB0aGlzLl9oYW5kbGVJbmNvbWluZyhkYXRhKSxcbiAgICAgICAgICAgIChlcnIpID0+IHRoaXMuX2luYm91bmQuZXJyb3IoZXJyKSxcbiAgICAgICAgICAgICgpID0+IHsgdGhpcy5fc3RhdGUubmV4dChcImNsb3NlZFwiKTsgdGhpcy5faW5ib3VuZC5jb21wbGV0ZSgpOyB9XG4gICAgICAgICk7XG5cbiAgICAgICAgdGhpcy5fc3Vic2NyaXB0aW9ucy5wdXNoKHRoaXMuX291dGJvdW5kLnN1YnNjcmliZSgobXNnKSA9PiBzZW5kKG1zZykpKTtcbiAgICAgICAgdGhpcy5faXNBdHRhY2hlZCA9IHRydWU7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBfaGFuZGxlSW5jb21pbmcoZGF0YTogYW55KTogdm9pZCB7XG4gICAgICAgIC8vIERldGVjdCBjaGFubmVsIGNvbm5lY3Rpb24gZXZlbnRzIGZyb20gc2VydmVyXG4gICAgICAgIGlmIChkYXRhPy50eXBlID09PSBcImNoYW5uZWwtY29ubmVjdFwiIHx8IGRhdGE/LnR5cGUgPT09IFwicGVlci1jb25uZWN0XCIgfHwgZGF0YT8udHlwZSA9PT0gXCJqb2luXCIpIHtcbiAgICAgICAgICAgIGNvbnN0IGNoYW5uZWwgPSBkYXRhLmNoYW5uZWwgPz8gZGF0YS5yb29tID8/IHRoaXMuX2NoYW5uZWxOYW1lO1xuICAgICAgICAgICAgY29uc3QgaXNOZXcgPSAhdGhpcy5fY29ubmVjdGVkQ2hhbm5lbHMuaGFzKGNoYW5uZWwpO1xuXG4gICAgICAgICAgICBpZiAoaXNOZXcpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9jb25uZWN0ZWRDaGFubmVscy5hZGQoY2hhbm5lbCk7XG4gICAgICAgICAgICAgICAgdGhpcy5fZW1pdEluY29taW5nQ29ubmVjdGlvbih7XG4gICAgICAgICAgICAgICAgICAgIGlkOiBkYXRhLmlkID8/IFVVSUR2NCgpLFxuICAgICAgICAgICAgICAgICAgICBjaGFubmVsLFxuICAgICAgICAgICAgICAgICAgICBzZW5kZXI6IGRhdGEuc2VuZGVyID8/IGRhdGEucGVlcklkID8/IFwicmVtb3RlXCIsXG4gICAgICAgICAgICAgICAgICAgIHRyYW5zcG9ydFR5cGU6IFwid2Vic29ja2V0XCIsXG4gICAgICAgICAgICAgICAgICAgIGRhdGEsXG4gICAgICAgICAgICAgICAgICAgIHRpbWVzdGFtcDogRGF0ZS5ub3coKVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5faW5ib3VuZC5uZXh0KGRhdGEpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEpvaW4vc3Vic2NyaWJlIHRvIGEgY2hhbm5lbCBvbiB0aGUgc2VydmVyXG4gICAgICovXG4gICAgam9pbkNoYW5uZWwoY2hhbm5lbDogc3RyaW5nKTogdm9pZCB7XG4gICAgICAgIHRoaXMuc2VuZCh7XG4gICAgICAgICAgICBpZDogVVVJRHY0KCksXG4gICAgICAgICAgICB0eXBlOiBcImpvaW5cIixcbiAgICAgICAgICAgIGNoYW5uZWwsXG4gICAgICAgICAgICBzZW5kZXI6IHRoaXMuX2NoYW5uZWxOYW1lLFxuICAgICAgICAgICAgdGltZXN0YW1wOiBEYXRlLm5vdygpXG4gICAgICAgIH0gYXMgQ2hhbm5lbE1lc3NhZ2UpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIExlYXZlL3Vuc3Vic2NyaWJlIGZyb20gYSBjaGFubmVsXG4gICAgICovXG4gICAgbGVhdmVDaGFubmVsKGNoYW5uZWw6IHN0cmluZyk6IHZvaWQge1xuICAgICAgICB0aGlzLl9jb25uZWN0ZWRDaGFubmVscy5kZWxldGUoY2hhbm5lbCk7XG4gICAgICAgIHRoaXMuc2VuZCh7XG4gICAgICAgICAgICBpZDogVVVJRHY0KCksXG4gICAgICAgICAgICB0eXBlOiBcImxlYXZlXCIsXG4gICAgICAgICAgICBjaGFubmVsLFxuICAgICAgICAgICAgc2VuZGVyOiB0aGlzLl9jaGFubmVsTmFtZSxcbiAgICAgICAgICAgIHRpbWVzdGFtcDogRGF0ZS5ub3coKVxuICAgICAgICB9IGFzIENoYW5uZWxNZXNzYWdlKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgY29ubmVjdGVkIGNoYW5uZWxzXG4gICAgICovXG4gICAgZ2V0IGNvbm5lY3RlZENoYW5uZWxzKCk6IHN0cmluZ1tdIHtcbiAgICAgICAgcmV0dXJuIFsuLi50aGlzLl9jb25uZWN0ZWRDaGFubmVsc107XG4gICAgfVxuXG4gICAgZGV0YWNoKCk6IHZvaWQge1xuICAgICAgICB0aGlzLl9jbGVhbnVwPy4oKTtcbiAgICAgICAgdGhpcy5fd3M/LmNsb3NlKCk7XG4gICAgICAgIHRoaXMuX3dzID0gbnVsbDtcbiAgICAgICAgdGhpcy5fY29ubmVjdGVkQ2hhbm5lbHMuY2xlYXIoKTtcbiAgICAgICAgc3VwZXIuZGV0YWNoKCk7XG4gICAgfVxuXG4gICAgZ2V0IHdzKCk6IFdlYlNvY2tldCB8IG51bGwgeyByZXR1cm4gdGhpcy5fd3M7IH1cbiAgICBnZXQgc3RhdGUoKTogU3Vic2NyaWJhYmxlPHN0cmluZz4geyByZXR1cm4gdGhpcy5fc3RhdGU7IH1cbn1cblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gQ0hST01FIFJVTlRJTUUgVFJBTlNQT1JUXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbmV4cG9ydCBjbGFzcyBDaHJvbWVSdW50aW1lVHJhbnNwb3J0IGV4dGVuZHMgVHJhbnNwb3J0QWRhcHRlciB7XG4gICAgcHJpdmF0ZSBfY2xlYW51cDogKCgpID0+IHZvaWQpIHwgbnVsbCA9IG51bGw7XG5cbiAgICBjb25zdHJ1Y3RvcihjaGFubmVsTmFtZTogc3RyaW5nLCBvcHRpb25zOiBDb25uZWN0aW9uT3B0aW9ucyA9IHt9KSB7XG4gICAgICAgIHN1cGVyKGNoYW5uZWxOYW1lLCBcImNocm9tZS1ydW50aW1lXCIsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIGF0dGFjaCgpOiB2b2lkIHtcbiAgICAgICAgaWYgKHRoaXMuX2lzQXR0YWNoZWQpIHJldHVybjtcbiAgICAgICAgaWYgKHR5cGVvZiBjaHJvbWUgPT09IFwidW5kZWZpbmVkXCIgfHwgIWNocm9tZS5ydW50aW1lKSByZXR1cm47XG5cbiAgICAgICAgY29uc3Qgc2VuZCA9IGNyZWF0ZVRyYW5zcG9ydFNlbmRlcihcImNocm9tZS1ydW50aW1lXCIpO1xuICAgICAgICB0aGlzLl9jbGVhbnVwID0gY3JlYXRlVHJhbnNwb3J0TGlzdGVuZXIoXG4gICAgICAgICAgICBcImNocm9tZS10YWJzXCIsXG4gICAgICAgICAgICAoZGF0YSkgPT4gdGhpcy5faW5ib3VuZC5uZXh0KGRhdGEpLFxuICAgICAgICAgICAgdW5kZWZpbmVkLFxuICAgICAgICAgICAgdW5kZWZpbmVkLFxuICAgICAgICAgICAgeyB0YWJJZDogdGhpcy5fdGFiSWQgfVxuICAgICAgICApO1xuICAgICAgICB0aGlzLl9zdWJzY3JpcHRpb25zLnB1c2godGhpcy5fb3V0Ym91bmQuc3Vic2NyaWJlKChtc2cpID0+IHNlbmQobXNnKSkpO1xuICAgICAgICB0aGlzLl9pc0F0dGFjaGVkID0gdHJ1ZTtcbiAgICB9XG5cbiAgICBkZXRhY2goKTogdm9pZCB7IHRoaXMuX2NsZWFudXA/LigpOyBzdXBlci5kZXRhY2goKTsgfVxufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBDSFJPTUUgVEFCUyBUUkFOU1BPUlRcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuZXhwb3J0IGNsYXNzIENocm9tZVRhYnNUcmFuc3BvcnQgZXh0ZW5kcyBUcmFuc3BvcnRBZGFwdGVyIHtcbiAgICBwcml2YXRlIF9jbGVhbnVwOiAoKCkgPT4gdm9pZCkgfCBudWxsID0gbnVsbDtcblxuICAgIGNvbnN0cnVjdG9yKGNoYW5uZWxOYW1lOiBzdHJpbmcsIHByaXZhdGUgX3RhYklkPzogbnVtYmVyLCBvcHRpb25zOiBDb25uZWN0aW9uT3B0aW9ucyA9IHt9KSB7XG4gICAgICAgIHN1cGVyKGNoYW5uZWxOYW1lLCBcImNocm9tZS10YWJzXCIsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIGF0dGFjaCgpOiB2b2lkIHtcbiAgICAgICAgaWYgKHRoaXMuX2lzQXR0YWNoZWQpIHJldHVybjtcbiAgICAgICAgaWYgKHR5cGVvZiBjaHJvbWUgPT09IFwidW5kZWZpbmVkXCIgfHwgIWNocm9tZS50YWJzKSByZXR1cm47XG5cbiAgICAgICAgY29uc3Qgc2VuZDogU2VuZEZuPENoYW5uZWxNZXNzYWdlPiA9IChtc2cpID0+IHtcbiAgICAgICAgICAgIGlmICh0aGlzLl90YWJJZCAhPSBudWxsKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgeyB0cmFuc2ZlcmFibGU6IF8sIC4uLmRhdGEgfSA9IG1zZyBhcyBhbnk7XG4gICAgICAgICAgICAgICAgY2hyb21lLnRhYnMuc2VuZE1lc3NhZ2UodGhpcy5fdGFiSWQsIGRhdGEpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMuX2NsZWFudXAgPSBjcmVhdGVUcmFuc3BvcnRMaXN0ZW5lcihcImNocm9tZS1ydW50aW1lXCIsIChkYXRhKSA9PiB0aGlzLl9pbmJvdW5kLm5leHQoZGF0YSkpO1xuICAgICAgICB0aGlzLl9zdWJzY3JpcHRpb25zLnB1c2godGhpcy5fb3V0Ym91bmQuc3Vic2NyaWJlKChtc2cpID0+IHNlbmQobXNnKSkpO1xuICAgICAgICB0aGlzLl9pc0F0dGFjaGVkID0gdHJ1ZTtcbiAgICB9XG5cbiAgICBkZXRhY2goKTogdm9pZCB7IHRoaXMuX2NsZWFudXA/LigpOyBzdXBlci5kZXRhY2goKTsgfVxuICAgIHNldFRhYklkKHRhYklkOiBudW1iZXIpOiB2b2lkIHsgdGhpcy5fdGFiSWQgPSB0YWJJZDsgfVxufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBDSFJPTUUgUE9SVCBUUkFOU1BPUlRcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuZXhwb3J0IGNsYXNzIENocm9tZVBvcnRUcmFuc3BvcnQgZXh0ZW5kcyBUcmFuc3BvcnRBZGFwdGVyIHtcbiAgICBwcml2YXRlIF9jbGVhbnVwOiAoKCkgPT4gdm9pZCkgfCBudWxsID0gbnVsbDtcbiAgICBwcml2YXRlIF9wb3J0OiBjaHJvbWUucnVudGltZS5Qb3J0IHwgbnVsbCA9IG51bGw7XG5cbiAgICBjb25zdHJ1Y3RvcihcbiAgICAgICAgY2hhbm5lbE5hbWU6IHN0cmluZyxcbiAgICAgICAgcHJpdmF0ZSBfcG9ydE5hbWU6IHN0cmluZyxcbiAgICAgICAgcHJpdmF0ZSBfdGFiSWQ/OiBudW1iZXIsXG4gICAgICAgIG9wdGlvbnM6IENvbm5lY3Rpb25PcHRpb25zID0ge31cbiAgICApIHtcbiAgICAgICAgc3VwZXIoY2hhbm5lbE5hbWUsIFwiY2hyb21lLXBvcnRcIiwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgYXR0YWNoKCk6IHZvaWQge1xuICAgICAgICBpZiAodGhpcy5faXNBdHRhY2hlZCkgcmV0dXJuO1xuICAgICAgICBpZiAodHlwZW9mIGNocm9tZSA9PT0gXCJ1bmRlZmluZWRcIiB8fCAhY2hyb21lLnJ1bnRpbWUpIHJldHVybjtcblxuICAgICAgICB0aGlzLl9wb3J0ID0gdGhpcy5fdGFiSWQgIT0gbnVsbCAmJiBjaHJvbWUudGFicz8uY29ubmVjdFxuICAgICAgICAgICAgPyBjaHJvbWUudGFicy5jb25uZWN0KHRoaXMuX3RhYklkLCB7IG5hbWU6IHRoaXMuX3BvcnROYW1lIH0pXG4gICAgICAgICAgICA6IGNocm9tZS5ydW50aW1lLmNvbm5lY3QoeyBuYW1lOiB0aGlzLl9wb3J0TmFtZSB9KTtcblxuICAgICAgICBjb25zdCBzZW5kID0gKG1zZzogQ2hhbm5lbE1lc3NhZ2UpID0+IHRoaXMuX3BvcnQ/LnBvc3RNZXNzYWdlKG1zZyk7XG4gICAgICAgIGNvbnN0IG9uTWVzc2FnZSA9IChtc2c6IGFueSkgPT4gdGhpcy5faW5ib3VuZC5uZXh0KG1zZyk7XG5cbiAgICAgICAgdGhpcy5fcG9ydC5vbk1lc3NhZ2UuYWRkTGlzdGVuZXIob25NZXNzYWdlKTtcbiAgICAgICAgdGhpcy5fY2xlYW51cCA9ICgpID0+IHtcbiAgICAgICAgICAgIHRyeSB7IHRoaXMuX3BvcnQ/Lm9uTWVzc2FnZS5yZW1vdmVMaXN0ZW5lcihvbk1lc3NhZ2UpOyB9IGNhdGNoIHt9XG4gICAgICAgICAgICB0cnkgeyB0aGlzLl9wb3J0Py5kaXNjb25uZWN0KCk7IH0gY2F0Y2gge31cbiAgICAgICAgICAgIHRoaXMuX3BvcnQgPSBudWxsO1xuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMuX3N1YnNjcmlwdGlvbnMucHVzaCh0aGlzLl9vdXRib3VuZC5zdWJzY3JpYmUoKG1zZykgPT4gc2VuZChtc2cpKSk7XG4gICAgICAgIHRoaXMuX2lzQXR0YWNoZWQgPSB0cnVlO1xuICAgIH1cblxuICAgIGRldGFjaCgpOiB2b2lkIHsgdGhpcy5fY2xlYW51cD8uKCk7IHN1cGVyLmRldGFjaCgpOyB9XG59XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIENIUk9NRSBFWFRFUk5BTCBUUkFOU1BPUlRcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuZXhwb3J0IGNsYXNzIENocm9tZUV4dGVybmFsVHJhbnNwb3J0IGV4dGVuZHMgVHJhbnNwb3J0QWRhcHRlciB7XG4gICAgcHJpdmF0ZSBfY2xlYW51cDogKCgpID0+IHZvaWQpIHwgbnVsbCA9IG51bGw7XG5cbiAgICBjb25zdHJ1Y3RvcihjaGFubmVsTmFtZTogc3RyaW5nLCBwcml2YXRlIF9leHRlcm5hbElkOiBzdHJpbmcsIG9wdGlvbnM6IENvbm5lY3Rpb25PcHRpb25zID0ge30pIHtcbiAgICAgICAgc3VwZXIoY2hhbm5lbE5hbWUsIFwiY2hyb21lLWV4dGVybmFsXCIsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIGF0dGFjaCgpOiB2b2lkIHtcbiAgICAgICAgaWYgKHRoaXMuX2lzQXR0YWNoZWQpIHJldHVybjtcbiAgICAgICAgaWYgKHR5cGVvZiBjaHJvbWUgPT09IFwidW5kZWZpbmVkXCIgfHwgIWNocm9tZS5ydW50aW1lKSByZXR1cm47XG5cbiAgICAgICAgY29uc3Qgc2VuZCA9IChtc2c6IENoYW5uZWxNZXNzYWdlKSA9PiBjaHJvbWUucnVudGltZS5zZW5kTWVzc2FnZSh0aGlzLl9leHRlcm5hbElkLCBtc2cpO1xuICAgICAgICBjb25zdCBsaXN0ZW5lciA9IChtc2c6IGFueSkgPT4ge1xuICAgICAgICAgICAgdGhpcy5faW5ib3VuZC5uZXh0KG1zZyk7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH07XG5cbiAgICAgICAgY2hyb21lLnJ1bnRpbWUub25NZXNzYWdlRXh0ZXJuYWw/LmFkZExpc3RlbmVyPy4obGlzdGVuZXIpO1xuICAgICAgICB0aGlzLl9jbGVhbnVwID0gKCkgPT4gY2hyb21lLnJ1bnRpbWUub25NZXNzYWdlRXh0ZXJuYWw/LnJlbW92ZUxpc3RlbmVyPy4obGlzdGVuZXIpO1xuICAgICAgICB0aGlzLl9zdWJzY3JpcHRpb25zLnB1c2godGhpcy5fb3V0Ym91bmQuc3Vic2NyaWJlKChtc2cpID0+IHNlbmQobXNnKSkpO1xuICAgICAgICB0aGlzLl9pc0F0dGFjaGVkID0gdHJ1ZTtcbiAgICB9XG5cbiAgICBkZXRhY2goKTogdm9pZCB7IHRoaXMuX2NsZWFudXA/LigpOyBzdXBlci5kZXRhY2goKTsgfVxufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBTRVJWSUNFIFdPUktFUiBUUkFOU1BPUlRcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuZXhwb3J0IGNsYXNzIFNlcnZpY2VXb3JrZXJUcmFuc3BvcnQgZXh0ZW5kcyBUcmFuc3BvcnRBZGFwdGVyIHtcbiAgICBwcml2YXRlIF9jbGVhbnVwOiAoKCkgPT4gdm9pZCkgfCBudWxsID0gbnVsbDtcblxuICAgIGNvbnN0cnVjdG9yKGNoYW5uZWxOYW1lOiBzdHJpbmcsIHByaXZhdGUgX2lzSG9zdCA9IGZhbHNlLCBvcHRpb25zOiBDb25uZWN0aW9uT3B0aW9ucyA9IHt9KSB7XG4gICAgICAgIHN1cGVyKGNoYW5uZWxOYW1lLCBcInNlcnZpY2Utd29ya2VyXCIsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIGF0dGFjaCgpOiB2b2lkIHtcbiAgICAgICAgaWYgKHRoaXMuX2lzQXR0YWNoZWQpIHJldHVybjtcblxuICAgICAgICBjb25zdCB0YXJnZXQgPSB0aGlzLl9pc0hvc3QgPyBcInNlcnZpY2Utd29ya2VyLWhvc3RcIiA6IFwic2VydmljZS13b3JrZXItY2xpZW50XCI7XG4gICAgICAgIGNvbnN0IHNlbmQgPSBjcmVhdGVUcmFuc3BvcnRTZW5kZXIodGFyZ2V0IGFzIFRyYW5zcG9ydFRhcmdldCk7XG4gICAgICAgIHRoaXMuX2NsZWFudXAgPSBjcmVhdGVUcmFuc3BvcnRMaXN0ZW5lcih0YXJnZXQgYXMgVHJhbnNwb3J0VGFyZ2V0LCAoZGF0YSkgPT4gdGhpcy5faW5ib3VuZC5uZXh0KGRhdGEpKTtcbiAgICAgICAgdGhpcy5fc3Vic2NyaXB0aW9ucy5wdXNoKHRoaXMuX291dGJvdW5kLnN1YnNjcmliZSgobXNnKSA9PiBzZW5kKG1zZywgbXNnLnRyYW5zZmVyYWJsZSkpKTtcbiAgICAgICAgdGhpcy5faXNBdHRhY2hlZCA9IHRydWU7XG4gICAgfVxuXG4gICAgZGV0YWNoKCk6IHZvaWQgeyB0aGlzLl9jbGVhbnVwPy4oKTsgc3VwZXIuZGV0YWNoKCk7IH1cbn1cblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gU0VMRiBUUkFOU1BPUlQgKGluc2lkZSB3b3JrZXIpXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbmV4cG9ydCBjbGFzcyBTZWxmVHJhbnNwb3J0IGV4dGVuZHMgVHJhbnNwb3J0QWRhcHRlciB7XG4gICAgcHJpdmF0ZSBfY2xlYW51cDogKCgpID0+IHZvaWQpIHwgbnVsbCA9IG51bGw7XG5cbiAgICBjb25zdHJ1Y3RvcihjaGFubmVsTmFtZTogc3RyaW5nLCBvcHRpb25zOiBDb25uZWN0aW9uT3B0aW9ucyA9IHt9KSB7XG4gICAgICAgIHN1cGVyKGNoYW5uZWxOYW1lLCBcInNlbGZcIiwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgYXR0YWNoKCk6IHZvaWQge1xuICAgICAgICBpZiAodGhpcy5faXNBdHRhY2hlZCkgcmV0dXJuO1xuXG4gICAgICAgIGNvbnN0IHNlbmQgPSBjcmVhdGVUcmFuc3BvcnRTZW5kZXIoXCJzZWxmXCIpO1xuICAgICAgICB0aGlzLl9jbGVhbnVwID0gY3JlYXRlVHJhbnNwb3J0TGlzdGVuZXIoXCJzZWxmXCIsIChkYXRhKSA9PiB0aGlzLl9oYW5kbGVJbmNvbWluZyhkYXRhKSk7XG4gICAgICAgIHRoaXMuX3N1YnNjcmlwdGlvbnMucHVzaCh0aGlzLl9vdXRib3VuZC5zdWJzY3JpYmUoKG1zZykgPT4gc2VuZChtc2csIG1zZy50cmFuc2ZlcmFibGUpKSk7XG4gICAgICAgIHRoaXMuX2lzQXR0YWNoZWQgPSB0cnVlO1xuICAgIH1cblxuICAgIHByaXZhdGUgX2hhbmRsZUluY29taW5nKGRhdGE6IGFueSk6IHZvaWQge1xuICAgICAgICAvLyBEZXRlY3QgY2hhbm5lbCBjcmVhdGlvbi9jb25uZWN0aW9uIHJlcXVlc3RzXG4gICAgICAgIGlmIChkYXRhPy50eXBlID09PSBcImNyZWF0ZUNoYW5uZWxcIiB8fCBkYXRhPy50eXBlID09PSBcImNvbm5lY3RDaGFubmVsXCIpIHtcbiAgICAgICAgICAgIHRoaXMuX2VtaXRJbmNvbWluZ0Nvbm5lY3Rpb24oe1xuICAgICAgICAgICAgICAgIGlkOiBkYXRhLnJlcUlkID8/IFVVSUR2NCgpLFxuICAgICAgICAgICAgICAgIGNoYW5uZWw6IGRhdGEuY2hhbm5lbCxcbiAgICAgICAgICAgICAgICBzZW5kZXI6IGRhdGEuc2VuZGVyID8/IFwidW5rbm93blwiLFxuICAgICAgICAgICAgICAgIHRyYW5zcG9ydFR5cGU6IFwic2VsZlwiLFxuICAgICAgICAgICAgICAgIHBvcnQ6IGRhdGEubWVzc2FnZVBvcnQgPz8gZGF0YS5wb3J0LFxuICAgICAgICAgICAgICAgIGRhdGEsXG4gICAgICAgICAgICAgICAgdGltZXN0YW1wOiBEYXRlLm5vdygpXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuX2luYm91bmQubmV4dChkYXRhKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBOb3RpZnkgc2VuZGVyIHRoYXQgY2hhbm5lbCB3YXMgY3JlYXRlZFxuICAgICAqL1xuICAgIG5vdGlmeUNoYW5uZWxDcmVhdGVkKGNoYW5uZWw6IHN0cmluZywgc2VuZGVyOiBzdHJpbmcsIHJlcUlkPzogc3RyaW5nKTogdm9pZCB7XG4gICAgICAgIHBvc3RNZXNzYWdlKHtcbiAgICAgICAgICAgIHR5cGU6IFwiY2hhbm5lbENyZWF0ZWRcIixcbiAgICAgICAgICAgIGNoYW5uZWwsXG4gICAgICAgICAgICBzZW5kZXIsXG4gICAgICAgICAgICByZXFJZCxcbiAgICAgICAgICAgIHRpbWVzdGFtcDogRGF0ZS5ub3coKVxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBkZXRhY2goKTogdm9pZCB7IHRoaXMuX2NsZWFudXA/LigpOyBzdXBlci5kZXRhY2goKTsgfVxufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBGQUNUT1JZXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbmV4cG9ydCBjb25zdCBUcmFuc3BvcnRGYWN0b3J5ID0ge1xuICAgIHdvcmtlcjogKG5hbWU6IHN0cmluZywgc291cmNlOiBXb3JrZXIgfCBVUkwgfCBzdHJpbmcgfCAoKCkgPT4gV29ya2VyKSwgb3B0cz86IENvbm5lY3Rpb25PcHRpb25zKSA9PlxuICAgICAgICBuZXcgV29ya2VyVHJhbnNwb3J0KG5hbWUsIHNvdXJjZSwgb3B0cyksXG5cbiAgICBtZXNzYWdlUG9ydDogKG5hbWU6IHN0cmluZywgcG9ydDogTWVzc2FnZVBvcnQsIG9wdHM/OiBDb25uZWN0aW9uT3B0aW9ucykgPT5cbiAgICAgICAgbmV3IE1lc3NhZ2VQb3J0VHJhbnNwb3J0KG5hbWUsIHBvcnQsIG9wdHMpLFxuXG4gICAgYnJvYWRjYXN0OiAobmFtZTogc3RyaW5nLCBiY05hbWU/OiBzdHJpbmcsIG9wdHM/OiBDb25uZWN0aW9uT3B0aW9ucykgPT5cbiAgICAgICAgbmV3IEJyb2FkY2FzdENoYW5uZWxUcmFuc3BvcnQobmFtZSwgYmNOYW1lLCBvcHRzKSxcblxuICAgIHdlYnNvY2tldDogKG5hbWU6IHN0cmluZywgdXJsOiBzdHJpbmcgfCBVUkwsIHByb3RvY29scz86IHN0cmluZyB8IHN0cmluZ1tdLCBvcHRzPzogQ29ubmVjdGlvbk9wdGlvbnMpID0+XG4gICAgICAgIG5ldyBXZWJTb2NrZXRUcmFuc3BvcnQobmFtZSwgdXJsLCBwcm90b2NvbHMsIG9wdHMpLFxuXG4gICAgY2hyb21lUnVudGltZTogKG5hbWU6IHN0cmluZywgb3B0cz86IENvbm5lY3Rpb25PcHRpb25zKSA9PlxuICAgICAgICBuZXcgQ2hyb21lUnVudGltZVRyYW5zcG9ydChuYW1lLCBvcHRzKSxcblxuICAgIGNocm9tZVRhYnM6IChuYW1lOiBzdHJpbmcsIHRhYklkPzogbnVtYmVyLCBvcHRzPzogQ29ubmVjdGlvbk9wdGlvbnMpID0+XG4gICAgICAgIG5ldyBDaHJvbWVUYWJzVHJhbnNwb3J0KG5hbWUsIHRhYklkLCBvcHRzKSxcblxuICAgIGNocm9tZVBvcnQ6IChuYW1lOiBzdHJpbmcsIHBvcnROYW1lOiBzdHJpbmcsIHRhYklkPzogbnVtYmVyLCBvcHRzPzogQ29ubmVjdGlvbk9wdGlvbnMpID0+XG4gICAgICAgIG5ldyBDaHJvbWVQb3J0VHJhbnNwb3J0KG5hbWUsIHBvcnROYW1lLCB0YWJJZCwgb3B0cyksXG5cbiAgICBjaHJvbWVFeHRlcm5hbDogKG5hbWU6IHN0cmluZywgZXh0ZXJuYWxJZDogc3RyaW5nLCBvcHRzPzogQ29ubmVjdGlvbk9wdGlvbnMpID0+XG4gICAgICAgIG5ldyBDaHJvbWVFeHRlcm5hbFRyYW5zcG9ydChuYW1lLCBleHRlcm5hbElkLCBvcHRzKSxcblxuICAgIHNlcnZpY2VXb3JrZXI6IChuYW1lOiBzdHJpbmcsIGlzSG9zdD86IGJvb2xlYW4sIG9wdHM/OiBDb25uZWN0aW9uT3B0aW9ucykgPT5cbiAgICAgICAgbmV3IFNlcnZpY2VXb3JrZXJUcmFuc3BvcnQobmFtZSwgaXNIb3N0LCBvcHRzKSxcblxuICAgIHNlbGY6IChuYW1lOiBzdHJpbmcsIG9wdHM/OiBDb25uZWN0aW9uT3B0aW9ucykgPT5cbiAgICAgICAgbmV3IFNlbGZUcmFuc3BvcnQobmFtZSwgb3B0cylcbn07XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIENPTk5FQ1RJT04gT0JTRVJWRVIgVVRJTElUSUVTXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKlxuICogQ3JlYXRlIGEgY29ubmVjdGlvbiBvYnNlcnZlciB0aGF0IGFnZ3JlZ2F0ZXMgaW5jb21pbmcgY29ubmVjdGlvbnNcbiAqIGZyb20gbXVsdGlwbGUgdHJhbnNwb3J0c1xuICovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlQ29ubmVjdGlvbk9ic2VydmVyKFxuICAgIHRyYW5zcG9ydHM6IFRyYW5zcG9ydEFkYXB0ZXJbXVxuKToge1xuICAgIHN1YnNjcmliZTogKGhhbmRsZXI6IChjb25uOiBUcmFuc3BvcnRJbmNvbWluZ0Nvbm5lY3Rpb24pID0+IHZvaWQpID0+IFN1YnNjcmlwdGlvbjtcbiAgICBnZXRDb25uZWN0aW9uczogKCkgPT4gVHJhbnNwb3J0SW5jb21pbmdDb25uZWN0aW9uW107XG59IHtcbiAgICBjb25zdCBjb25uZWN0aW9uczogVHJhbnNwb3J0SW5jb21pbmdDb25uZWN0aW9uW10gPSBbXTtcbiAgICBjb25zdCBzdWJqZWN0ID0gbmV3IENoYW5uZWxTdWJqZWN0PFRyYW5zcG9ydEluY29taW5nQ29ubmVjdGlvbj4oeyBidWZmZXJTaXplOiAxMDAgfSk7XG5cbiAgICBmb3IgKGNvbnN0IHRyYW5zcG9ydCBvZiB0cmFuc3BvcnRzKSB7XG4gICAgICAgIHRyYW5zcG9ydC5zdWJzY3JpYmVJbmNvbWluZygoY29ubikgPT4ge1xuICAgICAgICAgICAgY29ubmVjdGlvbnMucHVzaChjb25uKTtcbiAgICAgICAgICAgIHN1YmplY3QubmV4dChjb25uKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgc3Vic2NyaWJlOiAoaGFuZGxlcikgPT4gc3ViamVjdC5zdWJzY3JpYmUoaGFuZGxlciksXG4gICAgICAgIGdldENvbm5lY3Rpb25zOiAoKSA9PiBbLi4uY29ubmVjdGlvbnNdXG4gICAgfTtcbn1cblxuLy8gUmUtZXhwb3J0IHR5cGVzXG5leHBvcnQgdHlwZSB7IFRyYW5zcG9ydFR5cGUsIENvbm5lY3Rpb25PcHRpb25zLCBUcmFuc3BvcnRUYXJnZXQsIFRyYW5zcG9ydEluY29taW5nQ29ubmVjdGlvbiwgQWNjZXB0Q29ubmVjdGlvbkNhbGxiYWNrIH07XG4iXX0=