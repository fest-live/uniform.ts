import { ChannelHandler } from "./Channels";

//
addEventListener("message", (event) => {
    if (event.data.type == "createChannel") {
        const channel = new ChannelHandler(event.data.channel, event.data.options);
        channel?.createRemoteChannel(event.data.sender, event.data.options, event.data.messagePort);
        event.data.messagePort?.start?.();
        postMessage({ type: "channelCreated", channel: event.data.channel });
    } else {
        console.error(event);
    }
});
