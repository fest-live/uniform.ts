[**@fest-lib/uniform v0.1.29**](../../../../README.md)

***

[@fest-lib/uniform](../../../../README.md) / [original/next/Utils](../README.md) / createQueuedOptimizedWorkerChannel

# Function: createQueuedOptimizedWorkerChannel()

```ts
function createQueuedOptimizedWorkerChannel(
   config, 
   options?, 
   onChannelReady?): OptimizedWorkerChannel;
```

Defined in: uniform.ts/src/original/next/Utils.ts:219

Create an optimized worker channel with queuing support

## Parameters

### config

[`WorkerConfig`](../../Queued/interfaces/WorkerConfig.md)

### options?

[`ProtocolOptions`](../../Queued/interfaces/ProtocolOptions.md)

### onChannelReady?

(`channel`) => `void`

## Returns

[`OptimizedWorkerChannel`](../../Queued/classes/OptimizedWorkerChannel.md)
