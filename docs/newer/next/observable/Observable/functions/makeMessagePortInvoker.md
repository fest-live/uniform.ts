[**@fest-lib/uniform v0.1.18**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/observable/Observable](../README.md) / makeMessagePortInvoker

# Function: makeMessagePortInvoker()

```ts
function makeMessagePortInvoker(port, handler?): (subscriber) => () => void;
```

Defined in: src/newer/next/observable/Observable.ts:312

## Parameters

### port

`MessagePort`

### handler?

[`InvokerHandler`](../../../types/Interface/type-aliases/InvokerHandler.md)\<[`ChannelMessage`](../../../types/Interface/interfaces/ChannelMessage.md)\<`any`\>\>

## Returns

(`subscriber`) => () => `void`
