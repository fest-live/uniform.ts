[**@fest-lib/uniform v0.1.2**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/observable/ChromeObservable](../README.md) / createChromeRequestHandler

# Function: createChromeRequestHandler()

```ts
function createChromeRequestHandler(channelName, handlers): InvokerHandler<ChromeMessage<any>>;
```

Defined in: src/newer/next/observable/ChromeObservable.ts:243

## Parameters

### channelName

`string`

### handlers

`Record`\<`string`, (`args`, `data`) => `any` \| `Promise`\<`any`\>\>

## Returns

[`InvokerHandler`](../../../types/Interface/type-aliases/InvokerHandler.md)\<[`ChromeMessage`](../interfaces/ChromeMessage.md)\<`any`\>\>
