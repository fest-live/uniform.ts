[**@fest-lib/uniform v0.1.28**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/transport/AtomicsTransport](../README.md) / AtomicsBuffer

# Class: AtomicsBuffer

Defined in: uniform.ts/src/newer/next/transport/AtomicsTransport.ts:127

## Constructors

### Constructor

```ts
new AtomicsBuffer(bufferOrSize?, _config?): AtomicsBuffer;
```

Defined in: uniform.ts/src/newer/next/transport/AtomicsTransport.ts:133

#### Parameters

##### bufferOrSize?

`number` \| `SharedArrayBuffer`

##### \_config?

[`AtomicsTransportConfig`](../interfaces/AtomicsTransportConfig.md) = `{}`

#### Returns

`AtomicsBuffer`

## Accessors

### buffer

#### Get Signature

```ts
get buffer(): SharedArrayBuffer;
```

Defined in: uniform.ts/src/newer/next/transport/AtomicsTransport.ts:250

##### Returns

`SharedArrayBuffer`

***

### currentSeq

#### Get Signature

```ts
get currentSeq(): number;
```

Defined in: uniform.ts/src/newer/next/transport/AtomicsTransport.ts:251

##### Returns

`number`

## Methods

### read()

```ts
read(): Promise<
  | {
  data: Uint8Array;
  flags: number;
  seq: number;
}
| null>;
```

Defined in: uniform.ts/src/newer/next/transport/AtomicsTransport.ts:195

Read message from shared buffer

#### Returns

`Promise`\<
  \| \{
  `data`: `Uint8Array`;
  `flags`: `number`;
  `seq`: `number`;
\}
  \| `null`\>

***

### waitAck()

```ts
waitAck(expectedSeq): Promise<boolean>;
```

Defined in: uniform.ts/src/newer/next/transport/AtomicsTransport.ts:231

Wait for acknowledgment

#### Parameters

##### expectedSeq

`number`

#### Returns

`Promise`\<`boolean`\>

***

### write()

```ts
write(data, flags?): Promise<boolean>;
```

Defined in: uniform.ts/src/newer/next/transport/AtomicsTransport.ts:151

Write message to shared buffer with lock

#### Parameters

##### data

`Uint8Array`

##### flags?

`number` = `0`

#### Returns

`Promise`\<`boolean`\>
