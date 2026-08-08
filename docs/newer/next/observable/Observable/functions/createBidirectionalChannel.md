[**@fest-lib/uniform v0.1.3**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/observable/Observable](../README.md) / createBidirectionalChannel

# Function: createBidirectionalChannel()

```ts
function createBidirectionalChannel(
   transport, 
   channelName, 
handler?): BidirectionalChannel<ChannelMessage<any>>;
```

Defined in: src/newer/next/observable/Observable.ts:332

## Parameters

### transport

[`TransportTarget`](../../../../core/TransportCore/type-aliases/TransportTarget.md)

### channelName

`string`

### handler?

[`InvokerHandler`](../../../types/Interface/type-aliases/InvokerHandler.md)\<[`ChannelMessage`](../../../types/Interface/interfaces/ChannelMessage.md)\<`any`\>\>

## Returns

[`BidirectionalChannel`](../interfaces/BidirectionalChannel.md)\<[`ChannelMessage`](../../../types/Interface/interfaces/ChannelMessage.md)\<`any`\>\>
