[**@fest-lib/uniform v0.1.29**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/transport/AtomicsTransport](../README.md) / createAtomicsChannelPair

# Function: createAtomicsChannelPair()

```ts
function createAtomicsChannelPair(channelName, config?): AtomicsChannelPair;
```

Defined in: uniform.ts/src/newer/next/transport/AtomicsTransport.ts:421

Create a bidirectional atomics channel for main<->worker communication

## Parameters

### channelName

`string`

### config?

[`AtomicsTransportConfig`](../interfaces/AtomicsTransportConfig.md) = `{}`

## Returns

[`AtomicsChannelPair`](../interfaces/AtomicsChannelPair.md)
