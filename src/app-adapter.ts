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
    // Check for service worker context
    if (typeof ServiceWorkerGlobalScope !== 'undefined' && self instanceof ServiceWorkerGlobalScope) {
        return 'service-worker';
    }

    // Check for chrome extension context
    if (typeof chrome !== 'undefined' && chrome.runtime?.id && window.location.protocol === 'chrome-extension:') {
        return 'chrome-extension';
    }

    // Check for main thread context
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
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
                    this.underlyingChannel = await createChromeExtensionChannel(this.config);
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
    if (context !== 'chrome-extension') {
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