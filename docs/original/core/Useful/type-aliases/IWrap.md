[**@fest-lib/uniform v0.1.28**](../../../../README.md)

***

[@fest-lib/uniform](../../../../README.md) / [original/core/Useful](../README.md) / IWrap

# Type Alias: IWrap\<T\>

```ts
type IWrap<T> = { [pT in keyof T]: MPromise<pT> | IWrap<pT> };
```

Defined in: uniform.ts/src/original/core/Useful.ts:9

## Type Parameters

### T

`T` *extends* `unknown`
