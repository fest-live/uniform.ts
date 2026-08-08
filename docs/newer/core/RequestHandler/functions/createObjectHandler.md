[**@fest-lib/uniform v0.1.3**](../../../../README.md)

***

[@fest-lib/uniform](../../../../README.md) / [newer/core/RequestHandler](../README.md) / createObjectHandler

# Function: createObjectHandler()

```ts
function createObjectHandler<T>(target, reflect?): (action, path, args) => Promise<any>;
```

Defined in: src/newer/core/RequestHandler.ts:375

Create a simple expose handler for an object

Unlike the full executeAction, this works directly on the target
without DataBase integration. Used by Proxy.ts createExposeHandler.

## Type Parameters

### T

`T` *extends* `object`

## Parameters

### target

`T`

Object to expose

### reflect?

[`ReflectLike`](../interfaces/ReflectLike.md) = `defaultReflect`

Optional custom Reflect implementation

## Returns

(`action`, `path`, `args`) => `Promise`\<`any`\>
