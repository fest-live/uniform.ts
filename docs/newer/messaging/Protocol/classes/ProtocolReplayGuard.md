[**@fest-lib/uniform v0.1.4**](../../../../README.md)

***

[@fest-lib/uniform](../../../../README.md) / [newer/messaging/Protocol](../README.md) / ProtocolReplayGuard

# Class: ProtocolReplayGuard

Defined in: src/newer/messaging/Protocol.ts:213

## Constructors

### Constructor

```ts
new ProtocolReplayGuard(windowMs?): ProtocolReplayGuard;
```

Defined in: src/newer/messaging/Protocol.ts:217

#### Parameters

##### windowMs?

`number` = `300`

#### Returns

`ProtocolReplayGuard`

## Methods

### accept()

```ts
accept(envelope): boolean;
```

Defined in: src/newer/messaging/Protocol.ts:221

#### Parameters

##### envelope

[`UniformProtocolEnvelope`](../interfaces/UniformProtocolEnvelope.md)

#### Returns

`boolean`
