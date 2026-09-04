[**@fest-lib/uniform v0.1.26**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/transport/RTCDataChannelTransport](../README.md) / RTCPeerManager

# Class: RTCPeerManager

Defined in: uniform.ts/src/newer/next/transport/RTCDataChannelTransport.ts:333

## Constructors

### Constructor

```ts
new RTCPeerManager(_channelName, _config?): RTCPeerManager;
```

Defined in: uniform.ts/src/newer/next/transport/RTCDataChannelTransport.ts:344

#### Parameters

##### \_channelName

`string`

##### \_config?

[`RTCTransportConfig`](../interfaces/RTCTransportConfig.md) = `{}`

#### Returns

`RTCPeerManager`

## Accessors

### channelName

#### Get Signature

```ts
get channelName(): string;
```

Defined in: uniform.ts/src/newer/next/transport/RTCDataChannelTransport.ts:509

##### Returns

`string`

***

### localId

#### Get Signature

```ts
get localId(): string;
```

Defined in: uniform.ts/src/newer/next/transport/RTCDataChannelTransport.ts:507

##### Returns

`string`

***

### peerCount

#### Get Signature

```ts
get peerCount(): number;
```

Defined in: uniform.ts/src/newer/next/transport/RTCDataChannelTransport.ts:508

##### Returns

`number`

## Methods

### broadcast()

```ts
broadcast(msg): void;
```

Defined in: uniform.ts/src/newer/next/transport/RTCDataChannelTransport.ts:456

Broadcast to all peers

#### Parameters

##### msg

[`RTCMessage`](../interfaces/RTCMessage.md)

#### Returns

`void`

***

### close()

```ts
close(): void;
```

Defined in: uniform.ts/src/newer/next/transport/RTCDataChannelTransport.ts:497

#### Returns

`void`

***

### connect()

```ts
connect(peerId): Promise<RTCPeerTransport>;
```

Defined in: uniform.ts/src/newer/next/transport/RTCDataChannelTransport.ts:435

Connect to a peer

#### Parameters

##### peerId

`string`

#### Returns

`Promise`\<[`RTCPeerTransport`](RTCPeerTransport.md)\>

***

### getPeers()

```ts
getPeers(): Map<string, RTCPeerInfo>;
```

Defined in: uniform.ts/src/newer/next/transport/RTCDataChannelTransport.ts:484

#### Returns

`Map`\<`string`, [`RTCPeerInfo`](../interfaces/RTCPeerInfo.md)\>

***

### onPeerEvent()

```ts
onPeerEvent(handler): Subscription;
```

Defined in: uniform.ts/src/newer/next/transport/RTCDataChannelTransport.ts:480

#### Parameters

##### handler

(`e`) => `void`

#### Returns

[`Subscription`](../../../types/Interface/interfaces/Subscription.md)

***

### request()

```ts
request(peerId, msg): Promise<any>;
```

Defined in: uniform.ts/src/newer/next/transport/RTCDataChannelTransport.ts:465

Request from specific peer

#### Parameters

##### peerId

`string`

##### msg

[`RTCMessage`](../interfaces/RTCMessage.md)

#### Returns

`Promise`\<`any`\>

***

### send()

```ts
send(peerId, msg): void;
```

Defined in: uniform.ts/src/newer/next/transport/RTCDataChannelTransport.ts:449

Send to specific peer

#### Parameters

##### peerId

`string`

##### msg

[`RTCMessage`](../interfaces/RTCMessage.md)

#### Returns

`void`

***

### subscribe()

```ts
subscribe(observer): Subscription;
```

Defined in: uniform.ts/src/newer/next/transport/RTCDataChannelTransport.ts:471

#### Parameters

##### observer

  \| [`Observer`](../../../types/Interface/interfaces/Observer.md)\<[`RTCMessage`](../interfaces/RTCMessage.md)\<`any`\>\>
  \| ((`v`) => `void`)

#### Returns

[`Subscription`](../../../types/Interface/interfaces/Subscription.md)
