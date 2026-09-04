[**@fest-lib/uniform v0.1.27**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/observable/NativeObservable](../README.md) / createChannelObservable

# Function: createChannelObservable()

```ts
function createChannelObservable(
   transport, 
   target?, 
   options?): 
  | Observable<ChannelMessage<any>>
  | ChannelObservable;
```

Defined in: uniform.ts/src/newer/next/observable/NativeObservable.ts:90

## Parameters

### transport

`string`

### target?

`string` \| `Worker` \| `MessagePort` \| `URL` \| `null`

### options?

#### handler?

[`InvokerHandler`](../../../types/Interface/type-aliases/InvokerHandler.md)\<`any`\>

#### protocols?

`string` \| `string`[]

## Returns

  \| [`Observable`](../../Observable/classes/Observable.md)\<[`ChannelMessage`](../../../types/Interface/interfaces/ChannelMessage.md)\<`any`\>\>
  \| [`ChannelObservable`](../../Observable/classes/ChannelObservable.md)
