[**@fest-lib/uniform v0.1.17**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/channel/ChannelMessageHandler](../README.md) / makeChannelMessageHandler

# Function: makeChannelMessageHandler()

```ts
function makeChannelMessageHandler(
   transport, 
   channelName, 
   handler?): (subscriber) => () => void;
```

Defined in: src/newer/next/channel/ChannelMessageHandler.ts:43

## Parameters

### transport

[`TransportTarget`](../../../../core/TransportCore/type-aliases/TransportTarget.md)

### channelName

`string`

### handler?

[`MessageHandlerCallback`](../type-aliases/MessageHandlerCallback.md)\<[`ChannelMessage`](../../../types/Interface/interfaces/ChannelMessage.md)\<`any`\>\>

## Returns

(`subscriber`) => () => `void`
