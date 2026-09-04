[**@fest-lib/uniform v0.1.28**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/proxy/Invoker](../README.md) / Responder

# Class: Responder

Defined in: uniform.ts/src/newer/next/proxy/Invoker.ts:199

## Constructors

### Constructor

```ts
new Responder(config): Responder;
```

Defined in: uniform.ts/src/newer/next/proxy/Invoker.ts:203

#### Parameters

##### config

[`InvokerConfig`](../interfaces/InvokerConfig.md)

#### Returns

`Responder`

## Accessors

### contextType

#### Get Signature

```ts
get contextType(): ContextType;
```

Defined in: uniform.ts/src/newer/next/proxy/Invoker.ts:226

##### Returns

[`ContextType`](../type-aliases/ContextType.md)

***

### onInvocation

#### Get Signature

```ts
get onInvocation(): ChannelSubject<IncomingInvocation>;
```

Defined in: uniform.ts/src/newer/next/proxy/Invoker.ts:222

##### Returns

[`ChannelSubject`](../../../observable/Observable/classes/ChannelSubject.md)\<[`IncomingInvocation`](../interfaces/IncomingInvocation.md)\>

## Methods

### close()

```ts
close(): void;
```

Defined in: uniform.ts/src/newer/next/proxy/Invoker.ts:227

#### Returns

`void`

***

### expose()

```ts
expose(name, obj): this;
```

Defined in: uniform.ts/src/newer/next/proxy/Invoker.ts:217

#### Parameters

##### name

`string`

##### obj

`any`

#### Returns

`this`

***

### listen()

```ts
listen(source, options?): this;
```

Defined in: uniform.ts/src/newer/next/proxy/Invoker.ts:212

#### Parameters

##### source

`any`

##### options?

[`ConnectOptions`](../../../channel/UnifiedChannel/interfaces/ConnectOptions.md)

#### Returns

`this`

***

### subscribeInvocations()

```ts
subscribeInvocations(handler): Subscription;
```

Defined in: uniform.ts/src/newer/next/proxy/Invoker.ts:223

#### Parameters

##### handler

(`inv`) => `void`

#### Returns

[`Subscription`](../../../types/Interface/interfaces/Subscription.md)
