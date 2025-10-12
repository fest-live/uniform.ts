import { SelfHostChannelHandler } from "./$next$/Channels";

//
addEventListener("message", (event) => {
    if (event.data.type == "createChannel") {
        const channel = new SelfHostChannelHandler(event.data.messagePort, event.data.channel, event.data.options);
        event.data.messagePort?.start?.();
        postMessage({ type: "channelCreated", channel: event.data.channel });
    } else {
        console.error(event);
    }
});
