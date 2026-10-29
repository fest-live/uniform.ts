[**@fest-lib/uniform v0.1.35**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/transport/RTCDataChannelTransport](../README.md) / RTCSignalMessage

# Interface: RTCSignalMessage

Defined in: modules/projects/uniform.ts/src/newer/next/transport/RTCDataChannelTransport.ts:51

## Properties

### candidate?

```ts
optional candidate?: RTCIceCandidateInit;
```

Defined in: modules/projects/uniform.ts/src/newer/next/transport/RTCDataChannelTransport.ts:56

***

### fromPeerId

```ts
fromPeerId: string;
```

Defined in: modules/projects/uniform.ts/src/newer/next/transport/RTCDataChannelTransport.ts:53

***

### sdp?

```ts
optional sdp?: string;
```

Defined in: modules/projects/uniform.ts/src/newer/next/transport/RTCDataChannelTransport.ts:55

***

### toPeerId

```ts
toPeerId: string;
```

Defined in: modules/projects/uniform.ts/src/newer/next/transport/RTCDataChannelTransport.ts:54

***

### type

```ts
type: "offer" | "answer" | "ice-candidate" | "disconnect";
```

Defined in: modules/projects/uniform.ts/src/newer/next/transport/RTCDataChannelTransport.ts:52
