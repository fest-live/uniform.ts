[**@fest-lib/uniform v0.1.27**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/transport/Transport](../README.md) / ChromeTabsTransport

# Class: ChromeTabsTransport

Defined in: uniform.ts/src/newer/next/transport/Transport.ts:548

## Extends

- [`TransportAdapter`](TransportAdapter.md)

## Constructors

### Constructor

```ts
new ChromeTabsTransport(
   channelName, 
   _tabId?, 
   options?): ChromeTabsTransport;
```

Defined in: uniform.ts/src/newer/next/transport/Transport.ts:551

#### Parameters

##### channelName

`string`

##### \_tabId?

`number`

##### options?

[`ConnectionOptions`](../../../types/Interface/interfaces/ConnectionOptions.md) = `{}`

#### Returns

`ChromeTabsTransport`

#### Overrides

[`TransportAdapter`](TransportAdapter.md).[`constructor`](TransportAdapter.md#constructor)

## Accessors

### channelName

#### Get Signature

```ts
get channelName(): string;
```

Defined in: uniform.ts/src/newer/next/transport/Transport.ts:137

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

Defined in: uniform.ts/src/newer/next/transport/Transport.ts:139

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

Defined in: uniform.ts/src/newer/next/transport/Transport.ts:138

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

Defined in: uniform.ts/src/newer/next/transport/Transport.ts:97

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

Defined in: uniform.ts/src/newer/next/transport/Transport.ts:140

##### Returns

[`Subscribable`](../../../types/Interface/interfaces/Subscribable.md)\<[`ChannelMessage`](../../../types/Interface/interfaces/ChannelMessage.md)\<`any`\>\>

#### Inherited from

[`TransportAdapter`](TransportAdapter.md).[`outbound`](TransportAdapter.md#outbound)

## Methods

### attach()

```ts
attach(): void;
```

Defined in: uniform.ts/src/newer/next/transport/Transport.ts:555

#### Returns

`void`

#### Overrides

[`TransportAdapter`](TransportAdapter.md).[`attach`](TransportAdapter.md#attach)

***

### detach()

```ts
detach(): void;
```

Defined in: uniform.ts/src/newer/next/transport/Transport.ts:571

#### Returns

`void`

#### Overrides

[`TransportAdapter`](TransportAdapter.md).[`detach`](TransportAdapter.md#detach)

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

#### Inherited from

[`TransportAdapter`](TransportAdapter.md).[`send`](TransportAdapter.md#send)

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

#### Inherited from

[`TransportAdapter`](TransportAdapter.md).[`setAcceptCallback`](TransportAdapter.md#setacceptcallback)

***

### setTabId()

```ts
setTabId(tabId): void;
```

Defined in: uniform.ts/src/newer/next/transport/Transport.ts:572

#### Parameters

##### tabId

`number`

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

#### Inherited from

[`TransportAdapter`](TransportAdapter.md).[`subscribe`](TransportAdapter.md#subscribe)

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

#### Inherited from

[`TransportAdapter`](TransportAdapter.md).[`subscribeIncoming`](TransportAdapter.md#subscribeincoming)
