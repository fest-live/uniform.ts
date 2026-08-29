[**@fest-lib/uniform v0.1.15**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/utils/Wrappers](../README.md) / ChromeExtensionTabsChannel

# Class: ChromeExtensionTabsChannel

Defined in: src/newer/next/utils/Wrappers.ts:94

Unified Chrome Extension Tabs Channel
Acts like a BroadcastChannel but uses chrome.tabs messaging to communicate with content scripts
Supports both broadcast-to-multiple-tabs and current-tab-only targeting

## Constructors

### Constructor

```ts
new ChromeExtensionTabsChannel(channelName, options?): ChromeExtensionTabsChannel;
```

Defined in: src/newer/next/utils/Wrappers.ts:102

#### Parameters

##### channelName

`string`

##### options?

###### mode?

`"broadcast"` \| `"current-tab"`

###### tabFilter?

(`tab`) => `boolean`

###### tabIdGetter?

() => `number` \| `Promise`\<`number`\>

#### Returns

`ChromeExtensionTabsChannel`

## Methods

### addEventListener()

```ts
addEventListener(type, listener): void;
```

Defined in: src/newer/next/utils/Wrappers.ts:121

#### Parameters

##### type

`"message"`

##### listener

`CrxListener`

#### Returns

`void`

***

### broadcastToTabs()

```ts
broadcastToTabs(message, options?): Promise<any[]>;
```

Defined in: src/newer/next/utils/Wrappers.ts:210

Broadcast message to all matching tabs (only works in broadcast mode)

#### Parameters

##### message

`any`

##### options?

###### allWindows?

`boolean`

###### tabFilter?

(`tab`) => `boolean`

#### Returns

`Promise`\<`any`[]\>

***

### close()

```ts
close(): void;
```

Defined in: src/newer/next/utils/Wrappers.ts:286

#### Returns

`void`

***

### getCurrentTabId()

```ts
getCurrentTabId(): Promise<number>;
```

Defined in: src/newer/next/utils/Wrappers.ts:279

Get current tab ID (convenience method)

#### Returns

`Promise`\<`number`\>

***

### postMessage()

```ts
postMessage(message): Promise<void>;
```

Defined in: src/newer/next/utils/Wrappers.ts:263

Send message via chrome runtime (for service worker communication)

#### Parameters

##### message

`any`

#### Returns

`Promise`\<`void`\>

***

### removeEventListener()

```ts
removeEventListener(type, listener): void;
```

Defined in: src/newer/next/utils/Wrappers.ts:159

#### Parameters

##### type

`"message"`

##### listener

`CrxListener`

#### Returns

`void`

***

### sendToActiveTab()

```ts
sendToActiveTab(message): Promise<any>;
```

Defined in: src/newer/next/utils/Wrappers.ts:192

Send message to active/current tab

#### Parameters

##### message

`any`

#### Returns

`Promise`\<`any`\>

***

### sendToTab()

```ts
sendToTab(tabId, message): Promise<any>;
```

Defined in: src/newer/next/utils/Wrappers.ts:171

Send message to specific tab

#### Parameters

##### tabId

`number`

##### message

`any`

#### Returns

`Promise`\<`any`\>
