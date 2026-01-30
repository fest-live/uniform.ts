/**
 * Channel Handler - Simplified
 *
 * Uses core RequestHandler for action processing.
 */

import { readByPath } from "../storage/DataBase";
import { WReflectAction, type WReflectDescriptor, type WReq } from "../types/Interface";
import { makeRequestProxy } from "./RequestProxy";
import { handleRequest } from "../../core/RequestHandler";
import { Promised, UUIDv4 } from "fest/core";

// Worker code - use direct URL (works in both Vite and non-Vite)
const workerCode: string | URL = new URL("../transport/Worker.ts", import.meta.url);

// ============================================================================
// GLOBALS
// ============================================================================

export const RemoteChannels = new Map<string, any>();

export const SELF_CHANNEL = {
    name: "unknown",
    instance: null
} as { name: string; instance: ChannelHandler | null };

export const CHANNEL_MAP = new Map<string, ChannelHandler | null>();

// ============================================================================
// HELPERS
// ============================================================================

const isReflectAction = (action: any): action is WReflectAction =>
    [...Object.values(WReflectAction)].includes(action);

export const loadWorker = (WX: any): Worker | null => {
    if (WX instanceof Worker) return WX;
    if (WX instanceof URL) return new Worker(WX.href, { type: "module" });
    if (typeof WX === "function") {
        try { return new WX({ type: "module" }); }
        catch { return WX({ type: "module" }); }
    }
    if (typeof WX === "string") {
        if (WX.startsWith("/")) return new Worker(new URL(WX.replace(/^\//, "./"), import.meta.url).href, { type: "module" });
        if (URL.canParse(WX) || WX.startsWith("./")) return new Worker(new URL(WX, import.meta.url).href, { type: "module" });
        return new Worker(URL.createObjectURL(new Blob([WX], { type: "application/javascript" })), { type: "module" });
    }
    if (WX instanceof Blob || WX instanceof File) return new Worker(URL.createObjectURL(WX), { type: "module" });
    return WX ?? (typeof self !== "undefined" ? self : null) as unknown as Worker;
};

// ============================================================================
// INIT CHANNEL HANDLER
// ============================================================================

export const initChannelHandler = (channel: string = "$host$"): ChannelHandler | null => {
    if (SELF_CHANNEL?.instance && channel === "$host$") return SELF_CHANNEL.instance;
    if (CHANNEL_MAP.has(channel)) return CHANNEL_MAP.get(channel) ?? null;

    const $channel = new ChannelHandler(channel);
    if (channel === "$host$") {
        SELF_CHANNEL.name = channel;
        SELF_CHANNEL.instance = $channel;
    }

    // @ts-ignore
    return CHANNEL_MAP.getOrInsert(channel, $channel);
};

// ============================================================================
// REMOTE CHANNEL HELPER
// ============================================================================

export class RemoteChannelHelper {
    constructor(private channel: string, private options: any = {}) {}

    request(path: string[] | WReflectDescriptor, action: WReflectAction | any[], args: any[] | any, options: any = {}): Promise<any> | null {
        if (typeof path === "string") path = [path];

        if (Array.isArray(action) && isReflectAction(path)) {
            options = args;
            args = action;
            action = path as unknown as WReflectAction;
            path = [];
        }

        return SELF_CHANNEL.instance?.request(path as string[], action as WReflectAction, args, options, this.channel) ?? null;
    }

    doImportModule(url: string, options: any): Promise<any> | null {
        return this.request([], WReflectAction.IMPORT, [url], options);
    }
}

// ============================================================================
// CREATE OR USE EXISTING CHANNEL
// ============================================================================

export const $createOrUseExistingChannel = (channel: string, options: any = {}, broadcast?: Worker | BroadcastChannel | MessagePort | null) => {
    if (channel == null || broadcast) return;
    if (RemoteChannels.has(channel)) return RemoteChannels.get(channel);

        const msgChannel = new MessageChannel();
    const promise = Promised(new Promise((resolve) => {
            const worker = loadWorker(workerCode);

        worker?.addEventListener?.('message', (event: MessageEvent) => {
            if (event.data.type === "channelCreated") {
                msgChannel.port1?.start?.();
                resolve(new RemoteChannelHelper(event.data.channel, options));
                }
            });

            worker?.postMessage?.({
                type: "createChannel",
            channel,
            sender: SELF_CHANNEL.name,
            options,
            messagePort: msgChannel.port2
            // @ts-ignore
        }, { transfer: [msgChannel.port2] });
        }));

        RemoteChannels.set(channel, {
        channel,
        instance: SELF_CHANNEL.instance,
            messageChannel: msgChannel,
            remote: promise
        });

    return RemoteChannels.get(channel);
};

// ============================================================================
// CHANNEL HANDLER
// ============================================================================

export class ChannelHandler {
    // @ts-ignore
    private forResolves = new Map<string, PromiseWithResolvers<any>>();
    private broadcasts: Record<string, Worker | BroadcastChannel | MessagePort> = {};

    constructor(private channel: string, private options: any = {}) {
        this.channel ||= (SELF_CHANNEL.name = channel);
        SELF_CHANNEL.instance = this;
    }

    createRemoteChannel(channel: string, options: any = {}, broadcast?: Worker | BroadcastChannel | MessagePort | null) {
        const $channel = $createOrUseExistingChannel(channel, options, broadcast ?? (typeof self !== "undefined" ? self : null) as any);
        broadcast ??= $channel?.messageChannel?.port1;

        broadcast?.addEventListener?.('message', (event: MessageEvent) => {
            if (event.data.type === "request" && event.data.channel === this.channel) {
                this.handleAndResponse(event.data.payload, event.data.reqId);
            } else if (event.data.type === "response") {
                this.resolveResponse(event.data.reqId, {
                    result: event.data.payload.result,
                    descriptor: event.data.payload.descriptor,
                    type: event.data.payload.type
                });
            }
        });

        broadcast?.addEventListener('error', (event) => {
            console.error(event);
            (broadcast as any)?.close?.();
        });

        if (broadcast) this.broadcasts[channel] = broadcast;
        return $channel?.remote;
    }

    getChannel(): string { return this.channel; }

    request(path: string[] | WReflectAction, action: WReflectAction | any[], args: any[] | any, options: any | string = {}, toChannel: string = "worker"): Promise<any> | null {
        if (typeof path === "string") path = [path];

        if (Array.isArray(action) && isReflectAction(path)) {
            toChannel = options as string;
            options = args;
            args = action;
            action = path as unknown as WReflectAction;
            path = [];
        }

        const id = UUIDv4();
        // @ts-ignore
        this.forResolves.set(id, Promise.withResolvers<any>());

        this.broadcasts[toChannel]?.postMessage?.({
            channel: toChannel,
            sender: this.channel,
            type: "request",
            reqId: id,
            payload: { sender: this.channel, channel: toChannel, path, action, args }
        });

        return this.forResolves.get(id)?.promise?.then?.((result) =>
            result?.result != null ? result.result : makeRequestProxy(result.descriptor, { channel: toChannel, ...options })
        ) ?? null;
    }

    resolveResponse(reqId: string, result: any) {
        this.forResolves.get(reqId)?.resolve?.(result);
        const promise = this.forResolves.get(reqId)?.promise;
        this.forResolves.delete(reqId);
        return promise;
    }

    async handleAndResponse(request: WReq, reqId: string, responseFn?: (result: any, transfer: any[]) => void) {
        const result = await handleRequest(request, reqId, this.channel);
        if (!result) return;

        const { response, transfer } = result;
        const send = responseFn ?? this.broadcasts[request.sender]?.postMessage?.bind(this.broadcasts[request.sender]);
        send?.(response, transfer);
    }
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

export const createHostChannel = (channel: string = "$host$") => initChannelHandler(channel);

export const createOrUseExistingChannel = (
    channel: string,
    options: any = {},
    broadcast: Worker | BroadcastChannel | MessagePort | null = (typeof self !== "undefined" ? self : null) as any
) => {
    const $host = createHostChannel(channel ?? "$host$");
    return $host?.createRemoteChannel?.(channel, options, broadcast) ?? $host;
};
