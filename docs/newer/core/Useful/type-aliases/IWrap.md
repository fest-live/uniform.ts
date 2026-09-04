[**@fest-lib/uniform v0.1.28**](../../../../README.md)

***

[@fest-lib/uniform](../../../../README.md) / [newer/core/Useful](../README.md) / IWrap

# Type Alias: IWrap\<T\>

```ts
type IWrap<T> = { [pT in keyof T]: MPromise<pT> | IWrap<pT> };
```

Defined in: uniform.ts/src/newer/core/Useful.ts:9

## Type Parameters

### T

`T` *extends* `unknown`
