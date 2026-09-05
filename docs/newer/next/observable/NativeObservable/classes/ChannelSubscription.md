[**@fest-lib/uniform v0.1.29**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/observable/NativeObservable](../README.md) / ChannelSubscription

# Class: ChannelSubscription

Defined in: uniform.ts/src/newer/next/observable/NativeObservable.ts:61

Subscription handle

## Implements

- [`Subscription`](../../../types/Interface/interfaces/Subscription.md)

## Constructors

### Constructor

```ts
new ChannelSubscription(_unsubscribe): ChannelSubscription;
```

Defined in: uniform.ts/src/newer/next/observable/NativeObservable.ts:63

#### Parameters

##### \_unsubscribe

() => `void`

#### Returns

`ChannelSubscription`

## Accessors

### closed

#### Get Signature

```ts
get closed(): boolean;
```

Defined in: uniform.ts/src/newer/next/observable/NativeObservable.ts:64

##### Returns

`boolean`

#### Implementation of

[`Subscription`](../../../types/Interface/interfaces/Subscription.md).[`closed`](../../../types/Interface/interfaces/Subscription.md#closed)

## Methods

### unsubscribe()

```ts
unsubscribe(): void;
```

Defined in: uniform.ts/src/newer/next/observable/NativeObservable.ts:65

#### Returns

`void`

#### Implementation of

[`Subscription`](../../../types/Interface/interfaces/Subscription.md).[`unsubscribe`](../../../types/Interface/interfaces/Subscription.md#unsubscribe)
