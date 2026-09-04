[**@fest-lib/uniform v0.1.28**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/storage/Storage](../README.md) / ChannelTransaction

# Class: ChannelTransaction

Defined in: uniform.ts/src/newer/next/storage/Storage.ts:918

Helper class for batch operations with rollback support

## Constructors

### Constructor

```ts
new ChannelTransaction(_storage): ChannelTransaction;
```

Defined in: uniform.ts/src/newer/next/storage/Storage.ts:923

#### Parameters

##### \_storage

[`ChannelStorage`](ChannelStorage.md)

#### Returns

`ChannelTransaction`

## Accessors

### operationCount

#### Get Signature

```ts
get operationCount(): number;
```

Defined in: uniform.ts/src/newer/next/storage/Storage.ts:997

Get operation count

##### Returns

`number`

## Methods

### commit()

```ts
commit(): Promise<void>;
```

Defined in: uniform.ts/src/newer/next/storage/Storage.ts:974

Commit transaction

#### Returns

`Promise`\<`void`\>

***

### delete()

```ts
delete(store, key): this;
```

Defined in: uniform.ts/src/newer/next/storage/Storage.ts:943

Add delete operation

#### Parameters

##### store

`string`

##### key

`IDBValidKey`

#### Returns

`this`

***

### put()

```ts
put<T>(store, value): this;
```

Defined in: uniform.ts/src/newer/next/storage/Storage.ts:928

Add put operation

#### Type Parameters

##### T

`T`

#### Parameters

##### store

`string`

##### value

`T`

#### Returns

`this`

***

### rollback()

```ts
rollback(): void;
```

Defined in: uniform.ts/src/newer/next/storage/Storage.ts:989

Rollback transaction (just clear operations, don't execute)

#### Returns

`void`

***

### update()

```ts
update<T>(
   store, 
   key, 
   updates): this;
```

Defined in: uniform.ts/src/newer/next/storage/Storage.ts:958

Add update operation

#### Type Parameters

##### T

`T`

#### Parameters

##### store

`string`

##### key

`IDBValidKey`

##### updates

`Partial`\<`T`\>

#### Returns

`this`
