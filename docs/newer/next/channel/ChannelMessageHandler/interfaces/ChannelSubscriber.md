[**@fest-lib/uniform v0.1.20**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/channel/ChannelMessageHandler](../README.md) / ChannelSubscriber

# Interface: ChannelSubscriber\<T\>

Defined in: src/newer/next/channel/ChannelMessageHandler.ts:27

Subscriber (passed to Observable producer)

## Extends

- [`Subscriber`](../../../types/Interface/interfaces/Subscriber.md)\<`T`\>

## Type Parameters

### T

`T` = [`ChannelMessage`](../../../types/Interface/interfaces/ChannelMessage.md)

## Properties

### active

```ts
readonly active: boolean;
```

Defined in: src/newer/next/types/Interface.ts:114

#### Inherited from

[`Subscriber`](../../../types/Interface/interfaces/Subscriber.md).[`active`](../../../types/Interface/interfaces/Subscriber.md#active)

***

### signal

```ts
signal: AbortSignal;
```

Defined in: src/newer/next/types/Interface.ts:113

#### Inherited from

[`Subscriber`](../../../types/Interface/interfaces/Subscriber.md).[`signal`](../../../types/Interface/interfaces/Subscriber.md#signal)

## Methods

### complete()

```ts
complete(): void;
```

Defined in: src/newer/next/types/Interface.ts:112

#### Returns

`void`

#### Inherited from

[`Subscriber`](../../../types/Interface/interfaces/Subscriber.md).[`complete`](../../../types/Interface/interfaces/Subscriber.md#complete)

***

### error()

```ts
error(err): void;
```

Defined in: src/newer/next/types/Interface.ts:111

#### Parameters

##### err

`Error`

#### Returns

`void`

#### Inherited from

[`Subscriber`](../../../types/Interface/interfaces/Subscriber.md).[`error`](../../../types/Interface/interfaces/Subscriber.md#error)

***

### next()

```ts
next(value): void;
```

Defined in: src/newer/next/types/Interface.ts:110

#### Parameters

##### value

`T`

#### Returns

`void`

#### Inherited from

[`Subscriber`](../../../types/Interface/interfaces/Subscriber.md).[`next`](../../../types/Interface/interfaces/Subscriber.md#next)

***

### request()?

```ts
optional request(msg): Promise<any>;
```

Defined in: src/newer/next/channel/ChannelMessageHandler.ts:28

#### Parameters

##### msg

`T`

#### Returns

`Promise`\<`any`\>
