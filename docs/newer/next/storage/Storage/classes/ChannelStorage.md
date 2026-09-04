[**@fest-lib/uniform v0.1.26**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/storage/Storage](../README.md) / ChannelStorage

# Class: ChannelStorage

Defined in: uniform.ts/src/newer/next/storage/Storage.ts:91

IndexedDB manager for channel storage

## Constructors

### Constructor

```ts
new ChannelStorage(channelName): ChannelStorage;
```

Defined in: uniform.ts/src/newer/next/storage/Storage.ts:101

#### Parameters

##### channelName

`string`

#### Returns

`ChannelStorage`

## Methods

### awaitPending()

```ts
awaitPending<T>(operationId, options?): Promise<T | null>;
```

Defined in: uniform.ts/src/newer/next/storage/Storage.ts:536

Await a pending operation (poll until complete or timeout)

#### Type Parameters

##### T

`T` = `any`

#### Parameters

##### operationId

`string`

##### options?

###### pollInterval?

`number`

###### timeout?

`number`

#### Returns

`Promise`\<`T` \| `null`\>

***

### beginTransaction()

```ts
beginTransaction(): Promise<ChannelTransaction>;
```

Defined in: uniform.ts/src/newer/next/storage/Storage.ts:790

Begin a transaction for batch operations

#### Returns

`Promise`\<[`ChannelTransaction`](ChannelTransaction.md)\>

***

### cleanupExpired()

```ts
cleanupExpired(): Promise<number>;
```

Defined in: uniform.ts/src/newer/next/storage/Storage.ts:866

Clean up expired messages

#### Returns

`Promise`\<`number`\>

***

### clearMailbox()

```ts
clearMailbox(channel): Promise<number>;
```

Defined in: uniform.ts/src/newer/next/storage/Storage.ts:442

Clear mailbox for a channel

#### Parameters

##### channel

`string`

#### Returns

`Promise`\<`number`\>

***

### close()

```ts
close(): void;
```

Defined in: uniform.ts/src/newer/next/storage/Storage.ts:143

Close database connection

#### Returns

`void`

***

### completePending()

```ts
completePending(operationId): Promise<void>;
```

Defined in: uniform.ts/src/newer/next/storage/Storage.ts:520

Complete a pending operation

#### Parameters

##### operationId

`string`

#### Returns

`Promise`\<`void`\>

***

### defer()

```ts
defer(message, options?): Promise<string>;
```

Defined in: uniform.ts/src/newer/next/storage/Storage.ts:198

Defer a message for later delivery

#### Parameters

##### message

`Omit`\<[`ChannelMessage`](../../../types/Interface/interfaces/ChannelMessage.md), `"id"` \| `"timestamp"`\>

##### options?

###### expiresIn?

`number`

###### maxRetries?

`number`

###### metadata?

`Record`\<`string`, `any`\>

###### priority?

`number`

#### Returns

`Promise`\<`string`\>

***

### exchangeDelete()

```ts
exchangeDelete(key): Promise<boolean>;
```

Defined in: uniform.ts/src/newer/next/storage/Storage.ts:668

Delete data from exchange

#### Parameters

##### key

`string`

#### Returns

`Promise`\<`boolean`\>

***

### exchangeGet()

```ts
exchangeGet<T>(key): Promise<T | null>;
```

Defined in: uniform.ts/src/newer/next/storage/Storage.ts:634

Get data from exchange

#### Type Parameters

##### T

`T` = `any`

#### Parameters

##### key

`string`

#### Returns

`Promise`\<`T` \| `null`\>

***

### exchangeLock()

```ts
exchangeLock(key, options?): Promise<boolean>;
```

Defined in: uniform.ts/src/newer/next/storage/Storage.ts:703

Acquire lock on exchange key

#### Parameters

##### key

`string`

##### options?

###### timeout?

`number`

#### Returns

`Promise`\<`boolean`\>

***

### exchangePut()

```ts
exchangePut<T>(
   key, 
   value, 
options?): Promise<string>;
```

Defined in: uniform.ts/src/newer/next/storage/Storage.ts:583

Put data in exchange (shared storage)

#### Type Parameters

##### T

`T` = `any`

#### Parameters

##### key

`string`

##### value

`T`

##### options?

###### sharedWith?

`string`[]

###### ttl?

`number`

#### Returns

`Promise`\<`string`\>

***

### exchangeUnlock()

```ts
exchangeUnlock(key): Promise<void>;
```

Defined in: uniform.ts/src/newer/next/storage/Storage.ts:752

Release lock on exchange key

#### Parameters

##### key

`string`

#### Returns

`Promise`\<`void`\>

***

### executeTransaction()

```ts
executeTransaction(operations): Promise<void>;
```

Defined in: uniform.ts/src/newer/next/storage/Storage.ts:797

Execute operations in transaction

#### Parameters

##### operations

[`TransactionOp`](../interfaces/TransactionOp.md)\<`any`\>[]

#### Returns

`Promise`\<`void`\>

***

### getDeferredMessages()

```ts
getDeferredMessages(channel, options?): Promise<StoredMessage<any>[]>;
```

Defined in: uniform.ts/src/newer/next/storage/Storage.ts:246

Get deferred messages for a channel

#### Parameters

##### channel

`string`

##### options?

###### limit?

`number`

###### offset?

`number`

###### status?

[`MessageStatus`](../type-aliases/MessageStatus.md)

#### Returns

`Promise`\<[`StoredMessage`](../interfaces/StoredMessage.md)\<`any`\>[]\>

***

### getMailbox()

```ts
getMailbox(channel, options?): Promise<StoredMessage<any>[]>;
```

Defined in: uniform.ts/src/newer/next/storage/Storage.ts:382

Get mailbox for a channel

#### Parameters

##### channel

`string`

##### options?

###### limit?

`number`

###### sortBy?

`"priority"` \| `"createdAt"`

#### Returns

`Promise`\<[`StoredMessage`](../interfaces/StoredMessage.md)\<`any`\>[]\>

***

### getMailboxStats()

```ts
getMailboxStats(channel): Promise<MailboxStats>;
```

Defined in: uniform.ts/src/newer/next/storage/Storage.ts:415

Get mailbox statistics

#### Parameters

##### channel

`string`

#### Returns

`Promise`\<[`MailboxStats`](../interfaces/MailboxStats.md)\>

***

### getPendingOperations()

```ts
getPendingOperations(): Promise<any[]>;
```

Defined in: uniform.ts/src/newer/next/storage/Storage.ts:502

Get all pending operations for channel

#### Returns

`Promise`\<`any`[]\>

***

### markDelivered()

```ts
markDelivered(messageId): Promise<void>;
```

Defined in: uniform.ts/src/newer/next/storage/Storage.ts:312

Mark message as delivered

#### Parameters

##### messageId

`string`

#### Returns

`Promise`\<`void`\>

***

### markFailed()

```ts
markFailed(messageId): Promise<boolean>;
```

Defined in: uniform.ts/src/newer/next/storage/Storage.ts:319

Mark message as failed and retry if possible

#### Parameters

##### messageId

`string`

#### Returns

`Promise`\<`boolean`\>

***

### onExchangeUpdate()

```ts
onExchangeUpdate(handler): Subscription;
```

Defined in: uniform.ts/src/newer/next/storage/Storage.ts:855

Subscribe to exchange updates

#### Parameters

##### handler

(`record`) => `void`

#### Returns

[`Subscription`](../../../types/Interface/interfaces/Subscription.md)

***

### onMessageUpdate()

```ts
onMessageUpdate(handler): Subscription;
```

Defined in: uniform.ts/src/newer/next/storage/Storage.ts:848

Subscribe to message updates

#### Parameters

##### handler

(`msg`) => `void`

#### Returns

[`Subscription`](../../../types/Interface/interfaces/Subscription.md)

***

### open()

```ts
open(): Promise<IDBDatabase>;
```

Defined in: uniform.ts/src/newer/next/storage/Storage.ts:112

Open database connection

#### Returns

`Promise`\<`IDBDatabase`\>

***

### processNextPending()

```ts
processNextPending(channel): Promise<StoredMessage<any> | null>;
```

Defined in: uniform.ts/src/newer/next/storage/Storage.ts:281

Process next pending message

#### Parameters

##### channel

`string`

#### Returns

`Promise`\<[`StoredMessage`](../interfaces/StoredMessage.md)\<`any`\> \| `null`\>

***

### registerPending()

```ts
registerPending<T>(operation): Promise<string>;
```

Defined in: uniform.ts/src/newer/next/storage/Storage.ts:474

Register a pending operation

#### Type Parameters

##### T

`T` = `any`

#### Parameters

##### operation

###### data

`T`

###### metadata?

`Record`\<`string`, `any`\>

###### type

`string`

#### Returns

`Promise`\<`string`\>
