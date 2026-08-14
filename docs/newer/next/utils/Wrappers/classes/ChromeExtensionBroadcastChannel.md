[**@fest-lib/uniform v0.1.11**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/utils/Wrappers](../README.md) / ChromeExtensionBroadcastChannel

# Class: ChromeExtensionBroadcastChannel

Defined in: src/newer/next/utils/Wrappers.ts:46

Chrome Extension Broadcast-like Channel
Acts like a BroadcastChannel but uses chrome.runtime messaging

## Constructors

### Constructor

```ts
new ChromeExtensionBroadcastChannel(channelName): ChromeExtensionBroadcastChannel;
```

Defined in: src/newer/next/utils/Wrappers.ts:49

#### Parameters

##### channelName

`string`

#### Returns

`ChromeExtensionBroadcastChannel`

## Methods

### addEventListener()

```ts
addEventListener(type, listener): void;
```

Defined in: src/newer/next/utils/Wrappers.ts:53

#### Parameters

##### type

`"message"`

##### listener

(`event`, `sender`, `sendResponse`) => `void` \| `Promise`\<`void`\>

#### Returns

`void`

***

### close()

```ts
close(): void;
```

Defined in: src/newer/next/utils/Wrappers.ts:81

#### Returns

`void`

***

### postMessage()

```ts
postMessage(message): void;
```

Defined in: src/newer/next/utils/Wrappers.ts:70

#### Parameters

##### message

`any`

#### Returns

`void`

***

### removeEventListener()

```ts
removeEventListener(type, listener): void;
```

Defined in: src/newer/next/utils/Wrappers.ts:64

#### Parameters

##### type

`"message"`

##### listener

(`event`, `sender`, `sendResponse`) => `void` \| `Promise`\<`void`\>

#### Returns

`void`
