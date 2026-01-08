import { hasNoPath, readByPath, registeredInPath, removeByData, removeByPath, writeByPath } from "./DataBase";
import { WReflectAction, type WReflectDescriptor, type WReq, type WResp } from "./Interface";
import { makeRequestProxy } from "./RequestProxy";
import { deepOperateAndClone, isCanJustReturn, isCanTransfer, isPrimitive, Promised, UUIDv4, WRef } from "fest/core";

// @ts-ignore
import workerCode from "./Worker?worker&url"
import { normalizeRef, objectToRef } from "./DataBase";
//const workerCode = new URL("./Worker.ts", import.meta.url);

// fallback feature for remote channels
export const RemoteChannels = new Map<string, any>();

// despise of true channel name in BroadcastChannel, we use it for self-channel
export const SELF_CHANNEL = {
    name: "unknown",
    instance: null
} as {
    name: string;
    instance: ChannelHandler|null;
};

// host/origin channel map
export const CHANNEL_MAP = new Map<string, ChannelHandler|null>();

//
export const initChannelHandler = (channel: string = "$host$"): ChannelHandler|null => {
    if (SELF_CHANNEL?.instance && channel == "$host$") { return SELF_CHANNEL?.instance; }

    //
    if (CHANNEL_MAP.has(channel)) { return CHANNEL_MAP.get(channel) ?? null; }

    //
    const $channel: ChannelHandler = new ChannelHandler(channel);

    //
    if (channel == "$host$") {
        Object.assign(SELF_CHANNEL, {
            name: channel,
            instance: $channel
        });
    }

    // @ts-ignore
    return CHANNEL_MAP.getOrInsert(channel, $channel);
}

//
const isReflectAction = (action: any): action is WReflectAction => {
    return [...Object.values(WReflectAction)].includes(action);
}

//
export class RemoteChannelHelper {
    private channel: string;

    constructor(channel: string, options: any = {}) {
        this.channel = channel;
    }

    request(path: string[]|WReflectDescriptor, action: WReflectAction|any[], args: any[]|any, options: any = {}): Promise<any>|null|undefined {
        // normalize path and action
        if (typeof path == "string") { path = [path]; }

        // shift arguments if action is array and path is reflect action
        if (Array.isArray(action) && isReflectAction(path)) {
            options = args;
            args = action;
            action = path as unknown as WReflectAction;
            path = [];
        }

        //
        return SELF_CHANNEL.instance?.request(path as string[], action as WReflectAction, args as any[], options, this.channel);
    }

    doImportModule(url: string, options: any): Promise<any>|null|undefined {
        return this.request([], WReflectAction.IMPORT, [url], options);
    }
}

//
export const loadWorker = (WX: any): Worker | null => {
    if (WX instanceof Worker) { return WX; } else
    if (WX instanceof URL) { return new Worker(WX.href, { type: "module" }); } else
    if (typeof WX == "function") { try { return new WX({ type: "module" }); } catch (e) { return WX({ type: "module" }); }; } else
    if (typeof WX == "string") {
        if (WX.startsWith("/")) { return new Worker(new URL(WX?.replace(/^\//, "./"), import.meta.url)?.href, { type: "module" }); } else
        if (URL.canParse(WX) || WX.startsWith("./")) { return new Worker(new URL(WX, import.meta.url).href, { type: "module" }); } else
        return new Worker(URL.createObjectURL(new Blob([WX], { type: "application/javascript" })), { type: "module" });
    } else
    if (WX instanceof Blob || WX instanceof File) { return new Worker(URL.createObjectURL(WX), { type: "module" }); }
    return WX ? WX : (typeof self != "undefined" ? self : null) as unknown as Worker;
}

//
export const $createOrUseExistingChannel = (channel: string, options: any = {}, broadcast?: Worker|BroadcastChannel|MessagePort|null) => {
    if (channel != null && !broadcast) {
        const $channel = SELF_CHANNEL;

        // only for host pool channel...
        if (RemoteChannels.has(channel)) {
            return RemoteChannels.get(channel);
        }

        //
        const msgChannel = new MessageChannel();
        const promise = Promised(new Promise((resolve, reject) => {
            const worker = loadWorker(workerCode);

            // @ts-ignore
            worker?.addEventListener?.('message', (event, _sender, _response) => {
                if (event.data.type == "channelCreated") {
                    msgChannel?.port1?.start?.();
                    resolve(new RemoteChannelHelper(event.data.channel as string, options));
                }
            });

            //
            worker?.postMessage?.({
                type: "createChannel",
                channel: channel,
                sender: SELF_CHANNEL?.name,
                options: options,
                messagePort: msgChannel?.port2 // @ts-ignore
            }, { transfer: [msgChannel?.port2] });
        }));

        //
        RemoteChannels.set(channel, {
            channel: channel,
            instance: $channel?.instance,
            messageChannel: msgChannel,
            remote: promise
        });

        //
        return RemoteChannels.get(channel as string);
    }
}

//
export class ChannelHandler {
    // @ts-ignore
    private forResolves = new Map<string, PromiseWithResolvers<any>>();
    private broadcasts: Record<string, Worker|BroadcastChannel|MessagePort> = {};

    //
    constructor(private channel: string, private options: any = {}) {
        this.channel ||= (SELF_CHANNEL.name = channel);
        SELF_CHANNEL.instance = this;
        this.broadcasts = {};
    }

    //
    createRemoteChannel(channel: string, options: any = {}, broadcast?: Worker|BroadcastChannel|MessagePort|null) {
        const $channel = $createOrUseExistingChannel(channel, options, broadcast ?? (typeof self != "undefined" ? self : null) as any);

        //
        broadcast ??= $channel?.messageChannel?.port1; // @ts-ignore
        broadcast?.addEventListener?.('message', (event, _sender, _response) => {
            if (event.data.type == "request" && event.data.channel == this.channel) {
                this.handleAndResponse(event.data.payload, event.data.reqId, _response);
            } else
            if (event.data.type == "response") {
                this.resolveResponse(event.data.reqId, {
                    result: event.data.payload.result,
                    descriptor: event.data.payload.descriptor,
                    type: event.data.payload.type
                });
            } else {
                console.error(event);
            }
        });

        //
        broadcast?.addEventListener('error', (event) => {
            console.error(event);
            (broadcast as any)?.close?.();
        });

        //
        if (broadcast) { this.broadcasts[channel] = broadcast; };

        //
        return $channel?.remote;
    }

    getChannel(): string|null {
        return this.channel;
    }

    request(path: string[]|WReflectAction, action: WReflectAction|any[], args: any[]|any, options: any|string = {}, toChannel: string = "worker"): Promise<any>|null|undefined {
        // normalize path and action
        if (typeof path == "string") { path = [path]; }

        // shift arguments if action is array and path is reflect action
        if (Array.isArray(action) && isReflectAction(path)) {
            toChannel = options as unknown as string;
            options = args;
            args = action;
            action = path as unknown as WReflectAction;
            path = [];
        }

        const id = UUIDv4(); // @ts-ignore
        this.forResolves.set(id, Promise.withResolvers<any>());
        this.broadcasts[toChannel].postMessage({
            channel: toChannel,
            sender: this.channel,
            type: "request",
            reqId: id,
            payload: {
                sender: this.channel,
                channel: toChannel,
                path: path,
                action: action,
                args: args
            }
        });

        //
        return this.forResolves.get(id)?.promise?.then?.(result => {
            if (result?.result != undefined) { return result.result; }
            return makeRequestProxy(result.descriptor as WReflectDescriptor, { channel: toChannel, ...options })
        });
    }

    resolveResponse(reqId: string, result: any){
        this.forResolves.get(reqId)?.resolve?.(result);
        const promise = this.forResolves.get(reqId)?.promise;
        this.forResolves.delete(reqId);
        return promise;
    }

    handleAndResponse(request: WReq, reqId: string, response: ((result: any, _: any) => void)|null = null){ // TODO: options
        let { channel, sender, path, action, args } = request;

        //
        if (channel != this.channel) { return; }
        const obj = readByPath(path);

        //! NOTE: if called ArrayBuffer?.transfer() from worker to host, it can be transferred, else use as descriptor for proxied result
        const toTransfer: any[] = [];

        //
        let result: any = null;
        switch (action) {
            case "import":
                result = import(args?.[0]);
                break;
            case "transfer":
                const $got = obj;

                // TODO! support in Promise wrapped ArrayBuffer
                // if channel and sender is same, no sense to transfer by cross-channel (remote-channel)
                if (isCanTransfer($got) && channel != sender) { toTransfer.push($got); }

                result = $got;
                break;
            case "get": {
                const $ctx = obj;
                const $got = $ctx?.[args?.[0]]
                if (typeof $got == "function") {
                    result = $ctx != null ? $got?.bind?.($ctx) : $got;
                }
                path?.push?.(args?.[0]);
                result = $got;
            }; break;
            case "set":
                result = writeByPath([...path, args?.[0]], deepOperateAndClone(args?.[1], (el)=>normalizeRef(el)));
                break;
            case "apply":
            case "call": {
                const $ctx = readByPath(path.slice(0, -1));
                if ((typeof obj == "function") && obj != null) {
                    result = obj.apply?.($ctx, deepOperateAndClone(args?.[0], (el)=>normalizeRef(el)));
                } else {
                    result = undefined;
                }

                // if channel and sender is same, no sense to transfer by cross-channel (remote-channel), it just internal transfer
                if (isCanTransfer(result) && path?.at(-1) == "transfer" && channel != sender) { toTransfer.push(result); }
                break;
            }
            case "construct":
                if ((typeof obj == "function") && obj != null) {
                    result = new obj(deepOperateAndClone(args?.[0], (el)=>normalizeRef(el)));
                }
                break;
            case "delete":
            case "deleteProperty":
            case "dispose": // TODO: check if path is path
                result = path?.length > 0 ? removeByPath(path) : removeByData(obj);
                if (result) { path = registeredInPath.get(obj) ?? []; }
                break;
            case "has":
                if ((typeof obj == "object" || typeof obj == "function") && obj != null) {
                    result = ((path?.at(-1) ?? "") in obj);
                } else {
                    result = false;
                }
                break;
            case "ownKeys":
                if ((typeof obj == "object" || typeof obj == "function") && obj != null) {
                    result = Array.from(Object.keys(obj));
                } else {
                    result = [];
                }
                break;
            case "getOwnPropertyDescriptor":
                if ((typeof obj == "object" || typeof obj == "function") && obj != null) {
                    result = Object.getOwnPropertyDescriptor(obj, path?.at(-1) ?? "");
                } else {
                    result = undefined;
                }
                break;
            case "getPropertyDescriptor":
                if ((typeof obj == "object" || typeof obj == "function") && obj != null) {
                    result = Object.getOwnPropertyDescriptor(obj, path?.at(-1) ?? "");
                } else {
                    result = undefined;
                }
                break;
            case "getPrototypeOf":
                if ((typeof obj == "object" || typeof obj == "function") && obj != null) {
                    result = Object.getPrototypeOf(obj);
                } else {
                    result = null;
                }
                break;
            case "setPrototypeOf":
                if ((typeof obj == "object" || typeof obj == "function") && obj != null) {
                    result = Object.setPrototypeOf(obj, args?.[0]);
                } else {
                    result = false;
                }
                break;
            case "isExtensible":
                if ((typeof obj == "object" || typeof obj == "function") && obj != null) {
                    result = Object.isExtensible(obj);
                } else {
                    result = true;
                }
                break;
            case "preventExtensions":
                if ((typeof obj == "object" || typeof obj == "function") && obj != null) {
                    result = Object.preventExtensions(obj);
                } else {
                    result = false;
                }
                break;
        }

        // @ts-ignore
        return Promise.try(async ()=>{
            result = await result;

            //
            const canBeReturn = ((isCanTransfer(result) && toTransfer?.includes(result)) || isCanJustReturn(result));

            // generate new temp path is have no exists
            if (!canBeReturn && action != "get" && (typeof result == "object" || typeof result == "function")) {
                if (hasNoPath(result))
                    { path = [UUIDv4()]; writeByPath(path, result); } else
                    { path = registeredInPath.get(result) ?? []; }
            }

            //this.resolveResponse(request.reqId, result);
            const $ctx = readByPath(path/*["get"].includes(action) ? path.slice(0, -1) : path*/);
            const $ctxKey = ["get"].includes(action) ? path?.at(-1) : undefined;

            //
            result = deepOperateAndClone(result, (el)=>objectToRef(el, this.channel, toTransfer)) ?? result;

            //
            response ??= this.broadcasts[sender].postMessage?.bind(this.broadcasts[sender]);
            response({
                channel: sender,
                sender: this.channel,
                reqId: reqId,
                action: action,
                type: "response",
                payload: {
                    // here may be result (if can be transferable, or descriptor (for proxied))
                    result: canBeReturn ? result : null,
                    type: typeof result,
                    channel: sender,
                    sender: this.channel,
                    descriptor: {
                        $isDescriptor: true,
                        path: path,
                        owner: this.channel,
                        channel: channel,
                        primitive: isPrimitive(result),
                        writable: true,
                        enumerable: true,
                        configurable: true,
                        argumentCount: obj instanceof Function ? obj.length : -1, // TODO: maybe need to count
                        ...((typeof $ctx == "object" || typeof $ctx == "function") && $ctx != null && $ctxKey != null ? Object.getOwnPropertyDescriptor($ctx, $ctxKey) : {})
                    } as WReflectDescriptor<any>
                } as unknown as WResp<any>
            }, toTransfer);
        })
    }
}

//
export const createHostChannel = (channel: string = "$host$") => {
    const $host = initChannelHandler(channel ?? "$host$");
    return ($host?.instance ?? $host);
}

//
export const createOrUseExistingChannel = (channel: string, options: any = {}, broadcast: Worker|BroadcastChannel|MessagePort|null = (typeof self != "undefined" ? self : null) as any) => {
    const $host = createHostChannel(channel ?? "$host$");
    return ($host?.instance ?? $host)?.createRemoteChannel?.(channel, options, broadcast) ?? ($host?.instance ?? $host);
}
