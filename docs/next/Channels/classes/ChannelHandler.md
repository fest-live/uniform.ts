[**@fest-lib/uniform v0.0.0**](../../../README.md)

***

[@fest-lib/uniform](../../../README.md) / [next/Channels](../README.md) / ChannelHandler

# Class: ChannelHandler

Defined in: [next/Channels.ts:118](https://github.com/fest-live/uniform.ts/blob/00a72c2f9c17cc452a19ebfa9e811d574034488e/src/next/Channels.ts#L118)

## Constructors

### Constructor

```ts
new ChannelHandler(channel, options): ChannelHandler;
```

Defined in: [next/Channels.ts:124](https://github.com/fest-live/uniform.ts/blob/00a72c2f9c17cc452a19ebfa9e811d574034488e/src/next/Channels.ts#L124)

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

Defined in: [next/Channels.ts:131](https://github.com/fest-live/uniform.ts/blob/00a72c2f9c17cc452a19ebfa9e811d574034488e/src/next/Channels.ts#L131)

#### Parameters

##### channel

`string`

##### options

`any` = `{}`

##### broadcast?

`MessagePort` | `Worker` | `BroadcastChannel` | `null`

#### Returns

`any`

***

### getChannel()

```ts
getChannel(): string | null;
```

Defined in: [next/Channels.ts:164](https://github.com/fest-live/uniform.ts/blob/00a72c2f9c17cc452a19ebfa9e811d574034488e/src/next/Channels.ts#L164)

#### Returns

`string` \| `null`

***

### handleAndResponse()

```ts
handleAndResponse(request, reqId): Promise<void> | undefined;
```

Defined in: [next/Channels.ts:199](https://github.com/fest-live/uniform.ts/blob/00a72c2f9c17cc452a19ebfa9e811d574034488e/src/next/Channels.ts#L199)

#### Parameters

##### request

[`WReq`](../../Interface/interfaces/WReq.md)

##### reqId

`string`

#### Returns

`Promise`\<`void`\> \| `undefined`

***

### request()

```ts
request(
   toChannel, 
   path, 
   action, 
   args, 
   options): Promise<any> | null | undefined;
```

Defined in: [next/Channels.ts:168](https://github.com/fest-live/uniform.ts/blob/00a72c2f9c17cc452a19ebfa9e811d574034488e/src/next/Channels.ts#L168)

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

`Promise`\<`any`\> \| `null` \| `undefined`

***

### resolveResponse()

```ts
resolveResponse(reqId, result): Promise<any> | undefined;
```

Defined in: [next/Channels.ts:192](https://github.com/fest-live/uniform.ts/blob/00a72c2f9c17cc452a19ebfa9e811d574034488e/src/next/Channels.ts#L192)

#### Parameters

##### reqId

`string`

##### result

`any`

#### Returns

`Promise`\<`any`\> \| `undefined`
