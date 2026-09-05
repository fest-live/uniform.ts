[**@fest-lib/uniform v0.1.29**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/transport/Worker](../README.md) / WorkerContextConfig

# Interface: WorkerContextConfig

Defined in: uniform.ts/src/newer/next/transport/Worker.ts:57

Worker context configuration

## Extends

- [`ChannelContextOptions`](../../../channel/ChannelContext/interfaces/ChannelContextOptions.md)

## Properties

### allowedChannels?

```ts
optional allowedChannels?: string[];
```

Defined in: uniform.ts/src/newer/next/transport/Worker.ts:63

Channel whitelist (if set, only these channels are accepted)

***

### autoAcceptChannels?

```ts
optional autoAcceptChannels?: boolean;
```

Defined in: uniform.ts/src/newer/next/transport/Worker.ts:61

Auto-accept incoming channels

***

### autoConnect?

```ts
optional autoConnect?: boolean;
```

Defined in: uniform.ts/src/newer/next/channel/ChannelContext.ts:96

Auto-connect channels on creation

#### Inherited from

[`ChannelContextOptions`](../../../channel/ChannelContext/interfaces/ChannelContextOptions.md).[`autoConnect`](../../../channel/ChannelContext/interfaces/ChannelContextOptions.md#autoconnect)

***

### defaultOptions?

```ts
optional defaultOptions?: ConnectionOptions;
```

Defined in: uniform.ts/src/newer/next/channel/ChannelContext.ts:98

Default connection options for channels

#### Inherited from

[`ChannelContextOptions`](../../../channel/ChannelContext/interfaces/ChannelContextOptions.md).[`defaultOptions`](../../../channel/ChannelContext/interfaces/ChannelContextOptions.md#defaultoptions)

***

### isolatedStorage?

```ts
optional isolatedStorage?: boolean;
```

Defined in: uniform.ts/src/newer/next/channel/ChannelContext.ts:100

Enable isolated storage per context

#### Inherited from

[`ChannelContextOptions`](../../../channel/ChannelContext/interfaces/ChannelContextOptions.md).[`isolatedStorage`](../../../channel/ChannelContext/interfaces/ChannelContextOptions.md#isolatedstorage)

***

### maxChannels?

```ts
optional maxChannels?: number;
```

Defined in: uniform.ts/src/newer/next/transport/Worker.ts:65

Maximum concurrent channels

***

### name?

```ts
optional name?: string;
```

Defined in: uniform.ts/src/newer/next/channel/ChannelContext.ts:94

Context name for identification

#### Inherited from

[`ChannelContextOptions`](../../../channel/ChannelContext/interfaces/ChannelContextOptions.md).[`name`](../../../channel/ChannelContext/interfaces/ChannelContextOptions.md#name)

***

### useGlobalSelf?

```ts
optional useGlobalSelf?: boolean;
```

Defined in: uniform.ts/src/newer/next/channel/ChannelContext.ts:102

Use globalThis/self as default broadcast target

#### Inherited from

[`ChannelContextOptions`](../../../channel/ChannelContext/interfaces/ChannelContextOptions.md).[`useGlobalSelf`](../../../channel/ChannelContext/interfaces/ChannelContextOptions.md#useglobalself)

***

### workerName?

```ts
optional workerName?: string;
```

Defined in: uniform.ts/src/newer/next/transport/Worker.ts:59

Worker name/identifier
