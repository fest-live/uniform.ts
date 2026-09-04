[**@fest-lib/uniform v0.1.27**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/observable/Observable](../README.md) / ChannelObservable

# Class: ChannelObservable

Defined in: uniform.ts/src/newer/next/observable/Observable.ts:144

Channel Observable with bidirectional communication

## Implements

- [`Subscribable`](../../../types/Interface/interfaces/Subscribable.md)\<[`ChannelMessage`](../../../types/Interface/interfaces/ChannelMessage.md)\>

## Constructors

### Constructor

```ts
new ChannelObservable(_transport, _channelName): ChannelObservable;
```

Defined in: uniform.ts/src/newer/next/observable/Observable.ts:151

#### Parameters

##### \_transport

[`TransportTarget`](../../../../core/TransportCore/type-aliases/TransportTarget.md)

##### \_channelName

`string`

#### Returns

`ChannelObservable`

## Accessors

### channelName

#### Get Signature

```ts
get channelName(): string;
```

Defined in: uniform.ts/src/newer/next/observable/Observable.ts:199

##### Returns

`string`

***

### isListening

#### Get Signature

```ts
get isListening(): boolean;
```

Defined in: uniform.ts/src/newer/next/observable/Observable.ts:200

##### Returns

`boolean`

## Methods

### close()

```ts
close(): void;
```

Defined in: uniform.ts/src/newer/next/observable/Observable.ts:198

#### Returns

`void`

***

### next()

```ts
next(msg, transfer?): void;
```

Defined in: uniform.ts/src/newer/next/observable/Observable.ts:155

#### Parameters

##### msg

[`ChannelMessage`](../../../types/Interface/interfaces/ChannelMessage.md)

##### transfer?

`Transferable`[]

#### Returns

`void`

***

### request()

```ts
request(msg): Promise<any>;
```

Defined in: uniform.ts/src/newer/next/observable/Observable.ts:167

#### Parameters

##### msg

`Omit`\<[`ChannelMessage`](../../../types/Interface/interfaces/ChannelMessage.md)\<`any`\>, `"reqId"`\> & `object`

#### Returns

`Promise`\<`any`\>

***

### subscribe()

```ts
subscribe(observer): Subscription;
```

Defined in: uniform.ts/src/newer/next/observable/Observable.ts:157

#### Parameters

##### observer

  \| [`Observer`](../../../types/Interface/interfaces/Observer.md)\<[`ChannelMessage`](../../../types/Interface/interfaces/ChannelMessage.md)\<`any`\>\>
  \| ((`v`) => `void`)

#### Returns

[`Subscription`](../../../types/Interface/interfaces/Subscription.md)

#### Implementation of

[`Subscribable`](../../../types/Interface/interfaces/Subscribable.md).[`subscribe`](../../../types/Interface/interfaces/Subscribable.md#subscribe)
