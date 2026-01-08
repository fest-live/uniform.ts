/**
 * App-specific adapter for fest/uniform library
 * Provides simplified API for common app communication patterns
 */

import { createOrUseExistingChannel } from "./next/Channels";
import { initChannelHandler } from "./next/Channels";
import { Promised, UUIDv4 } from "fest/core";
import type { WorkerChannel, WorkerConfig, QueuedRequest } from "./types";

// Re-export types for backward compatibility
export type { WorkerChannel, WorkerConfig, QueuedRequest };

/**
 * Detect the current execution context
 */
export const detectExecutionContext = (): 'main' | 'service-worker' | 'chrome-extension' | 'unknown' => {
    // Check for chrome extension context - use more robust detection
    if (typeof chrome != 'undefined' && (chrome?.runtime || chrome?.tabs)) {
        // Additional check for chrome-extension protocol if window is available
        if (typeof window !== 'undefined' && window?.location && window?.location?.protocol === 'chrome-extension:') {
            return 'chrome-extension';
        }
        // Also consider it CRX if we have chrome.runtime.id, even without chrome-extension protocol
        // (this handles cases where CRX code is loaded in different contexts)
        return 'chrome-extension';
    }

    // Check for service worker context
    if (typeof ServiceWorkerGlobalScope != 'undefined' && self instanceof ServiceWorkerGlobalScope) {
        return 'service-worker';
    }

    // Check for main thread context
    if (typeof window != 'undefined' && typeof document != 'undefined') {
        return 'main';
    }

    return 'unknown';
};

/**
 * Check if the current context supports dedicated workers
 */
export const supportsDedicatedWorkers = (): boolean => {
    const context = detectExecutionContext();
    return context === 'main' || context === 'chrome-extension';
};

// Types are imported from ./types

/**
 * Initialize the main thread channel handler
 */
export const initMainChannel = (name: string = "main") => {
    return initChannelHandler(name);
};

/**
 * Create a worker channel with simplified API
 */
export const createWorkerChannel = async (config: WorkerConfig): Promise<WorkerChannel> => {
    const context = config.context || detectExecutionContext();
    const supportsWorkers = supportsDedicatedWorkers();

    if (context === 'service-worker') {
        // Service workers cannot create dedicated workers directly
        // Instead, we create a channel that will use alternative communication
        return createServiceWorkerChannel(config);
    }

    if (!supportsWorkers) {
        throw new Error(`Dedicated workers are not supported in ${context} context`);
    }

    // Handle different script types
    let worker: Worker;
    if (typeof config.script === 'function') {
        // Script is a constructor function
        worker = config.script();
    } else if (config.script instanceof Worker) {
        // Script is already a Worker instance
        worker = config.script;
    } else {
        // Script is a string path - handle context-specific loading
        if (context === 'chrome-extension') {
            // Chrome extensions might need special handling for worker scripts
            try {
                worker = new Worker(chrome.runtime.getURL(config.script), config.options);
            } catch (error) {
                // Fallback to regular worker creation
                worker = new Worker(new URL(config.script, import.meta.url), config.options);
            }
        } else {
            worker = new Worker(new URL(config.script, import.meta.url), config.options);
        }
    }

    const channel = await createOrUseExistingChannel(config.name, {}, worker);

    return {
        async request(method: string, args: any[] = []) {
            return await channel.request([], method, args);
        },

        close() {
            worker.terminate();
        }
    };
};

/**
 * Queued worker channel that buffers requests until the channel is available
 */
export class QueuedWorkerChannel implements WorkerChannel {
    private underlyingChannel: WorkerChannel | null = null;
    private isConnected = false;
    private requestQueue: QueuedRequest[] = [];
    private connectionPromise: Promise<void> | null = null;
    private connectionResolver: (() => void) | null = null;
    private context: 'main' | 'service-worker' | 'chrome-extension' | 'unknown';

    constructor(
        private config: WorkerConfig,
        private onChannelReady?: (channel: WorkerChannel) => void
    ) {
        this.context = config.context || detectExecutionContext();
    }

    /**
     * Initialize the underlying channel
     */
    async connect(): Promise<void> {
        if (this.connectionPromise) return this.connectionPromise;

        this.connectionPromise = new Promise(async (resolve) => {
            this.connectionResolver = resolve;

            try {
                // Choose the appropriate channel creation method based on context
                if (this.context === 'service-worker') {
                    this.underlyingChannel = await createServiceWorkerChannel(this.config);
                } else if (this.context === 'chrome-extension') {
                    // For chrome extensions, choose based on channel type
                    if (this.config.currentTabChannel || this.config.name?.includes('current-tab')) {
                        // Use current tab messaging for focused/active tab communication
                        const tabIdGetter = this.config.currentTabOptions?.tabIdGetter ||
                            (this.config.currentTabOptions?.useVisibleTab ? getVisibleTabId : getCurrentTabId);
                        this.underlyingChannel = createChromeExtensionTabsMessagingChannel(this.config.name, {
                            mode: 'current-tab',
                            tabIdGetter: tabIdGetter
                        });
                    } else if (this.config.tabsChannel || this.config.name?.includes('tabs')) {
                        // Use tabs messaging for content script communication
                        this.underlyingChannel = createChromeExtensionTabsMessagingChannel(this.config.name, {
                            mode: 'broadcast',
                            tabFilter: this.config.tabsOptions?.tabFilter
                        });
                    }
                } else {
                    this.underlyingChannel = await createWorkerChannel(this.config);
                }

                this.isConnected = true;
                this.onChannelReady?.(this.underlyingChannel);

                // Process queued requests
                this.flushQueue();

                resolve();
            } catch (error) {
                console.error('[QueuedWorkerChannel] Failed to connect:', error);
                // Keep trying? Or reject queued requests?
                this.rejectAllQueued(new Error('Channel connection failed'));
            }
        });

        return this.connectionPromise;
    }

    /**
     * Queue a request if channel isn't ready, otherwise send immediately
     */
    async request(method: string, args: any[] = []): Promise<any> {
        if (this.isConnected && this.underlyingChannel) {
            return this.underlyingChannel.request(method, args);
        }

        // Queue the request
        return new Promise((resolve, reject) => {
            const queuedRequest: QueuedRequest = {
                id: UUIDv4(),
                method,
                args,
                resolve,
                reject,
                timestamp: Date.now()
            };

            this.requestQueue.push(queuedRequest);

            // Auto-connect if not already connecting
            if (!this.connectionPromise) {
                this.connect().catch((error) => {
                    this.rejectAllQueued(error);
                });
            }
        });
    }

    /**
     * Process all queued requests
     */
    private async flushQueue(): Promise<void> {
        if (!this.underlyingChannel) return;

        const queueCopy = [...this.requestQueue];
        this.requestQueue = [];

        for (const queuedRequest of queueCopy) {
            try {
                const result = await this.underlyingChannel.request(queuedRequest.method, queuedRequest.args);
                queuedRequest.resolve(result);
            } catch (error) {
                queuedRequest.reject(error);
            }
        }
    }

    /**
     * Reject all queued requests with an error
     */
    private rejectAllQueued(error: Error): void {
        const queueCopy = [...this.requestQueue];
        this.requestQueue = [];

        for (const queuedRequest of queueCopy) {
            queuedRequest.reject(error);
        }
    }

    /**
     * Get queue status
     */
    getQueueStatus() {
        return {
            isConnected: this.isConnected,
            queuedRequests: this.requestQueue.length,
            isConnecting: !!this.connectionPromise && !this.isConnected
        };
    }

    close(): void {
        this.rejectAllQueued(new Error('Channel closed'));
        this.underlyingChannel?.close();
        this.underlyingChannel = null;
        this.isConnected = false;
        this.connectionPromise = null;
    }
}

/**
 * Create a queued worker channel that waits for connection
 */
export const createQueuedWorkerChannel = (
    config: WorkerConfig,
    onChannelReady?: (channel: WorkerChannel) => void
): QueuedWorkerChannel => {
    return new QueuedWorkerChannel(config, onChannelReady);
};

/**
 * Create a service worker channel (for when running in service worker context)
 */
export const createServiceWorkerChannel = async (config: WorkerConfig): Promise<WorkerChannel> => {
    const context = detectExecutionContext();
    if (context !== 'service-worker') {
        throw new Error('Service worker channels can only be created in service worker context');
    }

    // In service worker context, we can't create dedicated workers
    // Instead, we create a channel that communicates through alternative means
    // This could be through BroadcastChannel, MessageChannel, or direct function calls

    return {
        async request(method: string, args: any[] = []) {
            // For service worker context, we might need to handle operations differently
            // This could involve:
            // 1. Direct function calls if the API is available in SW context
            // 2. Communication through BroadcastChannel to main thread
            // 3. Using clients.matchAll() to communicate with controlled pages

            // For now, we'll use a BroadcastChannel approach
            return new Promise((resolve, reject) => {
                const channel = new BroadcastChannel(`${config.name}-sw-channel`);
                const messageId = UUIDv4();

                const timeout = setTimeout(() => {
                    channel.close();
                    reject(new Error(`Service worker request timeout: ${method}`));
                }, 10000); // 10 second timeout

                channel.onmessage = (event) => {
                    const { id, result, error } = event.data;
                    if (id === messageId) {
                        clearTimeout(timeout);
                        channel.close();
                        if (error) {
                            reject(new Error(error));
                        } else {
                            resolve(result);
                        }
                    }
                };

                channel.postMessage({
                    id: messageId,
                    type: 'request',
                    method,
                    args
                });
            });
        },

        close() {
            // Service worker channels don't need explicit closing
            // as they use BroadcastChannel which auto-manages
        }
    };
};

/**
 * Create a chrome extension worker channel
 */
export const createChromeExtensionChannel = async (config: WorkerConfig): Promise<WorkerChannel> => {
    const context = detectExecutionContext();
    if (context != 'chrome-extension') {
        throw new Error('Chrome extension channels can only be created in chrome extension context');
    }

    // Chrome extensions can use dedicated workers, but might need special handling
    let worker: Worker;
    try {
        // Try to use chrome.runtime.getURL for extension resources
        worker = new Worker(chrome.runtime.getURL(config.script), config.options);
    } catch (error) {
        // Fallback for non-extension workers in extension context
        worker = new Worker(new URL(config.script, import.meta.url), config.options);
    }

    const channel = await createOrUseExistingChannel(config.name, {}, worker);
    return channel?.remote ?? channel;
};

/**
 * Chrome Extension Broadcast-like Channel
 * Acts like a BroadcastChannel but uses chrome.runtime messaging
 */
class ChromeExtensionBroadcastChannel {
    private listeners: Set<(event: any, sender: any, sendResponse: (response: any) => void) => void> = new Set();
    private isListening = false;
    private channelName: string;

    constructor(channelName: string) {
        this.channelName = channelName;
        this.startListening();
    }

    private startListening() {
        if (this.isListening) return;
        this.isListening = true;

        // Listen for chrome runtime messages
        chrome?.runtime?.onMessage?.addListener?.((message, sender, sendResponse) => {
            Promise.try(async () => {
                console.log('ChromeExtensionBroadcastChannel: onMessage', message, sender, sendResponse, this.channelName);
                console.log('ChromeExtensionBroadcastChannel: message.channelName', message.channelName);
                // Check if this message is for our channel
                if (message.channelName === this.channelName || message.target === this.channelName) {
                    const event = {
                        data: message,
                        origin: sender.url || 'chrome-extension',
                        source: sender
                    };

                    // Dispatch to all listeners
                    for (const listener of this.listeners) {
                        try {
                            const result = await listener(event, sender, sendResponse);
                        } catch (error) {
                            console.error('[ChromeExtensionBroadcastChannel] Listener error:', error);
                        }
                    }
                }
            });

            // Return false to indicate we didn't handle this message
            return true;
        });
    }

    addEventListener(type: 'message', listener: (event: any) => void | boolean) {
        if (type === 'message') {
            this.listeners.add(listener);
        }
    }

    removeEventListener(type: 'message', listener: (event: any) => void | boolean) {
        if (type === 'message') {
            this.listeners.delete(listener);
        }
    }

    postMessage(message: any) {
        const messageWithChannel = {
            channelName: this.channelName,
            source: 'broadcast-channel'
        };

        Object.assign(messageWithChannel, message);
        messageWithChannel.channelName = this.channelName;
        messageWithChannel.source = 'broadcast-channel';

        // Send via chrome runtime messaging
        chrome?.runtime?.sendMessage?.(messageWithChannel, (response) => {
            console.log('ChromeExtensionBroadcastChannel: postMessage response', response);
        });
    }

    close() {
        this.listeners.clear();
        this.isListening = false;
    }
}

/**
 * Create a chrome extension broadcast-like channel
 * Acts like BroadcastChannel but uses chrome.runtime messaging
 */
export const createChromeExtensionBroadcastChannel = (channelName: string): BroadcastChannel => {
    const context = detectExecutionContext();
    if (context != 'chrome-extension') {
        throw new Error('Chrome extension broadcast channels can only be created in chrome extension context');
    }

    return new ChromeExtensionBroadcastChannel(channelName) as any;
};

/**
 * Unified Chrome Extension Tabs Channel
 * Acts like a BroadcastChannel but uses chrome.tabs messaging to communicate with content scripts
 * Supports both broadcast-to-multiple-tabs and current-tab-only targeting
 */
class ChromeExtensionTabsChannel {
    private listeners: Set<(event: any, sender: any, sendResponse: (response: any) => void) => void> = new Set();
    private isListening = false;
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
        this.tabIdGetter = options?.tabIdGetter || getCurrentTabId;
        this.startListening();
    }

    private startListening() {
        if (this.isListening) return;
        this.isListening = true;

        // Listen for chrome runtime messages (content scripts send back through runtime)
        chrome?.runtime?.onMessage?.addListener?.((message, sender, sendResponse) => {
            Promise.try(async () => {
                // Check if this message is for our channel and from a tab
                if ((message.channelName === this.channelName || message.target === this.channelName) &&
                    sender.tab) {

                    // For current-tab mode, verify this is from our target tab
                    if (this.mode === 'current-tab') {
                        const targetTabId = await this.tabIdGetter!();
                        if (sender.tab.id !== targetTabId) {
                            return; // Not from our target tab, ignore
                        }
                    }

                    // For broadcast mode, apply tab filter if specified
                    if (this.mode === 'broadcast' && this.tabFilter && !this.tabFilter(sender.tab)) {
                        return; // Tab doesn't match filter, ignore
                    }

                    const event = {
                        data: message,
                        origin: sender.url || 'chrome-extension-tab',
                        source: sender,
                        tab: sender.tab
                    };

                    // Dispatch to all listeners
                    for (const listener of this.listeners) {
                        try {
                            const result = await listener(event, sender, sendResponse);
                        } catch (error) {
                            console.error('[ChromeExtensionTabsChannel] Listener error:', error);
                        }
                    }
                }
            });

            // Return true to indicate async response
            return true;
        });
    }

    addEventListener(type: 'message', listener: (event: any) => void | boolean) {
        if (type === 'message') {
            this.listeners.add(listener);
        }
    }

    removeEventListener(type: 'message', listener: (event: any) => void | boolean) {
        if (type === 'message') {
            this.listeners.delete(listener);
        }
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

        // Send via chrome runtime messaging
        return chrome?.tabs?.sendMessage?.(tabId, messageWithChannel, (response) => {
            console.log('ChromeExtensionTabsChannel: postMessage response', response);
        });
    }

    /**
     * Get current tab ID (convenience method)
     */
    async getCurrentTabId(): Promise<number> {
        if (this.tabIdGetter) {
            return await this.tabIdGetter();
        }
        return await getCurrentTabId();
    }

    close() {
        this.listeners.clear();
        this.isListening = false;
    }
}

/**
 * Create a chrome extension tabs channel
 * Acts like BroadcastChannel but uses chrome.tabs messaging to communicate with content scripts
 */

/**
 * Create a chrome extension tabs channel (unified)
 * Acts like BroadcastChannel but uses chrome.tabs messaging to communicate with content scripts
 * Supports both broadcast and current-tab modes
 */
export const createChromeExtensionTabsChannel = (
    channelName: string,
    options?: {
        mode?: 'broadcast' | 'current-tab';
        tabFilter?: (tab: chrome.tabs.Tab) => boolean;
        tabIdGetter?: () => Promise<number> | number;
    }
): BroadcastChannel => {
    const context = detectExecutionContext();
    if (context !== 'chrome-extension') {
        throw new Error('Chrome extension tabs channels can only be created in chrome extension context');
    }

    return new ChromeExtensionTabsChannel(channelName, options) as any;
};

/**
 * Create a chrome extension tabs messaging channel (unified)
 * Uses chrome.tabs.sendMessage for tab-to-content-script communication
 * Supports both broadcast and current-tab modes
 */
export const createChromeExtensionTabsMessagingChannel = (
    channelName: string,
    options?: {
        mode?: 'broadcast' | 'current-tab';
        tabFilter?: (tab: chrome.tabs.Tab) => boolean;
        tabIdGetter?: () => Promise<number> | number;
    }
): WorkerChannel => {
    const context = detectExecutionContext();
    if (context !== 'chrome-extension') {
        // Return a no-op channel when not in CRX context instead of throwing
        console.warn('Chrome extension tabs channels requested but not in chrome extension context. Returning no-op channel.');
        return {
            async request(method: string, args: any[] = []) {
                console.warn(`CRX tabs messaging not available: ${method}`, args);
                throw new Error('Chrome extension tabs messaging is not available in this context');
            },
            close() {
                // No-op
            }
        };
    }

    // Create a tabs channel for chrome extension messaging
    const tabsChannel = createChromeExtensionTabsChannel(channelName, options);

    // Create a channel using the tabs mechanism
    const channel = createOrUseExistingChannel(channelName, {}, tabsChannel);
    return channel?.remote ?? channel;
};

/**
 * Default tab ID getter - gets current active tab
 */
export const getCurrentTabId = async (): Promise<number> => {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs.length === 0) {
        throw new Error('No active tab found');
    }
    if (!tabs[0].id) {
        throw new Error('Active tab has no ID');
    }
    return tabs[0].id;
};

/**
 * Tab ID getter for visible tab (may be different from active)
 */
export const getVisibleTabId = async (): Promise<number> => {
    // First try active tab
    try {
        return await getCurrentTabId();
    } catch {
        // Fallback to any visible tab
        const tabs = await chrome.tabs.query({ currentWindow: true });
        const visibleTab = tabs.find(tab => tab.active || !tab.hidden);
        if (!visibleTab?.id) {
            throw new Error('No visible tab found');
        }
        return visibleTab.id;
    }
};

/**
 * Chrome Extension Runtime Module Interface
 */
export interface CrxRuntimeModule {
    // Capture screenshot + AI processing in one call
    capture(rect?: { x: number; y: number; width: number; height: number }, mode?: string): Promise<any>;

    // Just capture screenshot, return image data
    captureScreenshot(rect?: { x: number; y: number; width: number; height: number }): Promise<any>;

    // Process captured image data with AI
    processImage(imageData: string | Blob, mode?: string): Promise<any>;

    processText(text: string, options?: { type?: string }): Promise<any>;
    doCopy(data: { text?: string; data?: any }, options?: { showToast?: boolean }): Promise<any>;
    loadMarkdown(src: string): Promise<any>;
    captureWithRect(mode?: string): Promise<any>;
    getCurrentTab(): Promise<chrome.tabs.Tab | null>;
    sendMessage(type: string, data?: any): Promise<any>;
    close(): void;
}

/**
 * Simplified worker registration for common patterns
 */
export const registerWorkerAPI = (api: Record<string, Function>) => {
    // This will be called in worker context to register functions
    const channelHandler = initChannelHandler("worker");

    // Register functions in the uniform data store
    Object.keys(api).forEach(methodName => {
        const method = api[methodName];
        if (typeof method === 'function') {
            // Functions are automatically available through the uniform reflection system
            // The channel handler will proxy calls to these functions
        }
    });

    return channelHandler;
};
