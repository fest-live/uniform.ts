[**@fest-lib/uniform v0.1.16**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/channel/ChannelContext](../README.md) / addWorkerChannel

# Function: addWorkerChannel()

```ts
function addWorkerChannel(
   name, 
   worker, 
options?): Promise<ChannelEndpoint>;
```

Defined in: src/newer/next/channel/ChannelContext.ts:1342

Add a worker channel to the default global context

## Parameters

### name

`string`

### worker

`string` \| `Worker` \| `URL`

### options?

[`ConnectionOptions`](../../../types/Interface/interfaces/ConnectionOptions.md) = `{}`

## Returns

`Promise`\<[`ChannelEndpoint`](../interfaces/ChannelEndpoint.md)\>

## Example

```ts
const endpoint = await addWorkerChannel("compute", new Worker("./worker.js"));
```
