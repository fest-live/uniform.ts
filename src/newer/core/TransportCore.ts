/**
 * Transport Core - Unified transport send/listen utilities
 *
 * Consolidates all transport-specific send and listen logic
 * into reusable functions to eliminate code duplication.
 *
 * Supports:
 * - Worker / SharedWorker / ServiceWorker
 * - WebSocket
 * - BroadcastChannel
 * - MessagePort / MessageChannel
 * - Chrome Extension API
 * - Socket.IO
 * - SharedArrayBuffer (via specialized transport)
 * - WebRTC DataChannel (via specialized transport)
 */

/// <reference lib="webworker" />

declare const clients: Clients | undefined;

import type { ChannelMessage } from "../next/observable/Observable";

// ============================================================================
// TYPES
// ============================================================================

export type TransportTarget =
    | Worker
    | SharedWorker
    | MessagePort
    | BroadcastChannel
    | WebSocket
    | "chrome-runtime"
    | "chrome-tabs"
    | "chrome-port"
    | "chrome-external"
    | "socket-io"
    | "service-worker-client"
    | "service-worker-host"
    | "shared-worker"
    | "rtc-data"
    | "atomics"
    | "self";

export type TransportType =
    | "worker"
    | "shared-worker"
    | "service-worker"
    | "broadcast"
    | "message-port"
    | "websocket"
    | "chrome-runtime"
    | "chrome-tabs"
    | "chrome-port"
    | "chrome-external"
    | "socket-io"
    | "rtc-data"
    | "atomics"
    | "self"
    | "internal";

export type SendFn<T = any> = (msg: T, transfer?: Transferable[]) => void;
export type ListenFn = (handler: (data: any) => void) => () => void;

export interface TransportMeta {
    type: TransportType;
    supports: {
        transfer: boolean;
        binary: boolean;
        bidirectional: boolean;
        broadcast: boolean;
        persistent: boolean;
    };
}

// ============================================================================
// TRANSPORT DETECTION
// ============================================================================

export function detectTransportType(transport: TransportTarget): TransportType {
    if (transport instanceof Worker) return "worker";
    if (typeof SharedWorker !== "undefined" && transport instanceof SharedWorker) return "shared-worker";
    if (transport instanceof MessagePort) return "message-port";
    if (transport instanceof BroadcastChannel) return "broadcast";
    if (transport instanceof WebSocket) return "websocket";
    if (
        typeof chrome !== "undefined" &&
        transport &&
        typeof transport === "object" &&
        typeof (transport as any).postMessage === "function" &&
        (transport as any).onMessage?.addListener
    ) {
        return "chrome-port";
    }
    if (transport === "chrome-runtime") return "chrome-runtime";
    if (transport === "chrome-tabs") return "chrome-tabs";
    if (transport === "chrome-port") return "chrome-port";
    if (transport === "chrome-external") return "chrome-external";
    if (transport === "socket-io") return "socket-io";
    if (transport === "service-worker-client") return "service-worker";
    if (transport === "service-worker-host") return "service-worker";
    if (transport === "shared-worker") return "shared-worker";
    if (transport === "rtc-data") return "rtc-data";
    if (transport === "atomics") return "atomics";
    if (transport === "self") return "self";
    return "internal";
}

export function getTransportMeta(transport: TransportTarget): TransportMeta {
    const type = detectTransportType(transport);

    const meta: Record<TransportType, TransportMeta["supports"]> = {
        "worker": { transfer: true, binary: true, bidirectional: true, broadcast: false, persistent: true },
        "shared-worker": { transfer: true, binary: true, bidirectional: true, broadcast: true, persistent: true },
        "service-worker": { transfer: true, binary: true, bidirectional: true, broadcast: true, persistent: true },
        "broadcast": { transfer: false, binary: false, bidirectional: false, broadcast: true, persistent: false },
        "message-port": { transfer: true, binary: true, bidirectional: true, broadcast: false, persistent: false },
        "websocket": { transfer: false, binary: true, bidirectional: true, broadcast: false, persistent: true },
        "chrome-runtime": { transfer: false, binary: false, bidirectional: true, broadcast: true, persistent: false },
        "chrome-tabs": { transfer: false, binary: false, bidirectional: true, broadcast: false, persistent: false },
        "chrome-port": { transfer: false, binary: false, bidirectional: true, broadcast: false, persistent: true },
        "chrome-external": { transfer: false, binary: false, bidirectional: true, broadcast: false, persistent: false },
        "socket-io": { transfer: false, binary: true, bidirectional: true, broadcast: true, persistent: true },
        "rtc-data": { transfer: false, binary: true, bidirectional: true, broadcast: false, persistent: true },
        "atomics": { transfer: false, binary: true, bidirectional: true, broadcast: false, persistent: true },
        "self": { transfer: true, binary: true, bidirectional: true, broadcast: false, persistent: true },
        "internal": { transfer: false, binary: false, bidirectional: true, broadcast: false, persistent: false }
    };

    return { type, supports: meta[type] };
}

// ============================================================================
// UNIFIED SEND
// ============================================================================

/**
 * Create send function for any transport type
 */
export function createTransportSender(
    transport: TransportTarget,
    options?: {
        tabId?: number;
        clientId?: string;
        portName?: string;
        externalId?: string;
        socketEvent?: string;
    }
): SendFn<ChannelMessage> {
    return (msg, transfer) => {
        const transferable = transfer ?? (msg as any)?.transferable ?? [];
        const { transferable: _, ...data } = msg as any;

        // Worker
        if (transport instanceof Worker) {
            transport.postMessage(data, { transfer: transferable });
            return;
        }

        // SharedWorker - send via port
        if (typeof SharedWorker !== "undefined" && transport instanceof SharedWorker) {
            transport.port.postMessage(data, { transfer: transferable });
            return;
        }

        // MessagePort
        if (transport instanceof MessagePort) {
            transport.postMessage(data, { transfer: transferable });
            return;
        }

        // BroadcastChannel (no transfer support)
        if (transport instanceof BroadcastChannel) {
            transport.postMessage(data);
            return;
        }

        // WebSocket
        if (transport instanceof WebSocket) {
            if (transport.readyState === WebSocket.OPEN) {
                // Support binary if ArrayBuffer
                if (data instanceof ArrayBuffer || ArrayBuffer.isView(data)) {
                    transport.send(data as ArrayBuffer);
                } else {
                    transport.send(JSON.stringify(data));
                }
            }
            return;
        }

        // Chrome Runtime
        if (transport === "chrome-runtime") {
            if (typeof chrome !== "undefined" && chrome.runtime) {
                chrome.runtime.sendMessage(data);
            }
            return;
        }

        // Chrome Tabs
        if (transport === "chrome-tabs") {
            if (typeof chrome !== "undefined" && chrome.tabs) {
                const tabId = options?.tabId ?? (msg as any)?._tabId;
                if (tabId != null) chrome.tabs.sendMessage(tabId, data);
            }
            return;
        }

        // Chrome Port
        if (transport === "chrome-port") {
            if (typeof chrome !== "undefined" && chrome.runtime) {
                const portName = options?.portName ?? (msg as any)?._portName;
                if (portName) {
                    const tabId = options?.tabId ?? (msg as any)?._tabId;
                    const port = tabId != null && chrome.tabs?.connect
                        ? chrome.tabs.connect(tabId, { name: portName })
                        : chrome.runtime.connect({ name: portName });
                    port.postMessage(data);
                }
            }
            return;
        }

        // Chrome External (send to another extension/app)
        if (transport === "chrome-external") {
            if (typeof chrome !== "undefined" && chrome.runtime) {
                const externalId = options?.externalId ?? (msg as any)?._externalId;
                if (externalId) chrome.runtime.sendMessage(externalId, data);
            }
            return;
        }

        // Service Worker Client (from page to SW)
        if (transport === "service-worker-client") {
            if ("serviceWorker" in navigator) {
                navigator.serviceWorker.ready.then((reg) => {
                    reg.active?.postMessage(data, transferable);
                });
            }
            return;
        }

        // Service Worker Host (from SW to client)
        if (transport === "service-worker-host") {
            if (typeof clients !== "undefined") {
                const clientId = options?.clientId ?? (msg as any)?._clientId;
                if (clientId) {
                    clients.get(clientId).then((c) => c?.postMessage(data, transferable));
                } else {
                    clients.matchAll({ includeUncontrolled: true }).then((all) => {
                        all.forEach((c) => c.postMessage(data, transferable));
                    });
                }
            }
            return;
        }

        // Self (Worker/SW context)
        if (transport === "self") {
            if (typeof self !== "undefined" && "postMessage" in self) {
                (self as any).postMessage(data, { transfer: transferable });
            }
            return;
        }
    };
}

// ============================================================================
// UNIFIED LISTEN
// ============================================================================

/**
 * Create listener setup for any transport type
 * Returns cleanup function
 */
export function createTransportListener(
    transport: TransportTarget,
    onMessage: (data: any) => void,
    onError?: (err: Error) => void,
    onClose?: () => void,
    options?: {
        portName?: string;
        tabId?: number;
        socketEvents?: string[];
    }
): () => void {
    const msgHandler = (e: MessageEvent) => {
        if (transport instanceof WebSocket && typeof e.data === "string") {
            try { onMessage(JSON.parse(e.data)); }
            catch (err) { onError?.(err as Error); }
        } else if (transport instanceof WebSocket && e.data instanceof ArrayBuffer) {
            onMessage(e.data);
        } else {
            onMessage(e.data);
        }
    };

    const errHandler = (e: ErrorEvent | Event) => {
        onError?.(new Error((e as ErrorEvent).message ?? "Transport error"));
    };

    const closeHandler = () => onClose?.();

    // Worker
    if (transport instanceof Worker) {
        transport.addEventListener("message", msgHandler);
        transport.addEventListener("error", errHandler);
        return () => {
            transport.removeEventListener("message", msgHandler);
            transport.removeEventListener("error", errHandler);
        };
    }

    // SharedWorker
    if (typeof SharedWorker !== "undefined" && transport instanceof SharedWorker) {
        transport.port.addEventListener("message", msgHandler);
        transport.port.addEventListener("messageerror", errHandler as any);
        transport.port.start();
        return () => {
            transport.port.removeEventListener("message", msgHandler);
            transport.port.removeEventListener("messageerror", errHandler as any);
            transport.port.close();
        };
    }

    // MessagePort
    if (transport instanceof MessagePort) {
        transport.addEventListener("message", msgHandler);
        transport.start();
        return () => {
            transport.removeEventListener("message", msgHandler);
            transport.close();
        };
    }

    // BroadcastChannel
    if (transport instanceof BroadcastChannel) {
        transport.addEventListener("message", msgHandler);
        return () => {
            transport.removeEventListener("message", msgHandler);
            transport.close();
        };
    }

    // WebSocket
    if (transport instanceof WebSocket) {
        transport.addEventListener("message", msgHandler);
        transport.addEventListener("error", errHandler);
        transport.addEventListener("close", closeHandler);
        return () => {
            transport.removeEventListener("message", msgHandler);
            transport.removeEventListener("error", errHandler);
            transport.removeEventListener("close", closeHandler);
            if (transport.readyState === WebSocket.OPEN) {
                transport.close();
            }
        };
    }

    // Chrome Runtime
    if (transport === "chrome-runtime") {
        if (typeof chrome !== "undefined" && chrome.runtime) {
            const listener = (msg: any) => { onMessage(msg); return false; };
            chrome.runtime.onMessage.addListener(listener);
            return () => chrome.runtime.onMessage.removeListener(listener);
        }
    }

    // Chrome Tabs (tab-filtered runtime messages)
    if (transport === "chrome-tabs") {
        if (typeof chrome !== "undefined" && chrome.runtime) {
            const tabId = options?.tabId;
            if (tabId != null) {
                return createChromeTabsListener(tabId, (msg) => onMessage(msg));
            }
            const listener = (msg: any) => { onMessage(msg); return false; };
            chrome.runtime.onMessage.addListener(listener);
            return () => chrome.runtime.onMessage.removeListener(listener);
        }
    }

    // Chrome Port
    if (transport === "chrome-port") {
        if (typeof chrome !== "undefined" && chrome.runtime) {
            const portName = options?.portName;
            if (portName) {
                const port = chrome.runtime.connect({ name: portName });
                port.onMessage.addListener(onMessage);
                port.onDisconnect.addListener(closeHandler);
                return () => port.disconnect();
            }
        }
    }

    // Chrome External (messages from external extension/app)
    if (transport === "chrome-external") {
        if (typeof chrome !== "undefined" && chrome.runtime?.onMessageExternal) {
            const listener = (msg: any) => { onMessage(msg); return false; };
            chrome.runtime.onMessageExternal.addListener(listener);
            return () => chrome.runtime.onMessageExternal.removeListener(listener);
        }
    }

    // Service Worker Client
    if (transport === "service-worker-client") {
        if ("serviceWorker" in navigator) {
            navigator.serviceWorker.addEventListener("message", msgHandler);
            return () => navigator.serviceWorker.removeEventListener("message", msgHandler);
        }
    }

    // Service Worker Host / Self
    if (transport === "service-worker-host" || transport === "self") {
        const handler = (e: MessageEvent) => {
            const clientId = transport === "service-worker-host" ? (e.source as any)?.id : undefined;
            onMessage(clientId ? { ...e.data, _clientId: clientId } : e.data);
        };
        self.addEventListener("message", handler as any);
        return () => self.removeEventListener("message", handler as any);
    }

    return () => {};
}

// ============================================================================
// CHROME LISTENER WITH SEND RESPONSE
// ============================================================================

export function createChromeListener(
    onMessage: (msg: any, sendResponse: (resp: any) => void, sender?: chrome.runtime.MessageSender) => boolean | void,
    options?: { external?: boolean }
): () => void {
    if (typeof chrome === "undefined" || !chrome.runtime) return () => {};

    const listener = (
        message: any,
        sender: chrome.runtime.MessageSender,
        sendResponse: (response?: any) => void
    ) => onMessage(message, sendResponse, sender);

    if (options?.external && chrome.runtime.onMessageExternal) {
        chrome.runtime.onMessageExternal.addListener(listener);
        return () => chrome.runtime.onMessageExternal.removeListener(listener);
    }

    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
}

// ============================================================================
// CHROME TABS LISTENER
// ============================================================================

export function createChromeTabsListener(
    tabId: number,
    onMessage: (msg: any, sender?: chrome.runtime.MessageSender) => void
): () => void {
    if (typeof chrome === "undefined" || !chrome.runtime) return () => {};

    const listener = (msg: any, sender: chrome.runtime.MessageSender) => {
        if (sender.tab?.id === tabId) {
            onMessage(msg, sender);
        }
    };

    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
}

// ============================================================================
// WEBSOCKET ENHANCED
// ============================================================================

export interface WebSocketOptions {
    protocols?: string | string[];
    binaryType?: BinaryType;
    reconnect?: boolean;
    reconnectInterval?: number;
    maxReconnectAttempts?: number;
}

export function createWebSocketTransport(
    url: string,
    options: WebSocketOptions = {}
): {
    socket: WebSocket;
    send: SendFn;
    listen: (handler: (data: any) => void) => () => void;
    reconnect: () => void;
    close: () => void;
} {
    let socket = new WebSocket(url, options.protocols);
    if (options.binaryType) socket.binaryType = options.binaryType;

    let reconnectAttempts = 0;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const send: SendFn = (msg, transfer) => {
        if (socket.readyState !== WebSocket.OPEN) return;

        if (msg instanceof ArrayBuffer || ArrayBuffer.isView(msg)) {
            socket.send(msg as ArrayBuffer);
        } else {
            socket.send(JSON.stringify(msg));
        }
    };

    const reconnect = () => {
        if (reconnectAttempts >= (options.maxReconnectAttempts ?? 5)) return;

        reconnectAttempts++;
        socket = new WebSocket(url, options.protocols);
        if (options.binaryType) socket.binaryType = options.binaryType;
    };

    const close = () => {
        if (reconnectTimer) clearTimeout(reconnectTimer);
        socket.close();
    };

    if (options.reconnect) {
        socket.addEventListener("close", () => {
            reconnectTimer = setTimeout(reconnect, options.reconnectInterval ?? 3000);
        });
    }

    return {
        socket,
        send,
        listen: (handler) => {
            const h = (e: MessageEvent) => {
                if (typeof e.data === "string") {
                    try { handler(JSON.parse(e.data)); } catch {}
                } else {
                    handler(e.data);
                }
            };
            socket.addEventListener("message", h);
            return () => socket.removeEventListener("message", h);
        },
        reconnect,
        close
    };
}

// ============================================================================
// BROADCAST CHANNEL ENHANCED
// ============================================================================

export function createBroadcastTransport(channelName: string): {
    channel: BroadcastChannel;
    send: SendFn;
    listen: (handler: (data: any) => void) => () => void;
    close: () => void;
} {
    const channel = new BroadcastChannel(channelName);

    return {
        channel,
        send: (msg) => channel.postMessage(msg),
        listen: (handler) => {
            const h = (e: MessageEvent) => handler(e.data);
            channel.addEventListener("message", h);
            return () => channel.removeEventListener("message", h);
        },
        close: () => channel.close()
    };
}

// ============================================================================
// FACTORY
// ============================================================================

export const TransportCoreFactory = {
    createSender: createTransportSender,
    createListener: createTransportListener,
    detectType: detectTransportType,
    getMeta: getTransportMeta,
    chrome: {
        createListener: createChromeListener,
        createTabsListener: createChromeTabsListener
    },
    websocket: createWebSocketTransport,
    broadcast: createBroadcastTransport
};
