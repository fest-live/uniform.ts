[**@fest-lib/uniform v0.1.23**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/storage/TransferableStorage](../README.md) / MessageQueueStorage

# Class: MessageQueueStorage

Defined in: uniform.ts/src/newer/next/storage/TransferableStorage.ts:532

## Extends

- [`TransferableStorage`](TransferableStorage.md)\<[`QueuedMessage`](../interfaces/QueuedMessage.md)\>

## Constructors

### Constructor

```ts
new MessageQueueStorage(dbName?): MessageQueueStorage;
```

Defined in: uniform.ts/src/newer/next/storage/TransferableStorage.ts:533

#### Parameters

##### dbName?

`string` = `"uniform-message-queue"`

#### Returns

`MessageQueueStorage`

#### Overrides

[`TransferableStorage`](TransferableStorage.md).[`constructor`](TransferableStorage.md#constructor)

## Accessors

### changes

#### Get Signature

```ts
get changes(): ChannelSubject<StorageChange<T>>;
```

Defined in: uniform.ts/src/newer/next/storage/TransferableStorage.ts:508

##### Returns

[`ChannelSubject`](../../../observable/Observable/classes/ChannelSubject.md)\<[`StorageChange`](../interfaces/StorageChange.md)\<`T`\>\>

#### Inherited from

[`TransferableStorage`](TransferableStorage.md).[`changes`](TransferableStorage.md#changes)

***

### isOpen

#### Get Signature

```ts
get isOpen(): boolean;
```

Defined in: uniform.ts/src/newer/next/storage/TransferableStorage.ts:506

##### Returns

`boolean`

#### Inherited from

[`TransferableStorage`](TransferableStorage.md).[`isOpen`](TransferableStorage.md#isopen)

***

### state

#### Get Signature

```ts
get state(): ChannelSubject<"error" | "closed" | "opening" | "open">;
```

Defined in: uniform.ts/src/newer/next/storage/TransferableStorage.ts:507

##### Returns

[`ChannelSubject`](../../../observable/Observable/classes/ChannelSubject.md)\<`"error"` \| `"closed"` \| `"opening"` \| `"open"`\>

#### Inherited from

[`TransferableStorage`](TransferableStorage.md).[`state`](TransferableStorage.md#state)

## Methods

### batch()

```ts
batch(operations): Promise<void>;
```

Defined in: uniform.ts/src/newer/next/storage/TransferableStorage.ts:382

Batch operations in single transaction

#### Parameters

##### operations

(
  \| \{
  `id`: `string`;
  `type`: `"delete"`;
\}
  \| \{
  `data`: [`QueuedMessage`](../interfaces/QueuedMessage.md);
  `id`: `string`;
  `options?`: `any`;
  `type`: `"put"`;
\})[]

#### Returns

`Promise`\<`void`\>

#### Inherited from

[`TransferableStorage`](TransferableStorage.md).[`batch`](TransferableStorage.md#batch)

***

### cleanupExpired()

```ts
cleanupExpired(): Promise<number>;
```

Defined in: uniform.ts/src/newer/next/storage/TransferableStorage.ts:476

Cleanup expired records

#### Returns

`Promise`\<`number`\>

#### Inherited from

[`TransferableStorage`](TransferableStorage.md).[`cleanupExpired`](TransferableStorage.md#cleanupexpired)

***

### clear()

```ts
clear(): Promise<void>;
```

Defined in: uniform.ts/src/newer/next/storage/TransferableStorage.ts:419

Clear all records

#### Returns

`Promise`\<`void`\>

#### Inherited from

[`TransferableStorage`](TransferableStorage.md).[`clear`](TransferableStorage.md#clear)

***

### close()

```ts
close(): void;
```

Defined in: uniform.ts/src/newer/next/storage/TransferableStorage.ts:130

Close database connection

#### Returns

`void`

#### Inherited from

[`TransferableStorage`](TransferableStorage.md).[`close`](TransferableStorage.md#close)

***

### complete()

```ts
complete(id): Promise<void>;
```

Defined in: uniform.ts/src/newer/next/storage/TransferableStorage.ts:611

Mark message as completed

#### Parameters

##### id

`string`

#### Returns

`Promise`\<`void`\>

***

### count()

```ts
count(query?): Promise<number>;
```

Defined in: uniform.ts/src/newer/next/storage/TransferableStorage.ts:445

Count records

#### Parameters

##### query?

###### index?

`string`

###### range?

`IDBKeyRange`

#### Returns

`Promise`\<`number`\>

#### Inherited from

[`TransferableStorage`](TransferableStorage.md).[`count`](TransferableStorage.md#count)

***

### delete()

```ts
delete(id): Promise<boolean>;
```

Defined in: uniform.ts/src/newer/next/storage/TransferableStorage.ts:299

Delete record

#### Parameters

##### id

`string`

#### Returns

`Promise`\<`boolean`\>

#### Inherited from

[`TransferableStorage`](TransferableStorage.md).[`delete`](TransferableStorage.md#delete)

***

### dequeue()

```ts
dequeue(channel): Promise<QueuedMessage<any> | null>;
```

Defined in: uniform.ts/src/newer/next/storage/TransferableStorage.ts:585

Dequeue next message for channel

#### Parameters

##### channel

`string`

#### Returns

`Promise`\<[`QueuedMessage`](../interfaces/QueuedMessage.md)\<`any`\> \| `null`\>

***

### enqueue()

```ts
enqueue(message): Promise<QueuedMessage<any>>;
```

Defined in: uniform.ts/src/newer/next/storage/TransferableStorage.ts:550

Enqueue a message

#### Parameters

##### message

###### channel

`string`

###### delay?

`number`

###### expiresIn?

`number`

###### maxAttempts?

`number`

###### payload

`any`

###### priority?

`number`

###### sender

`string`

###### type

`string`

#### Returns

`Promise`\<[`QueuedMessage`](../interfaces/QueuedMessage.md)\<`any`\>\>

***

### fail()

```ts
fail(id, error): Promise<void>;
```

Defined in: uniform.ts/src/newer/next/storage/TransferableStorage.ts:622

Mark message as failed

#### Parameters

##### id

`string`

##### error

`string`

#### Returns

`Promise`\<`void`\>

***

### get()

```ts
get(id): Promise<
  | TransferableRecord<QueuedMessage<any>>
| null>;
```

Defined in: uniform.ts/src/newer/next/storage/TransferableStorage.ts:238

Get record by ID

#### Parameters

##### id

`string`

#### Returns

`Promise`\<
  \| [`TransferableRecord`](../interfaces/TransferableRecord.md)\<[`QueuedMessage`](../interfaces/QueuedMessage.md)\<`any`\>\>
  \| `null`\>

#### Inherited from

[`TransferableStorage`](TransferableStorage.md).[`get`](TransferableStorage.md#get)

***

### getBuffer()

```ts
getBuffer(id, transfer?): Promise<ArrayBuffer | null>;
```

Defined in: uniform.ts/src/newer/next/storage/TransferableStorage.ts:265

Get ArrayBuffer and optionally transfer ownership

#### Parameters

##### id

`string`

##### transfer?

`boolean`

#### Returns

`Promise`\<`ArrayBuffer` \| `null`\>

#### Inherited from

[`TransferableStorage`](TransferableStorage.md).[`getBuffer`](TransferableStorage.md#getbuffer)

***

### getPendingCount()

```ts
getPendingCount(channel): Promise<number>;
```

Defined in: uniform.ts/src/newer/next/storage/TransferableStorage.ts:639

Get pending count for channel

#### Parameters

##### channel

`string`

#### Returns

`Promise`\<`number`\>

***

### getTypedArray()

```ts
getTypedArray<A>(id): Promise<A | null>;
```

Defined in: uniform.ts/src/newer/next/storage/TransferableStorage.ts:285

Reconstruct TypedArray from stored data

#### Type Parameters

##### A

`A` *extends* `ArrayBufferView`\<`ArrayBufferLike`\>

#### Parameters

##### id

`string`

#### Returns

`Promise`\<`A` \| `null`\>

#### Inherited from

[`TransferableStorage`](TransferableStorage.md).[`getTypedArray`](TransferableStorage.md#gettypedarray)

***

### onChanges()

```ts
onChanges(handler): Subscription;
```

Defined in: uniform.ts/src/newer/next/storage/TransferableStorage.ts:462

Subscribe to changes

#### Parameters

##### handler

(`change`) => `void`

#### Returns

[`Subscription`](../../../types/Interface/interfaces/Subscription.md)

#### Inherited from

[`TransferableStorage`](TransferableStorage.md).[`onChanges`](TransferableStorage.md#onchanges)

***

### onState()

```ts
onState(handler): Subscription;
```

Defined in: uniform.ts/src/newer/next/storage/TransferableStorage.ts:469

Subscribe to state changes

#### Parameters

##### handler

(`state`) => `void`

#### Returns

[`Subscription`](../../../types/Interface/interfaces/Subscription.md)

#### Inherited from

[`TransferableStorage`](TransferableStorage.md).[`onState`](TransferableStorage.md#onstate)

***

### open()

```ts
open(): Promise<void>;
```

Defined in: uniform.ts/src/newer/next/storage/TransferableStorage.ts:84

Open database connection

#### Returns

`Promise`\<`void`\>

#### Inherited from

[`TransferableStorage`](TransferableStorage.md).[`open`](TransferableStorage.md#open)

***

### put()

```ts
put(
   id, 
   data, 
options?): Promise<TransferableRecord<QueuedMessage<any>>>;
```

Defined in: uniform.ts/src/newer/next/storage/TransferableStorage.ts:143

Store data with optional ArrayBuffer transfer

#### Parameters

##### id

`string`

##### data

[`QueuedMessage`](../interfaces/QueuedMessage.md)

##### options?

###### buffers?

`ArrayBuffer`[]

###### expiresIn?

`number`

###### metadata?

`Record`\<`string`, `any`\>

###### transfer?

`boolean`

#### Returns

`Promise`\<[`TransferableRecord`](../interfaces/TransferableRecord.md)\<[`QueuedMessage`](../interfaces/QueuedMessage.md)\<`any`\>\>\>

#### Inherited from

[`TransferableStorage`](TransferableStorage.md).[`put`](TransferableStorage.md#put)

***

### putBuffer()

```ts
putBuffer(
   id, 
   buffer, 
options?): Promise<TransferableRecord<ArrayBuffer>>;
```

Defined in: uniform.ts/src/newer/next/storage/TransferableStorage.ts:208

Store ArrayBuffer directly with zero-copy semantics

#### Parameters

##### id

`string`

##### buffer

`ArrayBuffer`

##### options?

###### expiresIn?

`number`

###### metadata?

`Record`\<`string`, `any`\>

###### transfer?

`boolean`

#### Returns

`Promise`\<[`TransferableRecord`](../interfaces/TransferableRecord.md)\<`ArrayBuffer`\>\>

#### Inherited from

[`TransferableStorage`](TransferableStorage.md).[`putBuffer`](TransferableStorage.md#putbuffer)

***

### putTypedArray()

```ts
putTypedArray<A>(
   id, 
   array, 
   options?): Promise<TransferableRecord<{
  data: number[];
  type: string;
}>>;
```

Defined in: uniform.ts/src/newer/next/storage/TransferableStorage.ts:219

Store TypedArray

#### Type Parameters

##### A

`A` *extends* `ArrayBufferView`\<`ArrayBufferLike`\>

#### Parameters

##### id

`string`

##### array

`A`

##### options?

###### expiresIn?

`number`

###### metadata?

`Record`\<`string`, `any`\>

###### transfer?

`boolean`

#### Returns

`Promise`\<[`TransferableRecord`](../interfaces/TransferableRecord.md)\<\{
  `data`: `number`[];
  `type`: `string`;
\}\>\>

#### Inherited from

[`TransferableStorage`](TransferableStorage.md).[`putTypedArray`](TransferableStorage.md#puttypedarray)

***

### query()

```ts
query(query?): Promise<TransferableRecord<QueuedMessage<any>>[]>;
```

Defined in: uniform.ts/src/newer/next/storage/TransferableStorage.ts:328

Query records with cursor

#### Parameters

##### query?

[`TransferableQuery`](../interfaces/TransferableQuery.md)\<[`QueuedMessage`](../interfaces/QueuedMessage.md)\<`any`\>\> = `{}`

#### Returns

`Promise`\<[`TransferableRecord`](../interfaces/TransferableRecord.md)\<[`QueuedMessage`](../interfaces/QueuedMessage.md)\<`any`\>\>[]\>

#### Inherited from

[`TransferableStorage`](TransferableStorage.md).[`query`](TransferableStorage.md#query)
