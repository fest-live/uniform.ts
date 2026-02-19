/**
 * Unified Messaging Module
 * Provides cross-context communication utilities
 * Part of fest/uniform
 */

// MessageQueue - Persistent message queuing with IndexedDB
export {
    MessageQueue,
    getMessageQueue,
    createMessageQueue,
    type QueuedMessage,
    type MessagePriority,
    type MessageQueueOptions,
    type QueueMessageOptions
} from './MessageQueue';

// UnifiedMessaging - Full messaging system with pipelines
export {
    UnifiedMessagingManager,
    PendingMessageStore,
    getUnifiedMessaging,
    createUnifiedMessaging,
    resetUnifiedMessaging,
    sendMessage,
    registerHandler,
    getWorkerChannel,
    getBroadcastChannel,
    type UnifiedMessage,
    type MessageMetadata,
    type MessageHandler,
    type WorkerChannelConfig,
    type PipelineConfig,
    type PipelineStage,
    type ChannelMapping,
    type UnifiedMessagingConfig
} from './UnifiedMessaging';

// ServiceChannelManager - BroadcastChannel-based service channels
export {
    ServiceChannelManager,
    createServiceChannelManager,
    getServiceChannelManager,
    resetServiceChannelManager,
    type ServiceChannelConfig,
    type ChannelMessage,
    type ChannelState,
    type ServiceChannelManagerConfig
} from './ServiceChannelManager';
