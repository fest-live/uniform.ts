[**@fest-lib/uniform v0.1.29**](../../README.md)

***

[@fest-lib/uniform](../../README.md) / [newer](../README.md) / BroadcastLike

# Interface: BroadcastLike

Defined in: uniform.ts/src/newer/index.ts:452

## Properties

### addEventListener

```ts
addEventListener: (type, listener) => void;
```

Defined in: uniform.ts/src/newer/index.ts:453

#### Parameters

##### type

`"message"` \| `"error"`

##### listener

(...`args`) => `any`

#### Returns

`void`

***

### close?

```ts
optional close?: () => void;
```

Defined in: uniform.ts/src/newer/index.ts:456

#### Returns

`void`

***

### postMessage

```ts
postMessage: (message, transfer?) => void;
```

Defined in: uniform.ts/src/newer/index.ts:455

#### Parameters

##### message

`any`

##### transfer?

`any`

#### Returns

`void`

***

### removeEventListener?

```ts
optional removeEventListener?: (type, listener) => void;
```

Defined in: uniform.ts/src/newer/index.ts:454

#### Parameters

##### type

`"message"` \| `"error"`

##### listener

(...`args`) => `any`

#### Returns

`void`

***

### start?

```ts
optional start?: () => void;
```

Defined in: uniform.ts/src/newer/index.ts:457

#### Returns

`void`
