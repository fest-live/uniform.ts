[**@fest-lib/uniform v0.1.22**](../../../../../../README.md)

***

[@fest-lib/uniform](../../../../../../README.md) / [newer/next/channel/internal/ConnectionModel](../README.md) / queryConnections

# Function: queryConnections()

```ts
function queryConnections<TTransport>(connections, query?): ConnectionInfo<TTransport>[];
```

Defined in: src/newer/next/channel/internal/ConnectionModel.ts:57

## Type Parameters

### TTransport

`TTransport` *extends* `string` = `string`

## Parameters

### connections

`Iterable`\<[`ConnectionInfo`](../interfaces/ConnectionInfo.md)\<`TTransport`\>\>

### query?

[`QueryConnectionsOptions`](../interfaces/QueryConnectionsOptions.md)\<`TTransport`\> = `{}`

## Returns

[`ConnectionInfo`](../interfaces/ConnectionInfo.md)\<`TTransport`\>[]
