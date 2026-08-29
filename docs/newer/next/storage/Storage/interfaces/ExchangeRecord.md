[**@fest-lib/uniform v0.1.15**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/storage/Storage](../README.md) / ExchangeRecord

# Interface: ExchangeRecord\<T\>

Defined in: src/newer/next/storage/Storage.ts:51

Exchange record

## Type Parameters

### T

`T` = `any`

## Properties

### createdAt

```ts
createdAt: number;
```

Defined in: src/newer/next/storage/Storage.ts:58

***

### id

```ts
id: string;
```

Defined in: src/newer/next/storage/Storage.ts:52

***

### key

```ts
key: string;
```

Defined in: src/newer/next/storage/Storage.ts:53

***

### lock?

```ts
optional lock?: object;
```

Defined in: src/newer/next/storage/Storage.ts:60

#### acquiredAt

```ts
acquiredAt: number;
```

#### expiresAt

```ts
expiresAt: number;
```

#### holder

```ts
holder: string;
```

***

### owner

```ts
owner: string;
```

Defined in: src/newer/next/storage/Storage.ts:55

***

### sharedWith

```ts
sharedWith: string[];
```

Defined in: src/newer/next/storage/Storage.ts:56

***

### updatedAt

```ts
updatedAt: number;
```

Defined in: src/newer/next/storage/Storage.ts:59

***

### value

```ts
value: T;
```

Defined in: src/newer/next/storage/Storage.ts:54

***

### version

```ts
version: number;
```

Defined in: src/newer/next/storage/Storage.ts:57
