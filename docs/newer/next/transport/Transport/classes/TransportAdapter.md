[**@fest-lib/uniform v0.1.24**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/transport/Transport](../README.md) / TransportAdapter

# Abstract Class: TransportAdapter

Defined in: uniform.ts/src/newer/next/transport/Transport.ts:56

## Extended by

- [`WorkerTransport`](WorkerTransport.md)
- [`MessagePortTransport`](MessagePortTransport.md)
- [`BroadcastChannelTransport`](BroadcastChannelTransport.md)
- [`WebSocketTransport`](WebSocketTransport.md)
- [`ChromeRuntimeTransport`](ChromeRuntimeTransport.md)
- [`ChromeTabsTransport`](ChromeTabsTransport.md)
- [`ChromePortTransport`](ChromePortTransport.md)
- [`ChromeExternalTransport`](ChromeExternalTransport.md)
- [`ServiceWorkerTransport`](ServiceWorkerTransport.md)
- [`SelfTransport`](SelfTransport.md)

## Constructors

### Constructor

```ts
new TransportAdapter(
   _channelName, 
   _transportType, 
   _options?): TransportAdapter;
```

Defined in: uniform.ts/src/newer/next/transport/Transport.ts:66

#### Parameters

##### \_channelName

`string`

##### \_transportType

[`TransportType`](../../../types/Interface/type-aliases/TransportType.md)

##### \_options?

[`ConnectionOptions`](../../../types/Interface/interfaces/ConnectionOptions.md) = `{}`

#### Returns

`TransportAdapter`

## Accessors

### channelName

#### Get Signature

```ts
get channelName(): string;
```

Defined in: uniform.ts/src/newer/next/transport/Transport.ts:137

##### Returns

`string`

***

### inbound

#### Get Signature

```ts
get inbound(): Subscribable<ChannelMessage<any>>;
```

Defined in: uniform.ts/src/newer/next/transport/Transport.ts:139

##### Returns

[`Subscribable`](../../../types/Interface/interfaces/Subscribable.md)\<[`ChannelMessage`](../../../types/Interface/interfaces/ChannelMessage.md)\<`any`\>\>

***

### isAttached

#### Get Signature

```ts
get isAttached(): boolean;
```

Defined in: uniform.ts/src/newer/next/transport/Transport.ts:138

##### Returns

`boolean`

***

### onIncomingConnection

#### Get Signature

```ts
get onIncomingConnection(): Subscribable<TransportIncomingConnection>;
```

Defined in: uniform.ts/src/newer/next/transport/Transport.ts:97

Observable: Incoming connection requests

##### Returns

[`Subscribable`](../../../types/Interface/interfaces/Subscribable.md)\<[`TransportIncomingConnection`](../interfaces/TransportIncomingConnection.md)\>

***

### outbound

#### Get Signature

```ts
get outbound(): Subscribable<ChannelMessage<any>>;
```

Defined in: uniform.ts/src/newer/next/transport/Transport.ts:140

##### Returns

[`Subscribable`](../../../types/Interface/interfaces/Subscribable.md)\<[`ChannelMessage`](../../../types/Interface/interfaces/ChannelMessage.md)\<`any`\>\>

## Methods

### attach()

```ts
abstract attach(): void;
```

Defined in: uniform.ts/src/newer/next/transport/Transport.ts:72

#### Returns

`void`

***

### detach()

```ts
detach(): void;
```

Defined in: uniform.ts/src/newer/next/transport/Transport.ts:74

#### Returns

`void`

***

### send()

```ts
send(msg, transfer?): void;
```

Defined in: uniform.ts/src/newer/next/transport/Transport.ts:86

Send message

#### Parameters

##### msg

[`ChannelMessage`](../../../types/Interface/interfaces/ChannelMessage.md)

##### transfer?

`Transferable`[]

#### Returns

`void`

***

### setAcceptCallback()

```ts
setAcceptCallback(callback): void;
```

Defined in: uniform.ts/src/newer/next/transport/Transport.ts:113

Set callback to auto-accept/reject connections

#### Parameters

##### callback

  \| [`AcceptConnectionCallback`](../type-aliases/AcceptConnectionCallback.md)
  \| `null`

#### Returns

`void`

***

### subscribe()

```ts
subscribe(observer): Subscription;
```

Defined in: uniform.ts/src/newer/next/transport/Transport.ts:81

Subscribe to incoming messages

#### Parameters

##### observer

  \| [`Observer`](../../../types/Interface/interfaces/Observer.md)\<[`ChannelMessage`](../../../types/Interface/interfaces/ChannelMessage.md)\<`any`\>\>
  \| ((`v`) => `void`)

#### Returns

[`Subscription`](../../../types/Interface/interfaces/Subscription.md)

***

### subscribeIncoming()

```ts
subscribeIncoming(handler): Subscription;
```

Defined in: uniform.ts/src/newer/next/transport/Transport.ts:104

Subscribe to incoming connection requests

#### Parameters

##### handler

(`conn`) => `void`

#### Returns

[`Subscription`](../../../types/Interface/interfaces/Subscription.md)
