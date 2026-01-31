/**
 * Native Observable - Re-exports from Observable.ts
 *
 * @deprecated Import directly from "./Observable" instead.
 * This file is kept for backward compatibility.
 */

// Import for local use
import { ObservableFactory } from "./Observable";

// Re-export everything from Observable.ts
export {
    // Core
    Observable,
    Observable as ChannelNativeObservable,
    ChannelSubject,
    ChannelObservable,

    // Types
    type Observer,
    type Subscription,
    type Subscriber,
    type ChannelMessage,

    // Invoker factories
    makeWorkerInvoker,
    makeMessagePortInvoker,
    makeBroadcastInvoker,
    makeWebSocketInvoker,
    makeChromeRuntimeInvoker,
    makeServiceWorkerClientInvoker,
    makeServiceWorkerHostInvoker,
    makeSelfInvoker,

    // Request handlers
    createInvokerObservable,
    createReflectHandler,
    createReflectHandler as createRequestHandler,

    // Bidirectional
    createBidirectionalChannel,
    createBidirectionalChannel as createBidirectionalChannelNative,
    type BidirectionalChannel,

    // Utilities
    when,

    // Operators
    filter,
    map,
    take,
    takeUntil,
    ObservableFactory
} from "./Observable";

// Type aliases for backward compatibility
import type { Subscription as ISubscription, InvokerHandler, ResponderFn, TransportType } from "../types/Interface";
export type { InvokerHandler, ResponderFn, TransportType };

// Subscription alias
export class ChannelSubscription implements ISubscription {
    private _closed = false;
    constructor(private _unsubscribe: () => void) {}
    get closed(): boolean { return this._closed; }
    unsubscribe(): void { if (!this._closed) { this._closed = true; this._unsubscribe(); } }
}

// Handler factory (legacy)
export function createSimpleRequestHandler(
    channelName: string,
    handlers: Record<string, (args: any[], data: any) => any | Promise<any>>
): InvokerHandler<any> {
    return async (data, respond, subscriber) => {
        if (data.type !== "request") { subscriber.next(data); return; }
        const action = data.payload?.action;
        if (action && handlers[action]) {
            try {
                const result = await handlers[action](data.payload?.args ?? [], data);
                respond({ id: crypto.randomUUID(), channel: data.sender, sender: channelName, reqId: data.reqId, type: "response", payload: { result, error: null }, timestamp: Date.now() });
            } catch (error) {
                respond({ id: crypto.randomUUID(), channel: data.sender, sender: channelName, reqId: data.reqId, type: "response", payload: { result: null, error: error instanceof Error ? error.message : String(error) }, timestamp: Date.now() });
            }
        } else {
            subscriber.next(data);
        }
    };
}

// Factory for transport observables (legacy)
export function createChannelObservable(
    transport: string,
    target: Worker | MessagePort | string | URL | null = null,
    options?: { protocols?: string | string[]; handler?: InvokerHandler<any> }
) {
    const handler = options?.handler;

    switch (transport) {
        case "worker": return ObservableFactory.invoker(target as Worker, "channel", handler);
        case "message-port": return ObservableFactory.invoker(target as MessagePort, "channel", handler);
        case "broadcast": return ObservableFactory.channel(new BroadcastChannel(target as string), target as string);
        case "websocket": return ObservableFactory.channel(new WebSocket(typeof target === "string" ? target : (target as URL).href, options?.protocols), "ws");
        default: return ObservableFactory.invoker(target as any, "channel", handler);
    }
}
