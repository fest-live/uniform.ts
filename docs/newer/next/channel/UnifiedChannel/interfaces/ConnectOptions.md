[**@fest-lib/uniform v0.1.15**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/channel/UnifiedChannel](../README.md) / ConnectOptions

# Interface: ConnectOptions

Defined in: src/newer/next/channel/UnifiedChannel.ts:85

Transport connection options

## Properties

### autoStart?

```ts
optional autoStart?: boolean;
```

Defined in: src/newer/next/channel/UnifiedChannel.ts:97

Auto-start MessagePort

***

### externalId?

```ts
optional externalId?: string;
```

Defined in: src/newer/next/channel/UnifiedChannel.ts:93

External extension id for chrome-external transport

***

### onMessage?

```ts
optional onMessage?: (handler) => () => void;
```

Defined in: src/newer/next/channel/UnifiedChannel.ts:95

Custom message handler

#### Parameters

##### handler

(`msg`) => `void`

#### Returns

() => `void`

***

### portName?

```ts
optional portName?: string;
```

Defined in: src/newer/next/channel/UnifiedChannel.ts:91

Chrome port name for chrome-port transport

***

### tabId?

```ts
optional tabId?: number;
```

Defined in: src/newer/next/channel/UnifiedChannel.ts:89

Chrome tab id for chrome-tabs transport

***

### targetChannel?

```ts
optional targetChannel?: string;
```

Defined in: src/newer/next/channel/UnifiedChannel.ts:87

Target channel name for requests
