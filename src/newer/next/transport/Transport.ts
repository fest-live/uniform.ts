/**
 * Transport Adapters - Unified transport implementations
 *
 * Uses core/TransportCore for consistent send/listen patterns.
 */

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
// BASE TRANSPORT
// ============================================================================

export abstract class TransportAdapter {
    protected _subscriptions: Subscription[] = [];
    protected _isAttached = false;
    protected _inbound = new ChannelSubject<ChannelMessage>({ bufferSize: 100 });
    protected _outbound = new ChannelSubject<ChannelMessage>({ bufferSize: 100 });

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
            (data) => this._inbound.next(data),
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

    constructor(channelName: string, private _bcName?: string, options: ConnectionOptions = {}) {
        super(channelName, "broadcast", options);
    }

    attach(): void {
        if (this._isAttached) return;

        this._channel = new BroadcastChannel(this._bcName ?? this._channelName);
        const send = createTransportSender(this._channel);
        this._cleanup = createTransportListener(this._channel, (data) => {
            if (data?.sender !== this._channelName) this._inbound.next(data);
        });
        this._subscriptions.push(this._outbound.subscribe((msg) => send(msg)));
        this._isAttached = true;
    }

    detach(): void { this._cleanup?.(); this._channel?.close(); this._channel = null; super.detach(); }
}

// ============================================================================
// WEBSOCKET TRANSPORT
// ============================================================================

export class WebSocketTransport extends TransportAdapter {
    private _ws: WebSocket | null = null;
    private _cleanup: (() => void) | null = null;
    private _pending: ChannelMessage[] = [];
    private _state = new ChannelSubject<"connecting" | "open" | "closing" | "closed">();

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
        });

        this._cleanup = createTransportListener(
            this._ws,
            (data) => this._inbound.next(data),
            (err) => this._inbound.error(err),
            () => { this._state.next("closed"); this._inbound.complete(); }
        );

        this._subscriptions.push(this._outbound.subscribe((msg) => send(msg)));
        this._isAttached = true;
    }

    detach(): void { this._cleanup?.(); this._ws?.close(); this._ws = null; super.detach(); }
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
        this._cleanup = createTransportListener("chrome-runtime", (data) => this._inbound.next(data));
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
        this._cleanup = createTransportListener("self", (data) => this._inbound.next(data));
        this._subscriptions.push(this._outbound.subscribe((msg) => send(msg, msg.transferable)));
        this._isAttached = true;
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

    serviceWorker: (name: string, isHost?: boolean, opts?: ConnectionOptions) =>
        new ServiceWorkerTransport(name, isHost, opts),

    self: (name: string, opts?: ConnectionOptions) =>
        new SelfTransport(name, opts)
};

// Re-export types
export type { TransportType, ConnectionOptions, TransportTarget };
