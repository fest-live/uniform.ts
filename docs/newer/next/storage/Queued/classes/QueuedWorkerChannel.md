[**@fest-lib/uniform v0.1.23**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/storage/Queued](../README.md) / QueuedWorkerChannel

# Class: QueuedWorkerChannel

Defined in: uniform.ts/src/newer/next/storage/Queued.ts:56

Queued worker channel that buffers requests until the channel is available

## Implements

- [`WorkerChannel`](../interfaces/WorkerChannel.md)

## Constructors

### Constructor

```ts
new QueuedWorkerChannel(config, onChannelReady?): QueuedWorkerChannel;
```

Defined in: uniform.ts/src/newer/next/storage/Queued.ts:64

#### Parameters

##### config

[`WorkerConfig`](../interfaces/WorkerConfig.md)

##### onChannelReady?

(`channel`) => `void`

#### Returns

`QueuedWorkerChannel`

## Methods

### close()

```ts
close(): void;
```

Defined in: uniform.ts/src/newer/next/storage/Queued.ts:150

#### Returns

`void`

#### Implementation of

[`WorkerChannel`](../interfaces/WorkerChannel.md).[`close`](../interfaces/WorkerChannel.md#close)

***

### connect()

```ts
connect(underlyingChannel?): Promise<void>;
```

Defined in: uniform.ts/src/newer/next/storage/Queued.ts:74

Initialize the underlying channel

#### Parameters

##### underlyingChannel?

[`WorkerChannel`](../interfaces/WorkerChannel.md) \| `null`

#### Returns

`Promise`\<`void`\>

***

### getQueueStatus()

```ts
getQueueStatus(): object;
```

Defined in: uniform.ts/src/newer/next/storage/Queued.ts:142

Get queue status

#### Returns

`object`

##### isConnected

```ts
isConnected: boolean;
```

##### isConnecting

```ts
isConnecting: boolean;
```

##### queuedRequests

```ts
queuedRequests: number;
```

***

### request()

```ts
request(method, args?): Promise<any>;
```

Defined in: uniform.ts/src/newer/next/storage/Queued.ts:81

Queue a request if channel isn't ready, otherwise send immediately

#### Parameters

##### method

`string`

##### args?

`any`[] = `[]`

#### Returns

`Promise`\<`any`\>

#### Implementation of

[`WorkerChannel`](../interfaces/WorkerChannel.md).[`request`](../interfaces/WorkerChannel.md#request)
