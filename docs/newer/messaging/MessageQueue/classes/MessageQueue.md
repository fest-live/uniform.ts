[**@fest-lib/uniform v0.1.20**](../../../../README.md)

***

[@fest-lib/uniform](../../../../README.md) / [newer/messaging/MessageQueue](../README.md) / MessageQueue

# Class: MessageQueue

Defined in: src/newer/messaging/MessageQueue.ts:46

## Constructors

### Constructor

```ts
new MessageQueue(options?): MessageQueue;
```

Defined in: src/newer/messaging/MessageQueue.ts:51

#### Parameters

##### options?

[`MessageQueueOptions`](../interfaces/MessageQueueOptions.md) = `{}`

#### Returns

`MessageQueue`

## Methods

### clearAll()

```ts
clearAll(): Promise<void>;
```

Defined in: src/newer/messaging/MessageQueue.ts:249

Clear all messages

#### Returns

`Promise`\<`void`\>

***

### clearExpiredMessages()

```ts
clearExpiredMessages(): Promise<number>;
```

Defined in: src/newer/messaging/MessageQueue.ts:223

Clear all expired messages

#### Returns

`Promise`\<`number`\>

***

### getQueuedMessages()

```ts
getQueuedMessages<T>(destination?): Promise<QueuedMessage<T>[]>;
```

Defined in: src/newer/messaging/MessageQueue.ts:163

Get all queued messages

#### Type Parameters

##### T

`T` = `unknown`

#### Parameters

##### destination?

`string`

#### Returns

`Promise`\<[`QueuedMessage`](../interfaces/QueuedMessage.md)\<`T`\>[]\>

***

### getStats()

```ts
getStats(): Promise<{
  byDestination: Record<string, number>;
  byPriority: Record<MessagePriority, number>;
  expired: number;
  total: number;
}>;
```

Defined in: src/newer/messaging/MessageQueue.ts:266

Get queue statistics

#### Returns

`Promise`\<\{
  `byDestination`: `Record`\<`string`, `number`\>;
  `byPriority`: `Record`\<[`MessagePriority`](../type-aliases/MessagePriority.md), `number`\>;
  `expired`: `number`;
  `total`: `number`;
\}\>

***

### queueMessage()

```ts
queueMessage<T>(
   type, 
   data, 
options?): Promise<string>;
```

Defined in: src/newer/messaging/MessageQueue.ts:126

Queue a message for later processing

#### Type Parameters

##### T

`T`

#### Parameters

##### type

`string`

##### data

`T`

##### options?

[`QueueMessageOptions`](../interfaces/QueueMessageOptions.md) = `{}`

#### Returns

`Promise`\<`string`\>

***

### removeMessage()

```ts
removeMessage(messageId): Promise<void>;
```

Defined in: src/newer/messaging/MessageQueue.ts:191

Remove a message from the queue

#### Parameters

##### messageId

`string`

#### Returns

`Promise`\<`void`\>

***

### updateMessageRetry()

```ts
updateMessageRetry(messageId, retryCount): Promise<void>;
```

Defined in: src/newer/messaging/MessageQueue.ts:207

Update message retry count

#### Parameters

##### messageId

`string`

##### retryCount

`number`

#### Returns

`Promise`\<`void`\>

***

### isIndexedDBAvailable()

```ts
static isIndexedDBAvailable(): boolean;
```

Defined in: src/newer/messaging/MessageQueue.ts:406

Check if IndexedDB is available

#### Returns

`boolean`
