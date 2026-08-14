[**@fest-lib/uniform v0.1.10**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/storage/TransferableStorage](../README.md) / TransferableQuery

# Interface: TransferableQuery\<T\>

Defined in: src/newer/next/storage/TransferableStorage.ts:29

## Type Parameters

### T

`T` = `any`

## Properties

### direction?

```ts
optional direction?: IDBCursorDirection;
```

Defined in: src/newer/next/storage/TransferableStorage.ts:32

***

### filter?

```ts
optional filter?: (record) => boolean;
```

Defined in: src/newer/next/storage/TransferableStorage.ts:35

#### Parameters

##### record

[`TransferableRecord`](TransferableRecord.md)\<`T`\>

#### Returns

`boolean`

***

### index?

```ts
optional index?: string;
```

Defined in: src/newer/next/storage/TransferableStorage.ts:30

***

### limit?

```ts
optional limit?: number;
```

Defined in: src/newer/next/storage/TransferableStorage.ts:33

***

### offset?

```ts
optional offset?: number;
```

Defined in: src/newer/next/storage/TransferableStorage.ts:34

***

### range?

```ts
optional range?: IDBKeyRange;
```

Defined in: src/newer/next/storage/TransferableStorage.ts:31
