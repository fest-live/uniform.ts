[**@fest-lib/uniform v0.1.15**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/proxy/Proxy](../README.md) / ProxyConfig

# Interface: ProxyConfig

Defined in: src/newer/next/proxy/Proxy.ts:45

Proxy configuration

## Properties

### basePath?

```ts
optional basePath?: string[];
```

Defined in: src/newer/next/proxy/Proxy.ts:49

Base path for property access

***

### cache?

```ts
optional cache?: boolean;
```

Defined in: src/newer/next/proxy/Proxy.ts:53

Cache created proxies

***

### channel

```ts
channel: string;
```

Defined in: src/newer/next/proxy/Proxy.ts:47

Target channel for requests

***

### invoker?

```ts
optional invoker?: ProxyInvoker;
```

Defined in: src/newer/next/proxy/Proxy.ts:51

Custom invoker function

***

### timeout?

```ts
optional timeout?: number;
```

Defined in: src/newer/next/proxy/Proxy.ts:55

Timeout for requests (ms)
