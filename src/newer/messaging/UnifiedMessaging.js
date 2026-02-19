/**
 * Unified Messaging System
 * Consolidates all messaging, broadcasting, queuing, and pipeline functionality
 * Part of fest/uniform - configurable without app-specific dependencies
 */
import { detectExecutionContext, supportsDedicatedWorkers } from '../next/utils/Env';
import { createQueuedOptimizedWorkerChannel } from '../next/utils/Utils';
import { getMessageQueue } from './MessageQueue';
export class PendingMessageStore {
    storageKey;
    maxMessages;
    defaultTTLMs;
    constructor(options) {
        this.storageKey = options?.storageKey ?? 'uniform-messaging-pending';
        this.maxMessages = options?.maxMessages ?? 200;
        this.defaultTTLMs = options?.defaultTTLMs ?? 24 * 60 * 60 * 1000; // 24h
    }
    read() {
        if (typeof window === 'undefined' || typeof localStorage === 'undefined')
            return [];
        try {
            const raw = localStorage.getItem(this.storageKey);
            if (!raw)
                return [];
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        }
        catch {
            return [];
        }
    }
    write(entries) {
        if (typeof window === 'undefined' || typeof localStorage === 'undefined')
            return;
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(entries));
        }
        catch {
            // Storage might be full or unavailable
        }
    }
    enqueue(destination, message) {
        if (!destination)
            return;
        const now = Date.now();
        const ttl = Number(message?.metadata?.expiresAt)
            ? Math.max(0, Number(message.metadata.expiresAt) - now)
            : this.defaultTTLMs;
        // Skip immediately-expired
        if (ttl <= 0)
            return;
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
    drain(destination) {
        if (!destination)
            return [];
        const now = Date.now();
        const entries = this.read();
        const keep = [];
        const out = [];
        for (const e of entries) {
            const expiresAt = Number(e?.message?.metadata?.expiresAt) ||
                (Number(e?.storedAt) + this.defaultTTLMs);
            if (expiresAt <= now)
                continue;
            if (e?.destination === destination && e?.message) {
                out.push(e.message);
            }
            else {
                keep.push(e);
            }
        }
        this.write(keep);
        return out;
    }
    has(destination) {
        if (!destination)
            return false;
        const now = Date.now();
        return this.read().some((e) => {
            if (!e || typeof e !== 'object')
                return false;
            const expiresAt = Number(e?.message?.metadata?.expiresAt) ||
                (Number(e?.storedAt) + this.defaultTTLMs);
            return expiresAt > now && e?.destination === destination;
        });
    }
    clear() {
        this.write([]);
    }
}
// ============================================================================
// UNIFIED MESSAGING MANAGER
// ============================================================================
export class UnifiedMessagingManager {
    handlers = new Map();
    channels = new Map();
    workerChannels = new Map();
    viewChannels = new Map();
    pipelines = new Map();
    messageQueue;
    pendingStore;
    initializedViews = new Set();
    viewReadyPromises = new Map();
    executionContext;
    channelMappings;
    componentRegistry = new Map();
    constructor(config = {}) {
        this.executionContext = detectExecutionContext();
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
    registerHandler(destination, handler) {
        if (!this.handlers.has(destination)) {
            this.handlers.set(destination, []);
        }
        this.handlers.get(destination).push(handler);
    }
    /**
     * Unregister a message handler
     */
    unregisterHandler(destination, handler) {
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
    async sendMessage(message) {
        // Ensure message has required fields
        const fullMessage = {
            id: message.id ?? crypto.randomUUID(),
            type: message.type,
            source: message.source ?? 'unified-messaging',
            destination: message.destination,
            contentType: message.contentType,
            data: message.data,
            metadata: { timestamp: Date.now(), ...message.metadata }
        };
        // Try to deliver immediately
        if (await this.tryDeliverMessage(fullMessage)) {
            return true;
        }
        // Queue for later delivery if destination not available
        if (fullMessage.destination) {
            // Store in sync pending store for view/component catch-up
            this.pendingStore.enqueue(fullMessage.destination, fullMessage);
            await this.messageQueue.queueMessage(fullMessage.type, fullMessage, {
                priority: fullMessage.metadata?.priority ?? 'normal',
                maxRetries: fullMessage.metadata?.maxRetries ?? 3,
                destination: fullMessage.destination
            });
        }
        return false;
    }
    /**
     * Process a message through registered handlers
     */
    async processMessage(message) {
        const destination = message.destination ?? 'general';
        const handlers = this.handlers.get(destination) ?? [];
        for (const handler of handlers) {
            if (handler.canHandle(message)) {
                try {
                    await handler.handle(message);
                }
                catch (error) {
                    console.error(`[UnifiedMessaging] Handler error for ${destination}:`, error);
                }
            }
        }
    }
    /**
     * Try to deliver message immediately
     */
    async tryDeliverMessage(message) {
        // Check if destination has handlers
        if (message.destination && this.handlers.has(message.destination)) {
            await this.processMessage(message);
            return true;
        }
        // Check if we have a broadcast channel for the destination
        const channelName = this.getChannelForDestination(message.destination);
        if (channelName && this.channels.has(channelName)) {
            const channel = this.channels.get(channelName);
            if (channel instanceof BroadcastChannel) {
                try {
                    channel.postMessage(message);
                    return true;
                }
                catch (error) {
                    console.warn(`[UnifiedMessaging] Failed to post to broadcast channel ${channelName}:`, error);
                }
            }
            else if (channel && 'request' in channel) {
                try {
                    await channel.request(message.type, [message]);
                    return true;
                }
                catch (error) {
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
    registerViewChannels(viewHash, configs) {
        const channelNames = new Set();
        for (const config of configs) {
            if (!this.isWorkerSupported(config)) {
                console.log(`[UnifiedMessaging] Skipping worker '${config.name}' in ${this.executionContext} context`);
                continue;
            }
            const channel = createQueuedOptimizedWorkerChannel({
                name: config.name,
                script: config.script,
                options: config.options,
                context: this.executionContext
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
    async initializeViewChannels(viewHash) {
        if (this.initializedViews.has(viewHash))
            return;
        const deferred = this.createDeferred();
        this.viewReadyPromises.set(viewHash, deferred);
        console.log(`[UnifiedMessaging] Initializing channels for view: ${viewHash}`);
        const channelNames = this.viewChannels.get(viewHash);
        if (!channelNames) {
            deferred.resolve();
            return;
        }
        const initPromises = [];
        for (const channelName of channelNames) {
            const channelKey = `${viewHash}:${channelName}`;
            const channel = this.workerChannels.get(channelKey);
            if (channel) {
                initPromises.push(channel.request('ping', {}).catch(() => {
                    console.log(`[UnifiedMessaging] Channel '${channelName}' queued for view '${viewHash}'`);
                }));
            }
        }
        await Promise.allSettled(initPromises);
        this.initializedViews.add(viewHash);
        deferred.resolve();
    }
    /**
     * Get a worker channel for a specific view and worker
     */
    getWorkerChannel(viewHash, workerName) {
        return this.workerChannels.get(`${viewHash}:${workerName}`) ?? null;
    }
    // ========================================================================
    // BROADCAST CHANNEL MANAGEMENT
    // ========================================================================
    /**
     * Create or get a broadcast channel
     */
    getBroadcastChannel(channelName) {
        if (!this.channels.has(channelName)) {
            try {
                const channel = new BroadcastChannel(channelName);
                channel.addEventListener('message', (event) => {
                    this.handleBroadcastMessage(event.data, channelName);
                });
                this.channels.set(channelName, channel);
            }
            catch (error) {
                console.warn(`[UnifiedMessaging] BroadcastChannel not available: ${channelName}`, error);
                // Return a mock channel that does nothing
                const mockChannel = {
                    postMessage: () => { },
                    close: () => { },
                    addEventListener: () => { },
                    removeEventListener: () => { }
                };
                this.channels.set(channelName, mockChannel);
            }
        }
        return this.channels.get(channelName);
    }
    /**
     * Handle incoming broadcast messages
     */
    async handleBroadcastMessage(message, channelName) {
        try {
            const msgObj = message;
            const unifiedMessage = msgObj?.id ? message : {
                id: crypto.randomUUID(),
                type: String(msgObj?.type ?? 'unknown'),
                source: channelName,
                data: message,
                metadata: { timestamp: Date.now() }
            };
            await this.processMessage(unifiedMessage);
        }
        catch (error) {
            console.error(`[UnifiedMessaging] Error handling broadcast message on ${channelName}:`, error);
        }
    }
    // ========================================================================
    // PIPELINE MANAGEMENT
    // ========================================================================
    /**
     * Register a message processing pipeline
     */
    registerPipeline(config) {
        this.pipelines.set(config.name, config);
    }
    /**
     * Process a message through a pipeline
     */
    async processThroughPipeline(pipelineName, message) {
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
                        new Promise((_, reject) => setTimeout(() => reject(new Error(`Stage '${stage.name}' timeout`)), stageTimeout))
                    ]);
                    currentMessage = result;
                    break; // Success, move to next stage
                }
                catch (error) {
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
    async processQueuedMessages(destination) {
        const queuedMessages = await this.messageQueue.getQueuedMessages(destination);
        for (const queuedMessage of queuedMessages) {
            const dataAsMessage = queuedMessage.data;
            const message = (dataAsMessage &&
                typeof dataAsMessage === 'object' &&
                typeof dataAsMessage.type === 'string' &&
                typeof dataAsMessage.id === 'string')
                ? dataAsMessage
                : {
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
    registerComponent(componentId, destination) {
        this.componentRegistry.set(componentId, destination);
    }
    /**
     * Initialize a component and return any pending messages
     */
    initializeComponent(componentId) {
        const destination = this.componentRegistry.get(componentId);
        if (!destination)
            return [];
        return this.pendingStore.drain(destination);
    }
    /**
     * Check if there are pending messages for a destination
     */
    hasPendingMessages(destination) {
        return this.pendingStore.has(destination);
    }
    /**
     * Explicitly enqueue a pending message
     */
    enqueuePendingMessage(destination, message) {
        const dest = String(destination ?? '').trim();
        if (!dest || !message)
            return;
        this.pendingStore.enqueue(dest, message);
    }
    // ========================================================================
    // CHANNEL MAPPING
    // ========================================================================
    /**
     * Set channel mappings
     */
    setChannelMappings(mappings) {
        this.channelMappings = { ...this.channelMappings, ...mappings };
    }
    /**
     * Get channel name for a destination
     */
    getChannelForDestination(destination) {
        if (!destination)
            return null;
        return this.channelMappings[destination] ?? null;
    }
    // ========================================================================
    // UTILITY METHODS
    // ========================================================================
    /**
     * Check if a worker configuration is supported
     */
    isWorkerSupported(_config) {
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
    setupGlobalListeners() {
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
    createDeferred() {
        let resolve;
        let reject;
        const promise = new Promise((res, rej) => {
            resolve = res;
            reject = rej;
        });
        return { resolve, reject, promise };
    }
    /**
     * Get execution context
     */
    getExecutionContext() {
        return this.executionContext;
    }
    /**
     * Clean up resources
     */
    destroy() {
        for (const channel of this.channels.values()) {
            if (channel instanceof BroadcastChannel) {
                channel.close();
            }
            else if (channel && 'close' in channel) {
                channel.close();
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
let defaultInstance = null;
/**
 * Get the default UnifiedMessagingManager instance
 */
export function getUnifiedMessaging(config) {
    if (!defaultInstance) {
        defaultInstance = new UnifiedMessagingManager(config);
    }
    return defaultInstance;
}
/**
 * Create a new UnifiedMessagingManager instance (not cached)
 */
export function createUnifiedMessaging(config) {
    return new UnifiedMessagingManager(config);
}
/**
 * Reset the default instance (useful for testing)
 */
export function resetUnifiedMessaging() {
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
export function sendMessage(message) {
    return getUnifiedMessaging().sendMessage(message);
}
/**
 * Register a handler using the default manager
 */
export function registerHandler(destination, handler) {
    getUnifiedMessaging().registerHandler(destination, handler);
}
/**
 * Get a worker channel using the default manager
 */
export function getWorkerChannel(viewHash, workerName) {
    return getUnifiedMessaging().getWorkerChannel(viewHash, workerName);
}
/**
 * Get a broadcast channel using the default manager
 */
export function getBroadcastChannel(channelName) {
    return getUnifiedMessaging().getBroadcastChannel(channelName);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVW5pZmllZE1lc3NhZ2luZy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIlVuaWZpZWRNZXNzYWdpbmcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7R0FJRztBQUtILE9BQU8sRUFBRSxzQkFBc0IsRUFBRSx3QkFBd0IsRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBQ3JGLE9BQU8sRUFBRSxrQ0FBa0MsRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBRXpFLE9BQU8sRUFFSCxlQUFlLEVBR2xCLE1BQU0sZ0JBQWdCLENBQUM7QUEwRnhCLE1BQU0sT0FBTyxtQkFBbUI7SUFDWCxVQUFVLENBQVM7SUFDbkIsV0FBVyxDQUFTO0lBQ3BCLFlBQVksQ0FBUztJQUV0QyxZQUFZLE9BQThFO1FBQ3RGLElBQUksQ0FBQyxVQUFVLEdBQUcsT0FBTyxFQUFFLFVBQVUsSUFBSSwyQkFBMkIsQ0FBQztRQUNyRSxJQUFJLENBQUMsV0FBVyxHQUFHLE9BQU8sRUFBRSxXQUFXLElBQUksR0FBRyxDQUFDO1FBQy9DLElBQUksQ0FBQyxZQUFZLEdBQUcsT0FBTyxFQUFFLFlBQVksSUFBSSxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxJQUFJLENBQUMsQ0FBQyxNQUFNO0lBQzVFLENBQUM7SUFFTyxJQUFJO1FBQ1IsSUFBSSxPQUFPLE1BQU0sS0FBSyxXQUFXLElBQUksT0FBTyxZQUFZLEtBQUssV0FBVztZQUFFLE9BQU8sRUFBRSxDQUFDO1FBQ3BGLElBQUksQ0FBQztZQUNELE1BQU0sR0FBRyxHQUFHLFlBQVksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBQ2xELElBQUksQ0FBQyxHQUFHO2dCQUFFLE9BQU8sRUFBRSxDQUFDO1lBQ3BCLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDL0IsT0FBTyxLQUFLLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FB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Q3hFLENBQUM7QUFFRDs7R0FFRztBQUNILE1BQU0sVUFBVSxtQkFBbUIsQ0FBQyxXQUFtQjtJQUNuRCxPQUFPLG1CQUFtQixFQUFFLENBQUMsbUJBQW1CLENBQUMsV0FBVyxDQUFDLENBQUM7QUFDbEUsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogVW5pZmllZCBNZXNzYWdpbmcgU3lzdGVtXG4gKiBDb25zb2xpZGF0ZXMgYWxsIG1lc3NhZ2luZywgYnJvYWRjYXN0aW5nLCBxdWV1aW5nLCBhbmQgcGlwZWxpbmUgZnVuY3Rpb25hbGl0eVxuICogUGFydCBvZiBmZXN0L3VuaWZvcm0gLSBjb25maWd1cmFibGUgd2l0aG91dCBhcHAtc3BlY2lmaWMgZGVwZW5kZW5jaWVzXG4gKi9cblxuaW1wb3J0IHtcbiAgICBPcHRpbWl6ZWRXb3JrZXJDaGFubmVsLFxufSBmcm9tICcuLi9uZXh0L3N0b3JhZ2UvUXVldWVkJztcbmltcG9ydCB7IGRldGVjdEV4ZWN1dGlvbkNvbnRleHQsIHN1cHBvcnRzRGVkaWNhdGVkV29ya2VycyB9IGZyb20gJy4uL25leHQvdXRpbHMvRW52JztcbmltcG9ydCB7IGNyZWF0ZVF1ZXVlZE9wdGltaXplZFdvcmtlckNoYW5uZWwgfSBmcm9tICcuLi9uZXh0L3V0aWxzL1V0aWxzJztcblxuaW1wb3J0IHtcbiAgICBNZXNzYWdlUXVldWUsXG4gICAgZ2V0TWVzc2FnZVF1ZXVlLFxuICAgIHR5cGUgUXVldWVkTWVzc2FnZSxcbiAgICB0eXBlIE1lc3NhZ2VQcmlvcml0eVxufSBmcm9tICcuL01lc3NhZ2VRdWV1ZSc7XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFRZUEVTIEFORCBJTlRFUkZBQ0VTXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbmV4cG9ydCBpbnRlcmZhY2UgVW5pZmllZE1lc3NhZ2U8VCA9IHVua25vd24+IHtcbiAgICBpZDogc3RyaW5nO1xuICAgIHR5cGU6IHN0cmluZztcbiAgICBzb3VyY2U6IHN0cmluZztcbiAgICBkZXN0aW5hdGlvbj86IHN0cmluZztcbiAgICBjb250ZW50VHlwZT86IHN0cmluZztcbiAgICBkYXRhOiBUO1xuICAgIG1ldGFkYXRhPzogTWVzc2FnZU1ldGFkYXRhO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIE1lc3NhZ2VNZXRhZGF0YSB7XG4gICAgdGltZXN0YW1wPzogbnVtYmVyO1xuICAgIGNvcnJlbGF0aW9uSWQ/OiBzdHJpbmc7XG4gICAgcHJpb3JpdHk/OiBNZXNzYWdlUHJpb3JpdHk7XG4gICAgZXhwaXJlc0F0PzogbnVtYmVyO1xuICAgIHJldHJ5Q291bnQ/OiBudW1iZXI7XG4gICAgbWF4UmV0cmllcz86IG51bWJlcjtcbiAgICBba2V5OiBzdHJpbmddOiB1bmtub3duO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIE1lc3NhZ2VIYW5kbGVyPFQgPSB1bmtub3duPiB7XG4gICAgY2FuSGFuZGxlOiAobWVzc2FnZTogVW5pZmllZE1lc3NhZ2U8VD4pID0+IGJvb2xlYW47XG4gICAgaGFuZGxlOiAobWVzc2FnZTogVW5pZmllZE1lc3NhZ2U8VD4pID0+IFByb21pc2U8dm9pZD4gfCB2b2lkO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFdvcmtlckNoYW5uZWxDb25maWcge1xuICAgIG5hbWU6IHN0cmluZztcbiAgICBzY3JpcHQ6IHN0cmluZyB8ICgoKSA9PiBXb3JrZXIpIHwgV29ya2VyO1xuICAgIG9wdGlvbnM/OiBXb3JrZXJPcHRpb25zO1xuICAgIHByb3RvY29sT3B0aW9ucz86IHtcbiAgICAgICAgdGltZW91dD86IG51bWJlcjtcbiAgICAgICAgcmV0cmllcz86IG51bWJlcjtcbiAgICAgICAgYmF0Y2hpbmc/OiBib29sZWFuO1xuICAgICAgICBjb21wcmVzc2lvbj86IGJvb2xlYW47XG4gICAgfTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBQaXBlbGluZUNvbmZpZyB7XG4gICAgbmFtZTogc3RyaW5nO1xuICAgIHN0YWdlczogUGlwZWxpbmVTdGFnZVtdO1xuICAgIGVycm9ySGFuZGxlcj86IChlcnJvcjogdW5rbm93biwgc3RhZ2U6IFBpcGVsaW5lU3RhZ2UsIG1lc3NhZ2U6IFVuaWZpZWRNZXNzYWdlKSA9PiB2b2lkO1xuICAgIHRpbWVvdXQ/OiBudW1iZXI7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUGlwZWxpbmVTdGFnZSB7XG4gICAgbmFtZTogc3RyaW5nO1xuICAgIGhhbmRsZXI6IChtZXNzYWdlOiBVbmlmaWVkTWVzc2FnZSkgPT4gUHJvbWlzZTxVbmlmaWVkTWVzc2FnZT4gfCBVbmlmaWVkTWVzc2FnZTtcbiAgICB0aW1lb3V0PzogbnVtYmVyO1xuICAgIHJldHJpZXM/OiBudW1iZXI7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ2hhbm5lbE1hcHBpbmcge1xuICAgIGRlc3RpbmF0aW9uOiBzdHJpbmc7XG4gICAgY2hhbm5lbDogc3RyaW5nO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFVuaWZpZWRNZXNzYWdpbmdDb25maWcge1xuICAgIC8qKiBDdXN0b20gY2hhbm5lbCBtYXBwaW5ncyAoZGVzdGluYXRpb24gLT4gY2hhbm5lbCBuYW1lKSAqL1xuICAgIGNoYW5uZWxNYXBwaW5ncz86IFJlY29yZDxzdHJpbmcsIHN0cmluZz47XG4gICAgLyoqIE1lc3NhZ2UgcXVldWUgb3B0aW9ucyAqL1xuICAgIHF1ZXVlT3B0aW9ucz86IHtcbiAgICAgICAgZGJOYW1lPzogc3RyaW5nO1xuICAgICAgICBzdG9yZU5hbWU/OiBzdHJpbmc7XG4gICAgICAgIG1heFJldHJpZXM/OiBudW1iZXI7XG4gICAgICAgIGRlZmF1bHRFeHBpcmF0aW9uTXM/OiBudW1iZXI7XG4gICAgfTtcbiAgICAvKiogUGVuZGluZyBtZXNzYWdlIHN0b3JlIG9wdGlvbnMgKi9cbiAgICBwZW5kaW5nU3RvcmVPcHRpb25zPzoge1xuICAgICAgICBzdG9yYWdlS2V5Pzogc3RyaW5nO1xuICAgICAgICBtYXhNZXNzYWdlcz86IG51bWJlcjtcbiAgICAgICAgZGVmYXVsdFRUTE1zPzogbnVtYmVyO1xuICAgIH07XG59XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFBFTkRJTkcgTUVTU0FHRSBTVE9SRSAoU1lOQyBDQVRDSC1VUClcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuaW50ZXJmYWNlIFBlbmRpbmdTdG9yZUVudHJ5IHtcbiAgICBkZXN0aW5hdGlvbjogc3RyaW5nO1xuICAgIG1lc3NhZ2U6IFVuaWZpZWRNZXNzYWdlO1xuICAgIHN0b3JlZEF0OiBudW1iZXI7XG59XG5cbmV4cG9ydCBjbGFzcyBQZW5kaW5nTWVzc2FnZVN0b3JlIHtcbiAgICBwcml2YXRlIHJlYWRvbmx5IHN0b3JhZ2VLZXk6IHN0cmluZztcbiAgICBwcml2YXRlIHJlYWRvbmx5IG1heE1lc3NhZ2VzOiBudW1iZXI7XG4gICAgcHJpdmF0ZSByZWFkb25seSBkZWZhdWx0VFRMTXM6IG51bWJlcjtcblxuICAgIGNvbnN0cnVjdG9yKG9wdGlvbnM/OiB7IHN0b3JhZ2VLZXk/OiBzdHJpbmc7IG1heE1lc3NhZ2VzPzogbnVtYmVyOyBkZWZhdWx0VFRMTXM/OiBudW1iZXIgfSkge1xuICAgICAgICB0aGlzLnN0b3JhZ2VLZXkgPSBvcHRpb25zPy5zdG9yYWdlS2V5ID8/ICd1bmlmb3JtLW1lc3NhZ2luZy1wZW5kaW5nJztcbiAgICAgICAgdGhpcy5tYXhNZXNzYWdlcyA9IG9wdGlvbnM/Lm1heE1lc3NhZ2VzID8/IDIwMDtcbiAgICAgICAgdGhpcy5kZWZhdWx0VFRMTXMgPSBvcHRpb25zPy5kZWZhdWx0VFRMTXMgPz8gMjQgKiA2MCAqIDYwICogMTAwMDsgLy8gMjRoXG4gICAgfVxuXG4gICAgcHJpdmF0ZSByZWFkKCk6IFBlbmRpbmdTdG9yZUVudHJ5W10ge1xuICAgICAgICBpZiAodHlwZW9mIHdpbmRvdyA9PT0gJ3VuZGVmaW5lZCcgfHwgdHlwZW9mIGxvY2FsU3RvcmFnZSA9PT0gJ3VuZGVmaW5lZCcpIHJldHVybiBbXTtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHJhdyA9IGxvY2FsU3RvcmFnZS5nZXRJdGVtKHRoaXMuc3RvcmFnZUtleSk7XG4gICAgICAgICAgICBpZiAoIXJhdykgcmV0dXJuIFtdO1xuICAgICAgICAgICAgY29uc3QgcGFyc2VkID0gSlNPTi5wYXJzZShyYXcpO1xuICAgICAgICAgICAgcmV0dXJuIEFycmF5LmlzQXJyYXkocGFyc2VkKSA/IHBhcnNlZCA6IFtdO1xuICAgICAgICB9IGNhdGNoIHtcbiAgICAgICAgICAgIHJldHVybiBbXTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgd3JpdGUoZW50cmllczogUGVuZGluZ1N0b3JlRW50cnlbXSk6IHZvaWQge1xuICAgICAgICBpZiAodHlwZW9mIHdpbmRvdyA9PT0gJ3VuZGVmaW5lZCcgfHwgdHlwZW9mIGxvY2FsU3RvcmFnZSA9PT0gJ3VuZGVmaW5lZCcpIHJldHVybjtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKHRoaXMuc3RvcmFnZUtleSwgSlNPTi5zdHJpbmdpZnkoZW50cmllcykpO1xuICAgICAgICB9IGNhdGNoIHtcbiAgICAgICAgICAgIC8vIFN0b3JhZ2UgbWlnaHQgYmUgZnVsbCBvciB1bmF2YWlsYWJsZVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgZW5xdWV1ZShkZXN0aW5hdGlvbjogc3RyaW5nLCBtZXNzYWdlOiBVbmlmaWVkTWVzc2FnZSk6IHZvaWQge1xuICAgICAgICBpZiAoIWRlc3RpbmF0aW9uKSByZXR1cm47XG4gICAgICAgIGNvbnN0IG5vdyA9IERhdGUubm93KCk7XG4gICAgICAgIGNvbnN0IHR0bCA9IE51bWJlcihtZXNzYWdlPy5tZXRhZGF0YT8uZXhwaXJlc0F0KVxuICAgICAgICAgICAgPyBNYXRoLm1heCgwLCBOdW1iZXIobWVzc2FnZS5tZXRhZGF0YSEuZXhwaXJlc0F0KSAtIG5vdylcbiAgICAgICAgICAgIDogdGhpcy5kZWZhdWx0VFRMTXM7XG5cbiAgICAgICAgLy8gU2tpcCBpbW1lZGlhdGVseS1leHBpcmVkXG4gICAgICAgIGlmICh0dGwgPD0gMCkgcmV0dXJuO1xuXG4gICAgICAgIGNvbnN0IGVudHJpZXMgPSB0aGlzLnJlYWQoKVxuICAgICAgICAgICAgLmZpbHRlcihlID0+IGUgJiYgdHlwZW9mIGUgPT09ICdvYmplY3QnKVxuICAgICAgICAgICAgLmZpbHRlcihlID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBleHBpcmVzQXQgPSBOdW1iZXIoZT8ubWVzc2FnZT8ubWV0YWRhdGE/LmV4cGlyZXNBdCkgfHxcbiAgICAgICAgICAgICAgICAgICAgKE51bWJlcihlPy5zdG9yZWRBdCkgKyB0aGlzLmRlZmF1bHRUVExNcyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGV4cGlyZXNBdCA+IG5vdztcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgIGVudHJpZXMucHVzaCh7IGRlc3RpbmF0aW9uLCBtZXNzYWdlLCBzdG9yZWRBdDogbm93IH0pO1xuICAgICAgICBpZiAoZW50cmllcy5sZW5ndGggPiB0aGlzLm1heE1lc3NhZ2VzKSB7XG4gICAgICAgICAgICBlbnRyaWVzLnNwbGljZSgwLCBlbnRyaWVzLmxlbmd0aCAtIHRoaXMubWF4TWVzc2FnZXMpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMud3JpdGUoZW50cmllcyk7XG4gICAgfVxuXG4gICAgZHJhaW4oZGVzdGluYXRpb246IHN0cmluZyk6IFVuaWZpZWRNZXNzYWdlW10ge1xuICAgICAgICBpZiAoIWRlc3RpbmF0aW9uKSByZXR1cm4gW107XG4gICAgICAgIGNvbnN0IG5vdyA9IERhdGUubm93KCk7XG4gICAgICAgIGNvbnN0IGVudHJpZXMgPSB0aGlzLnJlYWQoKTtcblxuICAgICAgICBjb25zdCBrZWVwOiBQZW5kaW5nU3RvcmVFbnRyeVtdID0gW107XG4gICAgICAgIGNvbnN0IG91dDogVW5pZmllZE1lc3NhZ2VbXSA9IFtdO1xuXG4gICAgICAgIGZvciAoY29uc3QgZSBvZiBlbnRyaWVzKSB7XG4gICAgICAgICAgICBjb25zdCBleHBpcmVzQXQgPSBOdW1iZXIoZT8ubWVzc2FnZT8ubWV0YWRhdGE/LmV4cGlyZXNBdCkgfHxcbiAgICAgICAgICAgICAgICAoTnVtYmVyKGU/LnN0b3JlZEF0KSArIHRoaXMuZGVmYXVsdFRUTE1zKTtcbiAgICAgICAgICAgIGlmIChleHBpcmVzQXQgPD0gbm93KSBjb250aW51ZTtcbiAgICAgICAgICAgIGlmIChlPy5kZXN0aW5hdGlvbiA9PT0gZGVzdGluYXRpb24gJiYgZT8ubWVzc2FnZSkge1xuICAgICAgICAgICAgICAgIG91dC5wdXNoKGUubWVzc2FnZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGtlZXAucHVzaChlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMud3JpdGUoa2VlcCk7XG4gICAgICAgIHJldHVybiBvdXQ7XG4gICAgfVxuXG4gICAgaGFzKGRlc3RpbmF0aW9uOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICAgICAgaWYgKCFkZXN0aW5hdGlvbikgcmV0dXJuIGZhbHNlO1xuICAgICAgICBjb25zdCBub3cgPSBEYXRlLm5vdygpO1xuICAgICAgICByZXR1cm4gdGhpcy5yZWFkKCkuc29tZSgoZSkgPT4ge1xuICAgICAgICAgICAgaWYgKCFlIHx8IHR5cGVvZiBlICE9PSAnb2JqZWN0JykgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgY29uc3QgZXhwaXJlc0F0ID0gTnVtYmVyKGU/Lm1lc3NhZ2U/Lm1ldGFkYXRhPy5leHBpcmVzQXQpIHx8XG4gICAgICAgICAgICAgICAgKE51bWJlcihlPy5zdG9yZWRBdCkgKyB0aGlzLmRlZmF1bHRUVExNcyk7XG4gICAgICAgICAgICByZXR1cm4gZXhwaXJlc0F0ID4gbm93ICYmIGU/LmRlc3RpbmF0aW9uID09PSBkZXN0aW5hdGlvbjtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgY2xlYXIoKTogdm9pZCB7XG4gICAgICAgIHRoaXMud3JpdGUoW10pO1xuICAgIH1cbn1cblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gVU5JRklFRCBNRVNTQUdJTkcgTUFOQUdFUlxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5leHBvcnQgY2xhc3MgVW5pZmllZE1lc3NhZ2luZ01hbmFnZXIge1xuICAgIHByaXZhdGUgaGFuZGxlcnMgPSBuZXcgTWFwPHN0cmluZywgTWVzc2FnZUhhbmRsZXJbXT4oKTtcbiAgICBwcml2YXRlIGNoYW5uZWxzID0gbmV3IE1hcDxzdHJpbmcsIEJyb2FkY2FzdENoYW5uZWwgfCBPcHRpbWl6ZWRXb3JrZXJDaGFubmVsPigpO1xuICAgIHByaXZhdGUgd29ya2VyQ2hhbm5lbHMgPSBuZXcgTWFwPHN0cmluZywgT3B0aW1pemVkV29ya2VyQ2hhbm5lbD4oKTtcbiAgICBwcml2YXRlIHZpZXdDaGFubmVscyA9IG5ldyBNYXA8c3RyaW5nLCBTZXQ8c3RyaW5nPj4oKTtcbiAgICBwcml2YXRlIHBpcGVsaW5lcyA9IG5ldyBNYXA8c3RyaW5nLCBQaXBlbGluZUNvbmZpZz4oKTtcbiAgICBwcml2YXRlIG1lc3NhZ2VRdWV1ZTogTWVzc2FnZVF1ZXVlO1xuICAgIHByaXZhdGUgcGVuZGluZ1N0b3JlOiBQZW5kaW5nTWVzc2FnZVN0b3JlO1xuICAgIHByaXZhdGUgaW5pdGlhbGl6ZWRWaWV3cyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICAgIHByaXZhdGUgdmlld1JlYWR5UHJvbWlzZXMgPSBuZXcgTWFwPHN0cmluZywgeyByZXNvbHZlOiAoKSA9PiB2b2lkOyByZWplY3Q6IChlOiB1bmtub3duKSA9PiB2b2lkOyBwcm9taXNlOiBQcm9taXNlPHZvaWQ+IH0+KCk7XG4gICAgcHJpdmF0ZSBleGVjdXRpb25Db250ZXh0OiBSZXR1cm5UeXBlPHR5cGVvZiBkZXRlY3RFeGVjdXRpb25Db250ZXh0PjtcbiAgICBwcml2YXRlIGNoYW5uZWxNYXBwaW5nczogUmVjb3JkPHN0cmluZywgc3RyaW5nPjtcbiAgICBwcml2YXRlIGNvbXBvbmVudFJlZ2lzdHJ5ID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZz4oKTtcblxuICAgIGNvbnN0cnVjdG9yKGNvbmZpZzogVW5pZmllZE1lc3NhZ2luZ0NvbmZpZyA9IHt9KSB7XG4gICAgICAgIHRoaXMuZXhlY3V0aW9uQ29udGV4dCA9IGRldGVjdEV4ZWN1dGlvbkNvbnRleHQoKTtcbiAgICAgICAgdGhpcy5jaGFubmVsTWFwcGluZ3MgPSBjb25maWcuY2hhbm5lbE1hcHBpbmdzID8/IHt9O1xuICAgICAgICB0aGlzLm1lc3NhZ2VRdWV1ZSA9IGdldE1lc3NhZ2VRdWV1ZShjb25maWcucXVldWVPcHRpb25zKTtcbiAgICAgICAgdGhpcy5wZW5kaW5nU3RvcmUgPSBuZXcgUGVuZGluZ01lc3NhZ2VTdG9yZShjb25maWcucGVuZGluZ1N0b3JlT3B0aW9ucyk7XG4gICAgICAgIHRoaXMuc2V0dXBHbG9iYWxMaXN0ZW5lcnMoKTtcbiAgICB9XG5cbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAvLyBNRVNTQUdFIEhBTkRMSU5HXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbiAgICAvKipcbiAgICAgKiBSZWdpc3RlciBhIG1lc3NhZ2UgaGFuZGxlciBmb3IgYSBzcGVjaWZpYyBkZXN0aW5hdGlvblxuICAgICAqL1xuICAgIHJlZ2lzdGVySGFuZGxlcihkZXN0aW5hdGlvbjogc3RyaW5nLCBoYW5kbGVyOiBNZXNzYWdlSGFuZGxlcik6IHZvaWQge1xuICAgICAgICBpZiAoIXRoaXMuaGFuZGxlcnMuaGFzKGRlc3RpbmF0aW9uKSkge1xuICAgICAgICAgICAgdGhpcy5oYW5kbGVycy5zZXQoZGVzdGluYXRpb24sIFtdKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmhhbmRsZXJzLmdldChkZXN0aW5hdGlvbikhLnB1c2goaGFuZGxlcik7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVW5yZWdpc3RlciBhIG1lc3NhZ2UgaGFuZGxlclxuICAgICAqL1xuICAgIHVucmVnaXN0ZXJIYW5kbGVyKGRlc3RpbmF0aW9uOiBzdHJpbmcsIGhhbmRsZXI6IE1lc3NhZ2VIYW5kbGVyKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IGhhbmRsZXJzID0gdGhpcy5oYW5kbGVycy5nZXQoZGVzdGluYXRpb24pO1xuICAgICAgICBpZiAoaGFuZGxlcnMpIHtcbiAgICAgICAgICAgIGNvbnN0IGluZGV4ID0gaGFuZGxlcnMuaW5kZXhPZihoYW5kbGVyKTtcbiAgICAgICAgICAgIGlmIChpbmRleCA+IC0xKSB7XG4gICAgICAgICAgICAgICAgaGFuZGxlcnMuc3BsaWNlKGluZGV4LCAxKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFNlbmQgYSBtZXNzYWdlIHRvIGEgZGVzdGluYXRpb25cbiAgICAgKi9cbiAgICBhc3luYyBzZW5kTWVzc2FnZShtZXNzYWdlOiBQYXJ0aWFsPFVuaWZpZWRNZXNzYWdlPiAmIHsgdHlwZTogc3RyaW5nOyBkYXRhOiB1bmtub3duIH0pOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICAgICAgLy8gRW5zdXJlIG1lc3NhZ2UgaGFzIHJlcXVpcmVkIGZpZWxkc1xuICAgICAgICBjb25zdCBmdWxsTWVzc2FnZTogVW5pZmllZE1lc3NhZ2UgPSB7XG4gICAgICAgICAgICBpZDogbWVzc2FnZS5pZCA/PyBjcnlwdG8ucmFuZG9tVVVJRCgpLFxuICAgICAgICAgICAgdHlwZTogbWVzc2FnZS50eXBlLFxuICAgICAgICAgICAgc291cmNlOiBtZXNzYWdlLnNvdXJjZSA/PyAndW5pZmllZC1tZXNzYWdpbmcnLFxuICAgICAgICAgICAgZGVzdGluYXRpb246IG1lc3NhZ2UuZGVzdGluYXRpb24sXG4gICAgICAgICAgICBjb250ZW50VHlwZTogbWVzc2FnZS5jb250ZW50VHlwZSxcbiAgICAgICAgICAgIGRhdGE6IG1lc3NhZ2UuZGF0YSxcbiAgICAgICAgICAgIG1ldGFkYXRhOiB7IHRpbWVzdGFtcDogRGF0ZS5ub3coKSwgLi4ubWVzc2FnZS5tZXRhZGF0YSB9XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gVHJ5IHRvIGRlbGl2ZXIgaW1tZWRpYXRlbHlcbiAgICAgICAgaWYgKGF3YWl0IHRoaXMudHJ5RGVsaXZlck1lc3NhZ2UoZnVsbE1lc3NhZ2UpKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFF1ZXVlIGZvciBsYXRlciBkZWxpdmVyeSBpZiBkZXN0aW5hdGlvbiBub3QgYXZhaWxhYmxlXG4gICAgICAgIGlmIChmdWxsTWVzc2FnZS5kZXN0aW5hdGlvbikge1xuICAgICAgICAgICAgLy8gU3RvcmUgaW4gc3luYyBwZW5kaW5nIHN0b3JlIGZvciB2aWV3L2NvbXBvbmVudCBjYXRjaC11cFxuICAgICAgICAgICAgdGhpcy5wZW5kaW5nU3RvcmUuZW5xdWV1ZShmdWxsTWVzc2FnZS5kZXN0aW5hdGlvbiwgZnVsbE1lc3NhZ2UpO1xuXG4gICAgICAgICAgICBhd2FpdCB0aGlzLm1lc3NhZ2VRdWV1ZS5xdWV1ZU1lc3NhZ2UoZnVsbE1lc3NhZ2UudHlwZSwgZnVsbE1lc3NhZ2UsIHtcbiAgICAgICAgICAgICAgICBwcmlvcml0eTogZnVsbE1lc3NhZ2UubWV0YWRhdGE/LnByaW9yaXR5ID8/ICdub3JtYWwnLFxuICAgICAgICAgICAgICAgIG1heFJldHJpZXM6IGZ1bGxNZXNzYWdlLm1ldGFkYXRhPy5tYXhSZXRyaWVzID8/IDMsXG4gICAgICAgICAgICAgICAgZGVzdGluYXRpb246IGZ1bGxNZXNzYWdlLmRlc3RpbmF0aW9uXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBQcm9jZXNzIGEgbWVzc2FnZSB0aHJvdWdoIHJlZ2lzdGVyZWQgaGFuZGxlcnNcbiAgICAgKi9cbiAgICBhc3luYyBwcm9jZXNzTWVzc2FnZShtZXNzYWdlOiBVbmlmaWVkTWVzc2FnZSk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBjb25zdCBkZXN0aW5hdGlvbiA9IG1lc3NhZ2UuZGVzdGluYXRpb24gPz8gJ2dlbmVyYWwnO1xuICAgICAgICBjb25zdCBoYW5kbGVycyA9IHRoaXMuaGFuZGxlcnMuZ2V0KGRlc3RpbmF0aW9uKSA/PyBbXTtcblxuICAgICAgICBmb3IgKGNvbnN0IGhhbmRsZXIgb2YgaGFuZGxlcnMpIHtcbiAgICAgICAgICAgIGlmIChoYW5kbGVyLmNhbkhhbmRsZShtZXNzYWdlKSkge1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IGhhbmRsZXIuaGFuZGxlKG1lc3NhZ2UpO1xuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoYFtVbmlmaWVkTWVzc2FnaW5nXSBIYW5kbGVyIGVycm9yIGZvciAke2Rlc3RpbmF0aW9ufTpgLCBlcnJvcik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVHJ5IHRvIGRlbGl2ZXIgbWVzc2FnZSBpbW1lZGlhdGVseVxuICAgICAqL1xuICAgIHByaXZhdGUgYXN5bmMgdHJ5RGVsaXZlck1lc3NhZ2UobWVzc2FnZTogVW5pZmllZE1lc3NhZ2UpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICAgICAgLy8gQ2hlY2sgaWYgZGVzdGluYXRpb24gaGFzIGhhbmRsZXJzXG4gICAgICAgIGlmIChtZXNzYWdlLmRlc3RpbmF0aW9uICYmIHRoaXMuaGFuZGxlcnMuaGFzKG1lc3NhZ2UuZGVzdGluYXRpb24pKSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnByb2Nlc3NNZXNzYWdlKG1lc3NhZ2UpO1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDaGVjayBpZiB3ZSBoYXZlIGEgYnJvYWRjYXN0IGNoYW5uZWwgZm9yIHRoZSBkZXN0aW5hdGlvblxuICAgICAgICBjb25zdCBjaGFubmVsTmFtZSA9IHRoaXMuZ2V0Q2hhbm5lbEZvckRlc3RpbmF0aW9uKG1lc3NhZ2UuZGVzdGluYXRpb24pO1xuICAgICAgICBpZiAoY2hhbm5lbE5hbWUgJiYgdGhpcy5jaGFubmVscy5oYXMoY2hhbm5lbE5hbWUpKSB7XG4gICAgICAgICAgICBjb25zdCBjaGFubmVsID0gdGhpcy5jaGFubmVscy5nZXQoY2hhbm5lbE5hbWUpO1xuICAgICAgICAgICAgaWYgKGNoYW5uZWwgaW5zdGFuY2VvZiBCcm9hZGNhc3RDaGFubmVsKSB7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgY2hhbm5lbC5wb3N0TWVzc2FnZShtZXNzYWdlKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS53YXJuKGBbVW5pZmllZE1lc3NhZ2luZ10gRmFpbGVkIHRvIHBvc3QgdG8gYnJvYWRjYXN0IGNoYW5uZWwgJHtjaGFubmVsTmFtZX06YCwgZXJyb3IpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAoY2hhbm5lbCAmJiAncmVxdWVzdCcgaW4gY2hhbm5lbCkge1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IChjaGFubmVsIGFzIE9wdGltaXplZFdvcmtlckNoYW5uZWwpLnJlcXVlc3QobWVzc2FnZS50eXBlLCBbbWVzc2FnZV0pO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oYFtVbmlmaWVkTWVzc2FnaW5nXSBGYWlsZWQgdG8gcG9zdCB0byB3b3JrZXIgY2hhbm5lbCAke2NoYW5uZWxOYW1lfTpgLCBlcnJvcik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIC8vIFdPUktFUiBDSEFOTkVMIE1BTkFHRU1FTlRcbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuICAgIC8qKlxuICAgICAqIFJlZ2lzdGVyIHdvcmtlciBjaGFubmVscyBmb3IgYSBzcGVjaWZpYyB2aWV3XG4gICAgICovXG4gICAgcmVnaXN0ZXJWaWV3Q2hhbm5lbHModmlld0hhc2g6IHN0cmluZywgY29uZmlnczogV29ya2VyQ2hhbm5lbENvbmZpZ1tdKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IGNoYW5uZWxOYW1lcyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuXG4gICAgICAgIGZvciAoY29uc3QgY29uZmlnIG9mIGNvbmZpZ3MpIHtcbiAgICAgICAgICAgIGlmICghdGhpcy5pc1dvcmtlclN1cHBvcnRlZChjb25maWcpKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coYFtVbmlmaWVkTWVzc2FnaW5nXSBTa2lwcGluZyB3b3JrZXIgJyR7Y29uZmlnLm5hbWV9JyBpbiAke3RoaXMuZXhlY3V0aW9uQ29udGV4dH0gY29udGV4dGApO1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCBjaGFubmVsID0gY3JlYXRlUXVldWVkT3B0aW1pemVkV29ya2VyQ2hhbm5lbCh7XG4gICAgICAgICAgICAgICAgbmFtZTogY29uZmlnLm5hbWUsXG4gICAgICAgICAgICAgICAgc2NyaXB0OiBjb25maWcuc2NyaXB0LFxuICAgICAgICAgICAgICAgIG9wdGlvbnM6IGNvbmZpZy5vcHRpb25zLFxuICAgICAgICAgICAgICAgIGNvbnRleHQ6IHRoaXMuZXhlY3V0aW9uQ29udGV4dFxuICAgICAgICAgICAgfSwgY29uZmlnLnByb3RvY29sT3B0aW9ucywgKCkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBbVW5pZmllZE1lc3NhZ2luZ10gQ2hhbm5lbCAnJHtjb25maWcubmFtZX0nIHJlYWR5IGZvciB2aWV3ICcke3ZpZXdIYXNofSdgKTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBjb25zdCBjaGFubmVsS2V5ID0gYCR7dmlld0hhc2h9OiR7Y29uZmlnLm5hbWV9YDtcbiAgICAgICAgICAgIHRoaXMud29ya2VyQ2hhbm5lbHMuc2V0KGNoYW5uZWxLZXksIGNoYW5uZWwpO1xuICAgICAgICAgICAgdGhpcy5jaGFubmVscy5zZXQoY2hhbm5lbEtleSwgY2hhbm5lbCk7XG4gICAgICAgICAgICBjaGFubmVsTmFtZXMuYWRkKGNvbmZpZy5uYW1lKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMudmlld0NoYW5uZWxzLnNldCh2aWV3SGFzaCwgY2hhbm5lbE5hbWVzKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGNoYW5uZWxzIHdoZW4gYSB2aWV3IGJlY29tZXMgYWN0aXZlXG4gICAgICovXG4gICAgYXN5bmMgaW5pdGlhbGl6ZVZpZXdDaGFubmVscyh2aWV3SGFzaDogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGlmICh0aGlzLmluaXRpYWxpemVkVmlld3MuaGFzKHZpZXdIYXNoKSkgcmV0dXJuO1xuXG4gICAgICAgIGNvbnN0IGRlZmVycmVkID0gdGhpcy5jcmVhdGVEZWZlcnJlZDx2b2lkPigpO1xuICAgICAgICB0aGlzLnZpZXdSZWFkeVByb21pc2VzLnNldCh2aWV3SGFzaCwgZGVmZXJyZWQpO1xuXG4gICAgICAgIGNvbnNvbGUubG9nKGBbVW5pZmllZE1lc3NhZ2luZ10gSW5pdGlhbGl6aW5nIGNoYW5uZWxzIGZvciB2aWV3OiAke3ZpZXdIYXNofWApO1xuXG4gICAgICAgIGNvbnN0IGNoYW5uZWxOYW1lcyA9IHRoaXMudmlld0NoYW5uZWxzLmdldCh2aWV3SGFzaCk7XG4gICAgICAgIGlmICghY2hhbm5lbE5hbWVzKSB7XG4gICAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBpbml0UHJvbWlzZXM6IFByb21pc2U8dm9pZD5bXSA9IFtdO1xuICAgICAgICBmb3IgKGNvbnN0IGNoYW5uZWxOYW1lIG9mIGNoYW5uZWxOYW1lcykge1xuICAgICAgICAgICAgY29uc3QgY2hhbm5lbEtleSA9IGAke3ZpZXdIYXNofToke2NoYW5uZWxOYW1lfWA7XG4gICAgICAgICAgICBjb25zdCBjaGFubmVsID0gdGhpcy53b3JrZXJDaGFubmVscy5nZXQoY2hhbm5lbEtleSk7XG5cbiAgICAgICAgICAgIGlmIChjaGFubmVsKSB7XG4gICAgICAgICAgICAgICAgaW5pdFByb21pc2VzLnB1c2goXG4gICAgICAgICAgICAgICAgICAgIGNoYW5uZWwucmVxdWVzdCgncGluZycsIHt9KS5jYXRjaCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgW1VuaWZpZWRNZXNzYWdpbmddIENoYW5uZWwgJyR7Y2hhbm5lbE5hbWV9JyBxdWV1ZWQgZm9yIHZpZXcgJyR7dmlld0hhc2h9J2ApO1xuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBhd2FpdCBQcm9taXNlLmFsbFNldHRsZWQoaW5pdFByb21pc2VzKTtcbiAgICAgICAgdGhpcy5pbml0aWFsaXplZFZpZXdzLmFkZCh2aWV3SGFzaCk7XG4gICAgICAgIGRlZmVycmVkLnJlc29sdmUoKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgYSB3b3JrZXIgY2hhbm5lbCBmb3IgYSBzcGVjaWZpYyB2aWV3IGFuZCB3b3JrZXJcbiAgICAgKi9cbiAgICBnZXRXb3JrZXJDaGFubmVsKHZpZXdIYXNoOiBzdHJpbmcsIHdvcmtlck5hbWU6IHN0cmluZyk6IE9wdGltaXplZFdvcmtlckNoYW5uZWwgfCBudWxsIHtcbiAgICAgICAgcmV0dXJuIHRoaXMud29ya2VyQ2hhbm5lbHMuZ2V0KGAke3ZpZXdIYXNofToke3dvcmtlck5hbWV9YCkgPz8gbnVsbDtcbiAgICB9XG5cbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAvLyBCUk9BRENBU1QgQ0hBTk5FTCBNQU5BR0VNRU5UXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGUgb3IgZ2V0IGEgYnJvYWRjYXN0IGNoYW5uZWxcbiAgICAgKi9cbiAgICBnZXRCcm9hZGNhc3RDaGFubmVsKGNoYW5uZWxOYW1lOiBzdHJpbmcpOiBCcm9hZGNhc3RDaGFubmVsIHtcbiAgICAgICAgaWYgKCF0aGlzLmNoYW5uZWxzLmhhcyhjaGFubmVsTmFtZSkpIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgY29uc3QgY2hhbm5lbCA9IG5ldyBCcm9hZGNhc3RDaGFubmVsKGNoYW5uZWxOYW1lKTtcbiAgICAgICAgICAgICAgICBjaGFubmVsLmFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCAoZXZlbnQpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5oYW5kbGVCcm9hZGNhc3RNZXNzYWdlKGV2ZW50LmRhdGEsIGNoYW5uZWxOYW1lKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB0aGlzLmNoYW5uZWxzLnNldChjaGFubmVsTmFtZSwgY2hhbm5lbCk7XG4gICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybihgW1VuaWZpZWRNZXNzYWdpbmddIEJyb2FkY2FzdENoYW5uZWwgbm90IGF2YWlsYWJsZTogJHtjaGFubmVsTmFtZX1gLCBlcnJvcik7XG4gICAgICAgICAgICAgICAgLy8gUmV0dXJuIGEgbW9jayBjaGFubmVsIHRoYXQgZG9lcyBub3RoaW5nXG4gICAgICAgICAgICAgICAgY29uc3QgbW9ja0NoYW5uZWwgPSB7XG4gICAgICAgICAgICAgICAgICAgIHBvc3RNZXNzYWdlOiAoKSA9PiB7fSxcbiAgICAgICAgICAgICAgICAgICAgY2xvc2U6ICgpID0+IHt9LFxuICAgICAgICAgICAgICAgICAgICBhZGRFdmVudExpc3RlbmVyOiAoKSA9PiB7fSxcbiAgICAgICAgICAgICAgICAgICAgcmVtb3ZlRXZlbnRMaXN0ZW5lcjogKCkgPT4ge31cbiAgICAgICAgICAgICAgICB9IGFzIHVua25vd24gYXMgQnJvYWRjYXN0Q2hhbm5lbDtcbiAgICAgICAgICAgICAgICB0aGlzLmNoYW5uZWxzLnNldChjaGFubmVsTmFtZSwgbW9ja0NoYW5uZWwpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLmNoYW5uZWxzLmdldChjaGFubmVsTmFtZSkgYXMgQnJvYWRjYXN0Q2hhbm5lbDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBIYW5kbGUgaW5jb21pbmcgYnJvYWRjYXN0IG1lc3NhZ2VzXG4gICAgICovXG4gICAgcHJpdmF0ZSBhc3luYyBoYW5kbGVCcm9hZGNhc3RNZXNzYWdlKG1lc3NhZ2U6IHVua25vd24sIGNoYW5uZWxOYW1lOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IG1zZ09iaiA9IG1lc3NhZ2UgYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj47XG4gICAgICAgICAgICBjb25zdCB1bmlmaWVkTWVzc2FnZTogVW5pZmllZE1lc3NhZ2UgPSBtc2dPYmo/LmlkID8gKG1lc3NhZ2UgYXMgVW5pZmllZE1lc3NhZ2UpIDoge1xuICAgICAgICAgICAgICAgIGlkOiBjcnlwdG8ucmFuZG9tVVVJRCgpLFxuICAgICAgICAgICAgICAgIHR5cGU6IFN0cmluZyhtc2dPYmo/LnR5cGUgPz8gJ3Vua25vd24nKSxcbiAgICAgICAgICAgICAgICBzb3VyY2U6IGNoYW5uZWxOYW1lLFxuICAgICAgICAgICAgICAgIGRhdGE6IG1lc3NhZ2UsXG4gICAgICAgICAgICAgICAgbWV0YWRhdGE6IHsgdGltZXN0YW1wOiBEYXRlLm5vdygpIH1cbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIGF3YWl0IHRoaXMucHJvY2Vzc01lc3NhZ2UodW5pZmllZE1lc3NhZ2UpO1xuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcihgW1VuaWZpZWRNZXNzYWdpbmddIEVycm9yIGhhbmRsaW5nIGJyb2FkY2FzdCBtZXNzYWdlIG9uICR7Y2hhbm5lbE5hbWV9OmAsIGVycm9yKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIC8vIFBJUEVMSU5FIE1BTkFHRU1FTlRcbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuICAgIC8qKlxuICAgICAqIFJlZ2lzdGVyIGEgbWVzc2FnZSBwcm9jZXNzaW5nIHBpcGVsaW5lXG4gICAgICovXG4gICAgcmVnaXN0ZXJQaXBlbGluZShjb25maWc6IFBpcGVsaW5lQ29uZmlnKTogdm9pZCB7XG4gICAgICAgIHRoaXMucGlwZWxpbmVzLnNldChjb25maWcubmFtZSwgY29uZmlnKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBQcm9jZXNzIGEgbWVzc2FnZSB0aHJvdWdoIGEgcGlwZWxpbmVcbiAgICAgKi9cbiAgICBhc3luYyBwcm9jZXNzVGhyb3VnaFBpcGVsaW5lKHBpcGVsaW5lTmFtZTogc3RyaW5nLCBtZXNzYWdlOiBVbmlmaWVkTWVzc2FnZSk6IFByb21pc2U8VW5pZmllZE1lc3NhZ2U+IHtcbiAgICAgICAgY29uc3QgcGlwZWxpbmUgPSB0aGlzLnBpcGVsaW5lcy5nZXQocGlwZWxpbmVOYW1lKTtcbiAgICAgICAgaWYgKCFwaXBlbGluZSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBQaXBlbGluZSAnJHtwaXBlbGluZU5hbWV9JyBub3QgZm91bmRgKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGxldCBjdXJyZW50TWVzc2FnZSA9IHsgLi4ubWVzc2FnZSB9O1xuICAgICAgICBjb25zdCB0aW1lb3V0ID0gcGlwZWxpbmUudGltZW91dCA/PyAzMDAwMDtcblxuICAgICAgICBmb3IgKGNvbnN0IHN0YWdlIG9mIHBpcGVsaW5lLnN0YWdlcykge1xuICAgICAgICAgICAgY29uc3Qgc3RhZ2VUaW1lb3V0ID0gc3RhZ2UudGltZW91dCA/PyB0aW1lb3V0O1xuICAgICAgICAgICAgY29uc3QgcmV0cmllcyA9IHN0YWdlLnJldHJpZXMgPz8gMDtcblxuICAgICAgICAgICAgZm9yIChsZXQgYXR0ZW1wdCA9IDA7IGF0dGVtcHQgPD0gcmV0cmllczsgYXR0ZW1wdCsrKSB7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgUHJvbWlzZS5yYWNlKFtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YWdlLmhhbmRsZXIoY3VycmVudE1lc3NhZ2UpLFxuICAgICAgICAgICAgICAgICAgICAgICAgbmV3IFByb21pc2U8bmV2ZXI+KChfLCByZWplY3QpID0+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiByZWplY3QobmV3IEVycm9yKGBTdGFnZSAnJHtzdGFnZS5uYW1lfScgdGltZW91dGApKSwgc3RhZ2VUaW1lb3V0KVxuICAgICAgICAgICAgICAgICAgICAgICAgKVxuICAgICAgICAgICAgICAgICAgICBdKTtcblxuICAgICAgICAgICAgICAgICAgICBjdXJyZW50TWVzc2FnZSA9IHJlc3VsdDtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7IC8vIFN1Y2Nlc3MsIG1vdmUgdG8gbmV4dCBzdGFnZVxuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChhdHRlbXB0ID09PSByZXRyaWVzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocGlwZWxpbmUuZXJyb3JIYW5kbGVyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGlwZWxpbmUuZXJyb3JIYW5kbGVyKGVycm9yLCBzdGFnZSwgY3VycmVudE1lc3NhZ2UpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgZXJyb3I7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS53YXJuKGBbVW5pZmllZE1lc3NhZ2luZ10gUGlwZWxpbmUgJyR7cGlwZWxpbmVOYW1lfScgc3RhZ2UgJyR7c3RhZ2UubmFtZX0nIGF0dGVtcHQgJHthdHRlbXB0ICsgMX0gZmFpbGVkOmAsIGVycm9yKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gY3VycmVudE1lc3NhZ2U7XG4gICAgfVxuXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgLy8gUVVFVUUgTUFOQUdFTUVOVFxuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4gICAgLyoqXG4gICAgICogUHJvY2VzcyBxdWV1ZWQgbWVzc2FnZXMgZm9yIGEgZGVzdGluYXRpb25cbiAgICAgKi9cbiAgICBhc3luYyBwcm9jZXNzUXVldWVkTWVzc2FnZXMoZGVzdGluYXRpb24/OiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgY29uc3QgcXVldWVkTWVzc2FnZXMgPSBhd2FpdCB0aGlzLm1lc3NhZ2VRdWV1ZS5nZXRRdWV1ZWRNZXNzYWdlcyhkZXN0aW5hdGlvbik7XG5cbiAgICAgICAgZm9yIChjb25zdCBxdWV1ZWRNZXNzYWdlIG9mIHF1ZXVlZE1lc3NhZ2VzKSB7XG4gICAgICAgICAgICBjb25zdCBkYXRhQXNNZXNzYWdlID0gcXVldWVkTWVzc2FnZS5kYXRhIGFzIFJlY29yZDxzdHJpbmcsIHVua25vd24+O1xuICAgICAgICAgICAgY29uc3QgbWVzc2FnZTogVW5pZmllZE1lc3NhZ2UgPSAoXG4gICAgICAgICAgICAgICAgZGF0YUFzTWVzc2FnZSAmJlxuICAgICAgICAgICAgICAgIHR5cGVvZiBkYXRhQXNNZXNzYWdlID09PSAnb2JqZWN0JyAmJlxuICAgICAgICAgICAgICAgIHR5cGVvZiBkYXRhQXNNZXNzYWdlLnR5cGUgPT09ICdzdHJpbmcnICYmXG4gICAgICAgICAgICAgICAgdHlwZW9mIGRhdGFBc01lc3NhZ2UuaWQgPT09ICdzdHJpbmcnXG4gICAgICAgICAgICApXG4gICAgICAgICAgICAgICAgPyAoZGF0YUFzTWVzc2FnZSBhcyB1bmtub3duIGFzIFVuaWZpZWRNZXNzYWdlKVxuICAgICAgICAgICAgICAgIDoge1xuICAgICAgICAgICAgICAgICAgICBpZDogcXVldWVkTWVzc2FnZS5pZCxcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogcXVldWVkTWVzc2FnZS50eXBlLFxuICAgICAgICAgICAgICAgICAgICBzb3VyY2U6ICdxdWV1ZScsXG4gICAgICAgICAgICAgICAgICAgIGRlc3RpbmF0aW9uOiBxdWV1ZWRNZXNzYWdlLmRlc3RpbmF0aW9uLFxuICAgICAgICAgICAgICAgICAgICBkYXRhOiBxdWV1ZWRNZXNzYWdlLmRhdGEsXG4gICAgICAgICAgICAgICAgICAgIG1ldGFkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aW1lc3RhbXA6IHF1ZXVlZE1lc3NhZ2UudGltZXN0YW1wLFxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0cnlDb3VudDogcXVldWVkTWVzc2FnZS5yZXRyeUNvdW50LFxuICAgICAgICAgICAgICAgICAgICAgICAgbWF4UmV0cmllczogcXVldWVkTWVzc2FnZS5tYXhSZXRyaWVzLFxuICAgICAgICAgICAgICAgICAgICAgICAgLi4ucXVldWVkTWVzc2FnZS5tZXRhZGF0YVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgaWYgKGF3YWl0IHRoaXMudHJ5RGVsaXZlck1lc3NhZ2UobWVzc2FnZSkpIHtcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLm1lc3NhZ2VRdWV1ZS5yZW1vdmVNZXNzYWdlKHF1ZXVlZE1lc3NhZ2UuaWQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgLy8gQ09NUE9ORU5UIFJFR0lTVFJBVElPTlxuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4gICAgLyoqXG4gICAgICogUmVnaXN0ZXIgYSBjb21wb25lbnQgd2l0aCBhIGRlc3RpbmF0aW9uXG4gICAgICovXG4gICAgcmVnaXN0ZXJDb21wb25lbnQoY29tcG9uZW50SWQ6IHN0cmluZywgZGVzdGluYXRpb246IHN0cmluZyk6IHZvaWQge1xuICAgICAgICB0aGlzLmNvbXBvbmVudFJlZ2lzdHJ5LnNldChjb21wb25lbnRJZCwgZGVzdGluYXRpb24pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgYSBjb21wb25lbnQgYW5kIHJldHVybiBhbnkgcGVuZGluZyBtZXNzYWdlc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVDb21wb25lbnQoY29tcG9uZW50SWQ6IHN0cmluZyk6IFVuaWZpZWRNZXNzYWdlW10ge1xuICAgICAgICBjb25zdCBkZXN0aW5hdGlvbiA9IHRoaXMuY29tcG9uZW50UmVnaXN0cnkuZ2V0KGNvbXBvbmVudElkKTtcbiAgICAgICAgaWYgKCFkZXN0aW5hdGlvbikgcmV0dXJuIFtdO1xuICAgICAgICByZXR1cm4gdGhpcy5wZW5kaW5nU3RvcmUuZHJhaW4oZGVzdGluYXRpb24pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENoZWNrIGlmIHRoZXJlIGFyZSBwZW5kaW5nIG1lc3NhZ2VzIGZvciBhIGRlc3RpbmF0aW9uXG4gICAgICovXG4gICAgaGFzUGVuZGluZ01lc3NhZ2VzKGRlc3RpbmF0aW9uOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucGVuZGluZ1N0b3JlLmhhcyhkZXN0aW5hdGlvbik7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRXhwbGljaXRseSBlbnF1ZXVlIGEgcGVuZGluZyBtZXNzYWdlXG4gICAgICovXG4gICAgZW5xdWV1ZVBlbmRpbmdNZXNzYWdlKGRlc3RpbmF0aW9uOiBzdHJpbmcsIG1lc3NhZ2U6IFVuaWZpZWRNZXNzYWdlKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IGRlc3QgPSBTdHJpbmcoZGVzdGluYXRpb24gPz8gJycpLnRyaW0oKTtcbiAgICAgICAgaWYgKCFkZXN0IHx8ICFtZXNzYWdlKSByZXR1cm47XG4gICAgICAgIHRoaXMucGVuZGluZ1N0b3JlLmVucXVldWUoZGVzdCwgbWVzc2FnZSk7XG4gICAgfVxuXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgLy8gQ0hBTk5FTCBNQVBQSU5HXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbiAgICAvKipcbiAgICAgKiBTZXQgY2hhbm5lbCBtYXBwaW5nc1xuICAgICAqL1xuICAgIHNldENoYW5uZWxNYXBwaW5ncyhtYXBwaW5nczogUmVjb3JkPHN0cmluZywgc3RyaW5nPik6IHZvaWQge1xuICAgICAgICB0aGlzLmNoYW5uZWxNYXBwaW5ncyA9IHsgLi4udGhpcy5jaGFubmVsTWFwcGluZ3MsIC4uLm1hcHBpbmdzIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IGNoYW5uZWwgbmFtZSBmb3IgYSBkZXN0aW5hdGlvblxuICAgICAqL1xuICAgIHByaXZhdGUgZ2V0Q2hhbm5lbEZvckRlc3RpbmF0aW9uKGRlc3RpbmF0aW9uPzogc3RyaW5nKTogc3RyaW5nIHwgbnVsbCB7XG4gICAgICAgIGlmICghZGVzdGluYXRpb24pIHJldHVybiBudWxsO1xuICAgICAgICByZXR1cm4gdGhpcy5jaGFubmVsTWFwcGluZ3NbZGVzdGluYXRpb25dID8/IG51bGw7XG4gICAgfVxuXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgLy8gVVRJTElUWSBNRVRIT0RTXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbiAgICAvKipcbiAgICAgKiBDaGVjayBpZiBhIHdvcmtlciBjb25maWd1cmF0aW9uIGlzIHN1cHBvcnRlZFxuICAgICAqL1xuICAgIHByaXZhdGUgaXNXb3JrZXJTdXBwb3J0ZWQoX2NvbmZpZzogV29ya2VyQ2hhbm5lbENvbmZpZyk6IGJvb2xlYW4ge1xuICAgICAgICBpZiAodGhpcy5leGVjdXRpb25Db250ZXh0ID09PSAnc2VydmljZS13b3JrZXInKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0aGlzLmV4ZWN1dGlvbkNvbnRleHQgPT09ICdjaHJvbWUtZXh0ZW5zaW9uJykge1xuICAgICAgICAgICAgcmV0dXJuIHN1cHBvcnRzRGVkaWNhdGVkV29ya2VycygpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogU2V0IHVwIGdsb2JhbCBsaXN0ZW5lcnMgZm9yIGNyb3NzLWNvbXBvbmVudCBjb21tdW5pY2F0aW9uXG4gICAgICovXG4gICAgcHJpdmF0ZSBzZXR1cEdsb2JhbExpc3RlbmVycygpOiB2b2lkIHtcbiAgICAgICAgaWYgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICBnbG9iYWxUaGlzLmFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCAoZXZlbnQpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoZXZlbnQuZGF0YSAmJiB0eXBlb2YgZXZlbnQuZGF0YSA9PT0gJ29iamVjdCcgJiYgZXZlbnQuZGF0YS50eXBlKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaGFuZGxlQnJvYWRjYXN0TWVzc2FnZShldmVudC5kYXRhLCAnd2luZG93LW1lc3NhZ2UnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENyZWF0ZSBhIGRlZmVycmVkIHByb21pc2VcbiAgICAgKi9cbiAgICBwcml2YXRlIGNyZWF0ZURlZmVycmVkPFQ+KCk6IHsgcmVzb2x2ZTogKHZhbHVlOiBUKSA9PiB2b2lkOyByZWplY3Q6IChlOiB1bmtub3duKSA9PiB2b2lkOyBwcm9taXNlOiBQcm9taXNlPFQ+IH0ge1xuICAgICAgICBsZXQgcmVzb2x2ZSE6ICh2YWx1ZTogVCkgPT4gdm9pZDtcbiAgICAgICAgbGV0IHJlamVjdCE6IChlOiB1bmtub3duKSA9PiB2b2lkO1xuICAgICAgICBjb25zdCBwcm9taXNlID0gbmV3IFByb21pc2U8VD4oKHJlcywgcmVqKSA9PiB7XG4gICAgICAgICAgICByZXNvbHZlID0gcmVzO1xuICAgICAgICAgICAgcmVqZWN0ID0gcmVqO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHsgcmVzb2x2ZSwgcmVqZWN0LCBwcm9taXNlIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IGV4ZWN1dGlvbiBjb250ZXh0XG4gICAgICovXG4gICAgZ2V0RXhlY3V0aW9uQ29udGV4dCgpOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gdGhpcy5leGVjdXRpb25Db250ZXh0O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENsZWFuIHVwIHJlc291cmNlc1xuICAgICAqL1xuICAgIGRlc3Ryb3koKTogdm9pZCB7XG4gICAgICAgIGZvciAoY29uc3QgY2hhbm5lbCBvZiB0aGlzLmNoYW5uZWxzLnZhbHVlcygpKSB7XG4gICAgICAgICAgICBpZiAoY2hhbm5lbCBpbnN0YW5jZW9mIEJyb2FkY2FzdENoYW5uZWwpIHtcbiAgICAgICAgICAgICAgICBjaGFubmVsLmNsb3NlKCk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGNoYW5uZWwgJiYgJ2Nsb3NlJyBpbiBjaGFubmVsKSB7XG4gICAgICAgICAgICAgICAgKGNoYW5uZWwgYXMgT3B0aW1pemVkV29ya2VyQ2hhbm5lbCkuY2xvc2UoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuY2hhbm5lbHMuY2xlYXIoKTtcbiAgICAgICAgdGhpcy53b3JrZXJDaGFubmVscy5jbGVhcigpO1xuICAgICAgICB0aGlzLmhhbmRsZXJzLmNsZWFyKCk7XG4gICAgICAgIHRoaXMucGlwZWxpbmVzLmNsZWFyKCk7XG4gICAgfVxufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBTSU5HTEVUT04gRkFDVE9SWVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5sZXQgZGVmYXVsdEluc3RhbmNlOiBVbmlmaWVkTWVzc2FnaW5nTWFuYWdlciB8IG51bGwgPSBudWxsO1xuXG4vKipcbiAqIEdldCB0aGUgZGVmYXVsdCBVbmlmaWVkTWVzc2FnaW5nTWFuYWdlciBpbnN0YW5jZVxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0VW5pZmllZE1lc3NhZ2luZyhjb25maWc/OiBVbmlmaWVkTWVzc2FnaW5nQ29uZmlnKTogVW5pZmllZE1lc3NhZ2luZ01hbmFnZXIge1xuICAgIGlmICghZGVmYXVsdEluc3RhbmNlKSB7XG4gICAgICAgIGRlZmF1bHRJbnN0YW5jZSA9IG5ldyBVbmlmaWVkTWVzc2FnaW5nTWFuYWdlcihjb25maWcpO1xuICAgIH1cbiAgICByZXR1cm4gZGVmYXVsdEluc3RhbmNlO1xufVxuXG4vKipcbiAqIENyZWF0ZSBhIG5ldyBVbmlmaWVkTWVzc2FnaW5nTWFuYWdlciBpbnN0YW5jZSAobm90IGNhY2hlZClcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVVuaWZpZWRNZXNzYWdpbmcoY29uZmlnPzogVW5pZmllZE1lc3NhZ2luZ0NvbmZpZyk6IFVuaWZpZWRNZXNzYWdpbmdNYW5hZ2VyIHtcbiAgICByZXR1cm4gbmV3IFVuaWZpZWRNZXNzYWdpbmdNYW5hZ2VyKGNvbmZpZyk7XG59XG5cbi8qKlxuICogUmVzZXQgdGhlIGRlZmF1bHQgaW5zdGFuY2UgKHVzZWZ1bCBmb3IgdGVzdGluZylcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlc2V0VW5pZmllZE1lc3NhZ2luZygpOiB2b2lkIHtcbiAgICBpZiAoZGVmYXVsdEluc3RhbmNlKSB7XG4gICAgICAgIGRlZmF1bHRJbnN0YW5jZS5kZXN0cm95KCk7XG4gICAgICAgIGRlZmF1bHRJbnN0YW5jZSA9IG51bGw7XG4gICAgfVxufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBDT05WRU5JRU5DRSBGVU5DVElPTlNcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBTZW5kIGEgbWVzc2FnZSB1c2luZyB0aGUgZGVmYXVsdCBtYW5hZ2VyXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzZW5kTWVzc2FnZShtZXNzYWdlOiBQYXJ0aWFsPFVuaWZpZWRNZXNzYWdlPiAmIHsgdHlwZTogc3RyaW5nOyBkYXRhOiB1bmtub3duIH0pOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICByZXR1cm4gZ2V0VW5pZmllZE1lc3NhZ2luZygpLnNlbmRNZXNzYWdlKG1lc3NhZ2UpO1xufVxuXG4vKipcbiAqIFJlZ2lzdGVyIGEgaGFuZGxlciB1c2luZyB0aGUgZGVmYXVsdCBtYW5hZ2VyXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZWdpc3RlckhhbmRsZXIoZGVzdGluYXRpb246IHN0cmluZywgaGFuZGxlcjogTWVzc2FnZUhhbmRsZXIpOiB2b2lkIHtcbiAgICBnZXRVbmlmaWVkTWVzc2FnaW5nKCkucmVnaXN0ZXJIYW5kbGVyKGRlc3RpbmF0aW9uLCBoYW5kbGVyKTtcbn1cblxuLyoqXG4gKiBHZXQgYSB3b3JrZXIgY2hhbm5lbCB1c2luZyB0aGUgZGVmYXVsdCBtYW5hZ2VyXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRXb3JrZXJDaGFubmVsKHZpZXdIYXNoOiBzdHJpbmcsIHdvcmtlck5hbWU6IHN0cmluZyk6IE9wdGltaXplZFdvcmtlckNoYW5uZWwgfCBudWxsIHtcbiAgICByZXR1cm4gZ2V0VW5pZmllZE1lc3NhZ2luZygpLmdldFdvcmtlckNoYW5uZWwodmlld0hhc2gsIHdvcmtlck5hbWUpO1xufVxuXG4vKipcbiAqIEdldCBhIGJyb2FkY2FzdCBjaGFubmVsIHVzaW5nIHRoZSBkZWZhdWx0IG1hbmFnZXJcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEJyb2FkY2FzdENoYW5uZWwoY2hhbm5lbE5hbWU6IHN0cmluZyk6IEJyb2FkY2FzdENoYW5uZWwge1xuICAgIHJldHVybiBnZXRVbmlmaWVkTWVzc2FnaW5nKCkuZ2V0QnJvYWRjYXN0Q2hhbm5lbChjaGFubmVsTmFtZSk7XG59XG4iXX0=