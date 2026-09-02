[**@fest-lib/uniform v0.1.22**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/observable/Observable](../README.md) / createInvokerObservable

# Function: createInvokerObservable()

```ts
function createInvokerObservable(
   transport, 
   channelName, 
handler?): Observable<ChannelMessage<any>>;
```

Defined in: src/newer/next/observable/Observable.ts:207

## Parameters

### transport

[`TransportTarget`](../../../../core/TransportCore/type-aliases/TransportTarget.md)

### channelName

`string`

### handler?

[`InvokerHandler`](../../../types/Interface/type-aliases/InvokerHandler.md)\<[`ChannelMessage`](../../../types/Interface/interfaces/ChannelMessage.md)\<`any`\>\>

## Returns

[`Observable`](../classes/Observable.md)\<[`ChannelMessage`](../../../types/Interface/interfaces/ChannelMessage.md)\<`any`\>\>
