[**@fest-lib/uniform v0.1.24**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/channel/ChannelMessageHandler](../README.md) / ObservableRequestDispatcher

# Class: ObservableRequestDispatcher

Defined in: uniform.ts/src/newer/next/channel/ChannelMessageHandler.ts:171

## Constructors

### Constructor

```ts
new ObservableRequestDispatcher(_channelName, _targetChannel): ObservableRequestDispatcher;
```

Defined in: uniform.ts/src/newer/next/channel/ChannelMessageHandler.ts:175

#### Parameters

##### \_channelName

`string`

##### \_targetChannel

`string`

#### Returns

`ObservableRequestDispatcher`

## Methods

### connect()

```ts
connect(subscriber): void;
```

Defined in: uniform.ts/src/newer/next/channel/ChannelMessageHandler.ts:177

#### Parameters

##### subscriber

[`ChannelSubscriber`](../interfaces/ChannelSubscriber.md)\<[`ChannelMessage`](../../../types/Interface/interfaces/ChannelMessage.md)\<`any`\>\>

#### Returns

`void`

***

### disconnect()

```ts
disconnect(): void;
```

Defined in: uniform.ts/src/newer/next/channel/ChannelMessageHandler.ts:179

#### Returns

`void`

***

### dispatch()

```ts
dispatch(
   action, 
   path, 
args): Promise<any>;
```

Defined in: uniform.ts/src/newer/next/channel/ChannelMessageHandler.ts:192

#### Parameters

##### action

`string`

##### path

`string`[]

##### args

`any`[]

#### Returns

`Promise`\<`any`\>

***

### handleMessage()

```ts
handleMessage(data): void;
```

Defined in: uniform.ts/src/newer/next/channel/ChannelMessageHandler.ts:185

#### Parameters

##### data

[`ChannelMessage`](../../../types/Interface/interfaces/ChannelMessage.md)

#### Returns

`void`
