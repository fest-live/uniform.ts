/**
 * Worker Entry Point - Multi-Channel Support
 *
 * This worker context supports:
 * - Multiple channel creation/initialization
 * - Observing new incoming channel connections
 * - Dynamic channel addition after initialization
 * - Connection from remote/host contexts
 */
import { UUIDv4 } from "fest/core";
import { createChannelContext } from "../channel/ChannelContext";
import { ChannelSubject } from "../observable/Observable";
// ============================================================================
// WORKER CONTEXT
// ============================================================================
/**
 * WorkerContext - Manages channels within a Worker
 *
 * Supports observing new incoming connections from host/remote contexts.
 */
export class WorkerContext {
    _context;
    _config;
    _subscriptions = [];
    // Observable streams for incoming connections
    _incomingConnections = new ChannelSubject({ bufferSize: 100 });
    _channelCreated = new ChannelSubject({ bufferSize: 100 });
    _channelClosed = new ChannelSubject();
    constructor(config = {}) {
        this._config = {
            name: config.name ?? "worker",
            workerName: config.workerName ?? `worker-${UUIDv4().slice(0, 8)}`,
            autoAcceptChannels: config.autoAcceptChannels ?? true,
            allowedChannels: config.allowedChannels ?? [],
            maxChannels: config.maxChannels ?? 100,
            autoConnect: config.autoConnect ?? true,
            useGlobalSelf: true,
            defaultOptions: config.defaultOptions ?? {},
            isolatedStorage: config.isolatedStorage ?? false,
            ...config
        };
        this._context = createChannelContext({
            name: this._config.name,
            useGlobalSelf: true,
            defaultOptions: config.defaultOptions
        });
        this._setupMessageListener();
    }
    // ========================================================================
    // INCOMING CONNECTION OBSERVABLES
    // ========================================================================
    /**
     * Observable: New incoming connection requests
     */
    get onConnection() {
        return this._incomingConnections;
    }
    /**
     * Observable: Channel created events
     */
    get onChannelCreated() {
        return this._channelCreated;
    }
    /**
     * Observable: Channel closed events
     */
    get onChannelClosed() {
        return this._channelClosed;
    }
    /**
     * Subscribe to incoming connections
     */
    subscribeConnections(handler) {
        return this._incomingConnections.subscribe(handler);
    }
    /**
     * Subscribe to channel creation
     */
    subscribeChannelCreated(handler) {
        return this._channelCreated.subscribe(handler);
    }
    // ========================================================================
    // CHANNEL MANAGEMENT
    // ========================================================================
    /**
     * Accept an incoming connection and create the channel
     */
    acceptConnection(connection) {
        if (!this._canAcceptChannel(connection.channel)) {
            return null;
        }
        const endpoint = this._context.createChannel(connection.channel, connection.options);
        // Setup remote connection
        if (connection.port) {
            connection.port.start?.();
            endpoint.handler.createRemoteChannel(connection.sender, connection.options, connection.port);
        }
        this._channelCreated.next({
            channel: connection.channel,
            endpoint,
            sender: connection.sender,
            timestamp: Date.now()
        });
        // Notify sender
        this._postChannelCreated(connection.channel, connection.sender, connection.id);
        return endpoint;
    }
    /**
     * Create a new channel in this worker context
     */
    createChannel(name, options) {
        return this._context.createChannel(name, options);
    }
    /**
     * Get an existing channel
     */
    getChannel(name) {
        return this._context.getChannel(name);
    }
    /**
     * Check if channel exists
     */
    hasChannel(name) {
        return this._context.hasChannel(name);
    }
    /**
     * Get all channel names
     */
    getChannelNames() {
        return this._context.getChannelNames();
    }
    /**
     * Query currently tracked channel connections in this worker.
     */
    queryConnections(query = {}) {
        return this._context.queryConnections(query);
    }
    /**
     * Notify active connections (useful for worker<->host sync).
     */
    notifyConnections(payload = {}, query = {}) {
        return this._context.notifyConnections(payload, query);
    }
    /**
     * Close a specific channel
     */
    closeChannel(name) {
        const closed = this._context.closeChannel(name);
        if (closed) {
            this._channelClosed.next({ channel: name, timestamp: Date.now() });
        }
        return closed;
    }
    /**
     * Get the underlying context
     */
    get context() {
        return this._context;
    }
    /**
     * Get worker configuration
     */
    get config() {
        return this._config;
    }
    // ========================================================================
    // PRIVATE METHODS
    // ========================================================================
    _setupMessageListener() {
        addEventListener("message", ((event) => {
            this._handleIncomingMessage(event);
        }));
    }
    _handleIncomingMessage(event) {
        const data = event.data;
        if (!data || typeof data !== "object")
            return;
        switch (data.type) {
            case "createChannel":
                this._handleCreateChannel(data);
                break;
            case "connectChannel":
                this._handleConnectChannel(data);
                break;
            case "addPort":
                this._handleAddPort(data);
                break;
            case "listChannels":
                this._handleListChannels(data);
                break;
            case "closeChannel":
                this._handleCloseChannel(data);
                break;
            case "ping":
                postMessage({ type: "pong", id: data.id, timestamp: Date.now() });
                break;
            default:
                // Pass to existing handler or log
                if (data.channel && this._context.hasChannel(data.channel)) {
                    // Route to specific channel
                    const endpoint = this._context.getChannel(data.channel);
                    endpoint?.handler?.handleAndResponse?.(data.payload, data.reqId);
                }
        }
    }
    _handleCreateChannel(data) {
        const connection = {
            id: data.reqId ?? UUIDv4(),
            channel: data.channel,
            sender: data.sender ?? "unknown",
            type: "channel",
            port: data.messagePort,
            timestamp: Date.now(),
            options: data.options
        };
        // Emit to observers
        this._incomingConnections.next(connection);
        // Auto-accept if configured
        if (this._config.autoAcceptChannels) {
            this.acceptConnection(connection);
        }
    }
    _handleConnectChannel(data) {
        const connection = {
            id: data.reqId ?? UUIDv4(),
            channel: data.channel,
            sender: data.sender ?? "unknown",
            type: data.portType ?? "channel",
            port: data.port,
            timestamp: Date.now(),
            options: data.options
        };
        this._incomingConnections.next(connection);
        if (this._config.autoAcceptChannels && this._canAcceptChannel(data.channel)) {
            // Connect to existing channel or create new
            const endpoint = this._context.getOrCreateChannel(data.channel, data.options);
            if (data.port) {
                data.port.start?.();
                endpoint.handler.createRemoteChannel(data.sender, data.options, data.port);
            }
            postMessage({
                type: "channelConnected",
                channel: data.channel,
                reqId: data.reqId
            });
        }
    }
    _handleAddPort(data) {
        if (!data.port || !data.channel)
            return;
        const connection = {
            id: data.reqId ?? UUIDv4(),
            channel: data.channel,
            sender: data.sender ?? "unknown",
            type: "port",
            port: data.port,
            timestamp: Date.now(),
            options: data.options
        };
        this._incomingConnections.next(connection);
        if (this._config.autoAcceptChannels) {
            this.acceptConnection(connection);
        }
    }
    _handleListChannels(data) {
        postMessage({
            type: "channelList",
            channels: this.getChannelNames(),
            reqId: data.reqId
        });
    }
    _handleCloseChannel(data) {
        if (data.channel) {
            this.closeChannel(data.channel);
            postMessage({
                type: "channelClosed",
                channel: data.channel,
                reqId: data.reqId
            });
        }
    }
    _canAcceptChannel(channel) {
        // Check max channels
        if (this._context.size >= this._config.maxChannels) {
            return false;
        }
        // Check whitelist
        if (this._config.allowedChannels.length > 0) {
            return this._config.allowedChannels.includes(channel);
        }
        return true;
    }
    _postChannelCreated(channel, sender, reqId) {
        postMessage({
            type: "channelCreated",
            channel,
            sender,
            reqId,
            timestamp: Date.now()
        });
    }
    // ========================================================================
    // LIFECYCLE
    // ========================================================================
    close() {
        this._subscriptions.forEach(s => s.unsubscribe());
        this._subscriptions = [];
        this._incomingConnections.complete();
        this._channelCreated.complete();
        this._channelClosed.complete();
        this._context.close();
    }
}
// ============================================================================
// GLOBAL WORKER CONTEXT (Singleton)
// ============================================================================
let WORKER_CONTEXT = null;
/**
 * Get or create the worker context singleton
 */
export function getWorkerContext(config) {
    if (!WORKER_CONTEXT) {
        WORKER_CONTEXT = new WorkerContext(config);
    }
    return WORKER_CONTEXT;
}
/**
 * Initialize worker context with config
 */
export function initWorkerContext(config) {
    WORKER_CONTEXT?.close();
    WORKER_CONTEXT = new WorkerContext(config);
    return WORKER_CONTEXT;
}
/**
 * Subscribe to incoming connections in the global worker context
 */
export function onWorkerConnection(handler) {
    return getWorkerContext().subscribeConnections(handler);
}
/**
 * Subscribe to channel creation in the global worker context
 */
export function onWorkerChannelCreated(handler) {
    return getWorkerContext().subscribeChannelCreated(handler);
}
// ============================================================================
// INVOKER INTEGRATION
// ============================================================================
import { createResponder, createInvoker, detectContextType, detectTransportType } from "../proxy/Invoker";
let WORKER_RESPONDER = null;
let WORKER_INVOKER = null;
/**
 * Get the worker's Responder (for handling incoming invocations)
 */
export function getWorkerResponder(channel) {
    if (!WORKER_RESPONDER) {
        WORKER_RESPONDER = createResponder(channel ?? "worker");
        WORKER_RESPONDER.listen(self);
    }
    return WORKER_RESPONDER;
}
/**
 * Get the worker's bidirectional Invoker
 */
export function getWorkerInvoker(channel) {
    if (!WORKER_INVOKER) {
        WORKER_INVOKER = createInvoker(channel ?? "worker");
        WORKER_INVOKER.connect(self);
    }
    return WORKER_INVOKER;
}
/**
 * Expose an object for remote invocation from the worker
 */
export function exposeFromWorker(name, obj) {
    getWorkerResponder().expose(name, obj);
}
/**
 * Subscribe to incoming invocations in the worker
 */
export function onWorkerInvocation(handler) {
    return getWorkerResponder().subscribeInvocations(handler);
}
/**
 * Create a proxy to invoke methods on the host from the worker
 */
export function createHostProxy(hostChannel = "host", basePath = []) {
    return getWorkerInvoker().createProxy(hostChannel, basePath);
}
/**
 * Import a module in the host context from the worker
 */
export function importInHost(url, hostChannel = "host") {
    return getWorkerInvoker().importModule(hostChannel, url);
}
// Re-export detection utilities
export { detectContextType, detectTransportType };
// ============================================================================
// AUTO-INITIALIZE (Compatible with legacy usage)
// ============================================================================
// Initialize the worker context
const ctx = getWorkerContext({ name: "worker" });
// Export for direct access
export { ctx as workerContext };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiV29ya2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiV29ya2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7OztHQVFHO0FBRUgsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLFdBQVcsQ0FBQztBQUNuQyxPQUFPLEVBRUgsb0JBQW9CLEVBS3ZCLE1BQU0sMkJBQTJCLENBQUM7QUFDbkMsT0FBTyxFQUFFLGNBQWMsRUFBcUIsTUFBTSwwQkFBMEIsQ0FBQztBQWdEN0UsK0VBQStFO0FBQy9FLGlCQUFpQjtBQUNqQiwrRUFBK0U7QUFFL0U7Ozs7R0FJRztBQUNILE1BQU0sT0FBTyxhQUFhO0lBQ2QsUUFBUSxDQUFpQjtJQUN6QixPQUFPLENBQWdDO0lBQ3ZDLGNBQWMsR0FBbUIsRUFBRSxDQUFDO0lBRTVDLDhDQUE4QztJQUN0QyxvQkFBb0IsR0FBRyxJQUFJLGNBQWMsQ0FBcUIsRUFBRSxVQUFVLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQztJQUNuRixlQUFlLEdBQUcsSUFBSSxjQUFjLENBQXNCLEVBQUUsVUFBVSxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUM7SUFDL0UsY0FBYyxHQUFHLElBQUksY0FBYyxFQUEwQyxDQUFDO0lBRXRGLFlBQVksU0FBOEIsRUFBRTtRQUN4QyxJQUFJLENBQUMsT0FBTyxHQUFHO1lBQ1gsSUFBSSxFQUFFLE1BQU0sQ0FBQyxJQUFJLElBQUksUUFBUTtZQUM3QixVQUFVLEVBQUUsTUFBTSxDQUFDLFVBQVUsSUFBSSxVQUFVLE1BQU0sRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUU7WUFDakUsa0JBQWtCLEVBQUUsTUFBTSxDQUFDLGtCQUFrQixJQUFJLElBQUk7WUFDckQsZUFBZSxFQUFFLE1BQU0sQ0FBQyxlQUFlLElBQUksRUFBRTtZQUM3QyxXQUFXLEVBQUUsTUFBTSxDQUFDLFdBQVcsSUFBSSxHQUFHO1lBQ3RDLFdBQVcsRUFBRSxNQUFNLENBQUMsV0FBVyxJ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YyxDQUFDO0FBQzFCLENBQUM7QUFFRDs7R0FFRztBQUNILE1BQU0sVUFBVSxnQkFBZ0IsQ0FBQyxJQUFZLEVBQUUsR0FBUTtJQUNuRCxrQkFBa0IsRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUM7QUFDM0MsQ0FBQztBQUVEOztHQUVHO0FBQ0gsTUFBTSxVQUFVLGtCQUFrQixDQUM5QixPQUEwQztJQUUxQyxPQUFPLGtCQUFrQixFQUFFLENBQUMsb0JBQW9CLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDOUQsQ0FBQztBQUVEOztHQUVHO0FBQ0gsTUFBTSxVQUFVLGVBQWUsQ0FBVSxjQUFzQixNQUFNLEVBQUUsV0FBcUIsRUFBRTtJQUMxRixPQUFPLGdCQUFnQixFQUFFLENBQUMsV0FBVyxDQUFJLFdBQVcsRUFBRSxRQUFRLENBQUMsQ0FBQztBQUNwRSxDQUFDO0FBRUQ7O0dBRUc7QUFDSCxNQUFNLFVBQVUsWUFBWSxDQUFVLEdBQVcsRUFBRSxjQUFzQixNQUFNO0lBQzNFLE9BQU8sZ0JBQWdCLEVBQUUsQ0FBQyxZQUFZLENBQUksV0FBVyxFQUFFLEdBQUcsQ0FBQyxDQUFDO0FBQ2hFLENBQUM7QUFFRCxnQ0FBZ0M7QUFDaEMsT0FBTyxFQUFFLGlCQUFpQixFQUFFLG1CQUFtQixFQUFFLENBQUM7QUFHbEQsK0VBQStFO0FBQy9FLGlEQUFpRDtBQUNqRCwrRUFBK0U7QUFFL0UsZ0NBQWdDO0FBQ2hDLE1BQU0sR0FBRyxHQUFHLGdCQUFnQixDQUFDLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxDQUFDLENBQUM7QUFFakQsMkJBQTJCO0FBQzNCLE9BQU8sRUFBRSxHQUFHLElBQUksYUFBYSxFQUFFLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIFdvcmtlciBFbnRyeSBQb2ludCAtIE11bHRpLUNoYW5uZWwgU3VwcG9ydFxuICpcbiAqIFRoaXMgd29ya2VyIGNvbnRleHQgc3VwcG9ydHM6XG4gKiAtIE11bHRpcGxlIGNoYW5uZWwgY3JlYXRpb24vaW5pdGlhbGl6YXRpb25cbiAqIC0gT2JzZXJ2aW5nIG5ldyBpbmNvbWluZyBjaGFubmVsIGNvbm5lY3Rpb25zXG4gKiAtIER5bmFtaWMgY2hhbm5lbCBhZGRpdGlvbiBhZnRlciBpbml0aWFsaXphdGlvblxuICogLSBDb25uZWN0aW9uIGZyb20gcmVtb3RlL2hvc3QgY29udGV4dHNcbiAqL1xuXG5pbXBvcnQgeyBVVUlEdjQgfSBmcm9tIFwiZmVzdC9jb3JlXCI7XG5pbXBvcnQge1xuICAgIENoYW5uZWxDb250ZXh0LFxuICAgIGNyZWF0ZUNoYW5uZWxDb250ZXh0LFxuICAgIHR5cGUgQ2hhbm5lbEVuZHBvaW50LFxuICAgIHR5cGUgQ2hhbm5lbENvbnRleHRPcHRpb25zLFxuICAgIHR5cGUgUXVlcnlDb25uZWN0aW9uc09wdGlvbnMsXG4gICAgdHlwZSBDb250ZXh0Q29ubmVjdGlvbkluZm9cbn0gZnJvbSBcIi4uL2NoYW5uZWwvQ2hhbm5lbENvbnRleHRcIjtcbmltcG9ydCB7IENoYW5uZWxTdWJqZWN0LCB0eXBlIFN1YnNjcmlwdGlvbiB9IGZyb20gXCIuLi9vYnNlcnZhYmxlL09ic2VydmFibGVcIjtcblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gVFlQRVNcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqIEluY29taW5nIGNvbm5lY3Rpb24gZXZlbnQgKi9cbmV4cG9ydCBpbnRlcmZhY2UgSW5jb21pbmdDb25uZWN0aW9uIHtcbiAgICAvKiogQ29ubmVjdGlvbiBJRCAqL1xuICAgIGlkOiBzdHJpbmc7XG4gICAgLyoqIENoYW5uZWwgbmFtZSAqL1xuICAgIGNoYW5uZWw6IHN0cmluZztcbiAgICAvKiogU2VuZGVyIGNvbnRleHQgbmFtZSAqL1xuICAgIHNlbmRlcjogc3RyaW5nO1xuICAgIC8qKiBDb25uZWN0aW9uIHR5cGUgKi9cbiAgICB0eXBlOiBcImNoYW5uZWxcIiB8IFwicG9ydFwiIHwgXCJicm9hZGNhc3RcIiB8IFwic29ja2V0XCI7XG4gICAgLyoqIE1lc3NhZ2VQb3J0IGlmIHByb3ZpZGVkICovXG4gICAgcG9ydD86IE1lc3NhZ2VQb3J0O1xuICAgIC8qKiBUaW1lc3RhbXAgKi9cbiAgICB0aW1lc3RhbXA6IG51bWJlcjtcbiAgICAvKiogQ29ubmVjdGlvbiBvcHRpb25zICovXG4gICAgb3B0aW9ucz86IGFueTtcbn1cblxuLyoqIENoYW5uZWwgY3JlYXRlZCBldmVudCAqL1xuZXhwb3J0IGludGVyZmFjZSBDaGFubmVsQ3JlYXRlZEV2ZW50IHtcbiAgICAvKiogQ2hhbm5lbCBuYW1lICovXG4gICAgY2hhbm5lbDogc3RyaW5nO1xuICAgIC8qKiBFbmRwb2ludCByZWZlcmVuY2UgKi9cbiAgICBlbmRwb2ludDogQ2hhbm5lbEVuZHBvaW50O1xuICAgIC8qKiBSZW1vdGUgc2VuZGVyICovXG4gICAgc2VuZGVyOiBzdHJpbmc7XG4gICAgLyoqIFRpbWVzdGFtcCAqL1xuICAgIHRpbWVzdGFtcDogbnVtYmVyO1xufVxuXG4vKiogV29ya2VyIGNvbnRleHQgY29uZmlndXJhdGlvbiAqL1xuZXhwb3J0IGludGVyZmFjZSBXb3JrZXJDb250ZXh0Q29uZmlnIGV4dGVuZHMgQ2hhbm5lbENvbnRleHRPcHRpb25zIHtcbiAgICAvKiogV29ya2VyIG5hbWUvaWRlbnRpZmllciAqL1xuICAgIHdvcmtlck5hbWU/OiBzdHJpbmc7XG4gICAgLyoqIEF1dG8tYWNjZXB0IGluY29taW5nIGNoYW5uZWxzICovXG4gICAgYXV0b0FjY2VwdENoYW5uZWxzPzogYm9vbGVhbjtcbiAgICAvKiogQ2hhbm5lbCB3aGl0ZWxpc3QgKGlmIHNldCwgb25seSB0aGVzZSBjaGFubmVscyBhcmUgYWNjZXB0ZWQpICovXG4gICAgYWxsb3dlZENoYW5uZWxzPzogc3RyaW5nW107XG4gICAgLyoqIE1heGltdW0gY29uY3VycmVudCBjaGFubmVscyAqL1xuICAgIG1heENoYW5uZWxzPzogbnVtYmVyO1xufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBXT1JLRVIgQ09OVEVYVFxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIFdvcmtlckNvbnRleHQgLSBNYW5hZ2VzIGNoYW5uZWxzIHdpdGhpbiBhIFdvcmtlclxuICpcbiAqIFN1cHBvcnRzIG9ic2VydmluZyBuZXcgaW5jb21pbmcgY29ubmVjdGlvbnMgZnJvbSBob3N0L3JlbW90ZSBjb250ZXh0cy5cbiAqL1xuZXhwb3J0IGNsYXNzIFdvcmtlckNvbnRleHQge1xuICAgIHByaXZhdGUgX2NvbnRleHQ6IENoYW5uZWxDb250ZXh0O1xuICAgIHByaXZhdGUgX2NvbmZpZzogUmVxdWlyZWQ8V29ya2VyQ29udGV4dENvbmZpZz47XG4gICAgcHJpdmF0ZSBfc3Vic2NyaXB0aW9uczogU3Vic2NyaXB0aW9uW10gPSBbXTtcblxuICAgIC8vIE9ic2VydmFibGUgc3RyZWFtcyBmb3IgaW5jb21pbmcgY29ubmVjdGlvbnNcbiAgICBwcml2YXRlIF9pbmNvbWluZ0Nvbm5lY3Rpb25zID0gbmV3IENoYW5uZWxTdWJqZWN0PEluY29taW5nQ29ubmVjdGlvbj4oeyBidWZmZXJTaXplOiAxMDAgfSk7XG4gICAgcHJpdmF0ZSBfY2hhbm5lbENyZWF0ZWQgPSBuZXcgQ2hhbm5lbFN1YmplY3Q8Q2hhbm5lbENyZWF0ZWRFdmVudD4oeyBidWZmZXJTaXplOiAxMDAgfSk7XG4gICAgcHJpdmF0ZSBfY2hhbm5lbENsb3NlZCA9IG5ldyBDaGFubmVsU3ViamVjdDx7IGNoYW5uZWw6IHN0cmluZzsgdGltZXN0YW1wOiBudW1iZXIgfT4oKTtcblxuICAgIGNvbnN0cnVjdG9yKGNvbmZpZzogV29ya2VyQ29udGV4dENvbmZpZyA9IHt9KSB7XG4gICAgICAgIHRoaXMuX2NvbmZpZyA9IHtcbiAgICAgICAgICAgIG5hbWU6IGNvbmZpZy5uYW1lID8/IFwid29ya2VyXCIsXG4gICAgICAgICAgICB3b3JrZXJOYW1lOiBjb25maWcud29ya2VyTmFtZSA/PyBgd29ya2VyLSR7VVVJRHY0KCkuc2xpY2UoMCwgOCl9YCxcbiAgICAgICAgICAgIGF1dG9BY2NlcHRDaGFubmVsczogY29uZmlnLmF1dG9BY2NlcHRDaGFubmVscyA/PyB0cnVlLFxuICAgICAgICAgICAgYWxsb3dlZENoYW5uZWxzOiBjb25maWcuYWxsb3dlZENoYW5uZWxzID8/IFtdLFxuICAgICAgICAgICAgbWF4Q2hhbm5lbHM6IGNvbmZpZy5tYXhDaGFubmVscyA/PyAxMDAsXG4gICAgICAgICAgICBhdXRvQ29ubmVjdDogY29uZmlnLmF1dG9Db25uZWN0ID8/IHRydWUsXG4gICAgICAgICAgICB1c2VHbG9iYWxTZWxmOiB0cnVlLFxuICAgICAgICAgICAgZGVmYXVsdE9wdGlvbnM6IGNvbmZpZy5kZWZhdWx0T3B0aW9ucyA/PyB7fSxcbiAgICAgICAgICAgIGlzb2xhdGVkU3RvcmFnZTogY29uZmlnLmlzb2xhdGVkU3RvcmFnZSA/PyBmYWxzZSxcbiAgICAgICAgICAgIC4uLmNvbmZpZ1xuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMuX2NvbnRleHQgPSBjcmVhdGVDaGFubmVsQ29udGV4dCh7XG4gICAgICAgICAgICBuYW1lOiB0aGlzLl9jb25maWcubmFtZSxcbiAgICAgICAgICAgIHVzZUdsb2JhbFNlbGY6IHRydWUsXG4gICAgICAgICAgICBkZWZhdWx0T3B0aW9uczogY29uZmlnLmRlZmF1bHRPcHRpb25zXG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMuX3NldHVwTWVzc2FnZUxpc3RlbmVyKCk7XG4gICAgfVxuXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgLy8gSU5DT01JTkcgQ09OTkVDVElPTiBPQlNFUlZBQkxFU1xuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4gICAgLyoqXG4gICAgICogT2JzZXJ2YWJsZTogTmV3IGluY29taW5nIGNvbm5lY3Rpb24gcmVxdWVzdHNcbiAgICAgKi9cbiAgICBnZXQgb25Db25uZWN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5faW5jb21pbmdDb25uZWN0aW9ucztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBPYnNlcnZhYmxlOiBDaGFubmVsIGNyZWF0ZWQgZXZlbnRzXG4gICAgICovXG4gICAgZ2V0IG9uQ2hhbm5lbENyZWF0ZWQoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9jaGFubmVsQ3JlYXRlZDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBPYnNlcnZhYmxlOiBDaGFubmVsIGNsb3NlZCBldmVudHNcbiAgICAgKi9cbiAgICBnZXQgb25DaGFubmVsQ2xvc2VkKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fY2hhbm5lbENsb3NlZDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBTdWJzY3JpYmUgdG8gaW5jb21pbmcgY29ubmVjdGlvbnNcbiAgICAgKi9cbiAgICBzdWJzY3JpYmVDb25uZWN0aW9ucyhcbiAgICAgICAgaGFuZGxlcjogKGNvbm46IEluY29taW5nQ29ubmVjdGlvbikgPT4gdm9pZFxuICAgICk6IFN1YnNjcmlwdGlvbiB7XG4gICAgICAgIHJldHVybiB0aGlzLl9pbmNvbWluZ0Nvbm5lY3Rpb25zLnN1YnNjcmliZShoYW5kbGVyKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBTdWJzY3JpYmUgdG8gY2hhbm5lbCBjcmVhdGlvblxuICAgICAqL1xuICAgIHN1YnNjcmliZUNoYW5uZWxDcmVhdGVkKFxuICAgICAgICBoYW5kbGVyOiAoZXZlbnQ6IENoYW5uZWxDcmVhdGVkRXZlbnQpID0+IHZvaWRcbiAgICApOiBTdWJzY3JpcHRpb24ge1xuICAgICAgICByZXR1cm4gdGhpcy5fY2hhbm5lbENyZWF0ZWQuc3Vic2NyaWJlKGhhbmRsZXIpO1xuICAgIH1cblxuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIC8vIENIQU5ORUwgTUFOQUdFTUVOVFxuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4gICAgLyoqXG4gICAgICogQWNjZXB0IGFuIGluY29taW5nIGNvbm5lY3Rpb24gYW5kIGNyZWF0ZSB0aGUgY2hhbm5lbFxuICAgICAqL1xuICAgIGFjY2VwdENvbm5lY3Rpb24oY29ubmVjdGlvbjogSW5jb21pbmdDb25uZWN0aW9uKTogQ2hhbm5lbEVuZHBvaW50IHwgbnVsbCB7XG4gICAgICAgIGlmICghdGhpcy5fY2FuQWNjZXB0Q2hhbm5lbChjb25uZWN0aW9uLmNoYW5uZWwpKSB7XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGVuZHBvaW50ID0gdGhpcy5fY29udGV4dC5jcmVhdGVDaGFubmVsKGNvbm5lY3Rpb24uY2hhbm5lbCwgY29ubmVjdGlvbi5vcHRpb25zKTtcblxuICAgICAgICAvLyBTZXR1cCByZW1vdGUgY29ubmVjdGlvblxuICAgICAgICBpZiAoY29ubmVjdGlvbi5wb3J0KSB7XG4gICAgICAgICAgICBjb25uZWN0aW9uLnBvcnQuc3RhcnQ/LigpO1xuICAgICAgICAgICAgZW5kcG9pbnQuaGFuZGxlci5jcmVhdGVSZW1vdGVDaGFubmVsKFxuICAgICAgICAgICAgICAgIGNvbm5lY3Rpb24uc2VuZGVyLFxuICAgICAgICAgICAgICAgIGNvbm5lY3Rpb24ub3B0aW9ucyxcbiAgICAgICAgICAgICAgICBjb25uZWN0aW9uLnBvcnRcbiAgICAgICAgICAgICk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLl9jaGFubmVsQ3JlYXRlZC5uZXh0KHtcbiAgICAgICAgICAgIGNoYW5uZWw6IGNvbm5lY3Rpb24uY2hhbm5lbCxcbiAgICAgICAgICAgIGVuZHBvaW50LFxuICAgICAgICAgICAgc2VuZGVyOiBjb25uZWN0aW9uLnNlbmRlcixcbiAgICAgICAgICAgIHRpbWVzdGFtcDogRGF0ZS5ub3coKVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBOb3RpZnkgc2VuZGVyXG4gICAgICAgIHRoaXMuX3Bvc3RDaGFubmVsQ3JlYXRlZChjb25uZWN0aW9uLmNoYW5uZWwsIGNvbm5lY3Rpb24uc2VuZGVyLCBjb25uZWN0aW9uLmlkKTtcblxuICAgICAgICByZXR1cm4gZW5kcG9pbnQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlIGEgbmV3IGNoYW5uZWwgaW4gdGhpcyB3b3JrZXIgY29udGV4dFxuICAgICAqL1xuICAgIGNyZWF0ZUNoYW5uZWwobmFtZTogc3RyaW5nLCBvcHRpb25zPzogYW55KTogQ2hhbm5lbEVuZHBvaW50IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2NvbnRleHQuY3JlYXRlQ2hhbm5lbChuYW1lLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgYW4gZXhpc3RpbmcgY2hhbm5lbFxuICAgICAqL1xuICAgIGdldENoYW5uZWwobmFtZTogc3RyaW5nKTogQ2hhbm5lbEVuZHBvaW50IHwgdW5kZWZpbmVkIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2NvbnRleHQuZ2V0Q2hhbm5lbChuYW1lKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDaGVjayBpZiBjaGFubmVsIGV4aXN0c1xuICAgICAqL1xuICAgIGhhc0NoYW5uZWwobmFtZTogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzLl9jb250ZXh0Lmhhc0NoYW5uZWwobmFtZSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IGFsbCBjaGFubmVsIG5hbWVzXG4gICAgICovXG4gICAgZ2V0Q2hhbm5lbE5hbWVzKCk6IHN0cmluZ1tdIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2NvbnRleHQuZ2V0Q2hhbm5lbE5hbWVzKCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUXVlcnkgY3VycmVudGx5IHRyYWNrZWQgY2hhbm5lbCBjb25uZWN0aW9ucyBpbiB0aGlzIHdvcmtlci5cbiAgICAgKi9cbiAgICBxdWVyeUNvbm5lY3Rpb25zKHF1ZXJ5OiBRdWVyeUNvbm5lY3Rpb25zT3B0aW9ucyA9IHt9KTogQ29udGV4dENvbm5lY3Rpb25JbmZvW10ge1xuICAgICAgICByZXR1cm4gdGhpcy5fY29udGV4dC5xdWVyeUNvbm5lY3Rpb25zKHF1ZXJ5KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBOb3RpZnkgYWN0aXZlIGNvbm5lY3Rpb25zICh1c2VmdWwgZm9yIHdvcmtlcjwtPmhvc3Qgc3luYykuXG4gICAgICovXG4gICAgbm90aWZ5Q29ubmVjdGlvbnMocGF5bG9hZDogYW55ID0ge30sIHF1ZXJ5OiBRdWVyeUNvbm5lY3Rpb25zT3B0aW9ucyA9IHt9KTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2NvbnRleHQubm90aWZ5Q29ubmVjdGlvbnMocGF5bG9hZCwgcXVlcnkpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENsb3NlIGEgc3BlY2lmaWMgY2hhbm5lbFxuICAgICAqL1xuICAgIGNsb3NlQ2hhbm5lbChuYW1lOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICAgICAgY29uc3QgY2xvc2VkID0gdGhpcy5fY29udGV4dC5jbG9zZUNoYW5uZWwobmFtZSk7XG4gICAgICAgIGlmIChjbG9zZWQpIHtcbiAgICAgICAgICAgIHRoaXMuX2NoYW5uZWxDbG9zZWQubmV4dCh7IGNoYW5uZWw6IG5hbWUsIHRpbWVzdGFtcDogRGF0ZS5ub3coKSB9KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gY2xvc2VkO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCB0aGUgdW5kZXJseWluZyBjb250ZXh0XG4gICAgICovXG4gICAgZ2V0IGNvbnRleHQoKTogQ2hhbm5lbENvbnRleHQge1xuICAgICAgICByZXR1cm4gdGhpcy5fY29udGV4dDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgd29ya2VyIGNvbmZpZ3VyYXRpb25cbiAgICAgKi9cbiAgICBnZXQgY29uZmlnKCk6IFJlYWRvbmx5PFJlcXVpcmVkPFdvcmtlckNvbnRleHRDb25maWc+PiB7XG4gICAgICAgIHJldHVybiB0aGlzLl9jb25maWc7XG4gICAgfVxuXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgLy8gUFJJVkFURSBNRVRIT0RTXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbiAgICBwcml2YXRlIF9zZXR1cE1lc3NhZ2VMaXN0ZW5lcigpOiB2b2lkIHtcbiAgICAgICAgYWRkRXZlbnRMaXN0ZW5lcihcIm1lc3NhZ2VcIiwgKChldmVudDogTWVzc2FnZUV2ZW50KSA9PiB7XG4gICAgICAgICAgICB0aGlzLl9oYW5kbGVJbmNvbWluZ01lc3NhZ2UoZXZlbnQpO1xuICAgICAgICB9KSBhcyBFdmVudExpc3RlbmVyKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIF9oYW5kbGVJbmNvbWluZ01lc3NhZ2UoZXZlbnQ6IE1lc3NhZ2VFdmVudCk6IHZvaWQge1xuICAgICAgICBjb25zdCBkYXRhID0gZXZlbnQuZGF0YTtcbiAgICAgICAgaWYgKCFkYXRhIHx8IHR5cGVvZiBkYXRhICE9PSBcIm9iamVjdFwiKSByZXR1cm47XG5cbiAgICAgICAgc3dpdGNoIChkYXRhLnR5cGUpIHtcbiAgICAgICAgICAgIGNhc2UgXCJjcmVhdGVDaGFubmVsXCI6XG4gICAgICAgICAgICAgICAgdGhpcy5faGFuZGxlQ3JlYXRlQ2hhbm5lbChkYXRhKTtcbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgY2FzZSBcImNvbm5lY3RDaGFubmVsXCI6XG4gICAgICAgICAgICAgICAgdGhpcy5faGFuZGxlQ29ubmVjdENoYW5uZWwoZGF0YSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIGNhc2UgXCJhZGRQb3J0XCI6XG4gICAgICAgICAgICAgICAgdGhpcy5faGFuZGxlQWRkUG9ydChkYXRhKTtcbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgY2FzZSBcImxpc3RDaGFubmVsc1wiOlxuICAgICAgICAgICAgICAgIHRoaXMuX2hhbmRsZUxpc3RDaGFubmVscyhkYXRhKTtcbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgY2FzZSBcImNsb3NlQ2hhbm5lbFwiOlxuICAgICAgICAgICAgICAgIHRoaXMuX2hhbmRsZUNsb3NlQ2hhbm5lbChkYXRhKTtcbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgY2FzZSBcInBpbmdcIjpcbiAgICAgICAgICAgICAgICBwb3N0TWVzc2FnZSh7IHR5cGU6IFwicG9uZ1wiLCBpZDogZGF0YS5pZCwgdGltZXN0YW1wOiBEYXRlLm5vdygpIH0pO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIC8vIFBhc3MgdG8gZXhpc3RpbmcgaGFuZGxlciBvciBsb2dcbiAgICAgICAgICAgICAgICBpZiAoZGF0YS5jaGFubmVsICYmIHRoaXMuX2NvbnRleHQuaGFzQ2hhbm5lbChkYXRhLmNoYW5uZWwpKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFJvdXRlIHRvIHNwZWNpZmljIGNoYW5uZWxcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZW5kcG9pbnQgPSB0aGlzLl9jb250ZXh0LmdldENoYW5uZWwoZGF0YS5jaGFubmVsKTtcbiAgICAgICAgICAgICAgICAgICAgZW5kcG9pbnQ/LmhhbmRsZXI/LmhhbmRsZUFuZFJlc3BvbnNlPy4oZGF0YS5wYXlsb2FkLCBkYXRhLnJlcUlkKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIF9oYW5kbGVDcmVhdGVDaGFubmVsKGRhdGE6IGFueSk6IHZvaWQge1xuICAgICAgICBjb25zdCBjb25uZWN0aW9uOiBJbmNvbWluZ0Nvbm5lY3Rpb24gPSB7XG4gICAgICAgICAgICBpZDogZGF0YS5yZXFJZCA/PyBVVUlEdjQoKSxcbiAgICAgICAgICAgIGNoYW5uZWw6IGRhdGEuY2hhbm5lbCxcbiAgICAgICAgICAgIHNlbmRlcjogZGF0YS5zZW5kZXIgPz8gXCJ1bmtub3duXCIsXG4gICAgICAgICAgICB0eXBlOiBcImNoYW5uZWxcIixcbiAgICAgICAgICAgIHBvcnQ6IGRhdGEubWVzc2FnZVBvcnQsXG4gICAgICAgICAgICB0aW1lc3RhbXA6IERhdGUubm93KCksXG4gICAgICAgICAgICBvcHRpb25zOiBkYXRhLm9wdGlvbnNcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBFbWl0IHRvIG9ic2VydmVyc1xuICAgICAgICB0aGlzLl9pbmNvbWluZ0Nvbm5lY3Rpb25zLm5leHQoY29ubmVjdGlvbik7XG5cbiAgICAgICAgLy8gQXV0by1hY2NlcHQgaWYgY29uZmlndXJlZFxuICAgICAgICBpZiAodGhpcy5fY29uZmlnLmF1dG9BY2NlcHRDaGFubmVscykge1xuICAgICAgICAgICAgdGhpcy5hY2NlcHRDb25uZWN0aW9uKGNvbm5lY3Rpb24pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBfaGFuZGxlQ29ubmVjdENoYW5uZWwoZGF0YTogYW55KTogdm9pZCB7XG4gICAgICAgIGNvbnN0IGNvbm5lY3Rpb246IEluY29taW5nQ29ubmVjdGlvbiA9IHtcbiAgICAgICAgICAgIGlkOiBkYXRhLnJlcUlkID8/IFVVSUR2NCgpLFxuICAgICAgICAgICAgY2hhbm5lbDogZGF0YS5jaGFubmVsLFxuICAgICAgICAgICAgc2VuZGVyOiBkYXRhLnNlbmRlciA/PyBcInVua25vd25cIixcbiAgICAgICAgICAgIHR5cGU6IGRhdGEucG9ydFR5cGUgPz8gXCJjaGFubmVsXCIsXG4gICAgICAgICAgICBwb3J0OiBkYXRhLnBvcnQsXG4gICAgICAgICAgICB0aW1lc3RhbXA6IERhdGUubm93KCksXG4gICAgICAgICAgICBvcHRpb25zOiBkYXRhLm9wdGlvbnNcbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLl9pbmNvbWluZ0Nvbm5lY3Rpb25zLm5leHQoY29ubmVjdGlvbik7XG5cbiAgICAgICAgaWYgKHRoaXMuX2NvbmZpZy5hdXRvQWNjZXB0Q2hhbm5lbHMgJiYgdGhpcy5fY2FuQWNjZXB0Q2hhbm5lbChkYXRhLmNoYW5uZWwpKSB7XG4gICAgICAgICAgICAvLyBDb25uZWN0IHRvIGV4aXN0aW5nIGNoYW5uZWwgb3IgY3JlYXRlIG5ld1xuICAgICAgICAgICAgY29uc3QgZW5kcG9pbnQgPSB0aGlzLl9jb250ZXh0LmdldE9yQ3JlYXRlQ2hhbm5lbChkYXRhLmNoYW5uZWwsIGRhdGEub3B0aW9ucyk7XG5cbiAgICAgICAgICAgIGlmIChkYXRhLnBvcnQpIHtcbiAgICAgICAgICAgICAgICBkYXRhLnBvcnQuc3RhcnQ/LigpO1xuICAgICAgICAgICAgICAgIGVuZHBvaW50LmhhbmRsZXIuY3JlYXRlUmVtb3RlQ2hhbm5lbChkYXRhLnNlbmRlciwgZGF0YS5vcHRpb25zLCBkYXRhLnBvcnQpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBwb3N0TWVzc2FnZSh7XG4gICAgICAgICAgICAgICAgdHlwZTogXCJjaGFubmVsQ29ubmVjdGVkXCIsXG4gICAgICAgICAgICAgICAgY2hhbm5lbDogZGF0YS5jaGFubmVsLFxuICAgICAgICAgICAgICAgIHJlcUlkOiBkYXRhLnJlcUlkXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgX2hhbmRsZUFkZFBvcnQoZGF0YTogYW55KTogdm9pZCB7XG4gICAgICAgIGlmICghZGF0YS5wb3J0IHx8ICFkYXRhLmNoYW5uZWwpIHJldHVybjtcblxuICAgICAgICBjb25zdCBjb25uZWN0aW9uOiBJbmNvbWluZ0Nvbm5lY3Rpb24gPSB7XG4gICAgICAgICAgICBpZDogZGF0YS5yZXFJZCA/PyBVVUlEdjQoKSxcbiAgICAgICAgICAgIGNoYW5uZWw6IGRhdGEuY2hhbm5lbCxcbiAgICAgICAgICAgIHNlbmRlcjogZGF0YS5zZW5kZXIgPz8gXCJ1bmtub3duXCIsXG4gICAgICAgICAgICB0eXBlOiBcInBvcnRcIixcbiAgICAgICAgICAgIHBvcnQ6IGRhdGEucG9ydCxcbiAgICAgICAgICAgIHRpbWVzdGFtcDogRGF0ZS5ub3coKSxcbiAgICAgICAgICAgIG9wdGlvbnM6IGRhdGEub3B0aW9uc1xuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMuX2luY29taW5nQ29ubmVjdGlvbnMubmV4dChjb25uZWN0aW9uKTtcblxuICAgICAgICBpZiAodGhpcy5fY29uZmlnLmF1dG9BY2NlcHRDaGFubmVscykge1xuICAgICAgICAgICAgdGhpcy5hY2NlcHRDb25uZWN0aW9uKGNvbm5lY3Rpb24pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBfaGFuZGxlTGlzdENoYW5uZWxzKGRhdGE6IGFueSk6IHZvaWQge1xuICAgICAgICBwb3N0TWVzc2FnZSh7XG4gICAgICAgICAgICB0eXBlOiBcImNoYW5uZWxMaXN0XCIsXG4gICAgICAgICAgICBjaGFubmVsczogdGhpcy5nZXRDaGFubmVsTmFtZXMoKSxcbiAgICAgICAgICAgIHJlcUlkOiBkYXRhLnJlcUlkXG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHByaXZhdGUgX2hhbmRsZUNsb3NlQ2hhbm5lbChkYXRhOiBhbnkpOiB2b2lkIHtcbiAgICAgICAgaWYgKGRhdGEuY2hhbm5lbCkge1xuICAgICAgICAgICAgdGhpcy5jbG9zZUNoYW5uZWwoZGF0YS5jaGFubmVsKTtcbiAgICAgICAgICAgIHBvc3RNZXNzYWdlKHtcbiAgICAgICAgICAgICAgICB0eXBlOiBcImNoYW5uZWxDbG9zZWRcIixcbiAgICAgICAgICAgICAgICBjaGFubmVsOiBkYXRhLmNoYW5uZWwsXG4gICAgICAgICAgICAgICAgcmVxSWQ6IGRhdGEucmVxSWRcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBfY2FuQWNjZXB0Q2hhbm5lbChjaGFubmVsOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICAgICAgLy8gQ2hlY2sgbWF4IGNoYW5uZWxzXG4gICAgICAgIGlmICh0aGlzLl9jb250ZXh0LnNpemUgPj0gdGhpcy5fY29uZmlnLm1heENoYW5uZWxzKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDaGVjayB3aGl0ZWxpc3RcbiAgICAgICAgaWYgKHRoaXMuX2NvbmZpZy5hbGxvd2VkQ2hhbm5lbHMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2NvbmZpZy5hbGxvd2VkQ2hhbm5lbHMuaW5jbHVkZXMoY2hhbm5lbCk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICBwcml2YXRlIF9wb3N0Q2hhbm5lbENyZWF0ZWQoY2hhbm5lbDogc3RyaW5nLCBzZW5kZXI6IHN0cmluZywgcmVxSWQ/OiBzdHJpbmcpOiB2b2lkIHtcbiAgICAgICAgcG9zdE1lc3NhZ2Uoe1xuICAgICAgICAgICAgdHlwZTogXCJjaGFubmVsQ3JlYXRlZFwiLFxuICAgICAgICAgICAgY2hhbm5lbCxcbiAgICAgICAgICAgIHNlbmRlcixcbiAgICAgICAgICAgIHJlcUlkLFxuICAgICAgICAgICAgdGltZXN0YW1wOiBEYXRlLm5vdygpXG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIC8vIExJRkVDWUNMRVxuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4gICAgY2xvc2UoKTogdm9pZCB7XG4gICAgICAgIHRoaXMuX3N1YnNjcmlwdGlvbnMuZm9yRWFjaChzID0+IHMudW5zdWJzY3JpYmUoKSk7XG4gICAgICAgIHRoaXMuX3N1YnNjcmlwdGlvbnMgPSBbXTtcbiAgICAgICAgdGhpcy5faW5jb21pbmdDb25uZWN0aW9ucy5jb21wbGV0ZSgpO1xuICAgICAgICB0aGlzLl9jaGFubmVsQ3JlYXRlZC5jb21wbGV0ZSgpO1xuICAgICAgICB0aGlzLl9jaGFubmVsQ2xvc2VkLmNvbXBsZXRlKCk7XG4gICAgICAgIHRoaXMuX2NvbnRleHQuY2xvc2UoKTtcbiAgICB9XG59XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIEdMT0JBTCBXT1JLRVIgQ09OVEVYVCAoU2luZ2xldG9uKVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5sZXQgV09SS0VSX0NPTlRFWFQ6IFdvcmtlckNvbnRleHQgfCBudWxsID0gbnVsbDtcblxuLyoqXG4gKiBHZXQgb3IgY3JlYXRlIHRoZSB3b3JrZXIgY29udGV4dCBzaW5nbGV0b25cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFdvcmtlckNvbnRleHQoY29uZmlnPzogV29ya2VyQ29udGV4dENvbmZpZyk6IFdvcmtlckNvbnRleHQge1xuICAgIGlmICghV09SS0VSX0NPTlRFWFQpIHtcbiAgICAgICAgV09SS0VSX0NPTlRFWFQgPSBuZXcgV29ya2VyQ29udGV4dChjb25maWcpO1xuICAgIH1cbiAgICByZXR1cm4gV09SS0VSX0NPTlRFWFQ7XG59XG5cbi8qKlxuICogSW5pdGlhbGl6ZSB3b3JrZXIgY29udGV4dCB3aXRoIGNvbmZpZ1xuICovXG5leHBvcnQgZnVuY3Rpb24gaW5pdFdvcmtlckNvbnRleHQoY29uZmlnPzogV29ya2VyQ29udGV4dENvbmZpZyk6IFdvcmtlckNvbnRleHQge1xuICAgIFdPUktFUl9DT05URVhUPy5jbG9zZSgpO1xuICAgIFdPUktFUl9DT05URVhUID0gbmV3IFdvcmtlckNvbnRleHQoY29uZmlnKTtcbiAgICByZXR1cm4gV09SS0VSX0NPTlRFWFQ7XG59XG5cbi8qKlxuICogU3Vic2NyaWJlIHRvIGluY29taW5nIGNvbm5lY3Rpb25zIGluIHRoZSBnbG9iYWwgd29ya2VyIGNvbnRleHRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG9uV29ya2VyQ29ubmVjdGlvbihcbiAgICBoYW5kbGVyOiAoY29ubjogSW5jb21pbmdDb25uZWN0aW9uKSA9PiB2b2lkXG4pOiBTdWJzY3JpcHRpb24ge1xuICAgIHJldHVybiBnZXRXb3JrZXJDb250ZXh0KCkuc3Vic2NyaWJlQ29ubmVjdGlvbnMoaGFuZGxlcik7XG59XG5cbi8qKlxuICogU3Vic2NyaWJlIHRvIGNoYW5uZWwgY3JlYXRpb24gaW4gdGhlIGdsb2JhbCB3b3JrZXIgY29udGV4dFxuICovXG5leHBvcnQgZnVuY3Rpb24gb25Xb3JrZXJDaGFubmVsQ3JlYXRlZChcbiAgICBoYW5kbGVyOiAoZXZlbnQ6IENoYW5uZWxDcmVhdGVkRXZlbnQpID0+IHZvaWRcbik6IFN1YnNjcmlwdGlvbiB7XG4gICAgcmV0dXJuIGdldFdvcmtlckNvbnRleHQoKS5zdWJzY3JpYmVDaGFubmVsQ3JlYXRlZChoYW5kbGVyKTtcbn1cblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gSU5WT0tFUiBJTlRFR1JBVElPTlxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5pbXBvcnQge1xuICAgIFJlc3BvbmRlcixcbiAgICBCaWRpcmVjdGlvbmFsSW52b2tlcixcbiAgICBjcmVhdGVSZXNwb25kZXIsXG4gICAgY3JlYXRlSW52b2tlcixcbiAgICBkZXRlY3RDb250ZXh0VHlwZSxcbiAgICBkZXRlY3RUcmFuc3BvcnRUeXBlLFxuICAgIHR5cGUgQ29udGV4dFR5cGUsXG4gICAgdHlwZSBJbmNvbWluZ0ludm9jYXRpb25cbn0gZnJvbSBcIi4uL3Byb3h5L0ludm9rZXJcIjtcblxubGV0IFdPUktFUl9SRVNQT05ERVI6IFJlc3BvbmRlciB8IG51bGwgPSBudWxsO1xubGV0IFdPUktFUl9JTlZPS0VSOiBCaWRpcmVjdGlvbmFsSW52b2tlciB8IG51bGwgPSBudWxsO1xuXG4vKipcbiAqIEdldCB0aGUgd29ya2VyJ3MgUmVzcG9uZGVyIChmb3IgaGFuZGxpbmcgaW5jb21pbmcgaW52b2NhdGlvbnMpXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRXb3JrZXJSZXNwb25kZXIoY2hhbm5lbD86IHN0cmluZyk6IFJlc3BvbmRlciB7XG4gICAgaWYgKCFXT1JLRVJfUkVTUE9OREVSKSB7XG4gICAgICAgIFdPUktFUl9SRVNQT05ERVIgPSBjcmVhdGVSZXNwb25kZXIoY2hhbm5lbCA/PyBcIndvcmtlclwiKTtcbiAgICAgICAgV09SS0VSX1JFU1BPTkRFUi5saXN0ZW4oc2VsZik7XG4gICAgfVxuICAgIHJldHVybiBXT1JLRVJfUkVTUE9OREVSO1xufVxuXG4vKipcbiAqIEdldCB0aGUgd29ya2VyJ3MgYmlkaXJlY3Rpb25hbCBJbnZva2VyXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRXb3JrZXJJbnZva2VyKGNoYW5uZWw/OiBzdHJpbmcpOiBCaWRpcmVjdGlvbmFsSW52b2tlciB7XG4gICAgaWYgKCFXT1JLRVJfSU5WT0tFUikge1xuICAgICAgICBXT1JLRVJfSU5WT0tFUiA9IGNyZWF0ZUludm9rZXIoY2hhbm5lbCA/PyBcIndvcmtlclwiKTtcbiAgICAgICAgV09SS0VSX0lOVk9LRVIuY29ubmVjdChzZWxmKTtcbiAgICB9XG4gICAgcmV0dXJuIFdPUktFUl9JTlZPS0VSO1xufVxuXG4vKipcbiAqIEV4cG9zZSBhbiBvYmplY3QgZm9yIHJlbW90ZSBpbnZvY2F0aW9uIGZyb20gdGhlIHdvcmtlclxuICovXG5leHBvcnQgZnVuY3Rpb24gZXhwb3NlRnJvbVdvcmtlcihuYW1lOiBzdHJpbmcsIG9iajogYW55KTogdm9pZCB7XG4gICAgZ2V0V29ya2VyUmVzcG9uZGVyKCkuZXhwb3NlKG5hbWUsIG9iaik7XG59XG5cbi8qKlxuICogU3Vic2NyaWJlIHRvIGluY29taW5nIGludm9jYXRpb25zIGluIHRoZSB3b3JrZXJcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG9uV29ya2VySW52b2NhdGlvbihcbiAgICBoYW5kbGVyOiAoaW52OiBJbmNvbWluZ0ludm9jYXRpb24pID0+IHZvaWRcbik6IFN1YnNjcmlwdGlvbiB7XG4gICAgcmV0dXJuIGdldFdvcmtlclJlc3BvbmRlcigpLnN1YnNjcmliZUludm9jYXRpb25zKGhhbmRsZXIpO1xufVxuXG4vKipcbiAqIENyZWF0ZSBhIHByb3h5IHRvIGludm9rZSBtZXRob2RzIG9uIHRoZSBob3N0IGZyb20gdGhlIHdvcmtlclxuICovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlSG9zdFByb3h5PFQgPSBhbnk+KGhvc3RDaGFubmVsOiBzdHJpbmcgPSBcImhvc3RcIiwgYmFzZVBhdGg6IHN0cmluZ1tdID0gW10pOiBUIHtcbiAgICByZXR1cm4gZ2V0V29ya2VySW52b2tlcigpLmNyZWF0ZVByb3h5PFQ+KGhvc3RDaGFubmVsLCBiYXNlUGF0aCk7XG59XG5cbi8qKlxuICogSW1wb3J0IGEgbW9kdWxlIGluIHRoZSBob3N0IGNvbnRleHQgZnJvbSB0aGUgd29ya2VyXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpbXBvcnRJbkhvc3Q8VCA9IGFueT4odXJsOiBzdHJpbmcsIGhvc3RDaGFubmVsOiBzdHJpbmcgPSBcImhvc3RcIik6IFByb21pc2U8VD4ge1xuICAgIHJldHVybiBnZXRXb3JrZXJJbnZva2VyKCkuaW1wb3J0TW9kdWxlPFQ+KGhvc3RDaGFubmVsLCB1cmwpO1xufVxuXG4vLyBSZS1leHBvcnQgZGV0ZWN0aW9uIHV0aWxpdGllc1xuZXhwb3J0IHsgZGV0ZWN0Q29udGV4dFR5cGUsIGRldGVjdFRyYW5zcG9ydFR5cGUgfTtcbmV4cG9ydCB0eXBlIHsgQ29udGV4dFR5cGUsIEluY29taW5nSW52b2NhdGlvbiB9O1xuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBBVVRPLUlOSVRJQUxJWkUgKENvbXBhdGlibGUgd2l0aCBsZWdhY3kgdXNhZ2UpXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8vIEluaXRpYWxpemUgdGhlIHdvcmtlciBjb250ZXh0XG5jb25zdCBjdHggPSBnZXRXb3JrZXJDb250ZXh0KHsgbmFtZTogXCJ3b3JrZXJcIiB9KTtcblxuLy8gRXhwb3J0IGZvciBkaXJlY3QgYWNjZXNzXG5leHBvcnQgeyBjdHggYXMgd29ya2VyQ29udGV4dCB9O1xuIl19