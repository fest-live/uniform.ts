[**@fest-lib/uniform v0.1.18**](../../../../README.md)

***

[@fest-lib/uniform](../../../../README.md) / [original/next/Channels](../README.md) / ChannelHandler

# Class: ChannelHandler

Defined in: src/original/next/Channels.ts:143

## Constructors

### Constructor

```ts
new ChannelHandler(channel, options?): ChannelHandler;
```

Defined in: src/original/next/Channels.ts:149

#### Parameters

##### channel

`string`

##### options?

`any` = `{}`

#### Returns

`ChannelHandler`

## Methods

### createRemoteChannel()

```ts
createRemoteChannel(
   channel, 
   options?, 
   broadcast?): any;
```

Defined in: src/original/next/Channels.ts:156

#### Parameters

##### channel

`string`

##### options?

`any` = `{}`

##### broadcast?

`Worker` \| `MessagePort` \| `BroadcastChannel` \| `null`

#### Returns

`any`

***

### getChannel()

```ts
getChannel(): string | null;
```

Defined in: src/original/next/Channels.ts:189

#### Returns

`string` \| `null`

***

### handleAndResponse()

```ts
handleAndResponse(
   request, 
   reqId, 
   response?): Promise<void> | undefined;
```

Defined in: src/original/next/Channels.ts:236

#### Parameters

##### request

[`WReq`](../../Interface/interfaces/WReq.md)

##### reqId

`string`

##### response?

((`result`, `_`) => `void`) \| `null`

#### Returns

`Promise`\<`void`\> \| `undefined`

***

### request()

```ts
request(
   path, 
   action, 
   args, 
   options?, 
   toChannel?): Promise<any> | null | undefined;
```

Defined in: src/original/next/Channels.ts:193

#### Parameters

##### path

  \| `string`[]
  \| [`WReflectAction`](../../Interface/enumerations/WReflectAction.md)

##### action

  \| `any`[]
  \| [`WReflectAction`](../../Interface/enumerations/WReflectAction.md)

##### args

`any`

##### options?

`any` = `{}`

##### toChannel?

`string` = `"worker"`

#### Returns

`Promise`\<`any`\> \| `null` \| `undefined`

***

### resolveResponse()

```ts
resolveResponse(reqId, result): Promise<any> | undefined;
```

Defined in: src/original/next/Channels.ts:229

#### Parameters

##### reqId

`string`

##### result

`any`

#### Returns

`Promise`\<`any`\> \| `undefined`
