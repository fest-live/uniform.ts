/**
 * Channel Message Handler - Unified message routing
 *
 * Delegates to core/TransportCore and core/RequestHandler.
 * Simplified wrapper providing Observable-style message handling.
 */

import { UUIDv4 } from "fest/core";
import {
    createTransportSender,
    createTransportListener,
    type TransportTarget,
    type SendFn
} from "../../core/TransportCore";
import { handleRequest } from "../../core/RequestHandler";
import type { ChannelMessage, Subscriber, Subscription, Observer } from "../observable/Observable";
import type { WReq } from "../types/Interface";

// ============================================================================
// TYPES
// ============================================================================

export type MessageType = "request" | "response" | "event" | "ping" | "pong";
export type RespondFn<T = any> = (result: T, transfer?: Transferable[]) => void | Promise<void>;
export type MessageHandlerCallback<T = ChannelMessage> = (data: T, respond: RespondFn<T>) => void | Promise<void>;

export interface ChannelSubscriber<T = ChannelMessage> extends Subscriber<T> {
    request?(msg: T): Promise<any>;
}

interface PendingRequest {
    resolve: (value: any) => void;
    reject: (error: Error) => void;
    timestamp: number;
}

export type { TransportTarget };

// ============================================================================
// MESSAGE HANDLER FACTORY
// ============================================================================

export function makeChannelMessageHandler(
    transport: TransportTarget,
    channelName: string,
    handler?: MessageHandlerCallback<ChannelMessage>
): (subscriber: ChannelSubscriber<ChannelMessage>) => () => void {
    const pending = new Map<string, PendingRequest>();
    const send = createTransportSender(transport);

    return (subscriber) => {
        const respond = (data: ChannelMessage): RespondFn<ChannelMessage> => {
            if (data.type === "response" && data.reqId) {
                return (result) => {
                    const p = pending.get(data.reqId!);
                    if (p) { p.resolve(result); pending.delete(data.reqId!); }
                };
            }
            if (data.type === "request") {
                return (result, transfer) => send({ ...result, channel: data.sender, sender: channelName, type: "response", reqId: data.reqId }, transfer);
            }
            return send;
        };

        const onMessage = (data: ChannelMessage): void => {
            if (!subscriber.active) return;
            if (data.type === "response" && data.reqId) {
                const p = pending.get(data.reqId);
                if (p) { p.resolve(data.payload); pending.delete(data.reqId); }
            }
            handler ? handler(data, respond(data)) : subscriber.next(data);
        };

        const cleanup = createTransportListener(transport, onMessage, (e) => subscriber.error(e), () => subscriber.complete());

        // Add request capability
        (subscriber as any).request = (msg: ChannelMessage) => {
            const reqId = msg.reqId ?? UUIDv4();
            msg.reqId = reqId;
            return new Promise((resolve, reject) => {
                pending.set(reqId, { resolve, reject, timestamp: Date.now() });
                send(msg);
            });
        };

        return cleanup;
    };
}

// ============================================================================
// MESSAGE OBSERVABLE
// ============================================================================

export class ChannelMessageObservable {
    private _pending = new Map<string, PendingRequest>();
    private _subs = new Set<Observer<ChannelMessage>>();
    private _cleanup: (() => void) | null = null;
    private _send: SendFn<ChannelMessage>;
    private _active = false;

    constructor(private _transport: TransportTarget, private _channelName: string) {
        this._send = createTransportSender(_transport);
    }

    subscribe(observer: { next?: (v: ChannelMessage) => void; error?: (e: Error) => void; complete?: () => void }): { unsubscribe: () => void } {
        this._subs.add(observer);
        if (!this._active) this._activate();
        return {
            unsubscribe: () => {
                this._subs.delete(observer);
                if (this._subs.size === 0) this._deactivate();
            }
        };
    }

    next(msg: ChannelMessage, transfer?: Transferable[]): void { this._send(msg, transfer); }

    request(msg: Omit<ChannelMessage, "reqId"> & { reqId?: string }): Promise<any> {
        const reqId = msg.reqId ?? UUIDv4();
        return new Promise((resolve, reject) => {
            this._pending.set(reqId, { resolve, reject, timestamp: Date.now() });
            this.next({ ...msg, reqId } as ChannelMessage);
        });
    }

    private _activate(): void {
        if (this._active) return;
        this._cleanup = createTransportListener(
            this._transport,
            (data) => {
                if (data.type === "response" && data.reqId) {
                    const p = this._pending.get(data.reqId);
                    if (p) { p.resolve(data.payload); this._pending.delete(data.reqId); }
                }
                for (const s of this._subs) { try { s.next?.(data); } catch (e) { s.error?.(e as Error); } }
            },
            (e) => this._subs.forEach((s) => s.error?.(e)),
            () => this._subs.forEach((s) => s.complete?.())
        );
        this._active = true;
    }

    private _deactivate(): void {
        this._cleanup?.(); this._cleanup = null; this._active = false;
    }
}

// ============================================================================
// REQUEST HANDLER FACTORY
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

// ============================================================================
// DISPATCHER (Simplified)
// ============================================================================

export class ObservableRequestDispatcher {
    private _pending = new Map<string, PendingRequest>();
    private _subscriber: ChannelSubscriber<ChannelMessage> | null = null;

    constructor(private _channelName: string, private _targetChannel: string) {}

    connect(subscriber: ChannelSubscriber<ChannelMessage>): void { this._subscriber = subscriber; }

    disconnect(): void {
        for (const p of this._pending.values()) p.reject(new Error("Disconnected"));
        this._pending.clear();
        this._subscriber = null;
    }

    handleMessage(data: ChannelMessage): void {
        if (data.type === "response" && data.reqId) {
            const p = this._pending.get(data.reqId);
            if (p) { p.resolve(data.payload); this._pending.delete(data.reqId); }
        }
    }

    dispatch(action: string, path: string[], args: any[]): Promise<any> {
        if (!this._subscriber?.active) return Promise.reject(new Error("Not connected"));
        const reqId = UUIDv4();
        const msg: ChannelMessage = {
            id: UUIDv4(), channel: this._targetChannel, sender: this._channelName,
            type: "request", reqId, payload: { channel: this._targetChannel, sender: this._channelName, path, action, args },
            timestamp: Date.now()
        };
        const promise = new Promise((resolve, reject) => this._pending.set(reqId, { resolve, reject, timestamp: Date.now() }));
        this._subscriber.next(msg);
        return promise;
    }
}

export type { PendingRequest, MessageHandlerCallback as ChannelMessageCallback };
