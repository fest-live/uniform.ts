[**@fest-lib/uniform v0.1.26**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/proxy/Proxy](../README.md) / ProxyMethods

# Type Alias: ProxyMethods\<T\>

```ts
type ProxyMethods<T> = { [K in keyof T]: T[K] extends (args: infer A) => infer R ? (args: A) => Promise<Awaited<R>> : Promise<T[K]> };
```

Defined in: uniform.ts/src/newer/next/proxy/Proxy.ts:59

Convert object methods to Promise-returning versions

## Type Parameters

### T

`T`
