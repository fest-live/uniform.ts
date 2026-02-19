import { OptimizedWorkerChannel, QueuedWorkerChannel } from "../storage/Queued";
import { createOrUseExistingChannel } from "../channel/Channels";
import { UUIDv4 } from "fest/core";
import { ChromeExtensionBroadcastChannel } from "./Wrappers";
import { ChromeExtensionTabsChannel } from "./Wrappers";
import { initChannelHandler } from "../channel/Channels";
/**
 * Create a chrome extension worker channel
 */
export const createChromeExtensionChannel = async (config) => {
    // Chrome extensions can use dedicated workers, but might need special handling
    let worker;
    try {
        // Try to use chrome.runtime.getURL for extension resources
        if (typeof config.script !== "string") {
            throw new Error("Chrome extension worker channel requires config.script to be a string path");
        }
        worker = new Worker(chrome.runtime.getURL(config.script), config.options);
    }
    catch (error) {
        // Fallback for non-extension workers in extension context
        if (typeof config.script === "string") {
            worker = new Worker(new URL(config.script, import.meta.url), config.options);
        }
        else if (typeof config.script === "function") {
            worker = config.script();
        }
        else {
            worker = config.script;
        }
    }
    const channel = await createOrUseExistingChannel(config.name, {}, worker);
    return channel?.remote ?? channel;
};
/**
 * Create a chrome extension broadcast channel
 * Acts like BroadcastChannel but uses chrome.runtime messaging
 */
export const createChromeExtensionBroadcast = (channelName) => {
    const worker = new ChromeExtensionBroadcastChannel(channelName);
    return worker;
};
/**
 * Create a chrome extension broadcast-like channel
 * Acts like BroadcastChannel but uses chrome.runtime messaging
 */
export const createChromeExtensionBroadcastChannel = (channelName) => {
    const worker = new ChromeExtensionBroadcastChannel(channelName);
    const channel = createOrUseExistingChannel(channelName, {}, worker);
    return channel?.remote ?? channel;
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
export const createChromeExtensionTabsChannel = (channelName, options) => {
    const worker = new ChromeExtensionTabsChannel(channelName, options);
    const channel = createOrUseExistingChannel(channelName, {}, worker);
    return channel?.remote ?? channel;
};
/**
 * Create a chrome extension tabs messaging channel (unified)
 * Uses chrome.tabs.sendMessage for tab-to-content-script communication
 * Supports both broadcast and current-tab modes
 */
export const createChromeExtensionTabsMessagingChannel = (channelName, options) => {
    // Create a tabs channel for chrome extension messaging
    return createChromeExtensionTabsChannel(channelName, options);
};
/**
 * Initialize the main thread channel handler
 */
export const initMainChannel = (name = "$host$") => {
    return initChannelHandler(name ?? "$host$");
};
/**
 * Create a queued worker channel that waits for connection
 */
export const createQueuedWorkerChannel = (config, onChannelReady) => {
    return new QueuedWorkerChannel(config, onChannelReady);
};
/**
 * Create a service worker channel (for when running in service worker context)
 */
export const createServiceWorkerChannel = async (config) => {
    // In service worker context, we can't create dedicated workers
    // Instead, we create a channel that communicates through alternative means
    // This could be through BroadcastChannel, MessageChannel, or direct function calls
    return {
        async request(method, args = []) {
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
                        }
                        else {
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
export const createWorkerChannel = async (config) => {
    const context = config.context;
    if (context === 'service-worker') {
        // Service workers cannot create dedicated workers directly
        // Instead, we create a channel that will use alternative communication
        return createServiceWorkerChannel(config);
    }
    // Handle different script types
    let worker;
    if (typeof config.script === 'function') {
        // Script is a constructor function
        worker = config.script();
    }
    else if (config.script instanceof Worker) {
        // Script is already a Worker instance
        worker = config.script;
    }
    else {
        // Script is a string path - handle context-specific loading
        if (context === 'chrome-extension') {
            // Chrome extensions might need special handling for worker scripts
            try {
                worker = new Worker(chrome.runtime.getURL(config.script), config.options);
            }
            catch (error) {
                // Fallback to regular worker creation
                worker = new Worker(new URL(config.script, import.meta.url), config.options);
            }
        }
        else {
            worker = new Worker(new URL(config.script, import.meta.url), config.options);
        }
    }
    const channel = await createOrUseExistingChannel(config.name, {}, worker);
    return channel;
};
/**
 * Create an optimized worker channel
 */
export const createOptimizedWorkerChannel = async (config, options) => {
    const baseChannel = await createWorkerChannel(config);
    return new OptimizedWorkerChannel(baseChannel, options);
};
/**
 * Create an optimized worker channel with queuing support
 */
export const createQueuedOptimizedWorkerChannel = (config, options, onChannelReady) => {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJVdGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsbUJBQW1CLEVBQStELE1BQU0sbUJBQW1CLENBQUM7QUFDN0ksT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFDakUsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLFdBQVcsQ0FBQztBQUNuQyxPQUFPLEVBQUUsK0JBQStCLEVBQUUsTUFBTSxZQUFZLENBQUM7QUFDN0QsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sWUFBWSxDQUFDO0FBQ3hELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBRXpEOztHQUVHO0FBQ0gsTUFBTSxDQUFDLE1BQU0sNEJBQTRCLEdBQUcsS0FBSyxFQUFFLE1BQW9CLEVBQTBCLEVBQUU7SUFDL0YsK0VBQStFO0lBQy9FLElBQUksTUFBYyxDQUFDO0lBQ25CLElBQUksQ0FBQztRQUNELDJEQUEyRDtRQUMzRCxJQUFJLE9BQU8sTUFBTSxDQUFDLE1BQU0sS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUNwQyxNQUFNLElBQUksS0FBSyxDQUFDLDRFQUE0RSxDQUFDLENBQUM7UUFDbEcsQ0FBQztRQUNELE1BQU0sR0FBRyxJQUFJLE1BQU0sQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQzlFLENBQUM7SUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1FBQ2IsMERBQTBEO1FBQzFELElBQUksT0FBTyxNQUFNLENBQUMsTUFBTSxLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQ3BDLE1BQU0sR0FBRyxJQUFJLE1BQU0sQ0FBQyxJQUFJLEdBQUcsQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMs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QztBQUM1QixDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBPcHRpbWl6ZWRXb3JrZXJDaGFubmVsLCBRdWV1ZWRXb3JrZXJDaGFubmVsLCB0eXBlIFByb3RvY29sT3B0aW9ucywgdHlwZSBXb3JrZXJDaGFubmVsLCB0eXBlIFdvcmtlckNvbmZpZyB9IGZyb20gXCIuLi9zdG9yYWdlL1F1ZXVlZFwiO1xuaW1wb3J0IHsgY3JlYXRlT3JVc2VFeGlzdGluZ0NoYW5uZWwgfSBmcm9tIFwiLi4vY2hhbm5lbC9DaGFubmVsc1wiO1xuaW1wb3J0IHsgVVVJRHY0IH0gZnJvbSBcImZlc3QvY29yZVwiO1xuaW1wb3J0IHsgQ2hyb21lRXh0ZW5zaW9uQnJvYWRjYXN0Q2hhbm5lbCB9IGZyb20gXCIuL1dyYXBwZXJzXCI7XG5pbXBvcnQgeyBDaHJvbWVFeHRlbnNpb25UYWJzQ2hhbm5lbCB9IGZyb20gXCIuL1dyYXBwZXJzXCI7XG5pbXBvcnQgeyBpbml0Q2hhbm5lbEhhbmRsZXIgfSBmcm9tIFwiLi4vY2hhbm5lbC9DaGFubmVsc1wiO1xuXG4vKipcbiAqIENyZWF0ZSBhIGNocm9tZSBleHRlbnNpb24gd29ya2VyIGNoYW5uZWxcbiAqL1xuZXhwb3J0IGNvbnN0IGNyZWF0ZUNocm9tZUV4dGVuc2lvbkNoYW5uZWwgPSBhc3luYyAoY29uZmlnOiBXb3JrZXJDb25maWcpOiBQcm9taXNlPFdvcmtlckNoYW5uZWw+ID0+IHtcbiAgICAvLyBDaHJvbWUgZXh0ZW5zaW9ucyBjYW4gdXNlIGRlZGljYXRlZCB3b3JrZXJzLCBidXQgbWlnaHQgbmVlZCBzcGVjaWFsIGhhbmRsaW5nXG4gICAgbGV0IHdvcmtlcjogV29ya2VyO1xuICAgIHRyeSB7XG4gICAgICAgIC8vIFRyeSB0byB1c2UgY2hyb21lLnJ1bnRpbWUuZ2V0VVJMIGZvciBleHRlbnNpb24gcmVzb3VyY2VzXG4gICAgICAgIGlmICh0eXBlb2YgY29uZmlnLnNjcmlwdCAhPT0gXCJzdHJpbmdcIikge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ2hyb21lIGV4dGVuc2lvbiB3b3JrZXIgY2hhbm5lbCByZXF1aXJlcyBjb25maWcuc2NyaXB0IHRvIGJlIGEgc3RyaW5nIHBhdGhcIik7XG4gICAgICAgIH1cbiAgICAgICAgd29ya2VyID0gbmV3IFdvcmtlcihjaHJvbWUucnVudGltZS5nZXRVUkwoY29uZmlnLnNjcmlwdCksIGNvbmZpZy5vcHRpb25zKTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAvLyBGYWxsYmFjayBmb3Igbm9uLWV4dGVuc2lvbiB3b3JrZXJzIGluIGV4dGVuc2lvbiBjb250ZXh0XG4gICAgICAgIGlmICh0eXBlb2YgY29uZmlnLnNjcmlwdCA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgICAgICAgd29ya2VyID0gbmV3IFdvcmtlcihuZXcgVVJMKGNvbmZpZy5zY3JpcHQsIGltcG9ydC5tZXRhLnVybCksIGNvbmZpZy5vcHRpb25zKTtcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgY29uZmlnLnNjcmlwdCA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgICB3b3JrZXIgPSBjb25maWcuc2NyaXB0KCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB3b3JrZXIgPSBjb25maWcuc2NyaXB0O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgY2hhbm5lbCA9IGF3YWl0IGNyZWF0ZU9yVXNlRXhpc3RpbmdDaGFubmVsKGNvbmZpZy5uYW1lLCB7fSwgd29ya2VyKTtcbiAgICByZXR1cm4gY2hhbm5lbD8ucmVtb3RlID8/IGNoYW5uZWw7XG59O1xuXG4vKipcbiAqIENyZWF0ZSBhIGNocm9tZSBleHRlbnNpb24gYnJvYWRjYXN0IGNoYW5uZWxcbiAqIEFjdHMgbGlrZSBCcm9hZGNhc3RDaGFubmVsIGJ1dCB1c2VzIGNocm9tZS5ydW50aW1lIG1lc3NhZ2luZ1xuICovXG5leHBvcnQgY29uc3QgY3JlYXRlQ2hyb21lRXh0ZW5zaW9uQnJvYWRjYXN0ID0gKGNoYW5uZWxOYW1lOiBzdHJpbmcpOiBCcm9hZGNhc3RDaGFubmVsID0+IHtcbiAgICBjb25zdCB3b3JrZXIgPSBuZXcgQ2hyb21lRXh0ZW5zaW9uQnJvYWRjYXN0Q2hhbm5lbChjaGFubmVsTmFtZSkgYXMgYW55O1xuICAgIHJldHVybiB3b3JrZXIgYXMgQnJvYWRjYXN0Q2hhbm5lbDtcbn07XG5cbi8qKlxuICogQ3JlYXRlIGEgY2hyb21lIGV4dGVuc2lvbiBicm9hZGNhc3QtbGlrZSBjaGFubmVsXG4gKiBBY3RzIGxpa2UgQnJvYWRjYXN0Q2hhbm5lbCBidXQgdXNlcyBjaHJvbWUucnVudGltZSBtZXNzYWdpbmdcbiAqL1xuZXhwb3J0IGNvbnN0IGNyZWF0ZUNocm9tZUV4dGVuc2lvbkJyb2FkY2FzdENoYW5uZWwgPSAoY2hhbm5lbE5hbWU6IHN0cmluZyk6IFdvcmtlckNoYW5uZWwgPT4ge1xuICAgIGNvbnN0IHdvcmtlciA9IG5ldyBDaHJvbWVFeHRlbnNpb25Ccm9hZGNhc3RDaGFubmVsKGNoYW5uZWxOYW1lKSBhcyBhbnk7XG4gICAgY29uc3QgY2hhbm5lbCA9IGNyZWF0ZU9yVXNlRXhpc3RpbmdDaGFubmVsKGNoYW5uZWxOYW1lLCB7fSwgd29ya2VyKTtcbiAgICByZXR1cm4gY2hhbm5lbD8ucmVtb3RlID8/IGNoYW5uZWw7XG59O1xuXG4vKipcbiAqIENyZWF0ZSBhIGNocm9tZSBleHRlbnNpb24gdGFicyBjaGFubmVsXG4gKiBBY3RzIGxpa2UgQnJvYWRjYXN0Q2hhbm5lbCBidXQgdXNlcyBjaHJvbWUudGFicyBtZXNzYWdpbmcgdG8gY29tbXVuaWNhdGUgd2l0aCBjb250ZW50IHNjcmlwdHNcbiAqL1xuXG4vKipcbiAqIENyZWF0ZSBhIGNocm9tZSBleHRlbnNpb24gdGFicyBjaGFubmVsICh1bmlmaWVkKVxuICogQWN0cyBsaWtlIEJyb2FkY2FzdENoYW5uZWwgYnV0IHVzZXMgY2hyb21lLnRhYnMgbWVzc2FnaW5nIHRvIGNvbW11bmljYXRlIHdpdGggY29udGVudCBzY3JpcHRzXG4gKiBTdXBwb3J0cyBib3RoIGJyb2FkY2FzdCBhbmQgY3VycmVudC10YWIgbW9kZXNcbiAqL1xuZXhwb3J0IGNvbnN0IGNyZWF0ZUNocm9tZUV4dGVuc2lvblRhYnNDaGFubmVsID0gKFxuICAgIGNoYW5uZWxOYW1lOiBzdHJpbmcsXG4gICAgb3B0aW9ucz86IHtcbiAgICAgICAgbW9kZT86ICdicm9hZGNhc3QnIHwgJ2N1cnJlbnQtdGFiJztcbiAgICAgICAgdGFiRmlsdGVyPzogKHRhYjogY2hyb21lLnRhYnMuVGFiKSA9PiBib29sZWFuO1xuICAgICAgICB0YWJJZEdldHRlcj86ICgpID0+IFByb21pc2U8bnVtYmVyPiB8IG51bWJlcjtcbiAgICB9XG4pOiBXb3JrZXJDaGFubmVsID0+IHtcbiAgICBjb25zdCB3b3JrZXIgPSBuZXcgQ2hyb21lRXh0ZW5zaW9uVGFic0NoYW5uZWwoY2hhbm5lbE5hbWUsIG9wdGlvbnMpIGFzIGFueTtcbiAgICBjb25zdCBjaGFubmVsID0gY3JlYXRlT3JVc2VFeGlzdGluZ0NoYW5uZWwoY2hhbm5lbE5hbWUsIHt9LCB3b3JrZXIpO1xuICAgIHJldHVybiBjaGFubmVsPy5yZW1vdGUgPz8gY2hhbm5lbDtcbn07XG5cbi8qKlxuICogQ3JlYXRlIGEgY2hyb21lIGV4dGVuc2lvbiB0YWJzIG1lc3NhZ2luZyBjaGFubmVsICh1bmlmaWVkKVxuICogVXNlcyBjaHJvbWUudGFicy5zZW5kTWVzc2FnZSBmb3IgdGFiLXRvLWNvbnRlbnQtc2NyaXB0IGNvbW11bmljYXRpb25cbiAqIFN1cHBvcnRzIGJvdGggYnJvYWRjYXN0IGFuZCBjdXJyZW50LXRhYiBtb2Rlc1xuICovXG5leHBvcnQgY29uc3QgY3JlYXRlQ2hyb21lRXh0ZW5zaW9uVGFic01lc3NhZ2luZ0NoYW5uZWwgPSAoXG4gICAgY2hhbm5lbE5hbWU6IHN0cmluZyxcbiAgICBvcHRpb25zPzoge1xuICAgICAgICBtb2RlPzogJ2Jyb2FkY2FzdCcgfCAnY3VycmVudC10YWInO1xuICAgICAgICB0YWJGaWx0ZXI/OiAodGFiOiBjaHJvbWUudGFicy5UYWIpID0+IGJvb2xlYW47XG4gICAgICAgIHRhYklkR2V0dGVyPzogKCkgPT4gUHJvbWlzZTxudW1iZXI+IHwgbnVtYmVyO1xuICAgIH1cbik6IFdvcmtlckNoYW5uZWwgPT4ge1xuICAgIC8vIENyZWF0ZSBhIHRhYnMgY2hhbm5lbCBmb3IgY2hyb21lIGV4dGVuc2lvbiBtZXNzYWdpbmdcbiAgICByZXR1cm4gY3JlYXRlQ2hyb21lRXh0ZW5zaW9uVGFic0NoYW5uZWwoY2hhbm5lbE5hbWUsIG9wdGlvbnMpO1xufTtcblxuLyoqXG4gKiBJbml0aWFsaXplIHRoZSBtYWluIHRocmVhZCBjaGFubmVsIGhhbmRsZXJcbiAqL1xuZXhwb3J0IGNvbnN0IGluaXRNYWluQ2hhbm5lbCA9IChuYW1lOiBzdHJpbmcgPSBcIiRob3N0JFwiKSA9PiB7XG4gICAgcmV0dXJuIGluaXRDaGFubmVsSGFuZGxlcihuYW1lID8/IFwiJGhvc3QkXCIpO1xufTtcblxuLyoqXG4gKiBDcmVhdGUgYSBxdWV1ZWQgd29ya2VyIGNoYW5uZWwgdGhhdCB3YWl0cyBmb3IgY29ubmVjdGlvblxuICovXG5leHBvcnQgY29uc3QgY3JlYXRlUXVldWVkV29ya2VyQ2hhbm5lbCA9IChcbiAgICBjb25maWc6IFdvcmtlckNvbmZpZyxcbiAgICBvbkNoYW5uZWxSZWFkeT86IChjaGFubmVsOiBXb3JrZXJDaGFubmVsKSA9PiB2b2lkXG4pOiBRdWV1ZWRXb3JrZXJDaGFubmVsID0+IHtcbiAgICByZXR1cm4gbmV3IFF1ZXVlZFdvcmtlckNoYW5uZWwoY29uZmlnLCBvbkNoYW5uZWxSZWFkeSk7XG59O1xuXG4vKipcbiAqIENyZWF0ZSBhIHNlcnZpY2Ugd29ya2VyIGNoYW5uZWwgKGZvciB3aGVuIHJ1bm5pbmcgaW4gc2VydmljZSB3b3JrZXIgY29udGV4dClcbiAqL1xuZXhwb3J0IGNvbnN0IGNyZWF0ZVNlcnZpY2VXb3JrZXJDaGFubmVsID0gYXN5bmMgKGNvbmZpZzogV29ya2VyQ29uZmlnKTogUHJvbWlzZTxXb3JrZXJDaGFubmVsPiA9PiB7XG4gICAgLy8gSW4gc2VydmljZSB3b3JrZXIgY29udGV4dCwgd2UgY2FuJ3QgY3JlYXRlIGRlZGljYXRlZCB3b3JrZXJzXG4gICAgLy8gSW5zdGVhZCwgd2UgY3JlYXRlIGEgY2hhbm5lbCB0aGF0IGNvbW11bmljYXRlcyB0aHJvdWdoIGFsdGVybmF0aXZlIG1lYW5zXG4gICAgLy8gVGhpcyBjb3VsZCBiZSB0aHJvdWdoIEJyb2FkY2FzdENoYW5uZWwsIE1lc3NhZ2VDaGFubmVsLCBvciBkaXJlY3QgZnVuY3Rpb24gY2FsbHNcblxuICAgIHJldHVybiB7XG4gICAgICAgIGFzeW5jIHJlcXVlc3QobWV0aG9kOiBzdHJpbmcsIGFyZ3M6IGFueVtdID0gW10pIHtcbiAgICAgICAgICAgIC8vIEZvciBzZXJ2aWNlIHdvcmtlciBjb250ZXh0LCB3ZSBtaWdodCBuZWVkIHRvIGhhbmRsZSBvcGVyYXRpb25zIGRpZmZlcmVudGx5XG4gICAgICAgICAgICAvLyBUaGlzIGNvdWxkIGludm9sdmU6XG4gICAgICAgICAgICAvLyAxLiBEaXJlY3QgZnVuY3Rpb24gY2FsbHMgaWYgdGhlIEFQSSBpcyBhdmFpbGFibGUgaW4gU1cgY29udGV4dFxuICAgICAgICAgICAgLy8gMi4gQ29tbXVuaWNhdGlvbiB0aHJvdWdoIEJyb2FkY2FzdENoYW5uZWwgdG8gbWFpbiB0aHJlYWRcbiAgICAgICAgICAgIC8vIDMuIFVzaW5nIGNsaWVudHMubWF0Y2hBbGwoKSB0byBjb21tdW5pY2F0ZSB3aXRoIGNvbnRyb2xsZWQgcGFnZXNcblxuICAgICAgICAgICAgLy8gRm9yIG5vdywgd2UnbGwgdXNlIGEgQnJvYWRjYXN0Q2hhbm5lbCBhcHByb2FjaFxuICAgICAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBjaGFubmVsID0gbmV3IEJyb2FkY2FzdENoYW5uZWwoYCR7Y29uZmlnLm5hbWV9LXN3LWNoYW5uZWxgKTtcbiAgICAgICAgICAgICAgICBjb25zdCBtZXNzYWdlSWQgPSBVVUlEdjQoKTtcblxuICAgICAgICAgICAgICAgIGNvbnN0IHRpbWVvdXQgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY2hhbm5lbC5jbG9zZSgpO1xuICAgICAgICAgICAgICAgICAgICByZWplY3QobmV3IEVycm9yKGBTZXJ2aWNlIHdvcmtlciByZXF1ZXN0IHRpbWVvdXQ6ICR7bWV0aG9kfWApKTtcbiAgICAgICAgICAgICAgICB9LCAxMDAwMCk7IC8vIDEwIHNlY29uZCB0aW1lb3V0XG5cbiAgICAgICAgICAgICAgICBjaGFubmVsLm9ubWVzc2FnZSA9IChldmVudCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB7IGlkLCByZXN1bHQsIGVycm9yIH0gPSBldmVudC5kYXRhO1xuICAgICAgICAgICAgICAgICAgICBpZiAoaWQgPT09IG1lc3NhZ2VJZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY2hhbm5lbC5jbG9zZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KG5ldyBFcnJvcihlcnJvcikpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHJlc3VsdCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgY2hhbm5lbC5wb3N0TWVzc2FnZSh7XG4gICAgICAgICAgICAgICAgICAgIGlkOiBtZXNzYWdlSWQsXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdyZXF1ZXN0JyxcbiAgICAgICAgICAgICAgICAgICAgbWV0aG9kLFxuICAgICAgICAgICAgICAgICAgICBhcmdzXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSxcblxuICAgICAgICBjbG9zZSgpIHtcbiAgICAgICAgICAgIC8vIFNlcnZpY2Ugd29ya2VyIGNoYW5uZWxzIGRvbid0IG5lZWQgZXhwbGljaXQgY2xvc2luZ1xuICAgICAgICAgICAgLy8gYXMgdGhleSB1c2UgQnJvYWRjYXN0Q2hhbm5lbCB3aGljaCBhdXRvLW1hbmFnZXNcbiAgICAgICAgfVxuICAgIH07XG59O1xuXG4vKipcbiAqIENyZWF0ZSBhIHdvcmtlciBjaGFubmVsIHdpdGggc2ltcGxpZmllZCBBUElcbiAqL1xuZXhwb3J0IGNvbnN0IGNyZWF0ZVdvcmtlckNoYW5uZWwgPSBhc3luYyAoY29uZmlnOiBXb3JrZXJDb25maWcpOiBQcm9taXNlPFdvcmtlckNoYW5uZWw+ID0+IHtcbiAgICBjb25zdCBjb250ZXh0ID0gY29uZmlnLmNvbnRleHQ7XG5cbiAgICBpZiAoY29udGV4dCA9PT0gJ3NlcnZpY2Utd29ya2VyJykge1xuICAgICAgICAvLyBTZXJ2aWNlIHdvcmtlcnMgY2Fubm90IGNyZWF0ZSBkZWRpY2F0ZWQgd29ya2VycyBkaXJlY3RseVxuICAgICAgICAvLyBJbnN0ZWFkLCB3ZSBjcmVhdGUgYSBjaGFubmVsIHRoYXQgd2lsbCB1c2UgYWx0ZXJuYXRpdmUgY29tbXVuaWNhdGlvblxuICAgICAgICByZXR1cm4gY3JlYXRlU2VydmljZVdvcmtlckNoYW5uZWwoY29uZmlnKTtcbiAgICB9XG5cbiAgICAvLyBIYW5kbGUgZGlmZmVyZW50IHNjcmlwdCB0eXBlc1xuICAgIGxldCB3b3JrZXI6IFdvcmtlcjtcbiAgICBpZiAodHlwZW9mIGNvbmZpZy5zY3JpcHQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgLy8gU2NyaXB0IGlzIGEgY29uc3RydWN0b3IgZnVuY3Rpb25cbiAgICAgICAgd29ya2VyID0gY29uZmlnLnNjcmlwdCgpO1xuICAgIH0gZWxzZSBpZiAoY29uZmlnLnNjcmlwdCBpbnN0YW5jZW9mIFdvcmtlcikge1xuICAgICAgICAvLyBTY3JpcHQgaXMgYWxyZWFkeSBhIFdvcmtlciBpbnN0YW5jZVxuICAgICAgICB3b3JrZXIgPSBjb25maWcuc2NyaXB0O1xuICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIFNjcmlwdCBpcyBhIHN0cmluZyBwYXRoIC0gaGFuZGxlIGNvbnRleHQtc3BlY2lmaWMgbG9hZGluZ1xuICAgICAgICBpZiAoY29udGV4dCA9PT0gJ2Nocm9tZS1leHRlbnNpb24nKSB7XG4gICAgICAgICAgICAvLyBDaHJvbWUgZXh0ZW5zaW9ucyBtaWdodCBuZWVkIHNwZWNpYWwgaGFuZGxpbmcgZm9yIHdvcmtlciBzY3JpcHRzXG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIHdvcmtlciA9IG5ldyBXb3JrZXIoY2hyb21lLnJ1bnRpbWUuZ2V0VVJMKGNvbmZpZy5zY3JpcHQpLCBjb25maWcub3B0aW9ucyk7XG4gICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgICAgIC8vIEZhbGxiYWNrIHRvIHJlZ3VsYXIgd29ya2VyIGNyZWF0aW9uXG4gICAgICAgICAgICAgICAgd29ya2VyID0gbmV3IFdvcmtlcihuZXcgVVJMKGNvbmZpZy5zY3JpcHQsIGltcG9ydC5tZXRhLnVybCksIGNvbmZpZy5vcHRpb25zKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHdvcmtlciA9IG5ldyBXb3JrZXIobmV3IFVSTChjb25maWcuc2NyaXB0LCBpbXBvcnQubWV0YS51cmwpLCBjb25maWcub3B0aW9ucyk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCBjaGFubmVsID0gYXdhaXQgY3JlYXRlT3JVc2VFeGlzdGluZ0NoYW5uZWwoY29uZmlnLm5hbWUsIHt9LCB3b3JrZXIpO1xuICAgIHJldHVybiBjaGFubmVsIGFzIFdvcmtlckNoYW5uZWw7XG59O1xuXG4vKipcbiAqIENyZWF0ZSBhbiBvcHRpbWl6ZWQgd29ya2VyIGNoYW5uZWxcbiAqL1xuZXhwb3J0IGNvbnN0IGNyZWF0ZU9wdGltaXplZFdvcmtlckNoYW5uZWwgPSBhc3luYyAoXG4gICAgY29uZmlnOiBXb3JrZXJDb25maWcsXG4gICAgb3B0aW9ucz86IFByb3RvY29sT3B0aW9uc1xuKTogUHJvbWlzZTxPcHRpbWl6ZWRXb3JrZXJDaGFubmVsPiA9PiB7XG4gICAgY29uc3QgYmFzZUNoYW5uZWwgPSBhd2FpdCBjcmVhdGVXb3JrZXJDaGFubmVsKGNvbmZpZyk7XG4gICAgcmV0dXJuIG5ldyBPcHRpbWl6ZWRXb3JrZXJDaGFubmVsKGJhc2VDaGFubmVsLCBvcHRpb25zKTtcbn07XG5cbi8qKlxuICogQ3JlYXRlIGFuIG9wdGltaXplZCB3b3JrZXIgY2hhbm5lbCB3aXRoIHF1ZXVpbmcgc3VwcG9ydFxuICovXG5leHBvcnQgY29uc3QgY3JlYXRlUXVldWVkT3B0aW1pemVkV29ya2VyQ2hhbm5lbCA9IChcbiAgICBjb25maWc6IFdvcmtlckNvbmZpZyxcbiAgICBvcHRpb25zPzogUHJvdG9jb2xPcHRpb25zLFxuICAgIG9uQ2hhbm5lbFJlYWR5PzogKGNoYW5uZWw6IFdvcmtlckNoYW5uZWwpID0+IHZvaWRcbik6IE9wdGltaXplZFdvcmtlckNoYW5uZWwgPT4ge1xuICAgIC8vIENyZWF0ZSB0aGUgb3B0aW1pemVkIGNoYW5uZWwgZmlyc3QgKHdpdGhvdXQgdW5kZXJseWluZyBjaGFubmVsKVxuICAgIGNvbnN0IG9wdGltaXplZENoYW5uZWwgPSBuZXcgT3B0aW1pemVkV29ya2VyQ2hhbm5lbChudWxsLCBvcHRpb25zLCBvbkNoYW5uZWxSZWFkeSk7XG5cbiAgICAvLyBUaGVuIGNyZWF0ZSB0aGUgdW5kZXJseWluZyBjaGFubmVsIGFzeW5jaHJvbm91c2x5XG4gICAgY3JlYXRlV29ya2VyQ2hhbm5lbChjb25maWcpLnRoZW4oKGJhc2VDaGFubmVsKSA9PiB7XG4gICAgICAgIG9wdGltaXplZENoYW5uZWwuc2V0Q2hhbm5lbChiYXNlQ2hhbm5lbCk7XG4gICAgfSkuY2F0Y2goKGVycm9yKSA9PiB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ1tjcmVhdGVRdWV1ZWRPcHRpbWl6ZWRXb3JrZXJDaGFubmVsXSBGYWlsZWQgdG8gY3JlYXRlIGJhc2UgY2hhbm5lbDonLCBlcnJvcik7XG4gICAgICAgIC8vIFJlamVjdCBhbGwgcXVldWVkIHJlcXVlc3RzXG4gICAgICAgIG9wdGltaXplZENoYW5uZWwuY2xvc2UoKTtcbiAgICB9KTtcblxuICAgIHJldHVybiBvcHRpbWl6ZWRDaGFubmVsO1xufTtcbiJdfQ==