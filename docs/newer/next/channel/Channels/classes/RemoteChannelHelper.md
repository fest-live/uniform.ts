[**@fest-lib/uniform v0.1.14**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/channel/Channels](../README.md) / RemoteChannelHelper

# ~~Class: RemoteChannelHelper~~

Defined in: src/newer/next/channel/Channels.ts:57

## Deprecated

Use UnifiedChannel.remote() instead

## Constructors

### Constructor

```ts
new RemoteChannelHelper(channelName, options?): RemoteChannelHelper;
```

Defined in: src/newer/next/channel/Channels.ts:60

#### Parameters

##### channelName

`string`

##### options?

`any` = `{}`

#### Returns

`RemoteChannelHelper`

## Methods

### ~~doImportModule()~~

```ts
doImportModule(url, options): Promise<any> | null;
```

Defined in: src/newer/next/channel/Channels.ts:73

#### Parameters

##### url

`string`

##### options

`any`

#### Returns

`Promise`\<`any`\> \| `null`

***

### ~~request()~~

```ts
request(
   path, 
   action, 
   args, 
   options?): Promise<any> | null;
```

Defined in: src/newer/next/channel/Channels.ts:64

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

`Promise`\<`any`\> \| `null`
