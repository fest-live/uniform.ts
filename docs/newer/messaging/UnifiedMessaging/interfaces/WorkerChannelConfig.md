[**@fest-lib/uniform v0.1.25**](../../../../README.md)

***

[@fest-lib/uniform](../../../../README.md) / [newer/messaging/UnifiedMessaging](../README.md) / WorkerChannelConfig

# Interface: WorkerChannelConfig

Defined in: uniform.ts/src/newer/messaging/UnifiedMessaging.ts:57

## Properties

### name

```ts
name: string;
```

Defined in: uniform.ts/src/newer/messaging/UnifiedMessaging.ts:58

***

### options?

```ts
optional options?: WorkerOptions;
```

Defined in: uniform.ts/src/newer/messaging/UnifiedMessaging.ts:60

***

### protocolOptions?

```ts
optional protocolOptions?: object;
```

Defined in: uniform.ts/src/newer/messaging/UnifiedMessaging.ts:61

#### batching?

```ts
optional batching?: boolean;
```

#### compression?

```ts
optional compression?: boolean;
```

#### retries?

```ts
optional retries?: number;
```

#### timeout?

```ts
optional timeout?: number;
```

***

### script

```ts
script: string | Worker | (() => Worker);
```

Defined in: uniform.ts/src/newer/messaging/UnifiedMessaging.ts:59
