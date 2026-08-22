[**@fest-lib/uniform v0.1.12**](../../README.md)

***

[@fest-lib/uniform](../../README.md) / [newer](../README.md) / sync

# Function: sync()

```ts
function sync(
   channel, 
   options?, 
   broadcast?): Promise<
  | ChannelHandler
  | RemoteChannelHelper
| null>;
```

Defined in: src/newer/index.ts:461

Sync with a remote channel

## Parameters

### channel

`string`

### options?

`any` = `{}`

### broadcast?

  \| `Worker`
  \| `MessagePort`
  \| `BroadcastChannel`
  \| [`BroadcastLike`](../interfaces/BroadcastLike.md)
  \| `null`

## Returns

`Promise`\<
  \| [`ChannelHandler`](../next/channel/Channels/classes/ChannelHandler.md)
  \| [`RemoteChannelHelper`](../next/channel/Channels/classes/RemoteChannelHelper.md)
  \| `null`\>
