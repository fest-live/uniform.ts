[**@fest-lib/uniform v0.1.24**](../../../../README.md)

***

[@fest-lib/uniform](../../../../README.md) / [original/next/Queued](../README.md) / OptimizedWorkerChannel

# Class: OptimizedWorkerChannel

Defined in: uniform.ts/src/original/next/Queued.ts:246

## Constructors

### Constructor

```ts
new OptimizedWorkerChannel(
   channel?, 
   options?, 
   onChannelReady?): OptimizedWorkerChannel;
```

Defined in: uniform.ts/src/original/next/Queued.ts:260

#### Parameters

##### channel?

[`WorkerChannel`](../interfaces/WorkerChannel.md) \| `null`

##### options?

[`ProtocolOptions`](../interfaces/ProtocolOptions.md) = `{}`

##### onChannelReady?

(`channel`) => `void`

#### Returns

`OptimizedWorkerChannel`

## Methods

### close()

```ts
close(): void;
```

Defined in: uniform.ts/src/original/next/Queued.ts:438

Close the channel

#### Returns

`void`

***

### notify()

```ts
notify(type, payload): void;
```

Defined in: uniform.ts/src/original/next/Queued.ts:354

Send a one-way message (fire and forget)

#### Parameters

##### type

`string`

##### payload

`any`

#### Returns

`void`

***

### request()

```ts
request(
   type, 
   payload, 
options?): Promise<any>;
```

Defined in: uniform.ts/src/original/next/Queued.ts:290

Send a request and wait for response

#### Parameters

##### type

`string`

##### payload

`any`

##### options?

`Partial`\<[`ProtocolOptions`](../interfaces/ProtocolOptions.md)\>

#### Returns

`Promise`\<`any`\>

***

### setChannel()

```ts
setChannel(channel): void;
```

Defined in: uniform.ts/src/original/next/Queued.ts:280

Set the underlying channel when it becomes available

#### Parameters

##### channel

[`WorkerChannel`](../interfaces/WorkerChannel.md)

#### Returns

`void`

***

### stream()

```ts
stream(type, data): AsyncGenerator<any>;
```

Defined in: uniform.ts/src/original/next/Queued.ts:372

Stream data with backpressure handling

#### Parameters

##### type

`string`

##### data

`any`[]

#### Returns

`AsyncGenerator`\<`any`\>
