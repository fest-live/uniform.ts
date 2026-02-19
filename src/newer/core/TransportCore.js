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
// ============================================================================
// TRANSPORT DETECTION
// ============================================================================
export function detectTransportType(transport) {
    if (transport instanceof Worker)
        return "worker";
    if (typeof SharedWorker !== "undefined" && transport instanceof SharedWorker)
        return "shared-worker";
    if (transport instanceof MessagePort)
        return "message-port";
    if (transport instanceof BroadcastChannel)
        return "broadcast";
    if (transport instanceof WebSocket)
        return "websocket";
    if (typeof chrome !== "undefined" &&
        transport &&
        typeof transport === "object" &&
        typeof transport.postMessage === "function" &&
        transport.onMessage?.addListener) {
        return "chrome-port";
    }
    if (transport === "chrome-runtime")
        return "chrome-runtime";
    if (transport === "chrome-tabs")
        return "chrome-tabs";
    if (transport === "chrome-port")
        return "chrome-port";
    if (transport === "chrome-external")
        return "chrome-external";
    if (transport === "socket-io")
        return "socket-io";
    if (transport === "service-worker-client")
        return "service-worker";
    if (transport === "service-worker-host")
        return "service-worker";
    if (transport === "shared-worker")
        return "shared-worker";
    if (transport === "rtc-data")
        return "rtc-data";
    if (transport === "atomics")
        return "atomics";
    if (transport === "self")
        return "self";
    return "internal";
}
export function getTransportMeta(transport) {
    const type = detectTransportType(transport);
    const meta = {
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
export function createTransportSender(transport, options) {
    return (msg, transfer) => {
        const transferable = transfer ?? msg?.transferable ?? [];
        const { transferable: _, ...data } = msg;
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
                    transport.send(data);
                }
                else {
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
                const tabId = options?.tabId ?? msg?._tabId;
                if (tabId != null)
                    chrome.tabs.sendMessage(tabId, data);
            }
            return;
        }
        // Chrome Port
        if (transport === "chrome-port") {
            if (typeof chrome !== "undefined" && chrome.runtime) {
                const portName = options?.portName ?? msg?._portName;
                if (portName) {
                    const tabId = options?.tabId ?? msg?._tabId;
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
                const externalId = options?.externalId ?? msg?._externalId;
                if (externalId)
                    chrome.runtime.sendMessage(externalId, data);
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
                const clientId = options?.clientId ?? msg?._clientId;
                if (clientId) {
                    clients.get(clientId).then((c) => c?.postMessage(data, transferable));
                }
                else {
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
                self.postMessage(data, { transfer: transferable });
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
export function createTransportListener(transport, onMessage, onError, onClose, options) {
    const msgHandler = (e) => {
        if (transport instanceof WebSocket && typeof e.data === "string") {
            try {
                onMessage(JSON.parse(e.data));
            }
            catch (err) {
                onError?.(err);
            }
        }
        else if (transport instanceof WebSocket && e.data instanceof ArrayBuffer) {
            onMessage(e.data);
        }
        else {
            onMessage(e.data);
        }
    };
    const errHandler = (e) => {
        onError?.(new Error(e.message ?? "Transport error"));
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
        transport.port.addEventListener("messageerror", errHandler);
        transport.port.start();
        return () => {
            transport.port.removeEventListener("message", msgHandler);
            transport.port.removeEventListener("messageerror", errHandler);
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
            const listener = (msg) => { onMessage(msg); return false; };
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
            const listener = (msg) => { onMessage(msg); return false; };
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
            const listener = (msg) => { onMessage(msg); return false; };
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
        const handler = (e) => {
            const clientId = transport === "service-worker-host" ? e.source?.id : undefined;
            onMessage(clientId ? { ...e.data, _clientId: clientId } : e.data);
        };
        self.addEventListener("message", handler);
        return () => self.removeEventListener("message", handler);
    }
    return () => { };
}
// ============================================================================
// CHROME LISTENER WITH SEND RESPONSE
// ============================================================================
export function createChromeListener(onMessage, options) {
    if (typeof chrome === "undefined" || !chrome.runtime)
        return () => { };
    const listener = (message, sender, sendResponse) => onMessage(message, sendResponse, sender);
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
export function createChromeTabsListener(tabId, onMessage) {
    if (typeof chrome === "undefined" || !chrome.runtime)
        return () => { };
    const listener = (msg, sender) => {
        if (sender.tab?.id === tabId) {
            onMessage(msg, sender);
        }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
}
export function createWebSocketTransport(url, options = {}) {
    let socket = new WebSocket(url, options.protocols);
    if (options.binaryType)
        socket.binaryType = options.binaryType;
    let reconnectAttempts = 0;
    let reconnectTimer = null;
    const send = (msg, transfer) => {
        if (socket.readyState !== WebSocket.OPEN)
            return;
        if (msg instanceof ArrayBuffer || ArrayBuffer.isView(msg)) {
            socket.send(msg);
        }
        else {
            socket.send(JSON.stringify(msg));
        }
    };
    const reconnect = () => {
        if (reconnectAttempts >= (options.maxReconnectAttempts ?? 5))
            return;
        reconnectAttempts++;
        socket = new WebSocket(url, options.protocols);
        if (options.binaryType)
            socket.binaryType = options.binaryType;
    };
    const close = () => {
        if (reconnectTimer)
            clearTimeout(reconnectTimer);
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
            const h = (e) => {
                if (typeof e.data === "string") {
                    try {
                        handler(JSON.parse(e.data));
                    }
                    catch { }
                }
                else {
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
export function createBroadcastTransport(channelName) {
    const channel = new BroadcastChannel(channelName);
    return {
        channel,
        send: (msg) => channel.postMessage(msg),
        listen: (handler) => {
            const h = (e) => handler(e.data);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVHJhbnNwb3J0Q29yZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIlRyYW5zcG9ydENvcmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7Ozs7Ozs7OztHQWVHO0FBRUgsaUNBQWlDO0FBMkRqQywrRUFBK0U7QUFDL0Usc0JBQXNCO0FBQ3RCLCtFQUErRTtBQUUvRSxNQUFNLFVBQVUsbUJBQW1CLENBQUMsU0FBMEI7SUFDMUQsSUFBSSxTQUFTLFlBQVksTUFBTTtRQUFFLE9BQU8sUUFBUSxDQUFDO0lBQ2pELElBQUksT0FBTyxZQUFZLEtBQUssV0FBVyxJQUFJLFNBQVMsWUFBWSxZQUFZO1FBQUUsT0FBTyxlQUFlLENBQUM7SUFDckcsSUFBSSxTQUFTLFlBQVksV0FBVztRQUFFLE9BQU8sY0FBYyxDQUFDO0lBQzVELElBQUksU0FBUyxZQUFZLGdCQUFnQjtRQUFFLE9BQU8sV0FBVyxDQUFDO0lBQzlELElBQUksU0FBUyxZQUFZLFNBQVM7UUFBRSxPQUFPLFdBQVcsQ0FBQztJQUN2RCxJQUNJLE9BQU8sTUFBTSxLQUFLLFdBQVc7UUFDN0IsU0FBUztRQUNULE9BQU8sU0FBUyxLQUFLLFFBQVE7UUFDN0IsT0FBUSxTQUFpQixDQUFDLFdBQVcsS0FBSyxVQUFVO1FBQ25ELFNBQWlCLENBQUMsU0FBUyxFQUFFLFdBQVcsRUFDM0MsQ0FBQztRQUNDLE9BQU8sYUFBYSxDQUFDO0lBQ3pCLENBQUM7SUFDRCxJQUFJLFNBQVMsS0FBSyxnQkFBZ0I7UUFBRSxPQUFPLGdCQUFnQixDQUFDO0lBQzVELElBQUksU0FBUyxLQUFLLGFBQWE7UUFBRSxPQUFPLGFBQWEsQ0FBQztJQUN0RCxJQUFJLFNBQVMsS0FBSyxhQUFhO1FBQUUsT0FBTyxhQUFhLENBQUM7SUFDdEQsSUFBSSxTQUFTLEtBQUssaUJBQWlCO1FBQUUsT0FBTyxpQkFBaUIsQ0FBQztJQUM5RCxJQUFJLFNBQVMsS0FBSyxXQUFXO1FBQUUsT0FBTyxXQUFXLENBQUM7SUFDbEQsSUFBSSxTQUFTLEtBQUssdUJBQXVCO1FBQUUsT0FBTyxnQkFBZ0IsQ0FBQztJQUNuRSxJQUFJLFNBQVMsS0FBSyxxQkFBcUI7UUFBRSxPQUFPLGdCQUFnQixDQUFDO0lBQ2pFLElBQUksU0FBUyxLQUFLLGVBQWU7UUFBRSxPQUFPLGVBQWUsQ0FBQztJQUMxRCxJQUFJLFNBQVMsS0FBSyxVQUFVO1FBQUUsT0FBTyxVQUFVLENBQUM7SUFDaEQsSUFBSSxTQUFTLEtBQUssU0FBUztRQUFFLE9BQU8sU0FBUyxDQUFDO0lBQzlDLElBQUksU0FBUyxLQUFLLE1BQU07UUFBRSxPQUFPLE1BQU0sQ0FBQztJQUN4QyxPQUFPLFVBQVUsQ0FBQztBQUN0QixDQUFDO0FBRUQsTUFBTSxVQUFVLGdCQUFnQixDQUFDLFNBQTBCO0lBQ3ZELE1BQU0sSUFBSSxHQUFHLG1CQUFtQixDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBRTVDLE1BQU0sSUFBSSxHQUFxRDtRQUMzRCxRQUFRLEVBQUUsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsYUFBYSxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLFVBQVUsRUFBRSxJQUFJLEVBQUU7UUFDbkcsZUFBZSxFQUFFLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxVQUFVLEVBQUUsSUFBSSxFQUFFO1FBQ3pHLGdCQUFnQixFQUFFLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxVQUFVLEVBQUUsSUFBSSxFQUFFO1FBQzFHLFdBQVcsRUFBRSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxhQUFhLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsVUFBVSxFQUFFLEtBQUssRUFBRTtRQUN6RyxjQUFjLEVBQUUsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsYUFBYSxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLFVBQVUsRUFBRSxLQUFLLEVBQUU7UUFDMUcsV0FBVyxFQUFFLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxVQUFVLEVBQUUsSUFBSSxFQUFFO1FBQ3ZHLGdCQUFnQixFQUFFLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxVQUFVLEVBQUUsS0FBSyxFQUFFO1FBQzdHLGFBQWEsRUFBRSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsVUFBVSxFQUFFLEtBQUssRUFBRTtRQUMzRyxhQUFhLEVBQUUsRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsYUFBYSxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLFVBQVUsRUFBRSxJQUFJLEVBQUU7UUFDMUcsaUJBQWlCLEVBQUUsRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsYUFBYSxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLFVBQVUsRUFBRSxLQUFLLEVBQUU7UUFDL0csV0FBVyxFQUFFLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxVQUFVLEVBQUUsSUFBSSxFQUFFO1FBQ3RHLFVBQVUsRUFBRSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLElB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UUFDM0QsQ0FBQztRQUNELEtBQUssRUFBRSxHQUFHLEVBQUUsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFO0tBQy9CLENBQUM7QUFDTixDQUFDO0FBRUQsK0VBQStFO0FBQy9FLFVBQVU7QUFDViwrRUFBK0U7QUFFL0UsTUFBTSxDQUFDLE1BQU0sb0JBQW9CLEdBQUc7SUFDaEMsWUFBWSxFQUFFLHFCQUFxQjtJQUNuQyxjQUFjLEVBQUUsdUJBQXVCO0lBQ3ZDLFVBQVUsRUFBRSxtQkFBbUI7SUFDL0IsT0FBTyxFQUFFLGdCQUFnQjtJQUN6QixNQUFNLEVBQUU7UUFDSixjQUFjLEVBQUUsb0JBQW9CO1FBQ3BDLGtCQUFrQixFQUFFLHdCQUF3QjtLQUMvQztJQUNELFNBQVMsRUFBRSx3QkFBd0I7SUFDbkMsU0FBUyxFQUFFLHdCQUF3QjtDQUN0QyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBUcmFuc3BvcnQgQ29yZSAtIFVuaWZpZWQgdHJhbnNwb3J0IHNlbmQvbGlzdGVuIHV0aWxpdGllc1xuICpcbiAqIENvbnNvbGlkYXRlcyBhbGwgdHJhbnNwb3J0LXNwZWNpZmljIHNlbmQgYW5kIGxpc3RlbiBsb2dpY1xuICogaW50byByZXVzYWJsZSBmdW5jdGlvbnMgdG8gZWxpbWluYXRlIGNvZGUgZHVwbGljYXRpb24uXG4gKlxuICogU3VwcG9ydHM6XG4gKiAtIFdvcmtlciAvIFNoYXJlZFdvcmtlciAvIFNlcnZpY2VXb3JrZXJcbiAqIC0gV2ViU29ja2V0XG4gKiAtIEJyb2FkY2FzdENoYW5uZWxcbiAqIC0gTWVzc2FnZVBvcnQgLyBNZXNzYWdlQ2hhbm5lbFxuICogLSBDaHJvbWUgRXh0ZW5zaW9uIEFQSVxuICogLSBTb2NrZXQuSU9cbiAqIC0gU2hhcmVkQXJyYXlCdWZmZXIgKHZpYSBzcGVjaWFsaXplZCB0cmFuc3BvcnQpXG4gKiAtIFdlYlJUQyBEYXRhQ2hhbm5lbCAodmlhIHNwZWNpYWxpemVkIHRyYW5zcG9ydClcbiAqL1xuXG4vLy8gPHJlZmVyZW5jZSBsaWI9XCJ3ZWJ3b3JrZXJcIiAvPlxuXG5kZWNsYXJlIGNvbnN0IGNsaWVudHM6IENsaWVudHMgfCB1bmRlZmluZWQ7XG5cbmltcG9ydCB0eXBlIHsgQ2hhbm5lbE1lc3NhZ2UgfSBmcm9tIFwiLi4vbmV4dC9vYnNlcnZhYmxlL09ic2VydmFibGVcIjtcblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gVFlQRVNcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuZXhwb3J0IHR5cGUgVHJhbnNwb3J0VGFyZ2V0ID1cbiAgICB8IFdvcmtlclxuICAgIHwgU2hhcmVkV29ya2VyXG4gICAgfCBNZXNzYWdlUG9ydFxuICAgIHwgQnJvYWRjYXN0Q2hhbm5lbFxuICAgIHwgV2ViU29ja2V0XG4gICAgfCBcImNocm9tZS1ydW50aW1lXCJcbiAgICB8IFwiY2hyb21lLXRhYnNcIlxuICAgIHwgXCJjaHJvbWUtcG9ydFwiXG4gICAgfCBcImNocm9tZS1leHRlcm5hbFwiXG4gICAgfCBcInNvY2tldC1pb1wiXG4gICAgfCBcInNlcnZpY2Utd29ya2VyLWNsaWVudFwiXG4gICAgfCBcInNlcnZpY2Utd29ya2VyLWhvc3RcIlxuICAgIHwgXCJzaGFyZWQtd29ya2VyXCJcbiAgICB8IFwicnRjLWRhdGFcIlxuICAgIHwgXCJhdG9taWNzXCJcbiAgICB8IFwic2VsZlwiO1xuXG5leHBvcnQgdHlwZSBUcmFuc3BvcnRUeXBlID1cbiAgICB8IFwid29ya2VyXCJcbiAgICB8IFwic2hhcmVkLXdvcmtlclwiXG4gICAgfCBcInNlcnZpY2Utd29ya2VyXCJcbiAgICB8IFwiYnJvYWRjYXN0XCJcbiAgICB8IFwibWVzc2FnZS1wb3J0XCJcbiAgICB8IFwid2Vic29ja2V0XCJcbiAgICB8IFwiY2hyb21lLXJ1bnRpbWVcIlxuICAgIHwgXCJjaHJvbWUtdGFic1wiXG4gICAgfCBcImNocm9tZS1wb3J0XCJcbiAgICB8IFwiY2hyb21lLWV4dGVybmFsXCJcbiAgICB8IFwic29ja2V0LWlvXCJcbiAgICB8IFwicnRjLWRhdGFcIlxuICAgIHwgXCJhdG9taWNzXCJcbiAgICB8IFwic2VsZlwiXG4gICAgfCBcImludGVybmFsXCI7XG5cbmV4cG9ydCB0eXBlIFNlbmRGbjxUID0gYW55PiA9IChtc2c6IFQsIHRyYW5zZmVyPzogVHJhbnNmZXJhYmxlW10pID0+IHZvaWQ7XG5leHBvcnQgdHlwZSBMaXN0ZW5GbiA9IChoYW5kbGVyOiAoZGF0YTogYW55KSA9PiB2b2lkKSA9PiAoKSA9PiB2b2lkO1xuXG5leHBvcnQgaW50ZXJmYWNlIFRyYW5zcG9ydE1ldGEge1xuICAgIHR5cGU6IFRyYW5zcG9ydFR5cGU7XG4gICAgc3VwcG9ydHM6IHtcbiAgICAgICAgdHJhbnNmZXI6IGJvb2xlYW47XG4gICAgICAgIGJpbmFyeTogYm9vbGVhbjtcbiAgICAgICAgYmlkaXJlY3Rpb25hbDogYm9vbGVhbjtcbiAgICAgICAgYnJvYWRjYXN0OiBib29sZWFuO1xuICAgICAgICBwZXJzaXN0ZW50OiBib29sZWFuO1xuICAgIH07XG59XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFRSQU5TUE9SVCBERVRFQ1RJT05cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuZXhwb3J0IGZ1bmN0aW9uIGRldGVjdFRyYW5zcG9ydFR5cGUodHJhbnNwb3J0OiBUcmFuc3BvcnRUYXJnZXQpOiBUcmFuc3BvcnRUeXBlIHtcbiAgICBpZiAodHJhbnNwb3J0IGluc3RhbmNlb2YgV29ya2VyKSByZXR1cm4gXCJ3b3JrZXJcIjtcbiAgICBpZiAodHlwZW9mIFNoYXJlZFdvcmtlciAhPT0gXCJ1bmRlZmluZWRcIiAmJiB0cmFuc3BvcnQgaW5zdGFuY2VvZiBTaGFyZWRXb3JrZXIpIHJldHVybiBcInNoYXJlZC13b3JrZXJcIjtcbiAgICBpZiAodHJhbnNwb3J0IGluc3RhbmNlb2YgTWVzc2FnZVBvcnQpIHJldHVybiBcIm1lc3NhZ2UtcG9ydFwiO1xuICAgIGlmICh0cmFuc3BvcnQgaW5zdGFuY2VvZiBCcm9hZGNhc3RDaGFubmVsKSByZXR1cm4gXCJicm9hZGNhc3RcIjtcbiAgICBpZiAodHJhbnNwb3J0IGluc3RhbmNlb2YgV2ViU29ja2V0KSByZXR1cm4gXCJ3ZWJzb2NrZXRcIjtcbiAgICBpZiAoXG4gICAgICAgIHR5cGVvZiBjaHJvbWUgIT09IFwidW5kZWZpbmVkXCIgJiZcbiAgICAgICAgdHJhbnNwb3J0ICYmXG4gICAgICAgIHR5cGVvZiB0cmFuc3BvcnQgPT09IFwib2JqZWN0XCIgJiZcbiAgICAgICAgdHlwZW9mICh0cmFuc3BvcnQgYXMgYW55KS5wb3N0TWVzc2FnZSA9PT0gXCJmdW5jdGlvblwiICYmXG4gICAgICAgICh0cmFuc3BvcnQgYXMgYW55KS5vbk1lc3NhZ2U/LmFkZExpc3RlbmVyXG4gICAgKSB7XG4gICAgICAgIHJldHVybiBcImNocm9tZS1wb3J0XCI7XG4gICAgfVxuICAgIGlmICh0cmFuc3BvcnQgPT09IFwiY2hyb21lLXJ1bnRpbWVcIikgcmV0dXJuIFwiY2hyb21lLXJ1bnRpbWVcIjtcbiAgICBpZiAodHJhbnNwb3J0ID09PSBcImNocm9tZS10YWJzXCIpIHJldHVybiBcImNocm9tZS10YWJzXCI7XG4gICAgaWYgKHRyYW5zcG9ydCA9PT0gXCJjaHJvbWUtcG9ydFwiKSByZXR1cm4gXCJjaHJvbWUtcG9ydFwiO1xuICAgIGlmICh0cmFuc3BvcnQgPT09IFwiY2hyb21lLWV4dGVybmFsXCIpIHJldHVybiBcImNocm9tZS1leHRlcm5hbFwiO1xuICAgIGlmICh0cmFuc3BvcnQgPT09IFwic29ja2V0LWlvXCIpIHJldHVybiBcInNvY2tldC1pb1wiO1xuICAgIGlmICh0cmFuc3BvcnQgPT09IFwic2VydmljZS13b3JrZXItY2xpZW50XCIpIHJldHVybiBcInNlcnZpY2Utd29ya2VyXCI7XG4gICAgaWYgKHRyYW5zcG9ydCA9PT0gXCJzZXJ2aWNlLXdvcmtlci1ob3N0XCIpIHJldHVybiBcInNlcnZpY2Utd29ya2VyXCI7XG4gICAgaWYgKHRyYW5zcG9ydCA9PT0gXCJzaGFyZWQtd29ya2VyXCIpIHJldHVybiBcInNoYXJlZC13b3JrZXJcIjtcbiAgICBpZiAodHJhbnNwb3J0ID09PSBcInJ0Yy1kYXRhXCIpIHJldHVybiBcInJ0Yy1kYXRhXCI7XG4gICAgaWYgKHRyYW5zcG9ydCA9PT0gXCJhdG9taWNzXCIpIHJldHVybiBcImF0b21pY3NcIjtcbiAgICBpZiAodHJhbnNwb3J0ID09PSBcInNlbGZcIikgcmV0dXJuIFwic2VsZlwiO1xuICAgIHJldHVybiBcImludGVybmFsXCI7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRUcmFuc3BvcnRNZXRhKHRyYW5zcG9ydDogVHJhbnNwb3J0VGFyZ2V0KTogVHJhbnNwb3J0TWV0YSB7XG4gICAgY29uc3QgdHlwZSA9IGRldGVjdFRyYW5zcG9ydFR5cGUodHJhbnNwb3J0KTtcblxuICAgIGNvbnN0IG1ldGE6IFJlY29yZDxUcmFuc3BvcnRUeXBlLCBUcmFuc3BvcnRNZXRhW1wic3VwcG9ydHNcIl0+ID0ge1xuICAgICAgICBcIndvcmtlclwiOiB7IHRyYW5zZmVyOiB0cnVlLCBiaW5hcnk6IHRydWUsIGJpZGlyZWN0aW9uYWw6IHRydWUsIGJyb2FkY2FzdDogZmFsc2UsIHBlcnNpc3RlbnQ6IHRydWUgfSxcbiAgICAgICAgXCJzaGFyZWQtd29ya2VyXCI6IHsgdHJhbnNmZXI6IHRydWUsIGJpbmFyeTogdHJ1ZSwgYmlkaXJlY3Rpb25hbDogdHJ1ZSwgYnJvYWRjYXN0OiB0cnVlLCBwZXJzaXN0ZW50OiB0cnVlIH0sXG4gICAgICAgIFwic2VydmljZS13b3JrZXJcIjogeyB0cmFuc2ZlcjogdHJ1ZSwgYmluYXJ5OiB0cnVlLCBiaWRpcmVjdGlvbmFsOiB0cnVlLCBicm9hZGNhc3Q6IHRydWUsIHBlcnNpc3RlbnQ6IHRydWUgfSxcbiAgICAgICAgXCJicm9hZGNhc3RcIjogeyB0cmFuc2ZlcjogZmFsc2UsIGJpbmFyeTogZmFsc2UsIGJpZGlyZWN0aW9uYWw6IGZhbHNlLCBicm9hZGNhc3Q6IHRydWUsIHBlcnNpc3RlbnQ6IGZhbHNlIH0sXG4gICAgICAgIFwibWVzc2FnZS1wb3J0XCI6IHsgdHJhbnNmZXI6IHRydWUsIGJpbmFyeTogdHJ1ZSwgYmlkaXJlY3Rpb25hbDogdHJ1ZSwgYnJvYWRjYXN0OiBmYWxzZSwgcGVyc2lzdGVudDogZmFsc2UgfSxcbiAgICAgICAgXCJ3ZWJzb2NrZXRcIjogeyB0cmFuc2ZlcjogZmFsc2UsIGJpbmFyeTogdHJ1ZSwgYmlkaXJlY3Rpb25hbDogdHJ1ZSwgYnJvYWRjYXN0OiBmYWxzZSwgcGVyc2lzdGVudDogdHJ1ZSB9LFxuICAgICAgICBcImNocm9tZS1ydW50aW1lXCI6IHsgdHJhbnNmZXI6IGZhbHNlLCBiaW5hcnk6IGZhbHNlLCBiaWRpcmVjdGlvbmFsOiB0cnVlLCBicm9hZGNhc3Q6IHRydWUsIHBlcnNpc3RlbnQ6IGZhbHNlIH0sXG4gICAgICAgIFwiY2hyb21lLXRhYnNcIjogeyB0cmFuc2ZlcjogZmFsc2UsIGJpbmFyeTogZmFsc2UsIGJpZGlyZWN0aW9uYWw6IHRydWUsIGJyb2FkY2FzdDogZmFsc2UsIHBlcnNpc3RlbnQ6IGZhbHNlIH0sXG4gICAgICAgIFwiY2hyb21lLXBvcnRcIjogeyB0cmFuc2ZlcjogZmFsc2UsIGJpbmFyeTogZmFsc2UsIGJpZGlyZWN0aW9uYWw6IHRydWUsIGJyb2FkY2FzdDogZmFsc2UsIHBlcnNpc3RlbnQ6IHRydWUgfSxcbiAgICAgICAgXCJjaHJvbWUtZXh0ZXJuYWxcIjogeyB0cmFuc2ZlcjogZmFsc2UsIGJpbmFyeTogZmFsc2UsIGJpZGlyZWN0aW9uYWw6IHRydWUsIGJyb2FkY2FzdDogZmFsc2UsIHBlcnNpc3RlbnQ6IGZhbHNlIH0sXG4gICAgICAgIFwic29ja2V0LWlvXCI6IHsgdHJhbnNmZXI6IGZhbHNlLCBiaW5hcnk6IHRydWUsIGJpZGlyZWN0aW9uYWw6IHRydWUsIGJyb2FkY2FzdDogdHJ1ZSwgcGVyc2lzdGVudDogdHJ1ZSB9LFxuICAgICAgICBcInJ0Yy1kYXRhXCI6IHsgdHJhbnNmZXI6IGZhbHNlLCBiaW5hcnk6IHRydWUsIGJpZGlyZWN0aW9uYWw6IHRydWUsIGJyb2FkY2FzdDogZmFsc2UsIHBlcnNpc3RlbnQ6IHRydWUgfSxcbiAgICAgICAgXCJhdG9taWNzXCI6IHsgdHJhbnNmZXI6IGZhbHNlLCBiaW5hcnk6IHRydWUsIGJpZGlyZWN0aW9uYWw6IHRydWUsIGJyb2FkY2FzdDogZmFsc2UsIHBlcnNpc3RlbnQ6IHRydWUgfSxcbiAgICAgICAgXCJzZWxmXCI6IHsgdHJhbnNmZXI6IHRydWUsIGJpbmFyeTogdHJ1ZSwgYmlkaXJlY3Rpb25hbDogdHJ1ZSwgYnJvYWRjYXN0OiBmYWxzZSwgcGVyc2lzdGVudDogdHJ1ZSB9LFxuICAgICAgICBcImludGVybmFsXCI6IHsgdHJhbnNmZXI6IGZhbHNlLCBiaW5hcnk6IGZhbHNlLCBiaWRpcmVjdGlvbmFsOiB0cnVlLCBicm9hZGNhc3Q6IGZhbHNlLCBwZXJzaXN0ZW50OiBmYWxzZSB9XG4gICAgfTtcblxuICAgIHJldHVybiB7IHR5cGUsIHN1cHBvcnRzOiBtZXRhW3R5cGVdIH07XG59XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFVOSUZJRUQgU0VORFxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIENyZWF0ZSBzZW5kIGZ1bmN0aW9uIGZvciBhbnkgdHJhbnNwb3J0IHR5cGVcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVRyYW5zcG9ydFNlbmRlcihcbiAgICB0cmFuc3BvcnQ6IFRyYW5zcG9ydFRhcmdldCxcbiAgICBvcHRpb25zPzoge1xuICAgICAgICB0YWJJZD86IG51bWJlcjtcbiAgICAgICAgY2xpZW50SWQ/OiBzdHJpbmc7XG4gICAgICAgIHBvcnROYW1lPzogc3RyaW5nO1xuICAgICAgICBleHRlcm5hbElkPzogc3RyaW5nO1xuICAgICAgICBzb2NrZXRFdmVudD86IHN0cmluZztcbiAgICB9XG4pOiBTZW5kRm48Q2hhbm5lbE1lc3NhZ2U+IHtcbiAgICByZXR1cm4gKG1zZywgdHJhbnNmZXIpID0+IHtcbiAgICAgICAgY29uc3QgdHJhbnNmZXJhYmxlID0gdHJhbnNmZXIgPz8gKG1zZyBhcyBhbnkpPy50cmFuc2ZlcmFibGUgPz8gW107XG4gICAgICAgIGNvbnN0IHsgdHJhbnNmZXJhYmxlOiBfLCAuLi5kYXRhIH0gPSBtc2cgYXMgYW55O1xuXG4gICAgICAgIC8vIFdvcmtlclxuICAgICAgICBpZiAodHJhbnNwb3J0IGluc3RhbmNlb2YgV29ya2VyKSB7XG4gICAgICAgICAgICB0cmFuc3BvcnQucG9zdE1lc3NhZ2UoZGF0YSwgeyB0cmFuc2ZlcjogdHJhbnNmZXJhYmxlIH0pO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gU2hhcmVkV29ya2VyIC0gc2VuZCB2aWEgcG9ydFxuICAgICAgICBpZiAodHlwZW9mIFNoYXJlZFdvcmtlciAhPT0gXCJ1bmRlZmluZWRcIiAmJiB0cmFuc3BvcnQgaW5zdGFuY2VvZiBTaGFyZWRXb3JrZXIpIHtcbiAgICAgICAgICAgIHRyYW5zcG9ydC5wb3J0LnBvc3RNZXNzYWdlKGRhdGEsIHsgdHJhbnNmZXI6IHRyYW5zZmVyYWJsZSB9KTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIE1lc3NhZ2VQb3J0XG4gICAgICAgIGlmICh0cmFuc3BvcnQgaW5zdGFuY2VvZiBNZXNzYWdlUG9ydCkge1xuICAgICAgICAgICAgdHJhbnNwb3J0LnBvc3RNZXNzYWdlKGRhdGEsIHsgdHJhbnNmZXI6IHRyYW5zZmVyYWJsZSB9KTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEJyb2FkY2FzdENoYW5uZWwgKG5vIHRyYW5zZmVyIHN1cHBvcnQpXG4gICAgICAgIGlmICh0cmFuc3BvcnQgaW5zdGFuY2VvZiBCcm9hZGNhc3RDaGFubmVsKSB7XG4gICAgICAgICAgICB0cmFuc3BvcnQucG9zdE1lc3NhZ2UoZGF0YSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBXZWJTb2NrZXRcbiAgICAgICAgaWYgKHRyYW5zcG9ydCBpbnN0YW5jZW9mIFdlYlNvY2tldCkge1xuICAgICAgICAgICAgaWYgKHRyYW5zcG9ydC5yZWFkeVN0YXRlID09PSBXZWJTb2NrZXQuT1BFTikge1xuICAgICAgICAgICAgICAgIC8vIFN1cHBvcnQgYmluYXJ5IGlmIEFycmF5QnVmZmVyXG4gICAgICAgICAgICAgICAgaWYgKGRhdGEgaW5zdGFuY2VvZiBBcnJheUJ1ZmZlciB8fCBBcnJheUJ1ZmZlci5pc1ZpZXcoZGF0YSkpIHtcbiAgICAgICAgICAgICAgICAgICAgdHJhbnNwb3J0LnNlbmQoZGF0YSBhcyBBcnJheUJ1ZmZlcik7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdHJhbnNwb3J0LnNlbmQoSlNPTi5zdHJpbmdpZnkoZGF0YSkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENocm9tZSBSdW50aW1lXG4gICAgICAgIGlmICh0cmFuc3BvcnQgPT09IFwiY2hyb21lLXJ1bnRpbWVcIikge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBjaHJvbWUgIT09IFwidW5kZWZpbmVkXCIgJiYgY2hyb21lLnJ1bnRpbWUpIHtcbiAgICAgICAgICAgICAgICBjaHJvbWUucnVudGltZS5zZW5kTWVzc2FnZShkYXRhKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENocm9tZSBUYWJzXG4gICAgICAgIGlmICh0cmFuc3BvcnQgPT09IFwiY2hyb21lLXRhYnNcIikge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBjaHJvbWUgIT09IFwidW5kZWZpbmVkXCIgJiYgY2hyb21lLnRhYnMpIHtcbiAgICAgICAgICAgICAgICBjb25zdCB0YWJJZCA9IG9wdGlvbnM/LnRhYklkID8/IChtc2cgYXMgYW55KT8uX3RhYklkO1xuICAgICAgICAgICAgICAgIGlmICh0YWJJZCAhPSBudWxsKSBjaHJvbWUudGFicy5zZW5kTWVzc2FnZSh0YWJJZCwgZGF0YSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDaHJvbWUgUG9ydFxuICAgICAgICBpZiAodHJhbnNwb3J0ID09PSBcImNocm9tZS1wb3J0XCIpIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgY2hyb21lICE9PSBcInVuZGVmaW5lZFwiICYmIGNocm9tZS5ydW50aW1lKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcG9ydE5hbWUgPSBvcHRpb25zPy5wb3J0TmFtZSA/PyAobXNnIGFzIGFueSk/Ll9wb3J0TmFtZTtcbiAgICAgICAgICAgICAgICBpZiAocG9ydE5hbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdGFiSWQgPSBvcHRpb25zPy50YWJJZCA/PyAobXNnIGFzIGFueSk/Ll90YWJJZDtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcG9ydCA9IHRhYklkICE9IG51bGwgJiYgY2hyb21lLnRhYnM/LmNvbm5lY3RcbiAgICAgICAgICAgICAgICAgICAgICAgID8gY2hyb21lLnRhYnMuY29ubmVjdCh0YWJJZCwgeyBuYW1lOiBwb3J0TmFtZSB9KVxuICAgICAgICAgICAgICAgICAgICAgICAgOiBjaHJvbWUucnVudGltZS5jb25uZWN0KHsgbmFtZTogcG9ydE5hbWUgfSk7XG4gICAgICAgICAgICAgICAgICAgIHBvcnQucG9zdE1lc3NhZ2UoZGF0YSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2hyb21lIEV4dGVybmFsIChzZW5kIHRvIGFub3RoZXIgZXh0ZW5zaW9uL2FwcClcbiAgICAgICAgaWYgKHRyYW5zcG9ydCA9PT0gXCJjaHJvbWUtZXh0ZXJuYWxcIikge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBjaHJvbWUgIT09IFwidW5kZWZpbmVkXCIgJiYgY2hyb21lLnJ1bnRpbWUpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBleHRlcm5hbElkID0gb3B0aW9ucz8uZXh0ZXJuYWxJZCA/PyAobXNnIGFzIGFueSk/Ll9leHRlcm5hbElkO1xuICAgICAgICAgICAgICAgIGlmIChleHRlcm5hbElkKSBjaHJvbWUucnVudGltZS5zZW5kTWVzc2FnZShleHRlcm5hbElkLCBkYXRhKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFNlcnZpY2UgV29ya2VyIENsaWVudCAoZnJvbSBwYWdlIHRvIFNXKVxuICAgICAgICBpZiAodHJhbnNwb3J0ID09PSBcInNlcnZpY2Utd29ya2VyLWNsaWVudFwiKSB7XG4gICAgICAgICAgICBpZiAoXCJzZXJ2aWNlV29ya2VyXCIgaW4gbmF2aWdhdG9yKSB7XG4gICAgICAgICAgICAgICAgbmF2aWdhdG9yLnNlcnZpY2VXb3JrZXIucmVhZHkudGhlbigocmVnKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHJlZy5hY3RpdmU/LnBvc3RNZXNzYWdlKGRhdGEsIHRyYW5zZmVyYWJsZSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTZXJ2aWNlIFdvcmtlciBIb3N0IChmcm9tIFNXIHRvIGNsaWVudClcbiAgICAgICAgaWYgKHRyYW5zcG9ydCA9PT0gXCJzZXJ2aWNlLXdvcmtlci1ob3N0XCIpIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgY2xpZW50cyAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICAgICAgICAgIGNvbnN0IGNsaWVudElkID0gb3B0aW9ucz8uY2xpZW50SWQgPz8gKG1zZyBhcyBhbnkpPy5fY2xpZW50SWQ7XG4gICAgICAgICAgICAgICAgaWYgKGNsaWVudElkKSB7XG4gICAgICAgICAgICAgICAgICAgIGNsaWVudHMuZ2V0KGNsaWVudElkKS50aGVuKChjKSA9PiBjPy5wb3N0TWVzc2FnZShkYXRhLCB0cmFuc2ZlcmFibGUpKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjbGllbnRzLm1hdGNoQWxsKHsgaW5jbHVkZVVuY29udHJvbGxlZDogdHJ1ZSB9KS50aGVuKChhbGwpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFsbC5mb3JFYWNoKChjKSA9PiBjLnBvc3RNZXNzYWdlKGRhdGEsIHRyYW5zZmVyYWJsZSkpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTZWxmIChXb3JrZXIvU1cgY29udGV4dClcbiAgICAgICAgaWYgKHRyYW5zcG9ydCA9PT0gXCJzZWxmXCIpIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiAmJiBcInBvc3RNZXNzYWdlXCIgaW4gc2VsZikge1xuICAgICAgICAgICAgICAgIChzZWxmIGFzIGFueSkucG9zdE1lc3NhZ2UoZGF0YSwgeyB0cmFuc2ZlcjogdHJhbnNmZXJhYmxlIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgfTtcbn1cblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gVU5JRklFRCBMSVNURU5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBDcmVhdGUgbGlzdGVuZXIgc2V0dXAgZm9yIGFueSB0cmFuc3BvcnQgdHlwZVxuICogUmV0dXJucyBjbGVhbnVwIGZ1bmN0aW9uXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVUcmFuc3BvcnRMaXN0ZW5lcihcbiAgICB0cmFuc3BvcnQ6IFRyYW5zcG9ydFRhcmdldCxcbiAgICBvbk1lc3NhZ2U6IChkYXRhOiBhbnkpID0+IHZvaWQsXG4gICAgb25FcnJvcj86IChlcnI6IEVycm9yKSA9PiB2b2lkLFxuICAgIG9uQ2xvc2U/OiAoKSA9PiB2b2lkLFxuICAgIG9wdGlvbnM/OiB7XG4gICAgICAgIHBvcnROYW1lPzogc3RyaW5nO1xuICAgICAgICB0YWJJZD86IG51bWJlcjtcbiAgICAgICAgc29ja2V0RXZlbnRzPzogc3RyaW5nW107XG4gICAgfVxuKTogKCkgPT4gdm9pZCB7XG4gICAgY29uc3QgbXNnSGFuZGxlciA9IChlOiBNZXNzYWdlRXZlbnQpID0+IHtcbiAgICAgICAgaWYgKHRyYW5zcG9ydCBpbnN0YW5jZW9mIFdlYlNvY2tldCAmJiB0eXBlb2YgZS5kYXRhID09PSBcInN0cmluZ1wiKSB7XG4gICAgICAgICAgICB0cnkgeyBvbk1lc3NhZ2UoSlNPTi5wYXJzZShlLmRhdGEpKTsgfVxuICAgICAgICAgICAgY2F0Y2ggKGVycikgeyBvbkVycm9yPy4oZXJyIGFzIEVycm9yKTsgfVxuICAgICAgICB9IGVsc2UgaWYgKHRyYW5zcG9ydCBpbnN0YW5jZW9mIFdlYlNvY2tldCAmJiBlLmRhdGEgaW5zdGFuY2VvZiBBcnJheUJ1ZmZlcikge1xuICAgICAgICAgICAgb25NZXNzYWdlKGUuZGF0YSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBvbk1lc3NhZ2UoZS5kYXRhKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBjb25zdCBlcnJIYW5kbGVyID0gKGU6IEVycm9yRXZlbnQgfCBFdmVudCkgPT4ge1xuICAgICAgICBvbkVycm9yPy4obmV3IEVycm9yKChlIGFzIEVycm9yRXZlbnQpLm1lc3NhZ2UgPz8gXCJUcmFuc3BvcnQgZXJyb3JcIikpO1xuICAgIH07XG5cbiAgICBjb25zdCBjbG9zZUhhbmRsZXIgPSAoKSA9PiBvbkNsb3NlPy4oKTtcblxuICAgIC8vIFdvcmtlclxuICAgIGlmICh0cmFuc3BvcnQgaW5zdGFuY2VvZiBXb3JrZXIpIHtcbiAgICAgICAgdHJhbnNwb3J0LmFkZEV2ZW50TGlzdGVuZXIoXCJtZXNzYWdlXCIsIG1zZ0hhbmRsZXIpO1xuICAgICAgICB0cmFuc3BvcnQuYWRkRXZlbnRMaXN0ZW5lcihcImVycm9yXCIsIGVyckhhbmRsZXIpO1xuICAgICAgICByZXR1cm4gKCkgPT4ge1xuICAgICAgICAgICAgdHJhbnNwb3J0LnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJtZXNzYWdlXCIsIG1zZ0hhbmRsZXIpO1xuICAgICAgICAgICAgdHJhbnNwb3J0LnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJlcnJvclwiLCBlcnJIYW5kbGVyKTtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyBTaGFyZWRXb3JrZXJcbiAgICBpZiAodHlwZW9mIFNoYXJlZFdvcmtlciAhPT0gXCJ1bmRlZmluZWRcIiAmJiB0cmFuc3BvcnQgaW5zdGFuY2VvZiBTaGFyZWRXb3JrZXIpIHtcbiAgICAgICAgdHJhbnNwb3J0LnBvcnQuYWRkRXZlbnRMaXN0ZW5lcihcIm1lc3NhZ2VcIiwgbXNnSGFuZGxlcik7XG4gICAgICAgIHRyYW5zcG9ydC5wb3J0LmFkZEV2ZW50TGlzdGVuZXIoXCJtZXNzYWdlZXJyb3JcIiwgZXJySGFuZGxlciBhcyBhbnkpO1xuICAgICAgICB0cmFuc3BvcnQucG9ydC5zdGFydCgpO1xuICAgICAgICByZXR1cm4gKCkgPT4ge1xuICAgICAgICAgICAgdHJhbnNwb3J0LnBvcnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihcIm1lc3NhZ2VcIiwgbXNnSGFuZGxlcik7XG4gICAgICAgICAgICB0cmFuc3BvcnQucG9ydC5yZW1vdmVFdmVudExpc3RlbmVyKFwibWVzc2FnZWVycm9yXCIsIGVyckhhbmRsZXIgYXMgYW55KTtcbiAgICAgICAgICAgIHRyYW5zcG9ydC5wb3J0LmNsb3NlKCk7XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gTWVzc2FnZVBvcnRcbiAgICBpZiAodHJhbnNwb3J0IGluc3RhbmNlb2YgTWVzc2FnZVBvcnQpIHtcbiAgICAgICAgdHJhbnNwb3J0LmFkZEV2ZW50TGlzdGVuZXIoXCJtZXNzYWdlXCIsIG1zZ0hhbmRsZXIpO1xuICAgICAgICB0cmFuc3BvcnQuc3RhcnQoKTtcbiAgICAgICAgcmV0dXJuICgpID0+IHtcbiAgICAgICAgICAgIHRyYW5zcG9ydC5yZW1vdmVFdmVudExpc3RlbmVyKFwibWVzc2FnZVwiLCBtc2dIYW5kbGVyKTtcbiAgICAgICAgICAgIHRyYW5zcG9ydC5jbG9zZSgpO1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8vIEJyb2FkY2FzdENoYW5uZWxcbiAgICBpZiAodHJhbnNwb3J0IGluc3RhbmNlb2YgQnJvYWRjYXN0Q2hhbm5lbCkge1xuICAgICAgICB0cmFuc3BvcnQuYWRkRXZlbnRMaXN0ZW5lcihcIm1lc3NhZ2VcIiwgbXNnSGFuZGxlcik7XG4gICAgICAgIHJldHVybiAoKSA9PiB7XG4gICAgICAgICAgICB0cmFuc3BvcnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihcIm1lc3NhZ2VcIiwgbXNnSGFuZGxlcik7XG4gICAgICAgICAgICB0cmFuc3BvcnQuY2xvc2UoKTtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyBXZWJTb2NrZXRcbiAgICBpZiAodHJhbnNwb3J0IGluc3RhbmNlb2YgV2ViU29ja2V0KSB7XG4gICAgICAgIHRyYW5zcG9ydC5hZGRFdmVudExpc3RlbmVyKFwibWVzc2FnZVwiLCBtc2dIYW5kbGVyKTtcbiAgICAgICAgdHJhbnNwb3J0LmFkZEV2ZW50TGlzdGVuZXIoXCJlcnJvclwiLCBlcnJIYW5kbGVyKTtcbiAgICAgICAgdHJhbnNwb3J0LmFkZEV2ZW50TGlzdGVuZXIoXCJjbG9zZVwiLCBjbG9zZUhhbmRsZXIpO1xuICAgICAgICByZXR1cm4gKCkgPT4ge1xuICAgICAgICAgICAgdHJhbnNwb3J0LnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJtZXNzYWdlXCIsIG1zZ0hhbmRsZXIpO1xuICAgICAgICAgICAgdHJhbnNwb3J0LnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJlcnJvclwiLCBlcnJIYW5kbGVyKTtcbiAgICAgICAgICAgIHRyYW5zcG9ydC5yZW1vdmVFdmVudExpc3RlbmVyKFwiY2xvc2VcIiwgY2xvc2VIYW5kbGVyKTtcbiAgICAgICAgICAgIGlmICh0cmFuc3BvcnQucmVhZHlTdGF0ZSA9PT0gV2ViU29ja2V0Lk9QRU4pIHtcbiAgICAgICAgICAgICAgICB0cmFuc3BvcnQuY2xvc2UoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyBDaHJvbWUgUnVudGltZVxuICAgIGlmICh0cmFuc3BvcnQgPT09IFwiY2hyb21lLXJ1bnRpbWVcIikge1xuICAgICAgICBpZiAodHlwZW9mIGNocm9tZSAhPT0gXCJ1bmRlZmluZWRcIiAmJiBjaHJvbWUucnVudGltZSkge1xuICAgICAgICAgICAgY29uc3QgbGlzdGVuZXIgPSAobXNnOiBhbnkpID0+IHsgb25NZXNzYWdlKG1zZyk7IHJldHVybiBmYWxzZTsgfTtcbiAgICAgICAgICAgIGNocm9tZS5ydW50aW1lLm9uTWVzc2FnZS5hZGRMaXN0ZW5lcihsaXN0ZW5lcik7XG4gICAgICAgICAgICByZXR1cm4gKCkgPT4gY2hyb21lLnJ1bnRpbWUub25NZXNzYWdlLnJlbW92ZUxpc3RlbmVyKGxpc3RlbmVyKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIENocm9tZSBUYWJzICh0YWItZmlsdGVyZWQgcnVudGltZSBtZXNzYWdlcylcbiAgICBpZiAodHJhbnNwb3J0ID09PSBcImNocm9tZS10YWJzXCIpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBjaHJvbWUgIT09IFwidW5kZWZpbmVkXCIgJiYgY2hyb21lLnJ1bnRpbWUpIHtcbiAgICAgICAgICAgIGNvbnN0IHRhYklkID0gb3B0aW9ucz8udGFiSWQ7XG4gICAgICAgICAgICBpZiAodGFiSWQgIT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBjcmVhdGVDaHJvbWVUYWJzTGlzdGVuZXIodGFiSWQsIChtc2cpID0+IG9uTWVzc2FnZShtc2cpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IGxpc3RlbmVyID0gKG1zZzogYW55KSA9PiB7IG9uTWVzc2FnZShtc2cpOyByZXR1cm4gZmFsc2U7IH07XG4gICAgICAgICAgICBjaHJvbWUucnVudGltZS5vbk1lc3NhZ2UuYWRkTGlzdGVuZXIobGlzdGVuZXIpO1xuICAgICAgICAgICAgcmV0dXJuICgpID0+IGNocm9tZS5ydW50aW1lLm9uTWVzc2FnZS5yZW1vdmVMaXN0ZW5lcihsaXN0ZW5lcik7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBDaHJvbWUgUG9ydFxuICAgIGlmICh0cmFuc3BvcnQgPT09IFwiY2hyb21lLXBvcnRcIikge1xuICAgICAgICBpZiAodHlwZW9mIGNocm9tZSAhPT0gXCJ1bmRlZmluZWRcIiAmJiBjaHJvbWUucnVudGltZSkge1xuICAgICAgICAgICAgY29uc3QgcG9ydE5hbWUgPSBvcHRpb25zPy5wb3J0TmFtZTtcbiAgICAgICAgICAgIGlmIChwb3J0TmFtZSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHBvcnQgPSBjaHJvbWUucnVudGltZS5jb25uZWN0KHsgbmFtZTogcG9ydE5hbWUgfSk7XG4gICAgICAgICAgICAgICAgcG9ydC5vbk1lc3NhZ2UuYWRkTGlzdGVuZXIob25NZXNzYWdlKTtcbiAgICAgICAgICAgICAgICBwb3J0Lm9uRGlzY29ubmVjdC5hZGRMaXN0ZW5lcihjbG9zZUhhbmRsZXIpO1xuICAgICAgICAgICAgICAgIHJldHVybiAoKSA9PiBwb3J0LmRpc2Nvbm5lY3QoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIENocm9tZSBFeHRlcm5hbCAobWVzc2FnZXMgZnJvbSBleHRlcm5hbCBleHRlbnNpb24vYXBwKVxuICAgIGlmICh0cmFuc3BvcnQgPT09IFwiY2hyb21lLWV4dGVybmFsXCIpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBjaHJvbWUgIT09IFwidW5kZWZpbmVkXCIgJiYgY2hyb21lLnJ1bnRpbWU/Lm9uTWVzc2FnZUV4dGVybmFsKSB7XG4gICAgICAgICAgICBjb25zdCBsaXN0ZW5lciA9IChtc2c6IGFueSkgPT4geyBvbk1lc3NhZ2UobXNnKTsgcmV0dXJuIGZhbHNlOyB9O1xuICAgICAgICAgICAgY2hyb21lLnJ1bnRpbWUub25NZXNzYWdlRXh0ZXJuYWwuYWRkTGlzdGVuZXIobGlzdGVuZXIpO1xuICAgICAgICAgICAgcmV0dXJuICgpID0+IGNocm9tZS5ydW50aW1lLm9uTWVzc2FnZUV4dGVybmFsLnJlbW92ZUxpc3RlbmVyKGxpc3RlbmVyKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIFNlcnZpY2UgV29ya2VyIENsaWVudFxuICAgIGlmICh0cmFuc3BvcnQgPT09IFwic2VydmljZS13b3JrZXItY2xpZW50XCIpIHtcbiAgICAgICAgaWYgKFwic2VydmljZVdvcmtlclwiIGluIG5hdmlnYXRvcikge1xuICAgICAgICAgICAgbmF2aWdhdG9yLnNlcnZpY2VXb3JrZXIuYWRkRXZlbnRMaXN0ZW5lcihcIm1lc3NhZ2VcIiwgbXNnSGFuZGxlcik7XG4gICAgICAgICAgICByZXR1cm4gKCkgPT4gbmF2aWdhdG9yLnNlcnZpY2VXb3JrZXIucmVtb3ZlRXZlbnRMaXN0ZW5lcihcIm1lc3NhZ2VcIiwgbXNnSGFuZGxlcik7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBTZXJ2aWNlIFdvcmtlciBIb3N0IC8gU2VsZlxuICAgIGlmICh0cmFuc3BvcnQgPT09IFwic2VydmljZS13b3JrZXItaG9zdFwiIHx8IHRyYW5zcG9ydCA9PT0gXCJzZWxmXCIpIHtcbiAgICAgICAgY29uc3QgaGFuZGxlciA9IChlOiBNZXNzYWdlRXZlbnQpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGNsaWVudElkID0gdHJhbnNwb3J0ID09PSBcInNlcnZpY2Utd29ya2VyLWhvc3RcIiA/IChlLnNvdXJjZSBhcyBhbnkpPy5pZCA6IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIG9uTWVzc2FnZShjbGllbnRJZCA/IHsgLi4uZS5kYXRhLCBfY2xpZW50SWQ6IGNsaWVudElkIH0gOiBlLmRhdGEpO1xuICAgICAgICB9O1xuICAgICAgICBzZWxmLmFkZEV2ZW50TGlzdGVuZXIoXCJtZXNzYWdlXCIsIGhhbmRsZXIgYXMgYW55KTtcbiAgICAgICAgcmV0dXJuICgpID0+IHNlbGYucmVtb3ZlRXZlbnRMaXN0ZW5lcihcIm1lc3NhZ2VcIiwgaGFuZGxlciBhcyBhbnkpO1xuICAgIH1cblxuICAgIHJldHVybiAoKSA9PiB7fTtcbn1cblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gQ0hST01FIExJU1RFTkVSIFdJVEggU0VORCBSRVNQT05TRVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlQ2hyb21lTGlzdGVuZXIoXG4gICAgb25NZXNzYWdlOiAobXNnOiBhbnksIHNlbmRSZXNwb25zZTogKHJlc3A6IGFueSkgPT4gdm9pZCwgc2VuZGVyPzogY2hyb21lLnJ1bnRpbWUuTWVzc2FnZVNlbmRlcikgPT4gYm9vbGVhbiB8IHZvaWQsXG4gICAgb3B0aW9ucz86IHsgZXh0ZXJuYWw/OiBib29sZWFuIH1cbik6ICgpID0+IHZvaWQge1xuICAgIGlmICh0eXBlb2YgY2hyb21lID09PSBcInVuZGVmaW5lZFwiIHx8ICFjaHJvbWUucnVudGltZSkgcmV0dXJuICgpID0+IHt9O1xuXG4gICAgY29uc3QgbGlzdGVuZXIgPSAoXG4gICAgICAgIG1lc3NhZ2U6IGFueSxcbiAgICAgICAgc2VuZGVyOiBjaHJvbWUucnVudGltZS5NZXNzYWdlU2VuZGVyLFxuICAgICAgICBzZW5kUmVzcG9uc2U6IChyZXNwb25zZT86IGFueSkgPT4gdm9pZFxuICAgICkgPT4gb25NZXNzYWdlKG1lc3NhZ2UsIHNlbmRSZXNwb25zZSwgc2VuZGVyKTtcblxuICAgIGlmIChvcHRpb25zPy5leHRlcm5hbCAmJiBjaHJvbWUucnVudGltZS5vbk1lc3NhZ2VFeHRlcm5hbCkge1xuICAgICAgICBjaHJvbWUucnVudGltZS5vbk1lc3NhZ2VFeHRlcm5hbC5hZGRMaXN0ZW5lcihsaXN0ZW5lcik7XG4gICAgICAgIHJldHVybiAoKSA9PiBjaHJvbWUucnVudGltZS5vbk1lc3NhZ2VFeHRlcm5hbC5yZW1vdmVMaXN0ZW5lcihsaXN0ZW5lcik7XG4gICAgfVxuXG4gICAgY2hyb21lLnJ1bnRpbWUub25NZXNzYWdlLmFkZExpc3RlbmVyKGxpc3RlbmVyKTtcbiAgICByZXR1cm4gKCkgPT4gY2hyb21lLnJ1bnRpbWUub25NZXNzYWdlLnJlbW92ZUxpc3RlbmVyKGxpc3RlbmVyKTtcbn1cblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gQ0hST01FIFRBQlMgTElTVEVORVJcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUNocm9tZVRhYnNMaXN0ZW5lcihcbiAgICB0YWJJZDogbnVtYmVyLFxuICAgIG9uTWVzc2FnZTogKG1zZzogYW55LCBzZW5kZXI/OiBjaHJvbWUucnVudGltZS5NZXNzYWdlU2VuZGVyKSA9PiB2b2lkXG4pOiAoKSA9PiB2b2lkIHtcbiAgICBpZiAodHlwZW9mIGNocm9tZSA9PT0gXCJ1bmRlZmluZWRcIiB8fCAhY2hyb21lLnJ1bnRpbWUpIHJldHVybiAoKSA9PiB7fTtcblxuICAgIGNvbnN0IGxpc3RlbmVyID0gKG1zZzogYW55LCBzZW5kZXI6IGNocm9tZS5ydW50aW1lLk1lc3NhZ2VTZW5kZXIpID0+IHtcbiAgICAgICAgaWYgKHNlbmRlci50YWI/LmlkID09PSB0YWJJZCkge1xuICAgICAgICAgICAgb25NZXNzYWdlKG1zZywgc2VuZGVyKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBjaHJvbWUucnVudGltZS5vbk1lc3NhZ2UuYWRkTGlzdGVuZXIobGlzdGVuZXIpO1xuICAgIHJldHVybiAoKSA9PiBjaHJvbWUucnVudGltZS5vbk1lc3NhZ2UucmVtb3ZlTGlzdGVuZXIobGlzdGVuZXIpO1xufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBXRUJTT0NLRVQgRU5IQU5DRURcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuZXhwb3J0IGludGVyZmFjZSBXZWJTb2NrZXRPcHRpb25zIHtcbiAgICBwcm90b2NvbHM/OiBzdHJpbmcgfCBzdHJpbmdbXTtcbiAgICBiaW5hcnlUeXBlPzogQmluYXJ5VHlwZTtcbiAgICByZWNvbm5lY3Q/OiBib29sZWFuO1xuICAgIHJlY29ubmVjdEludGVydmFsPzogbnVtYmVyO1xuICAgIG1heFJlY29ubmVjdEF0dGVtcHRzPzogbnVtYmVyO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlV2ViU29ja2V0VHJhbnNwb3J0KFxuICAgIHVybDogc3RyaW5nLFxuICAgIG9wdGlvbnM6IFdlYlNvY2tldE9wdGlvbnMgPSB7fVxuKToge1xuICAgIHNvY2tldDogV2ViU29ja2V0O1xuICAgIHNlbmQ6IFNlbmRGbjtcbiAgICBsaXN0ZW46IChoYW5kbGVyOiAoZGF0YTogYW55KSA9PiB2b2lkKSA9PiAoKSA9PiB2b2lkO1xuICAgIHJlY29ubmVjdDogKCkgPT4gdm9pZDtcbiAgICBjbG9zZTogKCkgPT4gdm9pZDtcbn0ge1xuICAgIGxldCBzb2NrZXQgPSBuZXcgV2ViU29ja2V0KHVybCwgb3B0aW9ucy5wcm90b2NvbHMpO1xuICAgIGlmIChvcHRpb25zLmJpbmFyeVR5cGUpIHNvY2tldC5iaW5hcnlUeXBlID0gb3B0aW9ucy5iaW5hcnlUeXBlO1xuXG4gICAgbGV0IHJlY29ubmVjdEF0dGVtcHRzID0gMDtcbiAgICBsZXQgcmVjb25uZWN0VGltZXI6IFJldHVyblR5cGU8dHlwZW9mIHNldFRpbWVvdXQ+IHwgbnVsbCA9IG51bGw7XG5cbiAgICBjb25zdCBzZW5kOiBTZW5kRm4gPSAobXNnLCB0cmFuc2ZlcikgPT4ge1xuICAgICAgICBpZiAoc29ja2V0LnJlYWR5U3RhdGUgIT09IFdlYlNvY2tldC5PUEVOKSByZXR1cm47XG5cbiAgICAgICAgaWYgKG1zZyBpbnN0YW5jZW9mIEFycmF5QnVmZmVyIHx8IEFycmF5QnVmZmVyLmlzVmlldyhtc2cpKSB7XG4gICAgICAgICAgICBzb2NrZXQuc2VuZChtc2cgYXMgQXJyYXlCdWZmZXIpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc29ja2V0LnNlbmQoSlNPTi5zdHJpbmdpZnkobXNnKSk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgY29uc3QgcmVjb25uZWN0ID0gKCkgPT4ge1xuICAgICAgICBpZiAocmVjb25uZWN0QXR0ZW1wdHMgPj0gKG9wdGlvbnMubWF4UmVjb25uZWN0QXR0ZW1wdHMgPz8gNSkpIHJldHVybjtcblxuICAgICAgICByZWNvbm5lY3RBdHRlbXB0cysrO1xuICAgICAgICBzb2NrZXQgPSBuZXcgV2ViU29ja2V0KHVybCwgb3B0aW9ucy5wcm90b2NvbHMpO1xuICAgICAgICBpZiAob3B0aW9ucy5iaW5hcnlUeXBlKSBzb2NrZXQuYmluYXJ5VHlwZSA9IG9wdGlvbnMuYmluYXJ5VHlwZTtcbiAgICB9O1xuXG4gICAgY29uc3QgY2xvc2UgPSAoKSA9PiB7XG4gICAgICAgIGlmIChyZWNvbm5lY3RUaW1lcikgY2xlYXJUaW1lb3V0KHJlY29ubmVjdFRpbWVyKTtcbiAgICAgICAgc29ja2V0LmNsb3NlKCk7XG4gICAgfTtcblxuICAgIGlmIChvcHRpb25zLnJlY29ubmVjdCkge1xuICAgICAgICBzb2NrZXQuYWRkRXZlbnRMaXN0ZW5lcihcImNsb3NlXCIsICgpID0+IHtcbiAgICAgICAgICAgIHJlY29ubmVjdFRpbWVyID0gc2V0VGltZW91dChyZWNvbm5lY3QsIG9wdGlvbnMucmVjb25uZWN0SW50ZXJ2YWwgPz8gMzAwMCk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICAgIHNvY2tldCxcbiAgICAgICAgc2VuZCxcbiAgICAgICAgbGlzdGVuOiAoaGFuZGxlcikgPT4ge1xuICAgICAgICAgICAgY29uc3QgaCA9IChlOiBNZXNzYWdlRXZlbnQpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGUuZGF0YSA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgICAgICAgICAgICAgICB0cnkgeyBoYW5kbGVyKEpTT04ucGFyc2UoZS5kYXRhKSk7IH0gY2F0Y2gge31cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBoYW5kbGVyKGUuZGF0YSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHNvY2tldC5hZGRFdmVudExpc3RlbmVyKFwibWVzc2FnZVwiLCBoKTtcbiAgICAgICAgICAgIHJldHVybiAoKSA9PiBzb2NrZXQucmVtb3ZlRXZlbnRMaXN0ZW5lcihcIm1lc3NhZ2VcIiwgaCk7XG4gICAgICAgIH0sXG4gICAgICAgIHJlY29ubmVjdCxcbiAgICAgICAgY2xvc2VcbiAgICB9O1xufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBCUk9BRENBU1QgQ0hBTk5FTCBFTkhBTkNFRFxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlQnJvYWRjYXN0VHJhbnNwb3J0KGNoYW5uZWxOYW1lOiBzdHJpbmcpOiB7XG4gICAgY2hhbm5lbDogQnJvYWRjYXN0Q2hhbm5lbDtcbiAgICBzZW5kOiBTZW5kRm47XG4gICAgbGlzdGVuOiAoaGFuZGxlcjogKGRhdGE6IGFueSkgPT4gdm9pZCkgPT4gKCkgPT4gdm9pZDtcbiAgICBjbG9zZTogKCkgPT4gdm9pZDtcbn0ge1xuICAgIGNvbnN0IGNoYW5uZWwgPSBuZXcgQnJvYWRjYXN0Q2hhbm5lbChjaGFubmVsTmFtZSk7XG5cbiAgICByZXR1cm4ge1xuICAgICAgICBjaGFubmVsLFxuICAgICAgICBzZW5kOiAobXNnKSA9PiBjaGFubmVsLnBvc3RNZXNzYWdlKG1zZyksXG4gICAgICAgIGxpc3RlbjogKGhhbmRsZXIpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGggPSAoZTogTWVzc2FnZUV2ZW50KSA9PiBoYW5kbGVyKGUuZGF0YSk7XG4gICAgICAgICAgICBjaGFubmVsLmFkZEV2ZW50TGlzdGVuZXIoXCJtZXNzYWdlXCIsIGgpO1xuICAgICAgICAgICAgcmV0dXJuICgpID0+IGNoYW5uZWwucmVtb3ZlRXZlbnRMaXN0ZW5lcihcIm1lc3NhZ2VcIiwgaCk7XG4gICAgICAgIH0sXG4gICAgICAgIGNsb3NlOiAoKSA9PiBjaGFubmVsLmNsb3NlKClcbiAgICB9O1xufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBGQUNUT1JZXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbmV4cG9ydCBjb25zdCBUcmFuc3BvcnRDb3JlRmFjdG9yeSA9IHtcbiAgICBjcmVhdGVTZW5kZXI6IGNyZWF0ZVRyYW5zcG9ydFNlbmRlcixcbiAgICBjcmVhdGVMaXN0ZW5lcjogY3JlYXRlVHJhbnNwb3J0TGlzdGVuZXIsXG4gICAgZGV0ZWN0VHlwZTogZGV0ZWN0VHJhbnNwb3J0VHlwZSxcbiAgICBnZXRNZXRhOiBnZXRUcmFuc3BvcnRNZXRhLFxuICAgIGNocm9tZToge1xuICAgICAgICBjcmVhdGVMaXN0ZW5lcjogY3JlYXRlQ2hyb21lTGlzdGVuZXIsXG4gICAgICAgIGNyZWF0ZVRhYnNMaXN0ZW5lcjogY3JlYXRlQ2hyb21lVGFic0xpc3RlbmVyXG4gICAgfSxcbiAgICB3ZWJzb2NrZXQ6IGNyZWF0ZVdlYlNvY2tldFRyYW5zcG9ydCxcbiAgICBicm9hZGNhc3Q6IGNyZWF0ZUJyb2FkY2FzdFRyYW5zcG9ydFxufTtcbiJdfQ==