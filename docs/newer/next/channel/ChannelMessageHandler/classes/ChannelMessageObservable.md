[**@fest-lib/uniform v0.1.17**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/channel/ChannelMessageHandler](../README.md) / ChannelMessageObservable

# Class: ChannelMessageObservable

Defined in: src/newer/next/channel/ChannelMessageHandler.ts:94

## Constructors

### Constructor

```ts
new ChannelMessageObservable(_transport, _channelName): ChannelMessageObservable;
```

Defined in: src/newer/next/channel/ChannelMessageHandler.ts:101

#### Parameters

##### \_transport

[`TransportTarget`](../../../../core/TransportCore/type-aliases/TransportTarget.md)

##### \_channelName

`string`

#### Returns

`ChannelMessageObservable`

## Methods

### next()

```ts
next(msg, transfer?): void;
```

Defined in: src/newer/next/channel/ChannelMessageHandler.ts:116

#### Parameters

##### msg

[`ChannelMessage`](../../../types/Interface/interfaces/ChannelMessage.md)

##### transfer?

`Transferable`[]

#### Returns

`void`

***

### request()

```ts
request(msg): Promise<any>;
```

Defined in: src/newer/next/channel/ChannelMessageHandler.ts:118

#### Parameters

##### msg

`Omit`\<[`ChannelMessage`](../../../types/Interface/interfaces/ChannelMessage.md)\<`any`\>, `"reqId"`\> & `object`

#### Returns

`Promise`\<`any`\>

***

### subscribe()

```ts
subscribe(observer): object;
```

Defined in: src/newer/next/channel/ChannelMessageHandler.ts:105

#### Parameters

##### observer

###### complete?

() => `void`

###### error?

(`e`) => `void`

###### next?

(`v`) => `void`

#### Returns

`object`

##### unsubscribe

```ts
unsubscribe: () => void;
```

###### Returns

`void`
