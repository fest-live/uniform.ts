[**@fest-lib/uniform v0.1.25**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/channel/UnifiedChannel](../README.md) / TransportBinding

# Interface: TransportBinding\<TTransport\>

Defined in: uniform.ts/src/newer/next/channel/UnifiedChannel.ts:1051

Transport binding info

## Type Parameters

### TTransport

`TTransport` = [`NativeChannelTransport`](../../ChannelContext/type-aliases/NativeChannelTransport.md)

## Properties

### addEventListener?

```ts
optional addEventListener?: (type, listener) => void;
```

Defined in: uniform.ts/src/newer/next/channel/UnifiedChannel.ts:1058

#### Parameters

##### type

`string`

##### listener

`EventListener`

#### Returns

`void`

***

### cleanup?

```ts
optional cleanup?: () => void;
```

Defined in: uniform.ts/src/newer/next/channel/UnifiedChannel.ts:1056

#### Returns

`void`

***

### close?

```ts
optional close?: () => void;
```

Defined in: uniform.ts/src/newer/next/channel/UnifiedChannel.ts:1061

#### Returns

`void`

***

### postMessage

```ts
postMessage: (message, options?) => void;
```

Defined in: uniform.ts/src/newer/next/channel/UnifiedChannel.ts:1057

#### Parameters

##### message

`any`

##### options?

`any`

#### Returns

`void`

***

### removeEventListener?

```ts
optional removeEventListener?: (type, listener) => void;
```

Defined in: uniform.ts/src/newer/next/channel/UnifiedChannel.ts:1059

#### Parameters

##### type

`string`

##### listener

`EventListener`

#### Returns

`void`

***

### sender

```ts
sender: (msg, transfer?) => void;
```

Defined in: uniform.ts/src/newer/next/channel/UnifiedChannel.ts:1055

#### Parameters

##### msg

`any`

##### transfer?

`Transferable`[]

#### Returns

`void`

***

### start?

```ts
optional start?: () => void;
```

Defined in: uniform.ts/src/newer/next/channel/UnifiedChannel.ts:1060

#### Returns

`void`

***

### target

```ts
target: TTransport;
```

Defined in: uniform.ts/src/newer/next/channel/UnifiedChannel.ts:1052

***

### targetChannel

```ts
targetChannel: string;
```

Defined in: uniform.ts/src/newer/next/channel/UnifiedChannel.ts:1053

***

### transportType

```ts
transportType: TransportType;
```

Defined in: uniform.ts/src/newer/next/channel/UnifiedChannel.ts:1054
