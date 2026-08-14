[**@fest-lib/uniform v0.1.8**](../../../../README.md)

***

[@fest-lib/uniform](../../../../README.md) / [newer/messaging/UnifiedMessaging](../README.md) / MessageHandler

# Interface: MessageHandler\<T\>

Defined in: src/newer/messaging/UnifiedMessaging.ts:52

## Type Parameters

### T

`T` = `unknown`

## Properties

### canHandle

```ts
canHandle: (message) => boolean;
```

Defined in: src/newer/messaging/UnifiedMessaging.ts:53

#### Parameters

##### message

[`UnifiedMessage`](UnifiedMessage.md)\<`T`\>

#### Returns

`boolean`

***

### handle

```ts
handle: (message) => void | Promise<void>;
```

Defined in: src/newer/messaging/UnifiedMessaging.ts:54

#### Parameters

##### message

[`UnifiedMessage`](UnifiedMessage.md)\<`T`\>

#### Returns

`void` \| `Promise`\<`void`\>
