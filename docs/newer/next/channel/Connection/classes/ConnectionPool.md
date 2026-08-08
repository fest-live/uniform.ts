[**@fest-lib/uniform v0.1.3**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/channel/Connection](../README.md) / ConnectionPool

# Class: ConnectionPool

Defined in: src/newer/next/channel/Connection.ts:194

## Constructors

### Constructor

```ts
new ConnectionPool(): ConnectionPool;
```

#### Returns

`ConnectionPool`

## Accessors

### names

#### Get Signature

```ts
get names(): string[];
```

Defined in: src/newer/next/channel/Connection.ts:215

##### Returns

`string`[]

***

### size

#### Get Signature

```ts
get size(): number;
```

Defined in: src/newer/next/channel/Connection.ts:214

##### Returns

`number`

## Methods

### clear()

```ts
clear(): void;
```

Defined in: src/newer/next/channel/Connection.ts:213

#### Returns

`void`

***

### delete()

```ts
delete(name): boolean;
```

Defined in: src/newer/next/channel/Connection.ts:212

#### Parameters

##### name

`string`

#### Returns

`boolean`

***

### get()

```ts
get(name): ChannelConnection | undefined;
```

Defined in: src/newer/next/channel/Connection.ts:210

#### Parameters

##### name

`string`

#### Returns

[`ChannelConnection`](ChannelConnection.md) \| `undefined`

***

### getOrCreate()

```ts
getOrCreate(
   name, 
   transportType?, 
   options?): ChannelConnection;
```

Defined in: src/newer/next/channel/Connection.ts:203

#### Parameters

##### name

`string`

##### transportType?

[`TransportType`](../../../types/Interface/type-aliases/TransportType.md) = `"internal"`

##### options?

[`ConnectionOptions`](../../../types/Interface/interfaces/ConnectionOptions.md) = `{}`

#### Returns

[`ChannelConnection`](ChannelConnection.md)

***

### has()

```ts
has(name): boolean;
```

Defined in: src/newer/next/channel/Connection.ts:211

#### Parameters

##### name

`string`

#### Returns

`boolean`

***

### getInstance()

```ts
static getInstance(): ConnectionPool;
```

Defined in: src/newer/next/channel/Connection.ts:198

#### Returns

`ConnectionPool`
