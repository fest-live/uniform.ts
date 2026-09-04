[**@fest-lib/uniform v0.1.28**](../../../../README.md)

***

[@fest-lib/uniform](../../../../README.md) / [newer/messaging/UnifiedMessaging](../README.md) / UnifiedMessagingConfig

# Interface: UnifiedMessagingConfig

Defined in: uniform.ts/src/newer/messaging/UnifiedMessaging.ts:88

## Properties

### channelMappings?

```ts
optional channelMappings?: Record<string, string>;
```

Defined in: uniform.ts/src/newer/messaging/UnifiedMessaging.ts:90

Custom channel mappings (destination -> channel name)

***

### pendingStoreOptions?

```ts
optional pendingStoreOptions?: object;
```

Defined in: uniform.ts/src/newer/messaging/UnifiedMessaging.ts:99

Pending message store options

#### defaultTTLMs?

```ts
optional defaultTTLMs?: number;
```

#### maxMessages?

```ts
optional maxMessages?: number;
```

#### storageKey?

```ts
optional storageKey?: string;
```

***

### queueOptions?

```ts
optional queueOptions?: object;
```

Defined in: uniform.ts/src/newer/messaging/UnifiedMessaging.ts:92

Message queue options

#### dbName?

```ts
optional dbName?: string;
```

#### defaultExpirationMs?

```ts
optional defaultExpirationMs?: number;
```

#### maxRetries?

```ts
optional maxRetries?: number;
```

#### storeName?

```ts
optional storeName?: string;
```
