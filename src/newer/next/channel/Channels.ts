/**
 * Channel Handler - Legacy Re-exports
 *
 * @deprecated Use UnifiedChannel instead.
 * This file is kept for backward compatibility.
 */

import { UUIDv4, Promised } from "fest/core";
import { WReflectAction, type WReflectDescriptor, type WReq } from "../types/Interface";
import { UnifiedChannel, createUnifiedChannel, getWorkerChannel } from "./UnifiedChannel";
import { handleRequest } from "../../core/RequestHandler";

// ============================================================================
// LEGACY GLOBALS (for backward compatibility)
// ============================================================================

export const RemoteChannels = new Map<string, any>();

export const SELF_CHANNEL = {
    name: "unknown",
    instance: null as ChannelHandler | null
};

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
// REMOTE CHANNEL HELPER (Legacy wrapper)
// ============================================================================

/** @deprecated Use UnifiedChannel.remote() instead */
export class RemoteChannelHelper {
    private _channel: UnifiedChannel;

    constructor(private channelName: string, private options: any = {}) {
        this._channel = getWorkerChannel();
    }

    request(path: string[] | WReflectDescriptor, action: WReflectAction | any[], args: any[] | any, options: any = {}): Promise<any> | null {
        if (typeof path === "string") path = [path];
        if (Array.isArray(action) && isReflectAction(path)) {
            options = args; args = action;
            action = path as unknown as WReflectAction; path = [];
        }
        return this._channel.invoke(this.channelName, action as WReflectAction, path as string[], args);
    }

    doImportModule(url: string, options: any): Promise<any> | null {
        return this._channel.import(url, this.channelName);
    }
}

// ============================================================================
// CHANNEL HANDLER (Legacy wrapper)
// ============================================================================

/** @deprecated Use UnifiedChannel instead */
export class ChannelHandler {
    private _unified: UnifiedChannel;
    private broadcasts: Record<string, Worker | BroadcastChannel | MessagePort> = {};

    constructor(private channel: string, private options: any = {}) {
        this._unified = createUnifiedChannel({ name: channel, autoListen: false });
        SELF_CHANNEL.name = channel;
        SELF_CHANNEL.instance = this;
    }

    createRemoteChannel(channel: string, options: any = {}, broadcast?: Worker | BroadcastChannel | MessagePort | null) {
        if (broadcast) {
            this._unified.attach(broadcast, { targetChannel: channel });
            this.broadcasts[channel] = broadcast;
        }
        return Promise.resolve(new RemoteChannelHelper(channel, options));
    }

    getChannel(): string { return this.channel; }

    request(path: string[] | WReflectAction, action: WReflectAction | any[], args: any[] | any, options: any | string = {}, toChannel: string = "worker"): Promise<any> | null {
        if (typeof path === "string") path = [path];
        if (Array.isArray(action) && isReflectAction(path)) {
            toChannel = options as string; options = args;
            args = action; action = path as unknown as WReflectAction; path = [];
        }
        return this._unified.invoke(toChannel, action as WReflectAction, path as string[], args);
    }

    resolveResponse(reqId: string, result: any) { return Promise.resolve(result); }

    async handleAndResponse(request: WReq, reqId: string, responseFn?: (result: any, transfer: any[]) => void) {
        const result = await handleRequest(request, reqId, this.channel);
        if (!result) return;
        responseFn?.(result.response, result.transfer);
    }

    close(): void { this._unified.close(); }
}

// ============================================================================
// FACTORY FUNCTIONS (Legacy)
// ============================================================================

/** @deprecated Use createUnifiedChannel instead */
export const initChannelHandler = (channel: string = "$host$"): ChannelHandler | null => {
    if (SELF_CHANNEL?.instance && channel === "$host$") return SELF_CHANNEL.instance;
    if (CHANNEL_MAP.has(channel)) return CHANNEL_MAP.get(channel) ?? null;
    const $channel = new ChannelHandler(channel);
    if (channel === "$host$") { SELF_CHANNEL.name = channel; SELF_CHANNEL.instance = $channel; }
    CHANNEL_MAP.set(channel, $channel);
    return $channel;
};

/** @deprecated Use createUnifiedChannel instead */
export const createHostChannel = (channel: string = "$host$") => initChannelHandler(channel);

/** @deprecated Use UnifiedChannel.attach() instead */
export const createOrUseExistingChannel = (
    channel: string,
    options: any = {},
    broadcast: Worker | BroadcastChannel | MessagePort | null = (typeof self !== "undefined" ? self : null) as any
) => {
    const $host = createHostChannel(channel ?? "$host$");
    return $host?.createRemoteChannel?.(channel, options, broadcast) ?? $host;
};

/** @deprecated Internal use */
export const $createOrUseExistingChannel = (channel: string, options: any = {}, broadcast?: Worker | BroadcastChannel | MessagePort | null) => {
    if (channel == null || broadcast) return;
    if (RemoteChannels.has(channel)) return RemoteChannels.get(channel);
    const result = { channel, instance: SELF_CHANNEL.instance, remote: Promise.resolve(new RemoteChannelHelper(channel, options)) };
    RemoteChannels.set(channel, result);
    return result;
};
