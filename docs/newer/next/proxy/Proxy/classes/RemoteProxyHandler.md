[**@fest-lib/uniform v0.1.18**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/proxy/Proxy](../README.md) / RemoteProxyHandler

# Class: RemoteProxyHandler

Defined in: src/newer/next/proxy/Proxy.ts:103

RemoteProxyHandler - Unified proxy handler for remote invocation

Handles all Reflect operations and forwards them to the invoker.

## Implements

- `ProxyHandler`\<`Function`\>

## Constructors

### Constructor

```ts
new RemoteProxyHandler(_invoker, config): RemoteProxyHandler;
```

Defined in: src/newer/next/proxy/Proxy.ts:107

#### Parameters

##### \_invoker

[`ProxyInvoker`](../type-aliases/ProxyInvoker.md)

##### config

[`ProxyConfig`](../interfaces/ProxyConfig.md)

#### Returns

`RemoteProxyHandler`

## Methods

### apply()

```ts
apply(
   target, 
   thisArg, 
   args): any;
```

Defined in: src/newer/next/proxy/Proxy.ts:174

Apply function

#### Parameters

##### target

`Function`

##### thisArg

`any`

##### args

`any`[]

#### Returns

`any`

#### Implementation of

```ts
ProxyHandler.apply
```

***

### construct()

```ts
construct(
   target, 
   args, 
   newTarget): object;
```

Defined in: src/newer/next/proxy/Proxy.ts:183

Construct new instance

#### Parameters

##### target

`Function`

##### args

`any`[]

##### newTarget

`Function`

#### Returns

`object`

#### Implementation of

```ts
ProxyHandler.construct
```

***

### deleteProperty()

```ts
deleteProperty(target, prop): boolean;
```

Defined in: src/newer/next/proxy/Proxy.ts:202

Delete property

#### Parameters

##### target

`Function`

##### prop

`PropertyKey`

#### Returns

`boolean`

#### Implementation of

```ts
ProxyHandler.deleteProperty
```

***

### get()

```ts
get(
   target, 
   prop, 
   receiver): any;
```

Defined in: src/newer/next/proxy/Proxy.ts:121

Get property - returns nested proxy or invokes GET

#### Parameters

##### target

`Function`

##### prop

`PropertyKey`

##### receiver

`any`

#### Returns

`any`

#### Implementation of

```ts
ProxyHandler.get
```

***

### getOwnPropertyDescriptor()

```ts
getOwnPropertyDescriptor(target, prop): PropertyDescriptor | undefined;
```

Defined in: src/newer/next/proxy/Proxy.ts:217

Get property descriptor

#### Parameters

##### target

`Function`

##### prop

`PropertyKey`

#### Returns

`PropertyDescriptor` \| `undefined`

#### Implementation of

```ts
ProxyHandler.getOwnPropertyDescriptor
```

***

### getPrototypeOf()

```ts
getPrototypeOf(target): object | null;
```

Defined in: src/newer/next/proxy/Proxy.ts:222

Get prototype

#### Parameters

##### target

`Function`

#### Returns

`object` \| `null`

#### Implementation of

```ts
ProxyHandler.getPrototypeOf
```

***

### has()

```ts
has(target, prop): boolean;
```

Defined in: src/newer/next/proxy/Proxy.ts:192

Check if property exists

#### Parameters

##### target

`Function`

##### prop

`PropertyKey`

#### Returns

`boolean`

#### Implementation of

```ts
ProxyHandler.has
```

***

### isExtensible()

```ts
isExtensible(target): boolean;
```

Defined in: src/newer/next/proxy/Proxy.ts:236

Check if extensible

#### Parameters

##### target

`Function`

#### Returns

`boolean`

#### Implementation of

```ts
ProxyHandler.isExtensible
```

***

### ownKeys()

```ts
ownKeys(target): ArrayLike<string | symbol>;
```

Defined in: src/newer/next/proxy/Proxy.ts:212

Get own keys

#### Parameters

##### target

`Function`

#### Returns

`ArrayLike`\<`string` \| `symbol`\>

#### Implementation of

```ts
ProxyHandler.ownKeys
```

***

### preventExtensions()

```ts
preventExtensions(target): boolean;
```

Defined in: src/newer/next/proxy/Proxy.ts:241

Prevent extensions

#### Parameters

##### target

`Function`

#### Returns

`boolean`

#### Implementation of

```ts
ProxyHandler.preventExtensions
```

***

### set()

```ts
set(
   target, 
   prop, 
   value, 
   receiver): boolean;
```

Defined in: src/newer/next/proxy/Proxy.ts:162

Set property

#### Parameters

##### target

`Function`

##### prop

`PropertyKey`

##### value

`any`

##### receiver

`any`

#### Returns

`boolean`

#### Implementation of

```ts
ProxyHandler.set
```

***

### setPrototypeOf()

```ts
setPrototypeOf(target, proto): boolean;
```

Defined in: src/newer/next/proxy/Proxy.ts:227

Set prototype

#### Parameters

##### target

`Function`

##### proto

`object` \| `null`

#### Returns

`boolean`

#### Implementation of

```ts
ProxyHandler.setPrototypeOf
```
