[**@fest-lib/uniform v0.1.11**](../../../../README.md)

***

[@fest-lib/uniform](../../../../README.md) / [newer/messaging/UnifiedMessaging](../README.md) / UnifiedMessagingManager

# Class: UnifiedMessagingManager

Defined in: src/newer/messaging/UnifiedMessaging.ts:216

## Constructors

### Constructor

```ts
new UnifiedMessagingManager(config?): UnifiedMessagingManager;
```

Defined in: src/newer/messaging/UnifiedMessaging.ts:232

#### Parameters

##### config?

[`UnifiedMessagingConfig`](../interfaces/UnifiedMessagingConfig.md) = `{}`

#### Returns

`UnifiedMessagingManager`

## Methods

### destroy()

```ts
destroy(): void;
```

Defined in: src/newer/messaging/UnifiedMessaging.ts:720

Clean up resources

#### Returns

`void`

***

### enqueuePendingMessage()

```ts
enqueuePendingMessage(destination, message): void;
```

Defined in: src/newer/messaging/UnifiedMessaging.ts:607

Explicitly enqueue a pending message

#### Parameters

##### destination

`string`

##### message

[`UnifiedMessage`](../interfaces/UnifiedMessage.md)

#### Returns

`void`

***

### getBroadcastChannel()

```ts
getBroadcastChannel(channelName): BroadcastChannel;
```

Defined in: src/newer/messaging/UnifiedMessaging.ts:435

Create or get a broadcast channel

#### Parameters

##### channelName

`string`

#### Returns

`BroadcastChannel`

***

### getExecutionContext()

```ts
getExecutionContext(): string;
```

Defined in: src/newer/messaging/UnifiedMessaging.ts:713

Get execution context

#### Returns

`string`

***

### getWorkerChannel()

```ts
getWorkerChannel(viewHash, workerName): 
  | OptimizedWorkerChannel
  | null;
```

Defined in: src/newer/messaging/UnifiedMessaging.ts:424

Get a worker channel for a specific view and worker

#### Parameters

##### viewHash

`string`

##### workerName

`string`

#### Returns

  \| [`OptimizedWorkerChannel`](../../../next/storage/Queued/classes/OptimizedWorkerChannel.md)
  \| `null`

***

### hasPendingMessages()

```ts
hasPendingMessages(destination): boolean;
```

Defined in: src/newer/messaging/UnifiedMessaging.ts:600

Check if there are pending messages for a destination

#### Parameters

##### destination

`string`

#### Returns

`boolean`

***

### initializeComponent()

```ts
initializeComponent(componentId): UnifiedMessage<unknown>[];
```

Defined in: src/newer/messaging/UnifiedMessaging.ts:586

Initialize a component and return any pending messages

#### Parameters

##### componentId

`string`

#### Returns

[`UnifiedMessage`](../interfaces/UnifiedMessage.md)\<`unknown`\>[]

***

### initializeViewChannels()

```ts
initializeViewChannels(viewHash): Promise<void>;
```

Defined in: src/newer/messaging/UnifiedMessaging.ts:388

Initialize channels when a view becomes active

#### Parameters

##### viewHash

`string`

#### Returns

`Promise`\<`void`\>

***

### processMessage()

```ts
processMessage(message): Promise<void>;
```

Defined in: src/newer/messaging/UnifiedMessaging.ts:297

Process a message through registered handlers

#### Parameters

##### message

  \| [`UnifiedMessage`](../interfaces/UnifiedMessage.md)\<`unknown`\>
  \| [`ProtocolMessage`](../type-aliases/ProtocolMessage.md)\<`unknown`\>

#### Returns

`Promise`\<`void`\>

***

### processQueuedMessages()

```ts
processQueuedMessages(destination?): Promise<void>;
```

Defined in: src/newer/messaging/UnifiedMessaging.ts:531

Process queued messages for a destination

#### Parameters

##### destination?

`string`

#### Returns

`Promise`\<`void`\>

***

### processThroughPipeline()

```ts
processThroughPipeline(pipelineName, message): Promise<UnifiedMessage<unknown>>;
```

Defined in: src/newer/messaging/UnifiedMessaging.ts:485

Process a message through a pipeline

#### Parameters

##### pipelineName

`string`

##### message

[`UnifiedMessage`](../interfaces/UnifiedMessage.md)

#### Returns

`Promise`\<[`UnifiedMessage`](../interfaces/UnifiedMessage.md)\<`unknown`\>\>

***

### registerComponent()

```ts
registerComponent(componentId, destination): void;
```

Defined in: src/newer/messaging/UnifiedMessaging.ts:573

Register a component with a destination

#### Parameters

##### componentId

`string`

##### destination

`string`

#### Returns

`void`

***

### registerHandler()

```ts
registerHandler(destination, handler): void;
```

Defined in: src/newer/messaging/UnifiedMessaging.ts:248

Register a message handler for a specific destination

#### Parameters

##### destination

`string`

##### handler

[`MessageHandler`](../interfaces/MessageHandler.md)

#### Returns

`void`

***

### registerPipeline()

```ts
registerPipeline(config): void;
```

Defined in: src/newer/messaging/UnifiedMessaging.ts:478

Register a message processing pipeline

#### Parameters

##### config

[`PipelineConfig`](../interfaces/PipelineConfig.md)

#### Returns

`void`

***

### registerViewChannels()

```ts
registerViewChannels(viewHash, configs): void;
```

Defined in: src/newer/messaging/UnifiedMessaging.ts:358

Register worker channels for a specific view

#### Parameters

##### viewHash

`string`

##### configs

[`WorkerChannelConfig`](../interfaces/WorkerChannelConfig.md)[]

#### Returns

`void`

***

### sendMessage()

```ts
sendMessage(message): Promise<boolean>;
```

Defined in: src/newer/messaging/UnifiedMessaging.ts:271

Send a message to a destination

#### Parameters

##### message

`Partial`\<[`UnifiedMessage`](../interfaces/UnifiedMessage.md)\<`unknown`\>\> & `object`

#### Returns

`Promise`\<`boolean`\>

***

### setChannelMappings()

```ts
setChannelMappings(mappings): void;
```

Defined in: src/newer/messaging/UnifiedMessaging.ts:620

Set channel mappings

#### Parameters

##### mappings

`Record`\<`string`, `string`\>

#### Returns

`void`

***

### unregisterHandler()

```ts
unregisterHandler(destination, handler): void;
```

Defined in: src/newer/messaging/UnifiedMessaging.ts:258

Unregister a message handler

#### Parameters

##### destination

`string`

##### handler

[`MessageHandler`](../interfaces/MessageHandler.md)

#### Returns

`void`
