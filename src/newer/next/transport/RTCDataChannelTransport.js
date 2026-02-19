/**
 * WebRTC DataChannel Transport
 *
 * P2P communication using WebRTC DataChannels.
 * Enables direct browser-to-browser communication without a server relay.
 *
 * Features:
 * - Peer-to-peer messaging
 * - Binary data support
 * - Ordered/unordered delivery
 * - Reliable/unreliable modes
 * - SCTP-based flow control
 */
import { UUIDv4 } from "fest/core";
import { ChannelSubject } from "../observable/Observable";
// ============================================================================
// DEFAULT ICE SERVERS
// ============================================================================
const DEFAULT_ICE_SERVERS = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" }
];
// ============================================================================
// RTC PEER CONNECTION WRAPPER
// ============================================================================
export class RTCPeerTransport {
    _channelName;
    _config;
    _pc;
    _channel = null;
    _subs = new Set();
    _pending = new Map();
    _localId = UUIDv4();
    _remoteId = null;
    _state = new ChannelSubject();
    _channelState = new ChannelSubject();
    _iceCandidates = [];
    _iceGatheringComplete = false;
    constructor(_channelName, _config = {}) {
        this._channelName = _channelName;
        this._config = _config;
        this._pc = new RTCPeerConnection({
            iceServers: _config.iceServers ?? DEFAULT_ICE_SERVERS
        });
        this._setupPeerConnection();
    }
    _setupPeerConnection() {
        this._pc.onicecandidate = (e) => {
            if (e.candidate) {
                this._iceCandidates.push(e.candidate.toJSON());
                if (this._remoteId && this._config.signaling) {
                    this._config.signaling.send(this._remoteId, {
                        type: "ice-candidate",
                        fromPeerId: this._localId,
                        toPeerId: this._remoteId,
                        candidate: e.candidate.toJSON()
                    });
                }
            }
        };
        this._pc.onicegatheringstatechange = () => {
            if (this._pc.iceGatheringState === "complete") {
                this._iceGatheringComplete = true;
            }
        };
        this._pc.onconnectionstatechange = () => {
            this._state.next(this._pc.connectionState);
            if (this._pc.connectionState === "failed" || this._pc.connectionState === "disconnected") {
                for (const s of this._subs)
                    s.error?.(new Error(`Connection ${this._pc.connectionState}`));
            }
        };
        this._pc.ondatachannel = (e) => {
            this._setupDataChannel(e.channel);
        };
    }
    _setupDataChannel(channel) {
        this._channel = channel;
        channel.binaryType = "arraybuffer";
        channel.onopen = () => {
            this._channelState.next("open");
        };
        channel.onclose = () => {
            this._channelState.next("closed");
            for (const s of this._subs)
                s.complete?.();
        };
        channel.onerror = (e) => {
            const err = new Error("DataChannel error");
            for (const s of this._subs)
                s.error?.(err);
        };
        channel.onmessage = (e) => {
            let data;
            if (typeof e.data === "string") {
                data = JSON.parse(e.data);
            }
            else {
                // Binary data - decode based on format
                data = this._decodeBinary(e.data);
            }
            data.peerId = this._remoteId ?? undefined;
            data.dataChannelLabel = channel.label;
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
            for (const s of this._subs) {
                try {
                    s.next?.(data);
                }
                catch (e) {
                    s.error?.(e);
                }
            }
        };
    }
    /**
     * Create offer to initiate connection
     */
    async createOffer(remoteId) {
        this._remoteId = remoteId;
        // Create data channel
        const channel = this._pc.createDataChannel(this._channelName, this._config.dataChannelOptions);
        this._setupDataChannel(channel);
        // Create offer
        const offer = await this._pc.createOffer();
        await this._pc.setLocalDescription(offer);
        return {
            type: "offer",
            fromPeerId: this._localId,
            toPeerId: remoteId,
            sdp: offer.sdp
        };
    }
    /**
     * Handle incoming offer
     */
    async handleOffer(signal) {
        this._remoteId = signal.fromPeerId;
        await this._pc.setRemoteDescription({
            type: "offer",
            sdp: signal.sdp
        });
        const answer = await this._pc.createAnswer();
        await this._pc.setLocalDescription(answer);
        return {
            type: "answer",
            fromPeerId: this._localId,
            toPeerId: signal.fromPeerId,
            sdp: answer.sdp
        };
    }
    /**
     * Handle incoming answer
     */
    async handleAnswer(signal) {
        await this._pc.setRemoteDescription({
            type: "answer",
            sdp: signal.sdp
        });
    }
    /**
     * Handle incoming ICE candidate
     */
    async addIceCandidate(signal) {
        if (signal.candidate) {
            await this._pc.addIceCandidate(signal.candidate);
        }
    }
    /**
     * Send message to peer
     */
    send(msg, binary) {
        if (!this._channel || this._channel.readyState !== "open")
            return;
        const { transferable, peerId, dataChannelLabel, ...data } = msg;
        if (binary || msg.binary) {
            this._channel.send(this._encodeBinary(data));
        }
        else {
            this._channel.send(JSON.stringify(data));
        }
    }
    /**
     * Send request and wait for response
     */
    request(msg) {
        const reqId = msg.reqId ?? UUIDv4();
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                this._pending.delete(reqId);
                reject(new Error("Request timeout"));
            }, this._config.connectionTimeout ?? 30000);
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
    _encodeBinary(data) {
        const json = JSON.stringify(data);
        return new TextEncoder().encode(json).buffer;
    }
    _decodeBinary(buffer) {
        const json = new TextDecoder().decode(buffer);
        return JSON.parse(json);
    }
    close() {
        this._subs.forEach(s => s.complete?.());
        this._subs.clear();
        if (this._remoteId && this._config.signaling) {
            this._config.signaling.send(this._remoteId, {
                type: "disconnect",
                fromPeerId: this._localId,
                toPeerId: this._remoteId
            });
        }
        this._channel?.close();
        this._pc.close();
    }
    get localId() { return this._localId; }
    get remoteId() { return this._remoteId; }
    get connectionState() { return this._pc.connectionState; }
    get channelState() { return this._channel?.readyState ?? null; }
    get state() { return this._state; }
    get channelStateObservable() { return this._channelState; }
    get iceCandidates() { return [...this._iceCandidates]; }
    get channelName() { return this._channelName; }
}
// ============================================================================
// RTC PEER MANAGER (Multi-peer)
// ============================================================================
export class RTCPeerManager {
    _channelName;
    _config;
    _peers = new Map();
    _localId = UUIDv4();
    _subs = new Set();
    _signalingCleanup = null;
    _peerEvents = new ChannelSubject();
    constructor(_channelName, _config = {}) {
        this._channelName = _channelName;
        this._config = _config;
        this._setupSignaling();
    }
    _setupSignaling() {
        if (!this._config.signaling)
            return;
        const cleanup = this._config.signaling.onMessage(async (signal) => {
            if (signal.toPeerId !== this._localId)
                return;
            switch (signal.type) {
                case "offer": {
                    const peer = this._getOrCreatePeer(signal.fromPeerId);
                    const answer = await peer.handleOffer(signal);
                    this._config.signaling.send(signal.fromPeerId, answer);
                    break;
                }
                case "answer": {
                    const peer = this._peers.get(signal.fromPeerId);
                    if (peer)
                        await peer.handleAnswer(signal);
                    break;
                }
                case "ice-candidate": {
                    const peer = this._peers.get(signal.fromPeerId);
                    if (peer)
                        await peer.addIceCandidate(signal);
                    break;
                }
                case "disconnect": {
                    this._removePeer(signal.fromPeerId);
                    break;
                }
            }
        });
        if (typeof cleanup === "function") {
            this._signalingCleanup = cleanup;
        }
        else if (cleanup && "unsubscribe" in cleanup) {
            this._signalingCleanup = () => cleanup.unsubscribe();
        }
    }
    _getOrCreatePeer(peerId) {
        let peer = this._peers.get(peerId);
        if (!peer) {
            peer = new RTCPeerTransport(this._channelName, this._config);
            this._peers.set(peerId, peer);
            // Subscribe to peer events
            peer.state.subscribe({
                next: (state) => {
                    if (state === "connected") {
                        this._peerEvents.next({ type: "connected", peerId, peer });
                    }
                    else if (state === "disconnected" || state === "closed") {
                        this._peerEvents.next({ type: "disconnected", peerId });
                    }
                    else if (state === "failed") {
                        this._peerEvents.next({ type: "failed", peerId });
                        this._removePeer(peerId);
                    }
                }
            });
            // Forward messages
            peer.subscribe({
                next: (msg) => {
                    for (const s of this._subs) {
                        try {
                            s.next?.(msg);
                        }
                        catch (e) {
                            s.error?.(e);
                        }
                    }
                },
                error: (e) => {
                    for (const s of this._subs)
                        s.error?.(e);
                }
            });
        }
        return peer;
    }
    _removePeer(peerId) {
        const peer = this._peers.get(peerId);
        if (peer) {
            peer.close();
            this._peers.delete(peerId);
            this._peerEvents.next({ type: "disconnected", peerId });
        }
    }
    /**
     * Connect to a peer
     */
    async connect(peerId) {
        const peer = this._getOrCreatePeer(peerId);
        const offer = await peer.createOffer(peerId);
        if (this._config.signaling) {
            await this._config.signaling.send(peerId, offer);
        }
        return peer;
    }
    /**
     * Send to specific peer
     */
    send(peerId, msg) {
        this._peers.get(peerId)?.send(msg);
    }
    /**
     * Broadcast to all peers
     */
    broadcast(msg) {
        for (const peer of this._peers.values()) {
            peer.send(msg);
        }
    }
    /**
     * Request from specific peer
     */
    request(peerId, msg) {
        const peer = this._peers.get(peerId);
        if (!peer)
            return Promise.reject(new Error("Peer not found"));
        return peer.request(msg);
    }
    subscribe(observer) {
        const obs = typeof observer === "function" ? { next: observer } : observer;
        this._subs.add(obs);
        return {
            closed: false,
            unsubscribe: () => { this._subs.delete(obs); }
        };
    }
    onPeerEvent(handler) {
        return this._peerEvents.subscribe({ next: handler });
    }
    getPeers() {
        const result = new Map();
        for (const [id, peer] of this._peers) {
            result.set(id, {
                id,
                connectionState: peer.connectionState,
                iceConnectionState: "new", // simplified
                dataChannelState: peer.channelState ?? "closed"
            });
        }
        return result;
    }
    close() {
        this._signalingCleanup?.();
        this._subs.forEach(s => s.complete?.());
        this._subs.clear();
        for (const peer of this._peers.values()) {
            peer.close();
        }
        this._peers.clear();
    }
    get localId() { return this._localId; }
    get peerCount() { return this._peers.size; }
    get channelName() { return this._channelName; }
}
// ============================================================================
// SIMPLE BROADCAST CHANNEL SIGNALING
// ============================================================================
/**
 * Simple signaling using BroadcastChannel (for same-origin peers)
 */
export function createBroadcastSignaling(channelName) {
    const bc = new BroadcastChannel(`rtc-signaling:${channelName}`);
    const handlers = new Set();
    bc.onmessage = (e) => {
        for (const h of handlers)
            h(e.data);
    };
    return {
        send(peerId, message) {
            bc.postMessage(message);
        },
        onMessage(handler) {
            handlers.add(handler);
            return { unsubscribe: () => handlers.delete(handler), closed: false };
        },
        close() {
            bc.close();
            handlers.clear();
        }
    };
}
// ============================================================================
// FACTORY
// ============================================================================
export const RTCTransportFactory = {
    createPeer: (name, config) => new RTCPeerTransport(name, config),
    createManager: (name, config) => new RTCPeerManager(name, config),
    createSignaling: (name) => createBroadcastSignaling(name)
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUlRDRGF0YUNoYW5uZWxUcmFuc3BvcnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJSVENEYXRhQ2hhbm5lbFRyYW5zcG9ydC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7Ozs7O0dBWUc7QUFFSCxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sV0FBVyxDQUFDO0FBQ25DLE9BQU8sRUFBYyxjQUFjLEVBQW9DLE1BQU0sMEJBQTBCLENBQUM7QUFvRHhHLCtFQUErRTtBQUMvRSxzQkFBc0I7QUFDdEIsK0VBQStFO0FBRS9FLE1BQU0sbUJBQW1CLEdBQW1CO0lBQ3hDLEVBQUUsSUFBSSxFQUFFLDhCQUE4QixFQUFFO0lBQ3hDLEVBQUUsSUFBSSxFQUFFLCtCQUErQixFQUFFO0lBQ3pDLEVBQUUsSUFBSSxFQUFFLCtCQUErQixFQUFFO0NBQzVDLENBQUM7QUFFRiwrRUFBK0U7QUFDL0UsOEJBQThCO0FBQzlCLCtFQUErRTtBQUUvRSxNQUFNLE9BQU8sZ0JBQWdCO0lBYWI7SUFDQTtJQWJKLEdBQUcsQ0FBb0I7SUFDdkIsUUFBUSxHQUEwQixJQUFJLENBQUM7SUFDdkMsS0FBSyxHQUFHLElBQUksR0FBRyxFQUF3QixDQUFDO0lBQ3hDLFFBQVEsR0FBRyxJQUFJLEdBQUcsRUFBMEIsQ0FBQztJQUM3QyxRQUFRLEdBQVcsTUFBTSxFQUFFLENBQUM7SUFDNUIsU0FBUyxHQUFrQixJQUFJLENBQUM7SUFDaEMsTUFBTSxHQUFHLElBQUksY0FBYyxFQUEwQixDQUFDO0lBQ3RELGFBQWEsR0FBRyxJQUFJLGNBQWMsRUFBdUIsQ0FBQztJQUMxRCxjQUFjLEdBQTBCLEVBQUUsQ0FBQztJQUMzQyxxQkFBcUIsR0FBRyxLQUFLLENBQUM7SUFFdEMsWUFDWSxZQUFvQixFQUNwQixVQUE4QixFQUFFO1FBRGhDLGlCQUFZLEdBQVosWUFBWSxDQUFRO1FBQ3BCLFlBQU8sR0FBUCxPQUFPLENBQXlCO1FBRXhDLElBQUksQ0FBQyxHQUFHLEdBQUcsSUFB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Y2VzQ29udGVudCI6WyIvKipcbiAqIFdlYlJUQyBEYXRhQ2hhbm5lbCBUcmFuc3BvcnRcbiAqXG4gKiBQMlAgY29tbXVuaWNhdGlvbiB1c2luZyBXZWJSVEMgRGF0YUNoYW5uZWxzLlxuICogRW5hYmxlcyBkaXJlY3QgYnJvd3Nlci10by1icm93c2VyIGNvbW11bmljYXRpb24gd2l0aG91dCBhIHNlcnZlciByZWxheS5cbiAqXG4gKiBGZWF0dXJlczpcbiAqIC0gUGVlci10by1wZWVyIG1lc3NhZ2luZ1xuICogLSBCaW5hcnkgZGF0YSBzdXBwb3J0XG4gKiAtIE9yZGVyZWQvdW5vcmRlcmVkIGRlbGl2ZXJ5XG4gKiAtIFJlbGlhYmxlL3VucmVsaWFibGUgbW9kZXNcbiAqIC0gU0NUUC1iYXNlZCBmbG93IGNvbnRyb2xcbiAqL1xuXG5pbXBvcnQgeyBVVUlEdjQgfSBmcm9tIFwiZmVzdC9jb3JlXCI7XG5pbXBvcnQgeyBPYnNlcnZhYmxlLCBDaGFubmVsU3ViamVjdCwgdHlwZSBTdWJzY3JpcHRpb24sIHR5cGUgT2JzZXJ2ZXIgfSBmcm9tIFwiLi4vb2JzZXJ2YWJsZS9PYnNlcnZhYmxlXCI7XG5pbXBvcnQgdHlwZSB7IENoYW5uZWxNZXNzYWdlLCBQZW5kaW5nUmVxdWVzdCwgU3Vic2NyaWJlciB9IGZyb20gXCIuLi90eXBlcy9JbnRlcmZhY2VcIjtcblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gVFlQRVNcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuZXhwb3J0IGludGVyZmFjZSBSVENNZXNzYWdlPFQgPSBhbnk+IGV4dGVuZHMgQ2hhbm5lbE1lc3NhZ2Uge1xuICAgIHBlZXJJZD86IHN0cmluZztcbiAgICBkYXRhQ2hhbm5lbExhYmVsPzogc3RyaW5nO1xuICAgIGJpbmFyeT86IGJvb2xlYW47XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUlRDVHJhbnNwb3J0Q29uZmlnIHtcbiAgICAvKiogSUNFIHNlcnZlcnMgZm9yIFNUVU4vVFVSTiAqL1xuICAgIGljZVNlcnZlcnM/OiBSVENJY2VTZXJ2ZXJbXTtcbiAgICAvKiogRGF0YSBjaGFubmVsIG9wdGlvbnMgKi9cbiAgICBkYXRhQ2hhbm5lbE9wdGlvbnM/OiBSVENEYXRhQ2hhbm5lbEluaXQ7XG4gICAgLyoqIFNpZ25hbGluZyBtZXRob2QgKi9cbiAgICBzaWduYWxpbmc/OiBSVENTaWduYWxpbmc7XG4gICAgLyoqIEF1dG8tbmVnb3RpYXRlIG9uIGNvbm5lY3QgKi9cbiAgICBhdXRvTmVnb3RpYXRlPzogYm9vbGVhbjtcbiAgICAvKiogQmluYXJ5IHNlcmlhbGl6YXRpb24gZm9ybWF0ICovXG4gICAgYmluYXJ5Rm9ybWF0PzogXCJqc29uXCIgfCBcImNib3JcIiB8IFwibXNncGFja1wiO1xuICAgIC8qKiBDb25uZWN0aW9uIHRpbWVvdXQgKG1zKSAqL1xuICAgIGNvbm5lY3Rpb25UaW1lb3V0PzogbnVtYmVyO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFJUQ1NpZ25hbGluZyB7XG4gICAgLyoqIFNlbmQgc2lnbmFsaW5nIG1lc3NhZ2UgdG8gcGVlciAqL1xuICAgIHNlbmQocGVlcklkOiBzdHJpbmcsIG1lc3NhZ2U6IFJUQ1NpZ25hbE1lc3NhZ2UpOiB2b2lkIHwgUHJvbWlzZTx2b2lkPjtcbiAgICAvKiogU3Vic2NyaWJlIHRvIHNpZ25hbGluZyBtZXNzYWdlcyAqL1xuICAgIG9uTWVzc2FnZShoYW5kbGVyOiAobWVzc2FnZTogUlRDU2lnbmFsTWVzc2FnZSkgPT4gdm9pZCk6IFN1YnNjcmlwdGlvbiB8ICgoKSA9PiB2b2lkKTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBSVENTaWduYWxNZXNzYWdlIHtcbiAgICB0eXBlOiBcIm9mZmVyXCIgfCBcImFuc3dlclwiIHwgXCJpY2UtY2FuZGlkYXRlXCIgfCBcImRpc2Nvbm5lY3RcIjtcbiAgICBmcm9tUGVlcklkOiBzdHJpbmc7XG4gICAgdG9QZWVySWQ6IHN0cmluZztcbiAgICBzZHA/OiBzdHJpbmc7XG4gICAgY2FuZGlkYXRlPzogUlRDSWNlQ2FuZGlkYXRlSW5pdDtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBSVENQZWVySW5mbyB7XG4gICAgaWQ6IHN0cmluZztcbiAgICBjb25uZWN0aW9uU3RhdGU6IFJUQ1BlZXJDb25uZWN0aW9uU3RhdGU7XG4gICAgaWNlQ29ubmVjdGlvblN0YXRlOiBSVENJY2VDb25uZWN0aW9uU3RhdGU7XG4gICAgZGF0YUNoYW5uZWxTdGF0ZTogUlRDRGF0YUNoYW5uZWxTdGF0ZTtcbiAgICBjb25uZWN0ZWRBdD86IG51bWJlcjtcbiAgICBsYXN0U2Vlbj86IG51bWJlcjtcbn1cblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gREVGQVVMVCBJQ0UgU0VSVkVSU1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5jb25zdCBERUZBVUxUX0lDRV9TRVJWRVJTOiBSVENJY2VTZXJ2ZXJbXSA9IFtcbiAgICB7IHVybHM6IFwic3R1bjpzdHVuLmwuZ29vZ2xlLmNvbToxOTMwMlwiIH0sXG4gICAgeyB1cmxzOiBcInN0dW46c3R1bjEubC5nb29nbGUuY29tOjE5MzAyXCIgfSxcbiAgICB7IHVybHM6IFwic3R1bjpzdHVuMi5sLmdvb2dsZS5jb206MTkzMDJcIiB9XG5dO1xuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBSVEMgUEVFUiBDT05ORUNUSU9OIFdSQVBQRVJcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuZXhwb3J0IGNsYXNzIFJUQ1BlZXJUcmFuc3BvcnQge1xuICAgIHByaXZhdGUgX3BjOiBSVENQZWVyQ29ubmVjdGlvbjtcbiAgICBwcml2YXRlIF9jaGFubmVsOiBSVENEYXRhQ2hhbm5lbCB8IG51bGwgPSBudWxsO1xuICAgIHByaXZhdGUgX3N1YnMgPSBuZXcgU2V0PE9ic2VydmVyPFJUQ01lc3NhZ2U+PigpO1xuICAgIHByaXZhdGUgX3BlbmRpbmcgPSBuZXcgTWFwPHN0cmluZywgUGVuZGluZ1JlcXVlc3Q+KCk7XG4gICAgcHJpdmF0ZSBfbG9jYWxJZDogc3RyaW5nID0gVVVJRHY0KCk7XG4gICAgcHJpdmF0ZSBfcmVtb3RlSWQ6IHN0cmluZyB8IG51bGwgPSBudWxsO1xuICAgIHByaXZhdGUgX3N0YXRlID0gbmV3IENoYW5uZWxTdWJqZWN0PFJUQ1BlZXJDb25uZWN0aW9uU3RhdGU+KCk7XG4gICAgcHJpdmF0ZSBfY2hhbm5lbFN0YXRlID0gbmV3IENoYW5uZWxTdWJqZWN0PFJUQ0RhdGFDaGFubmVsU3RhdGU+KCk7XG4gICAgcHJpdmF0ZSBfaWNlQ2FuZGlkYXRlczogUlRDSWNlQ2FuZGlkYXRlSW5pdFtdID0gW107XG4gICAgcHJpdmF0ZSBfaWNlR2F0aGVyaW5nQ29tcGxldGUgPSBmYWxzZTtcblxuICAgIGNvbnN0cnVjdG9yKFxuICAgICAgICBwcml2YXRlIF9jaGFubmVsTmFtZTogc3RyaW5nLFxuICAgICAgICBwcml2YXRlIF9jb25maWc6IFJUQ1RyYW5zcG9ydENvbmZpZyA9IHt9XG4gICAgKSB7XG4gICAgICAgIHRoaXMuX3BjID0gbmV3IFJUQ1BlZXJDb25uZWN0aW9uKHtcbiAgICAgICAgICAgIGljZVNlcnZlcnM6IF9jb25maWcuaWNlU2VydmVycyA/PyBERUZBVUxUX0lDRV9TRVJWRVJTXG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLl9zZXR1cFBlZXJDb25uZWN0aW9uKCk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBfc2V0dXBQZWVyQ29ubmVjdGlvbigpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fcGMub25pY2VjYW5kaWRhdGUgPSAoZSkgPT4ge1xuICAgICAgICAgICAgaWYgKGUuY2FuZGlkYXRlKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5faWNlQ2FuZGlkYXRlcy5wdXNoKGUuY2FuZGlkYXRlLnRvSlNPTigpKTtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5fcmVtb3RlSWQgJiYgdGhpcy5fY29uZmlnLnNpZ25hbGluZykge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9jb25maWcuc2lnbmFsaW5nLnNlbmQodGhpcy5fcmVtb3RlSWQsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFwiaWNlLWNhbmRpZGF0ZVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgZnJvbVBlZXJJZDogdGhpcy5fbG9jYWxJZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHRvUGVlcklkOiB0aGlzLl9yZW1vdGVJZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhbmRpZGF0ZTogZS5jYW5kaWRhdGUudG9KU09OKClcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMuX3BjLm9uaWNlZ2F0aGVyaW5nc3RhdGVjaGFuZ2UgPSAoKSA9PiB7XG4gICAgICAgICAgICBpZiAodGhpcy5fcGMuaWNlR2F0aGVyaW5nU3RhdGUgPT09IFwiY29tcGxldGVcIikge1xuICAgICAgICAgICAgICAgIHRoaXMuX2ljZUdhdGhlcmluZ0NvbXBsZXRlID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLl9wYy5vbmNvbm5lY3Rpb25zdGF0ZWNoYW5nZSA9ICgpID0+IHtcbiAgICAgICAgICAgIHRoaXMuX3N0YXRlLm5leHQodGhpcy5fcGMuY29ubmVjdGlvblN0YXRlKTtcbiAgICAgICAgICAgIGlmICh0aGlzLl9wYy5jb25uZWN0aW9uU3RhdGUgPT09IFwiZmFpbGVkXCIgfHwgdGhpcy5fcGMuY29ubmVjdGlvblN0YXRlID09PSBcImRpc2Nvbm5lY3RlZFwiKSB7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBzIG9mIHRoaXMuX3N1YnMpIHMuZXJyb3I/LihuZXcgRXJyb3IoYENvbm5lY3Rpb24gJHt0aGlzLl9wYy5jb25uZWN0aW9uU3RhdGV9YCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMuX3BjLm9uZGF0YWNoYW5uZWwgPSAoZSkgPT4ge1xuICAgICAgICAgICAgdGhpcy5fc2V0dXBEYXRhQ2hhbm5lbChlLmNoYW5uZWwpO1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIHByaXZhdGUgX3NldHVwRGF0YUNoYW5uZWwoY2hhbm5lbDogUlRDRGF0YUNoYW5uZWwpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fY2hhbm5lbCA9IGNoYW5uZWw7XG4gICAgICAgIGNoYW5uZWwuYmluYXJ5VHlwZSA9IFwiYXJyYXlidWZmZXJcIjtcblxuICAgICAgICBjaGFubmVsLm9ub3BlbiA9ICgpID0+IHtcbiAgICAgICAgICAgIHRoaXMuX2NoYW5uZWxTdGF0ZS5uZXh0KFwib3BlblwiKTtcbiAgICAgICAgfTtcblxuICAgICAgICBjaGFubmVsLm9uY2xvc2UgPSAoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLl9jaGFubmVsU3RhdGUubmV4dChcImNsb3NlZFwiKTtcbiAgICAgICAgICAgIGZvciAoY29uc3QgcyBvZiB0aGlzLl9zdWJzKSBzLmNvbXBsZXRlPy4oKTtcbiAgICAgICAgfTtcblxuICAgICAgICBjaGFubmVsLm9uZXJyb3IgPSAoZSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgZXJyID0gbmV3IEVycm9yKFwiRGF0YUNoYW5uZWwgZXJyb3JcIik7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IHMgb2YgdGhpcy5fc3Vicykgcy5lcnJvcj8uKGVycik7XG4gICAgICAgIH07XG5cbiAgICAgICAgY2hhbm5lbC5vbm1lc3NhZ2UgPSAoZSkgPT4ge1xuICAgICAgICAgICAgbGV0IGRhdGE6IFJUQ01lc3NhZ2U7XG5cbiAgICAgICAgICAgIGlmICh0eXBlb2YgZS5kYXRhID09PSBcInN0cmluZ1wiKSB7XG4gICAgICAgICAgICAgICAgZGF0YSA9IEpTT04ucGFyc2UoZS5kYXRhKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gQmluYXJ5IGRhdGEgLSBkZWNvZGUgYmFzZWQgb24gZm9ybWF0XG4gICAgICAgICAgICAgICAgZGF0YSA9IHRoaXMuX2RlY29kZUJpbmFyeShlLmRhdGEpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBkYXRhLnBlZXJJZCA9IHRoaXMuX3JlbW90ZUlkID8/IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIGRhdGEuZGF0YUNoYW5uZWxMYWJlbCA9IGNoYW5uZWwubGFiZWw7XG5cbiAgICAgICAgICAgIC8vIEhhbmRsZSByZXNwb25zZVxuICAgICAgICAgICAgaWYgKGRhdGEudHlwZSA9PT0gXCJyZXNwb25zZVwiICYmIGRhdGEucmVxSWQpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBwID0gdGhpcy5fcGVuZGluZy5nZXQoZGF0YS5yZXFJZCk7XG4gICAgICAgICAgICAgICAgaWYgKHApIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fcGVuZGluZy5kZWxldGUoZGF0YS5yZXFJZCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChkYXRhLnBheWxvYWQ/LmVycm9yKSBwLnJlamVjdChuZXcgRXJyb3IoZGF0YS5wYXlsb2FkLmVycm9yKSk7XG4gICAgICAgICAgICAgICAgICAgIGVsc2UgcC5yZXNvbHZlKGRhdGEucGF5bG9hZD8ucmVzdWx0ID8/IGRhdGEucGF5bG9hZCk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGZvciAoY29uc3QgcyBvZiB0aGlzLl9zdWJzKSB7XG4gICAgICAgICAgICAgICAgdHJ5IHsgcy5uZXh0Py4oZGF0YSk7IH0gY2F0Y2ggKGUpIHsgcy5lcnJvcj8uKGUgYXMgRXJyb3IpOyB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlIG9mZmVyIHRvIGluaXRpYXRlIGNvbm5lY3Rpb25cbiAgICAgKi9cbiAgICBhc3luYyBjcmVhdGVPZmZlcihyZW1vdGVJZDogc3RyaW5nKTogUHJvbWlzZTxSVENTaWduYWxNZXNzYWdlPiB7XG4gICAgICAgIHRoaXMuX3JlbW90ZUlkID0gcmVtb3RlSWQ7XG5cbiAgICAgICAgLy8gQ3JlYXRlIGRhdGEgY2hhbm5lbFxuICAgICAgICBjb25zdCBjaGFubmVsID0gdGhpcy5fcGMuY3JlYXRlRGF0YUNoYW5uZWwodGhpcy5fY2hhbm5lbE5hbWUsIHRoaXMuX2NvbmZpZy5kYXRhQ2hhbm5lbE9wdGlvbnMpO1xuICAgICAgICB0aGlzLl9zZXR1cERhdGFDaGFubmVsKGNoYW5uZWwpO1xuXG4gICAgICAgIC8vIENyZWF0ZSBvZmZlclxuICAgICAgICBjb25zdCBvZmZlciA9IGF3YWl0IHRoaXMuX3BjLmNyZWF0ZU9mZmVyKCk7XG4gICAgICAgIGF3YWl0IHRoaXMuX3BjLnNldExvY2FsRGVzY3JpcHRpb24ob2ZmZXIpO1xuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0eXBlOiBcIm9mZmVyXCIsXG4gICAgICAgICAgICBmcm9tUGVlcklkOiB0aGlzLl9sb2NhbElkLFxuICAgICAgICAgICAgdG9QZWVySWQ6IHJlbW90ZUlkLFxuICAgICAgICAgICAgc2RwOiBvZmZlci5zZHBcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBIYW5kbGUgaW5jb21pbmcgb2ZmZXJcbiAgICAgKi9cbiAgICBhc3luYyBoYW5kbGVPZmZlcihzaWduYWw6IFJUQ1NpZ25hbE1lc3NhZ2UpOiBQcm9taXNlPFJUQ1NpZ25hbE1lc3NhZ2U+IHtcbiAgICAgICAgdGhpcy5fcmVtb3RlSWQgPSBzaWduYWwuZnJvbVBlZXJJZDtcblxuICAgICAgICBhd2FpdCB0aGlzLl9wYy5zZXRSZW1vdGVEZXNjcmlwdGlvbih7XG4gICAgICAgICAgICB0eXBlOiBcIm9mZmVyXCIsXG4gICAgICAgICAgICBzZHA6IHNpZ25hbC5zZHBcbiAgICAgICAgfSk7XG5cbiAgICAgICAgY29uc3QgYW5zd2VyID0gYXdhaXQgdGhpcy5fcGMuY3JlYXRlQW5zd2VyKCk7XG4gICAgICAgIGF3YWl0IHRoaXMuX3BjLnNldExvY2FsRGVzY3JpcHRpb24oYW5zd2VyKTtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogXCJhbnN3ZXJcIixcbiAgICAgICAgICAgIGZyb21QZWVySWQ6IHRoaXMuX2xvY2FsSWQsXG4gICAgICAgICAgICB0b1BlZXJJZDogc2lnbmFsLmZyb21QZWVySWQsXG4gICAgICAgICAgICBzZHA6IGFuc3dlci5zZHBcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBIYW5kbGUgaW5jb21pbmcgYW5zd2VyXG4gICAgICovXG4gICAgYXN5bmMgaGFuZGxlQW5zd2VyKHNpZ25hbDogUlRDU2lnbmFsTWVzc2FnZSk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBhd2FpdCB0aGlzLl9wYy5zZXRSZW1vdGVEZXNjcmlwdGlvbih7XG4gICAgICAgICAgICB0eXBlOiBcImFuc3dlclwiLFxuICAgICAgICAgICAgc2RwOiBzaWduYWwuc2RwXG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEhhbmRsZSBpbmNvbWluZyBJQ0UgY2FuZGlkYXRlXG4gICAgICovXG4gICAgYXN5bmMgYWRkSWNlQ2FuZGlkYXRlKHNpZ25hbDogUlRDU2lnbmFsTWVzc2FnZSk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBpZiAoc2lnbmFsLmNhbmRpZGF0ZSkge1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5fcGMuYWRkSWNlQ2FuZGlkYXRlKHNpZ25hbC5jYW5kaWRhdGUpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogU2VuZCBtZXNzYWdlIHRvIHBlZXJcbiAgICAgKi9cbiAgICBzZW5kKG1zZzogUlRDTWVzc2FnZSwgYmluYXJ5PzogYm9vbGVhbik6IHZvaWQge1xuICAgICAgICBpZiAoIXRoaXMuX2NoYW5uZWwgfHwgdGhpcy5fY2hhbm5lbC5yZWFkeVN0YXRlICE9PSBcIm9wZW5cIikgcmV0dXJuO1xuXG4gICAgICAgIGNvbnN0IHsgdHJhbnNmZXJhYmxlLCBwZWVySWQsIGRhdGFDaGFubmVsTGFiZWwsIC4uLmRhdGEgfSA9IG1zZyBhcyBhbnk7XG5cbiAgICAgICAgaWYgKGJpbmFyeSB8fCBtc2cuYmluYXJ5KSB7XG4gICAgICAgICAgICB0aGlzLl9jaGFubmVsLnNlbmQodGhpcy5fZW5jb2RlQmluYXJ5KGRhdGEpKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX2NoYW5uZWwuc2VuZChKU09OLnN0cmluZ2lmeShkYXRhKSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBTZW5kIHJlcXVlc3QgYW5kIHdhaXQgZm9yIHJlc3BvbnNlXG4gICAgICovXG4gICAgcmVxdWVzdChtc2c6IFJUQ01lc3NhZ2UpOiBQcm9taXNlPGFueT4ge1xuICAgICAgICBjb25zdCByZXFJZCA9IG1zZy5yZXFJZCA/PyBVVUlEdjQoKTtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHRpbWVvdXQgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLl9wZW5kaW5nLmRlbGV0ZShyZXFJZCk7XG4gICAgICAgICAgICAgICAgcmVqZWN0KG5ldyBFcnJvcihcIlJlcXVlc3QgdGltZW91dFwiKSk7XG4gICAgICAgICAgICB9LCB0aGlzLl9jb25maWcuY29ubmVjdGlvblRpbWVvdXQgPz8gMzAwMDApO1xuXG4gICAgICAgICAgICB0aGlzLl9wZW5kaW5nLnNldChyZXFJZCwge1xuICAgICAgICAgICAgICAgIHJlc29sdmU6ICh2KSA9PiB7IGNsZWFyVGltZW91dCh0aW1lb3V0KTsgcmVzb2x2ZSh2KTsgfSxcbiAgICAgICAgICAgICAgICByZWplY3Q6IChlKSA9PiB7IGNsZWFyVGltZW91dCh0aW1lb3V0KTsgcmVqZWN0KGUpOyB9LFxuICAgICAgICAgICAgICAgIHRpbWVzdGFtcDogRGF0ZS5ub3coKVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIHRoaXMuc2VuZCh7IC4uLm1zZywgcmVxSWQsIHR5cGU6IFwicmVxdWVzdFwiIH0gYXMgUlRDTWVzc2FnZSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHN1YnNjcmliZShvYnNlcnZlcjogT2JzZXJ2ZXI8UlRDTWVzc2FnZT4gfCAoKHY6IFJUQ01lc3NhZ2UpID0+IHZvaWQpKTogU3Vic2NyaXB0aW9uIHtcbiAgICAgICAgY29uc3Qgb2JzOiBPYnNlcnZlcjxSVENNZXNzYWdlPiA9IHR5cGVvZiBvYnNlcnZlciA9PT0gXCJmdW5jdGlvblwiID8geyBuZXh0OiBvYnNlcnZlciB9IDogb2JzZXJ2ZXI7XG4gICAgICAgIHRoaXMuX3N1YnMuYWRkKG9icyk7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBjbG9zZWQ6IGZhbHNlLFxuICAgICAgICAgICAgdW5zdWJzY3JpYmU6ICgpID0+IHsgdGhpcy5fc3Vicy5kZWxldGUob2JzKTsgfVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIHByaXZhdGUgX2VuY29kZUJpbmFyeShkYXRhOiBhbnkpOiBBcnJheUJ1ZmZlciB7XG4gICAgICAgIGNvbnN0IGpzb24gPSBKU09OLnN0cmluZ2lmeShkYXRhKTtcbiAgICAgICAgcmV0dXJuIG5ldyBUZXh0RW5jb2RlcigpLmVuY29kZShqc29uKS5idWZmZXI7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBfZGVjb2RlQmluYXJ5KGJ1ZmZlcjogQXJyYXlCdWZmZXIpOiBSVENNZXNzYWdlIHtcbiAgICAgICAgY29uc3QganNvbiA9IG5ldyBUZXh0RGVjb2RlcigpLmRlY29kZShidWZmZXIpO1xuICAgICAgICByZXR1cm4gSlNPTi5wYXJzZShqc29uKTtcbiAgICB9XG5cbiAgICBjbG9zZSgpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fc3Vicy5mb3JFYWNoKHMgPT4gcy5jb21wbGV0ZT8uKCkpO1xuICAgICAgICB0aGlzLl9zdWJzLmNsZWFyKCk7XG5cbiAgICAgICAgaWYgKHRoaXMuX3JlbW90ZUlkICYmIHRoaXMuX2NvbmZpZy5zaWduYWxpbmcpIHtcbiAgICAgICAgICAgIHRoaXMuX2NvbmZpZy5zaWduYWxpbmcuc2VuZCh0aGlzLl9yZW1vdGVJZCwge1xuICAgICAgICAgICAgICAgIHR5cGU6IFwiZGlzY29ubmVjdFwiLFxuICAgICAgICAgICAgICAgIGZyb21QZWVySWQ6IHRoaXMuX2xvY2FsSWQsXG4gICAgICAgICAgICAgICAgdG9QZWVySWQ6IHRoaXMuX3JlbW90ZUlkXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuX2NoYW5uZWw/LmNsb3NlKCk7XG4gICAgICAgIHRoaXMuX3BjLmNsb3NlKCk7XG4gICAgfVxuXG4gICAgZ2V0IGxvY2FsSWQoKTogc3RyaW5nIHsgcmV0dXJuIHRoaXMuX2xvY2FsSWQ7IH1cbiAgICBnZXQgcmVtb3RlSWQoKTogc3RyaW5nIHwgbnVsbCB7IHJldHVybiB0aGlzLl9yZW1vdGVJZDsgfVxuICAgIGdldCBjb25uZWN0aW9uU3RhdGUoKTogUlRDUGVlckNvbm5lY3Rpb25TdGF0ZSB7IHJldHVybiB0aGlzLl9wYy5jb25uZWN0aW9uU3RhdGU7IH1cbiAgICBnZXQgY2hhbm5lbFN0YXRlKCk6IFJUQ0RhdGFDaGFubmVsU3RhdGUgfCBudWxsIHsgcmV0dXJuIHRoaXMuX2NoYW5uZWw/LnJlYWR5U3RhdGUgPz8gbnVsbDsgfVxuICAgIGdldCBzdGF0ZSgpIHsgcmV0dXJuIHRoaXMuX3N0YXRlOyB9XG4gICAgZ2V0IGNoYW5uZWxTdGF0ZU9ic2VydmFibGUoKSB7IHJldHVybiB0aGlzLl9jaGFubmVsU3RhdGU7IH1cbiAgICBnZXQgaWNlQ2FuZGlkYXRlcygpOiBSVENJY2VDYW5kaWRhdGVJbml0W10geyByZXR1cm4gWy4uLnRoaXMuX2ljZUNhbmRpZGF0ZXNdOyB9XG4gICAgZ2V0IGNoYW5uZWxOYW1lKCk6IHN0cmluZyB7IHJldHVybiB0aGlzLl9jaGFubmVsTmFtZTsgfVxufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBSVEMgUEVFUiBNQU5BR0VSIChNdWx0aS1wZWVyKVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5leHBvcnQgY2xhc3MgUlRDUGVlck1hbmFnZXIge1xuICAgIHByaXZhdGUgX3BlZXJzID0gbmV3IE1hcDxzdHJpbmcsIFJUQ1BlZXJUcmFuc3BvcnQ+KCk7XG4gICAgcHJpdmF0ZSBfbG9jYWxJZDogc3RyaW5nID0gVVVJRHY0KCk7XG4gICAgcHJpdmF0ZSBfc3VicyA9IG5ldyBTZXQ8T2JzZXJ2ZXI8UlRDTWVzc2FnZT4+KCk7XG4gICAgcHJpdmF0ZSBfc2lnbmFsaW5nQ2xlYW51cDogKCgpID0+IHZvaWQpIHwgbnVsbCA9IG51bGw7XG4gICAgcHJpdmF0ZSBfcGVlckV2ZW50cyA9IG5ldyBDaGFubmVsU3ViamVjdDx7XG4gICAgICAgIHR5cGU6IFwiY29ubmVjdGVkXCIgfCBcImRpc2Nvbm5lY3RlZFwiIHwgXCJmYWlsZWRcIjtcbiAgICAgICAgcGVlcklkOiBzdHJpbmc7XG4gICAgICAgIHBlZXI/OiBSVENQZWVyVHJhbnNwb3J0O1xuICAgIH0+KCk7XG5cbiAgICBjb25zdHJ1Y3RvcihcbiAgICAgICAgcHJpdmF0ZSBfY2hhbm5lbE5hbWU6IHN0cmluZyxcbiAgICAgICAgcHJpdmF0ZSBfY29uZmlnOiBSVENUcmFuc3BvcnRDb25maWcgPSB7fVxuICAgICkge1xuICAgICAgICB0aGlzLl9zZXR1cFNpZ25hbGluZygpO1xuICAgIH1cblxuICAgIHByaXZhdGUgX3NldHVwU2lnbmFsaW5nKCk6IHZvaWQge1xuICAgICAgICBpZiAoIXRoaXMuX2NvbmZpZy5zaWduYWxpbmcpIHJldHVybjtcblxuICAgICAgICBjb25zdCBjbGVhbnVwID0gdGhpcy5fY29uZmlnLnNpZ25hbGluZy5vbk1lc3NhZ2UoYXN5bmMgKHNpZ25hbCkgPT4ge1xuICAgICAgICAgICAgaWYgKHNpZ25hbC50b1BlZXJJZCAhPT0gdGhpcy5fbG9jYWxJZCkgcmV0dXJuO1xuXG4gICAgICAgICAgICBzd2l0Y2ggKHNpZ25hbC50eXBlKSB7XG4gICAgICAgICAgICAgICAgY2FzZSBcIm9mZmVyXCI6IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcGVlciA9IHRoaXMuX2dldE9yQ3JlYXRlUGVlcihzaWduYWwuZnJvbVBlZXJJZCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGFuc3dlciA9IGF3YWl0IHBlZXIuaGFuZGxlT2ZmZXIoc2lnbmFsKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fY29uZmlnLnNpZ25hbGluZyEuc2VuZChzaWduYWwuZnJvbVBlZXJJZCwgYW5zd2VyKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNhc2UgXCJhbnN3ZXJcIjoge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBwZWVyID0gdGhpcy5fcGVlcnMuZ2V0KHNpZ25hbC5mcm9tUGVlcklkKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHBlZXIpIGF3YWl0IHBlZXIuaGFuZGxlQW5zd2VyKHNpZ25hbCk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjYXNlIFwiaWNlLWNhbmRpZGF0ZVwiOiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHBlZXIgPSB0aGlzLl9wZWVycy5nZXQoc2lnbmFsLmZyb21QZWVySWQpO1xuICAgICAgICAgICAgICAgICAgICBpZiAocGVlcikgYXdhaXQgcGVlci5hZGRJY2VDYW5kaWRhdGUoc2lnbmFsKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNhc2UgXCJkaXNjb25uZWN0XCI6IHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fcmVtb3ZlUGVlcihzaWduYWwuZnJvbVBlZXJJZCk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgaWYgKHR5cGVvZiBjbGVhbnVwID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgIHRoaXMuX3NpZ25hbGluZ0NsZWFudXAgPSBjbGVhbnVwO1xuICAgICAgICB9IGVsc2UgaWYgKGNsZWFudXAgJiYgXCJ1bnN1YnNjcmliZVwiIGluIGNsZWFudXApIHtcbiAgICAgICAgICAgIHRoaXMuX3NpZ25hbGluZ0NsZWFudXAgPSAoKSA9PiBjbGVhbnVwLnVuc3Vic2NyaWJlKCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIF9nZXRPckNyZWF0ZVBlZXIocGVlcklkOiBzdHJpbmcpOiBSVENQZWVyVHJhbnNwb3J0IHtcbiAgICAgICAgbGV0IHBlZXIgPSB0aGlzLl9wZWVycy5nZXQocGVlcklkKTtcbiAgICAgICAgaWYgKCFwZWVyKSB7XG4gICAgICAgICAgICBwZWVyID0gbmV3IFJUQ1BlZXJUcmFuc3BvcnQodGhpcy5fY2hhbm5lbE5hbWUsIHRoaXMuX2NvbmZpZyk7XG4gICAgICAgICAgICB0aGlzLl9wZWVycy5zZXQocGVlcklkLCBwZWVyKTtcblxuICAgICAgICAgICAgLy8gU3Vic2NyaWJlIHRvIHBlZXIgZXZlbnRzXG4gICAgICAgICAgICBwZWVyLnN0YXRlLnN1YnNjcmliZSh7XG4gICAgICAgICAgICAgICAgbmV4dDogKHN0YXRlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzdGF0ZSA9PT0gXCJjb25uZWN0ZWRcIikge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fcGVlckV2ZW50cy5uZXh0KHsgdHlwZTogXCJjb25uZWN0ZWRcIiwgcGVlcklkLCBwZWVyIH0pO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHN0YXRlID09PSBcImRpc2Nvbm5lY3RlZFwiIHx8IHN0YXRlID09PSBcImNsb3NlZFwiKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9wZWVyRXZlbnRzLm5leHQoeyB0eXBlOiBcImRpc2Nvbm5lY3RlZFwiLCBwZWVySWQgfSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoc3RhdGUgPT09IFwiZmFpbGVkXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX3BlZXJFdmVudHMubmV4dCh7IHR5cGU6IFwiZmFpbGVkXCIsIHBlZXJJZCB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX3JlbW92ZVBlZXIocGVlcklkKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAvLyBGb3J3YXJkIG1lc3NhZ2VzXG4gICAgICAgICAgICBwZWVyLnN1YnNjcmliZSh7XG4gICAgICAgICAgICAgICAgbmV4dDogKG1zZykgPT4ge1xuICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IHMgb2YgdGhpcy5fc3Vicykge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHJ5IHsgcy5uZXh0Py4obXNnKTsgfSBjYXRjaCAoZSkgeyBzLmVycm9yPy4oZSBhcyBFcnJvcik7IH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgZXJyb3I6IChlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3QgcyBvZiB0aGlzLl9zdWJzKSBzLmVycm9yPy4oZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHBlZXI7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBfcmVtb3ZlUGVlcihwZWVySWQ6IHN0cmluZyk6IHZvaWQge1xuICAgICAgICBjb25zdCBwZWVyID0gdGhpcy5fcGVlcnMuZ2V0KHBlZXJJZCk7XG4gICAgICAgIGlmIChwZWVyKSB7XG4gICAgICAgICAgICBwZWVyLmNsb3NlKCk7XG4gICAgICAgICAgICB0aGlzLl9wZWVycy5kZWxldGUocGVlcklkKTtcbiAgICAgICAgICAgIHRoaXMuX3BlZXJFdmVudHMubmV4dCh7IHR5cGU6IFwiZGlzY29ubmVjdGVkXCIsIHBlZXJJZCB9KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENvbm5lY3QgdG8gYSBwZWVyXG4gICAgICovXG4gICAgYXN5bmMgY29ubmVjdChwZWVySWQ6IHN0cmluZyk6IFByb21pc2U8UlRDUGVlclRyYW5zcG9ydD4ge1xuICAgICAgICBjb25zdCBwZWVyID0gdGhpcy5fZ2V0T3JDcmVhdGVQZWVyKHBlZXJJZCk7XG4gICAgICAgIGNvbnN0IG9mZmVyID0gYXdhaXQgcGVlci5jcmVhdGVPZmZlcihwZWVySWQpO1xuXG4gICAgICAgIGlmICh0aGlzLl9jb25maWcuc2lnbmFsaW5nKSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLl9jb25maWcuc2lnbmFsaW5nLnNlbmQocGVlcklkLCBvZmZlcik7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gcGVlcjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBTZW5kIHRvIHNwZWNpZmljIHBlZXJcbiAgICAgKi9cbiAgICBzZW5kKHBlZXJJZDogc3RyaW5nLCBtc2c6IFJUQ01lc3NhZ2UpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fcGVlcnMuZ2V0KHBlZXJJZCk/LnNlbmQobXNnKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBCcm9hZGNhc3QgdG8gYWxsIHBlZXJzXG4gICAgICovXG4gICAgYnJvYWRjYXN0KG1zZzogUlRDTWVzc2FnZSk6IHZvaWQge1xuICAgICAgICBmb3IgKGNvbnN0IHBlZXIgb2YgdGhpcy5fcGVlcnMudmFsdWVzKCkpIHtcbiAgICAgICAgICAgIHBlZXIuc2VuZChtc2cpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmVxdWVzdCBmcm9tIHNwZWNpZmljIHBlZXJcbiAgICAgKi9cbiAgICByZXF1ZXN0KHBlZXJJZDogc3RyaW5nLCBtc2c6IFJUQ01lc3NhZ2UpOiBQcm9taXNlPGFueT4ge1xuICAgICAgICBjb25zdCBwZWVyID0gdGhpcy5fcGVlcnMuZ2V0KHBlZXJJZCk7XG4gICAgICAgIGlmICghcGVlcikgcmV0dXJuIFByb21pc2UucmVqZWN0KG5ldyBFcnJvcihcIlBlZXIgbm90IGZvdW5kXCIpKTtcbiAgICAgICAgcmV0dXJuIHBlZXIucmVxdWVzdChtc2cpO1xuICAgIH1cblxuICAgIHN1YnNjcmliZShvYnNlcnZlcjogT2JzZXJ2ZXI8UlRDTWVzc2FnZT4gfCAoKHY6IFJUQ01lc3NhZ2UpID0+IHZvaWQpKTogU3Vic2NyaXB0aW9uIHtcbiAgICAgICAgY29uc3Qgb2JzOiBPYnNlcnZlcjxSVENNZXNzYWdlPiA9IHR5cGVvZiBvYnNlcnZlciA9PT0gXCJmdW5jdGlvblwiID8geyBuZXh0OiBvYnNlcnZlciB9IDogb2JzZXJ2ZXI7XG4gICAgICAgIHRoaXMuX3N1YnMuYWRkKG9icyk7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBjbG9zZWQ6IGZhbHNlLFxuICAgICAgICAgICAgdW5zdWJzY3JpYmU6ICgpID0+IHsgdGhpcy5fc3Vicy5kZWxldGUob2JzKTsgfVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIG9uUGVlckV2ZW50KGhhbmRsZXI6IChlOiB7IHR5cGU6IFwiY29ubmVjdGVkXCIgfCBcImRpc2Nvbm5lY3RlZFwiIHwgXCJmYWlsZWRcIjsgcGVlcklkOiBzdHJpbmcgfSkgPT4gdm9pZCk6IFN1YnNjcmlwdGlvbiB7XG4gICAgICAgIHJldHVybiB0aGlzLl9wZWVyRXZlbnRzLnN1YnNjcmliZSh7IG5leHQ6IGhhbmRsZXIgfSk7XG4gICAgfVxuXG4gICAgZ2V0UGVlcnMoKTogTWFwPHN0cmluZywgUlRDUGVlckluZm8+IHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gbmV3IE1hcDxzdHJpbmcsIFJUQ1BlZXJJbmZvPigpO1xuICAgICAgICBmb3IgKGNvbnN0IFtpZCwgcGVlcl0gb2YgdGhpcy5fcGVlcnMpIHtcbiAgICAgICAgICAgIHJlc3VsdC5zZXQoaWQsIHtcbiAgICAgICAgICAgICAgICBpZCxcbiAgICAgICAgICAgICAgICBjb25uZWN0aW9uU3RhdGU6IHBlZXIuY29ubmVjdGlvblN0YXRlLFxuICAgICAgICAgICAgICAgIGljZUNvbm5lY3Rpb25TdGF0ZTogXCJuZXdcIiwgLy8gc2ltcGxpZmllZFxuICAgICAgICAgICAgICAgIGRhdGFDaGFubmVsU3RhdGU6IHBlZXIuY2hhbm5lbFN0YXRlID8/IFwiY2xvc2VkXCJcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgY2xvc2UoKTogdm9pZCB7XG4gICAgICAgIHRoaXMuX3NpZ25hbGluZ0NsZWFudXA/LigpO1xuICAgICAgICB0aGlzLl9zdWJzLmZvckVhY2gocyA9PiBzLmNvbXBsZXRlPy4oKSk7XG4gICAgICAgIHRoaXMuX3N1YnMuY2xlYXIoKTtcbiAgICAgICAgZm9yIChjb25zdCBwZWVyIG9mIHRoaXMuX3BlZXJzLnZhbHVlcygpKSB7XG4gICAgICAgICAgICBwZWVyLmNsb3NlKCk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fcGVlcnMuY2xlYXIoKTtcbiAgICB9XG5cbiAgICBnZXQgbG9jYWxJZCgpOiBzdHJpbmcgeyByZXR1cm4gdGhpcy5fbG9jYWxJZDsgfVxuICAgIGdldCBwZWVyQ291bnQoKTogbnVtYmVyIHsgcmV0dXJuIHRoaXMuX3BlZXJzLnNpemU7IH1cbiAgICBnZXQgY2hhbm5lbE5hbWUoKTogc3RyaW5nIHsgcmV0dXJuIHRoaXMuX2NoYW5uZWxOYW1lOyB9XG59XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFNJTVBMRSBCUk9BRENBU1QgQ0hBTk5FTCBTSUdOQUxJTkdcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBTaW1wbGUgc2lnbmFsaW5nIHVzaW5nIEJyb2FkY2FzdENoYW5uZWwgKGZvciBzYW1lLW9yaWdpbiBwZWVycylcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUJyb2FkY2FzdFNpZ25hbGluZyhjaGFubmVsTmFtZTogc3RyaW5nKTogUlRDU2lnbmFsaW5nICYgeyBjbG9zZSgpOiB2b2lkIH0ge1xuICAgIGNvbnN0IGJjID0gbmV3IEJyb2FkY2FzdENoYW5uZWwoYHJ0Yy1zaWduYWxpbmc6JHtjaGFubmVsTmFtZX1gKTtcbiAgICBjb25zdCBoYW5kbGVycyA9IG5ldyBTZXQ8KG1zZzogUlRDU2lnbmFsTWVzc2FnZSkgPT4gdm9pZD4oKTtcblxuICAgIGJjLm9ubWVzc2FnZSA9IChlKSA9PiB7XG4gICAgICAgIGZvciAoY29uc3QgaCBvZiBoYW5kbGVycykgaChlLmRhdGEpO1xuICAgIH07XG5cbiAgICByZXR1cm4ge1xuICAgICAgICBzZW5kKHBlZXJJZDogc3RyaW5nLCBtZXNzYWdlOiBSVENTaWduYWxNZXNzYWdlKSB7XG4gICAgICAgICAgICBiYy5wb3N0TWVzc2FnZShtZXNzYWdlKTtcbiAgICAgICAgfSxcbiAgICAgICAgb25NZXNzYWdlKGhhbmRsZXIpIHtcbiAgICAgICAgICAgIGhhbmRsZXJzLmFkZChoYW5kbGVyKTtcbiAgICAgICAgICAgIHJldHVybiB7IHVuc3Vic2NyaWJlOiAoKSA9PiBoYW5kbGVycy5kZWxldGUoaGFuZGxlciksIGNsb3NlZDogZmFsc2UgfTtcbiAgICAgICAgfSxcbiAgICAgICAgY2xvc2UoKSB7XG4gICAgICAgICAgICBiYy5jbG9zZSgpO1xuICAgICAgICAgICAgaGFuZGxlcnMuY2xlYXIoKTtcbiAgICAgICAgfVxuICAgIH07XG59XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIEZBQ1RPUllcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuZXhwb3J0IGNvbnN0IFJUQ1RyYW5zcG9ydEZhY3RvcnkgPSB7XG4gICAgY3JlYXRlUGVlcjogKG5hbWU6IHN0cmluZywgY29uZmlnPzogUlRDVHJhbnNwb3J0Q29uZmlnKSA9PlxuICAgICAgICBuZXcgUlRDUGVlclRyYW5zcG9ydChuYW1lLCBjb25maWcpLFxuICAgIGNyZWF0ZU1hbmFnZXI6IChuYW1lOiBzdHJpbmcsIGNvbmZpZz86IFJUQ1RyYW5zcG9ydENvbmZpZykgPT5cbiAgICAgICAgbmV3IFJUQ1BlZXJNYW5hZ2VyKG5hbWUsIGNvbmZpZyksXG4gICAgY3JlYXRlU2lnbmFsaW5nOiAobmFtZTogc3RyaW5nKSA9PlxuICAgICAgICBjcmVhdGVCcm9hZGNhc3RTaWduYWxpbmcobmFtZSlcbn07XG4iXX0=