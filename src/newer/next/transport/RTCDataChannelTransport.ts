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
import { Observable, ChannelSubject, type Subscription, type Observer } from "../observable/Observable";
import type { ChannelMessage, PendingRequest, Subscriber } from "../types/Interface";

// ============================================================================
// TYPES
// ============================================================================

export interface RTCMessage<T = any> extends ChannelMessage {
    peerId?: string;
    dataChannelLabel?: string;
    binary?: boolean;
}

export interface RTCTransportConfig {
    /** ICE servers for STUN/TURN */
    iceServers?: RTCIceServer[];
    /** Data channel options */
    dataChannelOptions?: RTCDataChannelInit;
    /** Signaling method */
    signaling?: RTCSignaling;
    /** Auto-negotiate on connect */
    autoNegotiate?: boolean;
    /** Binary serialization format */
    binaryFormat?: "json" | "cbor" | "msgpack";
    /** Connection timeout (ms) */
    connectionTimeout?: number;
}

export interface RTCSignaling {
    /** Send signaling message to peer */
    send(peerId: string, message: RTCSignalMessage): void | Promise<void>;
    /** Subscribe to signaling messages */
    onMessage(handler: (message: RTCSignalMessage) => void): Subscription | (() => void);
}

export interface RTCSignalMessage {
    type: "offer" | "answer" | "ice-candidate" | "disconnect";
    fromPeerId: string;
    toPeerId: string;
    sdp?: string;
    candidate?: RTCIceCandidateInit;
}

export interface RTCPeerInfo {
    id: string;
    connectionState: RTCPeerConnectionState;
    iceConnectionState: RTCIceConnectionState;
    dataChannelState: RTCDataChannelState;
    connectedAt?: number;
    lastSeen?: number;
}

// ============================================================================
// DEFAULT ICE SERVERS
// ============================================================================

const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" }
];

// ============================================================================
// RTC PEER CONNECTION WRAPPER
// ============================================================================

export class RTCPeerTransport {
    private _pc: RTCPeerConnection;
    private _channel: RTCDataChannel | null = null;
    private _subs = new Set<Observer<RTCMessage>>();
    private _pending = new Map<string, PendingRequest>();
    private _localId: string = UUIDv4();
    private _remoteId: string | null = null;
    private _state = new ChannelSubject<RTCPeerConnectionState>();
    private _channelState = new ChannelSubject<RTCDataChannelState>();
    private _iceCandidates: RTCIceCandidateInit[] = [];
    private _iceGatheringComplete = false;

    constructor(
        private _channelName: string,
        private _config: RTCTransportConfig = {}
    ) {
        this._pc = new RTCPeerConnection({
            iceServers: _config.iceServers ?? DEFAULT_ICE_SERVERS
        });
        this._setupPeerConnection();
    }

    private _setupPeerConnection(): void {
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
                for (const s of this._subs) s.error?.(new Error(`Connection ${this._pc.connectionState}`));
            }
        };

        this._pc.ondatachannel = (e) => {
            this._setupDataChannel(e.channel);
        };
    }

    private _setupDataChannel(channel: RTCDataChannel): void {
        this._channel = channel;
        channel.binaryType = "arraybuffer";

        channel.onopen = () => {
            this._channelState.next("open");
        };

        channel.onclose = () => {
            this._channelState.next("closed");
            for (const s of this._subs) s.complete?.();
        };

        channel.onerror = (e) => {
            const err = new Error("DataChannel error");
            for (const s of this._subs) s.error?.(err);
        };

        channel.onmessage = (e) => {
            let data: RTCMessage;

            if (typeof e.data === "string") {
                data = JSON.parse(e.data);
            } else {
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
                    if (data.payload?.error) p.reject(new Error(data.payload.error));
                    else p.resolve(data.payload?.result ?? data.payload);
                    return;
                }
            }

            for (const s of this._subs) {
                try { s.next?.(data); } catch (e) { s.error?.(e as Error); }
            }
        };
    }

    /**
     * Create offer to initiate connection
     */
    async createOffer(remoteId: string): Promise<RTCSignalMessage> {
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
    async handleOffer(signal: RTCSignalMessage): Promise<RTCSignalMessage> {
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
    async handleAnswer(signal: RTCSignalMessage): Promise<void> {
        await this._pc.setRemoteDescription({
            type: "answer",
            sdp: signal.sdp
        });
    }

    /**
     * Handle incoming ICE candidate
     */
    async addIceCandidate(signal: RTCSignalMessage): Promise<void> {
        if (signal.candidate) {
            await this._pc.addIceCandidate(signal.candidate);
        }
    }

    /**
     * Send message to peer
     */
    send(msg: RTCMessage, binary?: boolean): void {
        if (!this._channel || this._channel.readyState !== "open") return;

        const { transferable, peerId, dataChannelLabel, ...data } = msg as any;

        if (binary || msg.binary) {
            this._channel.send(this._encodeBinary(data));
        } else {
            this._channel.send(JSON.stringify(data));
        }
    }

    /**
     * Send request and wait for response
     */
    request(msg: RTCMessage): Promise<any> {
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

            this.send({ ...msg, reqId, type: "request" } as RTCMessage);
        });
    }

    subscribe(observer: Observer<RTCMessage> | ((v: RTCMessage) => void)): Subscription {
        const obs: Observer<RTCMessage> = typeof observer === "function" ? { next: observer } : observer;
        this._subs.add(obs);
        return {
            closed: false,
            unsubscribe: () => { this._subs.delete(obs); }
        };
    }

    private _encodeBinary(data: any): ArrayBuffer {
        const json = JSON.stringify(data);
        return new TextEncoder().encode(json).buffer;
    }

    private _decodeBinary(buffer: ArrayBuffer): RTCMessage {
        const json = new TextDecoder().decode(buffer);
        return JSON.parse(json);
    }

    close(): void {
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

    get localId(): string { return this._localId; }
    get remoteId(): string | null { return this._remoteId; }
    get connectionState(): RTCPeerConnectionState { return this._pc.connectionState; }
    get channelState(): RTCDataChannelState | null { return this._channel?.readyState ?? null; }
    get state() { return this._state; }
    get channelStateObservable() { return this._channelState; }
    get iceCandidates(): RTCIceCandidateInit[] { return [...this._iceCandidates]; }
    get channelName(): string { return this._channelName; }
}

// ============================================================================
// RTC PEER MANAGER (Multi-peer)
// ============================================================================

export class RTCPeerManager {
    private _peers = new Map<string, RTCPeerTransport>();
    private _localId: string = UUIDv4();
    private _subs = new Set<Observer<RTCMessage>>();
    private _signalingCleanup: (() => void) | null = null;
    private _peerEvents = new ChannelSubject<{
        type: "connected" | "disconnected" | "failed";
        peerId: string;
        peer?: RTCPeerTransport;
    }>();

    constructor(
        private _channelName: string,
        private _config: RTCTransportConfig = {}
    ) {
        this._setupSignaling();
    }

    private _setupSignaling(): void {
        if (!this._config.signaling) return;

        const cleanup = this._config.signaling.onMessage(async (signal) => {
            if (signal.toPeerId !== this._localId) return;

            switch (signal.type) {
                case "offer": {
                    const peer = this._getOrCreatePeer(signal.fromPeerId);
                    const answer = await peer.handleOffer(signal);
                    this._config.signaling!.send(signal.fromPeerId, answer);
                    break;
                }
                case "answer": {
                    const peer = this._peers.get(signal.fromPeerId);
                    if (peer) await peer.handleAnswer(signal);
                    break;
                }
                case "ice-candidate": {
                    const peer = this._peers.get(signal.fromPeerId);
                    if (peer) await peer.addIceCandidate(signal);
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
        } else if (cleanup && "unsubscribe" in cleanup) {
            this._signalingCleanup = () => cleanup.unsubscribe();
        }
    }

    private _getOrCreatePeer(peerId: string): RTCPeerTransport {
        let peer = this._peers.get(peerId);
        if (!peer) {
            peer = new RTCPeerTransport(this._channelName, this._config);
            this._peers.set(peerId, peer);

            // Subscribe to peer events
            peer.state.subscribe({
                next: (state) => {
                    if (state === "connected") {
                        this._peerEvents.next({ type: "connected", peerId, peer });
                    } else if (state === "disconnected" || state === "closed") {
                        this._peerEvents.next({ type: "disconnected", peerId });
                    } else if (state === "failed") {
                        this._peerEvents.next({ type: "failed", peerId });
                        this._removePeer(peerId);
                    }
                }
            });

            // Forward messages
            peer.subscribe({
                next: (msg) => {
                    for (const s of this._subs) {
                        try { s.next?.(msg); } catch (e) { s.error?.(e as Error); }
                    }
                },
                error: (e) => {
                    for (const s of this._subs) s.error?.(e);
                }
            });
        }
        return peer;
    }

    private _removePeer(peerId: string): void {
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
    async connect(peerId: string): Promise<RTCPeerTransport> {
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
    send(peerId: string, msg: RTCMessage): void {
        this._peers.get(peerId)?.send(msg);
    }

    /**
     * Broadcast to all peers
     */
    broadcast(msg: RTCMessage): void {
        for (const peer of this._peers.values()) {
            peer.send(msg);
        }
    }

    /**
     * Request from specific peer
     */
    request(peerId: string, msg: RTCMessage): Promise<any> {
        const peer = this._peers.get(peerId);
        if (!peer) return Promise.reject(new Error("Peer not found"));
        return peer.request(msg);
    }

    subscribe(observer: Observer<RTCMessage> | ((v: RTCMessage) => void)): Subscription {
        const obs: Observer<RTCMessage> = typeof observer === "function" ? { next: observer } : observer;
        this._subs.add(obs);
        return {
            closed: false,
            unsubscribe: () => { this._subs.delete(obs); }
        };
    }

    onPeerEvent(handler: (e: { type: "connected" | "disconnected" | "failed"; peerId: string }) => void): Subscription {
        return this._peerEvents.subscribe({ next: handler });
    }

    getPeers(): Map<string, RTCPeerInfo> {
        const result = new Map<string, RTCPeerInfo>();
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

    close(): void {
        this._signalingCleanup?.();
        this._subs.forEach(s => s.complete?.());
        this._subs.clear();
        for (const peer of this._peers.values()) {
            peer.close();
        }
        this._peers.clear();
    }

    get localId(): string { return this._localId; }
    get peerCount(): number { return this._peers.size; }
    get channelName(): string { return this._channelName; }
}

// ============================================================================
// SIMPLE BROADCAST CHANNEL SIGNALING
// ============================================================================

/**
 * Simple signaling using BroadcastChannel (for same-origin peers)
 */
export function createBroadcastSignaling(channelName: string): RTCSignaling & { close(): void } {
    const bc = new BroadcastChannel(`rtc-signaling:${channelName}`);
    const handlers = new Set<(msg: RTCSignalMessage) => void>();

    bc.onmessage = (e) => {
        for (const h of handlers) h(e.data);
    };

    return {
        send(peerId: string, message: RTCSignalMessage) {
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
    createPeer: (name: string, config?: RTCTransportConfig) =>
        new RTCPeerTransport(name, config),
    createManager: (name: string, config?: RTCTransportConfig) =>
        new RTCPeerManager(name, config),
    createSignaling: (name: string) =>
        createBroadcastSignaling(name)
};
