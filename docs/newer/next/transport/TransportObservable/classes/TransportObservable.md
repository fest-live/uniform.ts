[**@fest-lib/uniform v0.1.2**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/transport/TransportObservable](../README.md) / TransportObservable

# Abstract Class: TransportObservable\<T\>

Defined in: src/newer/next/transport/TransportObservable.ts:21

Subscribable interface

## Extended by

- [`WorkerObservable`](WorkerObservable.md)
- [`MessagePortObservable`](MessagePortObservable.md)
- [`BroadcastChannelObservable`](BroadcastChannelObservable.md)
- [`WebSocketObservable`](WebSocketObservable.md)
- [`ChromeRuntimeObservable`](ChromeRuntimeObservable.md)
- [`ChromeTabsObservable`](ChromeTabsObservable.md)
- [`ChromePortObservable`](ChromePortObservable.md)
- [`ServiceWorkerClientObservable`](ServiceWorkerClientObservable.md)
- [`ServiceWorkerHostObservable`](ServiceWorkerHostObservable.md)
- [`SelfObservable`](SelfObservable.md)

## Type Parameters

### T

`T` = [`ChannelMessage`](../../../types/Interface/interfaces/ChannelMessage.md)

## Implements

- [`Subscribable`](../../../types/Interface/interfaces/Subscribable.md)\<`T`\>

## Constructors

### Constructor

```ts
new TransportObservable<T>(): TransportObservable<T>;
```

#### Returns

`TransportObservable`\<`T`\>

## Accessors

### isListening

#### Get Signature

```ts
get isListening(): boolean;
```

Defined in: src/newer/next/transport/TransportObservable.ts:71

##### Returns

`boolean`

***

### subscriberCount

#### Get Signature

```ts
get subscriberCount(): number;
```

Defined in: src/newer/next/transport/TransportObservable.ts:70

##### Returns

`number`

## Methods

### close()

```ts
close(): void;
```

Defined in: src/newer/next/transport/TransportObservable.ts:69

#### Returns

`void`

***

### next()

```ts
abstract next(value, transfer?): void;
```

Defined in: src/newer/next/transport/TransportObservable.ts:26

#### Parameters

##### value

`T`

##### transfer?

`Transferable`[]

#### Returns

`void`

***

### subscribe()

```ts
subscribe(observerOrNext): Subscription;
```

Defined in: src/newer/next/transport/TransportObservable.ts:28

#### Parameters

##### observerOrNext

  \| [`Observer`](../../../types/Interface/interfaces/Observer.md)\<`T`\>
  \| ((`v`) => `void`)

#### Returns

[`Subscription`](../../../types/Interface/interfaces/Subscription.md)

#### Implementation of

[`Subscribable`](../../../types/Interface/interfaces/Subscribable.md).[`subscribe`](../../../types/Interface/interfaces/Subscribable.md#subscribe)
