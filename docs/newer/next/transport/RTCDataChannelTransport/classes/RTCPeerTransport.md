[**@fest-lib/uniform v0.1.10**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/transport/RTCDataChannelTransport](../README.md) / RTCPeerTransport

# Class: RTCPeerTransport

Defined in: src/newer/next/transport/RTCDataChannelTransport.ts:82

## Constructors

### Constructor

```ts
new RTCPeerTransport(_channelName, _config?): RTCPeerTransport;
```

Defined in: src/newer/next/transport/RTCDataChannelTransport.ts:94

#### Parameters

##### \_channelName

`string`

##### \_config?

[`RTCTransportConfig`](../interfaces/RTCTransportConfig.md) = `{}`

#### Returns

`RTCPeerTransport`

## Accessors

### channelName

#### Get Signature

```ts
get channelName(): string;
```

Defined in: src/newer/next/transport/RTCDataChannelTransport.ts:326

##### Returns

`string`

***

### channelState

#### Get Signature

```ts
get channelState(): RTCDataChannelState | null;
```

Defined in: src/newer/next/transport/RTCDataChannelTransport.ts:322

##### Returns

`RTCDataChannelState` \| `null`

***

### channelStateObservable

#### Get Signature

```ts
get channelStateObservable(): ChannelSubject<RTCDataChannelState>;
```

Defined in: src/newer/next/transport/RTCDataChannelTransport.ts:324

##### Returns

[`ChannelSubject`](../../../observable/Observable/classes/ChannelSubject.md)\<`RTCDataChannelState`\>

***

### connectionState

#### Get Signature

```ts
get connectionState(): RTCPeerConnectionState;
```

Defined in: src/newer/next/transport/RTCDataChannelTransport.ts:321

##### Returns

`RTCPeerConnectionState`

***

### iceCandidates

#### Get Signature

```ts
get iceCandidates(): RTCIceCandidateInit[];
```

Defined in: src/newer/next/transport/RTCDataChannelTransport.ts:325

##### Returns

`RTCIceCandidateInit`[]

***

### localId

#### Get Signature

```ts
get localId(): string;
```

Defined in: src/newer/next/transport/RTCDataChannelTransport.ts:319

##### Returns

`string`

***

### remoteId

#### Get Signature

```ts
get remoteId(): string | null;
```

Defined in: src/newer/next/transport/RTCDataChannelTransport.ts:320

##### Returns

`string` \| `null`

***

### state

#### Get Signature

```ts
get state(): ChannelSubject<RTCPeerConnectionState>;
```

Defined in: src/newer/next/transport/RTCDataChannelTransport.ts:323

##### Returns

[`ChannelSubject`](../../../observable/Observable/classes/ChannelSubject.md)\<`RTCPeerConnectionState`\>

## Methods

### addIceCandidate()

```ts
addIceCandidate(signal): Promise<void>;
```

Defined in: src/newer/next/transport/RTCDataChannelTransport.ts:242

Handle incoming ICE candidate

#### Parameters

##### signal

[`RTCSignalMessage`](../interfaces/RTCSignalMessage.md)

#### Returns

`Promise`\<`void`\>

***

### close()

```ts
close(): void;
```

Defined in: src/newer/next/transport/RTCDataChannelTransport.ts:303

#### Returns

`void`

***

### createOffer()

```ts
createOffer(remoteId): Promise<RTCSignalMessage>;
```

Defined in: src/newer/next/transport/RTCDataChannelTransport.ts:188

Create offer to initiate connection

#### Parameters

##### remoteId

`string`

#### Returns

`Promise`\<[`RTCSignalMessage`](../interfaces/RTCSignalMessage.md)\>

***

### handleAnswer()

```ts
handleAnswer(signal): Promise<void>;
```

Defined in: src/newer/next/transport/RTCDataChannelTransport.ts:232

Handle incoming answer

#### Parameters

##### signal

[`RTCSignalMessage`](../interfaces/RTCSignalMessage.md)

#### Returns

`Promise`\<`void`\>

***

### handleOffer()

```ts
handleOffer(signal): Promise<RTCSignalMessage>;
```

Defined in: src/newer/next/transport/RTCDataChannelTransport.ts:210

Handle incoming offer

#### Parameters

##### signal

[`RTCSignalMessage`](../interfaces/RTCSignalMessage.md)

#### Returns

`Promise`\<[`RTCSignalMessage`](../interfaces/RTCSignalMessage.md)\>

***

### request()

```ts
request(msg): Promise<any>;
```

Defined in: src/newer/next/transport/RTCDataChannelTransport.ts:266

Send request and wait for response

#### Parameters

##### msg

[`RTCMessage`](../interfaces/RTCMessage.md)

#### Returns

`Promise`\<`any`\>

***

### send()

```ts
send(msg, binary?): void;
```

Defined in: src/newer/next/transport/RTCDataChannelTransport.ts:251

Send message to peer

#### Parameters

##### msg

[`RTCMessage`](../interfaces/RTCMessage.md)

##### binary?

`boolean`

#### Returns

`void`

***

### subscribe()

```ts
subscribe(observer): Subscription;
```

Defined in: src/newer/next/transport/RTCDataChannelTransport.ts:284

#### Parameters

##### observer

  \| [`Observer`](../../../types/Interface/interfaces/Observer.md)\<[`RTCMessage`](../interfaces/RTCMessage.md)\<`any`\>\>
  \| ((`v`) => `void`)

#### Returns

[`Subscription`](../../../types/Interface/interfaces/Subscription.md)
