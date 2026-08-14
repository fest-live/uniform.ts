[**@fest-lib/uniform v0.1.11**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/proxy/Invoker](../README.md) / BidirectionalInvoker

# Class: BidirectionalInvoker

Defined in: src/newer/next/proxy/Invoker.ts:234

## Constructors

### Constructor

```ts
new BidirectionalInvoker(config): BidirectionalInvoker;
```

Defined in: src/newer/next/proxy/Invoker.ts:239

#### Parameters

##### config

[`InvokerConfig`](../interfaces/InvokerConfig.md)

#### Returns

`BidirectionalInvoker`

## Properties

### requestor

```ts
readonly requestor: Requestor;
```

Defined in: src/newer/next/proxy/Invoker.ts:235

***

### responder

```ts
readonly responder: Responder;
```

Defined in: src/newer/next/proxy/Invoker.ts:236

## Accessors

### contextType

#### Get Signature

```ts
get contextType(): ContextType;
```

Defined in: src/newer/next/proxy/Invoker.ts:254

##### Returns

[`ContextType`](../type-aliases/ContextType.md)

## Methods

### close()

```ts
close(): void;
```

Defined in: src/newer/next/proxy/Invoker.ts:255

#### Returns

`void`

***

### connect()

```ts
connect(target): this;
```

Defined in: src/newer/next/proxy/Invoker.ts:245

#### Parameters

##### target

`any`

#### Returns

`this`

***

### createProxy()

```ts
createProxy<T>(targetChannel, basePath?): T;
```

Defined in: src/newer/next/proxy/Invoker.ts:252

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

### expose()

```ts
expose(name, obj): this;
```

Defined in: src/newer/next/proxy/Invoker.ts:251

#### Parameters

##### name

`string`

##### obj

`any`

#### Returns

`this`

***

### importModule()

```ts
importModule<T>(targetChannel, url): Promise<T>;
```

Defined in: src/newer/next/proxy/Invoker.ts:253

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
