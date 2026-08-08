[**@fest-lib/uniform v0.1.4**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/transport/ServiceWorkerHost](../README.md) / ServiceWorkerHost

# Class: ServiceWorkerHost

Defined in: src/newer/next/transport/ServiceWorkerHost.ts:86

ServiceWorkerHost - The host channel that runs inside Service Worker.

Clients (pages, components) connect TO this host.
This is the reverse of normal worker pattern.

## Constructors

### Constructor

```ts
new ServiceWorkerHost(config): ServiceWorkerHost;
```

Defined in: src/newer/next/transport/ServiceWorkerHost.ts:102

#### Parameters

##### config

[`SWHostConfig`](../interfaces/SWHostConfig.md)

#### Returns

`ServiceWorkerHost`

## Methods

### broadcastToAll()

```ts
broadcastToAll(message): Promise<number>;
```

Defined in: src/newer/next/transport/ServiceWorkerHost.ts:267

Broadcast to all connected clients

#### Parameters

##### message

[`ChannelMessage`](../../../types/Interface/interfaces/ChannelMessage.md)

#### Returns

`Promise`\<`number`\>

***

### broadcastToChannel()

```ts
broadcastToChannel(channel, message): Promise<number>;
```

Defined in: src/newer/next/transport/ServiceWorkerHost.ts:249

Broadcast message to all clients subscribed to a channel

#### Parameters

##### channel

`string`

##### message

[`ChannelMessage`](../../../types/Interface/interfaces/ChannelMessage.md)

#### Returns

`Promise`\<`number`\>

***

### getChannelSubscribers()

```ts
getChannelSubscribers(channel): Set<string>;
```

Defined in: src/newer/next/transport/ServiceWorkerHost.ts:221

Get clients subscribed to a channel

#### Parameters

##### channel

`string`

#### Returns

`Set`\<`string`\>

***

### getClients()

```ts
getClients(): Map<string, SWClientInfo>;
```

Defined in: src/newer/next/transport/ServiceWorkerHost.ts:214

Get all connected clients

#### Returns

`Map`\<`string`, [`SWClientInfo`](../interfaces/SWClientInfo.md)\>

***

### handleClientMessage()

```ts
handleClientMessage(clientId, data): Promise<void>;
```

Defined in: src/newer/next/transport/ServiceWorkerHost.ts:281

Handle incoming message from client

#### Parameters

##### clientId

`string`

##### data

`any`

#### Returns

`Promise`\<`void`\>

***

### onClientEvent()

```ts
onClientEvent(handler): Subscription;
```

Defined in: src/newer/next/transport/ServiceWorkerHost.ts:340

Subscribe to client events

#### Parameters

##### handler

(`event`) => `void`

#### Returns

[`Subscription`](../../../types/Interface/interfaces/Subscription.md)

***

### onMessage()

```ts
onMessage(handler): Subscription;
```

Defined in: src/newer/next/transport/ServiceWorkerHost.ts:349

Subscribe to messages from clients

#### Parameters

##### handler

(`msg`) => `void`

#### Returns

[`Subscription`](../../../types/Interface/interfaces/Subscription.md)

***

### onMessageType()

```ts
onMessageType(type, handler): Subscription;
```

Defined in: src/newer/next/transport/ServiceWorkerHost.ts:356

Subscribe to messages of specific type

#### Parameters

##### type

`"request"` \| `"response"` \| `"event"` \| `"signal"` \| `"exchange"`

##### handler

(`msg`) => `void`

#### Returns

[`Subscription`](../../../types/Interface/interfaces/Subscription.md)

***

### registerClient()

```ts
registerClient(clientId, clientInfo?): Promise<void>;
```

Defined in: src/newer/next/transport/ServiceWorkerHost.ts:136

Register a client connection

#### Parameters

##### clientId

`string`

##### clientInfo?

`Partial`\<[`SWClientInfo`](../interfaces/SWClientInfo.md)\> = `{}`

#### Returns

`Promise`\<`void`\>

***

### sendToClient()

```ts
sendToClient(clientId, message): Promise<boolean>;
```

Defined in: src/newer/next/transport/ServiceWorkerHost.ts:232

Send message to specific client

#### Parameters

##### clientId

`string`

##### message

[`ChannelMessage`](../../../types/Interface/interfaces/ChannelMessage.md)

#### Returns

`Promise`\<`boolean`\>

***

### start()

```ts
start(): Promise<void>;
```

Defined in: src/newer/next/transport/ServiceWorkerHost.ts:420

Start the host (call in SW activate)

#### Returns

`Promise`\<`void`\>

***

### stop()

```ts
stop(): void;
```

Defined in: src/newer/next/transport/ServiceWorkerHost.ts:431

Stop the host

#### Returns

`void`

***

### subscribeClientToChannel()

```ts
subscribeClientToChannel(clientId, channel): void;
```

Defined in: src/newer/next/transport/ServiceWorkerHost.ts:185

Subscribe client to a channel

#### Parameters

##### clientId

`string`

##### channel

`string`

#### Returns

`void`

***

### unregisterClient()

```ts
unregisterClient(clientId): void;
```

Defined in: src/newer/next/transport/ServiceWorkerHost.ts:158

Unregister a client

#### Parameters

##### clientId

`string`

#### Returns

`void`

***

### unsubscribeClientFromChannel()

```ts
unsubscribeClientFromChannel(clientId, channel): void;
```

Defined in: src/newer/next/transport/ServiceWorkerHost.ts:202

Unsubscribe client from a channel

#### Parameters

##### clientId

`string`

##### channel

`string`

#### Returns

`void`

***

### updateClient()

```ts
updateClient(clientId, updates): void;
```

Defined in: src/newer/next/transport/ServiceWorkerHost.ts:174

Update client info

#### Parameters

##### clientId

`string`

##### updates

`Partial`\<[`SWClientInfo`](../interfaces/SWClientInfo.md)\>

#### Returns

`void`
