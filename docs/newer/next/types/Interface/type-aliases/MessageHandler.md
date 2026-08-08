[**@fest-lib/uniform v0.1.3**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/types/Interface](../README.md) / MessageHandler

# Type Alias: MessageHandler\<T\>

```ts
type MessageHandler<T> = (data, respond) => void | Promise<void>;
```

Defined in: src/newer/next/types/Interface.ts:277

Message handler callback

## Type Parameters

### T

`T` = [`ChannelMessage`](../interfaces/ChannelMessage.md)

## Parameters

### data

`T`

### respond

[`ResponderFn`](ResponderFn.md)\<`T`\>

## Returns

`void` \| `Promise`\<`void`\>
