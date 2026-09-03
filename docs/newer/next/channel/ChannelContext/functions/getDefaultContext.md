[**@fest-lib/uniform v0.1.24**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/channel/ChannelContext](../README.md) / getDefaultContext

# Function: getDefaultContext()

```ts
function getDefaultContext(): ChannelContext;
```

Defined in: uniform.ts/src/newer/next/channel/ChannelContext.ts:1234

Get the default global context

This context is shared across the entire JavaScript context
and uses globalThis/self for communication by default.

## Returns

[`ChannelContext`](../classes/ChannelContext.md)
