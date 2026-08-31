[**@fest-lib/uniform v0.1.17**](../../../../README.md)

***

[@fest-lib/uniform](../../../../README.md) / [newer/messaging/MessageQueue](../README.md) / QueuedMessage

# Interface: QueuedMessage\<T\>

Defined in: src/newer/messaging/MessageQueue.ts:11

Generic Message Queue Utility
Provides persistent queuing for cross-context communications using IndexedDB
Part of fest/uniform - no app-specific dependencies

## Type Parameters

### T

`T` = `unknown`

## Properties

### data

```ts
data: T;
```

Defined in: src/newer/messaging/MessageQueue.ts:14

***

### destination?

```ts
optional destination?: string;
```

Defined in: src/newer/messaging/MessageQueue.ts:20

***

### expiresAt?

```ts
optional expiresAt?: number;
```

Defined in: src/newer/messaging/MessageQueue.ts:19

***

### id

```ts
id: string;
```

Defined in: src/newer/messaging/MessageQueue.ts:12

***

### maxRetries

```ts
maxRetries: number;
```

Defined in: src/newer/messaging/MessageQueue.ts:18

***

### metadata?

```ts
optional metadata?: Record<string, unknown>;
```

Defined in: src/newer/messaging/MessageQueue.ts:21

***

### priority

```ts
priority: MessagePriority;
```

Defined in: src/newer/messaging/MessageQueue.ts:16

***

### retryCount

```ts
retryCount: number;
```

Defined in: src/newer/messaging/MessageQueue.ts:17

***

### timestamp

```ts
timestamp: number;
```

Defined in: src/newer/messaging/MessageQueue.ts:15

***

### type

```ts
type: string;
```

Defined in: src/newer/messaging/MessageQueue.ts:13
