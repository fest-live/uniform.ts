[**@fest-lib/uniform v0.1.22**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/transport/ServiceWorkerHost](../README.md) / SWHostConfig

# Interface: SWHostConfig

Defined in: src/newer/next/transport/ServiceWorkerHost.ts:61

SW host configuration

## Properties

### autoCleanup?

```ts
optional autoCleanup?: boolean;
```

Defined in: src/newer/next/transport/ServiceWorkerHost.ts:71

Enable automatic cleanup of stale clients

***

### channelName

```ts
channelName: string;
```

Defined in: src/newer/next/transport/ServiceWorkerHost.ts:63

Channel name for this host

***

### cleanupInterval?

```ts
optional cleanupInterval?: number;
```

Defined in: src/newer/next/transport/ServiceWorkerHost.ts:73

Cleanup interval in milliseconds

***

### enableOfflineQueue?

```ts
optional enableOfflineQueue?: boolean;
```

Defined in: src/newer/next/transport/ServiceWorkerHost.ts:65

Enable message buffering for offline clients

***

### maxOfflineQueueSize?

```ts
optional maxOfflineQueueSize?: number;
```

Defined in: src/newer/next/transport/ServiceWorkerHost.ts:67

Maximum messages per client in offline queue

***

### messageTTL?

```ts
optional messageTTL?: number;
```

Defined in: src/newer/next/transport/ServiceWorkerHost.ts:69

Message TTL in milliseconds
