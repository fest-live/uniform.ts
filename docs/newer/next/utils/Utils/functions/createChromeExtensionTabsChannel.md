[**@fest-lib/uniform v0.1.28**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/utils/Utils](../README.md) / createChromeExtensionTabsChannel

# Function: createChromeExtensionTabsChannel()

```ts
function createChromeExtensionTabsChannel(channelName, options?): WorkerChannel;
```

Defined in: uniform.ts/src/newer/next/utils/Utils.ts:65

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

[`WorkerChannel`](../../../storage/Queued/interfaces/WorkerChannel.md)
