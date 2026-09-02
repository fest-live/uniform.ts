[**@fest-lib/uniform v0.1.22**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/utils/Utils](../README.md) / createChromeExtensionBroadcastChannel

# Function: createChromeExtensionBroadcastChannel()

```ts
function createChromeExtensionBroadcastChannel(channelName): WorkerChannel;
```

Defined in: src/newer/next/utils/Utils.ts:49

Create a chrome extension broadcast-like channel
Acts like BroadcastChannel but uses chrome.runtime messaging

## Parameters

### channelName

`string`

## Returns

[`WorkerChannel`](../../../storage/Queued/interfaces/WorkerChannel.md)
