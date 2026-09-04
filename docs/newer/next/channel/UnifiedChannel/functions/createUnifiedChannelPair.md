[**@fest-lib/uniform v0.1.28**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/channel/UnifiedChannel](../README.md) / createUnifiedChannelPair

# Function: createUnifiedChannelPair()

```ts
function createUnifiedChannelPair(
   name1, 
   name2, 
   options?): object;
```

Defined in: uniform.ts/src/newer/next/channel/UnifiedChannel.ts:1100

Create a channel pair for bidirectional communication

## Parameters

### name1

`string`

### name2

`string`

### options?

`Partial`\<[`UnifiedChannelConfig`](../interfaces/UnifiedChannelConfig.md)\>

## Returns

`object`

### channel1

```ts
channel1: UnifiedChannel;
```

### channel2

```ts
channel2: UnifiedChannel;
```

### messageChannel

```ts
messageChannel: MessageChannel;
```
