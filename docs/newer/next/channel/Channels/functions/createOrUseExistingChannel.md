[**@fest-lib/uniform v0.1.17**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/channel/Channels](../README.md) / createOrUseExistingChannel

# ~~Function: createOrUseExistingChannel()~~

```ts
function createOrUseExistingChannel(
   channel, 
   options?, 
   broadcast?): 
  | ChannelHandler
  | Promise<RemoteChannelHelper>
  | null;
```

Defined in: src/newer/next/channel/Channels.ts:141

## Parameters

### channel

`string`

### options?

`any` = `{}`

### broadcast?

`Worker` \| `MessagePort` \| `BroadcastChannel` \| `null`

## Returns

  \| [`ChannelHandler`](../classes/ChannelHandler.md)
  \| `Promise`\<[`RemoteChannelHelper`](../classes/RemoteChannelHelper.md)\>
  \| `null`

## Deprecated

Use UnifiedChannel.attach() instead
