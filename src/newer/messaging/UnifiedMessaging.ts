/**
 * Unified Messaging System
 * Consolidates all messaging, broadcasting, queuing, and pipeline functionality
 * Part of fest/uniform - configurable without app-specific dependencies
 */

import {
    OptimizedWorkerChannel,
} from '../next/storage/Queued';
import { detectExecutionContext, supportsDedicatedWorkers } from '../next/utils/Env';
import { createQueuedOptimizedWorkerChannel } from '../next/utils/Utils';

import {
    MessageQueue,
    getMessageQueue,
    type QueuedMessage,
    type MessagePriority
} from './MessageQueue';
import {
    ProtocolReplayGuard,
    createProtocolEnvelope,
    normalizeProtocolEnvelope,
    type UniformProtocolEnvelope
} from './Protocol';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface UnifiedMessage<T = unknown> {
    id: string;
    type: string;
    source: string;
    destination?: string;
    contentType?: string;
    data: T;
    metadata?: MessageMetadata;
}

export type ProtocolMessage<T = unknown> = UniformProtocolEnvelope<T>;

export interface MessageMetadata {
    timestamp?: number;
    correlationId?: string;
    priority?: MessagePriority;
    expiresAt?: number;
    retryCount?: number;
    maxRetries?: number;
    [key: string]: unknown;
}

export interface MessageHandler<T = unknown> {
    canHandle: (message: UnifiedMessage<T>) => boolean;
    handle: (message: UnifiedMessage<T>) => Promise<void> | void;
}

export interface WorkerChannelConfig {
    name: string;
    script: string | (() => Worker) | Worker;
    options?: WorkerOptions;
    protocolOptions?: {
        timeout?: number;
        retries?: number;
        batching?: boolean;
        compression?: boolean;
    };
}

export interface PipelineConfig {
    name: string;
    stages: PipelineStage[];
    errorHandler?: (error: unknown, stage: PipelineStage, message: UnifiedMessage) => void;
    timeout?: number;
}

export interface PipelineStage {
    name: string;
    handler: (message: UnifiedMessage) => Promise<UnifiedMessage> | UnifiedMessage;
    timeout?: number;
    retries?: number;
}

export interface ChannelMapping {
    destination: string;
    channel: string;
}

export interface UnifiedMessagingConfig {
    /** Custom channel mappings (destination -> channel name) */
    channelMappings?: Record<string, string>;
    /** Message queue options */
    queueOptions?: {
        dbName?: string;
        storeName?: string;
        maxRetries?: number;
        defaultExpirationMs?: number;
    };
    /** Pending message store options */
    pendingStoreOptions?: {
        storageKey?: string;
        maxMessages?: number;
        defaultTTLMs?: number;
    };
}

// ============================================================================
// PENDING MESSAGE STORE (SYNC CATCH-UP)
// ============================================================================

interface PendingStoreEntry {
    destination: string;
    message: UnifiedMessage;
    storedAt: number;
}

export class PendingMessageStore {
    private readonly storageKey: string;
    private readonly maxMessages: number;
    private readonly defaultTTLMs: number;

    constructor(options?: { storageKey?: string; maxMessages?: number; defaultTTLMs?: number }) {
        this.storageKey = options?.storageKey ?? 'uniform-messaging-pending';
        this.maxMessages = options?.maxMessages ?? 200;
        this.defaultTTLMs = options?.defaultTTLMs ?? 24 * 60 * 60 * 1000; // 24h
    }

    private read(): PendingStoreEntry[] {
        if (typeof window === 'undefined' || typeof localStorage === 'undefined') return [];
        try {
            const raw = localStorage.getItem(this.storageKey);
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }

    private write(entries: PendingStoreEntry[]): void {
        if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(entries));
        } catch {
            // Storage might be full or unavailable
        }
    }

    enqueue(destination: string, message: UnifiedMessage): void {
        if (!destination) return;
        const now = Date.now();
        const ttl = Number(message?.metadata?.expiresAt)
            ? Math.max(0, Number(message.metadata!.expiresAt) - now)
            : this.defaultTTLMs;

        // Skip immediately-expired
        if (ttl <= 0) return;

        const entries = this.read()
            .filter(e => e && typeof e === 'object')
            .filter(e => {
                const expiresAt = Number(e?.message?.metadata?.expiresAt) ||
                    (Number(e?.storedAt) + this.defaultTTLMs);
                return expiresAt > now;
            });

        entries.push({ destination, message, storedAt: now });
        if (entries.length > this.maxMessages) {
            entries.splice(0, entries.length - this.maxMessages);
        }
        this.write(entries);
    }

    drain(destination: string): UnifiedMessage[] {
        if (!destination) return [];
        const now = Date.now();
        const entries = this.read();

        const keep: PendingStoreEntry[] = [];
        const out: UnifiedMessage[] = [];

        for (const e of entries) {
            const expiresAt = Number(e?.message?.metadata?.expiresAt) ||
                (Number(e?.storedAt) + this.defaultTTLMs);
            if (expiresAt <= now) continue;
            if (e?.destination === destination && e?.message) {
                out.push(e.message);
            } else {
                keep.push(e);
            }
        }

        this.write(keep);
        return out;
    }

    has(destination: string): boolean {
        if (!destination) return false;
        const now = Date.now();
        return this.read().some((e) => {
            if (!e || typeof e !== 'object') return false;
            const expiresAt = Number(e?.message?.metadata?.expiresAt) ||
                (Number(e?.storedAt) + this.defaultTTLMs);
            return expiresAt > now && e?.destination === destination;
        });
    }

    clear(): void {
        this.write([]);
    }
}

// ============================================================================
// UNIFIED MESSAGING MANAGER
// ============================================================================

export class UnifiedMessagingManager {
    private handlers = new Map<string, MessageHandler[]>();
    private channels = new Map<string, BroadcastChannel | OptimizedWorkerChannel>();
    private workerChannels = new Map<string, OptimizedWorkerChannel>();
    private viewChannels = new Map<string, Set<string>>();
    private pipelines = new Map<string, PipelineConfig>();
    private messageQueue: MessageQueue;
    private pendingStore: PendingMessageStore;
    private initializedViews = new Set<string>();
    private viewReadyPromises = new Map<string, { resolve: () => void; reject: (e: unknown) => void; promise: Promise<void> }>();
    private executionContext: ReturnType<typeof detectExecutionContext>;
    private channelMappings: Record<string, string>;
    private componentRegistry = new Map<string, string>();
    private replayGuard = new ProtocolReplayGuard(300);
    private localChannelId = '';

    constructor(config: UnifiedMessagingConfig = {}) {
        this.executionContext = detectExecutionContext();
        this.localChannelId = `${this.executionContext}:${Math.random().toString(36).slice(2, 10)}`;
        this.channelMappings = config.channelMappings ?? {};
        this.messageQueue = getMessageQueue(config.queueOptions);
        this.pendingStore = new PendingMessageStore(config.pendingStoreOptions);
        this.setupGlobalListeners();
    }

    // ========================================================================
    // MESSAGE HANDLING
    // ========================================================================

    /**
     * Register a message handler for a specific destination
     */
    registerHandler(destination: string, handler: MessageHandler): void {
        if (!this.handlers.has(destination)) {
            this.handlers.set(destination, []);
        }
        this.handlers.get(destination)!.push(handler);
    }

    /**
     * Unregister a message handler
     */
    unregisterHandler(destination: string, handler: MessageHandler): void {
        const handlers = this.handlers.get(destination);
        if (handlers) {
            const index = handlers.indexOf(handler);
            if (index > -1) {
                handlers.splice(index, 1);
            }
        }
    }

    /**
     * Send a message to a destination
     */
    async sendMessage(message: Partial<UnifiedMessage> & { type: string; data: unknown }): Promise<boolean> {
        const fullMessage = this.toProtocolMessage(message);

        // Try to deliver immediately
        if (await this.tryDeliverMessage(fullMessage)) {
            return true;
        }

        // Queue for later delivery if destination not available
        if (fullMessage.destination) {
            // Store in sync pending store for view/component catch-up
            this.pendingStore.enqueue(fullMessage.destination, fullMessage);

            await this.messageQueue.queueMessage(fullMessage.type, fullMessage, {
                priority: (fullMessage.metadata?.priority as MessagePriority) ?? 'normal',
                maxRetries: Number(fullMessage.metadata?.maxRetries ?? 3),
                destination: fullMessage.destination
            });
        }

        return false;
    }

    /**
     * Process a message through registered handlers
     */
    async processMessage(message: UnifiedMessage | ProtocolMessage): Promise<void> {
        const normalized = normalizeProtocolEnvelope(message as any);
        if (!this.replayGuard.accept(normalized)) return;

        const destination = normalized.destination ?? 'general';
        const handlers = this.handlers.get(destination) ?? [];

        for (const handler of handlers) {
            if (handler.canHandle(normalized as UnifiedMessage)) {
                try {
                    await handler.handle(normalized as UnifiedMessage);
                } catch (error) {
                    console.error(`[UnifiedMessaging] Handler error for ${destination}:`, error);
                }
            }
        }
    }

    /**
     * Try to deliver message immediately
     */
    private async tryDeliverMessage(message: UnifiedMessage | ProtocolMessage): Promise<boolean> {
        const normalized = normalizeProtocolEnvelope(message as any);

        // Check if destination has handlers
        if (normalized.destination && this.handlers.has(normalized.destination)) {
            await this.processMessage(normalized);
            return true;
        }

        // Check if we have a broadcast channel for the destination
        const channelName = this.getChannelForDestination(normalized.destination);
        if (channelName && this.channels.has(channelName)) {
            const channel = this.channels.get(channelName);
            if (channel instanceof BroadcastChannel) {
                try {
                    channel.postMessage(normalized);
                    return true;
                } catch (error) {
                    console.warn(`[UnifiedMessaging] Failed to post to broadcast channel ${channelName}:`, error);
                }
            } else if (channel && 'request' in channel) {
                try {
                    await (channel as OptimizedWorkerChannel).request(normalized.type, [normalized]);
                    return true;
                } catch (error) {
                    console.warn(`[UnifiedMessaging] Failed to post to worker channel ${channelName}:`, error);
                }
            }
        }

        return false;
    }

    // ========================================================================
    // WORKER CHANNEL MANAGEMENT
    // ========================================================================

    /**
     * Register worker channels for a specific view
     */
    registerViewChannels(viewHash: string, configs: WorkerChannelConfig[]): void {
        const channelNames = new Set<string>();

        for (const config of configs) {
            if (!this.isWorkerSupported(config)) {
                console.log(`[UnifiedMessaging] Skipping worker '${config.name}' in ${this.executionContext} context`);
                continue;
            }

            const channel = createQueuedOptimizedWorkerChannel({
                name: config.name,
                script: config.script,
                options: config.options,
                context: this.resolveWorkerContext()
            }, config.protocolOptions, () => {
                console.log(`[UnifiedMessaging] Channel '${config.name}' ready for view '${viewHash}'`);
            });

            const channelKey = `${viewHash}:${config.name}`;
            this.workerChannels.set(channelKey, channel);
            this.channels.set(channelKey, channel);
            channelNames.add(config.name);
        }

        this.viewChannels.set(viewHash, channelNames);
    }

    /**
     * Initialize channels when a view becomes active
     */
    async initializeViewChannels(viewHash: string): Promise<void> {
        if (this.initializedViews.has(viewHash)) return;

        const deferred = this.createDeferred<void>();
        this.viewReadyPromises.set(viewHash, deferred);

        console.log(`[UnifiedMessaging] Initializing channels for view: ${viewHash}`);

        const channelNames = this.viewChannels.get(viewHash);
        if (!channelNames) {
            deferred.resolve();
            return;
        }

        const initPromises: Promise<void>[] = [];
        for (const channelName of channelNames) {
            const channelKey = `${viewHash}:${channelName}`;
            const channel = this.workerChannels.get(channelKey);

            if (channel) {
                initPromises.push(
                    channel.request('ping', {}).catch(() => {
                        console.log(`[UnifiedMessaging] Channel '${channelName}' queued for view '${viewHash}'`);
                    })
                );
            }
        }

        await Promise.allSettled(initPromises);
        this.initializedViews.add(viewHash);
        deferred.resolve();
    }

    /**
     * Get a worker channel for a specific view and worker
     */
    getWorkerChannel(viewHash: string, workerName: string): OptimizedWorkerChannel | null {
        return this.workerChannels.get(`${viewHash}:${workerName}`) ?? null;
    }

    // ========================================================================
    // BROADCAST CHANNEL MANAGEMENT
    // ========================================================================

    /**
     * Create or get a broadcast channel
     */
    getBroadcastChannel(channelName: string): BroadcastChannel {
        if (!this.channels.has(channelName)) {
            try {
                const channel = new BroadcastChannel(channelName);
                channel.addEventListener('message', (event) => {
                    this.handleBroadcastMessage(event.data, channelName);
                });
                this.channels.set(channelName, channel);
            } catch (error) {
                console.warn(`[UnifiedMessaging] BroadcastChannel not available: ${channelName}`, error);
                // Return a mock channel that does nothing
                const mockChannel = {
                    postMessage: () => {},
                    close: () => {},
                    addEventListener: () => {},
                    removeEventListener: () => {}
                } as unknown as BroadcastChannel;
                this.channels.set(channelName, mockChannel);
            }
        }
        return this.channels.get(channelName) as BroadcastChannel;
    }

    /**
     * Handle incoming broadcast messages
     */
    private async handleBroadcastMessage(message: unknown, channelName: string): Promise<void> {
        try {
            const envelope = this.toProtocolMessage((message ?? {}) as any, channelName);
            if (envelope.srcChannel === this.localChannelId) return;
            await this.processMessage(envelope);
        } catch (error) {
            console.error(`[UnifiedMessaging] Error handling broadcast message on ${channelName}:`, error);
        }
    }

    // ========================================================================
    // PIPELINE MANAGEMENT
    // ========================================================================

    /**
     * Register a message processing pipeline
     */
    registerPipeline(config: PipelineConfig): void {
        this.pipelines.set(config.name, config);
    }

    /**
     * Process a message through a pipeline
     */
    async processThroughPipeline(pipelineName: string, message: UnifiedMessage): Promise<UnifiedMessage> {
        const pipeline = this.pipelines.get(pipelineName);
        if (!pipeline) {
            throw new Error(`Pipeline '${pipelineName}' not found`);
        }

        let currentMessage = { ...message };
        const timeout = pipeline.timeout ?? 30000;

        for (const stage of pipeline.stages) {
            const stageTimeout = stage.timeout ?? timeout;
            const retries = stage.retries ?? 0;

            for (let attempt = 0; attempt <= retries; attempt++) {
                try {
                    const result = await Promise.race([
                        stage.handler(currentMessage),
                        new Promise<never>((_, reject) =>
                            setTimeout(() => reject(new Error(`Stage '${stage.name}' timeout`)), stageTimeout)
                        )
                    ]);

                    currentMessage = result;
                    break; // Success, move to next stage
                } catch (error) {
                    if (attempt === retries) {
                        if (pipeline.errorHandler) {
                            pipeline.errorHandler(error, stage, currentMessage);
                        }
                        throw error;
                    }
                    console.warn(`[UnifiedMessaging] Pipeline '${pipelineName}' stage '${stage.name}' attempt ${attempt + 1} failed:`, error);
                }
            }
        }

        return currentMessage;
    }

    // ========================================================================
    // QUEUE MANAGEMENT
    // ========================================================================

    /**
     * Process queued messages for a destination
     */
    async processQueuedMessages(destination?: string): Promise<void> {
        const queuedMessages = await this.messageQueue.getQueuedMessages(destination);

        for (const queuedMessage of queuedMessages) {
            const dataAsMessage = queuedMessage.data as Record<string, unknown>;
            const message = (
                dataAsMessage &&
                typeof dataAsMessage === 'object' &&
                typeof dataAsMessage.type === 'string' &&
                typeof dataAsMessage.id === 'string'
            )
                ? this.toProtocolMessage(dataAsMessage as any)
                : {
                    ...this.toProtocolMessage({
                        id: queuedMessage.id,
                        type: queuedMessage.type,
                        source: 'queue',
                        destination: queuedMessage.destination,
                        data: queuedMessage.data,
                        metadata: {
                            timestamp: queuedMessage.timestamp,
                            retryCount: queuedMessage.retryCount,
                            maxRetries: queuedMessage.maxRetries,
                            ...queuedMessage.metadata
                        }
                    }),
                    type: queuedMessage.type,
                };

            if (await this.tryDeliverMessage(message)) {
                await this.messageQueue.removeMessage(queuedMessage.id);
            }
        }
    }

    // ========================================================================
    // COMPONENT REGISTRATION
    // ========================================================================

    /**
     * Register a component with a destination
     */
    registerComponent(componentId: string, destination: string): void {
        this.componentRegistry.set(componentId, destination);
        // Trigger queued delivery catch-up as soon as the destination is registered.
        // This is especially important for cold-start transfers where pending
        // localStorage payloads may not preserve rich objects like File.
        void this.processQueuedMessages(destination).catch((error) => {
            console.warn(`[UnifiedMessaging] Failed to process queued messages for ${destination}:`, error);
        });
    }

    /**
     * Initialize a component and return any pending messages
     */
    initializeComponent(componentId: string): UnifiedMessage[] {
        const destination = this.componentRegistry.get(componentId);
        if (!destination) return [];
        // Also trigger async queue replay on component init (in addition to pending drain)
        // to deliver any IndexedDB-backed messages that were queued pre-mount.
        void this.processQueuedMessages(destination).catch((error) => {
            console.warn(`[UnifiedMessaging] Failed to replay queued messages for ${destination}:`, error);
        });
        return this.pendingStore.drain(destination);
    }

    /**
     * Check if there are pending messages for a destination
     */
    hasPendingMessages(destination: string): boolean {
        return this.pendingStore.has(destination);
    }

    /**
     * Explicitly enqueue a pending message
     */
    enqueuePendingMessage(destination: string, message: UnifiedMessage): void {
        const dest = String(destination ?? '').trim();
        if (!dest || !message) return;
        this.pendingStore.enqueue(dest, message);
    }

    // ========================================================================
    // CHANNEL MAPPING
    // ========================================================================

    /**
     * Set channel mappings
     */
    setChannelMappings(mappings: Record<string, string>): void {
        this.channelMappings = { ...this.channelMappings, ...mappings };
    }

    /**
     * Get channel name for a destination
     */
    private getChannelForDestination(destination?: string): string | null {
        if (!destination) return null;
        return this.channelMappings[destination] ?? null;
    }

    private detectProtocolName(): UniformProtocolEnvelope['protocol'] {
        if (this.executionContext === 'chrome-extension') return 'chrome';
        if (this.executionContext === 'service-worker') return 'service';
        if (this.executionContext === 'main') return 'window';
        return 'unknown';
    }

    private resolveWorkerContext(): 'main' | 'service-worker' | 'chrome-extension' | undefined {
        if (this.executionContext === 'main') return 'main';
        if (this.executionContext === 'service-worker') return 'service-worker';
        if (this.executionContext === 'chrome-extension') return 'chrome-extension';
        return undefined;
    }

    private toProtocolMessage(
        message: Partial<UnifiedMessage> & { type?: string; data?: unknown },
        fallbackSource?: string
    ): ProtocolMessage {
        return createProtocolEnvelope({
            ...message,
            id: message.id,
            type: message.type ?? 'unknown',
            source: message.source ?? fallbackSource ?? this.localChannelId,
            destination: message.destination,
            data: message.data,
            metadata: { timestamp: Date.now(), ...(message.metadata ?? {}) },
            protocol: this.detectProtocolName(),
            purpose: 'mail',
            srcChannel: message.source ?? this.localChannelId,
            dstChannel: message.destination
        });
    }

    // ========================================================================
    // UTILITY METHODS
    // ========================================================================

    /**
     * Check if a worker configuration is supported
     */
    private isWorkerSupported(_config: WorkerChannelConfig): boolean {
        if (this.executionContext === 'service-worker') {
            return true;
        }

        if (this.executionContext === 'chrome-extension') {
            return supportsDedicatedWorkers();
        }

        return true;
    }

    /**
     * Set up global listeners for cross-component communication
     */
    private setupGlobalListeners(): void {
        if (typeof window !== 'undefined') {
            globalThis.addEventListener('message', (event) => {
                if (event.data && typeof event.data === 'object' && event.data.type) {
                    this.handleBroadcastMessage(event.data, 'window-message');
                }
            });
        }
    }

    /**
     * Create a deferred promise
     */
    private createDeferred<T>(): { resolve: (value: T) => void; reject: (e: unknown) => void; promise: Promise<T> } {
        let resolve!: (value: T) => void;
        let reject!: (e: unknown) => void;
        const promise = new Promise<T>((res, rej) => {
            resolve = res;
            reject = rej;
        });
        return { resolve, reject, promise };
    }

    /**
     * Get execution context
     */
    getExecutionContext(): string {
        return this.executionContext;
    }

    /**
     * Clean up resources
     */
    destroy(): void {
        for (const channel of this.channels.values()) {
            if (channel instanceof BroadcastChannel) {
                channel.close();
            } else if (channel && 'close' in channel) {
                (channel as OptimizedWorkerChannel).close();
            }
        }

        this.channels.clear();
        this.workerChannels.clear();
        this.handlers.clear();
        this.pipelines.clear();
    }
}

// ============================================================================
// SINGLETON FACTORY
// ============================================================================

let defaultInstance: UnifiedMessagingManager | null = null;

/**
 * Get the default UnifiedMessagingManager instance
 */
export function getUnifiedMessaging(config?: UnifiedMessagingConfig): UnifiedMessagingManager {
    if (!defaultInstance) {
        defaultInstance = new UnifiedMessagingManager(config);
    }
    return defaultInstance;
}

/**
 * Create a new UnifiedMessagingManager instance (not cached)
 */
export function createUnifiedMessaging(config?: UnifiedMessagingConfig): UnifiedMessagingManager {
    return new UnifiedMessagingManager(config);
}

/**
 * Reset the default instance (useful for testing)
 */
export function resetUnifiedMessaging(): void {
    if (defaultInstance) {
        defaultInstance.destroy();
        defaultInstance = null;
    }
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Send a message using the default manager
 */
export function sendMessage(message: Partial<UnifiedMessage> & { type: string; data: unknown }): Promise<boolean> {
    return getUnifiedMessaging().sendMessage(message);
}

/**
 * Register a handler using the default manager
 */
export function registerHandler(destination: string, handler: MessageHandler): void {
    getUnifiedMessaging().registerHandler(destination, handler);
}

/**
 * Get a worker channel using the default manager
 */
export function getWorkerChannel(viewHash: string, workerName: string): OptimizedWorkerChannel | null {
    return getUnifiedMessaging().getWorkerChannel(viewHash, workerName);
}

/**
 * Get a broadcast channel using the default manager
 */
export function getBroadcastChannel(channelName: string): BroadcastChannel {
    return getUnifiedMessaging().getBroadcastChannel(channelName);
}
