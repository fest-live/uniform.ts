[**@fest-lib/uniform v0.1.26**](../../../../../../README.md)

***

[@fest-lib/uniform](../../../../../../README.md) / [newer/next/channel/internal/ConnectionModel](../README.md) / ConnectionRegistry

# Class: ConnectionRegistry\<TTransport\>

Defined in: uniform.ts/src/newer/next/channel/internal/ConnectionModel.ts:78

## Type Parameters

### TTransport

`TTransport` *extends* `string` = `string`

## Constructors

### Constructor

```ts
new ConnectionRegistry<TTransport>(_createId, _emitEvent?): ConnectionRegistry<TTransport>;
```

Defined in: uniform.ts/src/newer/next/channel/internal/ConnectionModel.ts:81

#### Parameters

##### \_createId

() => `string`

##### \_emitEvent?

(`event`) => `void`

#### Returns

`ConnectionRegistry`\<`TTransport`\>

## Methods

### clear()

```ts
clear(): void;
```

Defined in: uniform.ts/src/newer/next/channel/internal/ConnectionModel.ts:169

#### Returns

`void`

***

### closeAll()

```ts
closeAll(): void;
```

Defined in: uniform.ts/src/newer/next/channel/internal/ConnectionModel.ts:147

#### Returns

`void`

***

### closeByChannel()

```ts
closeByChannel(channel): void;
```

Defined in: uniform.ts/src/newer/next/channel/internal/ConnectionModel.ts:132

#### Parameters

##### channel

`string`

#### Returns

`void`

***

### markNotified()

```ts
markNotified(connection, payload?): void;
```

Defined in: uniform.ts/src/newer/next/channel/internal/ConnectionModel.ts:120

#### Parameters

##### connection

[`ConnectionInfo`](../interfaces/ConnectionInfo.md)\<`TTransport`\>

##### payload?

`any`

#### Returns

`void`

***

### query()

```ts
query(query?): ConnectionInfo<TTransport>[];
```

Defined in: uniform.ts/src/newer/next/channel/internal/ConnectionModel.ts:161

#### Parameters

##### query?

[`QueryConnectionsOptions`](../interfaces/QueryConnectionsOptions.md)\<`TTransport`\> = `{}`

#### Returns

[`ConnectionInfo`](../interfaces/ConnectionInfo.md)\<`TTransport`\>[]

***

### register()

```ts
register(params): ConnectionInfo<TTransport>;
```

Defined in: uniform.ts/src/newer/next/channel/internal/ConnectionModel.ts:86

#### Parameters

##### params

[`RegisterConnectionParams`](../interfaces/RegisterConnectionParams.md)\<`TTransport`\>

#### Returns

[`ConnectionInfo`](../interfaces/ConnectionInfo.md)\<`TTransport`\>

***

### values()

```ts
values(): ConnectionInfo<TTransport>[];
```

Defined in: uniform.ts/src/newer/next/channel/internal/ConnectionModel.ts:165

#### Returns

[`ConnectionInfo`](../interfaces/ConnectionInfo.md)\<`TTransport`\>[]
