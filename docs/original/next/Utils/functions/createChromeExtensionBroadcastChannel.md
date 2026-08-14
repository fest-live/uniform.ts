[**@fest-lib/uniform v0.1.10**](../../../../README.md)

***

[@fest-lib/uniform](../../../../README.md) / [original/next/Utils](../README.md) / createChromeExtensionBroadcastChannel

# Function: createChromeExtensionBroadcastChannel()

```ts
function createChromeExtensionBroadcastChannel(channelName): WorkerChannel;
```

Defined in: src/original/next/Utils.ts:48

Create a chrome extension broadcast-like channel
Acts like BroadcastChannel but uses chrome.runtime messaging

## Parameters

### channelName

`string`

## Returns

[`WorkerChannel`](../../Queued/interfaces/WorkerChannel.md)
