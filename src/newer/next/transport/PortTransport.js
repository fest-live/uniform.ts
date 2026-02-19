/**
 * MessagePort/MessageChannel Enhanced Transport
 *
 * Advanced port-based communication with:
 * - MessageChannel pair creation
 * - Port pooling and management
 * - Cross-context transfer (iframe, worker, window)
 * - Automatic reconnection
 * - Request/response with timeout
 */
import { UUIDv4 } from "fest/core";
import { ChannelSubject } from "../observable/Observable";
// ============================================================================
// MESSAGE PORT TRANSPORT
// ============================================================================
export class PortTransport {
    _channelName;
    _config;
    _port;
    _subs = new Set();
    _pending = new Map();
    _listening = false;
    _cleanup = null;
    _portId = UUIDv4();
    _state = new ChannelSubject();
    _keepAliveTimer = null;
    constructor(port, _channelName, _config = {}) {
        this._channelName = _channelName;
        this._config = _config;
        this._port = port;
        this._setupPort();
        if (_config.autoStart !== false)
            this.start();
    }
    _setupPort() {
        const msgHandler = (e) => {
            const data = e.data;
            // Handle response
            if (data.type === "response" && data.reqId) {
                const p = this._pending.get(data.reqId);
                if (p) {
                    this._pending.delete(data.reqId);
                    if (data.payload?.error)
                        p.reject(new Error(data.payload.error));
                    else
                        p.resolve(data.payload?.result ?? data.payload);
                    return;
                }
            }
            // Handle keep-alive ping
            if (data.type === "signal" && data.payload?.action === "ping") {
                this.send({
                    id: UUIDv4(),
                    channel: this._channelName,
                    sender: this._portId,
                    type: "signal",
                    payload: { action: "pong" }
                });
                return;
            }
            data.portId = data.portId ?? this._portId;
            for (const s of this._subs) {
                try {
                    s.next?.(data);
                }
                catch (e) {
                    s.error?.(e);
                }
            }
        };
        const errHandler = () => {
            this._state.next("error");
            const err = new Error("Port error");
            for (const s of this._subs)
                s.error?.(err);
        };
        this._port.addEventListener("message", msgHandler);
        this._port.addEventListener("messageerror", errHandler);
        this._cleanup = () => {
            this._port.removeEventListener("message", msgHandler);
            this._port.removeEventListener("messageerror", errHandler);
        };
    }
    start() {
        if (this._listening)
            return;
        this._port.start();
        this._listening = true;
        this._state.next("ready");
        if (this._config.keepAlive) {
            this._startKeepAlive();
        }
    }
    send(msg, transfer) {
        const { transferable, ...data } = msg;
        this._port.postMessage({ ...data, portId: this._portId }, transfer ?? []);
    }
    request(msg) {
        const reqId = msg.reqId ?? UUIDv4();
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                this._pending.delete(reqId);
                reject(new Error("Request timeout"));
            }, this._config.timeout ?? 30000);
            this._pending.set(reqId, {
                resolve: (v) => { clearTimeout(timeout); resolve(v); },
                reject: (e) => { clearTimeout(timeout); reject(e); },
                timestamp: Date.now()
            });
            this.send({ ...msg, reqId, type: "request" });
        });
    }
    subscribe(observer) {
        const obs = typeof observer === "function" ? { next: observer } : observer;
        this._subs.add(obs);
        return {
            closed: false,
            unsubscribe: () => { this._subs.delete(obs); }
        };
    }
    _startKeepAlive() {
        this._keepAliveTimer = setInterval(() => {
            this.send({
                id: UUIDv4(),
                channel: this._channelName,
                sender: this._portId,
                type: "signal",
                payload: { action: "ping" }
            });
        }, this._config.keepAliveInterval ?? 30000);
    }
    close() {
        if (this._keepAliveTimer) {
            clearInterval(this._keepAliveTimer);
            this._keepAliveTimer = null;
        }
        this._cleanup?.();
        this._subs.forEach(s => s.complete?.());
        this._subs.clear();
        this._port.close();
        this._state.next("closed");
    }
    get port() { return this._port; }
    get portId() { return this._portId; }
    get isListening() { return this._listening; }
    get state() { return this._state; }
    get channelName() { return this._channelName; }
}
/**
 * Create a MessageChannel pair with configured local transport
 */
export function createChannelPair(channelName, config) {
    const channel = new MessageChannel();
    const local = new PortTransport(channel.port1, channelName, config);
    return {
        local,
        remote: channel.port2,
        transfer: () => {
            // Use ArrayBuffer.transfer-like semantics for port
            const port = channel.port2;
            return port;
        }
    };
}
/**
 * Create transport from remote port
 */
export function createFromPort(port, channelName, config) {
    return new PortTransport(port, channelName, config);
}
// ============================================================================
// PORT POOL (Multiplexed Channels)
// ============================================================================
export class PortPool {
    _defaultConfig;
    _channels = new Map();
    _mainPort = null;
    _subs = new Set();
    constructor(_defaultConfig = {}) {
        this._defaultConfig = _defaultConfig;
    }
    /**
     * Create new channel in pool
     */
    create(channelName, config) {
        const result = createChannelPair(channelName, { ...this._defaultConfig, ...config });
        result.local.subscribe({
            next: (msg) => {
                for (const s of this._subs) {
                    try {
                        s.next?.(msg);
                    }
                    catch (e) {
                        s.error?.(e);
                    }
                }
            }
        });
        this._channels.set(channelName, result.local);
        return result;
    }
    /**
     * Add existing port to pool
     */
    add(channelName, port, config) {
        const transport = new PortTransport(port, channelName, { ...this._defaultConfig, ...config });
        transport.subscribe({
            next: (msg) => {
                for (const s of this._subs) {
                    try {
                        s.next?.(msg);
                    }
                    catch (e) {
                        s.error?.(e);
                    }
                }
            }
        });
        this._channels.set(channelName, transport);
        return transport;
    }
    /**
     * Get channel by name
     */
    get(channelName) {
        return this._channels.get(channelName);
    }
    /**
     * Send to specific channel
     */
    send(channelName, msg, transfer) {
        this._channels.get(channelName)?.send(msg, transfer);
    }
    /**
     * Broadcast to all channels
     */
    broadcast(msg, transfer) {
        for (const transport of this._channels.values()) {
            transport.send(msg, transfer);
        }
    }
    /**
     * Request on specific channel
     */
    request(channelName, msg) {
        const channel = this._channels.get(channelName);
        if (!channel)
            return Promise.reject(new Error(`Channel ${channelName} not found`));
        return channel.request(msg);
    }
    /**
     * Subscribe to all channels
     */
    subscribe(observer) {
        const obs = typeof observer === "function" ? { next: observer } : observer;
        this._subs.add(obs);
        return {
            closed: false,
            unsubscribe: () => { this._subs.delete(obs); }
        };
    }
    /**
     * Remove channel
     */
    remove(channelName) {
        const channel = this._channels.get(channelName);
        if (channel) {
            channel.close();
            this._channels.delete(channelName);
        }
    }
    /**
     * Close all channels
     */
    close() {
        this._subs.forEach(s => s.complete?.());
        this._subs.clear();
        for (const channel of this._channels.values()) {
            channel.close();
        }
        this._channels.clear();
    }
    get channelNames() { return Array.from(this._channels.keys()); }
    get size() { return this._channels.size; }
}
/**
 * Connect to window/iframe via MessageChannel
 */
export class WindowPortConnector {
    _target;
    _channelName;
    _config;
    _transport = null;
    _state = new ChannelSubject();
    _handshakeComplete = false;
    constructor(_target, _channelName, _config = {}) {
        this._target = _target;
        this._channelName = _channelName;
        this._config = _config;
    }
    /**
     * Initiate connection to target window
     */
    async connect() {
        if (this._transport && this._handshakeComplete) {
            return this._transport;
        }
        this._state.next("connecting");
        const { local, remote } = createChannelPair(this._channelName, this._config);
        // Send port to target window
        this._target.postMessage({
            type: "port-connect",
            channelName: this._channelName,
            portId: local.portId
        }, this._config.targetOrigin ?? "*", [remote]);
        // Wait for handshake
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error("Handshake timeout"));
                this._state.next("error");
            }, this._config.handshakeTimeout ?? 10000);
            const sub = local.subscribe({
                next: (msg) => {
                    if (msg.type === "signal" && msg.payload?.action === "handshake-ack") {
                        clearTimeout(timeout);
                        this._handshakeComplete = true;
                        this._transport = local;
                        this._state.next("connected");
                        sub.unsubscribe();
                        resolve(local);
                    }
                }
            });
        });
    }
    /**
     * Listen for incoming connections (target side)
     */
    static listen(channelName, handler, config) {
        const msgHandler = (e) => {
            if (e.data?.type !== "port-connect" || e.data?.channelName !== channelName)
                return;
            if (!e.ports[0])
                return;
            const transport = new PortTransport(e.ports[0], channelName, config);
            // Send handshake acknowledgment
            transport.send({
                id: UUIDv4(),
                channel: channelName,
                sender: transport.portId,
                type: "signal",
                payload: { action: "handshake-ack" }
            });
            handler(transport);
        };
        globalThis.addEventListener("message", msgHandler);
        return () => globalThis.removeEventListener("message", msgHandler);
    }
    disconnect() {
        this._transport?.close();
        this._transport = null;
        this._handshakeComplete = false;
        this._state.next("disconnected");
    }
    get isConnected() { return this._handshakeComplete; }
    get state() { return this._state; }
    get transport() { return this._transport; }
}
// ============================================================================
// COMLINK-LIKE PROXY OVER PORT (using unified Proxy module)
// ============================================================================
import { createSenderProxy, createExposeHandler } from "../proxy/Proxy";
/**
 * Create proxy for remote object over PortTransport
 *
 * Uses unified Proxy module for consistent behavior.
 */
export function createPortProxy(transport, targetPath = []) {
    return createSenderProxy({
        request: (msg) => transport.request(msg),
        channelName: transport.channelName,
        senderId: transport.portId
    }, targetPath);
}
/**
 * Expose object methods over PortTransport
 *
 * Uses unified Proxy module's expose handler.
 */
export function exposeOverPort(transport, target) {
    const handler = createExposeHandler(target);
    return transport.subscribe({
        next: async (msg) => {
            if (msg.type !== "request" || !msg.payload?.path)
                return;
            const { action, path, args } = msg.payload;
            let result;
            let error;
            try {
                result = await handler(action, path, args ?? []);
            }
            catch (e) {
                error = e instanceof Error ? e.message : String(e);
            }
            transport.send({
                id: UUIDv4(),
                channel: msg.sender,
                sender: transport.portId,
                type: "response",
                reqId: msg.reqId,
                payload: error ? { error } : { result }
            });
        }
    });
}
// ============================================================================
// FACTORY
// ============================================================================
export const PortTransportFactory = {
    create: (port, name, config) => new PortTransport(port, name, config),
    createPair: (name, config) => createChannelPair(name, config),
    createPool: (config) => new PortPool(config),
    createWindowConnector: (target, name, config) => new WindowPortConnector(target, name, config),
    listen: WindowPortConnector.listen,
    createProxy: createPortProxy,
    expose: exposeOverPort
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUG9ydFRyYW5zcG9ydC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIlBvcnRUcmFuc3BvcnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7OztHQVNHO0FBRUgsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLFdBQVcsQ0FBQztBQUNuQyxPQUFPLEVBQWMsY0FBYyxFQUFvQyxNQUFNLDBCQUEwQixDQUFDO0FBMEJ4RywrRUFBK0U7QUFDL0UseUJBQXlCO0FBQ3pCLCtFQUErRTtBQUUvRSxNQUFNLE9BQU8sYUFBYTtJQVlWO0lBQ0E7SUFaSixLQUFLLENBQWM7SUFDbkIsS0FBSyxHQUFHLElBQUksR0FBRyxFQUF5QixDQUFDO0lBQ3pDLFFBQVEsR0FBRyxJQUFJLEdBQUcsRUFBMEIsQ0FBQztJQUM3QyxVQUFVLEdBQUcsS0FBSyxDQUFDO0lBQ25CLFFBQVEsR0FBd0IsSUFBSSxDQUFDO0lBQ3JDLE9BQU8sR0FBVyxNQUFNLEVBQUUsQ0FBQztJQUMzQixNQUFNLEdBQUcsSUFBSSxjQUFjLEVBQWdDLENBQUM7SUFDNUQsZUFBZSxHQUEwQyxJQUFJLENBQUM7SUFFdEUsWUFDSSxJQUFpQixFQUNULFlBQW9CLEVBQ3BCLFVBQStCLEVBQUU7UUFEakMsaUJBQVksR0FBWixZQUFZLENBQVE7UUFDcEIsWUFBTyxHQUFQLE9BQU8sQ0FBMEI7UUFFekMsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUM7UUFDbEIsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO1FBQ2xCLElBQUksT0FBTyxDQUFDLFNBQVMsS0FBSyxLQUFLO1lBQUUsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO0lBQ2xELENBQUM7SUFFTyxVQUFVO1FBQ2QsTUFBTSxVQUFVLEdBQUcsQ0FBQyxDQUFlLEVBQUUsRUFBRTtZQUNuQyxNQUFNLElBQUksR0FBRyxDQUFDLENBQUMsSUFBbUIsQ0FBQztZQUVuQyxrQkFBa0I7WUFDbEIsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLFVB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SUFBaUIsRUFBRSxJQUFZLEVBQUUsTUFBNEIsRUFBRSxFQUFFLENBQ3RFLElBQUksYUFBYSxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsTUFBTSxDQUFDO0lBQ3pDLFVBQVUsRUFBRSxDQUFDLElBQVksRUFBRSxNQUE0QixFQUFFLEVBQUUsQ0FDdkQsaUJBQWlCLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQztJQUNuQyxVQUFVLEVBQUUsQ0FBQyxNQUE0QixFQUFFLEVBQUUsQ0FDekMsSUFBSSxRQUFRLENBQUMsTUFBTSxDQUFDO0lBQ3hCLHFCQUFxQixFQUFFLENBQUMsTUFBYyxFQUFFLElBQVksRUFBRSxNQUFrQyxFQUFFLEVBQUUsQ0FDeEYsSUFBSSxtQkFBbUIsQ0FBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLE1BQU0sQ0FBQztJQUNqRCxNQUFNLEVBQUUsbUJBQW1CLENBQUMsTUFBTTtJQUNsQyxXQUFXLEVBQUUsZUFBZTtJQUM1QixNQUFNLEVBQUUsY0FBYztDQUN6QixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBNZXNzYWdlUG9ydC9NZXNzYWdlQ2hhbm5lbCBFbmhhbmNlZCBUcmFuc3BvcnRcbiAqXG4gKiBBZHZhbmNlZCBwb3J0LWJhc2VkIGNvbW11bmljYXRpb24gd2l0aDpcbiAqIC0gTWVzc2FnZUNoYW5uZWwgcGFpciBjcmVhdGlvblxuICogLSBQb3J0IHBvb2xpbmcgYW5kIG1hbmFnZW1lbnRcbiAqIC0gQ3Jvc3MtY29udGV4dCB0cmFuc2ZlciAoaWZyYW1lLCB3b3JrZXIsIHdpbmRvdylcbiAqIC0gQXV0b21hdGljIHJlY29ubmVjdGlvblxuICogLSBSZXF1ZXN0L3Jlc3BvbnNlIHdpdGggdGltZW91dFxuICovXG5cbmltcG9ydCB7IFVVSUR2NCB9IGZyb20gXCJmZXN0L2NvcmVcIjtcbmltcG9ydCB7IE9ic2VydmFibGUsIENoYW5uZWxTdWJqZWN0LCB0eXBlIFN1YnNjcmlwdGlvbiwgdHlwZSBPYnNlcnZlciB9IGZyb20gXCIuLi9vYnNlcnZhYmxlL09ic2VydmFibGVcIjtcbmltcG9ydCB0eXBlIHsgQ2hhbm5lbE1lc3NhZ2UsIFBlbmRpbmdSZXF1ZXN0LCBTdWJzY3JpYmVyIH0gZnJvbSBcIi4uL3R5cGVzL0ludGVyZmFjZVwiO1xuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBUWVBFU1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5leHBvcnQgaW50ZXJmYWNlIFBvcnRNZXNzYWdlPFQgPSBhbnk+IGV4dGVuZHMgQ2hhbm5lbE1lc3NhZ2Uge1xuICAgIHBvcnRJZD86IHN0cmluZztcbiAgICBzb3VyY2VDb250ZXh0PzogXCJtYWluXCIgfCBcIndvcmtlclwiIHwgXCJpZnJhbWVcIiB8IFwid2luZG93XCI7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUG9ydFRyYW5zcG9ydENvbmZpZyB7XG4gICAgYXV0b1N0YXJ0PzogYm9vbGVhbjtcbiAgICB0aW1lb3V0PzogbnVtYmVyO1xuICAgIHJldHJ5T25FcnJvcj86IGJvb2xlYW47XG4gICAgbWF4UmV0cmllcz86IG51bWJlcjtcbiAgICBrZWVwQWxpdmU/OiBib29sZWFuO1xuICAgIGtlZXBBbGl2ZUludGVydmFsPzogbnVtYmVyO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFBvcnRQYWlyIHtcbiAgICBsb2NhbDogTWVzc2FnZVBvcnQ7XG4gICAgcmVtb3RlOiBNZXNzYWdlUG9ydDtcbn1cblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gTUVTU0FHRSBQT1JUIFRSQU5TUE9SVFxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5leHBvcnQgY2xhc3MgUG9ydFRyYW5zcG9ydCB7XG4gICAgcHJpdmF0ZSBfcG9ydDogTWVzc2FnZVBvcnQ7XG4gICAgcHJpdmF0ZSBfc3VicyA9IG5ldyBTZXQ8T2JzZXJ2ZXI8UG9ydE1lc3NhZ2U+PigpO1xuICAgIHByaXZhdGUgX3BlbmRpbmcgPSBuZXcgTWFwPHN0cmluZywgUGVuZGluZ1JlcXVlc3Q+KCk7XG4gICAgcHJpdmF0ZSBfbGlzdGVuaW5nID0gZmFsc2U7XG4gICAgcHJpdmF0ZSBfY2xlYW51cDogKCgpID0+IHZvaWQpIHwgbnVsbCA9IG51bGw7XG4gICAgcHJpdmF0ZSBfcG9ydElkOiBzdHJpbmcgPSBVVUlEdjQoKTtcbiAgICBwcml2YXRlIF9zdGF0ZSA9IG5ldyBDaGFubmVsU3ViamVjdDxcImNsb3NlZFwiIHwgXCJyZWFkeVwiIHwgXCJlcnJvclwiPigpO1xuICAgIHByaXZhdGUgX2tlZXBBbGl2ZVRpbWVyOiBSZXR1cm5UeXBlPHR5cGVvZiBzZXRJbnRlcnZhbD4gfCBudWxsID0gbnVsbDtcblxuICAgIGNvbnN0cnVjdG9yKFxuICAgICAgICBwb3J0OiBNZXNzYWdlUG9ydCxcbiAgICAgICAgcHJpdmF0ZSBfY2hhbm5lbE5hbWU6IHN0cmluZyxcbiAgICAgICAgcHJpdmF0ZSBfY29uZmlnOiBQb3J0VHJhbnNwb3J0Q29uZmlnID0ge31cbiAgICApIHtcbiAgICAgICAgdGhpcy5fcG9ydCA9IHBvcnQ7XG4gICAgICAgIHRoaXMuX3NldHVwUG9ydCgpO1xuICAgICAgICBpZiAoX2NvbmZpZy5hdXRvU3RhcnQgIT09IGZhbHNlKSB0aGlzLnN0YXJ0KCk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBfc2V0dXBQb3J0KCk6IHZvaWQge1xuICAgICAgICBjb25zdCBtc2dIYW5kbGVyID0gKGU6IE1lc3NhZ2VFdmVudCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgZGF0YSA9IGUuZGF0YSBhcyBQb3J0TWVzc2FnZTtcblxuICAgICAgICAgICAgLy8gSGFuZGxlIHJlc3BvbnNlXG4gICAgICAgICAgICBpZiAoZGF0YS50eXBlID09PSBcInJlc3BvbnNlXCIgJiYgZGF0YS5yZXFJZCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHAgPSB0aGlzLl9wZW5kaW5nLmdldChkYXRhLnJlcUlkKTtcbiAgICAgICAgICAgICAgICBpZiAocCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9wZW5kaW5nLmRlbGV0ZShkYXRhLnJlcUlkKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGRhdGEucGF5bG9hZD8uZXJyb3IpIHAucmVqZWN0KG5ldyBFcnJvcihkYXRhLnBheWxvYWQuZXJyb3IpKTtcbiAgICAgICAgICAgICAgICAgICAgZWxzZSBwLnJlc29sdmUoZGF0YS5wYXlsb2FkPy5yZXN1bHQgPz8gZGF0YS5wYXlsb2FkKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gSGFuZGxlIGtlZXAtYWxpdmUgcGluZ1xuICAgICAgICAgICAgaWYgKGRhdGEudHlwZSA9PT0gXCJzaWduYWxcIiAmJiBkYXRhLnBheWxvYWQ/LmFjdGlvbiA9PT0gXCJwaW5nXCIpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNlbmQoe1xuICAgICAgICAgICAgICAgICAgICBpZDogVVVJRHY0KCksXG4gICAgICAgICAgICAgICAgICAgIGNoYW5uZWw6IHRoaXMuX2NoYW5uZWxOYW1lLFxuICAgICAgICAgICAgICAgICAgICBzZW5kZXI6IHRoaXMuX3BvcnRJZCxcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogXCJzaWduYWxcIixcbiAgICAgICAgICAgICAgICAgICAgcGF5bG9hZDogeyBhY3Rpb246IFwicG9uZ1wiIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGRhdGEucG9ydElkID0gZGF0YS5wb3J0SWQgPz8gdGhpcy5fcG9ydElkO1xuXG4gICAgICAgICAgICBmb3IgKGNvbnN0IHMgb2YgdGhpcy5fc3Vicykge1xuICAgICAgICAgICAgICAgIHRyeSB7IHMubmV4dD8uKGRhdGEpOyB9IGNhdGNoIChlKSB7IHMuZXJyb3I/LihlIGFzIEVycm9yKTsgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIGNvbnN0IGVyckhhbmRsZXIgPSAoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLl9zdGF0ZS5uZXh0KFwiZXJyb3JcIik7XG4gICAgICAgICAgICBjb25zdCBlcnIgPSBuZXcgRXJyb3IoXCJQb3J0IGVycm9yXCIpO1xuICAgICAgICAgICAgZm9yIChjb25zdCBzIG9mIHRoaXMuX3N1YnMpIHMuZXJyb3I/LihlcnIpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMuX3BvcnQuYWRkRXZlbnRMaXN0ZW5lcihcIm1lc3NhZ2VcIiwgbXNnSGFuZGxlcik7XG4gICAgICAgIHRoaXMuX3BvcnQuYWRkRXZlbnRMaXN0ZW5lcihcIm1lc3NhZ2VlcnJvclwiLCBlcnJIYW5kbGVyKTtcblxuICAgICAgICB0aGlzLl9jbGVhbnVwID0gKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5fcG9ydC5yZW1vdmVFdmVudExpc3RlbmVyKFwibWVzc2FnZVwiLCBtc2dIYW5kbGVyKTtcbiAgICAgICAgICAgIHRoaXMuX3BvcnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihcIm1lc3NhZ2VlcnJvclwiLCBlcnJIYW5kbGVyKTtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBzdGFydCgpOiB2b2lkIHtcbiAgICAgICAgaWYgKHRoaXMuX2xpc3RlbmluZykgcmV0dXJuO1xuICAgICAgICB0aGlzLl9wb3J0LnN0YXJ0KCk7XG4gICAgICAgIHRoaXMuX2xpc3RlbmluZyA9IHRydWU7XG4gICAgICAgIHRoaXMuX3N0YXRlLm5leHQoXCJyZWFkeVwiKTtcblxuICAgICAgICBpZiAodGhpcy5fY29uZmlnLmtlZXBBbGl2ZSkge1xuICAgICAgICAgICAgdGhpcy5fc3RhcnRLZWVwQWxpdmUoKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHNlbmQobXNnOiBQb3J0TWVzc2FnZSwgdHJhbnNmZXI/OiBUcmFuc2ZlcmFibGVbXSk6IHZvaWQge1xuICAgICAgICBjb25zdCB7IHRyYW5zZmVyYWJsZSwgLi4uZGF0YSB9ID0gbXNnIGFzIGFueTtcbiAgICAgICAgdGhpcy5fcG9ydC5wb3N0TWVzc2FnZSh7IC4uLmRhdGEsIHBvcnRJZDogdGhpcy5fcG9ydElkIH0sIHRyYW5zZmVyID8/IFtdKTtcbiAgICB9XG5cbiAgICByZXF1ZXN0KG1zZzogT21pdDxQb3J0TWVzc2FnZSwgXCJyZXFJZFwiPiAmIHsgcmVxSWQ/OiBzdHJpbmcgfSk6IFByb21pc2U8YW55PiB7XG4gICAgICAgIGNvbnN0IHJlcUlkID0gbXNnLnJlcUlkID8/IFVVSUR2NCgpO1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgdGltZW91dCA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuX3BlbmRpbmcuZGVsZXRlKHJlcUlkKTtcbiAgICAgICAgICAgICAgICByZWplY3QobmV3IEVycm9yKFwiUmVxdWVzdCB0aW1lb3V0XCIpKTtcbiAgICAgICAgICAgIH0sIHRoaXMuX2NvbmZpZy50aW1lb3V0ID8/IDMwMDAwKTtcblxuICAgICAgICAgICAgdGhpcy5fcGVuZGluZy5zZXQocmVxSWQsIHtcbiAgICAgICAgICAgICAgICByZXNvbHZlOiAodikgPT4geyBjbGVhclRpbWVvdXQodGltZW91dCk7IHJlc29sdmUodik7IH0sXG4gICAgICAgICAgICAgICAgcmVqZWN0OiAoZSkgPT4geyBjbGVhclRpbWVvdXQodGltZW91dCk7IHJlamVjdChlKTsgfSxcbiAgICAgICAgICAgICAgICB0aW1lc3RhbXA6IERhdGUubm93KClcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICB0aGlzLnNlbmQoeyAuLi5tc2csIHJlcUlkLCB0eXBlOiBcInJlcXVlc3RcIiB9IGFzIFBvcnRNZXNzYWdlKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgc3Vic2NyaWJlKG9ic2VydmVyOiBPYnNlcnZlcjxQb3J0TWVzc2FnZT4gfCAoKHY6IFBvcnRNZXNzYWdlKSA9PiB2b2lkKSk6IFN1YnNjcmlwdGlvbiB7XG4gICAgICAgIGNvbnN0IG9iczogT2JzZXJ2ZXI8UG9ydE1lc3NhZ2U+ID0gdHlwZW9mIG9ic2VydmVyID09PSBcImZ1bmN0aW9uXCIgPyB7IG5leHQ6IG9ic2VydmVyIH0gOiBvYnNlcnZlcjtcbiAgICAgICAgdGhpcy5fc3Vicy5hZGQob2JzKTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGNsb3NlZDogZmFsc2UsXG4gICAgICAgICAgICB1bnN1YnNjcmliZTogKCkgPT4geyB0aGlzLl9zdWJzLmRlbGV0ZShvYnMpOyB9XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBfc3RhcnRLZWVwQWxpdmUoKTogdm9pZCB7XG4gICAgICAgIHRoaXMuX2tlZXBBbGl2ZVRpbWVyID0gc2V0SW50ZXJ2YWwoKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5zZW5kKHtcbiAgICAgICAgICAgICAgICBpZDogVVVJRHY0KCksXG4gICAgICAgICAgICAgICAgY2hhbm5lbDogdGhpcy5fY2hhbm5lbE5hbWUsXG4gICAgICAgICAgICAgICAgc2VuZGVyOiB0aGlzLl9wb3J0SWQsXG4gICAgICAgICAgICAgICAgdHlwZTogXCJzaWduYWxcIixcbiAgICAgICAgICAgICAgICBwYXlsb2FkOiB7IGFjdGlvbjogXCJwaW5nXCIgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sIHRoaXMuX2NvbmZpZy5rZWVwQWxpdmVJbnRlcnZhbCA/PyAzMDAwMCk7XG4gICAgfVxuXG4gICAgY2xvc2UoKTogdm9pZCB7XG4gICAgICAgIGlmICh0aGlzLl9rZWVwQWxpdmVUaW1lcikge1xuICAgICAgICAgICAgY2xlYXJJbnRlcnZhbCh0aGlzLl9rZWVwQWxpdmVUaW1lcik7XG4gICAgICAgICAgICB0aGlzLl9rZWVwQWxpdmVUaW1lciA9IG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fY2xlYW51cD8uKCk7XG4gICAgICAgIHRoaXMuX3N1YnMuZm9yRWFjaChzID0+IHMuY29tcGxldGU/LigpKTtcbiAgICAgICAgdGhpcy5fc3Vicy5jbGVhcigpO1xuICAgICAgICB0aGlzLl9wb3J0LmNsb3NlKCk7XG4gICAgICAgIHRoaXMuX3N0YXRlLm5leHQoXCJjbG9zZWRcIik7XG4gICAgfVxuXG4gICAgZ2V0IHBvcnQoKTogTWVzc2FnZVBvcnQgeyByZXR1cm4gdGhpcy5fcG9ydDsgfVxuICAgIGdldCBwb3J0SWQoKTogc3RyaW5nIHsgcmV0dXJuIHRoaXMuX3BvcnRJZDsgfVxuICAgIGdldCBpc0xpc3RlbmluZygpOiBib29sZWFuIHsgcmV0dXJuIHRoaXMuX2xpc3RlbmluZzsgfVxuICAgIGdldCBzdGF0ZSgpIHsgcmV0dXJuIHRoaXMuX3N0YXRlOyB9XG4gICAgZ2V0IGNoYW5uZWxOYW1lKCk6IHN0cmluZyB7IHJldHVybiB0aGlzLl9jaGFubmVsTmFtZTsgfVxufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBNRVNTQUdFIENIQU5ORUwgRkFDVE9SWVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5leHBvcnQgaW50ZXJmYWNlIENoYW5uZWxQYWlyUmVzdWx0IHtcbiAgICBsb2NhbDogUG9ydFRyYW5zcG9ydDtcbiAgICByZW1vdGU6IE1lc3NhZ2VQb3J0O1xuICAgIHRyYW5zZmVyKCk6IE1lc3NhZ2VQb3J0O1xufVxuXG4vKipcbiAqIENyZWF0ZSBhIE1lc3NhZ2VDaGFubmVsIHBhaXIgd2l0aCBjb25maWd1cmVkIGxvY2FsIHRyYW5zcG9ydFxuICovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlQ2hhbm5lbFBhaXIoXG4gICAgY2hhbm5lbE5hbWU6IHN0cmluZyxcbiAgICBjb25maWc/OiBQb3J0VHJhbnNwb3J0Q29uZmlnXG4pOiBDaGFubmVsUGFpclJlc3VsdCB7XG4gICAgY29uc3QgY2hhbm5lbCA9IG5ldyBNZXNzYWdlQ2hhbm5lbCgpO1xuXG4gICAgY29uc3QgbG9jYWwgPSBuZXcgUG9ydFRyYW5zcG9ydChjaGFubmVsLnBvcnQxLCBjaGFubmVsTmFtZSwgY29uZmlnKTtcblxuICAgIHJldHVybiB7XG4gICAgICAgIGxvY2FsLFxuICAgICAgICByZW1vdGU6IGNoYW5uZWwucG9ydDIsXG4gICAgICAgIHRyYW5zZmVyOiAoKSA9PiB7XG4gICAgICAgICAgICAvLyBVc2UgQXJyYXlCdWZmZXIudHJhbnNmZXItbGlrZSBzZW1hbnRpY3MgZm9yIHBvcnRcbiAgICAgICAgICAgIGNvbnN0IHBvcnQgPSBjaGFubmVsLnBvcnQyO1xuICAgICAgICAgICAgcmV0dXJuIHBvcnQ7XG4gICAgICAgIH1cbiAgICB9O1xufVxuXG4vKipcbiAqIENyZWF0ZSB0cmFuc3BvcnQgZnJvbSByZW1vdGUgcG9ydFxuICovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlRnJvbVBvcnQoXG4gICAgcG9ydDogTWVzc2FnZVBvcnQsXG4gICAgY2hhbm5lbE5hbWU6IHN0cmluZyxcbiAgICBjb25maWc/OiBQb3J0VHJhbnNwb3J0Q29uZmlnXG4pOiBQb3J0VHJhbnNwb3J0IHtcbiAgICByZXR1cm4gbmV3IFBvcnRUcmFuc3BvcnQocG9ydCwgY2hhbm5lbE5hbWUsIGNvbmZpZyk7XG59XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFBPUlQgUE9PTCAoTXVsdGlwbGV4ZWQgQ2hhbm5lbHMpXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbmV4cG9ydCBjbGFzcyBQb3J0UG9vbCB7XG4gICAgcHJpdmF0ZSBfY2hhbm5lbHMgPSBuZXcgTWFwPHN0cmluZywgUG9ydFRyYW5zcG9ydD4oKTtcbiAgICBwcml2YXRlIF9tYWluUG9ydDogUG9ydFRyYW5zcG9ydCB8IG51bGwgPSBudWxsO1xuICAgIHByaXZhdGUgX3N1YnMgPSBuZXcgU2V0PE9ic2VydmVyPFBvcnRNZXNzYWdlPj4oKTtcblxuICAgIGNvbnN0cnVjdG9yKFxuICAgICAgICBwcml2YXRlIF9kZWZhdWx0Q29uZmlnOiBQb3J0VHJhbnNwb3J0Q29uZmlnID0ge31cbiAgICApIHt9XG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGUgbmV3IGNoYW5uZWwgaW4gcG9vbFxuICAgICAqL1xuICAgIGNyZWF0ZShjaGFubmVsTmFtZTogc3RyaW5nLCBjb25maWc/OiBQb3J0VHJhbnNwb3J0Q29uZmlnKTogQ2hhbm5lbFBhaXJSZXN1bHQge1xuICAgICAgICBjb25zdCByZXN1bHQgPSBjcmVhdGVDaGFubmVsUGFpcihjaGFubmVsTmFtZSwgeyAuLi50aGlzLl9kZWZhdWx0Q29uZmlnLCAuLi5jb25maWcgfSk7XG5cbiAgICAgICAgcmVzdWx0LmxvY2FsLnN1YnNjcmliZSh7XG4gICAgICAgICAgICBuZXh0OiAobXNnKSA9PiB7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBzIG9mIHRoaXMuX3N1YnMpIHtcbiAgICAgICAgICAgICAgICAgICAgdHJ5IHsgcy5uZXh0Py4obXNnKTsgfSBjYXRjaCAoZSkgeyBzLmVycm9yPy4oZSBhcyBFcnJvcik7IH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMuX2NoYW5uZWxzLnNldChjaGFubmVsTmFtZSwgcmVzdWx0LmxvY2FsKTtcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBBZGQgZXhpc3RpbmcgcG9ydCB0byBwb29sXG4gICAgICovXG4gICAgYWRkKGNoYW5uZWxOYW1lOiBzdHJpbmcsIHBvcnQ6IE1lc3NhZ2VQb3J0LCBjb25maWc/OiBQb3J0VHJhbnNwb3J0Q29uZmlnKTogUG9ydFRyYW5zcG9ydCB7XG4gICAgICAgIGNvbnN0IHRyYW5zcG9ydCA9IG5ldyBQb3J0VHJhbnNwb3J0KHBvcnQsIGNoYW5uZWxOYW1lLCB7IC4uLnRoaXMuX2RlZmF1bHRDb25maWcsIC4uLmNvbmZpZyB9KTtcblxuICAgICAgICB0cmFuc3BvcnQuc3Vic2NyaWJlKHtcbiAgICAgICAgICAgIG5leHQ6IChtc2cpID0+IHtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IHMgb2YgdGhpcy5fc3Vicykge1xuICAgICAgICAgICAgICAgICAgICB0cnkgeyBzLm5leHQ/Lihtc2cpOyB9IGNhdGNoIChlKSB7IHMuZXJyb3I/LihlIGFzIEVycm9yKTsgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5fY2hhbm5lbHMuc2V0KGNoYW5uZWxOYW1lLCB0cmFuc3BvcnQpO1xuICAgICAgICByZXR1cm4gdHJhbnNwb3J0O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBjaGFubmVsIGJ5IG5hbWVcbiAgICAgKi9cbiAgICBnZXQoY2hhbm5lbE5hbWU6IHN0cmluZyk6IFBvcnRUcmFuc3BvcnQgfCB1bmRlZmluZWQge1xuICAgICAgICByZXR1cm4gdGhpcy5fY2hhbm5lbHMuZ2V0KGNoYW5uZWxOYW1lKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBTZW5kIHRvIHNwZWNpZmljIGNoYW5uZWxcbiAgICAgKi9cbiAgICBzZW5kKGNoYW5uZWxOYW1lOiBzdHJpbmcsIG1zZzogUG9ydE1lc3NhZ2UsIHRyYW5zZmVyPzogVHJhbnNmZXJhYmxlW10pOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fY2hhbm5lbHMuZ2V0KGNoYW5uZWxOYW1lKT8uc2VuZChtc2csIHRyYW5zZmVyKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBCcm9hZGNhc3QgdG8gYWxsIGNoYW5uZWxzXG4gICAgICovXG4gICAgYnJvYWRjYXN0KG1zZzogUG9ydE1lc3NhZ2UsIHRyYW5zZmVyPzogVHJhbnNmZXJhYmxlW10pOiB2b2lkIHtcbiAgICAgICAgZm9yIChjb25zdCB0cmFuc3BvcnQgb2YgdGhpcy5fY2hhbm5lbHMudmFsdWVzKCkpIHtcbiAgICAgICAgICAgIHRyYW5zcG9ydC5zZW5kKG1zZywgdHJhbnNmZXIpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmVxdWVzdCBvbiBzcGVjaWZpYyBjaGFubmVsXG4gICAgICovXG4gICAgcmVxdWVzdChjaGFubmVsTmFtZTogc3RyaW5nLCBtc2c6IFBvcnRNZXNzYWdlKTogUHJvbWlzZTxhbnk+IHtcbiAgICAgICAgY29uc3QgY2hhbm5lbCA9IHRoaXMuX2NoYW5uZWxzLmdldChjaGFubmVsTmFtZSk7XG4gICAgICAgIGlmICghY2hhbm5lbCkgcmV0dXJuIFByb21pc2UucmVqZWN0KG5ldyBFcnJvcihgQ2hhbm5lbCAke2NoYW5uZWxOYW1lfSBub3QgZm91bmRgKSk7XG4gICAgICAgIHJldHVybiBjaGFubmVsLnJlcXVlc3QobXNnKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBTdWJzY3JpYmUgdG8gYWxsIGNoYW5uZWxzXG4gICAgICovXG4gICAgc3Vic2NyaWJlKG9ic2VydmVyOiBPYnNlcnZlcjxQb3J0TWVzc2FnZT4gfCAoKHY6IFBvcnRNZXNzYWdlKSA9PiB2b2lkKSk6IFN1YnNjcmlwdGlvbiB7XG4gICAgICAgIGNvbnN0IG9iczogT2JzZXJ2ZXI8UG9ydE1lc3NhZ2U+ID0gdHlwZW9mIG9ic2VydmVyID09PSBcImZ1bmN0aW9uXCIgPyB7IG5leHQ6IG9ic2VydmVyIH0gOiBvYnNlcnZlcjtcbiAgICAgICAgdGhpcy5fc3Vicy5hZGQob2JzKTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGNsb3NlZDogZmFsc2UsXG4gICAgICAgICAgICB1bnN1YnNjcmliZTogKCkgPT4geyB0aGlzLl9zdWJzLmRlbGV0ZShvYnMpOyB9XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmVtb3ZlIGNoYW5uZWxcbiAgICAgKi9cbiAgICByZW1vdmUoY2hhbm5lbE5hbWU6IHN0cmluZyk6IHZvaWQge1xuICAgICAgICBjb25zdCBjaGFubmVsID0gdGhpcy5fY2hhbm5lbHMuZ2V0KGNoYW5uZWxOYW1lKTtcbiAgICAgICAgaWYgKGNoYW5uZWwpIHtcbiAgICAgICAgICAgIGNoYW5uZWwuY2xvc2UoKTtcbiAgICAgICAgICAgIHRoaXMuX2NoYW5uZWxzLmRlbGV0ZShjaGFubmVsTmFtZSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDbG9zZSBhbGwgY2hhbm5lbHNcbiAgICAgKi9cbiAgICBjbG9zZSgpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fc3Vicy5mb3JFYWNoKHMgPT4gcy5jb21wbGV0ZT8uKCkpO1xuICAgICAgICB0aGlzLl9zdWJzLmNsZWFyKCk7XG4gICAgICAgIGZvciAoY29uc3QgY2hhbm5lbCBvZiB0aGlzLl9jaGFubmVscy52YWx1ZXMoKSkge1xuICAgICAgICAgICAgY2hhbm5lbC5jbG9zZSgpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuX2NoYW5uZWxzLmNsZWFyKCk7XG4gICAgfVxuXG4gICAgZ2V0IGNoYW5uZWxOYW1lcygpOiBzdHJpbmdbXSB7IHJldHVybiBBcnJheS5mcm9tKHRoaXMuX2NoYW5uZWxzLmtleXMoKSk7IH1cbiAgICBnZXQgc2l6ZSgpOiBudW1iZXIgeyByZXR1cm4gdGhpcy5fY2hhbm5lbHMuc2l6ZTsgfVxufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBXSU5ET1cvSUZSQU1FIFBPUlQgQ09OTkVDVE9SXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbmV4cG9ydCBpbnRlcmZhY2UgV2luZG93UG9ydENvbm5lY3RvckNvbmZpZyBleHRlbmRzIFBvcnRUcmFuc3BvcnRDb25maWcge1xuICAgIHRhcmdldE9yaWdpbj86IHN0cmluZztcbiAgICBoYW5kc2hha2VUaW1lb3V0PzogbnVtYmVyO1xufVxuXG4vKipcbiAqIENvbm5lY3QgdG8gd2luZG93L2lmcmFtZSB2aWEgTWVzc2FnZUNoYW5uZWxcbiAqL1xuZXhwb3J0IGNsYXNzIFdpbmRvd1BvcnRDb25uZWN0b3Ige1xuICAgIHByaXZhdGUgX3RyYW5zcG9ydDogUG9ydFRyYW5zcG9ydCB8IG51bGwgPSBudWxsO1xuICAgIHByaXZhdGUgX3N0YXRlID0gbmV3IENoYW5uZWxTdWJqZWN0PFwiZGlzY29ubmVjdGVkXCIgfCBcImNvbm5lY3RpbmdcIiB8IFwiY29ubmVjdGVkXCIgfCBcImVycm9yXCI+KCk7XG4gICAgcHJpdmF0ZSBfaGFuZHNoYWtlQ29tcGxldGUgPSBmYWxzZTtcblxuICAgIGNvbnN0cnVjdG9yKFxuICAgICAgICBwcml2YXRlIF90YXJnZXQ6IFdpbmRvdyxcbiAgICAgICAgcHJpdmF0ZSBfY2hhbm5lbE5hbWU6IHN0cmluZyxcbiAgICAgICAgcHJpdmF0ZSBfY29uZmlnOiBXaW5kb3dQb3J0Q29ubmVjdG9yQ29uZmlnID0ge31cbiAgICApIHt9XG5cbiAgICAvKipcbiAgICAgKiBJbml0aWF0ZSBjb25uZWN0aW9uIHRvIHRhcmdldCB3aW5kb3dcbiAgICAgKi9cbiAgICBhc3luYyBjb25uZWN0KCk6IFByb21pc2U8UG9ydFRyYW5zcG9ydD4ge1xuICAgICAgICBpZiAodGhpcy5fdHJhbnNwb3J0ICYmIHRoaXMuX2hhbmRzaGFrZUNvbXBsZXRlKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fdHJhbnNwb3J0O1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5fc3RhdGUubmV4dChcImNvbm5lY3RpbmdcIik7XG5cbiAgICAgICAgY29uc3QgeyBsb2NhbCwgcmVtb3RlIH0gPSBjcmVhdGVDaGFubmVsUGFpcih0aGlzLl9jaGFubmVsTmFtZSwgdGhpcy5fY29uZmlnKTtcblxuICAgICAgICAvLyBTZW5kIHBvcnQgdG8gdGFyZ2V0IHdpbmRvd1xuICAgICAgICB0aGlzLl90YXJnZXQucG9zdE1lc3NhZ2UoXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgdHlwZTogXCJwb3J0LWNvbm5lY3RcIixcbiAgICAgICAgICAgICAgICBjaGFubmVsTmFtZTogdGhpcy5fY2hhbm5lbE5hbWUsXG4gICAgICAgICAgICAgICAgcG9ydElkOiBsb2NhbC5wb3J0SWRcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB0aGlzLl9jb25maWcudGFyZ2V0T3JpZ2luID8/IFwiKlwiLFxuICAgICAgICAgICAgW3JlbW90ZV1cbiAgICAgICAgKTtcblxuICAgICAgICAvLyBXYWl0IGZvciBoYW5kc2hha2VcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHRpbWVvdXQgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICByZWplY3QobmV3IEVycm9yKFwiSGFuZHNoYWtlIHRpbWVvdXRcIikpO1xuICAgICAgICAgICAgICAgIHRoaXMuX3N0YXRlLm5leHQoXCJlcnJvclwiKTtcbiAgICAgICAgICAgIH0sIHRoaXMuX2NvbmZpZy5oYW5kc2hha2VUaW1lb3V0ID8/IDEwMDAwKTtcblxuICAgICAgICAgICAgY29uc3Qgc3ViID0gbG9jYWwuc3Vic2NyaWJlKHtcbiAgICAgICAgICAgICAgICBuZXh0OiAobXNnKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChtc2cudHlwZSA9PT0gXCJzaWduYWxcIiAmJiBtc2cucGF5bG9hZD8uYWN0aW9uID09PSBcImhhbmRzaGFrZS1hY2tcIikge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5faGFuZHNoYWtlQ29tcGxldGUgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fdHJhbnNwb3J0ID0gbG9jYWw7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9zdGF0ZS5uZXh0KFwiY29ubmVjdGVkXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgc3ViLnVuc3Vic2NyaWJlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKGxvY2FsKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBMaXN0ZW4gZm9yIGluY29taW5nIGNvbm5lY3Rpb25zICh0YXJnZXQgc2lkZSlcbiAgICAgKi9cbiAgICBzdGF0aWMgbGlzdGVuKFxuICAgICAgICBjaGFubmVsTmFtZTogc3RyaW5nLFxuICAgICAgICBoYW5kbGVyOiAodHJhbnNwb3J0OiBQb3J0VHJhbnNwb3J0KSA9PiB2b2lkLFxuICAgICAgICBjb25maWc/OiBXaW5kb3dQb3J0Q29ubmVjdG9yQ29uZmlnXG4gICAgKTogKCkgPT4gdm9pZCB7XG4gICAgICAgIGNvbnN0IG1zZ0hhbmRsZXIgPSAoZTogTWVzc2FnZUV2ZW50KSA9PiB7XG4gICAgICAgICAgICBpZiAoZS5kYXRhPy50eXBlICE9PSBcInBvcnQtY29ubmVjdFwiIHx8IGUuZGF0YT8uY2hhbm5lbE5hbWUgIT09IGNoYW5uZWxOYW1lKSByZXR1cm47XG4gICAgICAgICAgICBpZiAoIWUucG9ydHNbMF0pIHJldHVybjtcblxuICAgICAgICAgICAgY29uc3QgdHJhbnNwb3J0ID0gbmV3IFBvcnRUcmFuc3BvcnQoZS5wb3J0c1swXSwgY2hhbm5lbE5hbWUsIGNvbmZpZyk7XG5cbiAgICAgICAgICAgIC8vIFNlbmQgaGFuZHNoYWtlIGFja25vd2xlZGdtZW50XG4gICAgICAgICAgICB0cmFuc3BvcnQuc2VuZCh7XG4gICAgICAgICAgICAgICAgaWQ6IFVVSUR2NCgpLFxuICAgICAgICAgICAgICAgIGNoYW5uZWw6IGNoYW5uZWxOYW1lLFxuICAgICAgICAgICAgICAgIHNlbmRlcjogdHJhbnNwb3J0LnBvcnRJZCxcbiAgICAgICAgICAgICAgICB0eXBlOiBcInNpZ25hbFwiLFxuICAgICAgICAgICAgICAgIHBheWxvYWQ6IHsgYWN0aW9uOiBcImhhbmRzaGFrZS1hY2tcIiB9XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgaGFuZGxlcih0cmFuc3BvcnQpO1xuICAgICAgICB9O1xuXG4gICAgICAgIGdsb2JhbFRoaXMuYWRkRXZlbnRMaXN0ZW5lcihcIm1lc3NhZ2VcIiwgbXNnSGFuZGxlcik7XG4gICAgICAgIHJldHVybiAoKSA9PiBnbG9iYWxUaGlzLnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJtZXNzYWdlXCIsIG1zZ0hhbmRsZXIpO1xuICAgIH1cblxuICAgIGRpc2Nvbm5lY3QoKTogdm9pZCB7XG4gICAgICAgIHRoaXMuX3RyYW5zcG9ydD8uY2xvc2UoKTtcbiAgICAgICAgdGhpcy5fdHJhbnNwb3J0ID0gbnVsbDtcbiAgICAgICAgdGhpcy5faGFuZHNoYWtlQ29tcGxldGUgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5fc3RhdGUubmV4dChcImRpc2Nvbm5lY3RlZFwiKTtcbiAgICB9XG5cbiAgICBnZXQgaXNDb25uZWN0ZWQoKTogYm9vbGVhbiB7IHJldHVybiB0aGlzLl9oYW5kc2hha2VDb21wbGV0ZTsgfVxuICAgIGdldCBzdGF0ZSgpIHsgcmV0dXJuIHRoaXMuX3N0YXRlOyB9XG4gICAgZ2V0IHRyYW5zcG9ydCgpOiBQb3J0VHJhbnNwb3J0IHwgbnVsbCB7IHJldHVybiB0aGlzLl90cmFuc3BvcnQ7IH1cbn1cblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gQ09NTElOSy1MSUtFIFBST1hZIE9WRVIgUE9SVCAodXNpbmcgdW5pZmllZCBQcm94eSBtb2R1bGUpXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbmltcG9ydCB7XG4gICAgY3JlYXRlU2VuZGVyUHJveHksXG4gICAgY3JlYXRlRXhwb3NlSGFuZGxlcixcbiAgICB0eXBlIFByb3h5TWV0aG9kc1xufSBmcm9tIFwiLi4vcHJveHkvUHJveHlcIjtcblxuLy8gUmUtZXhwb3J0IGZvciBiYWNrd2FyZCBjb21wYXRpYmlsaXR5XG5leHBvcnQgdHlwZSB7IFByb3h5TWV0aG9kcyB9O1xuXG4vKipcbiAqIENyZWF0ZSBwcm94eSBmb3IgcmVtb3RlIG9iamVjdCBvdmVyIFBvcnRUcmFuc3BvcnRcbiAqXG4gKiBVc2VzIHVuaWZpZWQgUHJveHkgbW9kdWxlIGZvciBjb25zaXN0ZW50IGJlaGF2aW9yLlxuICovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlUG9ydFByb3h5PFQgZXh0ZW5kcyBvYmplY3Q+KFxuICAgIHRyYW5zcG9ydDogUG9ydFRyYW5zcG9ydCxcbiAgICB0YXJnZXRQYXRoOiBzdHJpbmdbXSA9IFtdXG4pOiBQcm94eU1ldGhvZHM8VD4ge1xuICAgIHJldHVybiBjcmVhdGVTZW5kZXJQcm94eTxUPih7XG4gICAgICAgIHJlcXVlc3Q6IChtc2cpID0+IHRyYW5zcG9ydC5yZXF1ZXN0KG1zZyksXG4gICAgICAgIGNoYW5uZWxOYW1lOiB0cmFuc3BvcnQuY2hhbm5lbE5hbWUsXG4gICAgICAgIHNlbmRlcklkOiB0cmFuc3BvcnQucG9ydElkXG4gICAgfSwgdGFyZ2V0UGF0aCk7XG59XG5cbi8qKlxuICogRXhwb3NlIG9iamVjdCBtZXRob2RzIG92ZXIgUG9ydFRyYW5zcG9ydFxuICpcbiAqIFVzZXMgdW5pZmllZCBQcm94eSBtb2R1bGUncyBleHBvc2UgaGFuZGxlci5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGV4cG9zZU92ZXJQb3J0PFQgZXh0ZW5kcyBvYmplY3Q+KFxuICAgIHRyYW5zcG9ydDogUG9ydFRyYW5zcG9ydCxcbiAgICB0YXJnZXQ6IFRcbik6IFN1YnNjcmlwdGlvbiB7XG4gICAgY29uc3QgaGFuZGxlciA9IGNyZWF0ZUV4cG9zZUhhbmRsZXIodGFyZ2V0KTtcblxuICAgIHJldHVybiB0cmFuc3BvcnQuc3Vic2NyaWJlKHtcbiAgICAgICAgbmV4dDogYXN5bmMgKG1zZykgPT4ge1xuICAgICAgICAgICAgaWYgKG1zZy50eXBlICE9PSBcInJlcXVlc3RcIiB8fCAhbXNnLnBheWxvYWQ/LnBhdGgpIHJldHVybjtcblxuICAgICAgICAgICAgY29uc3QgeyBhY3Rpb24sIHBhdGgsIGFyZ3MgfSA9IG1zZy5wYXlsb2FkO1xuICAgICAgICAgICAgbGV0IHJlc3VsdDogYW55O1xuICAgICAgICAgICAgbGV0IGVycm9yOiBzdHJpbmcgfCB1bmRlZmluZWQ7XG5cbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0ID0gYXdhaXQgaGFuZGxlcihhY3Rpb24sIHBhdGgsIGFyZ3MgPz8gW10pO1xuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgIGVycm9yID0gZSBpbnN0YW5jZW9mIEVycm9yID8gZS5tZXNzYWdlIDogU3RyaW5nKGUpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0cmFuc3BvcnQuc2VuZCh7XG4gICAgICAgICAgICAgICAgaWQ6IFVVSUR2NCgpLFxuICAgICAgICAgICAgICAgIGNoYW5uZWw6IG1zZy5zZW5kZXIsXG4gICAgICAgICAgICAgICAgc2VuZGVyOiB0cmFuc3BvcnQucG9ydElkLFxuICAgICAgICAgICAgICAgIHR5cGU6IFwicmVzcG9uc2VcIixcbiAgICAgICAgICAgICAgICByZXFJZDogbXNnLnJlcUlkLFxuICAgICAgICAgICAgICAgIHBheWxvYWQ6IGVycm9yID8geyBlcnJvciB9IDogeyByZXN1bHQgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9KTtcbn1cblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gRkFDVE9SWVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5leHBvcnQgY29uc3QgUG9ydFRyYW5zcG9ydEZhY3RvcnkgPSB7XG4gICAgY3JlYXRlOiAocG9ydDogTWVzc2FnZVBvcnQsIG5hbWU6IHN0cmluZywgY29uZmlnPzogUG9ydFRyYW5zcG9ydENvbmZpZykgPT5cbiAgICAgICAgbmV3IFBvcnRUcmFuc3BvcnQocG9ydCwgbmFtZSwgY29uZmlnKSxcbiAgICBjcmVhdGVQYWlyOiAobmFtZTogc3RyaW5nLCBjb25maWc/OiBQb3J0VHJhbnNwb3J0Q29uZmlnKSA9PlxuICAgICAgICBjcmVhdGVDaGFubmVsUGFpcihuYW1lLCBjb25maWcpLFxuICAgIGNyZWF0ZVBvb2w6IChjb25maWc/OiBQb3J0VHJhbnNwb3J0Q29uZmlnKSA9PlxuICAgICAgICBuZXcgUG9ydFBvb2woY29uZmlnKSxcbiAgICBjcmVhdGVXaW5kb3dDb25uZWN0b3I6ICh0YXJnZXQ6IFdpbmRvdywgbmFtZTogc3RyaW5nLCBjb25maWc/OiBXaW5kb3dQb3J0Q29ubmVjdG9yQ29uZmlnKSA9PlxuICAgICAgICBuZXcgV2luZG93UG9ydENvbm5lY3Rvcih0YXJnZXQsIG5hbWUsIGNvbmZpZyksXG4gICAgbGlzdGVuOiBXaW5kb3dQb3J0Q29ubmVjdG9yLmxpc3RlbixcbiAgICBjcmVhdGVQcm94eTogY3JlYXRlUG9ydFByb3h5LFxuICAgIGV4cG9zZTogZXhwb3NlT3ZlclBvcnRcbn07XG4iXX0=