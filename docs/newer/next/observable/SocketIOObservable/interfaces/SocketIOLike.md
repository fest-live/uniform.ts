[**@fest-lib/uniform v0.1.15**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/observable/SocketIOObservable](../README.md) / SocketIOLike

# Interface: SocketIOLike

Defined in: src/newer/next/observable/SocketIOObservable.ts:15

## Properties

### connected?

```ts
optional connected?: boolean;
```

Defined in: src/newer/next/observable/SocketIOObservable.ts:21

## Methods

### connect()?

```ts
optional connect(): void;
```

Defined in: src/newer/next/observable/SocketIOObservable.ts:19

#### Returns

`void`

***

### disconnect()?

```ts
optional disconnect(): void;
```

Defined in: src/newer/next/observable/SocketIOObservable.ts:20

#### Returns

`void`

***

### emit()

```ts
emit(event, ...args): void;
```

Defined in: src/newer/next/observable/SocketIOObservable.ts:18

#### Parameters

##### event

`string`

##### args

...`any`[]

#### Returns

`void`

***

### off()

```ts
off(event, listener): void;
```

Defined in: src/newer/next/observable/SocketIOObservable.ts:17

#### Parameters

##### event

`string`

##### listener

(...`args`) => `void`

#### Returns

`void`

***

### on()

```ts
on(event, listener): void;
```

Defined in: src/newer/next/observable/SocketIOObservable.ts:16

#### Parameters

##### event

`string`

##### listener

(...`args`) => `void`

#### Returns

`void`
