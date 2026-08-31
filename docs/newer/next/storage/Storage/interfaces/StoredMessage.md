[**@fest-lib/uniform v0.1.18**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/storage/Storage](../README.md) / StoredMessage

# Interface: StoredMessage\<T\>

Defined in: src/newer/next/storage/Storage.ts:23

Stored message envelope

## Type Parameters

### T

`T` = `any`

## Properties

### channel

```ts
channel: string;
```

Defined in: src/newer/next/storage/Storage.ts:25

***

### createdAt

```ts
createdAt: number;
```

Defined in: src/newer/next/storage/Storage.ts:32

***

### expiresAt

```ts
expiresAt: number | null;
```

Defined in: src/newer/next/storage/Storage.ts:34

***

### id

```ts
id: string;
```

Defined in: src/newer/next/storage/Storage.ts:24

***

### maxRetries

```ts
maxRetries: number;
```

Defined in: src/newer/next/storage/Storage.ts:36

***

### metadata?

```ts
optional metadata?: Record<string, any>;
```

Defined in: src/newer/next/storage/Storage.ts:37

***

### payload

```ts
payload: T;
```

Defined in: src/newer/next/storage/Storage.ts:29

***

### priority

```ts
priority: number;
```

Defined in: src/newer/next/storage/Storage.ts:31

***

### recipient

```ts
recipient: string;
```

Defined in: src/newer/next/storage/Storage.ts:27

***

### retryCount

```ts
retryCount: number;
```

Defined in: src/newer/next/storage/Storage.ts:35

***

### sender

```ts
sender: string;
```

Defined in: src/newer/next/storage/Storage.ts:26

***

### status

```ts
status: MessageStatus;
```

Defined in: src/newer/next/storage/Storage.ts:30

***

### type

```ts
type: "request" | "response" | "event" | "signal" | "exchange";
```

Defined in: src/newer/next/storage/Storage.ts:28

***

### updatedAt

```ts
updatedAt: number;
```

Defined in: src/newer/next/storage/Storage.ts:33
