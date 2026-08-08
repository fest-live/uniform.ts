[**@fest-lib/uniform v0.1.4**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/transport/TransportObservable](../README.md) / createBidirectionalChannel

# Function: createBidirectionalChannel()

```ts
function createBidirectionalChannel<T>(outbound, inbound): object;
```

Defined in: src/newer/next/transport/TransportObservable.ts:326

## Type Parameters

### T

`T` = [`ChannelMessage`](../../../types/Interface/interfaces/ChannelMessage.md)\<`any`\>

## Parameters

### outbound

[`TransportObservable`](../classes/TransportObservable.md)\<`T`\>

### inbound

[`TransportObservable`](../classes/TransportObservable.md)\<`T`\>

## Returns

`object`

### close

```ts
close: () => void;
```

#### Returns

`void`

### send

```ts
send: (v, t?) => void;
```

#### Parameters

##### v

`T`

##### t?

`Transferable`[]

#### Returns

`void`

### subscribe

```ts
subscribe: (h) => Subscription;
```

#### Parameters

##### h

(`v`) => `void`

#### Returns

[`Subscription`](../../../types/Interface/interfaces/Subscription.md)
