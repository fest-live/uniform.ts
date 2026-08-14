[**@fest-lib/uniform v0.1.8**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/transport/PortTransport](../README.md) / PortTransport

# Class: PortTransport

Defined in: src/newer/next/transport/PortTransport.ts:43

## Constructors

### Constructor

```ts
new PortTransport(
   port, 
   _channelName, 
   _config?): PortTransport;
```

Defined in: src/newer/next/transport/PortTransport.ts:53

#### Parameters

##### port

`MessagePort`

##### \_channelName

`string`

##### \_config?

[`PortTransportConfig`](../interfaces/PortTransportConfig.md) = `{}`

#### Returns

`PortTransport`

## Accessors

### channelName

#### Get Signature

```ts
get channelName(): string;
```

Defined in: src/newer/next/transport/PortTransport.ts:183

##### Returns

`string`

***

### isListening

#### Get Signature

```ts
get isListening(): boolean;
```

Defined in: src/newer/next/transport/PortTransport.ts:181

##### Returns

`boolean`

***

### port

#### Get Signature

```ts
get port(): MessagePort;
```

Defined in: src/newer/next/transport/PortTransport.ts:179

##### Returns

`MessagePort`

***

### portId

#### Get Signature

```ts
get portId(): string;
```

Defined in: src/newer/next/transport/PortTransport.ts:180

##### Returns

`string`

***

### state

#### Get Signature

```ts
get state(): ChannelSubject<"error" | "closed" | "ready">;
```

Defined in: src/newer/next/transport/PortTransport.ts:182

##### Returns

[`ChannelSubject`](../../../observable/Observable/classes/ChannelSubject.md)\<`"error"` \| `"closed"` \| `"ready"`\>

## Methods

### close()

```ts
close(): void;
```

Defined in: src/newer/next/transport/PortTransport.ts:167

#### Returns

`void`

***

### request()

```ts
request(msg): Promise<any>;
```

Defined in: src/newer/next/transport/PortTransport.ts:128

#### Parameters

##### msg

`Omit`\<[`PortMessage`](../interfaces/PortMessage.md)\<`any`\>, `"reqId"`\> & `object`

#### Returns

`Promise`\<`any`\>

***

### send()

```ts
send(msg, transfer?): void;
```

Defined in: src/newer/next/transport/PortTransport.ts:123

#### Parameters

##### msg

[`PortMessage`](../interfaces/PortMessage.md)

##### transfer?

`Transferable`[]

#### Returns

`void`

***

### start()

```ts
start(): void;
```

Defined in: src/newer/next/transport/PortTransport.ts:112

#### Returns

`void`

***

### subscribe()

```ts
subscribe(observer): Subscription;
```

Defined in: src/newer/next/transport/PortTransport.ts:146

#### Parameters

##### observer

  \| [`Observer`](../../../types/Interface/interfaces/Observer.md)\<[`PortMessage`](../interfaces/PortMessage.md)\<`any`\>\>
  \| ((`v`) => `void`)

#### Returns

[`Subscription`](../../../types/Interface/interfaces/Subscription.md)
