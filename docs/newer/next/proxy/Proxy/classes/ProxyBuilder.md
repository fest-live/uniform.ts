[**@fest-lib/uniform v0.1.11**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/proxy/Proxy](../README.md) / ProxyBuilder

# Class: ProxyBuilder\<T\>

Defined in: src/newer/next/proxy/Proxy.ts:458

ProxyBuilder - Fluent API for creating proxies

## Example

```ts
const proxy = new ProxyBuilder()
    .channel("worker")
    .path(["modules", "math"])
    .invoker((action, path, args) => channel.invoke(...))
    .timeout(5000)
    .build();
```

## Type Parameters

### T

`T` = `any`

## Constructors

### Constructor

```ts
new ProxyBuilder<T>(): ProxyBuilder<T>;
```

#### Returns

`ProxyBuilder`\<`T`\>

## Methods

### build()

```ts
build(): RemoteProxy<T>;
```

Defined in: src/newer/next/proxy/Proxy.ts:493

Build the proxy

#### Returns

[`RemoteProxy`](../type-aliases/RemoteProxy.md)\<`T`\>

***

### cache()

```ts
cache(enabled): this;
```

Defined in: src/newer/next/proxy/Proxy.ts:487

Enable/disable caching

#### Parameters

##### enabled

`boolean`

#### Returns

`this`

***

### channel()

```ts
channel(name): this;
```

Defined in: src/newer/next/proxy/Proxy.ts:463

Set target channel

#### Parameters

##### name

`string`

#### Returns

`this`

***

### invoker()

```ts
invoker(fn): this;
```

Defined in: src/newer/next/proxy/Proxy.ts:475

Set invoker function

#### Parameters

##### fn

[`ProxyInvoker`](../type-aliases/ProxyInvoker.md)

#### Returns

`this`

***

### path()

```ts
path(basePath): this;
```

Defined in: src/newer/next/proxy/Proxy.ts:469

Set base path

#### Parameters

##### basePath

`string`[]

#### Returns

`this`

***

### timeout()

```ts
timeout(ms): this;
```

Defined in: src/newer/next/proxy/Proxy.ts:481

Set timeout

#### Parameters

##### ms

`number`

#### Returns

`this`
