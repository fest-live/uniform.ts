[**@fest-lib/uniform v0.1.29**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/transport/SharedWorkerTransport](../README.md) / SharedWorkerHost

# Class: SharedWorkerHost

Defined in: uniform.ts/src/newer/next/transport/SharedWorkerTransport.ts:214

SharedWorker host - runs inside the shared worker context

## Constructors

### Constructor

```ts
new SharedWorkerHost(_channelName): SharedWorkerHost;
```

Defined in: uniform.ts/src/newer/next/transport/SharedWorkerTransport.ts:219

#### Parameters

##### \_channelName

`string`

#### Returns

`SharedWorkerHost`

## Accessors

### channelName

#### Get Signature

```ts
get channelName(): string;
```

Defined in: uniform.ts/src/newer/next/transport/SharedWorkerTransport.ts:348

##### Returns

`string`

***

### portCount

#### Get Signature

```ts
get portCount(): number;
```

Defined in: uniform.ts/src/newer/next/transport/SharedWorkerTransport.ts:346

##### Returns

`number`

***

### state

#### Get Signature

```ts
get state(): ChannelSubject<"error" | "ready">;
```

Defined in: uniform.ts/src/newer/next/transport/SharedWorkerTransport.ts:347

##### Returns

[`ChannelSubject`](../../../observable/Observable/classes/ChannelSubject.md)\<`"error"` \| `"ready"`\>

## Methods

### broadcast()

```ts
broadcast(msg, excludePortId?): void;
```

Defined in: uniform.ts/src/newer/next/transport/SharedWorkerTransport.ts:308

#### Parameters

##### msg

[`SharedWorkerMessage`](../interfaces/SharedWorkerMessage.md)

##### excludePortId?

`string`

#### Returns

`void`

***

### getPorts()

```ts
getPorts(): Map<string, SharedWorkerPortInfo>;
```

Defined in: uniform.ts/src/newer/next/transport/SharedWorkerTransport.ts:338

#### Returns

`Map`\<`string`, [`SharedWorkerPortInfo`](../interfaces/SharedWorkerPortInfo.md)\>

***

### respond()

```ts
respond(
   msg, 
   result, 
   transfer?): void;
```

Defined in: uniform.ts/src/newer/next/transport/SharedWorkerTransport.ts:317

#### Parameters

##### msg

[`SharedWorkerMessage`](../interfaces/SharedWorkerMessage.md)

##### result

`any`

##### transfer?

`Transferable`[]

#### Returns

`void`

***

### send()

```ts
send(
   portId, 
   msg, 
   transfer?): void;
```

Defined in: uniform.ts/src/newer/next/transport/SharedWorkerTransport.ts:301

#### Parameters

##### portId

`string`

##### msg

[`SharedWorkerMessage`](../interfaces/SharedWorkerMessage.md)

##### transfer?

`Transferable`[]

#### Returns

`void`

***

### subscribe()

```ts
subscribe(observer): Subscription;
```

Defined in: uniform.ts/src/newer/next/transport/SharedWorkerTransport.ts:329

#### Parameters

##### observer

  \| [`Observer`](../../../types/Interface/interfaces/Observer.md)\<[`SharedWorkerMessage`](../interfaces/SharedWorkerMessage.md)\<`any`\>\>
  \| ((`v`) => `void`)

#### Returns

[`Subscription`](../../../types/Interface/interfaces/Subscription.md)
