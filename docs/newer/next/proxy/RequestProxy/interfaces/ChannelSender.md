[**@fest-lib/uniform v0.1.16**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/proxy/RequestProxy](../README.md) / ChannelSender

# Interface: ChannelSender\<T\>

Defined in: src/newer/next/proxy/RequestProxy.ts:55

## Type Parameters

### T

`T` = [`ChannelMessage`](../../../types/Interface/interfaces/ChannelMessage.md)

## Methods

### next()

```ts
next(message, transfer?): void;
```

Defined in: src/newer/next/proxy/RequestProxy.ts:56

#### Parameters

##### message

`T`

##### transfer?

`Transferable`[]

#### Returns

`void`

***

### request()?

```ts
optional request(message): Promise<any>;
```

Defined in: src/newer/next/proxy/RequestProxy.ts:57

#### Parameters

##### message

`T`

#### Returns

`Promise`\<`any`\>
