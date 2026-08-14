[**@fest-lib/uniform v0.1.10**](../../README.md)

***

[@fest-lib/uniform](../../README.md) / [optimized-protocol](../README.md) / MessageEnvelope

# Interface: MessageEnvelope

Defined in: src/optimized-protocol.ts:5

Lightweight message envelope shape used by worker entrypoints (e.g. OPFS).
Kept separate from Queued.ts to avoid pulling channel/storage runtime into workers.

## Properties

### id?

```ts
optional id?: string;
```

Defined in: src/optimized-protocol.ts:6

***

### payload

```ts
payload: any;
```

Defined in: src/optimized-protocol.ts:8

***

### replyTo?

```ts
optional replyTo?: string;
```

Defined in: src/optimized-protocol.ts:10

***

### timestamp?

```ts
optional timestamp?: number;
```

Defined in: src/optimized-protocol.ts:9

***

### type

```ts
type: string;
```

Defined in: src/optimized-protocol.ts:7
