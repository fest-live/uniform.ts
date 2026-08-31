[**@fest-lib/uniform v0.1.18**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/types/Interface](../README.md) / Subscriber

# Interface: Subscriber\<T\>

Defined in: src/newer/next/types/Interface.ts:109

Subscriber (passed to Observable producer)

## Extended by

- [`ChannelSubscriber`](../../../channel/ChannelMessageHandler/interfaces/ChannelSubscriber.md)

## Type Parameters

### T

`T` = `any`

## Properties

### active

```ts
readonly active: boolean;
```

Defined in: src/newer/next/types/Interface.ts:114

***

### signal

```ts
signal: AbortSignal;
```

Defined in: src/newer/next/types/Interface.ts:113

## Methods

### complete()

```ts
complete(): void;
```

Defined in: src/newer/next/types/Interface.ts:112

#### Returns

`void`

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
