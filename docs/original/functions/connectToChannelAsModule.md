[**@fest-lib/uniform v0.1.10**](../../README.md)

***

[@fest-lib/uniform](../../README.md) / [original](../README.md) / connectToChannelAsModule

# Function: connectToChannelAsModule()

```ts
function connectToChannelAsModule(
   channel, 
   options?, 
   broadcast?, 
hostChannel?): Promise<any>;
```

Defined in: src/original/index.ts:46

Connect to a uniform channel and expose it as a proxied module (reflect-based).

NOTE: This returns a proxy that dispatches calls over the selected transport.

## Parameters

### channel

`string`

### options?

`any` = `{}`

### broadcast?

  \| `Worker`
  \| `MessagePort`
  \| `BroadcastChannel`
  \| [`BroadcastLike`](../interfaces/BroadcastLike.md)
  \| `null`

### hostChannel?

`string` \| `null`

## Returns

`Promise`\<`any`\>
