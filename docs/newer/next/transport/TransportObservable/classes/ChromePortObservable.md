[**@fest-lib/uniform v0.1.19**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/transport/TransportObservable](../README.md) / ChromePortObservable

# Class: ChromePortObservable

Defined in: src/newer/next/transport/TransportObservable.ts:233

Chrome Port Observable

## Extends

- [`TransportObservable`](TransportObservable.md)\<[`ChannelMessage`](../../../types/Interface/interfaces/ChannelMessage.md)\>

## Constructors

### Constructor

```ts
new ChromePortObservable(_portName, _tabId?): ChromePortObservable;
```

Defined in: src/newer/next/transport/TransportObservable.ts:236

#### Parameters

##### \_portName

`string`

##### \_tabId?

`number`

#### Returns

`ChromePortObservable`

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
close(): void;
```

Defined in: src/newer/next/transport/TransportObservable.ts:69

#### Returns

`void`

#### Inherited from

[`TransportObservable`](TransportObservable.md).[`close`](TransportObservable.md#close)

***

### next()

```ts
next(value): void;
```

Defined in: src/newer/next/transport/TransportObservable.ts:241

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
