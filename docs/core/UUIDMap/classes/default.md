[**@fest/uniform v0.0.0**](../../../README.md)

***

[@fest/uniform](../../../README.md) / [core/UUIDMap](../README.md) / default

# Class: default\<T\>

Defined in: core/UUIDMap.ts:10

## Type Parameters

### T

`T` = [`dT`](../../Useful/type-aliases/dT.md)

## Constructors

### Constructor

```ts
new default<T>(): UUIDMap<T>;
```

Defined in: core/UUIDMap.ts:17

#### Returns

`UUIDMap`\<`T`\>

## Methods

### add()

```ts
add(
   obj, 
   id, 
   force): undefined | string;
```

Defined in: core/UUIDMap.ts:35

#### Parameters

##### obj

[`dT`](../../Useful/type-aliases/dT.md)

##### id

`string` = `""`

##### force

`boolean` = `false`

#### Returns

`undefined` \| `string`

***

### count()

```ts
count(obj?): undefined | dT;
```

Defined in: core/UUIDMap.ts:64

#### Parameters

##### obj?

[`dT`](../../Useful/type-aliases/dT.md)

#### Returns

`undefined` \| [`dT`](../../Useful/type-aliases/dT.md)

***

### delete()

```ts
delete<R>(key): unknown;
```

Defined in: core/UUIDMap.ts:27

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
discount(obj?): undefined | dT;
```

Defined in: core/UUIDMap.ts:53

#### Parameters

##### obj?

[`rT`](../../Useful/type-aliases/rT.md)

#### Returns

`undefined` \| [`dT`](../../Useful/type-aliases/dT.md)

***

### get()

```ts
get<R>(key): unknown;
```

Defined in: core/UUIDMap.ts:81

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

Defined in: core/UUIDMap.ts:73

#### Type Parameters

##### R

`R` *extends* `string` \| [`dT`](../../Useful/type-aliases/dT.md)

#### Parameters

##### key

`R`

#### Returns

`boolean`
