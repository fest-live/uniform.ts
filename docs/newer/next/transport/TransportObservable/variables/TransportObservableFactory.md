[**@fest-lib/uniform v0.1.17**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/transport/TransportObservable](../README.md) / TransportObservableFactory

# Variable: TransportObservableFactory

```ts
const TransportObservableFactory: object;
```

Defined in: src/newer/next/transport/TransportObservable.ts:303

## Type Declaration

### broadcast

```ts
broadcast: (name) => BroadcastChannelObservable;
```

#### Parameters

##### name

`string`

#### Returns

[`BroadcastChannelObservable`](../classes/BroadcastChannelObservable.md)

### chromePort

```ts
chromePort: (portName, tabId?) => ChromePortObservable;
```

#### Parameters

##### portName

`string`

##### tabId?

`number`

#### Returns

[`ChromePortObservable`](../classes/ChromePortObservable.md)

### chromeRuntime

```ts
chromeRuntime: () => ChromeRuntimeObservable;
```

#### Returns

[`ChromeRuntimeObservable`](../classes/ChromeRuntimeObservable.md)

### chromeTabs

```ts
chromeTabs: (tabId?) => ChromeTabsObservable;
```

#### Parameters

##### tabId?

`number`

#### Returns

[`ChromeTabsObservable`](../classes/ChromeTabsObservable.md)

### messageChannel

```ts
messageChannel: () => object;
```

#### Returns

`object`

##### port1

```ts
port1: MessagePortObservable;
```

##### port2

```ts
port2: MessagePortObservable;
```

### messagePort

```ts
messagePort: (p) => MessagePortObservable;
```

#### Parameters

##### p

`MessagePort`

#### Returns

[`MessagePortObservable`](../classes/MessagePortObservable.md)

### self

```ts
self: () => SelfObservable;
```

#### Returns

[`SelfObservable`](../classes/SelfObservable.md)

### serviceWorkerClient

```ts
serviceWorkerClient: () => ServiceWorkerClientObservable;
```

#### Returns

[`ServiceWorkerClientObservable`](../classes/ServiceWorkerClientObservable.md)

### serviceWorkerHost

```ts
serviceWorkerHost: () => ServiceWorkerHostObservable;
```

#### Returns

[`ServiceWorkerHostObservable`](../classes/ServiceWorkerHostObservable.md)

### websocket

```ts
websocket: (url, protocols?) => WebSocketObservable;
```

#### Parameters

##### url

`string` \| `URL`

##### protocols?

`string` \| `string`[]

#### Returns

[`WebSocketObservable`](../classes/WebSocketObservable.md)

### worker

```ts
worker: (w) => WorkerObservable;
```

#### Parameters

##### w

`Worker`

#### Returns

[`WorkerObservable`](../classes/WorkerObservable.md)

### workerFromUrl

```ts
workerFromUrl: (url, opts?) => WorkerObservable;
```

#### Parameters

##### url

`string` \| `URL`

##### opts?

`WorkerOptions`

#### Returns

[`WorkerObservable`](../classes/WorkerObservable.md)
