/**
 * Channel Message Handler - Unified message routing
 *
 * Uses core/TransportCore for transport handling.
 * Uses core/RequestHandler for request processing.
 */

/// <reference lib="webworker" />

import { UUIDv4 } from "fest/core";
import {
    createTransportSender,
    createTransportListener,
    type TransportTarget,
    type SendFn
} from "../core/TransportCore";
import { handleRequest } from "../core/RequestHandler";
import type { ChannelMessage } from "../observable/Observable";
import type { WReq } from "../types/Interface";

// ============================================================================
// TYPES
// ============================================================================

export type MessageType = "request" | "response" | "event" | "ping" | "pong";
export type RespondFn<T = any> = (result: T, transfer?: Transferable[]) => void | Promise<void>;
export type MessageHandlerCallback<T = ChannelMessage> = (data: T, respond: RespondFn<T>) => void | Promise<void>;

export interface ChannelSubscriber<T = ChannelMessage> {
    next(value: T): void;
    error(err: Error): void;
    complete(): void;
    signal: AbortSignal;
    readonly active: boolean;
}

interface PendingRequest {
    resolve: (value: any) => void;
    reject: (error: Error) => void;
    timestamp: number;
}

export { TransportTarget };

// ============================================================================
// CHANNEL MESSAGE HANDLER
// ============================================================================

export function makeChannelMessageHandler(
    transport: TransportTarget,
    channelName: string,
    handler?: MessageHandlerCallback<ChannelMessage>
): (subscriber: ChannelSubscriber<ChannelMessage>) => () => void {
    const pendingRequests = new Map<string, PendingRequest>();
    const send = createTransportSender(transport);

    return (subscriber) => {
        const createResponder = (data: ChannelMessage): RespondFn<ChannelMessage> => {
            if (data.type === "response" && data.reqId) {
                return (result) => {
                    const p = pendingRequests.get(data.reqId!);
                    if (p) { p.resolve(result); pendingRequests.delete(data.reqId!); }
                };
            }
            if (data.type === "request") {
                return (result, transfer) => send({ ...result, channel: data.sender, sender: channelName, type: "response", reqId: data.reqId }, transfer);
            }
            return send;
        };

        const handleMessage = (data: ChannelMessage): void => {
            if (!subscriber.active) return;

            if (data.type === "response" && data.reqId) {
                const p = pendingRequests.get(data.reqId);
                if (p) { p.resolve(data.payload); pendingRequests.delete(data.reqId); }
            }

            const respond = createResponder(data);
            if (handler) handler(data, respond);
            else subscriber.next(data);
        };

        const cleanup = createTransportListener(transport, handleMessage, (e) => subscriber.error(e), () => subscriber.complete());

        // Enhance subscriber with request capability
        const enhanced = subscriber as ChannelSubscriber<ChannelMessage> & {
            request: (msg: ChannelMessage) => Promise<any>;
            registerPending: (reqId: string) => Promise<any>;
        };

        enhanced.request = (msg) => {
            const reqId = msg.reqId ?? UUIDv4();
            msg.reqId = reqId;
            return new Promise((resolve, reject) => {
                pendingRequests.set(reqId, { resolve, reject, timestamp: Date.now() });
                send(msg);
            });
        };

        enhanced.registerPending = (reqId) => new Promise((resolve, reject) => {
            pendingRequests.set(reqId, { resolve, reject, timestamp: Date.now() });
        });

        return cleanup;
    };
}

// ============================================================================
// OBSERVABLE REQUEST DISPATCHER
// ============================================================================

export class ObservableRequestDispatcher {
    private pending = new Map<string, PendingRequest>();
    private subscriber: ChannelSubscriber<ChannelMessage> | null = null;

    constructor(private channelName: string, private targetChannel: string) {}

    connect(subscriber: ChannelSubscriber<ChannelMessage>): void { this.subscriber = subscriber; }
    disconnect(): void {
        this.subscriber = null;
        for (const p of this.pending.values()) p.reject(new Error("Disconnected"));
        this.pending.clear();
    }

    handleMessage(data: ChannelMessage): void {
        if (data.type === "response" && data.reqId) {
            const p = this.pending.get(data.reqId);
            if (p) { p.resolve(data.payload); this.pending.delete(data.reqId); }
        }
    }

    dispatch(action: string, path: string[], args: any[]): Promise<any> {
        if (!this.subscriber?.active) return Promise.reject(new Error("Not connected"));

        const reqId = UUIDv4();
        const msg: ChannelMessage = {
            id: UUIDv4(), channel: this.targetChannel, sender: this.channelName,
            type: "request", reqId, payload: { channel: this.targetChannel, sender: this.channelName, path, action, args },
            timestamp: Date.now()
        };

        const promise = new Promise((resolve, reject) => {
            this.pending.set(reqId, { resolve, reject, timestamp: Date.now() });
        });

        this.subscriber.next(msg);
        return promise;
    }
}

// ============================================================================
// CHANNEL MESSAGE OBSERVABLE
// ============================================================================

export class ChannelMessageObservable {
    private pending = new Map<string, PendingRequest>();
    private subs = new Set<ChannelSubscriber<ChannelMessage>>();
    private cleanups = new Map<ChannelSubscriber<ChannelMessage>, () => void>();
    private send: SendFn<ChannelMessage>;

    constructor(private transport: TransportTarget, private channelName: string) {
        this.send = createTransportSender(transport);
    }

    subscribe(observer: { next?: (v: ChannelMessage) => void; error?: (e: Error) => void; complete?: () => void }): { unsubscribe: () => void } {
        const ctrl = new AbortController();
        let active = true;

        const sub: ChannelSubscriber<ChannelMessage> = {
            next: (v) => {
                if (!active) return;
                if (v.type === "response" && v.reqId) {
                    const p = this.pending.get(v.reqId);
                    if (p) { p.resolve(v.payload); this.pending.delete(v.reqId); }
                }
                observer.next?.(v);
            },
            error: (e) => { if (active) { active = false; observer.error?.(e); ctrl.abort(); } },
            complete: () => { if (active) { active = false; observer.complete?.(); ctrl.abort(); } },
            signal: ctrl.signal,
            get active() { return active && !ctrl.signal.aborted; }
        };

        this.subs.add(sub);
        const cleanup = createTransportListener(this.transport, (d) => sub.next(d), (e) => sub.error(e), () => sub.complete());
        this.cleanups.set(sub, cleanup);

        return {
            unsubscribe: () => {
                active = false; ctrl.abort();
                this.subs.delete(sub);
                this.cleanups.get(sub)?.();
                this.cleanups.delete(sub);
            }
        };
    }

    next(msg: ChannelMessage, transfer?: Transferable[]): void { this.send(msg, transfer); }

    request(msg: Omit<ChannelMessage, "reqId"> & { reqId?: string }): Promise<any> {
        const reqId = msg.reqId ?? UUIDv4();
        return new Promise((resolve, reject) => {
            this.pending.set(reqId, { resolve, reject, timestamp: Date.now() });
            this.next({ ...msg, reqId } as ChannelMessage);
        });
    }
}

// ============================================================================
// REQUEST HANDLER (using core)
// ============================================================================

export function createChannelRequestHandler(
    channelName: string,
    options: { onRequest?: (req: WReq) => void; onResponse?: (res: any) => void } = {}
): MessageHandlerCallback<ChannelMessage> {
    return async (data, respond) => {
        if (data.type !== "request" || data.channel !== channelName) return;

        options.onRequest?.(data.payload as WReq);
        const result = await handleRequest(data.payload as WReq, data.reqId!, channelName);

        if (result) {
            options.onResponse?.(result.response);
            respond({ ...result.response, id: UUIDv4(), timestamp: Date.now() } as ChannelMessage, result.transfer);
        }
    };
}

export type { PendingRequest, MessageHandlerCallback as ChannelMessageCallback };
