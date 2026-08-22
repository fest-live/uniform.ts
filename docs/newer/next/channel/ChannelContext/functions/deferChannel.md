[**@fest-lib/uniform v0.1.12**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/channel/ChannelContext](../README.md) / deferChannel

# Function: deferChannel()

```ts
function deferChannel(name, initFn): void;
```

Defined in: src/newer/next/channel/ChannelContext.ts:1403

Register a deferred channel in the default context

## Parameters

### name

`string`

### initFn

() => `Promise`\<[`ChannelEndpoint`](../interfaces/ChannelEndpoint.md)\>

## Returns

`void`

## Example

```ts
deferChannel("heavy-worker", async () => {
    const worker = new Worker("./heavy.js");
    return getDefaultContext().addWorker("heavy-worker", worker);
});

// Later, when needed:
const endpoint = await initDeferredChannel("heavy-worker");
```
