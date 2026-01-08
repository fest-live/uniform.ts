/**
 * Chrome Extension Broadcast-like Channel
 * Acts like a BroadcastChannel but uses chrome.runtime messaging
 */
export class ChromeExtensionBroadcastChannel {
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
 * Unified Chrome Extension Tabs Channel
 * Acts like a BroadcastChannel but uses chrome.tabs messaging to communicate with content scripts
 * Supports both broadcast-to-multiple-tabs and current-tab-only targeting
 */
export class ChromeExtensionTabsChannel {
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
        this.tabIdGetter = options?.tabIdGetter || this.getCurrentTabId;
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
        return 0;
    }

    close() {
        this.listeners.clear();
        this.isListening = false;
    }
}
