[**@fest-lib/uniform v0.1.20**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/types/Interface](../README.md) / ChannelMessage

# Interface: ChannelMessage\<T\>

Defined in: src/newer/next/types/Interface.ts:125

Channel message envelope

## Extended by

- [`ChromeMessage`](../../../observable/ChromeObservable/interfaces/ChromeMessage.md)
- [`SocketMessage`](../../../observable/SocketIOObservable/interfaces/SocketMessage.md)
- [`AtomicsMessage`](../../../transport/AtomicsTransport/interfaces/AtomicsMessage.md)
- [`PortMessage`](../../../transport/PortTransport/interfaces/PortMessage.md)
- [`RTCMessage`](../../../transport/RTCDataChannelTransport/interfaces/RTCMessage.md)
- [`SharedWorkerMessage`](../../../transport/SharedWorkerTransport/interfaces/SharedWorkerMessage.md)

## Type Parameters

### T

`T` = `any`

## Properties

### channel

```ts
channel: string;
```

Defined in: src/newer/next/types/Interface.ts:127

***

### id

```ts
id: string;
```

Defined in: src/newer/next/types/Interface.ts:126

***

### payload?

```ts
optional payload?: T;
```

Defined in: src/newer/next/types/Interface.ts:130

***

### reqId?

```ts
optional reqId?: string;
```

Defined in: src/newer/next/types/Interface.ts:131

***

### sender

```ts
sender: string;
```

Defined in: src/newer/next/types/Interface.ts:128

***

### timestamp?

```ts
optional timestamp?: number;
```

Defined in: src/newer/next/types/Interface.ts:132

***

### transferable?

```ts
optional transferable?: Transferable[];
```

Defined in: src/newer/next/types/Interface.ts:133

***

### type

```ts
type: "request" | "response" | "event" | "signal" | "exchange";
```

Defined in: src/newer/next/types/Interface.ts:129
