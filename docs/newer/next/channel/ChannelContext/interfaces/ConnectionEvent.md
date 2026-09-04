[**@fest-lib/uniform v0.1.27**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/channel/ChannelContext](../README.md) / ConnectionEvent

# Interface: ConnectionEvent

Defined in: uniform.ts/src/newer/next/channel/ChannelContext.ts:139

## Extends

- `Omit`\<[`ConnectionEvent`](../../internal/ConnectionModel/interfaces/ConnectionEvent.md)\<
  \| [`DynamicTransportType`](../type-aliases/DynamicTransportType.md)
  \| [`TransportType`](../../../types/Interface/type-aliases/TransportType.md)
  \| `"internal"`\>, `"connection"`\>

## Properties

### connection

```ts
connection: ContextConnectionInfo;
```

Defined in: uniform.ts/src/newer/next/channel/ChannelContext.ts:141

***

### payload?

```ts
optional payload?: any;
```

Defined in: uniform.ts/src/newer/next/channel/ChannelContext.ts:143

#### Overrides

```ts
Omit.payload
```

***

### timestamp

```ts
timestamp: number;
```

Defined in: uniform.ts/src/newer/next/channel/ChannelContext.ts:142

#### Overrides

```ts
Omit.timestamp
```

***

### type

```ts
type: "connected" | "notified" | "disconnected";
```

Defined in: uniform.ts/src/newer/next/channel/ChannelContext.ts:140

#### Overrides

```ts
Omit.type
```
