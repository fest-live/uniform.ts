[**@fest-lib/uniform v0.1.23**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/observable/SocketIOObservable](../README.md) / SocketIOObservable

# Class: SocketIOObservable

Defined in: uniform.ts/src/newer/next/observable/SocketIOObservable.ts:40

## Constructors

### Constructor

```ts
new SocketIOObservable(
   _socket, 
   _channelName, 
   _options?): SocketIOObservable;
```

Defined in: uniform.ts/src/newer/next/observable/SocketIOObservable.ts:49

#### Parameters

##### \_socket

[`SocketIOLike`](../interfaces/SocketIOLike.md)

##### \_channelName

`string`

##### \_options?

[`SocketObservableOptions`](../interfaces/SocketObservableOptions.md) = `{}`

#### Returns

`SocketIOObservable`

## Accessors

### channelName

#### Get Signature

```ts
get channelName(): string;
```

Defined in: uniform.ts/src/newer/next/observable/SocketIOObservable.ts:159

##### Returns

`string`

***

### isConnected

#### Get Signature

```ts
get isConnected(): boolean;
```

Defined in: uniform.ts/src/newer/next/observable/SocketIOObservable.ts:160

##### Returns

`boolean`

***

### socket

#### Get Signature

```ts
get socket(): SocketIOLike;
```

Defined in: uniform.ts/src/newer/next/observable/SocketIOObservable.ts:158

##### Returns

[`SocketIOLike`](../interfaces/SocketIOLike.md)

***

### state

#### Get Signature

```ts
get state(): ChannelSubject<"error" | "connected" | "disconnected" | "connecting">;
```

Defined in: uniform.ts/src/newer/next/observable/SocketIOObservable.ts:161

##### Returns

[`ChannelSubject`](../../Observable/classes/ChannelSubject.md)\<`"error"` \| `"connected"` \| `"disconnected"` \| `"connecting"`\>

## Methods

### close()

```ts
close(): void;
```

Defined in: uniform.ts/src/newer/next/observable/SocketIOObservable.ts:151

#### Returns

`void`

***

### emit()

```ts
emit(event, data): void;
```

Defined in: uniform.ts/src/newer/next/observable/SocketIOObservable.ts:64

#### Parameters

##### event

`string`

##### data

`any`

#### Returns

`void`

***

### request()

```ts
request(msg, event?): Promise<any>;
```

Defined in: uniform.ts/src/newer/next/observable/SocketIOObservable.ts:68

#### Parameters

##### msg

[`SocketMessage`](../interfaces/SocketMessage.md)

##### event?

`string`

#### Returns

`Promise`\<`any`\>

***

### send()

```ts
send(msg, event?): void;
```

Defined in: uniform.ts/src/newer/next/observable/SocketIOObservable.ts:59

#### Parameters

##### msg

[`SocketMessage`](../interfaces/SocketMessage.md)

##### event?

`string`

#### Returns

`void`

***

### subscribe()

```ts
subscribe(observer): Subscription;
```

Defined in: uniform.ts/src/newer/next/observable/SocketIOObservable.ts:87

#### Parameters

##### observer

  \| [`Observer`](../../../types/Interface/interfaces/Observer.md)\<[`SocketMessage`](../interfaces/SocketMessage.md)\<`any`\>\>
  \| ((`v`) => `void`)

#### Returns

[`Subscription`](../../../types/Interface/interfaces/Subscription.md)
