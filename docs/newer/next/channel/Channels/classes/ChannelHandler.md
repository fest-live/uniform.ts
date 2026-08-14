[**@fest-lib/uniform v0.1.11**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/channel/Channels](../README.md) / ChannelHandler

# ~~Class: ChannelHandler~~

Defined in: src/newer/next/channel/Channels.ts:83

## Deprecated

Use UnifiedChannel instead

## Constructors

### Constructor

```ts
new ChannelHandler(channel, options?): ChannelHandler;
```

Defined in: src/newer/next/channel/Channels.ts:87

#### Parameters

##### channel

`string`

##### options?

`any` = `{}`

#### Returns

`ChannelHandler`

## Methods

### ~~close()~~

```ts
close(): void;
```

Defined in: src/newer/next/channel/Channels.ts:120

#### Returns

`void`

***

### ~~createRemoteChannel()~~

```ts
createRemoteChannel(
   channel, 
   options?, 
broadcast?): Promise<RemoteChannelHelper>;
```

Defined in: src/newer/next/channel/Channels.ts:93

#### Parameters

##### channel

`string`

##### options?

`any` = `{}`

##### broadcast?

`Worker` \| `MessagePort` \| `BroadcastChannel` \| `null`

#### Returns

`Promise`\<[`RemoteChannelHelper`](RemoteChannelHelper.md)\>

***

### ~~getChannel()~~

```ts
getChannel(): string;
```

Defined in: src/newer/next/channel/Channels.ts:101

#### Returns

`string`

***

### ~~handleAndResponse()~~

```ts
handleAndResponse(
   request, 
   reqId, 
responseFn?): Promise<void>;
```

Defined in: src/newer/next/channel/Channels.ts:114

#### Parameters

##### request

[`WReq`](../../../types/Interface/interfaces/WReq.md)

##### reqId

`string`

##### responseFn?

(`result`, `transfer`) => `void`

#### Returns

`Promise`\<`void`\>

***

### ~~request()~~

```ts
request(
   path, 
   action, 
   args, 
   options?, 
   toChannel?): Promise<any> | null;
```

Defined in: src/newer/next/channel/Channels.ts:103

#### Parameters

##### path

  \| [`WReflectAction`](../../../types/Interface/enumerations/WReflectAction.md)
  \| `string`[]

##### action

  \| `any`[]
  \| [`WReflectAction`](../../../types/Interface/enumerations/WReflectAction.md)

##### args

`any`

##### options?

`any` = `{}`

##### toChannel?

`string` = `"worker"`

#### Returns

`Promise`\<`any`\> \| `null`

***

### ~~resolveResponse()~~

```ts
resolveResponse(reqId, result): Promise<any>;
```

Defined in: src/newer/next/channel/Channels.ts:112

#### Parameters

##### reqId

`string`

##### result

`any`

#### Returns

`Promise`\<`any`\>
