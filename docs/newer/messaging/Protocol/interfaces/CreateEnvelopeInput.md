[**@fest-lib/uniform v0.1.25**](../../../../README.md)

***

[@fest-lib/uniform](../../../../README.md) / [newer/messaging/Protocol](../README.md) / CreateEnvelopeInput

# Interface: CreateEnvelopeInput\<T\>

Defined in: uniform.ts/src/newer/messaging/Protocol.ts:85

## Extends

- [`LegacyUnifiedMessage`](LegacyUnifiedMessage.md)\<`T`\>

## Type Parameters

### T

`T` = `unknown`

## Properties

### args?

```ts
optional args?: unknown;
```

Defined in: uniform.ts/src/newer/messaging/Protocol.ts:92

***

### bridges?

```ts
optional bridges?: string[];
```

Defined in: uniform.ts/src/newer/messaging/Protocol.ts:98

***

### contentType?

```ts
optional contentType?: string;
```

Defined in: uniform.ts/src/newer/messaging/Protocol.ts:50

#### Inherited from

[`LegacyUnifiedMessage`](LegacyUnifiedMessage.md).[`contentType`](LegacyUnifiedMessage.md#contenttype)

***

### data?

```ts
optional data?: T;
```

Defined in: uniform.ts/src/newer/messaging/Protocol.ts:51

#### Inherited from

[`LegacyUnifiedMessage`](LegacyUnifiedMessage.md).[`data`](LegacyUnifiedMessage.md#data)

***

### defer?

```ts
optional defer?: UniformDeferMode;
```

Defined in: uniform.ts/src/newer/messaging/Protocol.ts:102

***

### destination?

```ts
optional destination?: string;
```

Defined in: uniform.ts/src/newer/messaging/Protocol.ts:49

#### Inherited from

[`LegacyUnifiedMessage`](LegacyUnifiedMessage.md).[`destination`](LegacyUnifiedMessage.md#destination)

***

### dstChannel?

```ts
optional dstChannel?: string | string[];
```

Defined in: uniform.ts/src/newer/messaging/Protocol.ts:104

***

### error?

```ts
optional error?: string;
```

Defined in: uniform.ts/src/newer/messaging/Protocol.ts:94

***

### extension?

```ts
optional extension?: unknown;
```

Defined in: uniform.ts/src/newer/messaging/Protocol.ts:101

***

### flags?

```ts
optional flags?: Record<string, unknown>;
```

Defined in: uniform.ts/src/newer/messaging/Protocol.ts:89

***

### id?

```ts
optional id?: string;
```

Defined in: uniform.ts/src/newer/messaging/Protocol.ts:46

#### Inherited from

[`LegacyUnifiedMessage`](LegacyUnifiedMessage.md).[`id`](LegacyUnifiedMessage.md#id)

***

### metadata?

```ts
optional metadata?: Record<string, unknown>;
```

Defined in: uniform.ts/src/newer/messaging/Protocol.ts:52

#### Inherited from

[`LegacyUnifiedMessage`](LegacyUnifiedMessage.md).[`metadata`](LegacyUnifiedMessage.md#metadata)

***

### op?

```ts
optional op?: UniformOperation;
```

Defined in: uniform.ts/src/newer/messaging/Protocol.ts:93

***

### path?

```ts
optional path?: string | string[];
```

Defined in: uniform.ts/src/newer/messaging/Protocol.ts:90

***

### payload?

```ts
optional payload?: T;
```

Defined in: uniform.ts/src/newer/messaging/Protocol.ts:99

***

### protocol?

```ts
optional protocol?: UniformProtocolName;
```

Defined in: uniform.ts/src/newer/messaging/Protocol.ts:87

***

### purpose?

```ts
optional purpose?: 
  | UniformPurpose
  | UniformPurpose[];
```

Defined in: uniform.ts/src/newer/messaging/Protocol.ts:86

***

### redirect?

```ts
optional redirect?: boolean;
```

Defined in: uniform.ts/src/newer/messaging/Protocol.ts:88

***

### result?

```ts
optional result?: unknown;
```

Defined in: uniform.ts/src/newer/messaging/Protocol.ts:91

***

### source?

```ts
optional source?: string;
```

Defined in: uniform.ts/src/newer/messaging/Protocol.ts:48

#### Inherited from

[`LegacyUnifiedMessage`](LegacyUnifiedMessage.md).[`source`](LegacyUnifiedMessage.md#source)

***

### srcChannel?

```ts
optional srcChannel?: string;
```

Defined in: uniform.ts/src/newer/messaging/Protocol.ts:103

***

### timestamp?

```ts
optional timestamp?: number;
```

Defined in: uniform.ts/src/newer/messaging/Protocol.ts:95

***

### transfer?

```ts
optional transfer?: unknown;
```

Defined in: uniform.ts/src/newer/messaging/Protocol.ts:100

***

### type?

```ts
optional type?: string;
```

Defined in: uniform.ts/src/newer/messaging/Protocol.ts:47

#### Inherited from

[`LegacyUnifiedMessage`](LegacyUnifiedMessage.md).[`type`](LegacyUnifiedMessage.md#type)

***

### uuid?

```ts
optional uuid?: string;
```

Defined in: uniform.ts/src/newer/messaging/Protocol.ts:97

***

### where?

```ts
optional where?: string;
```

Defined in: uniform.ts/src/newer/messaging/Protocol.ts:96
