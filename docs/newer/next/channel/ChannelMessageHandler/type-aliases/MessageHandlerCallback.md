[**@fest-lib/uniform v0.1.2**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/channel/ChannelMessageHandler](../README.md) / MessageHandlerCallback

# Type Alias: MessageHandlerCallback\<T\>

```ts
type MessageHandlerCallback<T> = (data, respond) => void | Promise<void>;
```

Defined in: src/newer/next/channel/ChannelMessageHandler.ts:25

## Type Parameters

### T

`T` = [`ChannelMessage`](../../../types/Interface/interfaces/ChannelMessage.md)

## Parameters

### data

`T`

### respond

[`RespondFn`](RespondFn.md)\<`T`\>

## Returns

`void` \| `Promise`\<`void`\>
