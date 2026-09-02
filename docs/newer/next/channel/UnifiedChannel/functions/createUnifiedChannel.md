[**@fest-lib/uniform v0.1.20**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/channel/UnifiedChannel](../README.md) / createUnifiedChannel

# Function: createUnifiedChannel()

```ts
function createUnifiedChannel(config): UnifiedChannel;
```

Defined in: src/newer/next/channel/UnifiedChannel.ts:1082

Create a unified channel

## Parameters

### config

  \| `string`
  \| [`UnifiedChannelConfig`](../interfaces/UnifiedChannelConfig.md)

## Returns

[`UnifiedChannel`](../classes/UnifiedChannel.md)

## Example

```ts
// In worker
const channel = createUnifiedChannel("worker");
channel.expose("calc", { add: (a, b) => a + b });

// In host
const channel = createUnifiedChannel("host");
channel.connect(worker);
const calc = channel.proxy("worker", ["calc"]);
await calc.add(2, 3); // 5
```
