[**@fest-lib/uniform v0.1.3**](../../README.md)

***

[@fest-lib/uniform](../../README.md) / [original](../README.md) / sync

# Function: sync()

```ts
function sync(
   channel, 
   options?, 
broadcast?): Promise<any>;
```

Defined in: src/original/index.ts:25

Ensure the remote channel is created and ready to accept requests.

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

## Returns

`Promise`\<`any`\>
