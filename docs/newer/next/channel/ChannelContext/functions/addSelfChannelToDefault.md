[**@fest-lib/uniform v0.1.28**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/channel/ChannelContext](../README.md) / addSelfChannelToDefault

# Function: addSelfChannelToDefault()

```ts
function addSelfChannelToDefault(name, options?): ChannelEndpoint;
```

Defined in: uniform.ts/src/newer/next/channel/ChannelContext.ts:1384

Add a self channel to the default global context

## Parameters

### name

`string`

### options?

[`ConnectionOptions`](../../../types/Interface/interfaces/ConnectionOptions.md) = `{}`

## Returns

[`ChannelEndpoint`](../interfaces/ChannelEndpoint.md)

## Example

```ts
const endpoint = addSelfChannelToDefault("local");
```
