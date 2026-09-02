[**@fest-lib/uniform v0.1.22**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/observable/Observable](../README.md) / BidirectionalChannel

# Interface: BidirectionalChannel\<T\>

Defined in: src/newer/next/observable/Observable.ts:325

## Type Parameters

### T

`T` = [`ChannelMessage`](../../../types/Interface/interfaces/ChannelMessage.md)

## Properties

### inbound

```ts
inbound: Observable<T>;
```

Defined in: src/newer/next/observable/Observable.ts:326

***

### outbound

```ts
outbound: object;
```

Defined in: src/newer/next/observable/Observable.ts:327

#### next()

```ts
next(value, transfer?): void;
```

##### Parameters

###### value

`T`

###### transfer?

`Transferable`[]

##### Returns

`void`

## Methods

### send()

```ts
send(value, transfer?): void;
```

Defined in: src/newer/next/observable/Observable.ts:329

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
subscribe(observer): Subscription;
```

Defined in: src/newer/next/observable/Observable.ts:328

#### Parameters

##### observer

[`Observer`](../../../types/Interface/interfaces/Observer.md)\<`T`\>

#### Returns

[`Subscription`](../../../types/Interface/interfaces/Subscription.md)
