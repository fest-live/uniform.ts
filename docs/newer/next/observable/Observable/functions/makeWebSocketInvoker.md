[**@fest-lib/uniform v0.1.12**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/observable/Observable](../README.md) / makeWebSocketInvoker

# Function: makeWebSocketInvoker()

```ts
function makeWebSocketInvoker(
   url, 
   protocols?, 
   handler?): (subscriber) => () => void;
```

Defined in: src/newer/next/observable/Observable.ts:314

## Parameters

### url

`string` \| `URL`

### protocols?

`string` \| `string`[]

### handler?

[`InvokerHandler`](../../../types/Interface/type-aliases/InvokerHandler.md)\<[`ChannelMessage`](../../../types/Interface/interfaces/ChannelMessage.md)\<`any`\>\>

## Returns

(`subscriber`) => () => `void`
