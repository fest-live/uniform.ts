[**@fest-lib/uniform v0.1.18**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/observable/SocketIOObservable](../README.md) / SocketMessage

# Interface: SocketMessage\<T\>

Defined in: src/newer/next/observable/SocketIOObservable.ts:24

Channel message envelope

## Extends

- [`ChannelMessage`](../../../types/Interface/interfaces/ChannelMessage.md)

## Type Parameters

### T

`T` = `any`

## Properties

### ack?

```ts
optional ack?: (response) => void;
```

Defined in: src/newer/next/observable/SocketIOObservable.ts:27

#### Parameters

##### response

`any`

#### Returns

`void`

***

### channel

```ts
channel: string;
```

Defined in: src/newer/next/types/Interface.ts:127

#### Inherited from

[`ChannelMessage`](../../../types/Interface/interfaces/ChannelMessage.md).[`channel`](../../../types/Interface/interfaces/ChannelMessage.md#channel)

***

### event?

```ts
optional event?: string;
```

Defined in: src/newer/next/observable/SocketIOObservable.ts:25

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

### reqId?

```ts
optional reqId?: string;
```

Defined in: src/newer/next/types/Interface.ts:131

#### Inherited from

[`ChannelMessage`](../../../types/Interface/interfaces/ChannelMessage.md).[`reqId`](../../../types/Interface/interfaces/ChannelMessage.md#reqid)

***

### room?

```ts
optional room?: string;
```

Defined in: src/newer/next/observable/SocketIOObservable.ts:26

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
