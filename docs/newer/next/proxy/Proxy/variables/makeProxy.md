[**@fest-lib/uniform v0.1.14**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/proxy/Proxy](../README.md) / makeProxy

# ~~Variable: makeProxy~~

```ts
const makeProxy: <T>(invoker, config) => RemoteProxy<T> = createRemoteProxy;
```

Defined in: src/newer/next/proxy/Proxy.ts:519

Create a remote proxy for transparent RPC

## Type Parameters

### T

`T` = `any`

## Parameters

### invoker

[`ProxyInvoker`](../type-aliases/ProxyInvoker.md)

Function to invoke remote operations

### config

[`ProxyConfig`](../interfaces/ProxyConfig.md)

Proxy configuration

## Returns

[`RemoteProxy`](../type-aliases/RemoteProxy.md)\<`T`\>

Proxy object that forwards all operations to remote

## Example

```ts
const proxy = createRemoteProxy(
    (action, path, args) => channel.invoke(targetChannel, action, path, args),
    { channel: "worker" }
);

// All operations are forwarded
await proxy.math.add(1, 2);
await proxy.user.name;
proxy.config.debug = true;
```

## Deprecated

Use createRemoteProxy
