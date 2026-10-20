[**@fest-lib/uniform v0.1.34**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/types/Interface](../README.md) / Producer

# Type Alias: Producer\<T\>

```ts
type Producer<T> = (subscriber) => (() => void) | void;
```

Defined in: modules/projects/uniform.ts/src/newer/next/types/Interface.ts:118

Observable producer function

## Type Parameters

### T

`T` = `any`

## Parameters

### subscriber

[`Subscriber`](../interfaces/Subscriber.md)\<`T`\>

## Returns

(() => `void`) \| `void`
