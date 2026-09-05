[**@fest-lib/uniform v0.1.29**](../../../../README.md)

***

[@fest-lib/uniform](../../../../README.md) / [original/next/Channels](../README.md) / RemoteChannelHelper

# Class: RemoteChannelHelper

Defined in: uniform.ts/src/original/next/Channels.ts:54

## Constructors

### Constructor

```ts
new RemoteChannelHelper(channel, options?): RemoteChannelHelper;
```

Defined in: uniform.ts/src/original/next/Channels.ts:57

#### Parameters

##### channel

`string`

##### options?

`any` = `{}`

#### Returns

`RemoteChannelHelper`

## Methods

### doImportModule()

```ts
doImportModule(url, options): Promise<any> | null | undefined;
```

Defined in: uniform.ts/src/original/next/Channels.ts:77

#### Parameters

##### url

`string`

##### options

`any`

#### Returns

`Promise`\<`any`\> \| `null` \| `undefined`

***

### request()

```ts
request(
   path, 
   action, 
   args, 
   options?): Promise<any> | null | undefined;
```

Defined in: uniform.ts/src/original/next/Channels.ts:61

#### Parameters

##### path

  \| `string`[]
  \| [`WReflectDescriptor`](../../Interface/interfaces/WReflectDescriptor.md)\<`any`\>

##### action

  \| `any`[]
  \| [`WReflectAction`](../../Interface/enumerations/WReflectAction.md)

##### args

`any`

##### options?

`any` = `{}`

#### Returns

`Promise`\<`any`\> \| `null` \| `undefined`
