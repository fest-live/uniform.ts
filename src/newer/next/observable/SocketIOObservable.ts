/**
 * Socket.IO Observable API
 *
 * Observable wrapper for Socket.IO client.
 */

import { UUIDv4 } from "fest/core";
import { Observable, ChannelSubject, type Subscription, type Observer } from "./Observable";
import type { ChannelMessage, InvokerHandler, ResponderFn, Subscriber, PendingRequest } from "../types/Interface";

// ============================================================================
// TYPES
// ============================================================================

export interface SocketIOLike {
    on(event: string, listener: (...args: any[]) => void): void;
    off(event: string, listener: (...args: any[]) => void): void;
    emit(event: string, ...args: any[]): void;
    connect?(): void;
    disconnect?(): void;
    connected?: boolean;
}

export interface SocketMessage<T = any> extends ChannelMessage {
    event?: string;
    room?: string;
    ack?: (response: any) => void;
}

export interface SocketObservableOptions {
    events?: string[];
    defaultEvent?: string;
    autoConnect?: boolean;
}

// ============================================================================
// SOCKET.IO OBSERVABLE
// ============================================================================

export class SocketIOObservable {
    private _subs = new Set<Observer<SocketMessage>>();
    private _pending = new Map<string, PendingRequest>();
    private _listening = false;
    private _cleanups: (() => void)[] = [];
    private _events: string[];
    private _defaultEvent: string;
    private _state = new ChannelSubject<"connecting" | "connected" | "disconnected" | "error">();

    constructor(
        private _socket: SocketIOLike,
        private _channelName: string,
        private _options: SocketObservableOptions = {}
    ) {
        this._events = _options.events ?? ["message", "channel"];
        this._defaultEvent = _options.defaultEvent ?? "message";
        if (_options.autoConnect !== false) this._socket.connect?.();
    }

    send(msg: SocketMessage, event?: string): void {
        const { transferable, ack, ...data } = msg as any;
        this._socket.emit(event ?? msg.event ?? this._defaultEvent, data);
    }

    emit(event: string, data: any): void {
        this._socket.emit(event, data);
    }

    request(msg: SocketMessage, event?: string): Promise<any> {
        const reqId = msg.reqId ?? UUIDv4();
        return new Promise((resolve, reject) => {
            this._pending.set(reqId, { resolve, reject, timestamp: Date.now() });
            const timeout = setTimeout(() => {
                if (this._pending.has(reqId)) {
                    this._pending.delete(reqId);
                    reject(new Error("Request timeout"));
                }
            }, 30000);
            const { transferable, ack, ...data } = { ...msg, reqId } as any;
            this._socket.emit(event ?? this._defaultEvent, data, (response: any) => {
                clearTimeout(timeout);
                this._pending.delete(reqId);
                resolve(response);
            });
        });
    }

    subscribe(observer: Observer<SocketMessage> | ((v: SocketMessage) => void)): Subscription {
        const obs: Observer<SocketMessage> = typeof observer === "function" ? { next: observer } : observer;
        const first = this._subs.size === 0;
        this._subs.add(obs);
        if (first && !this._listening) this._activate();
        return {
            closed: false,
            unsubscribe: () => {
                this._subs.delete(obs);
                if (this._subs.size === 0 && this._listening) this._deactivate();
            }
        };
    }

    private _activate(): void {
        if (this._listening) return;

        for (const event of this._events) {
            const handler = (data: any, ack?: (r: any) => void) => {
                const msg: SocketMessage = {
                    ...(typeof data === "object" ? data : { payload: data }),
                    id: data?.id ?? UUIDv4(),
                    event,
                    ack
                };

                // Handle response
                if (msg.type === "response" && msg.reqId) {
                    const p = this._pending.get(msg.reqId);
                    if (p) { p.resolve(msg.payload); this._pending.delete(msg.reqId); }
                }

                for (const s of this._subs) { try { s.next?.(msg); } catch (e) { s.error?.(e as Error); } }
            };
            this._socket.on(event, handler);
            this._cleanups.push(() => this._socket.off(event, handler));
        }

        // Connection events
        const onConnect = () => this._state.next("connected");
        const onDisconnect = () => this._state.next("disconnected");
        const onError = (err: any) => {
            this._state.next("error");
            for (const s of this._subs) s.error?.(err instanceof Error ? err : new Error(String(err)));
        };

        this._socket.on("connect", onConnect);
        this._socket.on("disconnect", onDisconnect);
        this._socket.on("error", onError);
        this._cleanups.push(
            () => this._socket.off("connect", onConnect),
            () => this._socket.off("disconnect", onDisconnect),
            () => this._socket.off("error", onError)
        );

        this._listening = true;
    }

    private _deactivate(): void {
        this._cleanups.forEach((fn) => fn());
        this._cleanups = [];
        this._listening = false;
    }

    close(): void {
        this._subs.forEach((s) => s.complete?.());
        this._subs.clear();
        this._deactivate();
        this._socket.disconnect?.();
    }

    get socket(): SocketIOLike { return this._socket; }
    get channelName(): string { return this._channelName; }
    get isConnected(): boolean { return this._socket.connected ?? false; }
    get state() { return this._state; }
}

// ============================================================================
// ROOM OBSERVABLE
// ============================================================================

export class SocketIORoomObservable {
    private _subs = new Set<Observer<SocketMessage>>();
    private _parentSub: Subscription | null = null;

    constructor(
        private _parent: SocketIOObservable,
        private _roomName: string
    ) {}

    send(msg: SocketMessage): void {
        this._parent.send({ ...msg, room: this._roomName });
    }

    subscribe(observer: Observer<SocketMessage> | ((v: SocketMessage) => void)): Subscription {
        const obs: Observer<SocketMessage> = typeof observer === "function" ? { next: observer } : observer;
        const first = this._subs.size === 0;
        this._subs.add(obs);

        if (first && !this._parentSub) {
            this._parentSub = this._parent.subscribe({
                next: (msg) => {
                    if (msg.room === this._roomName || msg.channel === this._roomName) {
                        for (const s of this._subs) { try { s.next?.(msg); } catch (e) { s.error?.(e as Error); } }
                    }
                },
                error: (e) => { for (const s of this._subs) s.error?.(e); },
                complete: () => { for (const s of this._subs) s.complete?.(); }
            });
        }

        return {
            closed: false,
            unsubscribe: () => {
                this._subs.delete(obs);
                if (this._subs.size === 0) {
                    this._parentSub?.unsubscribe();
                    this._parentSub = null;
                }
            }
        };
    }

    get roomName(): string { return this._roomName; }
}

// ============================================================================
// REQUEST HANDLER
// ============================================================================

export function createSocketRequestHandler(
    channelName: string,
    handlers: Record<string, (args: any[], data: SocketMessage) => any | Promise<any>>
): (data: SocketMessage) => void {
    return async (data) => {
        if (data.type !== "request" || !data.ack) return;
        const action = data.payload?.action;
        if (action && handlers[action]) {
            try {
                const result = await handlers[action](data.payload?.args ?? [], data);
                data.ack({ id: UUIDv4(), channel: data.sender, sender: channelName, reqId: data.reqId, type: "response", payload: { result }, timestamp: Date.now() });
            } catch (error) {
                data.ack({ id: UUIDv4(), channel: data.sender, sender: channelName, reqId: data.reqId, type: "response", payload: { error: error instanceof Error ? error.message : String(error) }, timestamp: Date.now() });
            }
        }
    };
}

// ============================================================================
// FACTORY
// ============================================================================

export const SocketIOObservableFactory = {
    create: (socket: SocketIOLike, channelName: string, options?: SocketObservableOptions) =>
        new SocketIOObservable(socket, channelName, options),
    room: (parent: SocketIOObservable, roomName: string) =>
        new SocketIORoomObservable(parent, roomName)
};

export function createSocketObservable(
    socket: SocketIOLike,
    channelName: string,
    options?: SocketObservableOptions
): SocketIOObservable {
    return new SocketIOObservable(socket, channelName, options);
}
