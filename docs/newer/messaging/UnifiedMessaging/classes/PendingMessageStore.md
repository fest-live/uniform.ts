[**@fest-lib/uniform v0.1.17**](../../../../README.md)

***

[@fest-lib/uniform](../../../../README.md) / [newer/messaging/UnifiedMessaging](../README.md) / PendingMessageStore

# Class: PendingMessageStore

Defined in: src/newer/messaging/UnifiedMessaging.ts:116

## Constructors

### Constructor

```ts
new PendingMessageStore(options?): PendingMessageStore;
```

Defined in: src/newer/messaging/UnifiedMessaging.ts:121

#### Parameters

##### options?

###### defaultTTLMs?

`number`

###### maxMessages?

`number`

###### storageKey?

`string`

#### Returns

`PendingMessageStore`

## Methods

### clear()

```ts
clear(): void;
```

Defined in: src/newer/messaging/UnifiedMessaging.ts:207

#### Returns

`void`

***

### drain()

```ts
drain(destination): UnifiedMessage<unknown>[];
```

Defined in: src/newer/messaging/UnifiedMessaging.ts:173

#### Parameters

##### destination

`string`

#### Returns

[`UnifiedMessage`](../interfaces/UnifiedMessage.md)\<`unknown`\>[]

***

### enqueue()

```ts
enqueue(destination, message): void;
```

Defined in: src/newer/messaging/UnifiedMessaging.ts:148

#### Parameters

##### destination

`string`

##### message

[`UnifiedMessage`](../interfaces/UnifiedMessage.md)

#### Returns

`void`

***

### has()

```ts
has(destination): boolean;
```

Defined in: src/newer/messaging/UnifiedMessaging.ts:196

#### Parameters

##### destination

`string`

#### Returns

`boolean`
