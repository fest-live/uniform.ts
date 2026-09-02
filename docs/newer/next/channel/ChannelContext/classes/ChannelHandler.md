[**@fest-lib/uniform v0.1.22**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/channel/ChannelContext](../README.md) / ChannelHandler

# Class: ChannelHandler

Defined in: src/newer/next/channel/ChannelContext.ts:221

## Constructors

### Constructor

```ts
new ChannelHandler(
   _channel, 
   _context, 
   _options?): ChannelHandler;
```

Defined in: src/newer/next/channel/ChannelContext.ts:242

#### Parameters

##### \_channel

`string`

##### \_context

[`ChannelContext`](ChannelContext.md)

##### \_options?

[`ConnectionOptions`](../../../types/Interface/interfaces/ConnectionOptions.md) = `{}`

#### Returns

`ChannelHandler`

## Accessors

### connection

#### Get Signature

```ts
get connection(): ChannelConnection;
```

Defined in: src/newer/next/channel/ChannelContext.ts:318

##### Returns

[`ChannelConnection`](../../Connection/classes/ChannelConnection.md)

***

### unified

#### Get Signature

```ts
get unified(): UnifiedChannel;
```

Defined in: src/newer/next/channel/ChannelContext.ts:391

##### Returns

[`UnifiedChannel`](../../UnifiedChannel/classes/UnifiedChannel.md)

## Methods

### close()

```ts
close(): void;
```

Defined in: src/newer/next/channel/ChannelContext.ts:383

#### Returns

`void`

***

### createRemoteChannel()

```ts
createRemoteChannel(
   channel, 
   options?, 
   broadcast?): RemoteChannelHelper;
```

Defined in: src/newer/next/channel/ChannelContext.ts:255

#### Parameters

##### channel

`string`

##### options?

[`ConnectionOptions`](../../../types/Interface/interfaces/ConnectionOptions.md) = `{}`

##### broadcast?

  \| [`NativeChannelTransport`](../type-aliases/NativeChannelTransport.md)
  \| [`TransportBinding`](../../UnifiedChannel/interfaces/TransportBinding.md)\<[`NativeChannelTransport`](../type-aliases/NativeChannelTransport.md)\>
  \| `null`

#### Returns

[`RemoteChannelHelper`](RemoteChannelHelper.md)

***

### getChannel()

```ts
getChannel(): string;
```

Defined in: src/newer/next/channel/ChannelContext.ts:317

#### Returns

`string`

***

### getConnectedChannels()

```ts
getConnectedChannels(): string[];
```

Defined in: src/newer/next/channel/ChannelContext.ts:379

#### Returns

`string`[]

***

### notifyChannel()

```ts
notifyChannel(
   targetChannel, 
   payload?, 
   type?): boolean;
```

Defined in: src/newer/next/channel/ChannelContext.ts:366

#### Parameters

##### targetChannel

`string`

##### payload?

`any` = `{}`

##### type?

`"notify"` \| `"connect"`

#### Returns

`boolean`

***

### request()

```ts
request(
   path, 
   action, 
   args, 
   options?, 
   toChannel?): Promise<any> | null;
```

Defined in: src/newer/next/channel/ChannelContext.ts:320

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
