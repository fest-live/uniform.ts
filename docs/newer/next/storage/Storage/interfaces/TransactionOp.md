[**@fest-lib/uniform v0.1.18**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/storage/Storage](../README.md) / TransactionOp

# Interface: TransactionOp\<T\>

Defined in: src/newer/next/storage/Storage.ts:41

Transaction operation

## Type Parameters

### T

`T` = `any`

## Properties

### id

```ts
id: string;
```

Defined in: src/newer/next/storage/Storage.ts:42

***

### key?

```ts
optional key?: IDBValidKey;
```

Defined in: src/newer/next/storage/Storage.ts:45

***

### store

```ts
store: string;
```

Defined in: src/newer/next/storage/Storage.ts:44

***

### timestamp

```ts
timestamp: number;
```

Defined in: src/newer/next/storage/Storage.ts:47

***

### type

```ts
type: "put" | "delete" | "update";
```

Defined in: src/newer/next/storage/Storage.ts:43

***

### value?

```ts
optional value?: T;
```

Defined in: src/newer/next/storage/Storage.ts:46
