[**@fest-lib/uniform v0.1.22**](../../../../../../README.md)

***

[@fest-lib/uniform](../../../../../../README.md) / [newer/next/channel/internal/ConnectionModel](../README.md) / ConnectionInfo

# Interface: ConnectionInfo\<TTransport\>

Defined in: src/newer/next/channel/internal/ConnectionModel.ts:4

## Type Parameters

### TTransport

`TTransport` *extends* `string` = `string`

## Properties

### createdAt

```ts
createdAt: number;
```

Defined in: src/newer/next/channel/internal/ConnectionModel.ts:12

***

### direction

```ts
direction: ConnectionDirection;
```

Defined in: src/newer/next/channel/internal/ConnectionModel.ts:10

***

### id

```ts
id: string;
```

Defined in: src/newer/next/channel/internal/ConnectionModel.ts:5

***

### lastNotifyAt?

```ts
optional lastNotifyAt?: number;
```

Defined in: src/newer/next/channel/internal/ConnectionModel.ts:14

***

### localChannel

```ts
localChannel: string;
```

Defined in: src/newer/next/channel/internal/ConnectionModel.ts:6

***

### metadata?

```ts
optional metadata?: Record<string, any>;
```

Defined in: src/newer/next/channel/internal/ConnectionModel.ts:15

***

### remoteChannel

```ts
remoteChannel: string;
```

Defined in: src/newer/next/channel/internal/ConnectionModel.ts:7

***

### sender

```ts
sender: string;
```

Defined in: src/newer/next/channel/internal/ConnectionModel.ts:8

***

### status

```ts
status: ConnectionStatus;
```

Defined in: src/newer/next/channel/internal/ConnectionModel.ts:11

***

### transportType

```ts
transportType: TTransport;
```

Defined in: src/newer/next/channel/internal/ConnectionModel.ts:9

***

### updatedAt

```ts
updatedAt: number;
```

Defined in: src/newer/next/channel/internal/ConnectionModel.ts:13
