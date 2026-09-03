[**@fest-lib/uniform v0.1.24**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/transport/AtomicsTransport](../README.md) / AtomicsTransportFactory

# Variable: AtomicsTransportFactory

```ts
const AtomicsTransportFactory: object;
```

Defined in: uniform.ts/src/newer/next/transport/AtomicsTransport.ts:592

## Type Declaration

### create

```ts
create: (name, send, recv, config?) => AtomicsTransport;
```

#### Parameters

##### name

`string`

##### send

`SharedArrayBuffer`

##### recv

`SharedArrayBuffer`

##### config?

[`AtomicsTransportConfig`](../interfaces/AtomicsTransportConfig.md)

#### Returns

[`AtomicsTransport`](../classes/AtomicsTransport.md)

### createBuffer

```ts
createBuffer: (sizeOrBuffer?, config?) => AtomicsBuffer;
```

#### Parameters

##### sizeOrBuffer?

`number` \| `SharedArrayBuffer`

##### config?

[`AtomicsTransportConfig`](../interfaces/AtomicsTransportConfig.md)

#### Returns

[`AtomicsBuffer`](../classes/AtomicsBuffer.md)

### createPair

```ts
createPair: (name, config?) => AtomicsChannelPair;
```

#### Parameters

##### name

`string`

##### config?

[`AtomicsTransportConfig`](../interfaces/AtomicsTransportConfig.md)

#### Returns

[`AtomicsChannelPair`](../interfaces/AtomicsChannelPair.md)

### createRingBuffer

```ts
createRingBuffer: (config?) => AtomicsRingBuffer;
```

#### Parameters

##### config?

[`RingBufferConfig`](../interfaces/RingBufferConfig.md)

#### Returns

[`AtomicsRingBuffer`](../classes/AtomicsRingBuffer.md)

### getCBOR

```ts
getCBOR: () => Promise<CBOREncoder> = getCBOREncoder;
```

#### Returns

`Promise`\<`CBOREncoder`\>
