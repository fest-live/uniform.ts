[**@fest-lib/uniform v0.0.0**](../../../README.md)

***

[@fest-lib/uniform](../../../README.md) / [next/Channels](../README.md) / RemoteChannelHelper

# Class: RemoteChannelHelper

Defined in: [next/Channels.ts:41](https://github.com/fest-live/uniform.ts/blob/37b3e597feae16da872afd10a6f2319a4c1b210a/src/next/Channels.ts#L41)

## Constructors

### Constructor

```ts
new RemoteChannelHelper(channel, options): RemoteChannelHelper;
```

Defined in: [next/Channels.ts:44](https://github.com/fest-live/uniform.ts/blob/37b3e597feae16da872afd10a6f2319a4c1b210a/src/next/Channels.ts#L44)

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
doImportModule(url, options): Promise<any> | null | undefined;
```

Defined in: [next/Channels.ts:52](https://github.com/fest-live/uniform.ts/blob/37b3e597feae16da872afd10a6f2319a4c1b210a/src/next/Channels.ts#L52)

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
   options): Promise<any> | null | undefined;
```

Defined in: [next/Channels.ts:48](https://github.com/fest-live/uniform.ts/blob/37b3e597feae16da872afd10a6f2319a4c1b210a/src/next/Channels.ts#L48)

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

`Promise`\<`any`\> \| `null` \| `undefined`
