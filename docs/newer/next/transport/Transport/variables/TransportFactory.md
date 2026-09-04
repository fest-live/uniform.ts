[**@fest-lib/uniform v0.1.27**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/transport/Transport](../README.md) / TransportFactory

# Variable: TransportFactory

```ts
const TransportFactory: object;
```

Defined in: uniform.ts/src/newer/next/transport/Transport.ts:728

## Type Declaration

### broadcast

```ts
broadcast: (name, bcName?, opts?) => BroadcastChannelTransport;
```

#### Parameters

##### name

`string`

##### bcName?

`string`

##### opts?

[`ConnectionOptions`](../../../types/Interface/interfaces/ConnectionOptions.md)

#### Returns

[`BroadcastChannelTransport`](../classes/BroadcastChannelTransport.md)

### chromeExternal

```ts
chromeExternal: (name, externalId, opts?) => ChromeExternalTransport;
```

#### Parameters

##### name

`string`

##### externalId

`string`

##### opts?

[`ConnectionOptions`](../../../types/Interface/interfaces/ConnectionOptions.md)

#### Returns

[`ChromeExternalTransport`](../classes/ChromeExternalTransport.md)

### chromePort

```ts
chromePort: (name, portName, tabId?, opts?) => ChromePortTransport;
```

#### Parameters

##### name

`string`

##### portName

`string`

##### tabId?

`number`

##### opts?

[`ConnectionOptions`](../../../types/Interface/interfaces/ConnectionOptions.md)

#### Returns

[`ChromePortTransport`](../classes/ChromePortTransport.md)

### chromeRuntime

```ts
chromeRuntime: (name, opts?) => ChromeRuntimeTransport;
```

#### Parameters

##### name

`string`

##### opts?

[`ConnectionOptions`](../../../types/Interface/interfaces/ConnectionOptions.md)

#### Returns

[`ChromeRuntimeTransport`](../classes/ChromeRuntimeTransport.md)

### chromeTabs

```ts
chromeTabs: (name, tabId?, opts?) => ChromeTabsTransport;
```

#### Parameters

##### name

`string`

##### tabId?

`number`

##### opts?

[`ConnectionOptions`](../../../types/Interface/interfaces/ConnectionOptions.md)

#### Returns

[`ChromeTabsTransport`](../classes/ChromeTabsTransport.md)

### messagePort

```ts
messagePort: (name, port, opts?) => MessagePortTransport;
```

#### Parameters

##### name

`string`

##### port

`MessagePort`

##### opts?

[`ConnectionOptions`](../../../types/Interface/interfaces/ConnectionOptions.md)

#### Returns

[`MessagePortTransport`](../classes/MessagePortTransport.md)

### self

```ts
self: (name, opts?) => SelfTransport;
```

#### Parameters

##### name

`string`

##### opts?

[`ConnectionOptions`](../../../types/Interface/interfaces/ConnectionOptions.md)

#### Returns

[`SelfTransport`](../classes/SelfTransport.md)

### serviceWorker

```ts
serviceWorker: (name, isHost?, opts?) => ServiceWorkerTransport;
```

#### Parameters

##### name

`string`

##### isHost?

`boolean`

##### opts?

[`ConnectionOptions`](../../../types/Interface/interfaces/ConnectionOptions.md)

#### Returns

[`ServiceWorkerTransport`](../classes/ServiceWorkerTransport.md)

### websocket

```ts
websocket: (name, url, protocols?, opts?) => WebSocketTransport;
```

#### Parameters

##### name

`string`

##### url

`string` \| `URL`

##### protocols?

`string` \| `string`[]

##### opts?

[`ConnectionOptions`](../../../types/Interface/interfaces/ConnectionOptions.md)

#### Returns

[`WebSocketTransport`](../classes/WebSocketTransport.md)

### worker

```ts
worker: (name, source, opts?) => WorkerTransport;
```

#### Parameters

##### name

`string`

##### source

`string` \| `Worker` \| `URL` \| (() => `Worker`)

##### opts?

[`ConnectionOptions`](../../../types/Interface/interfaces/ConnectionOptions.md)

#### Returns

[`WorkerTransport`](../classes/WorkerTransport.md)
