[**@fest-lib/uniform v0.1.27**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/observable/Observable](../README.md) / makeBroadcastInvoker

# Function: makeBroadcastInvoker()

```ts
function makeBroadcastInvoker(name, handler?): (subscriber) => () => void;
```

Defined in: uniform.ts/src/newer/next/observable/Observable.ts:313

## Parameters

### name

`string`

### handler?

[`InvokerHandler`](../../../types/Interface/type-aliases/InvokerHandler.md)\<[`ChannelMessage`](../../../types/Interface/interfaces/ChannelMessage.md)\<`any`\>\>

## Returns

(`subscriber`) => () => `void`
