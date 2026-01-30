import { ChannelHandler } from "../channel/Channels";
import { initChannelHandler } from "../channel/Channels";

//
addEventListener("message", (event) => {
    if (event.data.type == "createChannel") {
        const channel = new ChannelHandler(event.data.channel, event.data.options);
        channel?.createRemoteChannel(event.data.sender, event.data.options, event.data.messagePort || (typeof self != "undefined" ? self : null));
        event.data.messagePort?.start?.();
        postMessage({ type: "channelCreated", channel: event.data.channel });
    } else {
        console.error(event);
    }
});

// Initialize channel handler for this worker context
initChannelHandler("worker");
