[**@fest-lib/uniform v0.1.23**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/transport/AtomicsTransport](../README.md) / AtomicsMessage

# Interface: AtomicsMessage\<T\>

Defined in: uniform.ts/src/newer/next/transport/AtomicsTransport.ts:88

Channel message envelope

## Extends

- [`ChannelMessage`](../../../types/Interface/interfaces/ChannelMessage.md)

## Type Parameters

### T

`T` = `any`

## Properties

### channel

```ts
channel: string;
```

Defined in: uniform.ts/src/newer/next/types/Interface.ts:127

#### Inherited from

[`ChannelMessage`](../../../types/Interface/interfaces/ChannelMessage.md).[`channel`](../../../types/Interface/interfaces/ChannelMessage.md#channel)

***

### id

```ts
id: string;
```

Defined in: uniform.ts/src/newer/next/types/Interface.ts:126

#### Inherited from

[`ChannelMessage`](../../../types/Interface/interfaces/ChannelMessage.md).[`id`](../../../types/Interface/interfaces/ChannelMessage.md#id)

***

### payload?

```ts
optional payload?: any;
```

Defined in: uniform.ts/src/newer/next/types/Interface.ts:130

#### Inherited from

[`ChannelMessage`](../../../types/Interface/interfaces/ChannelMessage.md).[`payload`](../../../types/Interface/interfaces/ChannelMessage.md#payload)

***

### reqId?

```ts
optional reqId?: string;
```

Defined in: uniform.ts/src/newer/next/types/Interface.ts:131

#### Inherited from

[`ChannelMessage`](../../../types/Interface/interfaces/ChannelMessage.md).[`reqId`](../../../types/Interface/interfaces/ChannelMessage.md#reqid)

***

### sender

```ts
sender: string;
```

Defined in: uniform.ts/src/newer/next/types/Interface.ts:128

#### Inherited from

[`ChannelMessage`](../../../types/Interface/interfaces/ChannelMessage.md).[`sender`](../../../types/Interface/interfaces/ChannelMessage.md#sender)

***

### seq?

```ts
optional seq?: number;
```

Defined in: uniform.ts/src/newer/next/transport/AtomicsTransport.ts:90

Message sequence number

***

### timestamp?

```ts
optional timestamp?: number;
```

Defined in: uniform.ts/src/newer/next/types/Interface.ts:132

#### Inherited from

[`ChannelMessage`](../../../types/Interface/interfaces/ChannelMessage.md).[`timestamp`](../../../types/Interface/interfaces/ChannelMessage.md#timestamp)

***

### transferable?

```ts
optional transferable?: Transferable[];
```

Defined in: uniform.ts/src/newer/next/types/Interface.ts:133

#### Inherited from

[`ChannelMessage`](../../../types/Interface/interfaces/ChannelMessage.md).[`transferable`](../../../types/Interface/interfaces/ChannelMessage.md#transferable)

***

### type

```ts
type: "request" | "response" | "event" | "signal" | "exchange";
```

Defined in: uniform.ts/src/newer/next/types/Interface.ts:129

#### Inherited from

[`ChannelMessage`](../../../types/Interface/interfaces/ChannelMessage.md).[`type`](../../../types/Interface/interfaces/ChannelMessage.md#type)

***

### workerId?

```ts
optional workerId?: string;
```

Defined in: uniform.ts/src/newer/next/transport/AtomicsTransport.ts:92

Worker ID that sent the message
