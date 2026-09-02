[**@fest-lib/uniform v0.1.20**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/transport/TransportObservable](../README.md) / WebSocketObservable

# Class: WebSocketObservable

Defined in: src/newer/next/transport/TransportObservable.ts:144

WebSocket Observable

## Extends

- [`TransportObservable`](TransportObservable.md)\<[`ChannelMessage`](../../../types/Interface/interfaces/ChannelMessage.md)\>

## Constructors

### Constructor

```ts
new WebSocketObservable(_url, _protocols?): WebSocketObservable;
```

Defined in: src/newer/next/transport/TransportObservable.ts:149

#### Parameters

##### \_url

`string` \| `URL`

##### \_protocols?

`string` \| `string`[]

#### Returns

`WebSocketObservable`

#### Overrides

[`TransportObservable`](TransportObservable.md).[`constructor`](TransportObservable.md#constructor)

## Accessors

### isListening

#### Get Signature

```ts
get isListening(): boolean;
```

Defined in: src/newer/next/transport/TransportObservable.ts:71

##### Returns

`boolean`

#### Inherited from

[`TransportObservable`](TransportObservable.md).[`isListening`](TransportObservable.md#islistening)

***

### isOpen

#### Get Signature

```ts
get isOpen(): boolean;
```

Defined in: src/newer/next/transport/TransportObservable.ts:191

##### Returns

`boolean`

***

### state

#### Get Signature

```ts
get state(): Subscribable<string>;
```

Defined in: src/newer/next/transport/TransportObservable.ts:190

##### Returns

[`Subscribable`](../../../types/Interface/interfaces/Subscribable.md)\<`string`\>

***

### subscriberCount

#### Get Signature

```ts
get subscriberCount(): number;
```

Defined in: src/newer/next/transport/TransportObservable.ts:70

##### Returns

`number`

#### Inherited from

[`TransportObservable`](TransportObservable.md).[`subscriberCount`](TransportObservable.md#subscribercount)

## Methods

### close()

```ts
close(code?, reason?): void;
```

Defined in: src/newer/next/transport/TransportObservable.ts:183

#### Parameters

##### code?

`number`

##### reason?

`string`

#### Returns

`void`

#### Overrides

[`TransportObservable`](TransportObservable.md).[`close`](TransportObservable.md#close)

***

### connect()

```ts
connect(): void;
```

Defined in: src/newer/next/transport/TransportObservable.ts:151

#### Returns

`void`

***

### next()

```ts
next(value): void;
```

Defined in: src/newer/next/transport/TransportObservable.ts:172

#### Parameters

##### value

[`ChannelMessage`](../../../types/Interface/interfaces/ChannelMessage.md)

#### Returns

`void`

#### Overrides

[`TransportObservable`](TransportObservable.md).[`next`](TransportObservable.md#next)

***

### subscribe()

```ts
subscribe(observerOrNext): Subscription;
```

Defined in: src/newer/next/transport/TransportObservable.ts:28

#### Parameters

##### observerOrNext

  \| [`Observer`](../../../types/Interface/interfaces/Observer.md)\<[`ChannelMessage`](../../../types/Interface/interfaces/ChannelMessage.md)\<`any`\>\>
  \| ((`v`) => `void`)

#### Returns

[`Subscription`](../../../types/Interface/interfaces/Subscription.md)

#### Inherited from

[`TransportObservable`](TransportObservable.md).[`subscribe`](TransportObservable.md#subscribe)
