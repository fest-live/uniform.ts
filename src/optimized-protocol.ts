/**
 * Optimized communication protocol for fest/uniform
 * Provides efficient message passing and state synchronization
 */

import { createWorkerChannel } from "./app-adapter";
import { UUIDv4 } from "fest/core";
import type { WorkerChannel, MessageEnvelope, QueuedRequest, ProtocolOptions } from "./types";

// Re-export types for backward compatibility
export type { MessageEnvelope, QueuedRequest, ProtocolOptions };

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
            try {
                const result = await this.request(queuedRequest.method, ...queuedRequest.args);
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
            const result = await this.channel.request("processMessage", [envelope]);

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

        this.channel.close();
    }
}

/**
 * Create an optimized worker channel
 */
export const createOptimizedWorkerChannel = async (
    config: import("./app-adapter").WorkerConfig,
    options?: ProtocolOptions
): Promise<OptimizedWorkerChannel> => {
    const baseChannel = await createWorkerChannel(config);
    return new OptimizedWorkerChannel(baseChannel, options);
};

/**
 * Create an optimized worker channel with queuing support
 */
export const createQueuedOptimizedWorkerChannel = (
    config: import("./app-adapter").WorkerConfig,
    options?: ProtocolOptions,
    onChannelReady?: (channel: import("./app-adapter").WorkerChannel) => void
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