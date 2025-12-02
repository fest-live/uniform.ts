[**@fest-lib/uniform v0.0.0**](../../../README.md)

***

[@fest-lib/uniform](../../../README.md) / [core/UUIDMap](../README.md) / default

# Class: default\<T\>

Defined in: [core/UUIDMap.ts:10](https://github.com/fest-live/uniform.ts/blob/00a72c2f9c17cc452a19ebfa9e811d574034488e/src/core/UUIDMap.ts#L10)

## Type Parameters

### T

`T` = [`dT`](../../Useful/type-aliases/dT.md)

## Constructors

### Constructor

```ts
new default<T>(): UUIDMap<T>;
```

Defined in: [core/UUIDMap.ts:17](https://github.com/fest-live/uniform.ts/blob/00a72c2f9c17cc452a19ebfa9e811d574034488e/src/core/UUIDMap.ts#L17)

#### Returns

`UUIDMap`\<`T`\>

## Methods

### add()

```ts
add(
   obj, 
   id, 
   force): string | undefined;
```

Defined in: [core/UUIDMap.ts:35](https://github.com/fest-live/uniform.ts/blob/00a72c2f9c17cc452a19ebfa9e811d574034488e/src/core/UUIDMap.ts#L35)

#### Parameters

##### obj

[`dT`](../../Useful/type-aliases/dT.md)

##### id

`string` = `""`

##### force

`boolean` = `false`

#### Returns

`string` \| `undefined`

***

### count()

```ts
count(obj?): dT | undefined;
```

Defined in: [core/UUIDMap.ts:64](https://github.com/fest-live/uniform.ts/blob/00a72c2f9c17cc452a19ebfa9e811d574034488e/src/core/UUIDMap.ts#L64)

#### Parameters

##### obj?

[`dT`](../../Useful/type-aliases/dT.md)

#### Returns

[`dT`](../../Useful/type-aliases/dT.md) \| `undefined`

***

### delete()

```ts
delete<R>(key): unknown;
```

Defined in: [core/UUIDMap.ts:27](https://github.com/fest-live/uniform.ts/blob/00a72c2f9c17cc452a19ebfa9e811d574034488e/src/core/UUIDMap.ts#L27)

#### Type Parameters

##### R

`R` *extends* `string` \| [`dT`](../../Useful/type-aliases/dT.md)

#### Parameters

##### key

`R`

#### Returns

`unknown`

***

### discount()

```ts
discount(obj?): dT | undefined;
```

Defined in: [core/UUIDMap.ts:53](https://github.com/fest-live/uniform.ts/blob/00a72c2f9c17cc452a19ebfa9e811d574034488e/src/core/UUIDMap.ts#L53)

#### Parameters

##### obj?

[`rT`](../../Useful/type-aliases/rT.md)

#### Returns

[`dT`](../../Useful/type-aliases/dT.md) \| `undefined`

***

### get()

```ts
get<R>(key): unknown;
```

Defined in: [core/UUIDMap.ts:81](https://github.com/fest-live/uniform.ts/blob/00a72c2f9c17cc452a19ebfa9e811d574034488e/src/core/UUIDMap.ts#L81)

#### Type Parameters

##### R

`R` *extends* `string` \| [`dT`](../../Useful/type-aliases/dT.md)

#### Parameters

##### key

`R`

#### Returns

`unknown`

***

### has()

```ts
has<R>(key): boolean;
```

Defined in: [core/UUIDMap.ts:73](https://github.com/fest-live/uniform.ts/blob/00a72c2f9c17cc452a19ebfa9e811d574034488e/src/core/UUIDMap.ts#L73)

#### Type Parameters

##### R

`R` *extends* `string` \| [`dT`](../../Useful/type-aliases/dT.md)

#### Parameters

##### key

`R`

#### Returns

`boolean`
