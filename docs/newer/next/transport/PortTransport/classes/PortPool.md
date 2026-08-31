[**@fest-lib/uniform v0.1.19**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/transport/PortTransport](../README.md) / PortPool

# Class: PortPool

Defined in: src/newer/next/transport/PortTransport.ts:233

## Constructors

### Constructor

```ts
new PortPool(_defaultConfig?): PortPool;
```

Defined in: src/newer/next/transport/PortTransport.ts:238

#### Parameters

##### \_defaultConfig?

[`PortTransportConfig`](../interfaces/PortTransportConfig.md) = `{}`

#### Returns

`PortPool`

## Accessors

### channelNames

#### Get Signature

```ts
get channelNames(): string[];
```

Defined in: src/newer/next/transport/PortTransport.ts:345

##### Returns

`string`[]

***

### size

#### Get Signature

```ts
get size(): number;
```

Defined in: src/newer/next/transport/PortTransport.ts:346

##### Returns

`number`

## Methods

### add()

```ts
add(
   channelName, 
   port, 
   config?): PortTransport;
```

Defined in: src/newer/next/transport/PortTransport.ts:263

Add existing port to pool

#### Parameters

##### channelName

`string`

##### port

`MessagePort`

##### config?

[`PortTransportConfig`](../interfaces/PortTransportConfig.md)

#### Returns

[`PortTransport`](PortTransport.md)

***

### broadcast()

```ts
broadcast(msg, transfer?): void;
```

Defined in: src/newer/next/transport/PortTransport.ts:295

Broadcast to all channels

#### Parameters

##### msg

[`PortMessage`](../interfaces/PortMessage.md)

##### transfer?

`Transferable`[]

#### Returns

`void`

***

### close()

```ts
close(): void;
```

Defined in: src/newer/next/transport/PortTransport.ts:336

Close all channels

#### Returns

`void`

***

### create()

```ts
create(channelName, config?): ChannelPairResult;
```

Defined in: src/newer/next/transport/PortTransport.ts:245

Create new channel in pool

#### Parameters

##### channelName

`string`

##### config?

[`PortTransportConfig`](../interfaces/PortTransportConfig.md)

#### Returns

[`ChannelPairResult`](../interfaces/ChannelPairResult.md)

***

### get()

```ts
get(channelName): PortTransport | undefined;
```

Defined in: src/newer/next/transport/PortTransport.ts:281

Get channel by name

#### Parameters

##### channelName

`string`

#### Returns

[`PortTransport`](PortTransport.md) \| `undefined`

***

### remove()

```ts
remove(channelName): void;
```

Defined in: src/newer/next/transport/PortTransport.ts:325

Remove channel

#### Parameters

##### channelName

`string`

#### Returns

`void`

***

### request()

```ts
request(channelName, msg): Promise<any>;
```

Defined in: src/newer/next/transport/PortTransport.ts:304

Request on specific channel

#### Parameters

##### channelName

`string`

##### msg

[`PortMessage`](../interfaces/PortMessage.md)

#### Returns

`Promise`\<`any`\>

***

### send()

```ts
send(
   channelName, 
   msg, 
   transfer?): void;
```

Defined in: src/newer/next/transport/PortTransport.ts:288

Send to specific channel

#### Parameters

##### channelName

`string`

##### msg

[`PortMessage`](../interfaces/PortMessage.md)

##### transfer?

`Transferable`[]

#### Returns

`void`

***

### subscribe()

```ts
subscribe(observer): Subscription;
```

Defined in: src/newer/next/transport/PortTransport.ts:313

Subscribe to all channels

#### Parameters

##### observer

  \| [`Observer`](../../../types/Interface/interfaces/Observer.md)\<[`PortMessage`](../interfaces/PortMessage.md)\<`any`\>\>
  \| ((`v`) => `void`)

#### Returns

[`Subscription`](../../../types/Interface/interfaces/Subscription.md)
