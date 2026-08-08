[**@fest-lib/uniform v0.1.3**](../../../../README.md)

***

[@fest-lib/uniform](../../../../README.md) / [newer/messaging/Protocol](../README.md) / CreateEnvelopeInput

# Interface: CreateEnvelopeInput\<T\>

Defined in: src/newer/messaging/Protocol.ts:78

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

Defined in: src/newer/messaging/Protocol.ts:85

***

### bridges?

```ts
optional bridges?: string[];
```

Defined in: src/newer/messaging/Protocol.ts:91

***

### contentType?

```ts
optional contentType?: string;
```

Defined in: src/newer/messaging/Protocol.ts:43

#### Inherited from

[`LegacyUnifiedMessage`](LegacyUnifiedMessage.md).[`contentType`](LegacyUnifiedMessage.md#contenttype)

***

### data?

```ts
optional data?: T;
```

Defined in: src/newer/messaging/Protocol.ts:44

#### Inherited from

[`LegacyUnifiedMessage`](LegacyUnifiedMessage.md).[`data`](LegacyUnifiedMessage.md#data)

***

### defer?

```ts
optional defer?: UniformDeferMode;
```

Defined in: src/newer/messaging/Protocol.ts:95

***

### destination?

```ts
optional destination?: string;
```

Defined in: src/newer/messaging/Protocol.ts:42

#### Inherited from

[`LegacyUnifiedMessage`](LegacyUnifiedMessage.md).[`destination`](LegacyUnifiedMessage.md#destination)

***

### dstChannel?

```ts
optional dstChannel?: string | string[];
```

Defined in: src/newer/messaging/Protocol.ts:97

***

### error?

```ts
optional error?: string;
```

Defined in: src/newer/messaging/Protocol.ts:87

***

### extension?

```ts
optional extension?: unknown;
```

Defined in: src/newer/messaging/Protocol.ts:94

***

### flags?

```ts
optional flags?: Record<string, unknown>;
```

Defined in: src/newer/messaging/Protocol.ts:82

***

### id?

```ts
optional id?: string;
```

Defined in: src/newer/messaging/Protocol.ts:39

#### Inherited from

[`LegacyUnifiedMessage`](LegacyUnifiedMessage.md).[`id`](LegacyUnifiedMessage.md#id)

***

### metadata?

```ts
optional metadata?: Record<string, unknown>;
```

Defined in: src/newer/messaging/Protocol.ts:45

#### Inherited from

[`LegacyUnifiedMessage`](LegacyUnifiedMessage.md).[`metadata`](LegacyUnifiedMessage.md#metadata)

***

### op?

```ts
optional op?: UniformOperation;
```

Defined in: src/newer/messaging/Protocol.ts:86

***

### path?

```ts
optional path?: string | string[];
```

Defined in: src/newer/messaging/Protocol.ts:83

***

### payload?

```ts
optional payload?: T;
```

Defined in: src/newer/messaging/Protocol.ts:92

***

### protocol?

```ts
optional protocol?: UniformProtocolName;
```

Defined in: src/newer/messaging/Protocol.ts:80

***

### purpose?

```ts
optional purpose?: 
  | UniformPurpose
  | UniformPurpose[];
```

Defined in: src/newer/messaging/Protocol.ts:79

***

### redirect?

```ts
optional redirect?: boolean;
```

Defined in: src/newer/messaging/Protocol.ts:81

***

### result?

```ts
optional result?: unknown;
```

Defined in: src/newer/messaging/Protocol.ts:84

***

### source?

```ts
optional source?: string;
```

Defined in: src/newer/messaging/Protocol.ts:41

#### Inherited from

[`LegacyUnifiedMessage`](LegacyUnifiedMessage.md).[`source`](LegacyUnifiedMessage.md#source)

***

### srcChannel?

```ts
optional srcChannel?: string;
```

Defined in: src/newer/messaging/Protocol.ts:96

***

### timestamp?

```ts
optional timestamp?: number;
```

Defined in: src/newer/messaging/Protocol.ts:88

***

### transfer?

```ts
optional transfer?: unknown;
```

Defined in: src/newer/messaging/Protocol.ts:93

***

### type?

```ts
optional type?: string;
```

Defined in: src/newer/messaging/Protocol.ts:40

#### Inherited from

[`LegacyUnifiedMessage`](LegacyUnifiedMessage.md).[`type`](LegacyUnifiedMessage.md#type)

***

### uuid?

```ts
optional uuid?: string;
```

Defined in: src/newer/messaging/Protocol.ts:90

***

### where?

```ts
optional where?: string;
```

Defined in: src/newer/messaging/Protocol.ts:89
