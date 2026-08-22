[**@fest-lib/uniform v0.1.12**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/transport/SharedWorkerTransport](../README.md) / SharedWorkerClient

# Class: SharedWorkerClient

Defined in: src/newer/next/transport/SharedWorkerTransport.ts:43

SharedWorker client - connects to a shared worker from page/tab

## Constructors

### Constructor

```ts
new SharedWorkerClient(
   _scriptUrl, 
   _channelName, 
   _options?): SharedWorkerClient;
```

Defined in: src/newer/next/transport/SharedWorkerTransport.ts:53

#### Parameters

##### \_scriptUrl

`string` \| `URL`

##### \_channelName

`string`

##### \_options?

[`SharedWorkerOptions`](../interfaces/SharedWorkerOptions.md) = `{}`

#### Returns

`SharedWorkerClient`

## Accessors

### channelName

#### Get Signature

```ts
get channelName(): string;
```

Defined in: src/newer/next/transport/SharedWorkerTransport.ts:204

##### Returns

`string`

***

### isConnected

#### Get Signature

```ts
get isConnected(): boolean;
```

Defined in: src/newer/next/transport/SharedWorkerTransport.ts:202

##### Returns

`boolean`

***

### port

#### Get Signature

```ts
get port(): MessagePort | null;
```

Defined in: src/newer/next/transport/SharedWorkerTransport.ts:200

##### Returns

`MessagePort` \| `null`

***

### portId

#### Get Signature

```ts
get portId(): string;
```

Defined in: src/newer/next/transport/SharedWorkerTransport.ts:201

##### Returns

`string`

***

### state

#### Get Signature

```ts
get state(): ChannelSubject<"error" | "connected" | "disconnected" | "connecting">;
```

Defined in: src/newer/next/transport/SharedWorkerTransport.ts:203

##### Returns

[`ChannelSubject`](../../../observable/Observable/classes/ChannelSubject.md)\<`"error"` \| `"connected"` \| `"disconnected"` \| `"connecting"`\>

## Methods

### broadcast()

```ts
broadcast(msg, transfer?): void;
```

Defined in: src/newer/next/transport/SharedWorkerTransport.ts:115

#### Parameters

##### msg

[`SharedWorkerMessage`](../interfaces/SharedWorkerMessage.md)

##### transfer?

`Transferable`[]

#### Returns

`void`

***

### close()

```ts
close(): void;
```

Defined in: src/newer/next/transport/SharedWorkerTransport.ts:194

#### Returns

`void`

***

### connect()

```ts
connect(): void;
```

Defined in: src/newer/next/transport/SharedWorkerTransport.ts:61

#### Returns

`void`

***

### disconnect()

```ts
disconnect(): void;
```

Defined in: src/newer/next/transport/SharedWorkerTransport.ts:179

#### Returns

`void`

***

### request()

```ts
request(msg): Promise<any>;
```

Defined in: src/newer/next/transport/SharedWorkerTransport.ts:95

#### Parameters

##### msg

`Omit`\<[`SharedWorkerMessage`](../interfaces/SharedWorkerMessage.md)\<`any`\>, `"reqId"`\> & `object`

#### Returns

`Promise`\<`any`\>

***

### send()

```ts
send(msg, transfer?): void;
```

Defined in: src/newer/next/transport/SharedWorkerTransport.ts:89

#### Parameters

##### msg

[`SharedWorkerMessage`](../interfaces/SharedWorkerMessage.md)

##### transfer?

`Transferable`[]

#### Returns

`void`

***

### subscribe()

```ts
subscribe(observer): Subscription;
```

Defined in: src/newer/next/transport/SharedWorkerTransport.ts:119

#### Parameters

##### observer

  \| [`Observer`](../../../types/Interface/interfaces/Observer.md)\<[`SharedWorkerMessage`](../interfaces/SharedWorkerMessage.md)\<`any`\>\>
  \| ((`v`) => `void`)

#### Returns

[`Subscription`](../../../types/Interface/interfaces/Subscription.md)
