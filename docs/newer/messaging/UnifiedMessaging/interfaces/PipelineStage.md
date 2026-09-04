[**@fest-lib/uniform v0.1.28**](../../../../README.md)

***

[@fest-lib/uniform](../../../../README.md) / [newer/messaging/UnifiedMessaging](../README.md) / PipelineStage

# Interface: PipelineStage

Defined in: uniform.ts/src/newer/messaging/UnifiedMessaging.ts:76

## Properties

### handler

```ts
handler: (message) => 
  | UnifiedMessage<unknown>
| Promise<UnifiedMessage<unknown>>;
```

Defined in: uniform.ts/src/newer/messaging/UnifiedMessaging.ts:78

#### Parameters

##### message

[`UnifiedMessage`](UnifiedMessage.md)

#### Returns

  \| [`UnifiedMessage`](UnifiedMessage.md)\<`unknown`\>
  \| `Promise`\<[`UnifiedMessage`](UnifiedMessage.md)\<`unknown`\>\>

***

### name

```ts
name: string;
```

Defined in: uniform.ts/src/newer/messaging/UnifiedMessaging.ts:77

***

### retries?

```ts
optional retries?: number;
```

Defined in: uniform.ts/src/newer/messaging/UnifiedMessaging.ts:80

***

### timeout?

```ts
optional timeout?: number;
```

Defined in: uniform.ts/src/newer/messaging/UnifiedMessaging.ts:79
