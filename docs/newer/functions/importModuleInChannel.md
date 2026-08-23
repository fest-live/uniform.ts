[**@fest-lib/uniform v0.1.13**](../../README.md)

***

[@fest-lib/uniform](../../README.md) / [newer](../README.md) / importModuleInChannel

# Function: importModuleInChannel()

```ts
function importModuleInChannel(
   channel, 
   url, 
   options?, 
broadcast?): Promise<any>;
```

Defined in: src/newer/index.ts:465

Import a module in a remote channel

## Parameters

### channel

`string`

### url

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
