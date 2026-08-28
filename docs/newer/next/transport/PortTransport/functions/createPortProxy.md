[**@fest-lib/uniform v0.1.14**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/transport/PortTransport](../README.md) / createPortProxy

# Function: createPortProxy()

```ts
function createPortProxy<T>(transport, targetPath?): ProxyMethods<T>;
```

Defined in: src/newer/next/transport/PortTransport.ts:477

Create proxy for remote object over PortTransport

Uses unified Proxy module for consistent behavior.

## Type Parameters

### T

`T` *extends* `object`

## Parameters

### transport

[`PortTransport`](../classes/PortTransport.md)

### targetPath?

`string`[] = `[]`

## Returns

[`ProxyMethods`](../../../proxy/Proxy/type-aliases/ProxyMethods.md)\<`T`\>
