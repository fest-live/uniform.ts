[**@fest-lib/uniform v0.1.26**](../../../../README.md)

***

[@fest-lib/uniform](../../../../README.md) / [newer/messaging/ServiceChannelManager](../README.md) / ServiceChannelManager

# Class: ServiceChannelManager\<TChannelId\>

Defined in: uniform.ts/src/newer/messaging/ServiceChannelManager.ts:58

## Type Parameters

### TChannelId

`TChannelId` *extends* `string` = `string`

## Constructors

### Constructor

```ts
new ServiceChannelManager<TChannelId>(config?): ServiceChannelManager<TChannelId>;
```

Defined in: uniform.ts/src/newer/messaging/ServiceChannelManager.ts:66

#### Parameters

##### config?

[`ServiceChannelManagerConfig`](../interfaces/ServiceChannelManagerConfig.md) = `{}`

#### Returns

`ServiceChannelManager`\<`TChannelId`\>

## Methods

### broadcast()

```ts
broadcast<T>(
   type, 
   data, 
   source?): void;
```

Defined in: uniform.ts/src/newer/messaging/ServiceChannelManager.ts:217

Broadcast a message to all initialized channels

#### Type Parameters

##### T

`T`

#### Parameters

##### type

`string`

##### data

`T`

##### source?

`string`

#### Returns

`void`

***

### closeAll()

```ts
closeAll(): void;
```

Defined in: uniform.ts/src/newer/messaging/ServiceChannelManager.ts:163

Close all channels

#### Returns

`void`

***

### closeChannel()

```ts
closeChannel(channelId): void;
```

Defined in: uniform.ts/src/newer/messaging/ServiceChannelManager.ts:149

Close a service channel

#### Parameters

##### channelId

`TChannelId`

#### Returns

`void`

***

### getAllConfigs()

```ts
getAllConfigs(): Record<string, ServiceChannelConfig>;
```

Defined in: uniform.ts/src/newer/messaging/ServiceChannelManager.ts:94

Get all channel configurations

#### Returns

`Record`\<`string`, [`ServiceChannelConfig`](../interfaces/ServiceChannelConfig.md)\>

***

### getConfig()

```ts
getConfig(channelId): 
  | ServiceChannelConfig
  | undefined;
```

Defined in: uniform.ts/src/newer/messaging/ServiceChannelManager.ts:87

Get channel configuration

#### Parameters

##### channelId

`TChannelId`

#### Returns

  \| [`ServiceChannelConfig`](../interfaces/ServiceChannelConfig.md)
  \| `undefined`

***

### getExecutionContext()

```ts
getExecutionContext(): string;
```

Defined in: uniform.ts/src/newer/messaging/ServiceChannelManager.ts:311

Get execution context

#### Returns

`string`

***

### getInitializedChannels()

```ts
getInitializedChannels(): TChannelId[];
```

Defined in: uniform.ts/src/newer/messaging/ServiceChannelManager.ts:287

Get all initialized channel IDs

#### Returns

`TChannelId`[]

***

### getStatus()

```ts
getStatus(): Record<string, ChannelState>;
```

Defined in: uniform.ts/src/newer/messaging/ServiceChannelManager.ts:294

Get channel status

#### Returns

`Record`\<`string`, [`ChannelState`](../interfaces/ChannelState.md)\>

***

### initChannel()

```ts
initChannel(channelId): Promise<BroadcastChannel>;
```

Defined in: uniform.ts/src/newer/messaging/ServiceChannelManager.ts:105

Initialize a service channel

#### Parameters

##### channelId

`TChannelId`

#### Returns

`Promise`\<`BroadcastChannel`\>

***

### isInitialized()

```ts
isInitialized(channelId): boolean;
```

Defined in: uniform.ts/src/newer/messaging/ServiceChannelManager.ts:280

Check if channel is initialized

#### Parameters

##### channelId

`TChannelId`

#### Returns

`boolean`

***

### registerConfigs()

```ts
registerConfigs(configs): void;
```

Defined in: uniform.ts/src/newer/messaging/ServiceChannelManager.ts:80

Register channel configurations

#### Parameters

##### configs

`Record`\<`string`, [`ServiceChannelConfig`](../interfaces/ServiceChannelConfig.md)\>

#### Returns

`void`

***

### send()

```ts
send<T>(
   target, 
   type, 
   data, 
options?): Promise<void>;
```

Defined in: uniform.ts/src/newer/messaging/ServiceChannelManager.ts:188

Send a message to a channel

#### Type Parameters

##### T

`T`

#### Parameters

##### target

`TChannelId`

##### type

`string`

##### data

`T`

##### options?

###### correlationId?

`string`

###### source?

`string`

#### Returns

`Promise`\<`void`\>

***

### subscribe()

```ts
subscribe(channelId, handler): () => void;
```

Defined in: uniform.ts/src/newer/messaging/ServiceChannelManager.ts:234

Subscribe to messages on a channel

#### Parameters

##### channelId

`TChannelId`

##### handler

(`msg`) => `void`

#### Returns

() => `void`

***

### waitForChannel()

```ts
waitForChannel(channelId): Promise<void>;
```

Defined in: uniform.ts/src/newer/messaging/ServiceChannelManager.ts:172

Wait for a channel to be ready

#### Parameters

##### channelId

`TChannelId`

#### Returns

`Promise`\<`void`\>
