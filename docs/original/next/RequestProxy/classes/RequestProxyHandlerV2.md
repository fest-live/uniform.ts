[**@fest-lib/uniform v0.1.11**](../../../../README.md)

***

[@fest-lib/uniform](../../../../README.md) / [original/next/RequestProxy](../README.md) / RequestProxyHandlerV2

# Class: RequestProxyHandlerV2

Defined in: src/original/next/RequestProxy.ts:10

## Constructors

### Constructor

```ts
new RequestProxyHandlerV2(hostChannelInstance?, options?): RequestProxyHandlerV2;
```

Defined in: src/original/next/RequestProxy.ts:11

#### Parameters

##### hostChannelInstance?

[`ChannelHandler`](../../Channels/classes/ChannelHandler.md) \| `null`

##### options?

`any` = `{}`

#### Returns

`RequestProxyHandlerV2`

## Properties

### hostChannelInstance

```ts
hostChannelInstance: ChannelHandler | null = SELF_CHANNEL.instance;
```

Defined in: src/original/next/RequestProxy.ts:11

***

### options

```ts
options: any = {};
```

Defined in: src/original/next/RequestProxy.ts:11

## Methods

### dispatch()

```ts
dispatch(action, args): any;
```

Defined in: src/original/next/RequestProxy.ts:15

#### Parameters

##### action

[`WReflectAction`](../../Interface/enumerations/WReflectAction.md)

##### args

`any`[]

#### Returns

`any`
