[**@fest-lib/uniform v0.1.25**](../../README.md)

***

[@fest-lib/uniform](../../README.md) / [original](../README.md) / importModuleInChannel

# Function: importModuleInChannel()

```ts
function importModuleInChannel(
   channel, 
   url, 
   options?, 
broadcast?): Promise<any>;
```

Defined in: uniform.ts/src/original/index.ts:30

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
