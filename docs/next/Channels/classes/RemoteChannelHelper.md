[**@fest/uniform v0.0.0**](../../../README.md)

***

[@fest/uniform](../../../README.md) / [next/Channels](../README.md) / RemoteChannelHelper

# Class: RemoteChannelHelper

Defined in: next/Channels.ts:41

## Constructors

### Constructor

```ts
new RemoteChannelHelper(channel, options): RemoteChannelHelper;
```

Defined in: next/Channels.ts:44

#### Parameters

##### channel

`string`

##### options

`any` = `{}`

#### Returns

`RemoteChannelHelper`

## Methods

### doImportModule()

```ts
doImportModule(url, options): undefined | null | Promise<any>;
```

Defined in: next/Channels.ts:52

#### Parameters

##### url

`string`

##### options

`any`

#### Returns

`undefined` \| `null` \| `Promise`\<`any`\>

***

### request()

```ts
request(
   path, 
   action, 
   args, 
options): undefined | null | Promise<any>;
```

Defined in: next/Channels.ts:48

#### Parameters

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
