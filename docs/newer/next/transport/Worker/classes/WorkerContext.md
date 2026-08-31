[**@fest-lib/uniform v0.1.17**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/transport/Worker](../README.md) / WorkerContext

# Class: WorkerContext

Defined in: src/newer/next/transport/Worker.ts:77

WorkerContext - Manages channels within a Worker

Supports observing new incoming connections from host/remote contexts.

## Constructors

### Constructor

```ts
new WorkerContext(config?): WorkerContext;
```

Defined in: src/newer/next/transport/Worker.ts:87

#### Parameters

##### config?

[`WorkerContextConfig`](../interfaces/WorkerContextConfig.md) = `{}`

#### Returns

`WorkerContext`

## Accessors

### config

#### Get Signature

```ts
get config(): Readonly<Required<WorkerContextConfig>>;
```

Defined in: src/newer/next/transport/Worker.ts:253

Get worker configuration

##### Returns

`Readonly`\<`Required`\<[`WorkerContextConfig`](../interfaces/WorkerContextConfig.md)\>\>

***

### context

#### Get Signature

```ts
get context(): ChannelContext;
```

Defined in: src/newer/next/transport/Worker.ts:246

Get the underlying context

##### Returns

[`ChannelContext`](../../../channel/ChannelContext/classes/ChannelContext.md)

***

### onChannelClosed

#### Get Signature

```ts
get onChannelClosed(): ChannelSubject<{
  channel: string;
  timestamp: number;
}>;
```

Defined in: src/newer/next/transport/Worker.ts:131

Observable: Channel closed events

##### Returns

[`ChannelSubject`](../../../observable/Observable/classes/ChannelSubject.md)\<\{
  `channel`: `string`;
  `timestamp`: `number`;
\}\>

***

### onChannelCreated

#### Get Signature

```ts
get onChannelCreated(): ChannelSubject<ChannelCreatedEvent>;
```

Defined in: src/newer/next/transport/Worker.ts:124

Observable: Channel created events

##### Returns

[`ChannelSubject`](../../../observable/Observable/classes/ChannelSubject.md)\<[`ChannelCreatedEvent`](../interfaces/ChannelCreatedEvent.md)\>

***

### onConnection

#### Get Signature

```ts
get onConnection(): ChannelSubject<IncomingConnection>;
```

Defined in: src/newer/next/transport/Worker.ts:117

Observable: New incoming connection requests

##### Returns

[`ChannelSubject`](../../../observable/Observable/classes/ChannelSubject.md)\<[`IncomingConnection`](../interfaces/IncomingConnection.md)\>

## Methods

### acceptConnection()

```ts
acceptConnection(connection): 
  | ChannelEndpoint
  | null;
```

Defined in: src/newer/next/transport/Worker.ts:160

Accept an incoming connection and create the channel

#### Parameters

##### connection

[`IncomingConnection`](../interfaces/IncomingConnection.md)

#### Returns

  \| [`ChannelEndpoint`](../../../channel/ChannelContext/interfaces/ChannelEndpoint.md)
  \| `null`

***

### close()

```ts
close(): void;
```

Defined in: src/newer/next/transport/Worker.ts:423

#### Returns

`void`

***

### closeChannel()

```ts
closeChannel(name): boolean;
```

Defined in: src/newer/next/transport/Worker.ts:235

Close a specific channel

#### Parameters

##### name

`string`

#### Returns

`boolean`

***

### createChannel()

```ts
createChannel(name, options?): ChannelEndpoint;
```

Defined in: src/newer/next/transport/Worker.ts:193

Create a new channel in this worker context

#### Parameters

##### name

`string`

##### options?

`any`

#### Returns

[`ChannelEndpoint`](../../../channel/ChannelContext/interfaces/ChannelEndpoint.md)

***

### getChannel()

```ts
getChannel(name): 
  | ChannelEndpoint
  | undefined;
```

Defined in: src/newer/next/transport/Worker.ts:200

Get an existing channel

#### Parameters

##### name

`string`

#### Returns

  \| [`ChannelEndpoint`](../../../channel/ChannelContext/interfaces/ChannelEndpoint.md)
  \| `undefined`

***

### getChannelNames()

```ts
getChannelNames(): string[];
```

Defined in: src/newer/next/transport/Worker.ts:214

Get all channel names

#### Returns

`string`[]

***

### hasChannel()

```ts
hasChannel(name): boolean;
```

Defined in: src/newer/next/transport/Worker.ts:207

Check if channel exists

#### Parameters

##### name

`string`

#### Returns

`boolean`

***

### notifyConnections()

```ts
notifyConnections(payload?, query?): number;
```

Defined in: src/newer/next/transport/Worker.ts:228

Notify active connections (useful for worker<->host sync).

#### Parameters

##### payload?

`any` = `{}`

##### query?

[`QueryConnectionsOptions`](../../../channel/ChannelContext/type-aliases/QueryConnectionsOptions.md) = `{}`

#### Returns

`number`

***

### queryConnections()

```ts
queryConnections(query?): ContextConnectionInfo[];
```

Defined in: src/newer/next/transport/Worker.ts:221

Query currently tracked channel connections in this worker.

#### Parameters

##### query?

[`QueryConnectionsOptions`](../../../channel/ChannelContext/type-aliases/QueryConnectionsOptions.md) = `{}`

#### Returns

[`ContextConnectionInfo`](../../../channel/ChannelContext/type-aliases/ContextConnectionInfo.md)[]

***

### subscribeChannelCreated()

```ts
subscribeChannelCreated(handler): Subscription;
```

Defined in: src/newer/next/transport/Worker.ts:147

Subscribe to channel creation

#### Parameters

##### handler

(`event`) => `void`

#### Returns

[`Subscription`](../../../types/Interface/interfaces/Subscription.md)

***

### subscribeConnections()

```ts
subscribeConnections(handler): Subscription;
```

Defined in: src/newer/next/transport/Worker.ts:138

Subscribe to incoming connections

#### Parameters

##### handler

(`conn`) => `void`

#### Returns

[`Subscription`](../../../types/Interface/interfaces/Subscription.md)
