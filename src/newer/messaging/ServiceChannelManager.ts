/**
 * Service Channel Manager
 * Manages BroadcastChannel-based service channels for views and components
 * Part of fest/uniform - configurable without app-specific dependencies
 */

import { detectExecutionContext } from '../next/utils/Env';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Channel configuration
 */
export interface ServiceChannelConfig {
    broadcastName: string;
    routeHash?: string;
    component?: string;
    description?: string;
}

/**
 * Channel message format
 */
export interface ChannelMessage<T = unknown> {
    type: string;
    source: string;
    target: string;
    data: T;
    timestamp: number;
    correlationId?: string;
}

/**
 * Channel state
 */
export interface ChannelState {
    connected: boolean;
    lastActivity: number;
    pendingMessages: number;
}

/**
 * Service channel manager configuration
 */
export interface ServiceChannelManagerConfig {
    /** Channel configurations by ID */
    channels?: Record<string, ServiceChannelConfig>;
    /** Log prefix for debugging */
    logPrefix?: string;
}

// ============================================================================
// SERVICE CHANNEL MANAGER
// ============================================================================

export class ServiceChannelManager<TChannelId extends string = string> {
    private channels = new Map<TChannelId, BroadcastChannel>();
    private readyPromises = new Map<TChannelId, { promise: Promise<void>; resolve: () => void }>();
    private messageHandlers = new Map<TChannelId, Set<(msg: ChannelMessage) => void>>();
    private channelConfigs: Record<string, ServiceChannelConfig>;
    private executionContext: string;
    private logPrefix: string;

    constructor(config: ServiceChannelManagerConfig = {}) {
        this.channelConfigs = config.channels ?? {};
        this.logPrefix = config.logPrefix ?? '[ServiceChannels]';
        this.executionContext = detectExecutionContext();
        console.log(`${this.logPrefix} Initialized in ${this.executionContext} context`);
    }

    // ========================================================================
    // CONFIGURATION
    // ========================================================================

    /**
     * Register channel configurations
     */
    registerConfigs(configs: Record<string, ServiceChannelConfig>): void {
        this.channelConfigs = { ...this.channelConfigs, ...configs };
    }

    /**
     * Get channel configuration
     */
    getConfig(channelId: TChannelId): ServiceChannelConfig | undefined {
        return this.channelConfigs[channelId];
    }

    /**
     * Get all channel configurations
     */
    getAllConfigs(): Record<string, ServiceChannelConfig> {
        return { ...this.channelConfigs };
    }

    // ========================================================================
    // CHANNEL LIFECYCLE
    // ========================================================================

    /**
     * Initialize a service channel
     */
    async initChannel(channelId: TChannelId): Promise<BroadcastChannel> {
        // Return existing channel if already initialized
        if (this.channels.has(channelId)) {
            return this.channels.get(channelId)!;
        }

        const config = this.channelConfigs[channelId];
        if (!config) {
            throw new Error(`Unknown channel: ${channelId}. Register configuration first.`);
        }

        // Create deferred for ready state
        let resolveReady!: () => void;
        const readyPromise = new Promise<void>((resolve) => {
            resolveReady = resolve;
        });
        this.readyPromises.set(channelId, { promise: readyPromise, resolve: resolveReady });

        console.log(`${this.logPrefix} Initializing channel: ${channelId} -> ${config.broadcastName}`);

        // Create broadcast channel
        const channel = new BroadcastChannel(config.broadcastName);
        
        // Setup message handler
        channel.onmessage = (event) => {
            this.handleIncomingMessage(channelId, event.data);
        };

        channel.onmessageerror = (event) => {
            console.error(`${this.logPrefix} Message error on ${channelId}:`, event);
        };

        this.channels.set(channelId, channel);
        
        // Mark as ready
        resolveReady();
        
        console.log(`${this.logPrefix} Channel ready: ${channelId}`);
        return channel;
    }

    /**
     * Close a service channel
     */
    closeChannel(channelId: TChannelId): void {
        const channel = this.channels.get(channelId);
        if (channel) {
            channel.close();
            this.channels.delete(channelId);
            this.readyPromises.delete(channelId);
            this.messageHandlers.delete(channelId);
            console.log(`${this.logPrefix} Channel closed: ${channelId}`);
        }
    }

    /**
     * Close all channels
     */
    closeAll(): void {
        for (const channelId of this.channels.keys()) {
            this.closeChannel(channelId);
        }
    }

    /**
     * Wait for a channel to be ready
     */
    async waitForChannel(channelId: TChannelId): Promise<void> {
        const deferred = this.readyPromises.get(channelId);
        if (deferred) {
            await deferred.promise;
        } else {
            await this.initChannel(channelId);
        }
    }

    // ========================================================================
    // MESSAGING
    // ========================================================================

    /**
     * Send a message to a channel
     */
    async send<T>(
        target: TChannelId,
        type: string,
        data: T,
        options: { correlationId?: string; source?: string } = {}
    ): Promise<void> {
        await this.waitForChannel(target);

        const channel = this.channels.get(target);
        if (!channel) {
            throw new Error(`Channel not ready: ${target}`);
        }

        const message: ChannelMessage<T> = {
            type,
            source: options.source ?? this.executionContext,
            target,
            data,
            timestamp: Date.now(),
            correlationId: options.correlationId
        };

        channel.postMessage(message);
        console.log(`${this.logPrefix} Sent message to ${target}:`, type);
    }

    /**
     * Broadcast a message to all initialized channels
     */
    broadcast<T>(type: string, data: T, source?: string): void {
        for (const [channelId, channel] of this.channels) {
            const message: ChannelMessage<T> = {
                type,
                source: source ?? this.executionContext,
                target: channelId,
                data,
                timestamp: Date.now()
            };
            channel.postMessage(message);
        }
        console.log(`${this.logPrefix} Broadcast message:`, type);
    }

    /**
     * Subscribe to messages on a channel
     */
    subscribe(
        channelId: TChannelId,
        handler: (msg: ChannelMessage) => void
    ): () => void {
        if (!this.messageHandlers.has(channelId)) {
            this.messageHandlers.set(channelId, new Set());
        }

        this.messageHandlers.get(channelId)!.add(handler);

        // Initialize channel if not already
        this.initChannel(channelId).catch(console.error);

        // Return unsubscribe function
        return () => {
            this.messageHandlers.get(channelId)?.delete(handler);
        };
    }

    /**
     * Handle incoming message
     */
    private handleIncomingMessage(channelId: TChannelId, data: unknown): void {
        const handlers = this.messageHandlers.get(channelId);
        if (!handlers || handlers.size === 0) {
            console.log(`${this.logPrefix} No handlers for ${channelId}, message queued`);
            return;
        }

        const message = data as ChannelMessage;
        for (const handler of handlers) {
            try {
                handler(message);
            } catch (error) {
                console.error(`${this.logPrefix} Handler error on ${channelId}:`, error);
            }
        }
    }

    // ========================================================================
    // CHANNEL STATE
    // ========================================================================

    /**
     * Check if channel is initialized
     */
    isInitialized(channelId: TChannelId): boolean {
        return this.channels.has(channelId);
    }

    /**
     * Get all initialized channel IDs
     */
    getInitializedChannels(): TChannelId[] {
        return Array.from(this.channels.keys());
    }

    /**
     * Get channel status
     */
    getStatus(): Record<string, ChannelState> {
        const status: Record<string, ChannelState> = {};
        
        for (const channelId of Object.keys(this.channelConfigs)) {
            status[channelId] = {
                connected: this.channels.has(channelId as TChannelId),
                lastActivity: Date.now(),
                pendingMessages: 0
            };
        }

        return status;
    }

    /**
     * Get execution context
     */
    getExecutionContext(): string {
        return this.executionContext;
    }
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Create a new ServiceChannelManager instance
 */
export function createServiceChannelManager<TChannelId extends string = string>(
    config?: ServiceChannelManagerConfig
): ServiceChannelManager<TChannelId> {
    return new ServiceChannelManager<TChannelId>(config);
}

// Default instance (optional singleton pattern)
let defaultManager: ServiceChannelManager | null = null;

/**
 * Get or create the default ServiceChannelManager
 */
export function getServiceChannelManager(config?: ServiceChannelManagerConfig): ServiceChannelManager {
    if (!defaultManager) {
        defaultManager = new ServiceChannelManager(config);
    } else if (config?.channels) {
        defaultManager.registerConfigs(config.channels);
    }
    return defaultManager;
}

/**
 * Reset the default manager (useful for testing)
 */
export function resetServiceChannelManager(): void {
    if (defaultManager) {
        defaultManager.closeAll();
        defaultManager = null;
    }
}
