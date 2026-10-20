[**@fest-lib/uniform v0.1.34**](../../../../../../README.md)

***

[@fest-lib/uniform](../../../../../../README.md) / [newer/next/channel/internal/ConnectionModel](../README.md) / ConnectionEvent

# Interface: ConnectionEvent\<TTransport\>

Defined in: modules/projects/uniform.ts/src/newer/next/channel/internal/ConnectionModel.ts:18

## Type Parameters

### TTransport

`TTransport` *extends* `string` = `string`

## Properties

### connection

```ts
connection: ConnectionInfo<TTransport>;
```

Defined in: modules/projects/uniform.ts/src/newer/next/channel/internal/ConnectionModel.ts:20

***

### payload?

```ts
optional payload?: any;
```

Defined in: modules/projects/uniform.ts/src/newer/next/channel/internal/ConnectionModel.ts:22

***

### timestamp

```ts
timestamp: number;
```

Defined in: modules/projects/uniform.ts/src/newer/next/channel/internal/ConnectionModel.ts:21

***

### type

```ts
type: "connected" | "notified" | "disconnected";
```

Defined in: modules/projects/uniform.ts/src/newer/next/channel/internal/ConnectionModel.ts:19
