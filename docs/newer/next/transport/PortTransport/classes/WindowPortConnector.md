[**@fest-lib/uniform v0.1.10**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/transport/PortTransport](../README.md) / WindowPortConnector

# Class: WindowPortConnector

Defined in: src/newer/next/transport/PortTransport.ts:361

Connect to window/iframe via MessageChannel

## Constructors

### Constructor

```ts
new WindowPortConnector(
   _target, 
   _channelName, 
   _config?): WindowPortConnector;
```

Defined in: src/newer/next/transport/PortTransport.ts:366

#### Parameters

##### \_target

`Window`

##### \_channelName

`string`

##### \_config?

[`WindowPortConnectorConfig`](../interfaces/WindowPortConnectorConfig.md) = `{}`

#### Returns

`WindowPortConnector`

## Accessors

### isConnected

#### Get Signature

```ts
get isConnected(): boolean;
```

Defined in: src/newer/next/transport/PortTransport.ts:454

##### Returns

`boolean`

***

### state

#### Get Signature

```ts
get state(): ChannelSubject<"error" | "connected" | "disconnected" | "connecting">;
```

Defined in: src/newer/next/transport/PortTransport.ts:455

##### Returns

[`ChannelSubject`](../../../observable/Observable/classes/ChannelSubject.md)\<`"error"` \| `"connected"` \| `"disconnected"` \| `"connecting"`\>

***

### transport

#### Get Signature

```ts
get transport(): PortTransport | null;
```

Defined in: src/newer/next/transport/PortTransport.ts:456

##### Returns

[`PortTransport`](PortTransport.md) \| `null`

## Methods

### connect()

```ts
connect(): Promise<PortTransport>;
```

Defined in: src/newer/next/transport/PortTransport.ts:375

Initiate connection to target window

#### Returns

`Promise`\<[`PortTransport`](PortTransport.md)\>

***

### disconnect()

```ts
disconnect(): void;
```

Defined in: src/newer/next/transport/PortTransport.ts:447

#### Returns

`void`

***

### listen()

```ts
static listen(
   channelName, 
   handler, 
   config?): () => void;
```

Defined in: src/newer/next/transport/PortTransport.ts:420

Listen for incoming connections (target side)

#### Parameters

##### channelName

`string`

##### handler

(`transport`) => `void`

##### config?

[`WindowPortConnectorConfig`](../interfaces/WindowPortConnectorConfig.md)

#### Returns

() => `void`
