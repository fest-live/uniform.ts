type CrxSender = chrome.runtime.MessageSender;
type CrxSendResponse = (response: any) => void;
type CrxListener = (event: any, sender: CrxSender, sendResponse: CrxSendResponse) => void | Promise<void>;

const runtimeListenerRegistry = new Map<string, Set<CrxListener>>();
let runtimeListenerInstalled = false;

const ensureRuntimeListener = () => {
    if (runtimeListenerInstalled) return;
    runtimeListenerInstalled = true;

    chrome?.runtime?.onMessage?.addListener?.((message: any, sender: CrxSender, sendResponse: CrxSendResponse) => {
        const channelName = (message?.channelName ?? message?.target) as string | undefined;
        if (!channelName) return;

        const listeners = runtimeListenerRegistry.get(channelName);
        if (!listeners || listeners.size === 0) return;

        const event = {
            data: message,
            origin: sender?.url || "chrome-extension",
            source: sender
        };

        // Dispatch (sync or async). Returning true keeps sendResponse alive.
        for (const listener of listeners) {
            try {
                const out = listener(event, sender, sendResponse);
                // avoid unhandled rejections on async listeners
                if (out && typeof (out as any)?.catch === "function") {
                    (out as Promise<void>).catch((error) => console.error("[ChromeExtensionBroadcastChannel] Listener error:", error));
                }
            } catch (error) {
                console.error("[ChromeExtensionBroadcastChannel] Listener error:", error);
            }
        }

        return true;
    });
};

/**
 * Chrome Extension Broadcast-like Channel
 * Acts like a BroadcastChannel but uses chrome.runtime messaging
 */
export class ChromeExtensionBroadcastChannel {
    private listeners: Set<CrxListener> = new Set();

    constructor(private channelName: string) {
        ensureRuntimeListener();
    }

    addEventListener(type: "message", listener: (event: any, sender: CrxSender, sendResponse: CrxSendResponse) => void | Promise<void>) {
        if (type !== "message") return;
        this.listeners.add(listener);
        let set = runtimeListenerRegistry.get(this.channelName);
        if (!set) {
            set = new Set();
            runtimeListenerRegistry.set(this.channelName, set);
        }
        set.add(listener);
    }

    removeEventListener(type: "message", listener: (event: any, sender: CrxSender, sendResponse: CrxSendResponse) => void | Promise<void>) {
        if (type !== "message") return;
        this.listeners.delete(listener);
        runtimeListenerRegistry.get(this.channelName)?.delete(listener);
    }

    postMessage(message: any) {
        const messageWithChannel = {
            ...message,
            channelName: this.channelName,
            source: "broadcast-channel"
        };

        // Send via chrome runtime messaging (ignore response)
        chrome?.runtime?.sendMessage?.(messageWithChannel, () => void 0);
    }

    close() {
        for (const listener of this.listeners) {
            runtimeListenerRegistry.get(this.channelName)?.delete(listener);
        }
        this.listeners.clear();
    }
}

/**
 * Unified Chrome Extension Tabs Channel
 * Acts like a BroadcastChannel but uses chrome.tabs messaging to communicate with content scripts
 * Supports both broadcast-to-multiple-tabs and current-tab-only targeting
 */
export class ChromeExtensionTabsChannel {
    private wrappedByOriginal = new Map<CrxListener, CrxListener>();
    private wrappedListeners: Set<CrxListener> = new Set();
    private channelName: string;
    private mode: 'broadcast' | 'current-tab' = 'broadcast';
    private tabFilter?: (tab: chrome.tabs.Tab) => boolean;
    private tabIdGetter?: () => Promise<number> | number;

    constructor(channelName: string, options?: {
        mode?: 'broadcast' | 'current-tab';
        tabFilter?: (tab: chrome.tabs.Tab) => boolean;
        tabIdGetter?: () => Promise<number> | number;
    }) {
        this.channelName = channelName;
        this.mode = options?.mode || 'broadcast';
        this.tabFilter = options?.tabFilter;
        this.tabIdGetter = options?.tabIdGetter || this.getCurrentTabId;
        this.startListening();
    }

    private startListening() {
        ensureRuntimeListener();

        // No per-instance chrome.runtime.onMessage listener here; we reuse the global runtime listener.
        // Filtering by tab is handled in our instance-level handler below.
    }

    addEventListener(type: "message", listener: CrxListener) {
        if (type !== "message") return;

        const existing = this.wrappedByOriginal.get(listener);
        if (existing) return;

        const wrapped: CrxListener = async (event, sender, sendResponse) => {
            const message = event?.data;
            if (!sender?.tab) return;

            // For current-tab mode, verify this is from our target tab
            if (this.mode === "current-tab") {
                const targetTabId = await this.tabIdGetter?.();
                if (typeof targetTabId === "number" && sender.tab.id !== targetTabId) return;
            }

            // For broadcast mode, apply tab filter if specified
            if (this.mode === "broadcast" && this.tabFilter && !this.tabFilter(sender.tab)) return;

            const enhancedEvent = {
                ...event,
                origin: sender.url || "chrome-extension-tab",
                tab: sender.tab
            };

            return listener(enhancedEvent, sender, sendResponse);
        };

        this.wrappedByOriginal.set(listener, wrapped);
        this.wrappedListeners.add(wrapped);
        let set = runtimeListenerRegistry.get(this.channelName);
        if (!set) {
            set = new Set();
            runtimeListenerRegistry.set(this.channelName, set);
        }
        set.add(wrapped);
    }

    removeEventListener(type: "message", listener: CrxListener) {
        if (type !== "message") return;
        const wrapped = this.wrappedByOriginal.get(listener);
        if (!wrapped) return;
        this.wrappedByOriginal.delete(listener);
        this.wrappedListeners.delete(wrapped);
        runtimeListenerRegistry.get(this.channelName)?.delete(wrapped);
    }

    /**
     * Send message to specific tab
     */
    sendToTab(tabId: number, message: any): Promise<any> {
        const messageWithChannel = {
            channelName: this.channelName,
            source: 'tabs-channel',
            ...message
        };

        return new Promise((resolve, reject) => {
            chrome?.tabs?.sendMessage?.(tabId, messageWithChannel, (response) => {
                if (chrome?.runtime?.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else {
                    resolve(response);
                }
            });
        });
    }

    /**
     * Send message to active/current tab
     */
    async sendToActiveTab(message: any): Promise<any> {
        if (this.mode === 'current-tab' && this.tabIdGetter) {
            // Use the configured tab ID getter
            const tabId = await this.tabIdGetter();
            return this.sendToTab(tabId, message);
        } else {
            // Fallback to querying active tab
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tabs.length === 0) {
                throw new Error('No active tab found');
            }
            return this.sendToTab(tabs[0].id!, message);
        }
    }

    /**
     * Broadcast message to all matching tabs (only works in broadcast mode)
     */
    async broadcastToTabs(message: any, options?: { allWindows?: boolean; tabFilter?: (tab: chrome.tabs.Tab) => boolean }): Promise<any[]> {
        if (this.mode === 'current-tab') {
            // In current-tab mode, broadcast is just sending to the current tab
            try {
                const response = await this.sendToActiveTab(message);
                return [{ tabId: await this.tabIdGetter!(), response }];
            } catch (error) {
                return [{ error }];
            }
        }

        // Broadcast mode - send to multiple tabs
        const query: chrome.tabs.QueryInfo = {
            status: 'complete'
        };

        if (!options?.allWindows) {
            query.currentWindow = true;
        }

        const tabs = await chrome.tabs.query(query);
        const targetTabs = tabs.filter(tab => {
            // Apply custom filter if provided
            if (options?.tabFilter && !options.tabFilter(tab)) return false;
            // Apply instance filter
            if (this.tabFilter && !this.tabFilter(tab)) return false;
            return true;
        });

        const messageWithChannel = {
            channelName: this.channelName,
            source: 'tabs-channel',
            ...message
        };

        const promises = targetTabs.map(tab =>
            new Promise<any>((resolve, reject) => {
                chrome?.tabs?.sendMessage?.(tab.id!, messageWithChannel, (response) => {
                    if (chrome?.runtime?.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                    } else {
                        resolve({ tabId: tab.id, response });
                    }
                });
            })
        );

        return Promise.allSettled(promises);
    }

    /**
     * Send message via chrome runtime (for service worker communication)
     */
    async postMessage(message: any) {
        const tabId = await this.tabIdGetter!();

        const messageWithChannel = {
            channelName: this.channelName,
            source: 'tabs-channel',
            ...message
        };

        // Send via chrome.tabs messaging (ignore response)
        return chrome?.tabs?.sendMessage?.(tabId, messageWithChannel, () => void 0);
    }

    /**
     * Get current tab ID (convenience method)
     */
    async getCurrentTabId(): Promise<number> {
        if (this.tabIdGetter) {
            return await this.tabIdGetter();
        }
        return 0;
    }

    close() {
        for (const wrapped of this.wrappedListeners) {
            runtimeListenerRegistry.get(this.channelName)?.delete(wrapped);
        }
        this.wrappedListeners.clear();
        this.wrappedByOriginal.clear();
    }
}

/**
 * Chrome Extension Port Channel
 * Adapts chrome.runtime.Port into a BroadcastChannel-like interface.
 */
export class ChromeExtensionPortChannel {
    private listeners = new Set<(event: any) => void>();

    constructor(private port: chrome.runtime.Port, private channelName: string) {
        this.port?.onMessage?.addListener?.((message: any) => {
            if ((message?.channelName ?? message?.target) !== this.channelName) return;
            const event = { data: message, origin: "chrome-extension-port", source: this.port };
            for (const listener of this.listeners) {
                try {
                    listener(event);
                } catch (error) {
                    console.error("[ChromeExtensionPortChannel] Listener error:", error);
                }
            }
        });
    }

    addEventListener(type: "message", listener: (event: any) => void) {
        if (type !== "message") return;
        this.listeners.add(listener);
    }

    removeEventListener(type: "message", listener: (event: any) => void) {
        if (type !== "message") return;
        this.listeners.delete(listener);
    }

    postMessage(message: any) {
        this.port?.postMessage?.({
            ...message,
            channelName: this.channelName,
            source: "port-channel"
        });
    }

    close() {
        this.listeners.clear();
        this.port?.disconnect?.();
    }
}
