[**@fest-lib/uniform v0.1.2**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/proxy/RequestProxy](../README.md) / createObservableChannel

# ~~Function: createObservableChannel()~~

```ts
function createObservableChannel(transport, channelName): object;
```

Defined in: src/newer/next/proxy/RequestProxy.ts:122

## Parameters

### transport

  \| `Worker`
  \| `MessagePort`
  \| `BroadcastChannel`
  \| `WebSocket`
  \| `"chrome-runtime"`
  \| `"service-worker-client"`
  \| `"self"`

### channelName

`string`

## Returns

`object`

### ~~observable~~

```ts
observable: UnifiedChannel = channel;
```

### ~~request~~

```ts
request: (msg) => Promise<any>;
```

#### Parameters

##### msg

`any`

#### Returns

`Promise`\<`any`\>

### ~~send~~

```ts
send: (msg) => void;
```

#### Parameters

##### msg

`any`

#### Returns

`void`

### ~~subscribe~~

```ts
subscribe: (obs) => Subscription;
```

#### Parameters

##### obs

`any`

#### Returns

[`Subscription`](../../../types/Interface/interfaces/Subscription.md)

### ~~wrap~~

```ts
wrap: (connectChannel, opts?) => any;
```

#### Parameters

##### connectChannel

`string`

##### opts?

`any`

#### Returns

`any`

## Deprecated

Use createUnifiedChannel instead
