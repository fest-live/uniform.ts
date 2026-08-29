[**@fest-lib/uniform v0.1.15**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/channel/ChannelContext](../README.md) / createDefaultChannelPair

# Function: createDefaultChannelPair()

```ts
function createDefaultChannelPair(
   name1, 
   name2, 
   options?): object;
```

Defined in: src/newer/next/channel/ChannelContext.ts:1430

Create a MessageChannel pair in the default context

## Parameters

### name1

`string`

### name2

`string`

### options?

[`ConnectionOptions`](../../../types/Interface/interfaces/ConnectionOptions.md) = `{}`

## Returns

`object`

### channel1

```ts
channel1: ChannelEndpoint;
```

### channel2

```ts
channel2: ChannelEndpoint;
```

### messageChannel

```ts
messageChannel: MessageChannel;
```

## Example

```ts
const { channel1, channel2 } = createDefaultChannelPair("ui", "worker-proxy");
```
