[**@fest-lib/uniform v0.1.25**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/storage/TransferableStorage](../README.md) / TransferableStorageFactory

# Variable: TransferableStorageFactory

```ts
const TransferableStorageFactory: object;
```

Defined in: uniform.ts/src/newer/next/storage/TransferableStorage.ts:651

## Type Declaration

### create

```ts
create: <T>(config) => TransferableStorage<T>;
```

#### Type Parameters

##### T

`T`

#### Parameters

##### config

[`TransferableStorageConfig`](../interfaces/TransferableStorageConfig.md)

#### Returns

[`TransferableStorage`](../classes/TransferableStorage.md)\<`T`\>

### createMessageQueue

```ts
createMessageQueue: (dbName?) => MessageQueueStorage;
```

#### Parameters

##### dbName?

`string`

#### Returns

[`MessageQueueStorage`](../classes/MessageQueueStorage.md)
