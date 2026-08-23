[**@fest-lib/uniform v0.1.13**](../../../../README.md)

***

[@fest-lib/uniform](../../../../README.md) / [newer/messaging/Protocol](../README.md) / UniformProtocolEnvelope

# Interface: UniformProtocolEnvelope\<T\>

Defined in: src/newer/messaging/Protocol.ts:48

## Type Parameters

### T

`T` = `unknown`

## Properties

### args?

```ts
optional args?: unknown[];
```

Defined in: src/newer/messaging/Protocol.ts:56

***

### bridges

```ts
bridges: string[];
```

Defined in: src/newer/messaging/Protocol.ts:62

***

### contentType?

```ts
optional contentType?: string;
```

Defined in: src/newer/messaging/Protocol.ts:74

***

### data

```ts
data: T;
```

Defined in: src/newer/messaging/Protocol.ts:73

***

### defer?

```ts
optional defer?: UniformDeferMode;
```

Defined in: src/newer/messaging/Protocol.ts:66

***

### destination?

```ts
optional destination?: string;
```

Defined in: src/newer/messaging/Protocol.ts:72

***

### dstChannel?

```ts
optional dstChannel?: string | string[];
```

Defined in: src/newer/messaging/Protocol.ts:68

***

### error?

```ts
optional error?: string;
```

Defined in: src/newer/messaging/Protocol.ts:58

***

### extension?

```ts
optional extension?: unknown;
```

Defined in: src/newer/messaging/Protocol.ts:65

***

### flags

```ts
flags: Record<string, unknown>;
```

Defined in: src/newer/messaging/Protocol.ts:52

***

### id

```ts
id: string;
```

Defined in: src/newer/messaging/Protocol.ts:70

***

### metadata

```ts
metadata: Record<string, unknown>;
```

Defined in: src/newer/messaging/Protocol.ts:75

***

### op?

```ts
optional op?: UniformOperation;
```

Defined in: src/newer/messaging/Protocol.ts:57

***

### path?

```ts
optional path?: string[];
```

Defined in: src/newer/messaging/Protocol.ts:54

***

### payload?

```ts
optional payload?: T;
```

Defined in: src/newer/messaging/Protocol.ts:63

***

### protocol

```ts
protocol: UniformProtocolName;
```

Defined in: src/newer/messaging/Protocol.ts:50

***

### purpose

```ts
purpose: UniformPurpose[];
```

Defined in: src/newer/messaging/Protocol.ts:49

***

### redirect

```ts
redirect: boolean;
```

Defined in: src/newer/messaging/Protocol.ts:51

***

### result?

```ts
optional result?: unknown;
```

Defined in: src/newer/messaging/Protocol.ts:55

***

### source

```ts
source: string;
```

Defined in: src/newer/messaging/Protocol.ts:71

***

### srcChannel

```ts
srcChannel: string;
```

Defined in: src/newer/messaging/Protocol.ts:67

***

### timestamp

```ts
timestamp: number;
```

Defined in: src/newer/messaging/Protocol.ts:59

***

### transfer?

```ts
optional transfer?: unknown[];
```

Defined in: src/newer/messaging/Protocol.ts:64

***

### type

```ts
type: UniformEnvelopeType;
```

Defined in: src/newer/messaging/Protocol.ts:53

***

### uuid

```ts
uuid: string;
```

Defined in: src/newer/messaging/Protocol.ts:61

***

### where?

```ts
optional where?: string;
```

Defined in: src/newer/messaging/Protocol.ts:60
