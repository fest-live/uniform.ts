import { OptimizedWorkerChannel, QueuedWorkerChannel, type ProtocolOptions, type WorkerChannel, type WorkerConfig } from "./Queued";
import { createOrUseExistingChannel } from "./Channels";
import { UUIDv4 } from "fest/core";
import { ChromeExtensionBroadcastChannel } from "./Wrappers";
import { ChromeExtensionTabsChannel } from "./Wrappers";
import { initChannelHandler } from "./Channels";

/**
 * Create a chrome extension worker channel
 */
export const createChromeExtensionChannel = async (config: WorkerConfig): Promise<WorkerChannel> => {
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
 * Create a chrome extension broadcast-like channel
 * Acts like BroadcastChannel but uses chrome.runtime messaging
 */
export const createChromeExtensionBroadcastChannel = (channelName: string): BroadcastChannel => {
    return new ChromeExtensionBroadcastChannel(channelName) as any;
};

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
    // Create a tabs channel for chrome extension messaging
    const tabsChannel = createChromeExtensionTabsChannel(channelName, options);

    // Create a channel using the tabs mechanism
    const channel = createOrUseExistingChannel(channelName, {}, tabsChannel);
    return channel?.remote ?? channel;
};

/**
 * Initialize the main thread channel handler
 */
export const initMainChannel = (name: string = "$host$") => {
    return initChannelHandler(name ?? "$host$");
};

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
 * Create a worker channel with simplified API
 */
export const createWorkerChannel = async (config: WorkerConfig): Promise<WorkerChannel> => {
    const context = config.context;

    if (context === 'service-worker') {
        // Service workers cannot create dedicated workers directly
        // Instead, we create a channel that will use alternative communication
        return createServiceWorkerChannel(config);
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
    return channel as WorkerChannel;
};

/**
 * Create an optimized worker channel
 */
export const createOptimizedWorkerChannel = async (
    config: WorkerConfig,
    options?: ProtocolOptions
): Promise<OptimizedWorkerChannel> => {
    const baseChannel = await createWorkerChannel(config);
    return new OptimizedWorkerChannel(baseChannel, options);
};

/**
 * Create an optimized worker channel with queuing support
 */
export const createQueuedOptimizedWorkerChannel = (
    config: WorkerConfig,
    options?: ProtocolOptions,
    onChannelReady?: (channel: WorkerChannel) => void
): OptimizedWorkerChannel => {
    // Create the optimized channel first (without underlying channel)
    const optimizedChannel = new OptimizedWorkerChannel(null, options, onChannelReady);

    // Then create the underlying channel asynchronously
    createWorkerChannel(config).then((baseChannel) => {
        optimizedChannel.setChannel(baseChannel);
    }).catch((error) => {
        console.error('[createQueuedOptimizedWorkerChannel] Failed to create base channel:', error);
        // Reject all queued requests
        optimizedChannel.close();
    });

    return optimizedChannel;
};
