[**@fest-lib/uniform v0.0.0**](../../../README.md)

***

[@fest-lib/uniform](../../../README.md) / [next/RequestProxy](../README.md) / RequestProxyHandler

# Class: RequestProxyHandler

Defined in: [next/RequestProxy.ts:88](https://github.com/fest-live/uniform.ts/blob/37b3e597feae16da872afd10a6f2319a4c1b210a/src/next/RequestProxy.ts#L88)

## Implements

- `ProxyHandler`\<`Function`\>

## Constructors

### Constructor

```ts
new RequestProxyHandler(options): RequestProxyHandler;
```

Defined in: [next/RequestProxy.ts:89](https://github.com/fest-live/uniform.ts/blob/37b3e597feae16da872afd10a6f2319a4c1b210a/src/next/RequestProxy.ts#L89)

#### Parameters

##### options

`any`

#### Returns

`RequestProxyHandler`

## Methods

### apply()

```ts
apply(
   target, 
   thisArg, 
   args): any;
```

Defined in: [next/RequestProxy.ts:91](https://github.com/fest-live/uniform.ts/blob/37b3e597feae16da872afd10a6f2319a4c1b210a/src/next/RequestProxy.ts#L91)

A trap method for a function call.

#### Parameters

##### target

`any`

The original callable object which is being proxied.

##### thisArg

`any`

##### args

`any`

#### Returns

`any`

#### Implementation of

```ts
ProxyHandler.apply
```

***

### call()

```ts
call(
   target, 
   thisArg, 
   args): any;
```

Defined in: [next/RequestProxy.ts:95](https://github.com/fest-live/uniform.ts/blob/37b3e597feae16da872afd10a6f2319a4c1b210a/src/next/RequestProxy.ts#L95)

#### Parameters

##### target

`any`

##### thisArg

`any`

##### args

`any`

#### Returns

`any`

***

### construct()

```ts
construct(target, args): any;
```

Defined in: [next/RequestProxy.ts:99](https://github.com/fest-live/uniform.ts/blob/37b3e597feae16da872afd10a6f2319a4c1b210a/src/next/RequestProxy.ts#L99)

A trap for the `new` operator.

#### Parameters

##### target

`any`

The original object which is being proxied.

##### args

`any`

#### Returns

`any`

#### Implementation of

```ts
ProxyHandler.construct
```

***

### deleteProperty()

```ts
deleteProperty(target, prop): any;
```

Defined in: [next/RequestProxy.ts:120](https://github.com/fest-live/uniform.ts/blob/37b3e597feae16da872afd10a6f2319a4c1b210a/src/next/RequestProxy.ts#L120)

A trap for the `delete` operator.

#### Parameters

##### target

`any`

The original object which is being proxied.

##### prop

`any`

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
get(
   target, 
   prop, 
   receiver): any;
```

Defined in: [next/RequestProxy.ts:103](https://github.com/fest-live/uniform.ts/blob/37b3e597feae16da872afd10a6f2319a4c1b210a/src/next/RequestProxy.ts#L103)

A trap for getting a property value.

#### Parameters

##### target

`any`

The original object which is being proxied.

##### prop

`any`

##### receiver

`any`

The proxy or an object that inherits from the proxy.

#### Returns

`any`

#### Implementation of

```ts
ProxyHandler.get
```

***

### getOwnPropertyDescriptor()

```ts
getOwnPropertyDescriptor(target, prop): any;
```

Defined in: [next/RequestProxy.ts:124](https://github.com/fest-live/uniform.ts/blob/37b3e597feae16da872afd10a6f2319a4c1b210a/src/next/RequestProxy.ts#L124)

A trap for `Object.getOwnPropertyDescriptor()`.

#### Parameters

##### target

`any`

The original object which is being proxied.

##### prop

`any`

#### Returns

`any`

#### Implementation of

```ts
ProxyHandler.getOwnPropertyDescriptor
```

***

### getPrototypeOf()

```ts
getPrototypeOf(target): any;
```

Defined in: [next/RequestProxy.ts:128](https://github.com/fest-live/uniform.ts/blob/37b3e597feae16da872afd10a6f2319a4c1b210a/src/next/RequestProxy.ts#L128)

A trap for the `[[GetPrototypeOf]]` internal method.

#### Parameters

##### target

`any`

The original object which is being proxied.

#### Returns

`any`

#### Implementation of

```ts
ProxyHandler.getPrototypeOf
```

***

### has()

```ts
has(target, prop): any;
```

Defined in: [next/RequestProxy.ts:115](https://github.com/fest-live/uniform.ts/blob/37b3e597feae16da872afd10a6f2319a4c1b210a/src/next/RequestProxy.ts#L115)

A trap for the `in` operator.

#### Parameters

##### target

`any`

The original object which is being proxied.

##### prop

`any`

#### Returns

`any`

#### Implementation of

```ts
ProxyHandler.has
```

***

### isExtensible()

```ts
isExtensible(target): any;
```

Defined in: [next/RequestProxy.ts:136](https://github.com/fest-live/uniform.ts/blob/37b3e597feae16da872afd10a6f2319a4c1b210a/src/next/RequestProxy.ts#L136)

A trap for `Object.isExtensible()`.

#### Parameters

##### target

`any`

The original object which is being proxied.

#### Returns

`any`

#### Implementation of

```ts
ProxyHandler.isExtensible
```

***

### ownKeys()

```ts
ownKeys(target): any;
```

Defined in: [next/RequestProxy.ts:144](https://github.com/fest-live/uniform.ts/blob/37b3e597feae16da872afd10a6f2319a4c1b210a/src/next/RequestProxy.ts#L144)

A trap for `Reflect.ownKeys()`.

#### Parameters

##### target

`any`

The original object which is being proxied.

#### Returns

`any`

#### Implementation of

```ts
ProxyHandler.ownKeys
```

***

### preventExtensions()

```ts
preventExtensions(target): any;
```

Defined in: [next/RequestProxy.ts:140](https://github.com/fest-live/uniform.ts/blob/37b3e597feae16da872afd10a6f2319a4c1b210a/src/next/RequestProxy.ts#L140)

A trap for `Object.preventExtensions()`.

#### Parameters

##### target

`any`

The original object which is being proxied.

#### Returns

`any`

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
   receiver): any;
```

Defined in: [next/RequestProxy.ts:110](https://github.com/fest-live/uniform.ts/blob/37b3e597feae16da872afd10a6f2319a4c1b210a/src/next/RequestProxy.ts#L110)

A trap for setting a property value.

#### Parameters

##### target

`any`

The original object which is being proxied.

##### prop

`any`

##### value

`any`

##### receiver

`any`

The object to which the assignment was originally directed.

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
setPrototypeOf(target, proto): any;
```

Defined in: [next/RequestProxy.ts:132](https://github.com/fest-live/uniform.ts/blob/37b3e597feae16da872afd10a6f2319a4c1b210a/src/next/RequestProxy.ts#L132)

A trap for `Object.setPrototypeOf()`.

#### Parameters

##### target

`any`

The original object which is being proxied.

##### proto

`any`

#### Returns

`any`

#### Implementation of

```ts
ProxyHandler.setPrototypeOf
```
