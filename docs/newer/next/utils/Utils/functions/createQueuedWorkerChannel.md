[**@fest-lib/uniform v0.1.25**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/utils/Utils](../README.md) / createQueuedWorkerChannel

# Function: createQueuedWorkerChannel()

```ts
function createQueuedWorkerChannel(config, onChannelReady?): QueuedWorkerChannel;
```

Defined in: uniform.ts/src/newer/next/utils/Utils.ts:105

Create a queued worker channel that waits for connection

## Parameters

### config

[`WorkerConfig`](../../../storage/Queued/interfaces/WorkerConfig.md)

### onChannelReady?

(`channel`) => `void`

## Returns

[`QueuedWorkerChannel`](../../../storage/Queued/classes/QueuedWorkerChannel.md)
