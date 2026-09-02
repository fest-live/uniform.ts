[**@fest-lib/uniform v0.1.20**](../../../../README.md)

***

[@fest-lib/uniform](../../../../README.md) / [newer/messaging/Protocol](../README.md) / UniformProtocolEnvelope

# Interface: UniformProtocolEnvelope\<T\>

Defined in: src/newer/messaging/Protocol.ts:55

## Type Parameters

### T

`T` = `unknown`

## Properties

### args?

```ts
optional args?: unknown[];
```

Defined in: src/newer/messaging/Protocol.ts:63

***

### bridges

```ts
bridges: string[];
```

Defined in: src/newer/messaging/Protocol.ts:69

***

### contentType?

```ts
optional contentType?: string;
```

Defined in: src/newer/messaging/Protocol.ts:81

***

### data

```ts
data: T;
```

Defined in: src/newer/messaging/Protocol.ts:80

***

### defer?

```ts
optional defer?: UniformDeferMode;
```

Defined in: src/newer/messaging/Protocol.ts:73

***

### destination?

```ts
optional destination?: string;
```

Defined in: src/newer/messaging/Protocol.ts:79

***

### dstChannel?

```ts
optional dstChannel?: string | string[];
```

Defined in: src/newer/messaging/Protocol.ts:75

***

### error?

```ts
optional error?: string;
```

Defined in: src/newer/messaging/Protocol.ts:65

***

### extension?

```ts
optional extension?: unknown;
```

Defined in: src/newer/messaging/Protocol.ts:72

***

### flags

```ts
flags: Record<string, unknown>;
```

Defined in: src/newer/messaging/Protocol.ts:59

***

### id

```ts
id: string;
```

Defined in: src/newer/messaging/Protocol.ts:77

***

### metadata

```ts
metadata: Record<string, unknown>;
```

Defined in: src/newer/messaging/Protocol.ts:82

***

### op?

```ts
optional op?: UniformOperation;
```

Defined in: src/newer/messaging/Protocol.ts:64

***

### path?

```ts
optional path?: string[];
```

Defined in: src/newer/messaging/Protocol.ts:61

***

### payload?

```ts
optional payload?: T;
```

Defined in: src/newer/messaging/Protocol.ts:70

***

### protocol

```ts
protocol: UniformProtocolName;
```

Defined in: src/newer/messaging/Protocol.ts:57

***

### purpose

```ts
purpose: UniformPurpose[];
```

Defined in: src/newer/messaging/Protocol.ts:56

***

### redirect

```ts
redirect: boolean;
```

Defined in: src/newer/messaging/Protocol.ts:58

***

### result?

```ts
optional result?: unknown;
```

Defined in: src/newer/messaging/Protocol.ts:62

***

### source

```ts
source: string;
```

Defined in: src/newer/messaging/Protocol.ts:78

***

### srcChannel

```ts
srcChannel: string;
```

Defined in: src/newer/messaging/Protocol.ts:74

***

### timestamp

```ts
timestamp: number;
```

Defined in: src/newer/messaging/Protocol.ts:66

***

### transfer?

```ts
optional transfer?: unknown[];
```

Defined in: src/newer/messaging/Protocol.ts:71

***

### type

```ts
type: UniformEnvelopeType;
```

Defined in: src/newer/messaging/Protocol.ts:60

***

### uuid

```ts
uuid: string;
```

Defined in: src/newer/messaging/Protocol.ts:68

***

### where?

```ts
optional where?: string;
```

Defined in: src/newer/messaging/Protocol.ts:67
