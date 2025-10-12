import { UUIDv4 } from "../$core$/Useful";
import { hasNoPath, readByPath, registeredInPath, removeByData, removeByPath, writeByPath } from "./DataBase";
import type { WReflectAction, WReflectDescriptor, WReq, WResp } from "./Interface";
import { makeRequestProxy } from "./RequestProxy";

// fallback feature for remote channels
export const RemoteChannels = new Map<string, any>();

// despise of true channel name in BroadcastChannel, we use it for self-channel
export const SELF_CHANNEL = {
    name: "unknown",
    instance: null
} as {
    name: string;
    instance: SelfHostChannelHandler|null;
};

//
const isPrimitive = (obj: any)=>{
    return obj == null || typeof obj == "string" || typeof obj == "number" || typeof obj == "boolean" || typeof obj == "bigint" || typeof obj == "symbol" || typeof obj == "undefined";
}

//
const INSTANCE_OF_IF_EXISTS = (obj: any, constructor: any)=>{
    return typeof constructor == "function" && obj instanceof constructor;
}

//
const isCanTransfer = (obj: any)=>{ // @ts-ignore
    return isPrimitive(obj) || INSTANCE_OF_IF_EXISTS(obj, ArrayBuffer) || INSTANCE_OF_IF_EXISTS(obj, MessagePort) || INSTANCE_OF_IF_EXISTS(obj, ReadableStream) || INSTANCE_OF_IF_EXISTS(obj, WritableStream) || INSTANCE_OF_IF_EXISTS(obj, TransformStream) || INSTANCE_OF_IF_EXISTS(obj, WebTransportReceiveStream) || INSTANCE_OF_IF_EXISTS(obj, WebTransportSendStream) || INSTANCE_OF_IF_EXISTS(obj, AudioData) || INSTANCE_OF_IF_EXISTS(obj, ImageBitmap) || INSTANCE_OF_IF_EXISTS(obj, VideoFrame) || INSTANCE_OF_IF_EXISTS(obj, OffscreenCanvas) || INSTANCE_OF_IF_EXISTS(obj, RTCDataChannel);
}

//
const isTypedArray = (value: any)=>{
    return ArrayBuffer.isView(value) && !(value instanceof DataView);
}

//
const isCanJustReturn = (obj: any)=>{
    return isPrimitive(obj) || INSTANCE_OF_IF_EXISTS(obj, SharedArrayBuffer) || isTypedArray(obj);
}

//
export class SelfHostChannelHandler {
    private forResolves = new Map<string, PromiseWithResolvers<any>>();
    //private forRequests = new Map<string, WReq>();

    //
    constructor(private broadcast: Worker|BroadcastChannel|MessagePort, private channel: string|null = SELF_CHANNEL?.name) {
        this.channel ||= (broadcast as any).name;
        SELF_CHANNEL.instance = this;
        this.broadcast.addEventListener('message', (event) => {
            if (event.data.channel == this.channel) {
                if (event.data.type == "request") {
                    //this.forRequests.set(event.data.request.reqId, event.data.request);
                    this.handleAndResponse(event.data.request);
                } else
                if (event.data.type == "response") {
                    this.resolveResponse(event.data.reqId, {
                        result: event.data.result,
                        descriptor: event.data.descriptor,
                        type: event.data.type
                    });
                } else {
                    console.error(event);
                }
            }
        });
        this.broadcast.addEventListener('error', (event) => {
            console.error(event);
            SELF_CHANNEL.instance = null;
            (this.broadcast as any)?.close?.();
        });
    }

    getChannel(): string|null {
        return this.channel;
    }

    request(toChannel: string, path: string[], action: WReflectAction, args: any[], options: any): Promise<any>|null|undefined {
        const id = UUIDv4();
        this.forResolves.set(id, Promise.withResolvers<any>());
        this.broadcast.postMessage({
            channel: toChannel,
            sender: this.channel,
            type: "request",
            reqId: id,
            payload: {
                path: path,
                action: action,
                args: args
            }
        });

        //
        return this.forResolves.get(id)?.promise?.then?.(result => {
            if (result?.result != null) {
                return result.result;
            }
            return makeRequestProxy(result.descriptor as WReflectDescriptor, options)
        });
    }

    resolveResponse(reqId: string, result: any){
        this.forResolves.get(reqId)?.resolve?.(result);
        const promise = this.forResolves.get(reqId)?.promise;
        this.forResolves.delete(reqId);
        return promise;
    }

    handleAndResponse(request: WReq){
        let { channel, sender, path, action, args, data } = request;

        //
        if (channel != this.channel && !RemoteChannels.has(channel)) { return; }
        if (path?.length <= 0) { return; }

        //
        const obj = readByPath(path);
        if (obj == null) { return; }

        //! NOTE: if called ArrayBuffer?.transfer() from worker to host, it can be transferred, else use as descriptor for proxied result
        const toTransfer: any[] = [];

        //
        let result: any = null;
        switch (action) {
            case "transfer":
                const $got = obj;

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
                result = writeByPath([...path, args?.[0]], data);
                break;
            case "apply":
            case "call": {
                const $ctx = readByPath(path.slice(0, -1));
                result = obj.apply?.($ctx, args);

                // if channel and sender is same, no sense to transfer by cross-channel (remote-channel), it just internal transfer
                if (isCanTransfer(result) && path?.at(-1) == "transfer" && channel != sender) { toTransfer.push(result); }
                break;
            }
            case "construct":
                result = new obj(args, data);
                break;
            case "delete":
            case "deleteProperty":
                result = path?.length > 0 ? removeByPath(path) : removeByData(obj);
                if (result) { path = registeredInPath.get(obj) ?? []; }
                break;
            case "has":
                result = ((path?.at(-1) ?? "") in obj);
                break;
            case "ownKeys":
                result = Object.keys(obj);
                break;
            case "getOwnPropertyDescriptor":
                result = Object.getOwnPropertyDescriptor(obj, path?.at(-1) ?? "");
                break;
            case "getPropertyDescriptor":
                result = Object.getOwnPropertyDescriptor(obj, path?.at(-1) ?? "");
                break;
            case "getPrototypeOf":
                result = Object.getPrototypeOf(obj);
                break;
            case "setPrototypeOf":
                result = Object.setPrototypeOf(obj, data);
                break;
            case "isExtensible":
                result = Object.isExtensible(obj);
                break;
            case "preventExtensions":
                result = Object.preventExtensions(obj);
                break;
        }

        //
        const canBeReturn = ((isCanTransfer(result) && toTransfer?.includes(result)) || isCanJustReturn(result));

        // generate new temp path is have no exists
        if (!canBeReturn) {
            if (hasNoPath(result)) { path = [UUIDv4()]; } else { path = registeredInPath.get(result) ?? []; }
        }

        //this.resolveResponse(request.reqId, result);
        const $ctx = readByPath(path.slice(0, -1));
        const $ctxKey = path?.at(-1);
        this.broadcast.postMessage({
            channel: request.channel,
            sender: this.channel,
            reqId: request.reqId,
            action: request.action,
            type: "response",
            payload: {
                // here may be result (if can be transferable, or descriptor (for proxied))
                result: canBeReturn ? result : null,
                type: typeof result,
                descriptor: {
                    path: path,
                    primitive: isPrimitive(result),
                    writable: true,
                    enumerable: true,
                    configurable: true,
                    argumentCount: obj instanceof Function ? obj.length : -1, // TODO: maybe need to count
                    ...(typeof $ctx == "object" && $ctxKey != null ? Object.getOwnPropertyDescriptor($ctx, $ctxKey) : {})
                } as WReflectDescriptor<any>
            } as unknown as WResp<any>
        }, toTransfer);
    }
}
