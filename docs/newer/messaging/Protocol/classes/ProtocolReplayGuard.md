[**@fest-lib/uniform v0.1.22**](../../../../README.md)

***

[@fest-lib/uniform](../../../../README.md) / [newer/messaging/Protocol](../README.md) / ProtocolReplayGuard

# Class: ProtocolReplayGuard

Defined in: src/newer/messaging/Protocol.ts:221

## Constructors

### Constructor

```ts
new ProtocolReplayGuard(windowMs?): ProtocolReplayGuard;
```

Defined in: src/newer/messaging/Protocol.ts:225

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

Defined in: src/newer/messaging/Protocol.ts:229

#### Parameters

##### envelope

[`UniformProtocolEnvelope`](../interfaces/UniformProtocolEnvelope.md)

#### Returns

`boolean`
