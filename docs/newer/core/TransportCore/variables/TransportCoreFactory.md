[**@fest-lib/uniform v0.1.19**](../../../../README.md)

***

[@fest-lib/uniform](../../../../README.md) / [newer/core/TransportCore](../README.md) / TransportCoreFactory

# Variable: TransportCoreFactory

```ts
const TransportCoreFactory: object;
```

Defined in: src/newer/core/TransportCore.ts:580

## Type Declaration

### broadcast

```ts
broadcast: (channelName) => object = createBroadcastTransport;
```

#### Parameters

##### channelName

`string`

#### Returns

`object`

##### channel

```ts
channel: BroadcastChannel;
```

##### close

```ts
close: () => void;
```

###### Returns

`void`

##### listen

```ts
listen: (handler) => () => void;
```

###### Parameters

###### handler

(`data`) => `void`

###### Returns

() => `void`

##### send

```ts
send: SendFn;
```

### chrome

```ts
chrome: object;
```

#### chrome.createListener

```ts
createListener: (onMessage, options?) => () => void = createChromeListener;
```

##### Parameters

###### onMessage

(`msg`, `sendResponse`, `sender?`) => `boolean` \| `void`

###### options?

###### external?

`boolean`

##### Returns

() => `void`

#### chrome.createTabsListener

```ts
createTabsListener: (tabId, onMessage) => () => void = createChromeTabsListener;
```

##### Parameters

###### tabId

`number`

###### onMessage

(`msg`, `sender?`) => `void`

##### Returns

() => `void`

### createListener

```ts
createListener: (transport, onMessage, onError?, onClose?, options?) => () => void = createTransportListener;
```

Create listener setup for any transport type
Returns cleanup function

#### Parameters

##### transport

[`TransportTarget`](../type-aliases/TransportTarget.md)

##### onMessage

(`data`) => `void`

##### onError?

(`err`) => `void`

##### onClose?

() => `void`

##### options?

###### portName?

`string`

###### socketEvents?

`string`[]

###### tabId?

`number`

#### Returns

() => `void`

### createSender

```ts
createSender: (transport, options?) => SendFn<ChannelMessage<any>> = createTransportSender;
```

Create send function for any transport type

#### Parameters

##### transport

[`TransportTarget`](../type-aliases/TransportTarget.md)

##### options?

###### clientId?

`string`

###### externalId?

`string`

###### portName?

`string`

###### socketEvent?

`string`

###### tabId?

`number`

#### Returns

[`SendFn`](../type-aliases/SendFn.md)\<[`ChannelMessage`](../../../next/types/Interface/interfaces/ChannelMessage.md)\<`any`\>\>

### detectType

```ts
detectType: (transport) => TransportType = detectTransportType;
```

#### Parameters

##### transport

  \| `string`
  \| `Worker`
  \| `SharedWorker`
  \| `MessagePort`
  \| `BroadcastChannel`
  \| `WebSocket`
  \| `null`
  \| `undefined`

#### Returns

[`TransportType`](../type-aliases/TransportType.md)

### getMeta

```ts
getMeta: (transport) => TransportMeta = getTransportMeta;
```

#### Parameters

##### transport

  \| `string`
  \| `Worker`
  \| `SharedWorker`
  \| `MessagePort`
  \| `BroadcastChannel`
  \| `WebSocket`
  \| `null`
  \| `undefined`

#### Returns

[`TransportMeta`](../interfaces/TransportMeta.md)

### websocket

```ts
websocket: (url, options) => object = createWebSocketTransport;
```

#### Parameters

##### url

`string`

##### options?

[`WebSocketOptions`](../interfaces/WebSocketOptions.md) = `{}`

#### Returns

`object`

##### close

```ts
close: () => void;
```

###### Returns

`void`

##### listen

```ts
listen: (handler) => () => void;
```

###### Parameters

###### handler

(`data`) => `void`

###### Returns

() => `void`

##### reconnect

```ts
reconnect: () => void;
```

###### Returns

`void`

##### send

```ts
send: SendFn;
```

##### socket

```ts
socket: WebSocket;
```
