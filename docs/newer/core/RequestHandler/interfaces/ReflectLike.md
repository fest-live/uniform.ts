[**@fest-lib/uniform v0.1.19**](../../../../README.md)

***

[@fest-lib/uniform](../../../../README.md) / [newer/core/RequestHandler](../README.md) / ReflectLike

# Interface: ReflectLike

Defined in: src/newer/core/RequestHandler.ts:44

Reflect-like interface for custom implementations

## Methods

### apply()?

```ts
optional apply(
   target, 
   thisArg, 
   args): any;
```

Defined in: src/newer/core/RequestHandler.ts:48

#### Parameters

##### target

`any`

##### thisArg

`any`

##### args

`any`[]

#### Returns

`any`

***

### construct()?

```ts
optional construct(target, args): any;
```

Defined in: src/newer/core/RequestHandler.ts:49

#### Parameters

##### target

`any`

##### args

`any`[]

#### Returns

`any`

***

### deleteProperty()?

```ts
optional deleteProperty(target, prop): boolean;
```

Defined in: src/newer/core/RequestHandler.ts:50

#### Parameters

##### target

`any`

##### prop

`PropertyKey`

#### Returns

`boolean`

***

### get()?

```ts
optional get(target, prop): any;
```

Defined in: src/newer/core/RequestHandler.ts:45

#### Parameters

##### target

`any`

##### prop

`PropertyKey`

#### Returns

`any`

***

### getOwnPropertyDescriptor()?

```ts
optional getOwnPropertyDescriptor(target, prop): PropertyDescriptor | undefined;
```

Defined in: src/newer/core/RequestHandler.ts:52

#### Parameters

##### target

`any`

##### prop

`PropertyKey`

#### Returns

`PropertyDescriptor` \| `undefined`

***

### getPrototypeOf()?

```ts
optional getPrototypeOf(target): object | null;
```

Defined in: src/newer/core/RequestHandler.ts:53

#### Parameters

##### target

`any`

#### Returns

`object` \| `null`

***

### has()?

```ts
optional has(target, prop): boolean;
```

Defined in: src/newer/core/RequestHandler.ts:47

#### Parameters

##### target

`any`

##### prop

`PropertyKey`

#### Returns

`boolean`

***

### isExtensible()?

```ts
optional isExtensible(target): boolean;
```

Defined in: src/newer/core/RequestHandler.ts:55

#### Parameters

##### target

`any`

#### Returns

`boolean`

***

### ownKeys()?

```ts
optional ownKeys(target): (string | symbol)[];
```

Defined in: src/newer/core/RequestHandler.ts:51

#### Parameters

##### target

`any`

#### Returns

(`string` \| `symbol`)[]

***

### preventExtensions()?

```ts
optional preventExtensions(target): boolean;
```

Defined in: src/newer/core/RequestHandler.ts:56

#### Parameters

##### target

`any`

#### Returns

`boolean`

***

### set()?

```ts
optional set(
   target, 
   prop, 
   value): boolean;
```

Defined in: src/newer/core/RequestHandler.ts:46

#### Parameters

##### target

`any`

##### prop

`PropertyKey`

##### value

`any`

#### Returns

`boolean`

***

### setPrototypeOf()?

```ts
optional setPrototypeOf(target, proto): boolean;
```

Defined in: src/newer/core/RequestHandler.ts:54

#### Parameters

##### target

`any`

##### proto

`object` \| `null`

#### Returns

`boolean`
