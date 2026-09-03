[**@fest-lib/uniform v0.1.24**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/types/Interface](../README.md) / Observer

# Interface: Observer\<T\>

Defined in: uniform.ts/src/newer/next/types/Interface.ts:91

Observer interface (WICG-like)

## Type Parameters

### T

`T` = `any`

## Properties

### complete?

```ts
optional complete?: () => void;
```

Defined in: uniform.ts/src/newer/next/types/Interface.ts:94

#### Returns

`void`

***

### error?

```ts
optional error?: (err) => void;
```

Defined in: uniform.ts/src/newer/next/types/Interface.ts:93

#### Parameters

##### err

`Error`

#### Returns

`void`

***

### next?

```ts
optional next?: (value) => void;
```

Defined in: uniform.ts/src/newer/next/types/Interface.ts:92

#### Parameters

##### value

`T`

#### Returns

`void`
