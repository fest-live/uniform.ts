/**
 * Transport Observable - Observable wrappers for transports
 *
 * Direct Observable wrapper:
 * - next() → postMessage/send
 * - subscribe() → addEventListener
 */

import {
    createTransportSender,
    createTransportListener,
    type TransportTarget
} from "../../core/TransportCore";
import type { ChannelMessage, Observer, Subscription, Subscribable } from "../types/Interface";
import { ChannelSubject } from "../observable/Observable";

// ============================================================================
// BASE TRANSPORT OBSERVABLE
// ============================================================================

export abstract class TransportObservable<T = ChannelMessage> implements Subscribable<T> {
    protected _subs = new Set<Observer<T>>();
    protected _listening = false;
    protected _cleanup: (() => void) | null = null;

    abstract next(value: T, transfer?: Transferable[]): void;

    subscribe(observerOrNext: Observer<T> | ((v: T) => void)): Subscription {
        const obs: Observer<T> = typeof observerOrNext === "function" ? { next: observerOrNext } : observerOrNext;
        const first = this._subs.size === 0;
        this._subs.add(obs);

        if (first && !this._listening) this._activate();

        return {
            closed: false,
            unsubscribe: () => {
                this._subs.delete(obs);
                if (this._subs.size === 0 && this._listening) this._deactivate();
            }
        };
    }

    protected abstract _activate(): void;

    protected _deactivate(): void {
        this._cleanup?.();
        this._cleanup = null;
        this._listening = false;
    }

    protected _dispatch(value: T): void {
        for (const s of this._subs) {
            try { s.next?.(value); }
            catch (e) { s.error?.(e as Error); }
        }
    }

    protected _error(err: Error): void {
        for (const s of this._subs) s.error?.(err);
    }

    protected _complete(): void {
        for (const s of this._subs) s.complete?.();
        this._subs.clear();
        this._deactivate();
    }

    close(): void { this._complete(); }
    get subscriberCount(): number { return this._subs.size; }
    get isListening(): boolean { return this._listening; }
}

// ============================================================================
// CONCRETE IMPLEMENTATIONS
// ============================================================================

/** Worker Observable */
export class WorkerObservable extends TransportObservable<ChannelMessage> {
    private _send: ReturnType<typeof createTransportSender>;

    constructor(private _worker: Worker) {
        super();
        this._send = createTransportSender(this._worker);
    }

    next(value: ChannelMessage, transfer?: Transferable[]): void { this._send(value, transfer); }

    protected _activate(): void {
        if (this._listening) return;
        this._cleanup = createTransportListener(this._worker, (d) => this._dispatch(d), (e) => this._error(e));
        this._listening = true;
    }

    terminate(): void { this._worker.terminate(); this._complete(); }
    get worker(): Worker { return this._worker; }
}

/** MessagePort Observable */
export class MessagePortObservable extends TransportObservable<ChannelMessage> {
    private _send: ReturnType<typeof createTransportSender>;

    constructor(private _port: MessagePort) {
        super();
        this._send = createTransportSender(this._port);
    }

    next(value: ChannelMessage, transfer?: Transferable[]): void { this._send(value, transfer); }

    protected _activate(): void {
        if (this._listening) return;
        this._cleanup = createTransportListener(this._port, (d) => this._dispatch(d));
        this._listening = true;
    }

    get port(): MessagePort { return this._port; }
}

/** BroadcastChannel Observable */
export class BroadcastChannelObservable extends TransportObservable<ChannelMessage> {
    private _channel: BroadcastChannel;
    private _send: ReturnType<typeof createTransportSender>;

    constructor(private _name: string) {
        super();
        this._channel = new BroadcastChannel(_name);
        this._send = createTransportSender(this._channel);
    }

    next(value: ChannelMessage): void { this._send(value); }

    protected _activate(): void {
        if (this._listening) return;
        this._cleanup = createTransportListener(this._channel, (d) => {
            if (d?.sender !== this._name) this._dispatch(d);
        });
        this._listening = true;
    }

    close(): void { this._channel.close(); super.close(); }
}

/** WebSocket Observable */
export class WebSocketObservable extends TransportObservable<ChannelMessage> {
    private _ws: WebSocket | null = null;
    private _pending: ChannelMessage[] = [];
    private _state = new ChannelSubject<"connecting" | "open" | "closing" | "closed">();

    constructor(private _url: string | URL, private _protocols?: string | string[]) { super(); }

    connect(): void {
        if (this._ws) return;
        const url = typeof this._url === "string" ? this._url : this._url.href;
        this._ws = new WebSocket(url, this._protocols);
        this._state.next("connecting");

        this._ws.addEventListener("open", () => {
            this._state.next("open");
            this._pending.forEach((m) => this.next(m));
            this._pending = [];
        });

        this._cleanup = createTransportListener(
            this._ws,
            (d) => this._dispatch(d),
            (e) => this._error(e),
            () => { this._state.next("closed"); this._complete(); }
        );
        this._listening = true;
    }

    next(value: ChannelMessage): void {
        if (!this._ws || this._ws.readyState !== WebSocket.OPEN) {
            this._pending.push(value);
            return;
        }
        const { transferable: _, ...data } = value as any;
        this._ws.send(JSON.stringify(data));
    }

    protected _activate(): void { if (!this._ws) this.connect(); }

    close(code?: number, reason?: string): void {
        this._state.next("closing");
        this._ws?.close(code, reason);
        this._ws = null;
        super.close();
    }

    get state(): Subscribable<string> { return this._state; }
    get isOpen(): boolean { return this._ws?.readyState === WebSocket.OPEN; }
}

/** Chrome Runtime Observable */
export class ChromeRuntimeObservable extends TransportObservable<ChannelMessage> {
    private _send = createTransportSender("chrome-runtime");

    next(value: ChannelMessage): void { this._send(value); }

    protected _activate(): void {
        if (this._listening) return;
        this._cleanup = createTransportListener("chrome-runtime", (d) => this._dispatch(d));
        this._listening = true;
    }
}

/** Chrome Tabs Observable */
export class ChromeTabsObservable extends TransportObservable<ChannelMessage> {
    constructor(private _tabId?: number) { super(); }

    setTabId(id: number): void { this._tabId = id; }

    next(value: ChannelMessage): void {
        if (this._tabId == null || typeof chrome === "undefined" || !chrome.tabs) return;
        const { transferable: _, ...data } = value as any;
        chrome.tabs.sendMessage(this._tabId, data);
    }

    protected _activate(): void {
        if (this._listening) return;
        this._cleanup = createTransportListener(
            "chrome-tabs",
            (d) => this._dispatch(d),
            undefined,
            undefined,
            { tabId: this._tabId }
        );
        this._listening = true;
    }
}

/** Chrome Port Observable */
export class ChromePortObservable extends TransportObservable<ChannelMessage> {
    private _send: ReturnType<typeof createTransportSender>;

    constructor(private _portName: string, private _tabId?: number) {
        super();
        this._send = createTransportSender("chrome-port", { portName: _portName, tabId: _tabId });
    }

    next(value: ChannelMessage): void {
        this._send(value);
    }

    protected _activate(): void {
        if (this._listening) return;
        this._cleanup = createTransportListener(
            "chrome-port",
            (d) => this._dispatch(d),
            undefined,
            undefined,
            { portName: this._portName, tabId: this._tabId }
        );
        this._listening = true;
    }
}

/** ServiceWorker Client Observable */
export class ServiceWorkerClientObservable extends TransportObservable<ChannelMessage> {
    private _send = createTransportSender("service-worker-client");

    next(value: ChannelMessage, transfer?: Transferable[]): void { this._send(value, transfer); }

    protected _activate(): void {
        if (this._listening) return;
        this._cleanup = createTransportListener("service-worker-client", (d) => this._dispatch(d));
        this._listening = true;
    }
}

/** ServiceWorker Host Observable */
export class ServiceWorkerHostObservable extends TransportObservable<ChannelMessage & { _clientId?: string }> {
    private _send = createTransportSender("service-worker-host");

    next(value: ChannelMessage & { _clientId?: string }, transfer?: Transferable[]): void {
        this._send(value, transfer);
    }

    protected _activate(): void {
        if (this._listening) return;
        this._cleanup = createTransportListener("service-worker-host", (d) => this._dispatch(d));
        this._listening = true;
    }
}

/** Self Observable (inside worker) */
export class SelfObservable extends TransportObservable<ChannelMessage> {
    private _send = createTransportSender("self");

    next(value: ChannelMessage, transfer?: Transferable[]): void { this._send(value, transfer); }

    protected _activate(): void {
        if (this._listening) return;
        this._cleanup = createTransportListener("self", (d) => this._dispatch(d));
        this._listening = true;
    }
}

// ============================================================================
// FACTORY
// ============================================================================

export const TransportObservableFactory = {
    worker: (w: Worker) => new WorkerObservable(w),
    workerFromUrl: (url: string | URL, opts?: WorkerOptions) =>
        new WorkerObservable(new Worker(typeof url === "string" ? url : url.href, { type: "module", ...opts })),
    messagePort: (p: MessagePort) => new MessagePortObservable(p),
    messageChannel: () => {
        const ch = new MessageChannel();
        return { port1: new MessagePortObservable(ch.port1), port2: new MessagePortObservable(ch.port2) };
    },
    broadcast: (name: string) => new BroadcastChannelObservable(name),
    websocket: (url: string | URL, protocols?: string | string[]) => new WebSocketObservable(url, protocols),
    chromeRuntime: () => new ChromeRuntimeObservable(),
    chromeTabs: (tabId?: number) => new ChromeTabsObservable(tabId),
    chromePort: (portName: string, tabId?: number) => new ChromePortObservable(portName, tabId),
    serviceWorkerClient: () => new ServiceWorkerClientObservable(),
    serviceWorkerHost: () => new ServiceWorkerHostObservable(),
    self: () => new SelfObservable()
};

// ============================================================================
// BIDIRECTIONAL CHANNEL
// ============================================================================

export function createBidirectionalChannel<T = ChannelMessage>(
    outbound: TransportObservable<T>,
    inbound: TransportObservable<T>
): { send: (v: T, t?: Transferable[]) => void; subscribe: (h: (v: T) => void) => Subscription; close: () => void } {
    return {
        send: (v, t) => outbound.next(v, t),
        subscribe: (h) => inbound.subscribe({ next: h }),
        close: () => { outbound.close(); inbound.close(); }
    };
}
