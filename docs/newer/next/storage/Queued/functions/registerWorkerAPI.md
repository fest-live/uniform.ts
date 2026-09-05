[**@fest-lib/uniform v0.1.29**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/storage/Queued](../README.md) / registerWorkerAPI

# Function: registerWorkerAPI()

```ts
function registerWorkerAPI(api, channelName?): 
  | ChannelHandler
  | null;
```

Defined in: uniform.ts/src/newer/next/storage/Queued.ts:218

Simplified worker registration for common patterns

## Parameters

### api

`Record`\<`string`, `Function`\>

### channelName?

`string` = `"worker"`

## Returns

  \| [`ChannelHandler`](../../../channel/Channels/classes/ChannelHandler.md)
  \| `null`
