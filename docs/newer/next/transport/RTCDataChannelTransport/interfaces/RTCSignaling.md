[**@fest-lib/uniform v0.1.13**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/transport/RTCDataChannelTransport](../README.md) / RTCSignaling

# Interface: RTCSignaling

Defined in: src/newer/next/transport/RTCDataChannelTransport.ts:44

## Methods

### onMessage()

```ts
onMessage(handler): 
  | Subscription
  | (() => void);
```

Defined in: src/newer/next/transport/RTCDataChannelTransport.ts:48

Subscribe to signaling messages

#### Parameters

##### handler

(`message`) => `void`

#### Returns

  \| [`Subscription`](../../../types/Interface/interfaces/Subscription.md)
  \| (() => `void`)

***

### send()

```ts
send(peerId, message): void | Promise<void>;
```

Defined in: src/newer/next/transport/RTCDataChannelTransport.ts:46

Send signaling message to peer

#### Parameters

##### peerId

`string`

##### message

[`RTCSignalMessage`](RTCSignalMessage.md)

#### Returns

`void` \| `Promise`\<`void`\>
