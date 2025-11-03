[**@fest/uniform v0.0.0**](../../../README.md)

***

[@fest/uniform](../../../README.md) / [next/Channels](../README.md) / ChannelHandler

# Class: ChannelHandler

Defined in: next/Channels.ts:118

## Constructors

### Constructor

```ts
new ChannelHandler(channel, options): ChannelHandler;
```

Defined in: next/Channels.ts:124

#### Parameters

##### channel

`string`

##### options

`any` = `{}`

#### Returns

`ChannelHandler`

## Methods

### createRemoteChannel()

```ts
createRemoteChannel(
   channel, 
   options, 
   broadcast?): any;
```

Defined in: next/Channels.ts:131

#### Parameters

##### channel

`string`

##### options

`any` = `{}`

##### broadcast?

`null` | `MessagePort` | `Worker` | `BroadcastChannel`

#### Returns

`any`

***

### getChannel()

```ts
getChannel(): null | string;
```

Defined in: next/Channels.ts:164

#### Returns

`null` \| `string`

***

### handleAndResponse()

```ts
handleAndResponse(request, reqId): undefined | Promise<void>;
```

Defined in: next/Channels.ts:199

#### Parameters

##### request

[`WReq`](../../Interface/interfaces/WReq.md)

##### reqId

`string`

#### Returns

`undefined` \| `Promise`\<`void`\>

***

### request()

```ts
request(
   toChannel, 
   path, 
   action, 
   args, 
options): undefined | null | Promise<any>;
```

Defined in: next/Channels.ts:168

#### Parameters

##### toChannel

`string`

##### path

`string`[]

##### action

[`WReflectAction`](../../Interface/enumerations/WReflectAction.md)

##### args

`any`[]

##### options

`any` = `{}`

#### Returns

`undefined` \| `null` \| `Promise`\<`any`\>

***

### resolveResponse()

```ts
resolveResponse(reqId, result): undefined | Promise<any>;
```

Defined in: next/Channels.ts:192

#### Parameters

##### reqId

`string`

##### result

`any`

#### Returns

`undefined` \| `Promise`\<`any`\>
