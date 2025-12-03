[**@fest-lib/uniform v0.0.0**](../../../README.md)

***

[@fest-lib/uniform](../../../README.md) / [core/Useful](../README.md) / IWrap

# Type Alias: IWrap\<T\>

```ts
type IWrap<T> = { [pT in keyof T]: MPromise<pT> | IWrap<pT> };
```

Defined in: [core/Useful.ts:9](https://github.com/fest-live/uniform.ts/blob/37b3e597feae16da872afd10a6f2319a4c1b210a/src/core/Useful.ts#L9)

## Type Parameters

### T

`T` *extends* `unknown`
