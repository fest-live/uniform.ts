[**@fest-lib/uniform v0.1.16**](../../README.md)

***

[@fest-lib/uniform](../../README.md) / [newer](../README.md) / createChannelsInContext

# Function: createChannelsInContext()

```ts
function createChannelsInContext(channelNames, contextOptions?): object;
```

Defined in: src/newer/next/channel/ChannelContext.ts:1300

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
