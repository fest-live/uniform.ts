import { hasNoPath, readByPath, registeredInPath, removeByData, removeByPath, writeByPath } from "./DataBase";
import { WReflectAction, type WReflectDescriptor, type WReq, type WResp } from "./Interface";
import { deepOperateAndClone, isCanJustReturn, makeRequestProxy, normalizeRef, objectToRef } from "./RequestProxy";
import { Promised, UUIDv4, WRef } from "fest/core";

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

//
const isPrimitive = (obj: any)=>{
    return obj == null || typeof obj == "string" || typeof obj == "number" || typeof obj == "boolean" || typeof obj == "bigint" || /*typeof obj == "symbol" ||*/ typeof obj == "undefined";
}

//
const unwrapArray = (arr: any[])=>{
    return arr?.flatMap?.((el)=>{
        if (Array.isArray(el)) return unwrapArray(el);
        return el;
    })
}

//
const isNotComplexArray = (arr: any[])=>{
    return unwrapArray(arr).every(isPrimitive);
}

//
const isCanTransfer = (obj: any)=>{
    return isPrimitive(obj) ||
        (typeof ArrayBuffer == "function" && obj instanceof ArrayBuffer) ||
        (typeof MessagePort == "function" && obj instanceof MessagePort) ||
        (typeof ReadableStream == "function" && obj instanceof ReadableStream) ||
        (typeof WritableStream == "function" && obj instanceof WritableStream) ||
        (typeof TransformStream == "function" && obj instanceof TransformStream) ||
        (typeof ImageBitmap == "function" && obj instanceof ImageBitmap) ||
        (typeof VideoFrame == "function" && obj instanceof VideoFrame) ||
        (typeof OffscreenCanvas == "function" && obj instanceof OffscreenCanvas) ||
        (typeof RTCDataChannel == "function" && obj instanceof RTCDataChannel) || // @ts-ignore
        (typeof AudioData == "function" && obj instanceof AudioData) || // @ts-ignore
        (typeof WebTransportReceiveStream == "function" && obj instanceof WebTransportReceiveStream) || // @ts-ignore
        (typeof WebTransportSendStream == "function" && obj instanceof WebTransportSendStream) || // @ts-ignore
        (typeof WebTransportReceiveStream == "function" && obj instanceof WebTransportReceiveStream); // @ts-ignore
}



//
export const initChannelHandler = (channel: string = "$host$")=>{
    if (SELF_CHANNEL?.instance) { return SELF_CHANNEL; }

    //
    const $channel: any = {};
    if (!$channel.instance) {
        $channel.instance = new ChannelHandler(channel);
        $channel.name = channel;
    }

    //
    Object.assign(SELF_CHANNEL, $channel);
    return SELF_CHANNEL;
}

//
export class RemoteChannelHelper {
    private channel: string;

    constructor(channel: string, options: any = {}) {
        this.channel = channel;
    }

    request(path: string[], action: WReflectAction, args: any[], options: any = {}): Promise<any>|null|undefined {
        return SELF_CHANNEL.instance?.request(this.channel, path, action, args, options);
    }

    doImportModule(url: string, options: any): Promise<any>|null|undefined {
        return this.request([], WReflectAction.IMPORT, [url], options);
    }
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
            const worker = new Worker(new URL("../worker.ts", import.meta.url).href, {
                type: "module",
            })

            //
            worker.addEventListener('message', (event) => {
                if (event.data.type == "channelCreated") {
                    msgChannel?.port1?.start?.();
                    resolve(new RemoteChannelHelper(event.data.channel as string, options));
                }
            });

            //
            worker.postMessage({
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
        const $channel = $createOrUseExistingChannel(channel, options, broadcast);

        //
        broadcast ??= $channel?.messageChannel?.port1;
        broadcast?.addEventListener('message', (event) => {
            if (event.data.type == "request" && event.data.channel == this.channel) {
                this.handleAndResponse(event.data.payload, event.data.reqId);
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

    request(toChannel: string, path: string[], action: WReflectAction, args: any[], options: any = {}): Promise<any>|null|undefined {
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

    handleAndResponse(request: WReq, reqId: string){ // TODO: options
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
            if (!canBeReturn && action != "get") {
                if (hasNoPath(result)) { path = [UUIDv4()]; writeByPath(path, result); } else { path = registeredInPath.get(result) ?? []; }
            }

            //this.resolveResponse(request.reqId, result);
            const $ctx = readByPath(path/*["get"].includes(action) ? path.slice(0, -1) : path*/);
            const $ctxKey = ["get"].includes(action) ? path?.at(-1) : undefined;

            //
            result = deepOperateAndClone(result, (el)=>objectToRef(el, this.channel, toTransfer)) ?? result;

            //
            this.broadcasts[sender].postMessage({
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
export const createOrUseExistingChannel = (channel: string, options: any = {}, broadcast?: Worker|BroadcastChannel|MessagePort|null) => {
    const $host = initChannelHandler();
    return $host?.instance?.createRemoteChannel(channel, options, broadcast);;
}
