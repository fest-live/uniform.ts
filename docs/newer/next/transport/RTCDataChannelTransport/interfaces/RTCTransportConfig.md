[**@fest-lib/uniform v0.1.14**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/transport/RTCDataChannelTransport](../README.md) / RTCTransportConfig

# Interface: RTCTransportConfig

Defined in: src/newer/next/transport/RTCDataChannelTransport.ts:29

## Properties

### autoNegotiate?

```ts
optional autoNegotiate?: boolean;
```

Defined in: src/newer/next/transport/RTCDataChannelTransport.ts:37

Auto-negotiate on connect

***

### binaryFormat?

```ts
optional binaryFormat?: "json" | "cbor" | "msgpack";
```

Defined in: src/newer/next/transport/RTCDataChannelTransport.ts:39

Binary serialization format

***

### connectionTimeout?

```ts
optional connectionTimeout?: number;
```

Defined in: src/newer/next/transport/RTCDataChannelTransport.ts:41

Connection timeout (ms)

***

### dataChannelOptions?

```ts
optional dataChannelOptions?: RTCDataChannelInit;
```

Defined in: src/newer/next/transport/RTCDataChannelTransport.ts:33

Data channel options

***

### iceServers?

```ts
optional iceServers?: RTCIceServer[];
```

Defined in: src/newer/next/transport/RTCDataChannelTransport.ts:31

ICE servers for STUN/TURN

***

### signaling?

```ts
optional signaling?: RTCSignaling;
```

Defined in: src/newer/next/transport/RTCDataChannelTransport.ts:35

Signaling method
