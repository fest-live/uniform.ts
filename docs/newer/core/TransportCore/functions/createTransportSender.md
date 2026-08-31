[**@fest-lib/uniform v0.1.18**](../../../../README.md)

***

[@fest-lib/uniform](../../../../README.md) / [newer/core/TransportCore](../README.md) / createTransportSender

# Function: createTransportSender()

```ts
function createTransportSender(transport, options?): SendFn<ChannelMessage<any>>;
```

Defined in: src/newer/core/TransportCore.ts:147

Create send function for any transport type

## Parameters

### transport

[`TransportTarget`](../type-aliases/TransportTarget.md)

### options?

#### clientId?

`string`

#### externalId?

`string`

#### portName?

`string`

#### socketEvent?

`string`

#### tabId?

`number`

## Returns

[`SendFn`](../type-aliases/SendFn.md)\<[`ChannelMessage`](../../../next/types/Interface/interfaces/ChannelMessage.md)\<`any`\>\>
