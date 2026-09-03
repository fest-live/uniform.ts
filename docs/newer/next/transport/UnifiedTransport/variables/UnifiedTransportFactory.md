[**@fest-lib/uniform v0.1.24**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/transport/UnifiedTransport](../README.md) / UnifiedTransportFactory

# Variable: UnifiedTransportFactory

```ts
const UnifiedTransportFactory: object;
```

Defined in: uniform.ts/src/newer/next/transport/UnifiedTransport.ts:578

## Type Declaration

### atomics

```ts
atomics: object;
```

#### atomics.buffer

```ts
buffer: (size?) => AtomicsBuffer;
```

##### Parameters

###### size?

`number`

##### Returns

[`AtomicsBuffer`](../../AtomicsTransport/classes/AtomicsBuffer.md)

#### atomics.create

```ts
create: (name, send, recv, config?) => AtomicsTransport;
```

##### Parameters

###### name

`string`

###### send

`SharedArrayBuffer`

###### recv

`SharedArrayBuffer`

###### config?

[`AtomicsTransportConfig`](../../AtomicsTransport/interfaces/AtomicsTransportConfig.md)

##### Returns

[`AtomicsTransport`](../../AtomicsTransport/classes/AtomicsTransport.md)

#### atomics.createPair

```ts
createPair: (channelName, config) => AtomicsChannelPair = createAtomicsChannelPair;
```

Create a bidirectional atomics channel for main<->worker communication

##### Parameters

###### channelName

`string`

###### config?

[`AtomicsTransportConfig`](../../AtomicsTransport/interfaces/AtomicsTransportConfig.md) = `{}`

##### Returns

[`AtomicsChannelPair`](../../AtomicsTransport/interfaces/AtomicsChannelPair.md)

#### atomics.ringBuffer

```ts
ringBuffer: () => AtomicsRingBuffer;
```

##### Returns

[`AtomicsRingBuffer`](../../AtomicsTransport/classes/AtomicsRingBuffer.md)

### chrome

```ts
chrome: object;
```

#### chrome.port

```ts
port: (name, tabId?) => ChromePortObservable;
```

##### Parameters

###### name

`string`

###### tabId?

`number`

##### Returns

[`ChromePortObservable`](../../../observable/ChromeObservable/classes/ChromePortObservable.md)

#### chrome.runtime

```ts
runtime: (opts?) => ChromeRuntimeObservable;
```

##### Parameters

###### opts?

[`ChromeObservableOptions`](../../../observable/ChromeObservable/interfaces/ChromeObservableOptions.md)

##### Returns

[`ChromeRuntimeObservable`](../../../observable/ChromeObservable/classes/ChromeRuntimeObservable.md)

#### chrome.tabs

```ts
tabs: (tabId?, opts?) => ChromeTabsObservable;
```

##### Parameters

###### tabId?

`number`

###### opts?

[`ChromeObservableOptions`](../../../observable/ChromeObservable/interfaces/ChromeObservableOptions.md)

##### Returns

[`ChromeTabsObservable`](../../../observable/ChromeObservable/classes/ChromeTabsObservable.md)

### create

```ts
create: (channelName, options, config) => TransportInstance = createTransport;
```

Create transport instance based on options

#### Parameters

##### channelName

`string`

##### options?

[`TransportFactoryOptions`](../interfaces/TransportFactoryOptions.md) = `{}`

##### config?

`Partial`\<[`UnifiedTransportConfig`](../interfaces/UnifiedTransportConfig.md)\> = `{}`

#### Returns

[`TransportInstance`](../interfaces/TransportInstance.md)

### detect

```ts
detect: (transport) => TransportType = detectTransportType;
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

[`TransportType`](../../../../core/TransportCore/type-aliases/TransportType.md)

### fromBroadcast

```ts
fromBroadcast: (name, config?) => TransportInstance;
```

#### Parameters

##### name

`string`

##### config?

`Partial`\<[`UnifiedTransportConfig`](../interfaces/UnifiedTransportConfig.md)\>

#### Returns

[`TransportInstance`](../interfaces/TransportInstance.md)

### fromPort

```ts
fromPort: (port, name, config?) => TransportInstance;
```

#### Parameters

##### port

`MessagePort`

##### name

`string`

##### config?

`Partial`\<[`UnifiedTransportConfig`](../interfaces/UnifiedTransportConfig.md)\>

#### Returns

[`TransportInstance`](../interfaces/TransportInstance.md)

### fromWebSocket

```ts
fromWebSocket: (url, name, config?) => TransportInstance;
```

#### Parameters

##### url

`string`

##### name

`string`

##### config?

`Partial`\<[`UnifiedTransportConfig`](../interfaces/UnifiedTransportConfig.md)\>

#### Returns

[`TransportInstance`](../interfaces/TransportInstance.md)

### fromWorker

```ts
fromWorker: (worker, name, config?) => TransportInstance;
```

#### Parameters

##### worker

`Worker`

##### name

`string`

##### config?

`Partial`\<[`UnifiedTransportConfig`](../interfaces/UnifiedTransportConfig.md)\>

#### Returns

[`TransportInstance`](../interfaces/TransportInstance.md)

### meta

```ts
meta: (transport) => TransportMeta = getTransportMeta;
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

[`TransportMeta`](../../../../core/TransportCore/interfaces/TransportMeta.md)

### port

```ts
port: object;
```

#### port.create

```ts
create: (port, name, config?) => PortTransport;
```

##### Parameters

###### port

`MessagePort`

###### name

`string`

###### config?

[`PortTransportConfig`](../../PortTransport/interfaces/PortTransportConfig.md)

##### Returns

[`PortTransport`](../../PortTransport/classes/PortTransport.md)

#### port.createPair

```ts
createPair: (channelName, config?) => ChannelPairResult = createChannelPair;
```

Create a MessageChannel pair with configured local transport

##### Parameters

###### channelName

`string`

###### config?

[`PortTransportConfig`](../../PortTransport/interfaces/PortTransportConfig.md)

##### Returns

[`ChannelPairResult`](../../PortTransport/interfaces/ChannelPairResult.md)

#### port.pool

```ts
pool: (config?) => PortPool;
```

##### Parameters

###### config?

[`PortTransportConfig`](../../PortTransport/interfaces/PortTransportConfig.md)

##### Returns

[`PortPool`](../../PortTransport/classes/PortPool.md)

#### port.windowConnector

```ts
windowConnector: (target, name) => WindowPortConnector;
```

##### Parameters

###### target

`Window`

###### name

`string`

##### Returns

[`WindowPortConnector`](../../PortTransport/classes/WindowPortConnector.md)

### registry

```ts
registry: () => TransportRegistry = getTransportRegistry;
```

#### Returns

`TransportRegistry`

### rtc

```ts
rtc: object;
```

#### rtc.manager

```ts
manager: (name, config?) => RTCPeerManager;
```

##### Parameters

###### name

`string`

###### config?

[`RTCTransportConfig`](../../RTCDataChannelTransport/interfaces/RTCTransportConfig.md)

##### Returns

[`RTCPeerManager`](../../RTCDataChannelTransport/classes/RTCPeerManager.md)

#### rtc.peer

```ts
peer: (name, config?) => RTCPeerTransport;
```

##### Parameters

###### name

`string`

###### config?

[`RTCTransportConfig`](../../RTCDataChannelTransport/interfaces/RTCTransportConfig.md)

##### Returns

[`RTCPeerTransport`](../../RTCDataChannelTransport/classes/RTCPeerTransport.md)

#### rtc.signaling

```ts
signaling: (channelName) => RTCSignaling & object = createBroadcastSignaling;
```

Simple signaling using BroadcastChannel (for same-origin peers)

##### Parameters

###### channelName

`string`

##### Returns

[`RTCSignaling`](../../RTCDataChannelTransport/interfaces/RTCSignaling.md) & `object`

### serviceWorker

```ts
serviceWorker: object;
```

#### serviceWorker.client

```ts
client: (name) => ServiceWorkerClient;
```

##### Parameters

###### name

`string`

##### Returns

[`ServiceWorkerClient`](../../ServiceWorkerHost/classes/ServiceWorkerClient.md)

#### serviceWorker.host

```ts
host: (config) => ServiceWorkerHost;
```

##### Parameters

###### config

[`SWHostConfig`](../../ServiceWorkerHost/interfaces/SWHostConfig.md)

##### Returns

[`ServiceWorkerHost`](../../ServiceWorkerHost/classes/ServiceWorkerHost.md)

### sharedWorker

```ts
sharedWorker: object;
```

#### sharedWorker.client

```ts
client: (url, name, opts?) => SharedWorkerClient;
```

##### Parameters

###### url

`string` \| `URL`

###### name

`string`

###### opts?

[`SharedWorkerOptions`](../../SharedWorkerTransport/interfaces/SharedWorkerOptions.md)

##### Returns

[`SharedWorkerClient`](../../SharedWorkerTransport/classes/SharedWorkerClient.md)

#### sharedWorker.host

```ts
host: (name) => SharedWorkerHost;
```

##### Parameters

###### name

`string`

##### Returns

[`SharedWorkerHost`](../../SharedWorkerTransport/classes/SharedWorkerHost.md)

### socketio

```ts
socketio: (socket, name, opts?) => SocketIOObservable;
```

#### Parameters

##### socket

[`SocketIOLike`](../../../observable/SocketIOObservable/interfaces/SocketIOLike.md)

##### name

`string`

##### opts?

[`SocketObservableOptions`](../../../observable/SocketIOObservable/interfaces/SocketObservableOptions.md)

#### Returns

[`SocketIOObservable`](../../../observable/SocketIOObservable/classes/SocketIOObservable.md)

### storage

```ts
storage: object;
```

#### storage.create

```ts
create: <T>(config) => TransferableStorage<T>;
```

##### Type Parameters

###### T

`T`

##### Parameters

###### config

[`TransferableStorageConfig`](../../../storage/TransferableStorage/interfaces/TransferableStorageConfig.md)

##### Returns

[`TransferableStorage`](../../../storage/TransferableStorage/classes/TransferableStorage.md)\<`T`\>

#### storage.messageQueue

```ts
messageQueue: (dbName?) => MessageQueueStorage;
```

##### Parameters

###### dbName?

`string`

##### Returns

[`MessageQueueStorage`](../../../storage/TransferableStorage/classes/MessageQueueStorage.md)
