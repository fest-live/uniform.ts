[**@fest-lib/uniform v0.1.2**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/transport/AtomicsTransport](../README.md) / AtomicsTransport

# Class: AtomicsTransport

Defined in: src/newer/next/transport/AtomicsTransport.ts:258

## Constructors

### Constructor

```ts
new AtomicsTransport(
   _channelName, 
   sendBuffer, 
   recvBuffer, 
   _config?): AtomicsTransport;
```

Defined in: src/newer/next/transport/AtomicsTransport.ts:270

#### Parameters

##### \_channelName

`string`

##### sendBuffer

`SharedArrayBuffer` \| [`AtomicsBuffer`](AtomicsBuffer.md)

##### recvBuffer

`SharedArrayBuffer` \| [`AtomicsBuffer`](AtomicsBuffer.md)

##### \_config?

[`AtomicsTransportConfig`](../interfaces/AtomicsTransportConfig.md) = `{}`

#### Returns

`AtomicsTransport`

## Accessors

### channelName

#### Get Signature

```ts
get channelName(): string;
```

Defined in: src/newer/next/transport/AtomicsTransport.ts:406

##### Returns

`string`

***

### recvBuffer

#### Get Signature

```ts
get recvBuffer(): SharedArrayBuffer;
```

Defined in: src/newer/next/transport/AtomicsTransport.ts:403

##### Returns

`SharedArrayBuffer`

***

### sendBuffer

#### Get Signature

```ts
get sendBuffer(): SharedArrayBuffer;
```

Defined in: src/newer/next/transport/AtomicsTransport.ts:402

##### Returns

`SharedArrayBuffer`

***

### state

#### Get Signature

```ts
get state(): ChannelSubject<"error" | "ready" | "polling" | "stopped">;
```

Defined in: src/newer/next/transport/AtomicsTransport.ts:405

##### Returns

[`ChannelSubject`](../../../observable/Observable/classes/ChannelSubject.md)\<`"error"` \| `"ready"` \| `"polling"` \| `"stopped"`\>

***

### workerId

#### Get Signature

```ts
get workerId(): string;
```

Defined in: src/newer/next/transport/AtomicsTransport.ts:404

##### Returns

`string`

## Methods

### close()

```ts
close(): void;
```

Defined in: src/newer/next/transport/AtomicsTransport.ts:396

#### Returns

`void`

***

### request()

```ts
request(msg): Promise<any>;
```

Defined in: src/newer/next/transport/AtomicsTransport.ts:317

#### Parameters

##### msg

`Omit`\<[`AtomicsMessage`](../interfaces/AtomicsMessage.md)\<`any`\>, `"reqId"`\> & `object`

#### Returns

`Promise`\<`any`\>

***

### send()

```ts
send(msg, transfer?): Promise<void>;
```

Defined in: src/newer/next/transport/AtomicsTransport.ts:289

#### Parameters

##### msg

[`AtomicsMessage`](../interfaces/AtomicsMessage.md)

##### transfer?

`Transferable`[]

#### Returns

`Promise`\<`void`\>

***

### subscribe()

```ts
subscribe(observer): Subscription;
```

Defined in: src/newer/next/transport/AtomicsTransport.ts:335

#### Parameters

##### observer

  \| [`Observer`](../../../types/Interface/interfaces/Observer.md)\<[`AtomicsMessage`](../interfaces/AtomicsMessage.md)\<`any`\>\>
  \| ((`v`) => `void`)

#### Returns

[`Subscription`](../../../types/Interface/interfaces/Subscription.md)
