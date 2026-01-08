import { UUIDv4 } from "fest/core";
import { initChannelHandler } from "./Channels";

/**
 * Type definitions for fest/uniform
 * Centralized to avoid circular import issues
 */

export interface WorkerChannel {
    request(method: string, args?: any[]): Promise<any>;
    close(): void;
}

export interface WorkerConfig {
    name: string;
    script: string | (() => Worker) | Worker;
    options?: WorkerOptions;
    context?: 'main' | 'service-worker' | 'chrome-extension';
    tabsChannel?: boolean;
    tabsOptions?: { tabFilter?: (tab: chrome.tabs.Tab) => boolean };
    currentTabChannel?: boolean;
    currentTabOptions?: {
        tabIdGetter?: () => Promise<number> | number;
        useVisibleTab?: boolean;
    };
}

export interface QueuedRequest {
    id: string;
    method: string;
    args: any[];
    resolve: (value: any) => void;
    reject: (error: any) => void;
    timestamp: number;
}

export interface MessageEnvelope {
    id: string;
    type: string;
    payload: any;
    timestamp: number;
    replyTo?: string;
}

export interface ProtocolOptions {
    timeout?: number;
    retries?: number;
    compression?: boolean;
    batching?: boolean;
}


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
        this.context = config.context ?? 'unknown';
    }

    /**
     * Initialize the underlying channel
     */
    async connect(underlyingChannel: WorkerChannel | null = null): Promise<void> {
        this.underlyingChannel = underlyingChannel;
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

/**
 * Optimized communication protocol for fest/uniform
 * Provides efficient message passing and state synchronization
 */

export interface ProtocolOptions {
    timeout?: number;
    retries?: number;
    compression?: boolean;
    batching?: boolean;
}

export class OptimizedWorkerChannel {
    private channel: WorkerChannel | null = null;
    private isChannelReady = false;
    private pendingRequests = new Map<string, {
        resolve: Function;
        reject: Function;
        timeout: number;
    }>();
    private messageQueue: MessageEnvelope[] = [];
    private queuedRequests: QueuedRequest[] = [];
    private batchTimer?: number;
    private options: Required<ProtocolOptions>;
    private onChannelReady?: (channel: WorkerChannel) => void;

    constructor(
        channel: WorkerChannel | null = null,
        options: ProtocolOptions = {},
        onChannelReady?: (channel: WorkerChannel) => void
    ) {
        this.channel = channel;
        this.isChannelReady = !!channel;
        this.onChannelReady = onChannelReady;
        this.options = {
            timeout: 30000,
            retries: 3,
            compression: false,
            batching: true,
            ...options
        };
    }

    /**
     * Set the underlying channel when it becomes available
     */
    setChannel(channel: WorkerChannel): void {
        this.channel = channel;
        this.isChannelReady = true;
        this.onChannelReady?.(channel);
        this.flushQueuedRequests();
    }

    /**
     * Send a request and wait for response
     */
    async request(type: string, payload: any, options?: Partial<ProtocolOptions>): Promise<any> {
        // If channel is not ready, queue the request
        if (!this.isChannelReady || !this.channel) {
            return new Promise((resolve, reject) => {
                const queuedRequest: QueuedRequest = {
                    id: UUIDv4(),
                    method: type,
                    args: [payload],
                    resolve,
                    reject,
                    timestamp: Date.now()
                };
                this.queuedRequests.push(queuedRequest);
            });
        }

        const opts = { ...this.options, ...options };
        const messageId = UUIDv4();

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.pendingRequests.delete(messageId);
                reject(new Error(`Request timeout: ${type}`));
            }, opts.timeout);

            this.pendingRequests.set(messageId, { resolve, reject, timeout });

            const envelope: MessageEnvelope = {
                id: messageId,
                type,
                payload,
                timestamp: Date.now()
            };

            if (opts.batching) {
                this.queueMessage(envelope);
            } else {
                this.sendMessage(envelope);
            }
        });
    }

    /**
     * Process queued requests when channel becomes available
     */
    private async flushQueuedRequests(): Promise<void> {
        if (!this.channel || this.queuedRequests.length === 0) return;

        const queueCopy = [...this.queuedRequests];
        this.queuedRequests = [];

        for (const queuedRequest of queueCopy) {
            try { // @ts-ignore
                const result = await this.request(queuedRequest.method, ...((queuedRequest?.args ?? []) as any));
                queuedRequest.resolve(result);
            } catch (error) {
                queuedRequest.reject(error);
            }
        }
    }

    /**
     * Send a one-way message (fire and forget)
     */
    notify(type: string, payload: any): void {
        const envelope: MessageEnvelope = {
            id: UUIDv4(),
            type,
            payload,
            timestamp: Date.now()
        };

        if (this.options.batching) {
            this.queueMessage(envelope);
        } else {
            this.sendMessage(envelope);
        }
    }

    /**
     * Stream data with backpressure handling
     */
    async *stream(type: string, data: any[]): AsyncGenerator<any> {
        for (const chunk of data) {
            const result = await this.request(`${type}:chunk`, chunk);
            yield result;
        }
    }

    /**
     * Queue message for batching
     */
    private queueMessage(envelope: MessageEnvelope): void {
        this.messageQueue.push(envelope);

        if (!this.batchTimer) {
            this.batchTimer = setTimeout(() => {
                this.flushBatch();
            }, 16); // ~60fps
        }
    }

    /**
     * Send batched messages
     */
    private flushBatch(): void {
        if (this.messageQueue.length === 0) return;

        const batchEnvelope: MessageEnvelope = {
            id: UUIDv4(),
            type: "batch",
            payload: this.messageQueue,
            timestamp: Date.now()
        };

        this.sendMessage(batchEnvelope);
        this.messageQueue = [];
        this.batchTimer = undefined;
    }

    /**
     * Send single message through channel
     */
    private async sendMessage(envelope: MessageEnvelope): Promise<void> {
        try {
            const result = await this.channel?.request?.("processMessage", [envelope]);

            // Handle response if it's a reply
            if (envelope.replyTo && this.pendingRequests.has(envelope.replyTo)) {
                const { resolve, timeout } = this.pendingRequests.get(envelope.replyTo)!;
                clearTimeout(timeout);
                this.pendingRequests.delete(envelope.replyTo);
                resolve(result);
            }
        } catch (error) {
            // Handle failed message
            if (this.pendingRequests.has(envelope.id)) {
                const { reject, timeout } = this.pendingRequests.get(envelope.id)!;
                clearTimeout(timeout);
                this.pendingRequests.delete(envelope.id);
                reject(error);
            }
        }
    }

    /**
     * Close the channel
     */
    close(): void {
        if (this.batchTimer) {
            clearTimeout(this.batchTimer);
        }

        // Reject all pending requests
        for (const [id, { reject, timeout }] of this.pendingRequests) {
            clearTimeout(timeout);
            reject(new Error("Channel closed"));
        }
        this.pendingRequests.clear();

        this.channel?.close?.();
    }
}
