[**@fest-lib/uniform v0.1.25**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/transport/TransportObservable](../README.md) / WorkerObservable

# Class: WorkerObservable

Defined in: uniform.ts/src/newer/next/transport/TransportObservable.ts:79

Worker Observable

## Extends

- [`TransportObservable`](TransportObservable.md)\<[`ChannelMessage`](../../../types/Interface/interfaces/ChannelMessage.md)\>

## Constructors

### Constructor

```ts
new WorkerObservable(_worker): WorkerObservable;
```

Defined in: uniform.ts/src/newer/next/transport/TransportObservable.ts:82

#### Parameters

##### \_worker

`Worker`

#### Returns

`WorkerObservable`

#### Overrides

[`TransportObservable`](TransportObservable.md).[`constructor`](TransportObservable.md#constructor)

## Accessors

### isListening

#### Get Signature

```ts
get isListening(): boolean;
```

Defined in: uniform.ts/src/newer/next/transport/TransportObservable.ts:71

##### Returns

`boolean`

#### Inherited from

[`TransportObservable`](TransportObservable.md).[`isListening`](TransportObservable.md#islistening)

***

### subscriberCount

#### Get Signature

```ts
get subscriberCount(): number;
```

Defined in: uniform.ts/src/newer/next/transport/TransportObservable.ts:70

##### Returns

`number`

#### Inherited from

[`TransportObservable`](TransportObservable.md).[`subscriberCount`](TransportObservable.md#subscribercount)

***

### worker

#### Get Signature

```ts
get worker(): Worker;
```

Defined in: uniform.ts/src/newer/next/transport/TransportObservable.ts:96

##### Returns

`Worker`

## Methods

### close()

```ts
close(): void;
```

Defined in: uniform.ts/src/newer/next/transport/TransportObservable.ts:69

#### Returns

`void`

#### Inherited from

[`TransportObservable`](TransportObservable.md).[`close`](TransportObservable.md#close)

***

### next()

```ts
next(value, transfer?): void;
```

Defined in: uniform.ts/src/newer/next/transport/TransportObservable.ts:87

#### Parameters

##### value

[`ChannelMessage`](../../../types/Interface/interfaces/ChannelMessage.md)

##### transfer?

`Transferable`[]

#### Returns

`void`

#### Overrides

[`TransportObservable`](TransportObservable.md).[`next`](TransportObservable.md#next)

***

### subscribe()

```ts
subscribe(observerOrNext): Subscription;
```

Defined in: uniform.ts/src/newer/next/transport/TransportObservable.ts:28

#### Parameters

##### observerOrNext

  \| [`Observer`](../../../types/Interface/interfaces/Observer.md)\<[`ChannelMessage`](../../../types/Interface/interfaces/ChannelMessage.md)\<`any`\>\>
  \| ((`v`) => `void`)

#### Returns

[`Subscription`](../../../types/Interface/interfaces/Subscription.md)

#### Inherited from

[`TransportObservable`](TransportObservable.md).[`subscribe`](TransportObservable.md#subscribe)

***

### terminate()

```ts
terminate(): void;
```

Defined in: uniform.ts/src/newer/next/transport/TransportObservable.ts:95

#### Returns

`void`
