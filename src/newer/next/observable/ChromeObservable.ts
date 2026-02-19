/**
 * Chrome Extension Observable API
 *
 * Observable wrappers for Chrome Extension messaging.
 */

import { UUIDv4 } from "fest/core";
import { Observable, ChannelSubject, type Subscription, type Observer } from "./Observable";
import type { ChannelMessage, InvokerHandler, ResponderFn, Subscriber, PendingRequest } from "../types/Interface";

// ============================================================================
// TYPES
// ============================================================================

export interface ChromeMessage<T = any> extends ChannelMessage {
    _sender?: chrome.runtime.MessageSender;
    _tabId?: number;
    _frameId?: number;
}

export interface PortInfo {
    name: string;
    tabId?: number;
    frameId?: number;
    url?: string;
}

export interface ChromeObservableOptions {
    filterSender?: (sender: chrome.runtime.MessageSender) => boolean;
    filterMessage?: (message: any) => boolean;
    asyncResponse?: boolean;
}

// ============================================================================
// BASE CHROME OBSERVABLE
// ============================================================================

abstract class BaseChromeObservable<T = ChromeMessage> {
    protected _subs = new Set<Observer<T>>();
    protected _listening = false;
    protected _cleanup: (() => void) | null = null;

    abstract send(msg: T): void;

    subscribe(observer: Observer<T> | ((v: T) => void)): Subscription {
        const obs: Observer<T> = typeof observer === "function" ? { next: observer } : observer;
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
    protected _deactivate(): void { this._cleanup?.(); this._cleanup = null; this._listening = false; }

    protected _dispatch(value: T): void {
        for (const s of this._subs) { try { s.next?.(value); } catch (e) { s.error?.(e as Error); } }
    }

    close(): void { this._subs.forEach((s) => s.complete?.()); this._subs.clear(); this._deactivate(); }
}

// ============================================================================
// CHROME RUNTIME OBSERVABLE
// ============================================================================

export class ChromeRuntimeObservable extends BaseChromeObservable<ChromeMessage> {
    private _pending = new Map<string, PendingRequest>();

    constructor(
        private _handler?: InvokerHandler<ChromeMessage>,
        private _options: ChromeObservableOptions = {}
    ) { super(); }

    send(msg: ChromeMessage): void {
        if (typeof chrome === "undefined" || !chrome.runtime) return;
        const { _sender, _tabId, _frameId, transferable, ...data } = msg as any;
        chrome.runtime.sendMessage(data);
    }

    request(msg: ChromeMessage): Promise<any> {
        const reqId = msg.reqId ?? UUIDv4();
        return new Promise((resolve, reject) => {
            this._pending.set(reqId, { resolve, reject, timestamp: Date.now() });
            const { _sender, _tabId, _frameId, transferable, ...data } = { ...msg, reqId } as any;
            chrome.runtime.sendMessage(data, (response) => {
                if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
                else resolve(response);
                this._pending.delete(reqId);
            });
        });
    }

    protected _activate(): void {
        if (this._listening || typeof chrome === "undefined" || !chrome.runtime) return;

        const listener = (message: any, sender: chrome.runtime.MessageSender, sendResponse: (r?: any) => void): boolean | void => {
            if (this._options.filterSender && !this._options.filterSender(sender)) return false;
            if (this._options.filterMessage && !this._options.filterMessage(message)) return false;

            const data: ChromeMessage = {
                ...message, id: message.id ?? UUIDv4(),
                _sender: sender, _tabId: sender.tab?.id, _frameId: sender.frameId
            };

            // Handle response
            if (data.type === "response" && data.reqId) {
                const p = this._pending.get(data.reqId);
                if (p) { p.resolve(data.payload); this._pending.delete(data.reqId); }
            }

            if (this._handler) {
                const respond: ResponderFn<ChromeMessage> = (result) => sendResponse(result);
                const subscriber: Subscriber<ChromeMessage> = {
                    next: (v) => this._dispatch(v), error: () => {}, complete: () => {},
                    signal: new AbortController().signal, active: true
                };
                const result = this._handler(data, respond, subscriber);
                return result instanceof Promise ? true : this._options.asyncResponse;
            }

            this._dispatch(data);
            return false;
        };

        chrome.runtime.onMessage.addListener(listener);
        this._cleanup = () => chrome.runtime.onMessage.removeListener(listener);
        this._listening = true;
    }
}

// ============================================================================
// CHROME TABS OBSERVABLE
// ============================================================================

export class ChromeTabsObservable extends BaseChromeObservable<ChromeMessage> {
    constructor(private _tabId?: number, private _options: ChromeObservableOptions = {}) { super(); }

    setTabId(id: number): void { this._tabId = id; }

    send(msg: ChromeMessage): void {
        if (typeof chrome === "undefined" || !chrome.tabs || this._tabId == null) return;
        const { _sender, _tabId, _frameId, transferable, ...data } = msg as any;
        chrome.tabs.sendMessage(this._tabId, data);
    }

    protected _activate(): void {
        if (this._listening || typeof chrome === "undefined" || !chrome.runtime) return;

        const listener = (message: any, sender: chrome.runtime.MessageSender): void => {
            if (this._tabId != null && sender.tab?.id !== this._tabId) return;
            if (this._options.filterSender && !this._options.filterSender(sender)) return;

            const data: ChromeMessage = {
                ...message, id: message.id ?? UUIDv4(),
                _sender: sender, _tabId: sender.tab?.id, _frameId: sender.frameId
            };
            this._dispatch(data);
        };

        chrome.runtime.onMessage.addListener(listener);
        this._cleanup = () => chrome.runtime.onMessage.removeListener(listener);
        this._listening = true;
    }
}

// ============================================================================
// CHROME PORT OBSERVABLE
// ============================================================================

export class ChromePortObservable extends BaseChromeObservable<ChromeMessage> {
    private _port: chrome.runtime.Port | null = null;
    private _info: PortInfo | null = null;

    constructor(private _portName: string, private _tabId?: number) { super(); }

    connect(): void {
        if (typeof chrome === "undefined" || !chrome.runtime) return;
        this._port = this._tabId != null
            ? chrome.tabs.connect(this._tabId, { name: this._portName })
            : chrome.runtime.connect({ name: this._portName });

        this._info = { name: this._portName, tabId: this._tabId };
        this._setupListeners();
    }

    send(msg: ChromeMessage): void {
        if (!this._port) return;
        const { _sender, _tabId, _frameId, transferable, ...data } = msg as any;
        this._port.postMessage(data);
    }

    private _setupListeners(): void {
        if (!this._port) return;
        this._port.onMessage.addListener((msg) => this._dispatch({ ...msg, id: msg.id ?? UUIDv4() }));
        this._port.onDisconnect.addListener(() => { this._subs.forEach((s) => s.complete?.()); this._port = null; });
    }

    protected _activate(): void { if (!this._port) this.connect(); this._listening = true; }
    protected _deactivate(): void { this._port?.disconnect(); this._port = null; super._deactivate(); }

    get portInfo(): PortInfo | null { return this._info; }
    get isConnected(): boolean { return this._port != null; }
}

// ============================================================================
// CHROME EXTERNAL OBSERVABLE
// ============================================================================

export class ChromeExternalObservable extends BaseChromeObservable<ChromeMessage> {
    constructor(private _extensionId?: string) { super(); }

    send(msg: ChromeMessage): void {
        if (typeof chrome === "undefined" || !chrome.runtime) return;
        const { _sender, _tabId, _frameId, transferable, ...data } = msg as any;
        if (this._extensionId) chrome.runtime.sendMessage(this._extensionId, data);
        else chrome.runtime.sendMessage(data);
    }

    protected _activate(): void {
        if (this._listening || typeof chrome === "undefined" || !chrome.runtime?.onMessageExternal) return;

        const listener = (message: any, sender: chrome.runtime.MessageSender): void => {
            this._dispatch({ ...message, id: message.id ?? UUIDv4(), _sender: sender });
        };

        chrome.runtime.onMessageExternal.addListener(listener);
        this._cleanup = () => chrome.runtime.onMessageExternal.removeListener(listener);
        this._listening = true;
    }
}

// ============================================================================
// REQUEST HANDLER
// ============================================================================

export function createChromeRequestHandler(
    channelName: string,
    handlers: Record<string, (args: any[], data: ChromeMessage) => any | Promise<any>>
): InvokerHandler<ChromeMessage> {
    return async (data, respond, subscriber) => {
        if (data.type !== "request") { subscriber.next(data); return; }
        const action = data.payload?.action;
        if (action && handlers[action]) {
            try {
                const result = await handlers[action](data.payload?.args ?? [], data);
                respond({ id: UUIDv4(), channel: data.sender, sender: channelName, reqId: data.reqId, type: "response", payload: { result }, timestamp: Date.now() } as ChromeMessage);
            } catch (error) {
                respond({ id: UUIDv4(), channel: data.sender, sender: channelName, reqId: data.reqId, type: "response", payload: { error: error instanceof Error ? error.message : String(error) }, timestamp: Date.now() } as ChromeMessage);
            }
        } else {
            subscriber.next(data);
        }
    };
}

// ============================================================================
// FACTORY
// ============================================================================

export const ChromeObservableFactory = {
    runtime: (handler?: InvokerHandler<ChromeMessage>, options?: ChromeObservableOptions) => new ChromeRuntimeObservable(handler, options),
    tabs: (tabId?: number, options?: ChromeObservableOptions) => new ChromeTabsObservable(tabId, options),
    port: (name: string, tabId?: number) => new ChromePortObservable(name, tabId),
    external: (extensionId?: string) => new ChromeExternalObservable(extensionId)
};
