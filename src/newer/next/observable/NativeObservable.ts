/**
 * Native Observable - WICG-aligned invoker pattern
 *
 * Extends Observable.ts with transport-specific invoker factories.
 */

import { UUIDv4 } from "fest/core";
import {
    createTransportSender,
    createTransportListener,
    type TransportTarget
} from "../../core/TransportCore";
import { handleRequest } from "../../core/RequestHandler";
import {
    Observable,
    type Subscriber,
    type Subscription,
    type ChannelMessage,
    type Observer
} from "./Observable";
import type { WReq, InvokerHandler, ResponderFn, TransportType } from "../types/Interface";

// Re-export commonly used types
export type { Subscriber, InvokerHandler, ResponderFn, TransportType };
export { Observable };

// ============================================================================
// SUBSCRIPTION
// ============================================================================

export class ChannelSubscription implements Subscription {
    private _closed = false;
    constructor(private _unsubscribe: () => void) {}
    get closed(): boolean { return this._closed; }
    unsubscribe(): void { if (!this._closed) { this._closed = true; this._unsubscribe(); } }
}

// ============================================================================
// NATIVE OBSERVABLE (alias for consistency)
// ============================================================================

export class ChannelNativeObservable<T = ChannelMessage> extends Observable<T> {}

// ============================================================================
// INVOKER FACTORIES
// ============================================================================

const makeInvoker = (transport: TransportTarget, handler?: InvokerHandler<ChannelMessage>) =>
    (subscriber: Subscriber<ChannelMessage>): () => void => {
        const send = createTransportSender(transport);
        const respond: ResponderFn<ChannelMessage> = (result, transfer) => send(result, transfer);
        return createTransportListener(
            transport,
            (data: ChannelMessage) => {
                if (!subscriber.active) return;
                handler ? handler(data, respond, subscriber) : subscriber.next(data);
            },
            (err) => subscriber.error(err),
            () => subscriber.complete()
        );
    };

export const makeWorkerInvoker = (worker: Worker, handler?: InvokerHandler<ChannelMessage>) => makeInvoker(worker, handler);
export const makeMessagePortInvoker = (port: MessagePort, handler?: InvokerHandler<ChannelMessage>) => makeInvoker(port, handler);
export const makeBroadcastInvoker = (name: string, handler?: InvokerHandler<ChannelMessage>) => makeInvoker(new BroadcastChannel(name), handler);
export const makeWebSocketInvoker = (url: string | URL, protocols?: string | string[], handler?: InvokerHandler<ChannelMessage>) =>
    makeInvoker(new WebSocket(typeof url === "string" ? url : url.href, protocols), handler);
export const makeChromeRuntimeInvoker = (handler?: InvokerHandler<ChannelMessage>) => makeInvoker("chrome-runtime" as TransportTarget, handler);
export const makeServiceWorkerClientInvoker = (handler?: InvokerHandler<ChannelMessage>) => makeInvoker("service-worker-client" as TransportTarget, handler);
export const makeServiceWorkerHostInvoker = (handler?: InvokerHandler<ChannelMessage>) => makeInvoker("service-worker-host" as TransportTarget, handler);
export const makeSelfInvoker = (handler?: InvokerHandler<ChannelMessage>) => makeInvoker("self" as TransportTarget, handler);

// ============================================================================
// REQUEST HANDLERS
// ============================================================================

export function createRequestHandler(
    channelName: string,
    options: { onRequest?: (req: WReq) => void; onResponse?: (res: any) => void } = {}
): InvokerHandler<ChannelMessage> {
    return async (data, respond, subscriber) => {
        if (data.type !== "request") { subscriber.next(data); return; }
        options.onRequest?.(data.payload as WReq);
        const result = await handleRequest(data.payload as WReq, data.reqId!, channelName);
        if (result) {
            options.onResponse?.(result.response);
            respond({ ...result.response, id: UUIDv4(), timestamp: Date.now() } as ChannelMessage, result.transfer);
        }
        subscriber.next(data);
    };
}

export function createSimpleRequestHandler(
    channelName: string,
    handlers: Record<string, (args: any[], data: ChannelMessage) => any | Promise<any>>
): InvokerHandler<ChannelMessage> {
    return async (data, respond, subscriber) => {
        if (data.type !== "request") { subscriber.next(data); return; }
        const action = data.payload?.action;
        if (action && handlers[action]) {
            try {
                const result = await handlers[action](data.payload?.args ?? [], data);
                respond({ id: UUIDv4(), channel: data.sender, sender: channelName, reqId: data.reqId, type: "response", payload: { result, error: null }, timestamp: Date.now() } as ChannelMessage);
            } catch (error) {
                respond({ id: UUIDv4(), channel: data.sender, sender: channelName, reqId: data.reqId, type: "response", payload: { result: null, error: error instanceof Error ? error.message : String(error) }, timestamp: Date.now() } as ChannelMessage);
            }
        } else {
            subscriber.next(data);
        }
    };
}

// ============================================================================
// FACTORY
// ============================================================================

export function createChannelObservable(
    transport: TransportType,
    target: Worker | MessagePort | string | URL | null = null,
    options?: { protocols?: string | string[]; handler?: InvokerHandler<ChannelMessage> }
): ChannelNativeObservable<ChannelMessage> {
    return new ChannelNativeObservable((subscriber) => {
        const handler = options?.handler;
        let invoker: (sub: Subscriber<ChannelMessage>) => () => void;
        switch (transport) {
            case "worker": invoker = makeWorkerInvoker(target as Worker, handler); break;
            case "message-port": invoker = makeMessagePortInvoker(target as MessagePort, handler); break;
            case "broadcast": invoker = makeBroadcastInvoker(target as string, handler); break;
            case "websocket": invoker = makeWebSocketInvoker(target as string | URL, options?.protocols, handler); break;
            case "chrome-runtime": invoker = makeChromeRuntimeInvoker(handler); break;
            case "service-worker": invoker = makeServiceWorkerClientInvoker(handler); break;
            case "self": invoker = makeSelfInvoker(handler); break;
            default: throw new Error(`Unknown transport: ${transport}`);
        }
        return invoker(subscriber);
    });
}

// ============================================================================
// BIDIRECTIONAL CHANNEL
// ============================================================================

export interface ChannelSender<T = ChannelMessage> { next(value: T, transfer?: Transferable[]): void; }

export interface BidirectionalChannel<T = ChannelMessage> {
    inbound: ChannelNativeObservable<T>;
    outbound: ChannelSender<T>;
    subscribe(observer: Observer<T>): ChannelSubscription;
    send(value: T, transfer?: Transferable[]): void;
}

export function createBidirectionalChannelNative(
    transport: TransportType,
    target: Worker | MessagePort | string | URL | null = null,
    options?: { protocols?: string | string[] }
): BidirectionalChannel<ChannelMessage> {
    let senderTarget: TransportTarget | null = null;
    if (target instanceof Worker || target instanceof MessagePort) senderTarget = target;
    else if (transport === "broadcast" && typeof target === "string") senderTarget = new BroadcastChannel(target);
    else if (transport === "websocket") senderTarget = new WebSocket(typeof target === "string" ? target : (target as URL).href, options?.protocols);
    else senderTarget = transport as unknown as TransportTarget;

    const send = createTransportSender(senderTarget!);
    const inbound = createChannelObservable(transport, target, options);
    return {
        inbound,
        outbound: { next: send },
        subscribe: (obs) => new ChannelSubscription(() => inbound.subscribe(obs).unsubscribe()),
        send: (value, transfer) => send(value, transfer)
    };
}

// ============================================================================
// UTILITY
// ============================================================================

export function when<K extends keyof HTMLElementEventMap>(target: EventTarget, eventName: K): ChannelNativeObservable<HTMLElementEventMap[K]>;
export function when(target: EventTarget, eventName: string): ChannelNativeObservable<Event>;
export function when(target: EventTarget, eventName: string): ChannelNativeObservable<Event> {
    return new ChannelNativeObservable((sub) => {
        const h = (e: Event) => sub.active && sub.next(e);
        target.addEventListener(eventName, h);
        return () => target.removeEventListener(eventName, h);
    });
}

// Operators re-exported for convenience
export { filter, map, take, takeUntil } from "./Observable";
