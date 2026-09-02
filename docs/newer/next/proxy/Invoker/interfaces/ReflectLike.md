[**@fest-lib/uniform v0.1.20**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/proxy/Invoker](../README.md) / ReflectLike

# Interface: ReflectLike

Defined in: src/newer/next/proxy/Invoker.ts:36

ReflectLike interface

## Methods

### apply()?

```ts
optional apply(
   target, 
   thisArg, 
   args): any;
```

Defined in: src/newer/next/proxy/Invoker.ts:40

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

Defined in: src/newer/next/proxy/Invoker.ts:41

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

Defined in: src/newer/next/proxy/Invoker.ts:42

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

Defined in: src/newer/next/proxy/Invoker.ts:37

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

Defined in: src/newer/next/proxy/Invoker.ts:44

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

Defined in: src/newer/next/proxy/Invoker.ts:45

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

Defined in: src/newer/next/proxy/Invoker.ts:39

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

Defined in: src/newer/next/proxy/Invoker.ts:47

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

Defined in: src/newer/next/proxy/Invoker.ts:43

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

Defined in: src/newer/next/proxy/Invoker.ts:48

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

Defined in: src/newer/next/proxy/Invoker.ts:38

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

Defined in: src/newer/next/proxy/Invoker.ts:46

#### Parameters

##### target

`any`

##### proto

`object` \| `null`

#### Returns

`boolean`
