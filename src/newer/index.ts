/**
 * Uniform.ts - Unified Channel Communication Library
 *
 * Provides a unified API for cross-context communication:
 * - Workers, SharedWorkers, ServiceWorkers
 * - BroadcastChannel, MessagePort, WebSocket
 * - Chrome Extension messaging
 * - SharedArrayBuffer + Atomics
 * - WebRTC DataChannel
 */

// ============================================================================
// TYPES
// ============================================================================

export type {
    WReflectDescriptor, WReq, WResp, WError, WSuccess,
    Observer, Subscription, Subscribable, Subscriber, Producer,
    ChannelMessage, ChannelState, ChannelMeta,
    TransportType, TransportTarget, ConnectionOptions,
    ResponderFn, InvokerHandler, MessageHandler, SendFn, PendingRequest,
    AtomicsConfig, RTCConfig, SharedWorkerConfig, PortConfig,
    TransferableConfig, TransportCapabilities
} from "./next/types/Interface";

export { WStatus, WType, WReflectAction } from "./next/types/Interface";

// ============================================================================
// CORE (Transport & Request Handling)
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
// OBSERVABLE (Core)
// ============================================================================

export {
    // Core classes
    Observable,
    ChannelSubject,
    ReplayChannelSubject,
    ChannelObservable,
    MessageObservable,

    // Invoker factories
    makeWorkerInvoker,
    makeMessagePortInvoker,
    makeBroadcastInvoker,
    makeWebSocketInvoker,
    makeChromeRuntimeInvoker,
    makeServiceWorkerClientInvoker,
    makeServiceWorkerHostInvoker,
    makeSelfInvoker,

    // Handlers
    createInvokerObservable,
    createReflectHandler,
    createBidirectionalChannel,

    // Operators
    filter, map, take, takeUntil, debounce, throttle,

    // Utilities
    fromEvent, fromPromise, delay, interval, merge, when, createMessageId,

    // Factory
    ObservableFactory,

    // Types
    type BidirectionalChannel
} from "./next/observable/Observable";

// ============================================================================
// UNIFIED CHANNEL (Primary API)
// ============================================================================

export {
    UnifiedChannel,
    createUnifiedChannel,
    setupUnifiedChannel,
    createUnifiedChannelPair,
    getUnifiedChannel,
    getUnifiedChannelNames,
    closeUnifiedChannel,
    getWorkerChannel,
    exposeFromUnified,
    remoteFromUnified,
    type UnifiedChannelConfig,
    type ConnectOptions
} from "./next/channel/UnifiedChannel";

// ============================================================================
// INVOKER (Requestor/Responder Pattern)
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
    detectContextType,
    detectTransportType as detectTransport,
    detectIncomingContextType,
    type InvokerConfig,
    type ReflectLike,
    type InvocationResponse,
    type ContextType,
    type IncomingInvocation
} from "./next/channel/Invoker";

// ============================================================================
// MULTI-CHANNEL CONTEXT
// ============================================================================

export {
    ChannelContext,
    createChannelContext,
    getOrCreateContext,
    getContext,
    deleteContext,
    getContextNames,
    createChannelsInContext,
    importModuleInContext,
    getDefaultContext,
    addWorkerChannel,
    addPortChannel,
    addBroadcastChannel,
    addSelfChannelToDefault,
    deferChannel,
    initDeferredChannel,
    getChannelFromDefault,
    createDefaultChannelPair,
    type ChannelContextOptions,
    type ChannelEndpoint,
    type RemoteChannelInfo,
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
// TRANSPORT ADAPTERS
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
    createBidirectionalChannel as createBidirectionalTransport
} from "./next/transport/TransportObservable";

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
    getWorkerResponder,
    getWorkerInvoker,
    exposeFromWorker,
    onWorkerInvocation,
    createHostProxy,
    importInHost,
    type IncomingConnection,
    type ChannelCreatedEvent,
    type WorkerContextConfig
} from "./next/transport/Worker";

// ============================================================================
// CHROME EXTENSION
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

// ============================================================================
// SOCKET.IO
// ============================================================================

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

// Atomics (SharedArrayBuffer)
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

// Unified Transport Factory
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
// STORAGE
// ============================================================================

export * from "./next/storage/Storage";
export * from "./next/storage/TransferableStorage";
export * from "./next/storage/Queued";
export * from "./next/storage/DataBase";
export * from "./next/transport/ServiceWorkerHost";

// ============================================================================
// UTILITIES
// ============================================================================

export * from "./next/utils/Env";
export * from "./next/utils/Utils";
export * from "./next/utils/Wrappers";

// ============================================================================
// PROXY (Unified Proxy Creation)
// ============================================================================

export {
    // Types
    type ProxyInvoker,
    type ProxyDescriptor,
    type ProxyConfig,
    type ProxyMethods as ProxyMethodsType,
    type RemoteProxy,
    type ExposeHandler,
    type ProxySender,

    // Symbols
    PROXY_MARKER,
    PROXY_INTERNALS,

    // Classes
    RemoteProxyHandler,
    DispatchProxyHandler as DispatchHandler,
    ProxyBuilder,

    // Factory functions
    createRemoteProxy,
    wrapDescriptor,
    isRemoteProxy,
    getProxyDescriptor,
    getProxyInternals,
    createExposeHandler,
    createSenderProxy,
    proxyBuilder
} from "./next/channel/Proxy";

// ============================================================================
// LEGACY (Backward Compatibility)
// ============================================================================

export {
    ChannelHandler,
    RemoteChannelHelper,
    SELF_CHANNEL,
    CHANNEL_MAP,
    RemoteChannels,
    initChannelHandler,
    loadWorker,
    $createOrUseExistingChannel,
    createHostChannel,
    createOrUseExistingChannel
} from "./next/channel/Channels";

export {
    makeRequestProxy,
    makeObservableRequestProxy,
    wrapChannel,
    wrapObservableChannel,
    createObservableChannel,
    DispatchProxyHandler
} from "./next/channel/RequestProxy";

export {
    makeChannelMessageHandler,
    ObservableRequestDispatcher,
    ChannelMessageObservable,
    createChannelRequestHandler
} from "./next/channel/ChannelMessageHandler";

// Aliases for legacy support
export { ChannelHandler as ObservableChannelHandler } from "./next/channel/Channels";
export { Observable as ChannelNativeObservable } from "./next/observable/Observable";

// ============================================================================
// HIGH-LEVEL API
// ============================================================================

import { createOrUseExistingChannel, createHostChannel, SELF_CHANNEL } from "./next/channel/Channels";
import { wrapChannel } from "./next/channel/RequestProxy";
import { createChannelContext, getOrCreateContext, createChannelsInContext, importModuleInContext } from "./next/channel/ChannelContext";
import { detectExecutionContext } from "./next/utils/Env";
import type { WorkerChannel } from "./next/storage/Queued";

export interface BroadcastLike {
    addEventListener: (type: "message" | "error", listener: (...args: any[]) => any) => void;
    removeEventListener?: (type: "message" | "error", listener: (...args: any[]) => any) => void;
    postMessage: (message: any, transfer?: any) => void;
    close?: () => void;
    start?: () => void;
}

/** Sync with a remote channel */
export const sync = async (channel: string, options: any = {}, broadcast: BroadcastLike | Worker | BroadcastChannel | MessagePort | null = null) =>
    createOrUseExistingChannel(channel, options, (broadcast ?? (typeof self !== "undefined" ? (self as any) : null)) as any);

/** Import a module in a remote channel */
export const importModuleInChannel = async (
    channel: string, url: string, options: any = {},
    broadcast: BroadcastLike | Worker | BroadcastChannel | MessagePort | null = (typeof self !== "undefined" ? (self as any) : null)
) => {
    const remote = await createOrUseExistingChannel(channel, options?.channelOptions, broadcast as any);
    return remote?.doImportModule?.(url, options?.importOptions);
};

/** Create a new isolated channel context */
export const createContext = createChannelContext;

/** Get or create a shared context by name */
export const getSharedContext = getOrCreateContext;

/** Create multiple channels in a new context */
export const createMultiChannel = createChannelsInContext;

/** Import a module with its own isolated context */
export const importIsolatedModule = importModuleInContext;

/** Connect to a channel as a module */
export const connectToChannelAsModule = async (
    channel: string, options: any = {},
    broadcast: BroadcastLike | Worker | BroadcastChannel | MessagePort | null = (typeof self !== "undefined" ? (self as any) : null),
    hostChannel: string | null = "$host$"
) => {
    const host = createHostChannel(hostChannel ?? "$host$");
    await host?.createRemoteChannel(channel, options, broadcast as any);
    return wrapChannel(channel, host ?? SELF_CHANNEL?.instance);
};

/** Create Chrome extension runtime channel */
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
