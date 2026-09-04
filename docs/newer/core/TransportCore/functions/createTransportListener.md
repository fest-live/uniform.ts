[**@fest-lib/uniform v0.1.26**](../../../../README.md)

***

[@fest-lib/uniform](../../../../README.md) / [newer/core/TransportCore](../README.md) / createTransportListener

# Function: createTransportListener()

```ts
function createTransportListener(
   transport, 
   onMessage, 
   onError?, 
   onClose?, 
   options?): () => void;
```

Defined in: uniform.ts/src/newer/core/TransportCore.ts:282

Create listener setup for any transport type
Returns cleanup function

## Parameters

### transport

[`TransportTarget`](../type-aliases/TransportTarget.md)

### onMessage

(`data`) => `void`

### onError?

(`err`) => `void`

### onClose?

() => `void`

### options?

#### portName?

`string`

#### socketEvents?

`string`[]

#### tabId?

`number`

## Returns

() => `void`
