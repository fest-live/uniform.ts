[**@fest-lib/uniform v0.1.8**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/transport/RTCDataChannelTransport](../README.md) / RTCMessage

# Interface: RTCMessage\<T\>

Defined in: src/newer/next/transport/RTCDataChannelTransport.ts:23

Channel message envelope

## Extends

- [`ChannelMessage`](../../../types/Interface/interfaces/ChannelMessage.md)

## Type Parameters

### T

`T` = `any`

## Properties

### binary?

```ts
optional binary?: boolean;
```

Defined in: src/newer/next/transport/RTCDataChannelTransport.ts:26

***

### channel

```ts
channel: string;
```

Defined in: src/newer/next/types/Interface.ts:127

#### Inherited from

[`ChannelMessage`](../../../types/Interface/interfaces/ChannelMessage.md).[`channel`](../../../types/Interface/interfaces/ChannelMessage.md#channel)

***

### dataChannelLabel?

```ts
optional dataChannelLabel?: string;
```

Defined in: src/newer/next/transport/RTCDataChannelTransport.ts:25

***

### id

```ts
id: string;
```

Defined in: src/newer/next/types/Interface.ts:126

#### Inherited from

[`ChannelMessage`](../../../types/Interface/interfaces/ChannelMessage.md).[`id`](../../../types/Interface/interfaces/ChannelMessage.md#id)

***

### payload?

```ts
optional payload?: any;
```

Defined in: src/newer/next/types/Interface.ts:130

#### Inherited from

[`ChannelMessage`](../../../types/Interface/interfaces/ChannelMessage.md).[`payload`](../../../types/Interface/interfaces/ChannelMessage.md#payload)

***

### peerId?

```ts
optional peerId?: string;
```

Defined in: src/newer/next/transport/RTCDataChannelTransport.ts:24

***

### reqId?

```ts
optional reqId?: string;
```

Defined in: src/newer/next/types/Interface.ts:131

#### Inherited from

[`ChannelMessage`](../../../types/Interface/interfaces/ChannelMessage.md).[`reqId`](../../../types/Interface/interfaces/ChannelMessage.md#reqid)

***

### sender

```ts
sender: string;
```

Defined in: src/newer/next/types/Interface.ts:128

#### Inherited from

[`ChannelMessage`](../../../types/Interface/interfaces/ChannelMessage.md).[`sender`](../../../types/Interface/interfaces/ChannelMessage.md#sender)

***

### timestamp?

```ts
optional timestamp?: number;
```

Defined in: src/newer/next/types/Interface.ts:132

#### Inherited from

[`ChannelMessage`](../../../types/Interface/interfaces/ChannelMessage.md).[`timestamp`](../../../types/Interface/interfaces/ChannelMessage.md#timestamp)

***

### transferable?

```ts
optional transferable?: Transferable[];
```

Defined in: src/newer/next/types/Interface.ts:133

#### Inherited from

[`ChannelMessage`](../../../types/Interface/interfaces/ChannelMessage.md).[`transferable`](../../../types/Interface/interfaces/ChannelMessage.md#transferable)

***

### type

```ts
type: "request" | "response" | "event" | "signal" | "exchange";
```

Defined in: src/newer/next/types/Interface.ts:129

#### Inherited from

[`ChannelMessage`](../../../types/Interface/interfaces/ChannelMessage.md).[`type`](../../../types/Interface/interfaces/ChannelMessage.md#type)
