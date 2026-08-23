[**@fest-lib/uniform v0.1.13**](../../../../README.md)

***

[@fest-lib/uniform](../../../../README.md) / [newer/messaging/Protocol](../README.md) / LegacyUnifiedMessage

# Interface: LegacyUnifiedMessage\<T\>

Defined in: src/newer/messaging/Protocol.ts:38

## Extended by

- [`CreateEnvelopeInput`](CreateEnvelopeInput.md)

## Type Parameters

### T

`T` = `unknown`

## Properties

### contentType?

```ts
optional contentType?: string;
```

Defined in: src/newer/messaging/Protocol.ts:43

***

### data?

```ts
optional data?: T;
```

Defined in: src/newer/messaging/Protocol.ts:44

***

### destination?

```ts
optional destination?: string;
```

Defined in: src/newer/messaging/Protocol.ts:42

***

### id?

```ts
optional id?: string;
```

Defined in: src/newer/messaging/Protocol.ts:39

***

### metadata?

```ts
optional metadata?: Record<string, unknown>;
```

Defined in: src/newer/messaging/Protocol.ts:45

***

### source?

```ts
optional source?: string;
```

Defined in: src/newer/messaging/Protocol.ts:41

***

### type?

```ts
optional type?: string;
```

Defined in: src/newer/messaging/Protocol.ts:40
