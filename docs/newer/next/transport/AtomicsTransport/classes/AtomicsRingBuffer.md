[**@fest-lib/uniform v0.1.4**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/transport/AtomicsTransport](../README.md) / AtomicsRingBuffer

# Class: AtomicsRingBuffer

Defined in: src/newer/next/transport/AtomicsTransport.ts:467

Lock-free ring buffer for high-throughput message passing

## Constructors

### Constructor

```ts
new AtomicsRingBuffer(bufferOrConfig?): AtomicsRingBuffer;
```

Defined in: src/newer/next/transport/AtomicsTransport.ts:481

#### Parameters

##### bufferOrConfig?

  \| `SharedArrayBuffer`
  \| [`RingBufferConfig`](../interfaces/RingBufferConfig.md)

#### Returns

`AtomicsRingBuffer`

## Accessors

### available

#### Get Signature

```ts
get available(): number;
```

Defined in: src/newer/next/transport/AtomicsTransport.ts:580

##### Returns

`number`

***

### buffer

#### Get Signature

```ts
get buffer(): SharedArrayBuffer;
```

Defined in: src/newer/next/transport/AtomicsTransport.ts:579

##### Returns

`SharedArrayBuffer`

***

### overflow

#### Get Signature

```ts
get overflow(): number;
```

Defined in: src/newer/next/transport/AtomicsTransport.ts:585

##### Returns

`number`

## Methods

### read()

```ts
read(): Uint8Array<ArrayBufferLike> | null;
```

Defined in: src/newer/next/transport/AtomicsTransport.ts:534

Read message from ring buffer (non-blocking)

#### Returns

`Uint8Array`\<`ArrayBufferLike`\> \| `null`

***

### waitRead()

```ts
waitRead(timeout?): Promise<Uint8Array<ArrayBufferLike> | null>;
```

Defined in: src/newer/next/transport/AtomicsTransport.ts:560

Wait for data to be available

#### Parameters

##### timeout?

`number`

#### Returns

`Promise`\<`Uint8Array`\<`ArrayBufferLike`\> \| `null`\>

***

### write()

```ts
write(data): boolean;
```

Defined in: src/newer/next/transport/AtomicsTransport.ts:504

Write message to ring buffer (non-blocking)

#### Parameters

##### data

`Uint8Array`

#### Returns

`boolean`
