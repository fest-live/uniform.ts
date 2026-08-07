[**@fest-lib/uniform v0.1.2**](../../../../README.md)

***

[@fest-lib/uniform](../../../../README.md) / [original/next/RequestProxy](../README.md) / DispatchProxyHandler

# Class: DispatchProxyHandler

Defined in: src/original/next/RequestProxy.ts:39

## Implements

- `ProxyHandler`\<`Function`\>

## Constructors

### Constructor

```ts
new DispatchProxyHandler(dispatcher): DispatchProxyHandler;
```

Defined in: src/original/next/RequestProxy.ts:40

#### Parameters

##### dispatcher

`any`

#### Returns

`DispatchProxyHandler`

## Properties

### dispatcher

```ts
dispatcher: any;
```

Defined in: src/original/next/RequestProxy.ts:40

## Methods

### apply()

```ts
apply(...args): any;
```

Defined in: src/original/next/RequestProxy.ts:84

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

### call()

```ts
call(...args): any;
```

Defined in: src/original/next/RequestProxy.ts:88

#### Parameters

##### args

...`any`[]

#### Returns

`any`

***

### construct()

```ts
construct(...args): any;
```

Defined in: src/original/next/RequestProxy.ts:92

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

Defined in: src/original/next/RequestProxy.ts:56

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

Defined in: src/original/next/RequestProxy.ts:44

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

Defined in: src/original/next/RequestProxy.ts:60

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

Defined in: src/original/next/RequestProxy.ts:64

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

Defined in: src/original/next/RequestProxy.ts:52

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

Defined in: src/original/next/RequestProxy.ts:72

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

Defined in: src/original/next/RequestProxy.ts:80

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

Defined in: src/original/next/RequestProxy.ts:76

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

Defined in: src/original/next/RequestProxy.ts:48

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

Defined in: src/original/next/RequestProxy.ts:68

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
