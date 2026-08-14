[**@fest-lib/uniform v0.1.10**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/proxy/Proxy](../README.md) / createExposeHandler

# Function: createExposeHandler()

```ts
function createExposeHandler<T>(target, reflect?): ExposeHandler;
```

Defined in: src/newer/next/proxy/Proxy.ts:399

Create an expose handler for an object

Uses the unified RequestHandler for consistent behavior.

## Type Parameters

### T

`T` *extends* `object`

## Parameters

### target

`T`

Object to expose

### reflect?

[`ReflectLike`](../../../../core/RequestHandler/interfaces/ReflectLike.md)

Optional custom Reflect implementation

## Returns

[`ExposeHandler`](../type-aliases/ExposeHandler.md)

Handler function for incoming requests
