[**@fest-lib/uniform v0.1.12**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/types/Interface](../README.md) / InvokerHandler

# Type Alias: InvokerHandler\<T\>

```ts
type InvokerHandler<T> = (data, respond, subscriber) => void | Promise<void>;
```

Defined in: src/newer/next/types/Interface.ts:270

Invoker handler

## Type Parameters

### T

`T` = [`ChannelMessage`](../interfaces/ChannelMessage.md)

## Parameters

### data

`T`

### respond

[`ResponderFn`](ResponderFn.md)\<`T`\>

### subscriber

[`Subscriber`](../interfaces/Subscriber.md)\<`T`\>

## Returns

`void` \| `Promise`\<`void`\>
