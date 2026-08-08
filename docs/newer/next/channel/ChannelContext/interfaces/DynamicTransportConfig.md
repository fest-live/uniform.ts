[**@fest-lib/uniform v0.1.4**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/channel/ChannelContext](../README.md) / DynamicTransportConfig

# Interface: DynamicTransportConfig

Defined in: src/newer/next/channel/ChannelContext.ts:77

Configuration for dynamic transport creation

## Properties

### broadcast?

```ts
optional broadcast?: string | BroadcastChannel;
```

Defined in: src/newer/next/channel/ChannelContext.ts:85

BroadcastChannel name or instance

***

### options?

```ts
optional options?: ConnectionOptions;
```

Defined in: src/newer/next/channel/ChannelContext.ts:89

Additional options

***

### port?

```ts
optional port?: MessagePort;
```

Defined in: src/newer/next/channel/ChannelContext.ts:83

MessagePort instance

***

### socket?

```ts
optional socket?: string | WebSocket;
```

Defined in: src/newer/next/channel/ChannelContext.ts:87

WebSocket URL or instance

***

### type

```ts
type: DynamicTransportType;
```

Defined in: src/newer/next/channel/ChannelContext.ts:79

Transport type

***

### worker?

```ts
optional worker?: string | Worker | SharedWorker | URL;
```

Defined in: src/newer/next/channel/ChannelContext.ts:81

Worker URL or instance
