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
    type QueuedMessage as MessagingQueuedMessage,
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
    type UnifiedMessagingConfig,
    type ProtocolMessage
} from './UnifiedMessaging';

export {
    ProtocolReplayGuard,
    createProtocolEnvelope,
    isProtocolEnvelope,
    normalizeProtocolEnvelope
} from './Protocol';

export type {
    UniformPurpose,
    UniformEnvelopeType,
    UniformDeferMode,
    UniformProtocolName,
    UniformOperation,
    LegacyUnifiedMessage,
    UniformProtocolEnvelope,
    CreateEnvelopeInput
} from './Protocol';

export {
    MOUNTED_FS_EVENT,
    MOUNTED_FS_HTTP_PATH,
    MOUNTED_FS_WS_PATH,
    createMountedFsId,
    isMountedFsRequest,
    isMountedFsResponse,
    parseMountedFsMessage
} from './MountedFs';

export type {
    MountedFsOp,
    MountedFsKind,
    MountedFsEntry,
    MountedFsFileBody,
    MountedFsRequest,
    MountedFsResponse
} from './MountedFs';

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
