/**
 * Uniform.ts - Unified exports
 */

// ============================================================================
// TYPES (from Interface.ts)
// ============================================================================

export type {
    WReflectDescriptor, WReq, WResp, WError, WSuccess,
    Observer, Subscription, Subscribable, Subscriber, Producer,
    ChannelMessage, ChannelState, ChannelMeta,
    TransportType, TransportTarget, ConnectionOptions,
    ResponderFn, InvokerHandler, MessageHandler, SendFn, PendingRequest,
    // Advanced transport types
    AtomicsConfig, RTCConfig, SharedWorkerConfig, PortConfig,
    TransferableConfig, TransportCapabilities
} from "./next/types/Interface";

export { WStatus, WType, WReflectAction } from "./next/types/Interface";

// ============================================================================
// CORE UTILITIES
// ============================================================================

export {
    createTransportSender,
    createTransportListener,
    createChromeListener,
    createChromeTabsListener,
    createWebSocketTransport,
    createBroadcastTransport,
    detectTransportType,
    getTransportMeta,
    TransportCoreFactory,
    type TransportMeta
} from "./core/TransportCore";

export { executeAction, buildResponse, handleRequest } from "./core/RequestHandler";

// ============================================================================
// OBSERVABLE
// ============================================================================

export {
    Observable,
    ChannelSubject,
    ReplayChannelSubject,
    ChannelObservable,
    MessageObservable,
    createInvokerObservable,
    createReflectHandler,
    filter, map, take, takeUntil, debounce, throttle,
    fromEvent, fromPromise, delay, interval, merge, createMessageId,
    ObservableFactory
} from "./next/observable/Observable";

// ============================================================================
// NATIVE OBSERVABLE
// ============================================================================

export {
    ChannelNativeObservable,
    ChannelSubscription,
    makeWorkerInvoker,
    makeMessagePortInvoker,
    makeBroadcastInvoker,
    makeWebSocketInvoker,
    makeChromeRuntimeInvoker,
    makeServiceWorkerClientInvoker,
    makeServiceWorkerHostInvoker,
    makeSelfInvoker,
    createRequestHandler,
    createSimpleRequestHandler,
    createChannelObservable,
    createBidirectionalChannelNative,
    when
} from "./next/observable/NativeObservable";

// ============================================================================
// TRANSPORT
// ============================================================================

export {
    TransportAdapter,
    WorkerTransport,
    MessagePortTransport,
    BroadcastChannelTransport,
    WebSocketTransport,
    ChromeRuntimeTransport,
    ChromeTabsTransport,
    ServiceWorkerTransport,
    SelfTransport,
    TransportFactory,
    createConnectionObserver,
    type TransportIncomingConnection,
    type AcceptConnectionCallback
} from "./next/transport/Transport";

// ============================================================================
// WORKER CONTEXT
// ============================================================================

export {
    WorkerContext,
    getWorkerContext,
    initWorkerContext,
    onWorkerConnection,
    onWorkerChannelCreated,
    workerContext,
    // Invoker integration
    getWorkerResponder,
    getWorkerInvoker,
    exposeFromWorker,
    onWorkerInvocation,
    createHostProxy,
    importInHost,
    detectContextType,
    detectTransportType,
    type IncomingConnection,
    type ChannelCreatedEvent,
    type WorkerContextConfig,
    type ContextType,
    type IncomingInvocation
} from "./next/transport/Worker";

// ============================================================================
// INVOKER (Requestor/Responder)
// ============================================================================

export {
    Requestor,
    Responder,
    BidirectionalInvoker,
    DefaultReflect,
    createRequestor,
    createResponder,
    createInvoker,
    setupInvoker,
    autoInvoker,
    detectContextType as detectContext,
    detectTransportType as detectTransport,
    detectIncomingContextType,
    type InvokerConfig,
    type ReflectLike,
    type InvocationResponse
} from "./next/channel/Invoker";

export {
    TransportObservable,
    WorkerObservable,
    MessagePortObservable,
    BroadcastChannelObservable,
    WebSocketObservable,
    ChromeRuntimeObservable as TransportChromeRuntimeObservable,
    ChromeTabsObservable as TransportChromeTabsObservable,
    ServiceWorkerClientObservable,
    ServiceWorkerHostObservable,
    SelfObservable,
    TransportObservableFactory,
    createBidirectionalChannel
} from "./next/transport/TransportObservable";

// ============================================================================
// CHANNEL HANDLERS
// ============================================================================

export {
    ChannelHandler,
    RemoteChannelHelper,
    RemoteChannels,
    SELF_CHANNEL,
    CHANNEL_MAP,
    initChannelHandler,
    loadWorker,
    $createOrUseExistingChannel,
    createHostChannel,
    createOrUseExistingChannel
} from "./next/channel/Channels";

export {
    ObservableChannelHandler,
    initObservableChannelHandler,
    createObservableHostChannel,
    createOrUseExistingObservableChannel
} from "./next/channel/ObservableChannels";

// ============================================================================
// MULTI-CHANNEL CONTEXT
// ============================================================================

export {
    ChannelContext,
    ChannelHandler as ContextChannelHandler,
    RemoteChannelHelper as ContextRemoteChannelHelper,
    createChannelContext,
    getOrCreateContext,
    getContext,
    deleteContext,
    getContextNames,
    createChannelsInContext,
    importModuleInContext,
    // Default context functions
    getDefaultContext,
    addWorkerChannel,
    addPortChannel,
    addBroadcastChannel,
    addSelfChannelToDefault,
    deferChannel,
    initDeferredChannel,
    getChannelFromDefault,
    createDefaultChannelPair,
    // Types
    type ChannelContextOptions,
    type ChannelEndpoint,
    type RemoteChannelInfo as ContextRemoteChannelInfo,
    type DynamicTransportType,
    type DynamicTransportConfig
} from "./next/channel/ChannelContext";

// ============================================================================
// CONNECTION
// ============================================================================

export {
    ChannelConnection,
    ConnectionPool,
    getConnection,
    getHostConnection,
    getConnectionPool
} from "./next/channel/Connection";

// ============================================================================
// MESSAGE HANDLER
// ============================================================================

export {
    makeChannelMessageHandler,
    ObservableRequestDispatcher,
    ChannelMessageObservable,
    createChannelRequestHandler
} from "./next/channel/ChannelMessageHandler";

// ============================================================================
// REQUEST PROXY
// ============================================================================

export {
    makeRequestProxy,
    makeObservableRequestProxy,
    wrapChannel,
    wrapObservableChannel,
    createObservableChannel,
    ObservableRequestProxyHandler,
    RequestProxyHandlerV2,
    DispatchProxyHandler
} from "./next/channel/RequestProxy";

// ============================================================================
// PLATFORM-SPECIFIC
// ============================================================================

export {
    ChromeRuntimeObservable,
    ChromeTabsObservable,
    ChromePortObservable,
    ChromeExternalObservable,
    ChromeObservableFactory,
    createChromeRequestHandler,
    type ChromeMessage,
    type PortInfo,
    type ChromeObservableOptions
} from "./next/observable/ChromeObservable";

export {
    SocketIOObservable,
    SocketIORoomObservable,
    SocketIOObservableFactory,
    createSocketRequestHandler,
    createSocketObservable,
    type SocketIOLike,
    type SocketMessage,
    type SocketObservableOptions
} from "./next/observable/SocketIOObservable";

export * from "./next/transport/ServiceWorkerHost";
export * from "./next/storage/Storage";

// ============================================================================
// ADVANCED TRANSPORTS
// ============================================================================

// SharedWorker
export {
    SharedWorkerClient,
    SharedWorkerHost,
    createSharedWorkerObservable,
    createSharedWorkerHostObservable,
    SharedWorkerObservableFactory,
    type SharedWorkerMessage,
    type SharedWorkerOptions,
    type SharedWorkerPortInfo
} from "./next/transport/SharedWorkerTransport";

// SharedArrayBuffer + Atomics
export {
    AtomicsTransport,
    AtomicsBuffer,
    AtomicsRingBuffer,
    createAtomicsChannelPair,
    createWorkerAtomicsTransport,
    AtomicsTransportFactory,
    type AtomicsMessage,
    type AtomicsTransportConfig,
    type AtomicsChannelPair,
    type RingBufferConfig
} from "./next/transport/AtomicsTransport";

// WebRTC DataChannel
export {
    RTCPeerTransport,
    RTCPeerManager,
    createBroadcastSignaling,
    RTCTransportFactory,
    type RTCMessage,
    type RTCTransportConfig,
    type RTCSignaling,
    type RTCSignalMessage,
    type RTCPeerInfo
} from "./next/transport/RTCDataChannelTransport";

// MessagePort Enhanced
export {
    PortTransport,
    PortPool,
    WindowPortConnector,
    createChannelPair,
    createFromPort,
    createPortProxy,
    exposeOverPort,
    PortTransportFactory,
    type PortMessage,
    type PortTransportConfig,
    type PortPair,
    type WindowPortConnectorConfig,
    type ProxyMethods
} from "./next/transport/PortTransport";

// Transferable Storage (IndexedDB)
export {
    TransferableStorage,
    MessageQueueStorage,
    TransferableStorageFactory,
    type TransferableRecord,
    type TransferableQuery,
    type TransferableStorageConfig,
    type StorageChange,
    type ChangeType,
    type QueuedMessage
} from "./next/storage/TransferableStorage";

// Unified Transport
export {
    createTransport,
    getTransportRegistry,
    AbstractTransport,
    UnifiedTransportFactory,
    type UnifiedTransportConfig,
    type TransportInstance,
    type TransportFactoryOptions
} from "./next/transport/UnifiedTransport";

// ============================================================================
// UTILITIES
// ============================================================================

export * from "./next/utils/Env";
export * from "./next/utils/Utils";
export * from "./next/utils/Wrappers";
export * from "./next/storage/Queued";
export * from "./next/storage/DataBase";

// ============================================================================
// HIGH-LEVEL APIS
// ============================================================================

import { createHostChannel, createOrUseExistingChannel, SELF_CHANNEL } from "./next/channel/Channels";
import { wrapChannel } from "./next/channel/RequestProxy";
import type { WorkerChannel } from "./next/storage/Queued";
import { detectExecutionContext } from "./next/utils/Env";

export interface BroadcastLike {
    addEventListener: (type: "message" | "error", listener: (...args: any[]) => any) => void;
    removeEventListener?: (type: "message" | "error", listener: (...args: any[]) => any) => void;
    postMessage: (message: any, transfer?: any) => void;
    close?: () => void;
    start?: () => void;
}

export const sync = async (channel: string, options: any = {}, broadcast: BroadcastLike | Worker | BroadcastChannel | MessagePort | null = null) =>
    createOrUseExistingChannel(channel, options, (broadcast ?? (typeof self !== "undefined" ? (self as any) : null)) as any);

export const importModuleInChannel = async (
    channel: string, url: string, options: any = {},
    broadcast: BroadcastLike | Worker | BroadcastChannel | MessagePort | null = (typeof self !== "undefined" ? (self as any) : null)
) => {
    const remote = await createOrUseExistingChannel(channel, options?.channelOptions, broadcast as any);
    return remote?.doImportModule?.(url, options?.importOptions);
};

// ============================================================================
// MULTI-CHANNEL HIGH-LEVEL API
// ============================================================================

import {
    ChannelContext,
    createChannelContext,
    getOrCreateContext,
    createChannelsInContext as _createChannelsInContext,
    importModuleInContext as _importModuleInContext
} from "./next/channel/ChannelContext";

/**
 * Create a new isolated channel context for a component or module
 *
 * @example
 * // In a lazy-loaded component
 * const ctx = createContext({ name: "my-component" });
 * const workerModule = await ctx.importModuleInChannel("worker", "./module.ts");
 *
 * // Create multiple channels for different purposes
 * const { channels } = ctx.createChannels(["ui", "data", "sync"]);
 */
export const createContext = createChannelContext;

/**
 * Get or create a shared context by name
 *
 * @example
 * // Multiple components can share the same context
 * const sharedCtx = getSharedContext("app-state");
 */
export const getSharedContext = getOrCreateContext;

/**
 * Create multiple channels at once in a new context
 *
 * @example
 * const { context, channels } = createMultiChannel(["api", "ui", "events"]);
 * channels.get("api")?.handler.request(...);
 */
export const createMultiChannel = _createChannelsInContext;

/**
 * Import a module with its own isolated context
 *
 * @example
 * const { context, module } = await importIsolatedModule("worker-1", "./computation.ts");
 * await module.compute(data);
 */
export const importIsolatedModule = _importModuleInContext;

export const connectToChannelAsModule = async (
    channel: string, options: any = {},
    broadcast: BroadcastLike | Worker | BroadcastChannel | MessagePort | null = (typeof self !== "undefined" ? (self as any) : null),
    hostChannel: string | null = "$host$"
) => {
    const host = createHostChannel(hostChannel ?? "$host$");
    await host?.createRemoteChannel(channel, options, broadcast as any);
    return wrapChannel(channel, host ?? SELF_CHANNEL?.instance);
};

export const createChromeExtensionRuntimeChannel = (channelName: string, options: any = {}): WorkerChannel => {
    const context = detectExecutionContext();
    if (context !== "chrome-extension") {
        return { async request(method: string) { throw new Error(`Chrome extension messaging not available in ${context}`); }, close() {} };
    }
    return {
        async request(method: string, args: any[] = []) {
            return new Promise((resolve, reject) => {
                try {
                    chrome.runtime.sendMessage({
                id: `crx_${Date.now()}_${Math.random().toString(36).slice(2)}`,
                        type: method, source: context, target: channelName,
                        data: args?.length === 1 ? args[0] : args,
                metadata: { timestamp: Date.now(), ...(options?.metadata ?? {}) }
                    }, (response) => {
                        if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
                        else resolve(response);
                    });
                } catch (error) { reject(error); }
            });
        },
        close() {}
    };
};
