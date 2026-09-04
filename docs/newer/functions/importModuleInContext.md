[**@fest-lib/uniform v0.1.27**](../../README.md)

***

[@fest-lib/uniform](../../README.md) / [newer](../README.md) / importModuleInContext

# Function: importModuleInContext()

```ts
function importModuleInContext(
   channelName, 
   url, 
   options?): Promise<{
  context: ChannelContext;
  module: any;
}>;
```

Defined in: uniform.ts/src/newer/next/channel/ChannelContext.ts:1315

Quick helper: Import module in a new context's channel

## Parameters

### channelName

`string`

### url

`string`

### options?

#### channelOptions?

[`ConnectionOptions`](../next/types/Interface/interfaces/ConnectionOptions.md)

#### contextOptions?

[`ChannelContextOptions`](../next/channel/ChannelContext/interfaces/ChannelContextOptions.md)

#### importOptions?

`any`

## Returns

`Promise`\<\{
  `context`: [`ChannelContext`](../next/channel/ChannelContext/classes/ChannelContext.md);
  `module`: `any`;
\}\>

## Example

```ts
const { context, module } = await importModuleInContext("myChannel", "./worker-module.ts");
```
