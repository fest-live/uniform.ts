import { createHostChannel, createOrUseExistingChannel, SELF_CHANNEL } from "./next/Channels";
import { wrapChannel } from "./next/RequestProxy";

//
export const sync = async (channel: string, options: any = {}) => {
    const remote = createOrUseExistingChannel(channel, options);
    await remote?.sync?.();
};

//
export const importModuleInChannel = async (channel: string, url: string, options: any = {}, broadcast: Worker|BroadcastChannel|MessagePort|null = (typeof self != "undefined" ? self : null) as any) => {
    const remote = await createOrUseExistingChannel(channel, options?.channelOptions, broadcast);
    const module = await remote?.doImportModule?.(url, options?.importOptions);
    return module;
};

//
export const connectToChannelAsModule = async (channel: string, options: any = {}, broadcast: Worker|BroadcastChannel|MessagePort|null = (typeof self != "undefined" ? self : null) as any, hostChannel: string|null = "$host$") => {
    const host = createHostChannel(hostChannel ?? "$host$");
    const connect = (host?.instance ?? host)?.createRemoteChannel(channel, options, broadcast);
    return wrapChannel(connect, host ?? SELF_CHANNEL?.instance);
};
