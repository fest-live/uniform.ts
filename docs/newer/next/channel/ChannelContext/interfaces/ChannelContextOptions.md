[**@fest-lib/uniform v0.1.4**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/channel/ChannelContext](../README.md) / ChannelContextOptions

# Interface: ChannelContextOptions

Defined in: src/newer/next/channel/ChannelContext.ts:92

## Extended by

- [`WorkerContextConfig`](../../../transport/Worker/interfaces/WorkerContextConfig.md)

## Properties

### autoConnect?

```ts
optional autoConnect?: boolean;
```

Defined in: src/newer/next/channel/ChannelContext.ts:96

Auto-connect channels on creation

***

### defaultOptions?

```ts
optional defaultOptions?: ConnectionOptions;
```

Defined in: src/newer/next/channel/ChannelContext.ts:98

Default connection options for channels

***

### isolatedStorage?

```ts
optional isolatedStorage?: boolean;
```

Defined in: src/newer/next/channel/ChannelContext.ts:100

Enable isolated storage per context

***

### name?

```ts
optional name?: string;
```

Defined in: src/newer/next/channel/ChannelContext.ts:94

Context name for identification

***

### useGlobalSelf?

```ts
optional useGlobalSelf?: boolean;
```

Defined in: src/newer/next/channel/ChannelContext.ts:102

Use globalThis/self as default broadcast target
