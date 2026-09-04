[**@fest-lib/uniform v0.1.25**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/channel/Connection](../README.md) / ChannelConnection

# Class: ChannelConnection

Defined in: uniform.ts/src/newer/next/channel/Connection.ts:40

## Constructors

### Constructor

```ts
new ChannelConnection(
   _name, 
   _transportType?, 
   options?): ChannelConnection;
```

Defined in: uniform.ts/src/newer/next/channel/Connection.ts:55

#### Parameters

##### \_name

`string`

##### \_transportType?

[`TransportType`](../../../types/Interface/type-aliases/TransportType.md) = `"internal"`

##### options?

[`ConnectionOptions`](../../../types/Interface/interfaces/ConnectionOptions.md) = `{}`

#### Returns

`ChannelConnection`

## Accessors

### connectedPeers

#### Get Signature

```ts
get connectedPeers(): string[];
```

Defined in: uniform.ts/src/newer/next/channel/Connection.ts:186

##### Returns

`string`[]

***

### id

#### Get Signature

```ts
get id(): string;
```

Defined in: uniform.ts/src/newer/next/channel/Connection.ts:180

##### Returns

`string`

***

### meta

#### Get Signature

```ts
get meta(): ChannelMeta;
```

Defined in: uniform.ts/src/newer/next/channel/Connection.ts:187

##### Returns

[`ChannelMeta`](../../../types/Interface/interfaces/ChannelMeta.md)

***

### name

#### Get Signature

```ts
get name(): string;
```

Defined in: uniform.ts/src/newer/next/channel/Connection.ts:181

##### Returns

`string`

***

### state

#### Get Signature

```ts
get state(): ChannelState;
```

Defined in: uniform.ts/src/newer/next/channel/Connection.ts:182

##### Returns

[`ChannelState`](../../../types/Interface/type-aliases/ChannelState.md)

***

### stateChanges

#### Get Signature

```ts
get stateChanges(): ChannelSubject<ChannelState>;
```

Defined in: uniform.ts/src/newer/next/channel/Connection.ts:185

##### Returns

[`ChannelSubject`](../../../observable/Observable/classes/ChannelSubject.md)\<[`ChannelState`](../../../types/Interface/type-aliases/ChannelState.md)\>

***

### stats

#### Get Signature

```ts
get stats(): ConnectionStats;
```

Defined in: uniform.ts/src/newer/next/channel/Connection.ts:184

##### Returns

[`ConnectionStats`](../interfaces/ConnectionStats.md)

***

### transportType

#### Get Signature

```ts
get transportType(): TransportType;
```

Defined in: uniform.ts/src/newer/next/channel/Connection.ts:183

##### Returns

[`TransportType`](../../../types/Interface/type-aliases/TransportType.md)

## Methods

### close()

```ts
close(): void;
```

Defined in: uniform.ts/src/newer/next/channel/Connection.ts:148

#### Returns

`void`

***

### connect()

```ts
connect(): Promise<void>;
```

Defined in: uniform.ts/src/newer/next/channel/Connection.ts:133

#### Returns

`Promise`\<`void`\>

***

### disconnect()

```ts
disconnect(): void;
```

Defined in: uniform.ts/src/newer/next/channel/Connection.ts:141

#### Returns

`void`

***

### emit()

```ts
emit(
   toChannel, 
   eventType, 
   data): void;
```

Defined in: uniform.ts/src/newer/next/channel/Connection.ts:115

#### Parameters

##### toChannel

`string`

##### eventType

`string`

##### data

`any`

#### Returns

`void`

***

### markConnected()

```ts
markConnected(): void;
```

Defined in: uniform.ts/src/newer/next/channel/Connection.ts:156

#### Returns

`void`

***

### markDisconnected()

```ts
markDisconnected(): void;
```

Defined in: uniform.ts/src/newer/next/channel/Connection.ts:157

#### Returns

`void`

***

### next()

```ts
next(message): void;
```

Defined in: uniform.ts/src/newer/next/channel/Connection.ts:79

#### Parameters

##### message

[`ChannelMessage`](../../../types/Interface/interfaces/ChannelMessage.md)

#### Returns

`void`

***

### pushInbound()

```ts
pushInbound(message): void;
```

Defined in: uniform.ts/src/newer/next/channel/Connection.ts:123

#### Parameters

##### message

[`ChannelMessage`](../../../types/Interface/interfaces/ChannelMessage.md)

#### Returns

`void`

***

### request()

```ts
request<T>(
   toChannel, 
   payload, 
opts?): Promise<T>;
```

Defined in: uniform.ts/src/newer/next/channel/Connection.ts:90

#### Type Parameters

##### T

`T` = `any`

#### Parameters

##### toChannel

`string`

##### payload

`any`

##### opts?

###### action?

`string`

###### path?

`string`[]

###### timeout?

`number`

#### Returns

`Promise`\<`T`\>

***

### respond()

```ts
respond(original, payload): void;
```

Defined in: uniform.ts/src/newer/next/channel/Connection.ts:111

#### Parameters

##### original

[`ChannelMessage`](../../../types/Interface/interfaces/ChannelMessage.md)

##### payload

`any`

#### Returns

`void`

***

### subscribe()

```ts
subscribe(observer, fromChannel?): Subscription;
```

Defined in: uniform.ts/src/newer/next/channel/Connection.ts:74

#### Parameters

##### observer

  \| [`Observer`](../../../types/Interface/interfaces/Observer.md)\<[`ChannelMessage`](../../../types/Interface/interfaces/ChannelMessage.md)\<`any`\>\>
  \| ((`msg`) => `void`)

##### fromChannel?

`string`

#### Returns

[`Subscription`](../../../types/Interface/interfaces/Subscription.md)

***

### subscribeOutbound()

```ts
subscribeOutbound(observer): Subscription;
```

Defined in: uniform.ts/src/newer/next/channel/Connection.ts:119

#### Parameters

##### observer

  \| [`Observer`](../../../types/Interface/interfaces/Observer.md)\<[`ChannelMessage`](../../../types/Interface/interfaces/ChannelMessage.md)\<`any`\>\>
  \| ((`msg`) => `void`)

#### Returns

[`Subscription`](../../../types/Interface/interfaces/Subscription.md)
