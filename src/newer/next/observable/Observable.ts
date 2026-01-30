/**
 * Observable Core - Unified WICG-aligned Observable implementation
 *
 * Single source of truth for all Observable primitives.
 * Reference: https://github.com/WICG/observable
 */

import { UUIDv4 } from "fest/core";
import {
    createTransportSender,
    createTransportListener,
    type TransportTarget,
    type SendFn
} from "../../core/TransportCore";
import { handleRequest } from "../../core/RequestHandler";
import type {
    Observer,
    Subscription,
    Subscribable,
    Subscriber,
    Producer,
    ChannelMessage,
    ResponderFn,
    InvokerHandler,
    PendingRequest
} from "../types/Interface";
import type { WReq } from "../types/Interface";

// Re-export types
export type { Observer, Subscription, Subscribable, Subscriber, Producer, ChannelMessage };

// ============================================================================
// BASE SUBSCRIPTION
// ============================================================================

class BaseSubscription implements Subscription {
    private _closed = false;
    constructor(private _unsubscribe: () => void) {}
    get closed(): boolean { return this._closed; }
    unsubscribe(): void { if (!this._closed) { this._closed = true; this._unsubscribe(); } }
}

// ============================================================================
// CORE OBSERVABLE (WICG-aligned)
// ============================================================================

/**
 * Core Observable with producer function
 */
export class Observable<T = any> implements Subscribable<T> {
    constructor(private _producer: Producer<T>) {}

    subscribe(observerOrNext?: Observer<T> | ((v: T) => void), opts?: { signal?: AbortSignal }): Subscription {
        const observer: Observer<T> = typeof observerOrNext === "function"
            ? { next: observerOrNext } : observerOrNext ?? {};

        const ctrl = new AbortController();
        opts?.signal?.addEventListener("abort", () => ctrl.abort());

        let active = true;
        let cleanup: (() => void) | void;

        const doCleanup = () => { active = false; ctrl.abort(); cleanup?.(); };

        const subscriber: Subscriber<T> = {
            next: (v) => active && observer.next?.(v),
            error: (e) => { if (active) { observer.error?.(e); doCleanup(); } },
            complete: () => { if (active) { observer.complete?.(); doCleanup(); } },
            signal: ctrl.signal,
            get active() { return active && !ctrl.signal.aborted; }
        };

        try { cleanup = this._producer(subscriber); }
        catch (e) { subscriber.error(e as Error); }

        return new BaseSubscription(doCleanup);
    }

    pipe<R>(...ops: Array<(s: Observable<any>) => Observable<R>>): Observable<R> {
        return ops.reduce((s, op) => op(s), this as unknown as Observable<any>) as Observable<R>;
    }
}

// ============================================================================
// SUBJECT (Observable with push)
// ============================================================================

export interface SubjectOptions { bufferSize?: number; replayOnSubscribe?: boolean; }

/**
 * Subject - Observable that can be pushed to
 */
export class ChannelSubject<T = any> implements Subscribable<T> {
    protected _subs = new Set<Observer<T>>();
    private _buffer: T[] = [];
    private _maxBuffer: number;
    private _replay: boolean;

    constructor(options: SubjectOptions = {}) {
        this._maxBuffer = options.bufferSize ?? 0;
        this._replay = options.replayOnSubscribe ?? false;
    }

    next(value: T): void {
        if (this._maxBuffer > 0) {
            this._buffer.push(value);
            if (this._buffer.length > this._maxBuffer) this._buffer.shift();
        }
        for (const s of this._subs) {
            try { s.next?.(value); } catch (e) { s.error?.(e as Error); }
        }
    }

    error(err: Error): void { for (const s of this._subs) s.error?.(err); }
    complete(): void { for (const s of this._subs) s.complete?.(); this._subs.clear(); }

    subscribe(observerOrNext: Observer<T> | ((v: T) => void)): Subscription {
        const obs: Observer<T> = typeof observerOrNext === "function" ? { next: observerOrNext } : observerOrNext;
        this._subs.add(obs);

        if (this._replay) {
            for (const v of this._buffer) { try { obs.next?.(v); } catch (e) { obs.error?.(e as Error); } }
        }

        return new BaseSubscription(() => { this._subs.delete(obs); });
    }

    getValue(): T | undefined { return this._buffer.at(-1); }
    getBuffer(): T[] { return [...this._buffer]; }
    get subscriberCount(): number { return this._subs.size; }
}

export class ReplayChannelSubject<T = any> extends ChannelSubject<T> {
    constructor(bufferSize = 1) { super({ bufferSize, replayOnSubscribe: true }); }
}

// ============================================================================
// CHANNEL OBSERVABLE (with transport + request/response)
// ============================================================================

/**
 * Channel Observable with bidirectional communication
 */
export class ChannelObservable implements Subscribable<ChannelMessage> {
    private _send: SendFn<ChannelMessage>;
    private _pending = new Map<string, PendingRequest>();
    private _subs = new Set<Observer<ChannelMessage>>();
    private _cleanup: (() => void) | null = null;
    private _listening = false;

    constructor(private _transport: TransportTarget, private _channelName: string) {
        this._send = createTransportSender(_transport);
    }

    next(msg: ChannelMessage, transfer?: Transferable[]): void { this._send(msg, transfer); }

    subscribe(observer: Observer<ChannelMessage> | ((v: ChannelMessage) => void)): Subscription {
        const obs: Observer<ChannelMessage> = typeof observer === "function" ? { next: observer } : observer;
        this._subs.add(obs);
        if (!this._listening) this._activate();
        return new BaseSubscription(() => {
            this._subs.delete(obs);
            if (this._subs.size === 0) this._deactivate();
        });
    }

    request(msg: Omit<ChannelMessage, "reqId"> & { reqId?: string }): Promise<any> {
        const reqId = msg.reqId ?? UUIDv4();
        return new Promise((resolve, reject) => {
            this._pending.set(reqId, { resolve, reject, timestamp: Date.now() });
            this.next({ ...msg, reqId } as ChannelMessage);
        });
    }

    private _handle(data: ChannelMessage): void {
        if (data.type === "response" && data.reqId) {
            const p = this._pending.get(data.reqId);
            if (p) { p.resolve(data.payload); this._pending.delete(data.reqId); }
        }
        for (const s of this._subs) { try { s.next?.(data); } catch (e) { s.error?.(e as Error); } }
    }

    private _activate(): void {
        if (this._listening) return;
        this._cleanup = createTransportListener(
            this._transport,
            (d) => this._handle(d),
            (e) => this._subs.forEach((s) => s.error?.(e)),
            () => this._subs.forEach((s) => s.complete?.())
        );
        this._listening = true;
    }

    private _deactivate(): void {
        this._cleanup?.(); this._cleanup = null; this._listening = false;
    }

    close(): void { this._subs.forEach((s) => s.complete?.()); this._subs.clear(); this._deactivate(); }
    get channelName(): string { return this._channelName; }
    get isListening(): boolean { return this._listening; }
}

// ============================================================================
// INVOKER OBSERVABLE
// ============================================================================

export function createInvokerObservable(
    transport: TransportTarget,
    channelName: string,
    handler?: InvokerHandler<ChannelMessage>
): Observable<ChannelMessage> {
    const send = createTransportSender(transport);
    return new Observable((subscriber) => {
        const onMessage = (data: ChannelMessage) => {
            if (!subscriber.active) return;
            const respond: ResponderFn<ChannelMessage> = (result, transfer) => {
                send({ ...result, channel: data.sender, sender: channelName, type: "response", reqId: data.reqId }, transfer);
            };
            handler ? handler(data, respond, subscriber) : subscriber.next(data);
        };
        return createTransportListener(transport, onMessage, (e) => subscriber.error(e), () => subscriber.complete());
    });
}

export function createReflectHandler(channelName: string): InvokerHandler<ChannelMessage> {
    return async (data, respond, subscriber) => {
        if (data.type !== "request") { subscriber.next(data); return; }
        const result = await handleRequest(data.payload as WReq, data.reqId!, channelName);
        if (result) respond(result.response, result.transfer);
        subscriber.next(data);
    };
}

// ============================================================================
// MESSAGE OBSERVABLE (filtered by type)
// ============================================================================

export class MessageObservable extends ChannelSubject<ChannelMessage> {
    constructor(source: Subscribable<ChannelMessage>, messageType?: string) {
        super();
        source.subscribe({
            next: (msg) => { if (!messageType || msg.type === messageType) this.next(msg); },
            error: (e) => this.error(e),
            complete: () => this.complete()
        });
    }
}

// ============================================================================
// OPERATORS
// ============================================================================

export const filter = <T>(pred: (v: T) => boolean) => (src: Subscribable<T>): Observable<T> =>
    new Observable((sub) => { const s = src.subscribe({ next: (v) => pred(v) && sub.next(v), error: (e) => sub.error(e), complete: () => sub.complete() }); return () => s.unsubscribe(); });

export const map = <T, R>(fn: (v: T) => R) => (src: Subscribable<T>): Observable<R> =>
    new Observable((sub) => { const s = src.subscribe({ next: (v) => sub.next(fn(v)), error: (e) => sub.error(e), complete: () => sub.complete() }); return () => s.unsubscribe(); });

export const take = <T>(n: number) => (src: Subscribable<T>): Observable<T> =>
    new Observable((sub) => { let c = 0; const s = src.subscribe({ next: (v) => { if (c++ < n) { sub.next(v); if (c >= n) sub.complete(); } }, error: (e) => sub.error(e), complete: () => sub.complete() }); return () => s.unsubscribe(); });

export const takeUntil = <T>(signal: Subscribable<any>) => (src: Subscribable<T>): Observable<T> =>
    new Observable((sub) => { const ss = src.subscribe({ next: (v) => sub.next(v), error: (e) => sub.error(e), complete: () => sub.complete() }); const sig = signal.subscribe({ next: () => sub.complete() }); return () => { ss.unsubscribe(); sig.unsubscribe(); }; });

export const debounce = <T>(ms: number) => (src: Subscribable<T>): Observable<T> =>
    new Observable((sub) => { let t: any; const s = src.subscribe({ next: (v) => { clearTimeout(t); t = setTimeout(() => sub.next(v), ms); }, error: (e) => sub.error(e), complete: () => sub.complete() }); return () => { clearTimeout(t); s.unsubscribe(); }; });

export const throttle = <T>(ms: number) => (src: Subscribable<T>): Observable<T> =>
    new Observable((sub) => { let last = 0; const s = src.subscribe({ next: (v) => { const now = Date.now(); if (now - last >= ms) { last = now; sub.next(v); } }, error: (e) => sub.error(e), complete: () => sub.complete() }); return () => s.unsubscribe(); });

// ============================================================================
// UTILITIES
// ============================================================================

export const fromEvent = <K extends keyof HTMLElementEventMap>(target: EventTarget, event: K): Observable<HTMLElementEventMap[K]> =>
    new Observable((sub) => { const h = (e: Event) => sub.active && sub.next(e as HTMLElementEventMap[K]); target.addEventListener(event, h); return () => target.removeEventListener(event, h); });

export const fromPromise = <T>(promise: Promise<T>): Observable<T> =>
    new Observable((sub) => { promise.then((v) => { sub.next(v); sub.complete(); }).catch((e) => sub.error(e)); });

export const delay = <T>(value: T, ms: number): Observable<T> =>
    new Observable((sub) => { const t = setTimeout(() => { sub.next(value); sub.complete(); }, ms); return () => clearTimeout(t); });

export const interval = (ms: number): Observable<number> =>
    new Observable((sub) => { let n = 0; const t = setInterval(() => sub.next(n++), ms); return () => clearInterval(t); });

export const merge = <T>(...sources: Subscribable<T>[]): Observable<T> =>
    new Observable((sub) => { const subs = sources.map((s) => s.subscribe({ next: (v) => sub.next(v), error: (e) => sub.error(e) })); return () => subs.forEach((s) => s.unsubscribe()); });

export const createMessageId = (): string => UUIDv4();

// ============================================================================
// FACTORY
// ============================================================================

export const ObservableFactory = {
    channel: (transport: TransportTarget, name: string) => new ChannelObservable(transport, name),
    invoker: (transport: TransportTarget, name: string, handler?: InvokerHandler<ChannelMessage>) => createInvokerObservable(transport, name, handler),
    handler: (transport: TransportTarget, name: string) => createInvokerObservable(transport, name, createReflectHandler(name)),
    fromEvent,
    fromPromise,
    delay,
    interval,
    merge
};
