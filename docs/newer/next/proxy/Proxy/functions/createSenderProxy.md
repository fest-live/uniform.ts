[**@fest-lib/uniform v0.1.10**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/proxy/Proxy](../README.md) / createSenderProxy

# Function: createSenderProxy()

```ts
function createSenderProxy<T>(sender, basePath?): ProxyMethods<T>;
```

Defined in: src/newer/next/proxy/Proxy.ts:423

Create a proxy for remote object over a sender (MessagePort, etc.)

## Type Parameters

### T

`T` *extends* `object`

## Parameters

### sender

[`ProxySender`](../interfaces/ProxySender.md)

Object with request() method

### basePath?

`string`[] = `[]`

Base path for property access

## Returns

[`ProxyMethods`](../type-aliases/ProxyMethods.md)\<`T`\>
