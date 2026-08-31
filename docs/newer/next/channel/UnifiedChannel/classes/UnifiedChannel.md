[**@fest-lib/uniform v0.1.19**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/channel/UnifiedChannel](../README.md) / UnifiedChannel

# Class: UnifiedChannel

Defined in: src/newer/next/channel/UnifiedChannel.ts:127

UnifiedChannel - Single entry point for all channel communication

Combines:
- Requestor functionality (invoke remote methods)
- Responder functionality (handle incoming requests)
- Proxy creation (transparent remote access)
- Observable messaging (subscribe/next pattern)
- Multi-transport support (Worker, Port, Broadcast, WebSocket, Chrome)

## Constructors

### Constructor

```ts
new UnifiedChannel(config): UnifiedChannel;
```

Defined in: src/newer/next/channel/UnifiedChannel.ts:166

#### Parameters

##### config

  \| `string`
  \| [`UnifiedChannelConfig`](../interfaces/UnifiedChannelConfig.md)

#### Returns

`UnifiedChannel`

## Accessors

### config

#### Get Signature

```ts
get config(): Readonly<Required<UnifiedChannelConfig>>;
```

Defined in: src/newer/next/channel/UnifiedChannel.ts:597

Configuration

##### Returns

`Readonly`\<`Required`\<[`UnifiedChannelConfig`](../interfaces/UnifiedChannelConfig.md)\>\>

***

### connectedChannels

#### Get Signature

```ts
get connectedChannels(): string[];
```

Defined in: src/newer/next/channel/UnifiedChannel.ts:600

Connected transport names

##### Returns

`string`[]

***

### contextType

#### Get Signature

```ts
get contextType(): ContextType;
```

Defined in: src/newer/next/channel/UnifiedChannel.ts:594

Detected context type

##### Returns

[`ContextType`](../../../proxy/Invoker/type-aliases/ContextType.md)

***

### exposedModules

#### Get Signature

```ts
get exposedModules(): string[];
```

Defined in: src/newer/next/channel/UnifiedChannel.ts:603

Exposed module names

##### Returns

`string`[]

***

### name

#### Get Signature

```ts
get name(): string;
```

Defined in: src/newer/next/channel/UnifiedChannel.ts:591

Channel name

##### Returns

`string`

***

### onConnection

#### Get Signature

```ts
get onConnection(): ChannelSubject<UnifiedConnectionEvent>;
```

Defined in: src/newer/next/channel/UnifiedChannel.ts:556

Observable: Connection events (connected/notified/disconnected)

##### Returns

[`ChannelSubject`](../../../observable/Observable/classes/ChannelSubject.md)\<[`UnifiedConnectionEvent`](../type-aliases/UnifiedConnectionEvent.md)\>

***

### onInvocation

#### Get Signature

```ts
get onInvocation(): ChannelSubject<IncomingInvocation>;
```

Defined in: src/newer/next/channel/UnifiedChannel.ts:550

Observable: Incoming invocations

##### Returns

[`ChannelSubject`](../../../observable/Observable/classes/ChannelSubject.md)\<[`IncomingInvocation`](../../../proxy/Invoker/interfaces/IncomingInvocation.md)\>

***

### onMessage

#### Get Signature

```ts
get onMessage(): ChannelSubject<ChannelMessage<any>>;
```

Defined in: src/newer/next/channel/UnifiedChannel.ts:544

Observable: Incoming messages

##### Returns

[`ChannelSubject`](../../../observable/Observable/classes/ChannelSubject.md)\<[`ChannelMessage`](../../../types/Interface/interfaces/ChannelMessage.md)\<`any`\>\>

***

### onOutbound

#### Get Signature

```ts
get onOutbound(): ChannelSubject<ChannelMessage<any>>;
```

Defined in: src/newer/next/channel/UnifiedChannel.ts:547

Observable: Outgoing messages

##### Returns

[`ChannelSubject`](../../../observable/Observable/classes/ChannelSubject.md)\<[`ChannelMessage`](../../../types/Interface/interfaces/ChannelMessage.md)\<`any`\>\>

***

### onResponse

#### Get Signature

```ts
get onResponse(): ChannelSubject<InvocationResponse>;
```

Defined in: src/newer/next/channel/UnifiedChannel.ts:553

Observable: Outgoing responses

##### Returns

[`ChannelSubject`](../../../observable/Observable/classes/ChannelSubject.md)\<[`InvocationResponse`](../../../proxy/Invoker/interfaces/InvocationResponse.md)\>

## Methods

### \_\_getPrivate()

```ts
__getPrivate(key): any;
```

Defined in: src/newer/next/channel/UnifiedChannel.ts:158

#### Parameters

##### key

`string`

#### Returns

`any`

***

### \_\_setPrivate()

```ts
__setPrivate(key, value): void;
```

Defined in: src/newer/next/channel/UnifiedChannel.ts:162

#### Parameters

##### key

`string`

##### value

`any`

#### Returns

`void`

***

### attach()

```ts
attach(target, options?): this;
```

Defined in: src/newer/next/channel/UnifiedChannel.ts:315

Connect and listen on the same transport (bidirectional)

#### Parameters

##### target

`any`

##### options?

[`ConnectOptions`](../interfaces/ConnectOptions.md) = `{}`

#### Returns

`this`

***

### call()

```ts
call<T>(
   targetChannel, 
   path, 
args?): Promise<T>;
```

Defined in: src/newer/next/channel/UnifiedChannel.ts:436

Call method on remote object

#### Type Parameters

##### T

`T` = `any`

#### Parameters

##### targetChannel

`string`

##### path

`string`[]

##### args?

`any`[] = `[]`

#### Returns

`Promise`\<`T`\>

***

### close()

```ts
close(): void;
```

Defined in: src/newer/next/channel/UnifiedChannel.ts:612

Close all connections and cleanup

#### Returns

`void`

***

### connect()

```ts
connect(target, options?): this;
```

Defined in: src/newer/next/channel/UnifiedChannel.ts:196

Connect to a transport for sending requests

#### Parameters

##### target

[`TransportBinding`](../interfaces/TransportBinding.md)\<[`NativeChannelTransport`](../../ChannelContext/type-aliases/NativeChannelTransport.md)\>

Worker, MessagePort, BroadcastChannel, WebSocket, or string identifier

##### options?

[`ConnectOptions`](../interfaces/ConnectOptions.md) = `{}`

Connection options

#### Returns

`this`

***

### construct()

```ts
construct<T>(
   targetChannel, 
   path, 
args?): Promise<T>;
```

Defined in: src/newer/next/channel/UnifiedChannel.ts:443

Construct new instance on remote

#### Type Parameters

##### T

`T` = `any`

#### Parameters

##### targetChannel

`string`

##### path

`string`[]

##### args?

`any`[] = `[]`

#### Returns

`Promise`\<`T`\>

***

### emit()

```ts
emit(
   targetChannel, 
   eventType, 
   data): void;
```

Defined in: src/newer/next/channel/UnifiedChannel.ts:512

Emit an event to a channel

#### Parameters

##### targetChannel

`string`

##### eventType

`string`

##### data

`any`

#### Returns

`void`

***

### expose()

```ts
expose(name, obj): this;
```

Defined in: src/newer/next/channel/UnifiedChannel.ts:334

Expose an object for remote invocation

#### Parameters

##### name

`string`

Path name for the exposed object

##### obj

`any`

Object to expose

#### Returns

`this`

***

### exposeAll()

```ts
exposeAll(entries): this;
```

Defined in: src/newer/next/channel/UnifiedChannel.ts:344

Expose multiple objects at once

#### Parameters

##### entries

`Record`\<`string`, `any`\>

#### Returns

`this`

***

### get()

```ts
get<T>(
   targetChannel, 
   path, 
prop): Promise<T>;
```

Defined in: src/newer/next/channel/UnifiedChannel.ts:422

Get property from remote object

#### Type Parameters

##### T

`T` = `any`

#### Parameters

##### targetChannel

`string`

##### path

`string`[]

##### prop

`string`

#### Returns

`Promise`\<`T`\>

***

### import()

```ts
import<T>(url, targetChannel?): Promise<T>;
```

Defined in: src/newer/next/channel/UnifiedChannel.ts:357

Import a module from a remote channel

#### Type Parameters

##### T

`T` = `any`

#### Parameters

##### url

`string`

Module URL to import

##### targetChannel?

`string`

Target channel (defaults to first connected)

#### Returns

`Promise`\<`T`\>

***

### invoke()

```ts
invoke<T>(
   targetChannel, 
   action, 
   path, 
args?): Promise<T>;
```

Defined in: src/newer/next/channel/UnifiedChannel.ts:378

Invoke a method on a remote object

#### Type Parameters

##### T

`T` = `any`

#### Parameters

##### targetChannel

`string`

Target channel name

##### action

[`WReflectAction`](../../../types/Interface/enumerations/WReflectAction.md)

Reflect action

##### path

`string`[]

Object path

##### args?

`any`[] = `[]`

Arguments

#### Returns

`Promise`\<`T`\>

***

### listen()

```ts
listen(source, options?): this;
```

Defined in: src/newer/next/channel/UnifiedChannel.ts:232

Listen on a transport for incoming requests

#### Parameters

##### source

`any`

Transport source to listen on

##### options?

[`ConnectOptions`](../interfaces/ConnectOptions.md) = `{}`

Connection options

#### Returns

`this`

***

### next()

```ts
next(message): void;
```

Defined in: src/newer/next/channel/UnifiedChannel.ts:504

Send a message (fire-and-forget)

#### Parameters

##### message

[`ChannelMessage`](../../../types/Interface/interfaces/ChannelMessage.md)

#### Returns

`void`

***

### notify()

```ts
notify(
   targetChannel, 
   payload?, 
   type?): boolean;
```

Defined in: src/newer/next/channel/UnifiedChannel.ts:528

Emit connection-level signal to a specific connected channel.
This is the canonical notify/connect API for facade layers.

#### Parameters

##### targetChannel

`string`

##### payload?

`Record`\<`string`, `any`\> = `{}`

##### type?

`"notify"` \| `"connect"`

#### Returns

`boolean`

***

### notifyConnections()

```ts
notifyConnections(payload?, query?): number;
```

Defined in: src/newer/next/channel/UnifiedChannel.ts:566

#### Parameters

##### payload?

`any` = `{}`

##### query?

[`UnifiedQueryConnectionsOptions`](../type-aliases/UnifiedQueryConnectionsOptions.md) = `{}`

#### Returns

`number`

***

### proxy()

```ts
proxy<T>(targetChannel?, basePath?): T;
```

Defined in: src/newer/next/channel/UnifiedChannel.ts:459

Create a transparent proxy to a remote channel

All operations on the proxy are forwarded to the remote.

#### Type Parameters

##### T

`T` = `any`

#### Parameters

##### targetChannel?

`string`

Target channel name

##### basePath?

`string`[] = `[]`

Base path for the proxy

#### Returns

`T`

***

### queryConnections()

```ts
queryConnections(query?): UnifiedConnectionInfo[];
```

Defined in: src/newer/next/channel/UnifiedChannel.ts:562

#### Parameters

##### query?

[`UnifiedQueryConnectionsOptions`](../type-aliases/UnifiedQueryConnectionsOptions.md) = `{}`

#### Returns

[`UnifiedConnectionInfo`](../type-aliases/UnifiedConnectionInfo.md)[]

***

### remote()

```ts
remote<T>(moduleName, targetChannel?): T;
```

Defined in: src/newer/next/channel/UnifiedChannel.ts:470

Create proxy for a specific exposed module on remote

#### Type Parameters

##### T

`T` = `any`

#### Parameters

##### moduleName

`string`

Name of the exposed module

##### targetChannel?

`string`

Target channel

#### Returns

`T`

***

### set()

```ts
set(
   targetChannel, 
   path, 
   prop, 
value): Promise<boolean>;
```

Defined in: src/newer/next/channel/UnifiedChannel.ts:429

Set property on remote object

#### Parameters

##### targetChannel

`string`

##### path

`string`[]

##### prop

`string`

##### value

`any`

#### Returns

`Promise`\<`boolean`\>

***

### subscribe()

```ts
subscribe(handler): Subscription;
```

Defined in: src/newer/next/channel/UnifiedChannel.ts:497

Subscribe to incoming messages

#### Parameters

##### handler

(`msg`) => `void`

#### Returns

[`Subscription`](../../../types/Interface/interfaces/Subscription.md)

***

### subscribeConnections()

```ts
subscribeConnections(handler): Subscription;
```

Defined in: src/newer/next/channel/UnifiedChannel.ts:558

#### Parameters

##### handler

(`event`) => `void`

#### Returns

[`Subscription`](../../../types/Interface/interfaces/Subscription.md)

***

### wrapDescriptor()

```ts
wrapDescriptor(descriptor, targetChannel?): any;
```

Defined in: src/newer/next/channel/UnifiedChannel.ts:477

Wrap a descriptor as a proxy

#### Parameters

##### descriptor

[`WReflectDescriptor`](../../../types/Interface/interfaces/WReflectDescriptor.md)

##### targetChannel?

`string`

#### Returns

`any`
