[**@fest-lib/uniform v0.1.23**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/utils/Utils](../README.md) / createChromeExtensionTabsMessagingChannel

# Function: createChromeExtensionTabsMessagingChannel()

```ts
function createChromeExtensionTabsMessagingChannel(channelName, options?): WorkerChannel;
```

Defined in: uniform.ts/src/newer/next/utils/Utils.ts:83

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

[`WorkerChannel`](../../../storage/Queued/interfaces/WorkerChannel.md)
