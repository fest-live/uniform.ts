[**@fest-lib/uniform v0.1.13**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/transport/RTCDataChannelTransport](../README.md) / RTCTransportFactory

# Variable: RTCTransportFactory

```ts
const RTCTransportFactory: object;
```

Defined in: src/newer/next/transport/RTCDataChannelTransport.ts:546

## Type Declaration

### createManager

```ts
createManager: (name, config?) => RTCPeerManager;
```

#### Parameters

##### name

`string`

##### config?

[`RTCTransportConfig`](../interfaces/RTCTransportConfig.md)

#### Returns

[`RTCPeerManager`](../classes/RTCPeerManager.md)

### createPeer

```ts
createPeer: (name, config?) => RTCPeerTransport;
```

#### Parameters

##### name

`string`

##### config?

[`RTCTransportConfig`](../interfaces/RTCTransportConfig.md)

#### Returns

[`RTCPeerTransport`](../classes/RTCPeerTransport.md)

### createSignaling

```ts
createSignaling: (name) => RTCSignaling & object;
```

#### Parameters

##### name

`string`

#### Returns

[`RTCSignaling`](../interfaces/RTCSignaling.md) & `object`
