[**@fest-lib/uniform v0.1.17**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/proxy/Proxy](../README.md) / makeRequestProxy

# ~~Variable: makeRequestProxy~~

```ts
const makeRequestProxy: <T>(descriptor, invoker, targetChannel?) => T | RemoteProxy<T> = wrapDescriptor;
```

Defined in: src/newer/next/proxy/Proxy.ts:522

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

## Deprecated

Use wrapDescriptor
