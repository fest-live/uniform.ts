[**@fest-lib/uniform v0.1.13**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/storage/TransferableStorage](../README.md) / QueuedMessage

# Interface: QueuedMessage\<T\>

Defined in: src/newer/next/storage/TransferableStorage.ts:515

## Type Parameters

### T

`T` = `any`

## Properties

### attempts

```ts
attempts: number;
```

Defined in: src/newer/next/storage/TransferableStorage.ts:522

***

### channel

```ts
channel: string;
```

Defined in: src/newer/next/storage/TransferableStorage.ts:517

***

### createdAt

```ts
createdAt: number;
```

Defined in: src/newer/next/storage/TransferableStorage.ts:525

***

### error?

```ts
optional error?: string;
```

Defined in: src/newer/next/storage/TransferableStorage.ts:529

***

### expiresAt?

```ts
optional expiresAt?: number;
```

Defined in: src/newer/next/storage/TransferableStorage.ts:527

***

### id

```ts
id: string;
```

Defined in: src/newer/next/storage/TransferableStorage.ts:516

***

### lastAttemptAt?

```ts
optional lastAttemptAt?: number;
```

Defined in: src/newer/next/storage/TransferableStorage.ts:528

***

### maxAttempts

```ts
maxAttempts: number;
```

Defined in: src/newer/next/storage/TransferableStorage.ts:523

***

### payload

```ts
payload: T;
```

Defined in: src/newer/next/storage/TransferableStorage.ts:520

***

### priority

```ts
priority: number;
```

Defined in: src/newer/next/storage/TransferableStorage.ts:521

***

### scheduledFor

```ts
scheduledFor: number;
```

Defined in: src/newer/next/storage/TransferableStorage.ts:526

***

### sender

```ts
sender: string;
```

Defined in: src/newer/next/storage/TransferableStorage.ts:518

***

### status

```ts
status: "pending" | "processing" | "failed" | "expired" | "completed";
```

Defined in: src/newer/next/storage/TransferableStorage.ts:524

***

### type

```ts
type: string;
```

Defined in: src/newer/next/storage/TransferableStorage.ts:519
