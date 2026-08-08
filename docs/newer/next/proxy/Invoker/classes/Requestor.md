[**@fest-lib/uniform v0.1.3**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/proxy/Invoker](../README.md) / Requestor

# Class: Requestor

Defined in: src/newer/next/proxy/Invoker.ts:144

## Constructors

### Constructor

```ts
new Requestor(config): Requestor;
```

Defined in: src/newer/next/proxy/Invoker.ts:148

#### Parameters

##### config

[`InvokerConfig`](../interfaces/InvokerConfig.md)

#### Returns

`Requestor`

## Accessors

### contextType

#### Get Signature

```ts
get contextType(): ContextType;
```

Defined in: src/newer/next/proxy/Invoker.ts:191

##### Returns

[`ContextType`](../type-aliases/ContextType.md)

***

### onResponse

#### Get Signature

```ts
get onResponse(): ChannelSubject<InvocationResponse>;
```

Defined in: src/newer/next/proxy/Invoker.ts:190

##### Returns

[`ChannelSubject`](../../../observable/Observable/classes/ChannelSubject.md)\<[`InvocationResponse`](../interfaces/InvocationResponse.md)\>

## Methods

### call()

```ts
call<T>(
   targetChannel, 
   path, 
args?): Promise<T>;
```

Defined in: src/newer/next/proxy/Invoker.ts:174

#### Type Parameters

##### T

`T` = `any`

#### Parameters

##### targetChannel

`string`

##### path

`string`[]

##### args?

`any`[] = `[]`

#### Returns

`Promise`\<`T`\>

***

### close()

```ts
close(): void;
```

Defined in: src/newer/next/proxy/Invoker.ts:192

#### Returns

`void`

***

### connect()

```ts
connect(target, options?): this;
```

Defined in: src/newer/next/proxy/Invoker.ts:157

#### Parameters

##### target

`any`

##### options?

[`ConnectOptions`](../../../channel/UnifiedChannel/interfaces/ConnectOptions.md)

#### Returns

`this`

***

### construct()

```ts
construct<T>(
   targetChannel, 
   path, 
args?): Promise<T>;
```

Defined in: src/newer/next/proxy/Invoker.ts:178

#### Type Parameters

##### T

`T` = `any`

#### Parameters

##### targetChannel

`string`

##### path

`string`[]

##### args?

`any`[] = `[]`

#### Returns

`Promise`\<`T`\>

***

### createProxy()

```ts
createProxy<T>(targetChannel, basePath?): T;
```

Defined in: src/newer/next/proxy/Invoker.ts:186

#### Type Parameters

##### T

`T` = `any`

#### Parameters

##### targetChannel

`string`

##### basePath?

`string`[] = `[]`

#### Returns

`T`

***

### get()

```ts
get<T>(
   targetChannel, 
   path, 
prop): Promise<T>;
```

Defined in: src/newer/next/proxy/Invoker.ts:166

#### Type Parameters

##### T

`T` = `any`

#### Parameters

##### targetChannel

`string`

##### path

`string`[]

##### prop

`string`

#### Returns

`Promise`\<`T`\>

***

### importModule()

```ts
importModule<T>(targetChannel, url): Promise<T>;
```

Defined in: src/newer/next/proxy/Invoker.ts:182

#### Type Parameters

##### T

`T` = `any`

#### Parameters

##### targetChannel

`string`

##### url

`string`

#### Returns

`Promise`\<`T`\>

***

### invoke()

```ts
invoke<T>(
   targetChannel, 
   action, 
   path, 
args?): Promise<T>;
```

Defined in: src/newer/next/proxy/Invoker.ts:162

#### Type Parameters

##### T

`T` = `any`

#### Parameters

##### targetChannel

`string`

##### action

[`WReflectAction`](../../../types/Interface/enumerations/WReflectAction.md)

##### path

`string`[]

##### args?

`any`[] = `[]`

#### Returns

`Promise`\<`T`\>

***

### set()

```ts
set(
   targetChannel, 
   path, 
   prop, 
value): Promise<boolean>;
```

Defined in: src/newer/next/proxy/Invoker.ts:170

#### Parameters

##### targetChannel

`string`

##### path

`string`[]

##### prop

`string`

##### value

`any`

#### Returns

`Promise`\<`boolean`\>
