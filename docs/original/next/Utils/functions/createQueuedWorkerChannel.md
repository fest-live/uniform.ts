[**@fest-lib/uniform v0.1.15**](../../../../README.md)

***

[@fest-lib/uniform](../../../../README.md) / [original/next/Utils](../README.md) / createQueuedWorkerChannel

# Function: createQueuedWorkerChannel()

```ts
function createQueuedWorkerChannel(config, onChannelReady?): QueuedWorkerChannel;
```

Defined in: src/original/next/Utils.ts:104

Create a queued worker channel that waits for connection

## Parameters

### config

[`WorkerConfig`](../../Queued/interfaces/WorkerConfig.md)

### onChannelReady?

(`channel`) => `void`

## Returns

[`QueuedWorkerChannel`](../../Queued/classes/QueuedWorkerChannel.md)
