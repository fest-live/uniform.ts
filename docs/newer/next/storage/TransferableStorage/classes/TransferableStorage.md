[**@fest-lib/uniform v0.1.29**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/storage/TransferableStorage](../README.md) / TransferableStorage

# Class: TransferableStorage\<T\>

Defined in: uniform.ts/src/newer/next/storage/TransferableStorage.ts:62

## Extended by

- [`MessageQueueStorage`](MessageQueueStorage.md)

## Type Parameters

### T

`T` = `any`

## Constructors

### Constructor

```ts
new TransferableStorage<T>(config): TransferableStorage<T>;
```

Defined in: uniform.ts/src/newer/next/storage/TransferableStorage.ts:69

#### Parameters

##### config

[`TransferableStorageConfig`](../interfaces/TransferableStorageConfig.md)

#### Returns

`TransferableStorage`\<`T`\>

## Accessors

### changes

#### Get Signature

```ts
get changes(): ChannelSubject<StorageChange<T>>;
```

Defined in: uniform.ts/src/newer/next/storage/TransferableStorage.ts:508

##### Returns

[`ChannelSubject`](../../../observable/Observable/classes/ChannelSubject.md)\<[`StorageChange`](../interfaces/StorageChange.md)\<`T`\>\>

***

### isOpen

#### Get Signature

```ts
get isOpen(): boolean;
```

Defined in: uniform.ts/src/newer/next/storage/TransferableStorage.ts:506

##### Returns

`boolean`

***

### state

#### Get Signature

```ts
get state(): ChannelSubject<"error" | "closed" | "opening" | "open">;
```

Defined in: uniform.ts/src/newer/next/storage/TransferableStorage.ts:507

##### Returns

[`ChannelSubject`](../../../observable/Observable/classes/ChannelSubject.md)\<`"error"` \| `"closed"` \| `"opening"` \| `"open"`\>

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
  `data`: `T`;
  `id`: `string`;
  `options?`: `any`;
  `type`: `"put"`;
\}
  \| \{
  `id`: `string`;
  `type`: `"delete"`;
\})[]

#### Returns

`Promise`\<`void`\>

***

### cleanupExpired()

```ts
cleanupExpired(): Promise<number>;
```

Defined in: uniform.ts/src/newer/next/storage/TransferableStorage.ts:476

Cleanup expired records

#### Returns

`Promise`\<`number`\>

***

### clear()

```ts
clear(): Promise<void>;
```

Defined in: uniform.ts/src/newer/next/storage/TransferableStorage.ts:419

Clear all records

#### Returns

`Promise`\<`void`\>

***

### close()

```ts
close(): void;
```

Defined in: uniform.ts/src/newer/next/storage/TransferableStorage.ts:130

Close database connection

#### Returns

`void`

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

***

### get()

```ts
get(id): Promise<
  | TransferableRecord<T>
| null>;
```

Defined in: uniform.ts/src/newer/next/storage/TransferableStorage.ts:238

Get record by ID

#### Parameters

##### id

`string`

#### Returns

`Promise`\<
  \| [`TransferableRecord`](../interfaces/TransferableRecord.md)\<`T`\>
  \| `null`\>

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

***

### open()

```ts
open(): Promise<void>;
```

Defined in: uniform.ts/src/newer/next/storage/TransferableStorage.ts:84

Open database connection

#### Returns

`Promise`\<`void`\>

***

### put()

```ts
put(
   id, 
   data, 
options?): Promise<TransferableRecord<T>>;
```

Defined in: uniform.ts/src/newer/next/storage/TransferableStorage.ts:143

Store data with optional ArrayBuffer transfer

#### Parameters

##### id

`string`

##### data

`T`

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

`Promise`\<[`TransferableRecord`](../interfaces/TransferableRecord.md)\<`T`\>\>

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

***

### query()

```ts
query(query?): Promise<TransferableRecord<T>[]>;
```

Defined in: uniform.ts/src/newer/next/storage/TransferableStorage.ts:328

Query records with cursor

#### Parameters

##### query?

[`TransferableQuery`](../interfaces/TransferableQuery.md)\<`T`\> = `{}`

#### Returns

`Promise`\<[`TransferableRecord`](../interfaces/TransferableRecord.md)\<`T`\>[]\>
