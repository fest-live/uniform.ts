[**@fest-lib/uniform v0.1.24**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/transport/UnifiedTransport](../README.md) / AbstractTransport

# Abstract Class: AbstractTransport

Defined in: uniform.ts/src/newer/next/transport/UnifiedTransport.ts:66

## Implements

- [`TransportInstance`](../interfaces/TransportInstance.md)

## Constructors

### Constructor

```ts
new AbstractTransport(
   _type, 
   _channelName, 
   _config): AbstractTransport;
```

Defined in: uniform.ts/src/newer/next/transport/UnifiedTransport.ts:72

#### Parameters

##### \_type

[`TransportType`](../../../../core/TransportCore/type-aliases/TransportType.md)

##### \_channelName

`string`

##### \_config

[`UnifiedTransportConfig`](../interfaces/UnifiedTransportConfig.md)

#### Returns

`AbstractTransport`

## Accessors

### channelName

#### Get Signature

```ts
get channelName(): string;
```

Defined in: uniform.ts/src/newer/next/transport/UnifiedTransport.ts:132

##### Returns

`string`

#### Implementation of

[`TransportInstance`](../interfaces/TransportInstance.md).[`channelName`](../interfaces/TransportInstance.md#channelname)

***

### isReady

#### Get Signature

```ts
get isReady(): boolean;
```

Defined in: uniform.ts/src/newer/next/transport/UnifiedTransport.ts:133

##### Returns

`boolean`

#### Implementation of

[`TransportInstance`](../interfaces/TransportInstance.md).[`isReady`](../interfaces/TransportInstance.md#isready)

***

### state

#### Get Signature

```ts
get state(): ChannelSubject<"error" | "connected" | "disconnected" | "connecting">;
```

Defined in: uniform.ts/src/newer/next/transport/UnifiedTransport.ts:134

##### Returns

[`ChannelSubject`](../../../observable/Observable/classes/ChannelSubject.md)\<`"error"` \| `"connected"` \| `"disconnected"` \| `"connecting"`\>

***

### type

#### Get Signature

```ts
get type(): TransportType;
```

Defined in: uniform.ts/src/newer/next/transport/UnifiedTransport.ts:131

##### Returns

[`TransportType`](../../../../core/TransportCore/type-aliases/TransportType.md)

#### Implementation of

[`TransportInstance`](../interfaces/TransportInstance.md).[`type`](../interfaces/TransportInstance.md#type)

## Methods

### close()

```ts
close(): void;
```

Defined in: uniform.ts/src/newer/next/transport/UnifiedTransport.ts:124

#### Returns

`void`

#### Implementation of

[`TransportInstance`](../interfaces/TransportInstance.md).[`close`](../interfaces/TransportInstance.md#close)

***

### request()

```ts
request(msg): Promise<any>;
```

Defined in: uniform.ts/src/newer/next/transport/UnifiedTransport.ts:80

#### Parameters

##### msg

[`ChannelMessage`](../../../types/Interface/interfaces/ChannelMessage.md)

#### Returns

`Promise`\<`any`\>

#### Implementation of

[`TransportInstance`](../interfaces/TransportInstance.md).[`request`](../interfaces/TransportInstance.md#request)

***

### send()

```ts
abstract send(msg, transfer?): void;
```

Defined in: uniform.ts/src/newer/next/transport/UnifiedTransport.ts:78

#### Parameters

##### msg

[`ChannelMessage`](../../../types/Interface/interfaces/ChannelMessage.md)

##### transfer?

`Transferable`[]

#### Returns

`void`

#### Implementation of

[`TransportInstance`](../interfaces/TransportInstance.md).[`send`](../interfaces/TransportInstance.md#send)

***

### subscribe()

```ts
subscribe(observer): Subscription;
```

Defined in: uniform.ts/src/newer/next/transport/UnifiedTransport.ts:98

#### Parameters

##### observer

  \| [`Observer`](../../../types/Interface/interfaces/Observer.md)\<[`ChannelMessage`](../../../types/Interface/interfaces/ChannelMessage.md)\<`any`\>\>
  \| ((`v`) => `void`)

#### Returns

[`Subscription`](../../../types/Interface/interfaces/Subscription.md)

#### Implementation of

[`TransportInstance`](../interfaces/TransportInstance.md).[`subscribe`](../interfaces/TransportInstance.md#subscribe)
