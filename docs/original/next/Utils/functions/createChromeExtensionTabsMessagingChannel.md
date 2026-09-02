[**@fest-lib/uniform v0.1.20**](../../../../README.md)

***

[@fest-lib/uniform](../../../../README.md) / [original/next/Utils](../README.md) / createChromeExtensionTabsMessagingChannel

# Function: createChromeExtensionTabsMessagingChannel()

```ts
function createChromeExtensionTabsMessagingChannel(channelName, options?): WorkerChannel;
```

Defined in: src/original/next/Utils.ts:82

Create a chrome extension tabs messaging channel (unified)
Uses chrome.tabs.sendMessage for tab-to-content-script communication
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
