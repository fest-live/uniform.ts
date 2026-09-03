[**@fest-lib/uniform v0.1.24**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/channel/ChannelContext](../README.md) / ChannelContext

# Class: ChannelContext

Defined in: uniform.ts/src/newer/next/channel/ChannelContext.ts:411

Channel Context - Manages multiple channels in a single context

Use this when you need multiple independent channels in the same
JavaScript context (same window, iframe, worker, etc.)

Supports:
- Creating multiple channels at once or deferred
- Dynamic transport addition (workers, ports, sockets, etc.)
- Global self/globalThis as default target

## Constructors

### Constructor

```ts
new ChannelContext(_options?): ChannelContext;
```

Defined in: uniform.ts/src/newer/next/channel/ChannelContext.ts:428

#### Parameters

##### \_options?

[`ChannelContextOptions`](../interfaces/ChannelContextOptions.md) = `{}`

#### Returns

`ChannelContext`

## Accessors

### closed

#### Get Signature

```ts
get closed(): boolean;
```

Defined in: uniform.ts/src/newer/next/channel/ChannelContext.ts:1113

Check if context is closed

##### Returns

`boolean`

***

### globalSelf

#### Get Signature

```ts
get globalSelf(): typeof globalThis | null;
```

Defined in: uniform.ts/src/newer/next/channel/ChannelContext.ts:918

Get the global self reference

##### Returns

*typeof* `globalThis` \| `null`

***

### hostName

#### Get Signature

```ts
get hostName(): string;
```

Defined in: uniform.ts/src/newer/next/channel/ChannelContext.ts:482

Get host name

##### Returns

`string`

***

### id

#### Get Signature

```ts
get id(): string;
```

Defined in: uniform.ts/src/newer/next/channel/ChannelContext.ts:489

Get context ID

##### Returns

`string`

***

### onConnection

#### Get Signature

```ts
get onConnection(): ChannelSubject<ConnectionEvent>;
```

Defined in: uniform.ts/src/newer/next/channel/ChannelContext.ts:496

Observable: connection events in this context

##### Returns

[`ChannelSubject`](../../../observable/Observable/classes/ChannelSubject.md)\<[`ConnectionEvent`](../interfaces/ConnectionEvent.md)\>

***

### size

#### Get Signature

```ts
get size(): number;
```

Defined in: uniform.ts/src/newer/next/channel/ChannelContext.ts:628

Get total number of channels

##### Returns

`number`

## Methods

### $createOrUseExistingRemote()

```ts
$createOrUseExistingRemote(
   channel, 
   options?, 
   broadcast): RemoteChannelInfo | null;
```

Defined in: uniform.ts/src/newer/next/channel/ChannelContext.ts:954

Internal: Create or use existing remote channel

#### Parameters

##### channel

`string`

##### options?

[`ConnectionOptions`](../../../types/Interface/interfaces/ConnectionOptions.md) = `{}`

##### broadcast

  \| [`NativeChannelTransport`](../type-aliases/NativeChannelTransport.md)
  \| [`TransportBinding`](../../UnifiedChannel/interfaces/TransportBinding.md)\<[`NativeChannelTransport`](../type-aliases/NativeChannelTransport.md)\>
  \| `null`

#### Returns

[`RemoteChannelInfo`](../interfaces/RemoteChannelInfo.md) \| `null`

***

### $forwardUnifiedConnectionEvent()

```ts
$forwardUnifiedConnectionEvent(channel, event): void;
```

Defined in: uniform.ts/src/newer/next/channel/ChannelContext.ts:1044

#### Parameters

##### channel

`string`

##### event

[`UnifiedConnectionEvent`](../../UnifiedChannel/type-aliases/UnifiedConnectionEvent.md)

#### Returns

`void`

***

### $markNotified()

```ts
$markNotified(params): void;
```

Defined in: uniform.ts/src/newer/next/channel/ChannelContext.ts:1007

#### Parameters

##### params

###### direction

[`ConnectionDirection`](../../internal/ConnectionModel/type-aliases/ConnectionDirection.md)

###### localChannel

`string`

###### payload?

`any`

###### remoteChannel

`string`

###### sender

`string`

###### transportType

  \| `"chrome-runtime"`
  \| `"chrome-tabs"`
  \| `"chrome-port"`
  \| `"chrome-external"`
  \| `"socket-io"`
  \| `"shared-worker"`
  \| `"rtc-data"`
  \| `"atomics"`
  \| `"self"`
  \| `"worker"`
  \| `"service-worker"`
  \| `"broadcast"`
  \| `"message-port"`
  \| `"websocket"`
  \| `"internal"`
  \| `"rtc"`
  \| `"ring-buffer"`

#### Returns

`void`

***

### $observeSignal()

```ts
$observeSignal(params): void;
```

Defined in: uniform.ts/src/newer/next/channel/ChannelContext.ts:1025

#### Parameters

##### params

###### localChannel

`string`

###### payload?

`any`

###### remoteChannel

`string`

###### sender

`string`

###### transportType

  \| `"chrome-runtime"`
  \| `"chrome-tabs"`
  \| `"chrome-port"`
  \| `"chrome-external"`
  \| `"socket-io"`
  \| `"shared-worker"`
  \| `"rtc-data"`
  \| `"atomics"`
  \| `"self"`
  \| `"worker"`
  \| `"service-worker"`
  \| `"broadcast"`
  \| `"message-port"`
  \| `"websocket"`
  \| `"internal"`
  \| `"rtc"`
  \| `"ring-buffer"`

#### Returns

`void`

***

### $registerConnection()

```ts
$registerConnection(params): ContextConnectionInfo;
```

Defined in: uniform.ts/src/newer/next/channel/ChannelContext.ts:993

#### Parameters

##### params

###### direction

[`ConnectionDirection`](../../internal/ConnectionModel/type-aliases/ConnectionDirection.md)

###### localChannel

`string`

###### metadata?

`Record`\<`string`, `any`\>

###### remoteChannel

`string`

###### sender

`string`

###### transportType

  \| `"chrome-runtime"`
  \| `"chrome-tabs"`
  \| `"chrome-port"`
  \| `"chrome-external"`
  \| `"socket-io"`
  \| `"shared-worker"`
  \| `"rtc-data"`
  \| `"atomics"`
  \| `"self"`
  \| `"worker"`
  \| `"service-worker"`
  \| `"broadcast"`
  \| `"message-port"`
  \| `"websocket"`
  \| `"internal"`
  \| `"rtc"`
  \| `"ring-buffer"`

#### Returns

[`ContextConnectionInfo`](../type-aliases/ContextConnectionInfo.md)

***

### addBroadcast()

```ts
addBroadcast(
   name, 
   broadcastName?, 
options?): Promise<ChannelEndpoint>;
```

Defined in: uniform.ts/src/newer/next/channel/ChannelContext.ts:769

Add a BroadcastChannel dynamically

#### Parameters

##### name

`string`

Channel name (also used as BroadcastChannel name if not provided)

##### broadcastName?

`string`

Optional BroadcastChannel name (defaults to channel name)

##### options?

[`ConnectionOptions`](../../../types/Interface/interfaces/ConnectionOptions.md) = `{}`

Connection options

#### Returns

`Promise`\<[`ChannelEndpoint`](../interfaces/ChannelEndpoint.md)\>

***

### addPort()

```ts
addPort(
   name, 
   port, 
options?): Promise<ChannelEndpoint>;
```

Defined in: uniform.ts/src/newer/next/channel/ChannelContext.ts:729

Add a MessagePort channel dynamically

#### Parameters

##### name

`string`

Channel name

##### port

`MessagePort`

MessagePort instance

##### options?

[`ConnectionOptions`](../../../types/Interface/interfaces/ConnectionOptions.md) = `{}`

Connection options

#### Returns

`Promise`\<[`ChannelEndpoint`](../interfaces/ChannelEndpoint.md)\>

***

### addSelfChannel()

```ts
addSelfChannel(name, options?): ChannelEndpoint;
```

Defined in: uniform.ts/src/newer/next/channel/ChannelContext.ts:808

Add a channel using self/globalThis (for same-context communication)

#### Parameters

##### name

`string`

Channel name

##### options?

[`ConnectionOptions`](../../../types/Interface/interfaces/ConnectionOptions.md) = `{}`

Connection options

#### Returns

[`ChannelEndpoint`](../interfaces/ChannelEndpoint.md)

***

### addTransport()

```ts
addTransport(name, config): Promise<ChannelEndpoint>;
```

Defined in: uniform.ts/src/newer/next/channel/ChannelContext.ts:836

Add channel with dynamic transport configuration

#### Parameters

##### name

`string`

Channel name

##### config

[`DynamicTransportConfig`](../interfaces/DynamicTransportConfig.md)

Transport configuration

#### Returns

`Promise`\<[`ChannelEndpoint`](../interfaces/ChannelEndpoint.md)\>

***

### addWorker()

```ts
addWorker(
   name, 
   worker, 
options?): Promise<ChannelEndpoint>;
```

Defined in: uniform.ts/src/newer/next/channel/ChannelContext.ts:686

Add a Worker channel dynamically

#### Parameters

##### name

`string`

Channel name

##### worker

`string` \| `Worker` \| `URL`

Worker instance, URL, or code string

##### options?

[`ConnectionOptions`](../../../types/Interface/interfaces/ConnectionOptions.md) = `{}`

Connection options

#### Returns

`Promise`\<[`ChannelEndpoint`](../interfaces/ChannelEndpoint.md)\>

***

### close()

```ts
close(): void;
```

Defined in: uniform.ts/src/newer/next/channel/ChannelContext.ts:1093

Close all channels and cleanup

#### Returns

`void`

***

### closeChannel()

```ts
closeChannel(name): boolean;
```

Defined in: uniform.ts/src/newer/next/channel/ChannelContext.ts:1068

Close a specific channel

#### Parameters

##### name

`string`

#### Returns

`boolean`

***

### connectRemote()

```ts
connectRemote(
   channelName, 
   options?, 
broadcast?): Promise<RemoteChannelHelper>;
```

Defined in: uniform.ts/src/newer/next/channel/ChannelContext.ts:929

Connect to a remote channel (e.g., in a Worker)

#### Parameters

##### channelName

`string`

##### options?

[`ConnectionOptions`](../../../types/Interface/interfaces/ConnectionOptions.md) = `{}`

##### broadcast?

  \| [`NativeChannelTransport`](../type-aliases/NativeChannelTransport.md)
  \| [`TransportBinding`](../../UnifiedChannel/interfaces/TransportBinding.md)\<[`NativeChannelTransport`](../type-aliases/NativeChannelTransport.md)\>
  \| `null`

#### Returns

`Promise`\<[`RemoteChannelHelper`](RemoteChannelHelper.md)\>

***

### createChannel()

```ts
createChannel(name, options?): ChannelEndpoint;
```

Defined in: uniform.ts/src/newer/next/channel/ChannelContext.ts:562

Create a new channel endpoint in this context

#### Parameters

##### name

`string`

Channel name

##### options?

[`ConnectionOptions`](../../../types/Interface/interfaces/ConnectionOptions.md) = `{}`

Connection options

#### Returns

[`ChannelEndpoint`](../interfaces/ChannelEndpoint.md)

ChannelEndpoint with handler and connection

***

### createChannelPair()

```ts
createChannelPair(
   name1, 
   name2, 
   options?): object;
```

Defined in: uniform.ts/src/newer/next/channel/ChannelContext.ts:871

Create a MessageChannel pair for bidirectional communication

#### Parameters

##### name1

`string`

First channel name

##### name2

`string`

Second channel name

##### options?

[`ConnectionOptions`](../../../types/Interface/interfaces/ConnectionOptions.md) = `{}`

#### Returns

`object`

Both endpoints connected via MessageChannel

##### channel1

```ts
channel1: ChannelEndpoint;
```

##### channel2

```ts
channel2: ChannelEndpoint;
```

##### messageChannel

```ts
messageChannel: MessageChannel;
```

***

### createChannels()

```ts
createChannels(names, options?): Map<string, ChannelEndpoint>;
```

Defined in: uniform.ts/src/newer/next/channel/ChannelContext.ts:589

Create multiple channel endpoints at once

#### Parameters

##### names

`string`[]

Array of channel names

##### options?

[`ConnectionOptions`](../../../types/Interface/interfaces/ConnectionOptions.md) = `{}`

Shared connection options

#### Returns

`Map`\<`string`, [`ChannelEndpoint`](../interfaces/ChannelEndpoint.md)\>

Map of channel names to endpoints

***

### defer()

```ts
defer(name, initFn): void;
```

Defined in: uniform.ts/src/newer/next/channel/ChannelContext.ts:642

Register a deferred channel that will be initialized on first use

#### Parameters

##### name

`string`

Channel name

##### initFn

() => `Promise`\<[`ChannelEndpoint`](../interfaces/ChannelEndpoint.md)\>

Function to initialize the channel

#### Returns

`void`

***

### getChannel()

```ts
getChannel(name): ChannelEndpoint | undefined;
```

Defined in: uniform.ts/src/newer/next/channel/ChannelContext.ts:600

Get an existing channel endpoint

#### Parameters

##### name

`string`

#### Returns

[`ChannelEndpoint`](../interfaces/ChannelEndpoint.md) \| `undefined`

***

### getChannelAsync()

```ts
getChannelAsync(name): Promise<ChannelEndpoint | null>;
```

Defined in: uniform.ts/src/newer/next/channel/ChannelContext.ts:669

Get channel, initializing deferred if needed

#### Parameters

##### name

`string`

#### Returns

`Promise`\<[`ChannelEndpoint`](../interfaces/ChannelEndpoint.md) \| `null`\>

***

### getChannelNames()

```ts
getChannelNames(): string[];
```

Defined in: uniform.ts/src/newer/next/channel/ChannelContext.ts:621

Get all channel names in this context

#### Returns

`string`[]

***

### getHost()

```ts
getHost(): ChannelHandler | null;
```

Defined in: uniform.ts/src/newer/next/channel/ChannelContext.ts:475

Get the host channel

#### Returns

[`ChannelHandler`](ChannelHandler.md) \| `null`

***

### getOrCreateChannel()

```ts
getOrCreateChannel(name, options?): ChannelEndpoint;
```

Defined in: uniform.ts/src/newer/next/channel/ChannelContext.ts:607

Get or create a channel endpoint

#### Parameters

##### name

`string`

##### options?

[`ConnectionOptions`](../../../types/Interface/interfaces/ConnectionOptions.md) = `{}`

#### Returns

[`ChannelEndpoint`](../interfaces/ChannelEndpoint.md)

***

### hasChannel()

```ts
hasChannel(name): boolean;
```

Defined in: uniform.ts/src/newer/next/channel/ChannelContext.ts:614

Check if channel exists in this context

#### Parameters

##### name

`string`

#### Returns

`boolean`

***

### importModuleInChannel()

```ts
importModuleInChannel(
   channelName, 
   url, 
   options?, 
broadcast?): Promise<any>;
```

Defined in: uniform.ts/src/newer/next/channel/ChannelContext.ts:941

Import a module in a remote channel

#### Parameters

##### channelName

`string`

##### url

`string`

##### options?

###### channelOptions?

[`ConnectionOptions`](../../../types/Interface/interfaces/ConnectionOptions.md)

###### importOptions?

`any`

##### broadcast?

  \| [`NativeChannelTransport`](../type-aliases/NativeChannelTransport.md)
  \| [`TransportBinding`](../../UnifiedChannel/interfaces/TransportBinding.md)\<[`NativeChannelTransport`](../type-aliases/NativeChannelTransport.md)\>
  \| `null`

#### Returns

`Promise`\<`any`\>

***

### initDeferred()

```ts
initDeferred(name): Promise<ChannelEndpoint | null>;
```

Defined in: uniform.ts/src/newer/next/channel/ChannelContext.ts:649

Initialize a previously deferred channel

#### Parameters

##### name

`string`

#### Returns

`Promise`\<[`ChannelEndpoint`](../interfaces/ChannelEndpoint.md) \| `null`\>

***

### initHost()

```ts
initHost(name?): ChannelHandler;
```

Defined in: uniform.ts/src/newer/next/channel/ChannelContext.ts:446

Initialize/get the host channel for this context

#### Parameters

##### name?

`string`

#### Returns

[`ChannelHandler`](ChannelHandler.md)

***

### isDeferred()

```ts
isDeferred(name): boolean;
```

Defined in: uniform.ts/src/newer/next/channel/ChannelContext.ts:662

Check if channel is deferred (not yet initialized)

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

Defined in: uniform.ts/src/newer/next/channel/ChannelContext.ts:511

Notify all currently known active connections.
Useful for service worker / cross-tab handshakes.

#### Parameters

##### payload?

`any` = `{}`

##### query?

[`QueryConnectionsOptions`](../type-aliases/QueryConnectionsOptions.md) = `{}`

#### Returns

`number`

***

### queryConnections()

```ts
queryConnections(query?): ContextConnectionInfo[];
```

Defined in: uniform.ts/src/newer/next/channel/ChannelContext.ts:542

Query tracked connections with filters

#### Parameters

##### query?

[`QueryConnectionsOptions`](../type-aliases/QueryConnectionsOptions.md) = `{}`

#### Returns

[`ContextConnectionInfo`](../type-aliases/ContextConnectionInfo.md)[]

***

### subscribeConnections()

```ts
subscribeConnections(handler): Subscription;
```

Defined in: uniform.ts/src/newer/next/channel/ChannelContext.ts:503

Subscribe to connection events

#### Parameters

##### handler

(`event`) => `void`

#### Returns

[`Subscription`](../../../types/Interface/interfaces/Subscription.md)
