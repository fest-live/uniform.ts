[**@fest-lib/uniform v0.1.25**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/proxy/Proxy](../README.md) / DispatchProxyHandler

# Class: DispatchProxyHandler

Defined in: uniform.ts/src/newer/next/proxy/Proxy.ts:268

DispatchProxyHandler - Delegates all operations to a dispatcher

Used for backward compatibility with RequestProxyHandlerV2.

## Implements

- `ProxyHandler`\<`Function`\>

## Constructors

### Constructor

```ts
new DispatchProxyHandler(_dispatch): DispatchProxyHandler;
```

Defined in: uniform.ts/src/newer/next/proxy/Proxy.ts:269

#### Parameters

##### \_dispatch

(`action`, `args`) => `any`

#### Returns

`DispatchProxyHandler`

## Methods

### apply()

```ts
apply(...args): any;
```

Defined in: uniform.ts/src/newer/next/proxy/Proxy.ts:281

A trap method for a function call.

#### Parameters

##### args

...`any`[]

#### Returns

`any`

#### Implementation of

```ts
ProxyHandler.apply
```

***

### construct()

```ts
construct(...args): any;
```

Defined in: uniform.ts/src/newer/next/proxy/Proxy.ts:282

A trap for the `new` operator.

#### Parameters

##### args

...`any`[]

#### Returns

`any`

#### Implementation of

```ts
ProxyHandler.construct
```

***

### deleteProperty()

```ts
deleteProperty(...args): any;
```

Defined in: uniform.ts/src/newer/next/proxy/Proxy.ts:274

A trap for the `delete` operator.

#### Parameters

##### args

...`any`[]

#### Returns

`any`

A `Boolean` indicating whether or not the property was deleted.

#### Implementation of

```ts
ProxyHandler.deleteProperty
```

***

### get()

```ts
get(...args): any;
```

Defined in: uniform.ts/src/newer/next/proxy/Proxy.ts:271

A trap for getting a property value.

#### Parameters

##### args

...`any`[]

#### Returns

`any`

#### Implementation of

```ts
ProxyHandler.get
```

***

### getOwnPropertyDescriptor()

```ts
getOwnPropertyDescriptor(...args): any;
```

Defined in: uniform.ts/src/newer/next/proxy/Proxy.ts:275

A trap for `Object.getOwnPropertyDescriptor()`.

#### Parameters

##### args

...`any`[]

#### Returns

`any`

#### Implementation of

```ts
ProxyHandler.getOwnPropertyDescriptor
```

***

### getPrototypeOf()

```ts
getPrototypeOf(...args): any;
```

Defined in: uniform.ts/src/newer/next/proxy/Proxy.ts:276

A trap for the `[[GetPrototypeOf]]` internal method.

#### Parameters

##### args

...`any`[]

#### Returns

`any`

#### Implementation of

```ts
ProxyHandler.getPrototypeOf
```

***

### has()

```ts
has(...args): any;
```

Defined in: uniform.ts/src/newer/next/proxy/Proxy.ts:273

A trap for the `in` operator.

#### Parameters

##### args

...`any`[]

#### Returns

`any`

#### Implementation of

```ts
ProxyHandler.has
```

***

### isExtensible()

```ts
isExtensible(...args): any;
```

Defined in: uniform.ts/src/newer/next/proxy/Proxy.ts:278

A trap for `Object.isExtensible()`.

#### Parameters

##### args

...`any`[]

#### Returns

`any`

#### Implementation of

```ts
ProxyHandler.isExtensible
```

***

### ownKeys()

```ts
ownKeys(...args): any;
```

Defined in: uniform.ts/src/newer/next/proxy/Proxy.ts:280

A trap for `Reflect.ownKeys()`.

#### Parameters

##### args

...`any`[]

#### Returns

`any`

#### Implementation of

```ts
ProxyHandler.ownKeys
```

***

### preventExtensions()

```ts
preventExtensions(...args): any;
```

Defined in: uniform.ts/src/newer/next/proxy/Proxy.ts:279

A trap for `Object.preventExtensions()`.

#### Parameters

##### args

...`any`[]

#### Returns

`any`

#### Implementation of

```ts
ProxyHandler.preventExtensions
```

***

### set()

```ts
set(...args): any;
```

Defined in: uniform.ts/src/newer/next/proxy/Proxy.ts:272

A trap for setting a property value.

#### Parameters

##### args

...`any`[]

#### Returns

`any`

A `Boolean` indicating whether or not the property was set.

#### Implementation of

```ts
ProxyHandler.set
```

***

### setPrototypeOf()

```ts
setPrototypeOf(...args): any;
```

Defined in: uniform.ts/src/newer/next/proxy/Proxy.ts:277

A trap for `Object.setPrototypeOf()`.

#### Parameters

##### args

...`any`[]

#### Returns

`any`

#### Implementation of

```ts
ProxyHandler.setPrototypeOf
```
