/**
 * Request Proxy - Re-exports from Unified Proxy Module
 *
 * @deprecated Use Proxy.ts directly for new code.
 * This file is kept for backward compatibility.
 */

import { WReflectAction, type WReflectDescriptor } from "../types/Interface";
import type { ChannelMessage, ChannelObservable } from "../observable/Observable";
import { UnifiedChannel, createUnifiedChannel, getWorkerChannel } from "../channel/UnifiedChannel";

// Re-export from unified Proxy module
export {
    // Types
    type ProxyInvoker,
    type ProxyDescriptor,
    type ProxyConfig,
    type ProxyMethods,
    type RemoteProxy,
    type ExposeHandler,
    type ProxySender,

    // Symbols
    PROXY_MARKER,
    PROXY_INTERNALS,

    // Classes
    RemoteProxyHandler,
    DispatchProxyHandler,
    ProxyBuilder,

    // Factory functions
    createRemoteProxy,
    wrapDescriptor,
    isRemoteProxy,
    getProxyDescriptor,
    getProxyInternals,
    createExposeHandler,
    createSenderProxy,
    proxyBuilder,

    // Legacy aliases
    RequestProxyHandler,
    makeProxy,
    makeRequestProxy
} from "./Proxy";

// Re-export types from Observable
export type { ChannelMessage };

// ============================================================================
// LEGACY TYPES
// ============================================================================

export interface ChannelSender<T = ChannelMessage> {
    next(message: T, transfer?: Transferable[]): void;
    request?(message: T): Promise<any>;
}

// ============================================================================
// LEGACY CLASSES
// ============================================================================

/**
 * @deprecated Use createRemoteProxy from Proxy.ts instead
 */
export class RequestProxyHandlerV2 {
    private _channel: UnifiedChannel;

    constructor(
        public hostChannelInstance: any = null,
        public options: any = {}
    ) {
        this._channel = getWorkerChannel();
    }

    dispatch(action: WReflectAction, args: any[]) {
        const targetChannel = this.options?.connectChannel ?? "worker";
        const path = args?.[1] ?? [];
        return this._channel.invoke(targetChannel, action, path, args.slice(2) ?? []);
    }
}

/**
 * @deprecated Use createRemoteProxy from Proxy.ts instead
 */
export class ObservableRequestProxyHandler extends RequestProxyHandlerV2 {}

// ============================================================================
// LEGACY FACTORY FUNCTIONS
// ============================================================================

/**
 * @deprecated Use UnifiedChannel.proxy() instead
 */
export const wrapChannel = (connectChannel: string, host: any = null): any => {
    const channel = getWorkerChannel();
    return channel.proxy(connectChannel);
};

/**
 * @deprecated Use UnifiedChannel.proxy() instead
 */
export const wrapObservableChannel = (channelObs: ChannelObservable, connectChannel: string, options: any = {}): any =>
    wrapChannel(connectChannel, null);

/**
 * @deprecated Use UnifiedChannel.wrapDescriptor() instead
 */
export const makeObservableRequestProxy = (
    descriptor: WReflectDescriptor,
    channelObs: ChannelObservable,
    options: any = {}
): any => {
    const channel = getWorkerChannel();
    return channel.wrapDescriptor(descriptor, descriptor?.channel ?? options?.connectChannel);
};

/**
 * @deprecated Use createUnifiedChannel instead
 */
export function createObservableChannel(
    transport: Worker | MessagePort | BroadcastChannel | WebSocket | "chrome-runtime" | "service-worker-client" | "self",
    channelName: string
) {
    const channel = createUnifiedChannel({ name: channelName, autoListen: false });
    channel.connect(transport, { targetChannel: channelName });

    return {
        observable: channel,
        wrap: (connectChannel: string, opts?: any) => channel.proxy(connectChannel),
        subscribe: (obs: any) => channel.subscribe(obs),
        send: (msg: any) => channel.next(msg),
        request: (msg: any) => channel.invoke(channelName, WReflectAction.CALL, [], [msg])
    };
}
