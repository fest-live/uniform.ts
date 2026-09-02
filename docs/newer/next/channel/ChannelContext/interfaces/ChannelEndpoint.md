[**@fest-lib/uniform v0.1.22**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/channel/ChannelContext](../README.md) / ChannelEndpoint

# Interface: ChannelEndpoint

Defined in: src/newer/next/channel/ChannelContext.ts:105

## Properties

### connection

```ts
connection: ChannelConnection;
```

Defined in: src/newer/next/channel/ChannelContext.ts:111

Channel connection

***

### deferredInit?

```ts
optional deferredInit?: () => Promise<RemoteChannelHelper | null>;
```

Defined in: src/newer/next/channel/ChannelContext.ts:121

Deferred initialization function

#### Returns

`Promise`\<[`RemoteChannelHelper`](../classes/RemoteChannelHelper.md) \| `null`\>

***

### handler

```ts
handler: ChannelHandler;
```

Defined in: src/newer/next/channel/ChannelContext.ts:109

Channel handler instance

***

### name

```ts
name: string;
```

Defined in: src/newer/next/channel/ChannelContext.ts:107

Channel name

***

### ready

```ts
ready: Promise<RemoteChannelHelper | null>;
```

Defined in: src/newer/next/channel/ChannelContext.ts:119

Ready promise

***

### subscriptions

```ts
subscriptions: Subscription[];
```

Defined in: src/newer/next/channel/ChannelContext.ts:113

Subscriptions for cleanup

***

### transport?

```ts
optional transport?: TransportAdapter;
```

Defined in: src/newer/next/channel/ChannelContext.ts:115

Associated transport if any

***

### transportType?

```ts
optional transportType?: DynamicTransportType;
```

Defined in: src/newer/next/channel/ChannelContext.ts:117

Transport type

***

### unified?

```ts
optional unified?: UnifiedChannel;
```

Defined in: src/newer/next/channel/ChannelContext.ts:123

Backing unified channel engine (vNext core)
