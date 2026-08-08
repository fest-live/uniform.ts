[**@fest-lib/uniform v0.1.4**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/channel/ChannelContext](../README.md) / RemoteChannelHelper

# Class: RemoteChannelHelper

Defined in: src/newer/next/channel/ChannelContext.ts:155

## Constructors

### Constructor

```ts
new RemoteChannelHelper(
   _channel, 
   _context, 
   _options?): RemoteChannelHelper;
```

Defined in: src/newer/next/channel/ChannelContext.ts:159

#### Parameters

##### \_channel

`string`

##### \_context

[`ChannelContext`](ChannelContext.md)

##### \_options?

[`ConnectionOptions`](../../../types/Interface/interfaces/ConnectionOptions.md) = `{}`

#### Returns

`RemoteChannelHelper`

## Accessors

### channelName

#### Get Signature

```ts
get channelName(): string;
```

Defined in: src/newer/next/channel/ChannelContext.ts:213

##### Returns

`string`

***

### connection

#### Get Signature

```ts
get connection(): ChannelConnection;
```

Defined in: src/newer/next/channel/ChannelContext.ts:212

##### Returns

[`ChannelConnection`](../../Connection/classes/ChannelConnection.md)

***

### context

#### Get Signature

```ts
get context(): ChannelContext;
```

Defined in: src/newer/next/channel/ChannelContext.ts:214

##### Returns

[`ChannelContext`](ChannelContext.md)

## Methods

### deferMessage()

```ts
deferMessage(payload, options?): Promise<string>;
```

Defined in: src/newer/next/channel/ChannelContext.ts:199

#### Parameters

##### payload

`any`

##### options?

###### expiresIn?

`number`

###### priority?

`number`

#### Returns

`Promise`\<`string`\>

***

### doImportModule()

```ts
doImportModule(url, options?): Promise<any>;
```

Defined in: src/newer/next/channel/ChannelContext.ts:195

#### Parameters

##### url

`string`

##### options?

`any` = `{}`

#### Returns

`Promise`\<`any`\>

***

### getPendingMessages()

```ts
getPendingMessages(): Promise<any[]>;
```

Defined in: src/newer/next/channel/ChannelContext.ts:208

#### Returns

`Promise`\<`any`[]\>

***

### request()

```ts
request(
   path, 
   action, 
   args, 
options?): Promise<any>;
```

Defined in: src/newer/next/channel/ChannelContext.ts:168

#### Parameters

##### path

  \| `string`[]
  \| [`WReflectDescriptor`](../../../types/Interface/interfaces/WReflectDescriptor.md)\<`any`\>

##### action

  \| `any`[]
  \| [`WReflectAction`](../../../types/Interface/enumerations/WReflectAction.md)

##### args

`any`

##### options?

`any` = `{}`

#### Returns

`Promise`\<`any`\>
