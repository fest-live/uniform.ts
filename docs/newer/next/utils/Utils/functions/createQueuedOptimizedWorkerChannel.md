[**@fest-lib/uniform v0.1.18**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/utils/Utils](../README.md) / createQueuedOptimizedWorkerChannel

# Function: createQueuedOptimizedWorkerChannel()

```ts
function createQueuedOptimizedWorkerChannel(
   config, 
   options?, 
   onChannelReady?): OptimizedWorkerChannel;
```

Defined in: src/newer/next/utils/Utils.ts:220

Create an optimized worker channel with queuing support

## Parameters

### config

[`WorkerConfig`](../../../storage/Queued/interfaces/WorkerConfig.md)

### options?

[`ProtocolOptions`](../../../storage/Queued/interfaces/ProtocolOptions.md)

### onChannelReady?

(`channel`) => `void`

## Returns

[`OptimizedWorkerChannel`](../../../storage/Queued/classes/OptimizedWorkerChannel.md)
