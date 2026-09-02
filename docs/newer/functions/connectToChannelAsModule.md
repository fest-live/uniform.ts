[**@fest-lib/uniform v0.1.20**](../../README.md)

***

[@fest-lib/uniform](../../README.md) / [newer](../README.md) / connectToChannelAsModule

# Function: connectToChannelAsModule()

```ts
function connectToChannelAsModule(
   channel, 
   options?, 
   broadcast?, 
hostChannel?): Promise<any>;
```

Defined in: src/newer/index.ts:486

Connect to a channel as a module

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
