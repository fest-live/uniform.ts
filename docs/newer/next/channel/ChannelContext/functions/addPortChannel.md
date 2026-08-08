[**@fest-lib/uniform v0.1.4**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/channel/ChannelContext](../README.md) / addPortChannel

# Function: addPortChannel()

```ts
function addPortChannel(
   name, 
   port, 
options?): Promise<ChannelEndpoint>;
```

Defined in: src/newer/next/channel/ChannelContext.ts:1356

Add a MessagePort channel to the default global context

## Parameters

### name

`string`

### port

`MessagePort`

### options?

[`ConnectionOptions`](../../../types/Interface/interfaces/ConnectionOptions.md) = `{}`

## Returns

`Promise`\<[`ChannelEndpoint`](../interfaces/ChannelEndpoint.md)\>

## Example

```ts
const endpoint = await addPortChannel("iframe-comm", port);
```
