[**@fest-lib/uniform v0.1.18**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/channel/ChannelContext](../README.md) / addBroadcastChannel

# Function: addBroadcastChannel()

```ts
function addBroadcastChannel(
   name, 
   broadcastName?, 
options?): Promise<ChannelEndpoint>;
```

Defined in: src/newer/next/channel/ChannelContext.ts:1370

Add a BroadcastChannel to the default global context

## Parameters

### name

`string`

### broadcastName?

`string`

### options?

[`ConnectionOptions`](../../../types/Interface/interfaces/ConnectionOptions.md) = `{}`

## Returns

`Promise`\<[`ChannelEndpoint`](../interfaces/ChannelEndpoint.md)\>

## Example

```ts
const endpoint = await addBroadcastChannel("cross-tab");
```
