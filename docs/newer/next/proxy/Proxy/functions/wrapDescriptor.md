[**@fest-lib/uniform v0.1.17**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/proxy/Proxy](../README.md) / wrapDescriptor

# Function: wrapDescriptor()

```ts
function wrapDescriptor<T>(
   descriptor, 
   invoker, 
targetChannel?): T | RemoteProxy<T>;
```

Defined in: src/newer/next/proxy/Proxy.ts:325

Create proxy from descriptor

Wraps a WReflectDescriptor into a usable proxy object.

## Type Parameters

### T

`T` = `any`

## Parameters

### descriptor

[`WReflectDescriptor`](../../../types/Interface/interfaces/WReflectDescriptor.md)

Remote object descriptor

### invoker

[`ProxyInvoker`](../type-aliases/ProxyInvoker.md)

Function to invoke remote operations

### targetChannel?

`string`

Override channel from descriptor

## Returns

`T` \| [`RemoteProxy`](../type-aliases/RemoteProxy.md)\<`T`\>
