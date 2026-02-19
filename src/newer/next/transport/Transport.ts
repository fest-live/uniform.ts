/**
 * Transport Adapters - Unified transport implementations
 *
 * Uses core/TransportCore for consistent send/listen patterns.
 * Supports observing incoming channel connections.
 */

import { UUIDv4 } from "fest/core";
import {
    createTransportSender,
    createTransportListener,
    type TransportTarget
} from "../../core/TransportCore";
import type {
    ChannelMessage,
    Subscription,
    Observer,
    TransportType,
    ConnectionOptions,
    SendFn
} from "../types/Interface";
import { ChannelSubject, type Subscribable } from "../observable/Observable";

// ============================================================================
// INCOMING CONNECTION TYPES
// ============================================================================

/** Incoming channel connection event */
export interface TransportIncomingConnection {
    /** Connection ID */
    id: string;
    /** Channel name being requested */
    channel: string;
    /** Sender identifier */
    sender: string;
    /** Transport type */
    transportType: TransportType;
    /** MessagePort if applicable */
    port?: MessagePort;
    /** Original message data */
    data?: any;
    /** Timestamp */
    timestamp: number;
}

/** Connection accepted callback */
export type AcceptConnectionCallback = (
    connection: TransportIncomingConnection
) => boolean | Promise<boolean>;

// ============================================================================
// BASE TRANSPORT
// ============================================================================

export abstract class TransportAdapter {
    protected _subscriptions: Subscription[] = [];
    protected _isAttached = false;
    protected _inbound = new ChannelSubject<ChannelMessage>({ bufferSize: 100 });
    protected _outbound = new ChannelSubject<ChannelMessage>({ bufferSize: 100 });

    // Incoming connection observability
    protected _incomingConnections = new ChannelSubject<TransportIncomingConnection>({ bufferSize: 50 });
    protected _acceptCallback: AcceptConnectionCallback | null = null;

    constructor(
        protected _channelName: string,
        protected _transportType: TransportType,
        protected _options: ConnectionOptions = {}
    ) {}

    abstract attach(): void;

    detach(): void {
        this._subscriptions.forEach((s) => s.unsubscribe());
        this._subscriptions = [];
        this._isAttached = false;
    }

    /** Subscribe to incoming messages */
    subscribe(observer: Observer<ChannelMessage> | ((v: ChannelMessage) => void)): Subscription {
        return this._inbound.subscribe(observer);
    }

    /** Send message */
    send(msg: ChannelMessage, transfer?: Transferable[]): void {
        this._outbound.next({ ...msg, transferable: transfer });
    }

    // ========================================================================
    // INCOMING CONNECTION OBSERVABILITY
    // ========================================================================

    /**
     * Observable: Incoming connection requests
     */
    get onIncomingConnection(): Subscribable<TransportIncomingConnection> {
        return this._incomingConnections;
    }

    /**
     * Subscribe to incoming connection requests
     */
    subscribeIncoming(
        handler: (conn: TransportIncomingConnection) => void
    ): Subscription {
        return this._incomingConnections.subscribe(handler);
    }

    /**
     * Set callback to auto-accept/reject connections
     */
    setAcceptCallback(callback: AcceptConnectionCallback | null): void {
        this._acceptCallback = callback;
    }

    /**
     * Emit incoming connection event
     * Called by subclasses when a new connection request is detected
     */
    protected _emitIncomingConnection(connection: TransportIncomingConnection): void {
        this._incomingConnections.next(connection);
    }

    /**
     * Check if connection should be accepted (via callback)
     */
    protected async _shouldAcceptConnection(connection: TransportIncomingConnection): Promise<boolean> {
        if (!this._acceptCallback) return true;
        return this._acceptCallback(connection);
    }

    // ========================================================================
    // GETTERS
    // ========================================================================

    get channelName(): string { return this._channelName; }
    get isAttached(): boolean { return this._isAttached; }
    get inbound(): Subscribable<ChannelMessage> { return this._inbound; }
    get outbound(): Subscribable<ChannelMessage> { return this._outbound; }
}

// ============================================================================
// WORKER TRANSPORT
// ============================================================================

export class WorkerTransport extends TransportAdapter {
    private _worker: Worker | null = null;
    private _cleanup: (() => void) | null = null;
    private _ownWorker = false;

    constructor(
        channelName: string,
        private _workerSource: Worker | URL | string | (() => Worker),
        options: ConnectionOptions = {}
    ) {
        super(channelName, "worker", options);
    }

    attach(): void {
        if (this._isAttached) return;

        this._worker = this._resolveWorker();
        const send = createTransportSender(this._worker);

        this._cleanup = createTransportListener(
            this._worker,
            (data) => this._handleIncoming(data),
            (err) => this._inbound.error(err)
        );

        this._subscriptions.push(this._outbound.subscribe((msg) => send(msg, msg.transferable)));
        this._isAttached = true;
    }

    detach(): void {
        this._cleanup?.();
        if (this._ownWorker && this._worker) this._worker.terminate();
        this._worker = null;
        super.detach();
    }

    /**
     * Request a new channel in the worker
     */
    requestChannel(
        channel: string,
        sender: string,
        options?: ConnectionOptions,
        port?: MessagePort
    ): void {
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
    connectChannel(
        channel: string,
        sender: string,
        port?: MessagePort,
        options?: ConnectionOptions
    ): void {
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
    listChannels(): Promise<string[]> {
        return new Promise((resolve) => {
            const reqId = UUIDv4();
            const handler = (msg: ChannelMessage) => {
                if (msg.type === "channelList" && (msg as any).reqId === reqId) {
                    sub.unsubscribe();
                    resolve((msg as any).channels ?? []);
                }
            };
            const sub = this._inbound.subscribe(handler);
            this._worker?.postMessage({ type: "listChannels", reqId });

            // Timeout fallback
            setTimeout(() => { sub.unsubscribe(); resolve([]); }, 5000);
        });
    }

    private _handleIncoming(data: any): void {
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

    private _resolveWorker(): Worker {
        if (this._workerSource instanceof Worker) return this._workerSource;
        this._ownWorker = true;

        if (typeof this._workerSource === "function") return this._workerSource();
        if (this._workerSource instanceof URL) return new Worker(this._workerSource.href, { type: "module" });

        if (typeof this._workerSource === "string") {
            if (this._workerSource.startsWith("/"))
                return new Worker(new URL(this._workerSource.replace(/^\//, "./"), import.meta.url).href, { type: "module" });
            if (URL.canParse(this._workerSource) || this._workerSource.startsWith("./"))
                return new Worker(new URL(this._workerSource, import.meta.url).href, { type: "module" });
            return new Worker(URL.createObjectURL(new Blob([this._workerSource], { type: "application/javascript" })), { type: "module" });
        }
        throw new Error("Invalid worker source");
    }

    get worker(): Worker | null { return this._worker; }
}

// ============================================================================
// MESSAGE PORT TRANSPORT
// ============================================================================

export class MessagePortTransport extends TransportAdapter {
    private _cleanup: (() => void) | null = null;

    constructor(channelName: string, private _port: MessagePort, options: ConnectionOptions = {}) {
        super(channelName, "message-port", options);
    }

    attach(): void {
        if (this._isAttached) return;

        const send = createTransportSender(this._port);
        this._cleanup = createTransportListener(this._port, (data) => this._inbound.next(data));
        this._subscriptions.push(this._outbound.subscribe((msg) => send(msg, msg.transferable)));
        this._isAttached = true;
    }

    detach(): void { this._cleanup?.(); this._port.close(); super.detach(); }
    get port(): MessagePort { return this._port; }
}

// ============================================================================
// BROADCAST CHANNEL TRANSPORT
// ============================================================================

export class BroadcastChannelTransport extends TransportAdapter {
    private _channel: BroadcastChannel | null = null;
    private _cleanup: (() => void) | null = null;
    private _connectedPeers = new Set<string>();

    constructor(channelName: string, private _bcName?: string, options: ConnectionOptions = {}) {
        super(channelName, "broadcast", options);
    }

    attach(): void {
        if (this._isAttached) return;

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

    private _handleIncoming(data: any): void {
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

    private _announcePresence(): void {
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
    get connectedPeers(): string[] {
        return [...this._connectedPeers];
    }

    detach(): void {
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
    private _ws: WebSocket | null = null;
    private _cleanup: (() => void) | null = null;
    private _pending: ChannelMessage[] = [];
    private _state = new ChannelSubject<"connecting" | "open" | "closing" | "closed">();
    private _connectedChannels = new Set<string>();

    constructor(channelName: string, private _url: string | URL, private _protocols?: string | string[], options: ConnectionOptions = {}) {
        super(channelName, "websocket", options);
    }

    attach(): void {
        if (this._isAttached) return;

        const url = typeof this._url === "string" ? this._url : this._url.href;
        this._ws = new WebSocket(url, this._protocols);
        this._state.next("connecting");

        const send: SendFn<ChannelMessage> = (msg) => {
            if (this._ws?.readyState === WebSocket.OPEN) {
                const { transferable: _, ...data } = msg as any;
                this._ws.send(JSON.stringify(data));
            } else {
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

        this._cleanup = createTransportListener(
            this._ws,
            (data) => this._handleIncoming(data),
            (err) => this._inbound.error(err),
            () => { this._state.next("closed"); this._inbound.complete(); }
        );

        this._subscriptions.push(this._outbound.subscribe((msg) => send(msg)));
        this._isAttached = true;
    }

    private _handleIncoming(data: any): void {
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
    joinChannel(channel: string): void {
        this.send({
            id: UUIDv4(),
            type: "join",
            channel,
            sender: this._channelName,
            timestamp: Date.now()
        } as ChannelMessage);
    }

    /**
     * Leave/unsubscribe from a channel
     */
    leaveChannel(channel: string): void {
        this._connectedChannels.delete(channel);
        this.send({
            id: UUIDv4(),
            type: "leave",
            channel,
            sender: this._channelName,
            timestamp: Date.now()
        } as ChannelMessage);
    }

    /**
     * Get connected channels
     */
    get connectedChannels(): string[] {
        return [...this._connectedChannels];
    }

    detach(): void {
        this._cleanup?.();
        this._ws?.close();
        this._ws = null;
        this._connectedChannels.clear();
        super.detach();
    }

    get ws(): WebSocket | null { return this._ws; }
    get state(): Subscribable<string> { return this._state; }
}

// ============================================================================
// CHROME RUNTIME TRANSPORT
// ============================================================================

export class ChromeRuntimeTransport extends TransportAdapter {
    private _cleanup: (() => void) | null = null;

    constructor(channelName: string, options: ConnectionOptions = {}) {
        super(channelName, "chrome-runtime", options);
    }

    attach(): void {
        if (this._isAttached) return;
        if (typeof chrome === "undefined" || !chrome.runtime) return;

        const send = createTransportSender("chrome-runtime");
        this._cleanup = createTransportListener(
            "chrome-tabs",
            (data) => this._inbound.next(data),
            undefined,
            undefined,
            { tabId: this._tabId }
        );
        this._subscriptions.push(this._outbound.subscribe((msg) => send(msg)));
        this._isAttached = true;
    }

    detach(): void { this._cleanup?.(); super.detach(); }
}

// ============================================================================
// CHROME TABS TRANSPORT
// ============================================================================

export class ChromeTabsTransport extends TransportAdapter {
    private _cleanup: (() => void) | null = null;

    constructor(channelName: string, private _tabId?: number, options: ConnectionOptions = {}) {
        super(channelName, "chrome-tabs", options);
    }

    attach(): void {
        if (this._isAttached) return;
        if (typeof chrome === "undefined" || !chrome.tabs) return;

        const send: SendFn<ChannelMessage> = (msg) => {
            if (this._tabId != null) {
                const { transferable: _, ...data } = msg as any;
                chrome.tabs.sendMessage(this._tabId, data);
            }
        };

        this._cleanup = createTransportListener("chrome-runtime", (data) => this._inbound.next(data));
        this._subscriptions.push(this._outbound.subscribe((msg) => send(msg)));
        this._isAttached = true;
    }

    detach(): void { this._cleanup?.(); super.detach(); }
    setTabId(tabId: number): void { this._tabId = tabId; }
}

// ============================================================================
// CHROME PORT TRANSPORT
// ============================================================================

export class ChromePortTransport extends TransportAdapter {
    private _cleanup: (() => void) | null = null;
    private _port: chrome.runtime.Port | null = null;

    constructor(
        channelName: string,
        private _portName: string,
        private _tabId?: number,
        options: ConnectionOptions = {}
    ) {
        super(channelName, "chrome-port", options);
    }

    attach(): void {
        if (this._isAttached) return;
        if (typeof chrome === "undefined" || !chrome.runtime) return;

        this._port = this._tabId != null && chrome.tabs?.connect
            ? chrome.tabs.connect(this._tabId, { name: this._portName })
            : chrome.runtime.connect({ name: this._portName });

        const send = (msg: ChannelMessage) => this._port?.postMessage(msg);
        const onMessage = (msg: any) => this._inbound.next(msg);

        this._port.onMessage.addListener(onMessage);
        this._cleanup = () => {
            try { this._port?.onMessage.removeListener(onMessage); } catch {}
            try { this._port?.disconnect(); } catch {}
            this._port = null;
        };

        this._subscriptions.push(this._outbound.subscribe((msg) => send(msg)));
        this._isAttached = true;
    }

    detach(): void { this._cleanup?.(); super.detach(); }
}

// ============================================================================
// CHROME EXTERNAL TRANSPORT
// ============================================================================

export class ChromeExternalTransport extends TransportAdapter {
    private _cleanup: (() => void) | null = null;

    constructor(channelName: string, private _externalId: string, options: ConnectionOptions = {}) {
        super(channelName, "chrome-external", options);
    }

    attach(): void {
        if (this._isAttached) return;
        if (typeof chrome === "undefined" || !chrome.runtime) return;

        const send = (msg: ChannelMessage) => chrome.runtime.sendMessage(this._externalId, msg);
        const listener = (msg: any) => {
            this._inbound.next(msg);
            return false;
        };

        chrome.runtime.onMessageExternal?.addListener?.(listener);
        this._cleanup = () => chrome.runtime.onMessageExternal?.removeListener?.(listener);
        this._subscriptions.push(this._outbound.subscribe((msg) => send(msg)));
        this._isAttached = true;
    }

    detach(): void { this._cleanup?.(); super.detach(); }
}

// ============================================================================
// SERVICE WORKER TRANSPORT
// ============================================================================

export class ServiceWorkerTransport extends TransportAdapter {
    private _cleanup: (() => void) | null = null;

    constructor(channelName: string, private _isHost = false, options: ConnectionOptions = {}) {
        super(channelName, "service-worker", options);
    }

    attach(): void {
        if (this._isAttached) return;

        const target = this._isHost ? "service-worker-host" : "service-worker-client";
        const send = createTransportSender(target as TransportTarget);
        this._cleanup = createTransportListener(target as TransportTarget, (data) => this._inbound.next(data));
        this._subscriptions.push(this._outbound.subscribe((msg) => send(msg, msg.transferable)));
        this._isAttached = true;
    }

    detach(): void { this._cleanup?.(); super.detach(); }
}

// ============================================================================
// SELF TRANSPORT (inside worker)
// ============================================================================

export class SelfTransport extends TransportAdapter {
    private _cleanup: (() => void) | null = null;

    constructor(channelName: string, options: ConnectionOptions = {}) {
        super(channelName, "self", options);
    }

    attach(): void {
        if (this._isAttached) return;

        const send = createTransportSender("self");
        this._cleanup = createTransportListener("self", (data) => this._handleIncoming(data));
        this._subscriptions.push(this._outbound.subscribe((msg) => send(msg, msg.transferable)));
        this._isAttached = true;
    }

    private _handleIncoming(data: any): void {
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
    notifyChannelCreated(channel: string, sender: string, reqId?: string): void {
        postMessage({
            type: "channelCreated",
            channel,
            sender,
            reqId,
            timestamp: Date.now()
        });
    }

    detach(): void { this._cleanup?.(); super.detach(); }
}

// ============================================================================
// FACTORY
// ============================================================================

export const TransportFactory = {
    worker: (name: string, source: Worker | URL | string | (() => Worker), opts?: ConnectionOptions) =>
        new WorkerTransport(name, source, opts),

    messagePort: (name: string, port: MessagePort, opts?: ConnectionOptions) =>
        new MessagePortTransport(name, port, opts),

    broadcast: (name: string, bcName?: string, opts?: ConnectionOptions) =>
        new BroadcastChannelTransport(name, bcName, opts),

    websocket: (name: string, url: string | URL, protocols?: string | string[], opts?: ConnectionOptions) =>
        new WebSocketTransport(name, url, protocols, opts),

    chromeRuntime: (name: string, opts?: ConnectionOptions) =>
        new ChromeRuntimeTransport(name, opts),

    chromeTabs: (name: string, tabId?: number, opts?: ConnectionOptions) =>
        new ChromeTabsTransport(name, tabId, opts),

    chromePort: (name: string, portName: string, tabId?: number, opts?: ConnectionOptions) =>
        new ChromePortTransport(name, portName, tabId, opts),

    chromeExternal: (name: string, externalId: string, opts?: ConnectionOptions) =>
        new ChromeExternalTransport(name, externalId, opts),

    serviceWorker: (name: string, isHost?: boolean, opts?: ConnectionOptions) =>
        new ServiceWorkerTransport(name, isHost, opts),

    self: (name: string, opts?: ConnectionOptions) =>
        new SelfTransport(name, opts)
};

// ============================================================================
// CONNECTION OBSERVER UTILITIES
// ============================================================================

/**
 * Create a connection observer that aggregates incoming connections
 * from multiple transports
 */
export function createConnectionObserver(
    transports: TransportAdapter[]
): {
    subscribe: (handler: (conn: TransportIncomingConnection) => void) => Subscription;
    getConnections: () => TransportIncomingConnection[];
} {
    const connections: TransportIncomingConnection[] = [];
    const subject = new ChannelSubject<TransportIncomingConnection>({ bufferSize: 100 });

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

// Re-export types
export type { TransportType, ConnectionOptions, TransportTarget, TransportIncomingConnection, AcceptConnectionCallback };
