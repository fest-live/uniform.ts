[**@fest-lib/uniform v0.1.4**](../../README.md)

***

[@fest-lib/uniform](../../README.md) / [original](../README.md) / BroadcastLike

# Interface: BroadcastLike

Defined in: src/original/index.ts:14

## Properties

### addEventListener

```ts
addEventListener: (type, listener) => void;
```

Defined in: src/original/index.ts:15

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

Defined in: src/original/index.ts:18

#### Returns

`void`

***

### postMessage

```ts
postMessage: (message, transfer?) => void;
```

Defined in: src/original/index.ts:17

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

Defined in: src/original/index.ts:16

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

Defined in: src/original/index.ts:19

#### Returns

`void`
