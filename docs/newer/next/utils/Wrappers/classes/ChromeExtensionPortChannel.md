[**@fest-lib/uniform v0.1.24**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/utils/Wrappers](../README.md) / ChromeExtensionPortChannel

# Class: ChromeExtensionPortChannel

Defined in: uniform.ts/src/newer/next/utils/Wrappers.ts:299

Chrome Extension Port Channel
Adapts chrome.runtime.Port into a BroadcastChannel-like interface.

## Constructors

### Constructor

```ts
new ChromeExtensionPortChannel(port, channelName): ChromeExtensionPortChannel;
```

Defined in: uniform.ts/src/newer/next/utils/Wrappers.ts:302

#### Parameters

##### port

`Port`

##### channelName

`string`

#### Returns

`ChromeExtensionPortChannel`

## Methods

### addEventListener()

```ts
addEventListener(type, listener): void;
```

Defined in: uniform.ts/src/newer/next/utils/Wrappers.ts:316

#### Parameters

##### type

`"message"`

##### listener

(`event`) => `void`

#### Returns

`void`

***

### close()

```ts
close(): void;
```

Defined in: uniform.ts/src/newer/next/utils/Wrappers.ts:334

#### Returns

`void`

***

### postMessage()

```ts
postMessage(message): void;
```

Defined in: uniform.ts/src/newer/next/utils/Wrappers.ts:326

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

Defined in: uniform.ts/src/newer/next/utils/Wrappers.ts:321

#### Parameters

##### type

`"message"`

##### listener

(`event`) => `void`

#### Returns

`void`
