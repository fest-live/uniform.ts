[**@fest-lib/uniform v0.1.12**](../../README.md)

***

[@fest-lib/uniform](../../README.md) / [newer](../README.md) / createMultiChannel

# Variable: createMultiChannel

```ts
const createMultiChannel: (channelNames, contextOptions) => object = createChannelsInContext;
```

Defined in: src/newer/index.ts:480

Create multiple channels in a new context

Quick helper: Create channels in a new context

## Parameters

### channelNames

`string`[]

### contextOptions?

[`ChannelContextOptions`](../next/channel/ChannelContext/interfaces/ChannelContextOptions.md) = `{}`

## Returns

`object`

### channels

```ts
channels: Map<string, ChannelEndpoint>;
```

### context

```ts
context: ChannelContext;
```

## Example

```ts
const { context, channels } = createChannelsInContext(["ui", "data", "api"]);
```
