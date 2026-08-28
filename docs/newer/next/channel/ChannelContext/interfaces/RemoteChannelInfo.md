[**@fest-lib/uniform v0.1.14**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/channel/ChannelContext](../README.md) / RemoteChannelInfo

# Interface: RemoteChannelInfo

Defined in: src/newer/next/channel/ChannelContext.ts:126

## Properties

### channel

```ts
channel: string;
```

Defined in: src/newer/next/channel/ChannelContext.ts:127

***

### context

```ts
context: ChannelContext;
```

Defined in: src/newer/next/channel/ChannelContext.ts:128

***

### messageChannel?

```ts
optional messageChannel?: MessageChannel;
```

Defined in: src/newer/next/channel/ChannelContext.ts:129

***

### remote

```ts
remote: Promise<RemoteChannelHelper>;
```

Defined in: src/newer/next/channel/ChannelContext.ts:130

***

### transport?

```ts
optional transport?: Worker | MessagePort | BroadcastChannel | WebSocket;
```

Defined in: src/newer/next/channel/ChannelContext.ts:131

***

### transportType?

```ts
optional transportType?: DynamicTransportType;
```

Defined in: src/newer/next/channel/ChannelContext.ts:132
