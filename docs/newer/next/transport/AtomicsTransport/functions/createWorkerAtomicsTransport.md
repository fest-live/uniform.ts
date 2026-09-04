[**@fest-lib/uniform v0.1.28**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/transport/AtomicsTransport](../README.md) / createWorkerAtomicsTransport

# Function: createWorkerAtomicsTransport()

```ts
function createWorkerAtomicsTransport(
   channelName, 
   sendBuffer, 
   recvBuffer, 
   config?): AtomicsTransport;
```

Defined in: uniform.ts/src/newer/next/transport/AtomicsTransport.ts:442

Create worker-side atomics transport from buffers

## Parameters

### channelName

`string`

### sendBuffer

`SharedArrayBuffer`

### recvBuffer

`SharedArrayBuffer`

### config?

[`AtomicsTransportConfig`](../interfaces/AtomicsTransportConfig.md) = `{}`

## Returns

[`AtomicsTransport`](../classes/AtomicsTransport.md)
