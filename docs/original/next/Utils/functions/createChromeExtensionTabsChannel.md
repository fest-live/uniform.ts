[**@fest-lib/uniform v0.1.16**](../../../../README.md)

***

[@fest-lib/uniform](../../../../README.md) / [original/next/Utils](../README.md) / createChromeExtensionTabsChannel

# Function: createChromeExtensionTabsChannel()

```ts
function createChromeExtensionTabsChannel(channelName, options?): WorkerChannel;
```

Defined in: src/original/next/Utils.ts:64

Create a chrome extension tabs channel (unified)
Acts like BroadcastChannel but uses chrome.tabs messaging to communicate with content scripts
Supports both broadcast and current-tab modes

## Parameters

### channelName

`string`

### options?

#### mode?

`"broadcast"` \| `"current-tab"`

#### tabFilter?

(`tab`) => `boolean`

#### tabIdGetter?

() => `number` \| `Promise`\<`number`\>

## Returns

[`WorkerChannel`](../../Queued/interfaces/WorkerChannel.md)
