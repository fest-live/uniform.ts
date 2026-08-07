[**@fest-lib/uniform v0.1.2**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/transport/Transport](../README.md) / MessagePortTransport

# Class: MessagePortTransport

Defined in: src/newer/next/transport/Transport.ts:285

## Extends

- [`TransportAdapter`](TransportAdapter.md)

## Constructors

### Constructor

```ts
new MessagePortTransport(
   channelName, 
   _port, 
   options?): MessagePortTransport;
```

Defined in: src/newer/next/transport/Transport.ts:288

#### Parameters

##### channelName

`string`

##### \_port

`MessagePort`

##### options?

[`ConnectionOptions`](../../../types/Interface/interfaces/ConnectionOptions.md) = `{}`

#### Returns

`MessagePortTransport`

#### Overrides

[`TransportAdapter`](TransportAdapter.md).[`constructor`](TransportAdapter.md#constructor)

## Accessors

### channelName

#### Get Signature

```ts
get channelName(): string;
```

Defined in: src/newer/next/transport/Transport.ts:137

##### Returns

`string`

#### Inherited from

[`TransportAdapter`](TransportAdapter.md).[`channelName`](TransportAdapter.md#channelname)

***

### inbound

#### Get Signature

```ts
get inbound(): Subscribable<ChannelMessage<any>>;
```

Defined in: src/newer/next/transport/Transport.ts:139

##### Returns

[`Subscribable`](../../../types/Interface/interfaces/Subscribable.md)\<[`ChannelMessage`](../../../types/Interface/interfaces/ChannelMessage.md)\<`any`\>\>

#### Inherited from

[`TransportAdapter`](TransportAdapter.md).[`inbound`](TransportAdapter.md#inbound)

***

### isAttached

#### Get Signature

```ts
get isAttached(): boolean;
```

Defined in: src/newer/next/transport/Transport.ts:138

##### Returns

`boolean`

#### Inherited from

[`TransportAdapter`](TransportAdapter.md).[`isAttached`](TransportAdapter.md#isattached)

***

### onIncomingConnection

#### Get Signature

```ts
get onIncomingConnection(): Subscribable<TransportIncomingConnection>;
```

Defined in: src/newer/next/transport/Transport.ts:97

Observable: Incoming connection requests

##### Returns

[`Subscribable`](../../../types/Interface/interfaces/Subscribable.md)\<[`TransportIncomingConnection`](../interfaces/TransportIncomingConnection.md)\>

#### Inherited from

[`TransportAdapter`](TransportAdapter.md).[`onIncomingConnection`](TransportAdapter.md#onincomingconnection)

***

### outbound

#### Get Signature

```ts
get outbound(): Subscribable<ChannelMessage<any>>;
```

Defined in: src/newer/next/transport/Transport.ts:140

##### Returns

[`Subscribable`](../../../types/Interface/interfaces/Subscribable.md)\<[`ChannelMessage`](../../../types/Interface/interfaces/ChannelMessage.md)\<`any`\>\>

#### Inherited from

[`TransportAdapter`](TransportAdapter.md).[`outbound`](TransportAdapter.md#outbound)

***

### port

#### Get Signature

```ts
get port(): MessagePort;
```

Defined in: src/newer/next/transport/Transport.ts:302

##### Returns

`MessagePort`

## Methods

### attach()

```ts
attach(): void;
```

Defined in: src/newer/next/transport/Transport.ts:292

#### Returns

`void`

#### Overrides

[`TransportAdapter`](TransportAdapter.md).[`attach`](TransportAdapter.md#attach)

***

### detach()

```ts
detach(): void;
```

Defined in: src/newer/next/transport/Transport.ts:301

#### Returns

`void`

#### Overrides

[`TransportAdapter`](TransportAdapter.md).[`detach`](TransportAdapter.md#detach)

***

### send()

```ts
send(msg, transfer?): void;
```

Defined in: src/newer/next/transport/Transport.ts:86

Send message

#### Parameters

##### msg

[`ChannelMessage`](../../../types/Interface/interfaces/ChannelMessage.md)

##### transfer?

`Transferable`[]

#### Returns

`void`

#### Inherited from

[`TransportAdapter`](TransportAdapter.md).[`send`](TransportAdapter.md#send)

***

### setAcceptCallback()

```ts
setAcceptCallback(callback): void;
```

Defined in: src/newer/next/transport/Transport.ts:113

Set callback to auto-accept/reject connections

#### Parameters

##### callback

  \| [`AcceptConnectionCallback`](../type-aliases/AcceptConnectionCallback.md)
  \| `null`

#### Returns

`void`

#### Inherited from

[`TransportAdapter`](TransportAdapter.md).[`setAcceptCallback`](TransportAdapter.md#setacceptcallback)

***

### subscribe()

```ts
subscribe(observer): Subscription;
```

Defined in: src/newer/next/transport/Transport.ts:81

Subscribe to incoming messages

#### Parameters

##### observer

  \| [`Observer`](../../../types/Interface/interfaces/Observer.md)\<[`ChannelMessage`](../../../types/Interface/interfaces/ChannelMessage.md)\<`any`\>\>
  \| ((`v`) => `void`)

#### Returns

[`Subscription`](../../../types/Interface/interfaces/Subscription.md)

#### Inherited from

[`TransportAdapter`](TransportAdapter.md).[`subscribe`](TransportAdapter.md#subscribe)

***

### subscribeIncoming()

```ts
subscribeIncoming(handler): Subscription;
```

Defined in: src/newer/next/transport/Transport.ts:104

Subscribe to incoming connection requests

#### Parameters

##### handler

(`conn`) => `void`

#### Returns

[`Subscription`](../../../types/Interface/interfaces/Subscription.md)

#### Inherited from

[`TransportAdapter`](TransportAdapter.md).[`subscribeIncoming`](TransportAdapter.md#subscribeincoming)
