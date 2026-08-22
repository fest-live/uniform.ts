[**@fest-lib/uniform v0.1.12**](../../README.md)

***

[@fest-lib/uniform](../../README.md) / [newer](../README.md) / importIsolatedModule

# Variable: importIsolatedModule

```ts
const importIsolatedModule: (channelName, url, options) => Promise<{
  context: ChannelContext;
  module: any;
}> = importModuleInContext;
```

Defined in: src/newer/index.ts:483

Import a module with its own isolated context

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
