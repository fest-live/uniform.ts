[**@fest-lib/uniform v0.1.4**](../../../../README.md)

***

[@fest-lib/uniform](../../../../README.md) / [newer/core/TransportCore](../README.md) / createWebSocketTransport

# Function: createWebSocketTransport()

```ts
function createWebSocketTransport(url, options?): object;
```

Defined in: src/newer/core/TransportCore.ts:488

## Parameters

### url

`string`

### options?

[`WebSocketOptions`](../interfaces/WebSocketOptions.md) = `{}`

## Returns

`object`

### close

```ts
close: () => void;
```

#### Returns

`void`

### listen

```ts
listen: (handler) => () => void;
```

#### Parameters

##### handler

(`data`) => `void`

#### Returns

() => `void`

### reconnect

```ts
reconnect: () => void;
```

#### Returns

`void`

### send

```ts
send: SendFn;
```

### socket

```ts
socket: WebSocket;
```
