[**@fest-lib/uniform v0.1.12**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/observable/Observable](../README.md) / makeWorkerInvoker

# Function: makeWorkerInvoker()

```ts
function makeWorkerInvoker(worker, handler?): (subscriber) => () => void;
```

Defined in: src/newer/next/observable/Observable.ts:311

## Parameters

### worker

`Worker`

### handler?

[`InvokerHandler`](../../../types/Interface/type-aliases/InvokerHandler.md)\<[`ChannelMessage`](../../../types/Interface/interfaces/ChannelMessage.md)\<`any`\>\>

## Returns

(`subscriber`) => () => `void`
