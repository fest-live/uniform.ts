/**
 * Observable-Based Channel Handler - Legacy Re-exports
 *
 * @deprecated Use UnifiedChannel instead.
 * This file is kept for backward compatibility.
 */

// Re-export from Channels.ts (which wraps UnifiedChannel)
export {
    SELF_CHANNEL,
    CHANNEL_MAP,
    RemoteChannels,
    RemoteChannelHelper,
    ChannelHandler,
    loadWorker,
    initChannelHandler,
    createHostChannel,
    createOrUseExistingChannel,
    $createOrUseExistingChannel
} from "./Channels";

// Additional Observable-specific aliases
export { ChannelHandler as ObservableChannelHandler } from "./Channels";
export { initChannelHandler as initObservableChannelHandler } from "./Channels";
export { createHostChannel as createObservableHostChannel } from "./Channels";
export { createOrUseExistingChannel as createOrUseExistingObservableChannel } from "./Channels";
