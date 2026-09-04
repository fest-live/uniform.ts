[**@fest-lib/uniform v0.1.26**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/transport/UnifiedTransport](../README.md) / TransportInstance

# Interface: TransportInstance

Defined in: uniform.ts/src/newer/next/transport/UnifiedTransport.ts:52

## Properties

### channelName

```ts
readonly channelName: string;
```

Defined in: uniform.ts/src/newer/next/transport/UnifiedTransport.ts:58

***

### isReady

```ts
readonly isReady: boolean;
```

Defined in: uniform.ts/src/newer/next/transport/UnifiedTransport.ts:59

***

### type

```ts
readonly type: TransportType;
```

Defined in: uniform.ts/src/newer/next/transport/UnifiedTransport.ts:57

## Methods

### close()

```ts
close(): void;
```

Defined in: uniform.ts/src/newer/next/transport/UnifiedTransport.ts:56

#### Returns

`void`

***

### request()

```ts
request(msg): Promise<any>;
```

Defined in: uniform.ts/src/newer/next/transport/UnifiedTransport.ts:54

#### Parameters

##### msg

[`ChannelMessage`](../../../types/Interface/interfaces/ChannelMessage.md)

#### Returns

`Promise`\<`any`\>

***

### send()

```ts
send(msg, transfer?): void;
```

Defined in: uniform.ts/src/newer/next/transport/UnifiedTransport.ts:53

#### Parameters

##### msg

[`ChannelMessage`](../../../types/Interface/interfaces/ChannelMessage.md)

##### transfer?

`Transferable`[]

#### Returns

`void`

***

### subscribe()

```ts
subscribe(observer): Subscription;
```

Defined in: uniform.ts/src/newer/next/transport/UnifiedTransport.ts:55

#### Parameters

##### observer

  \| [`Observer`](../../../types/Interface/interfaces/Observer.md)\<[`ChannelMessage`](../../../types/Interface/interfaces/ChannelMessage.md)\<`any`\>\>
  \| ((`v`) => `void`)

#### Returns

[`Subscription`](../../../types/Interface/interfaces/Subscription.md)
