[**@fest-lib/uniform v0.1.25**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/transport/AtomicsTransport](../README.md) / AtomicsTransportConfig

# Interface: AtomicsTransportConfig

Defined in: uniform.ts/src/newer/next/transport/AtomicsTransport.ts:95

## Properties

### bufferSize?

```ts
optional bufferSize?: number;
```

Defined in: uniform.ts/src/newer/next/transport/AtomicsTransport.ts:97

Size of shared buffer in bytes (default: 64KB)

***

### compression?

```ts
optional compression?: boolean;
```

Defined in: uniform.ts/src/newer/next/transport/AtomicsTransport.ts:101

Enable message compression (requires CBOR-X)

***

### maxMessageSize?

```ts
optional maxMessageSize?: number;
```

Defined in: uniform.ts/src/newer/next/transport/AtomicsTransport.ts:99

Maximum message size (default: 60KB)

***

### useAsyncWait?

```ts
optional useAsyncWait?: boolean;
```

Defined in: uniform.ts/src/newer/next/transport/AtomicsTransport.ts:105

Use Atomics.waitAsync when available (non-blocking)

***

### waitTimeout?

```ts
optional waitTimeout?: number;
```

Defined in: uniform.ts/src/newer/next/transport/AtomicsTransport.ts:103

Timeout for atomic wait operations (ms)
