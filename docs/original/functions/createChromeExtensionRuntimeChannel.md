[**@fest-lib/uniform v0.1.26**](../../README.md)

***

[@fest-lib/uniform](../../README.md) / [original](../README.md) / createChromeExtensionRuntimeChannel

# Function: createChromeExtensionRuntimeChannel()

```ts
function createChromeExtensionRuntimeChannel(channelName, options?): WorkerChannel;
```

Defined in: uniform.ts/src/original/index.ts:63

WorkerChannel adapter using chrome.runtime.sendMessage (CRX messaging).

This is a lightweight helper for extension contexts that want a `WorkerChannel`-like API
without relying on DedicatedWorkers or BroadcastChannel.

## Parameters

### channelName

`string`

### options?

`any` = `{}`

## Returns

[`WorkerChannel`](../next/Queued/interfaces/WorkerChannel.md)
