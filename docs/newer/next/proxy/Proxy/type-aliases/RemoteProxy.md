[**@fest-lib/uniform v0.1.8**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/proxy/Proxy](../README.md) / RemoteProxy

# Type Alias: RemoteProxy\<T\>

```ts
type RemoteProxy<T> = ProxyMethods<T> & object;
```

Defined in: src/newer/next/proxy/Proxy.ts:66

Remote proxy with metadata access

## Type Declaration

### $channel

```ts
readonly $channel: string;
```

Get the target channel

### $descriptor

```ts
readonly $descriptor: ProxyDescriptor;
```

Get the descriptor

### $invoke

```ts
$invoke: ProxyInvoker;
```

Direct invoke method

### $path

```ts
readonly $path: string[];
```

Get the proxy path

## Type Parameters

### T

`T` = `any`
