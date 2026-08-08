[**@fest-lib/uniform v0.1.4**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/observable/SocketIOObservable](../README.md) / SocketIORoomObservable

# Class: SocketIORoomObservable

Defined in: src/newer/next/observable/SocketIOObservable.ts:168

## Constructors

### Constructor

```ts
new SocketIORoomObservable(_parent, _roomName): SocketIORoomObservable;
```

Defined in: src/newer/next/observable/SocketIOObservable.ts:172

#### Parameters

##### \_parent

[`SocketIOObservable`](SocketIOObservable.md)

##### \_roomName

`string`

#### Returns

`SocketIORoomObservable`

## Accessors

### roomName

#### Get Signature

```ts
get roomName(): string;
```

Defined in: src/newer/next/observable/SocketIOObservable.ts:210

##### Returns

`string`

## Methods

### send()

```ts
send(msg): void;
```

Defined in: src/newer/next/observable/SocketIOObservable.ts:177

#### Parameters

##### msg

[`SocketMessage`](../interfaces/SocketMessage.md)

#### Returns

`void`

***

### subscribe()

```ts
subscribe(observer): Subscription;
```

Defined in: src/newer/next/observable/SocketIOObservable.ts:181

#### Parameters

##### observer

  \| [`Observer`](../../../types/Interface/interfaces/Observer.md)\<[`SocketMessage`](../interfaces/SocketMessage.md)\<`any`\>\>
  \| ((`v`) => `void`)

#### Returns

[`Subscription`](../../../types/Interface/interfaces/Subscription.md)
