[**@fest-lib/uniform v0.1.8**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/transport/Transport](../README.md) / WorkerTransport

# Class: WorkerTransport

Defined in: src/newer/next/transport/Transport.ts:147

## Extends

- [`TransportAdapter`](TransportAdapter.md)

## Constructors

### Constructor

```ts
new WorkerTransport(
   channelName, 
   _workerSource, 
   options?): WorkerTransport;
```

Defined in: src/newer/next/transport/Transport.ts:152

#### Parameters

##### channelName

`string`

##### \_workerSource

`string` \| `Worker` \| `URL` \| (() => `Worker`)

##### options?

[`ConnectionOptions`](../../../types/Interface/interfaces/ConnectionOptions.md) = `{}`

#### Returns

`WorkerTransport`

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

### worker

#### Get Signature

```ts
get worker(): Worker | null;
```

Defined in: src/newer/next/transport/Transport.ts:278

##### Returns

`Worker` \| `null`

## Methods

### attach()

```ts
attach(): void;
```

Defined in: src/newer/next/transport/Transport.ts:160

#### Returns

`void`

#### Overrides

[`TransportAdapter`](TransportAdapter.md).[`attach`](TransportAdapter.md#attach)

***

### connectChannel()

```ts
connectChannel(
   channel, 
   sender, 
   port?, 
   options?): void;
```

Defined in: src/newer/next/transport/Transport.ts:206

Connect to an existing channel in the worker

#### Parameters

##### channel

`string`

##### sender

`string`

##### port?

`MessagePort`

##### options?

[`ConnectionOptions`](../../../types/Interface/interfaces/ConnectionOptions.md)

#### Returns

`void`

***

### detach()

```ts
detach(): void;
```

Defined in: src/newer/next/transport/Transport.ts:176

#### Returns

`void`

#### Overrides

[`TransportAdapter`](TransportAdapter.md).[`detach`](TransportAdapter.md#detach)

***

### listChannels()

```ts
listChannels(): Promise<string[]>;
```

Defined in: src/newer/next/transport/Transport.ts:226

List all channels in the worker

#### Returns

`Promise`\<`string`[]\>

***

### requestChannel()

```ts
requestChannel(
   channel, 
   sender, 
   options?, 
   port?): void;
```

Defined in: src/newer/next/transport/Transport.ts:186

Request a new channel in the worker

#### Parameters

##### channel

`string`

##### sender

`string`

##### options?

[`ConnectionOptions`](../../../types/Interface/interfaces/ConnectionOptions.md)

##### port?

`MessagePort`

#### Returns

`void`

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
