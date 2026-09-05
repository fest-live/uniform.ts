[**@fest-lib/uniform v0.1.29**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/storage/DataBase](../README.md) / default

# Class: default\<T\>

Defined in: uniform.ts/src/newer/next/storage/DataBase.ts:14

## Type Parameters

### T

`T` = [`dT`](../../../../core/Useful/type-aliases/dT.md)

## Constructors

### Constructor

```ts
new default<T>(): UUIDMap<T>;
```

Defined in: uniform.ts/src/newer/next/storage/DataBase.ts:21

#### Returns

`UUIDMap`\<`T`\>

## Methods

### add()

```ts
add(
   obj, 
   id?, 
   force?): string | undefined;
```

Defined in: uniform.ts/src/newer/next/storage/DataBase.ts:39

#### Parameters

##### obj

[`dT`](../../../../core/Useful/type-aliases/dT.md)

##### id?

`string` = `""`

##### force?

`boolean` = `false`

#### Returns

`string` \| `undefined`

***

### count()

```ts
count(obj?): dT | undefined;
```

Defined in: uniform.ts/src/newer/next/storage/DataBase.ts:68

#### Parameters

##### obj?

[`dT`](../../../../core/Useful/type-aliases/dT.md)

#### Returns

[`dT`](../../../../core/Useful/type-aliases/dT.md) \| `undefined`

***

### delete()

```ts
delete<R>(key): unknown;
```

Defined in: uniform.ts/src/newer/next/storage/DataBase.ts:31

#### Type Parameters

##### R

`R` *extends* `string` \| [`dT`](../../../../core/Useful/type-aliases/dT.md)

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

Defined in: uniform.ts/src/newer/next/storage/DataBase.ts:57

#### Parameters

##### obj?

[`rT`](../../../../core/Useful/type-aliases/rT.md)

#### Returns

[`dT`](../../../../core/Useful/type-aliases/dT.md) \| `undefined`

***

### get()

```ts
get<R>(key): unknown;
```

Defined in: uniform.ts/src/newer/next/storage/DataBase.ts:85

#### Type Parameters

##### R

`R` *extends* `string` \| [`dT`](../../../../core/Useful/type-aliases/dT.md)

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

Defined in: uniform.ts/src/newer/next/storage/DataBase.ts:77

#### Type Parameters

##### R

`R` *extends* `string` \| [`dT`](../../../../core/Useful/type-aliases/dT.md)

#### Parameters

##### key

`R`

#### Returns

`boolean`
