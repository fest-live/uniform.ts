[**@fest-lib/uniform v0.1.15**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/transport/ServiceWorkerHost](../README.md) / ServiceWorkerClient

# Class: ServiceWorkerClient

Defined in: src/newer/next/transport/ServiceWorkerHost.ts:563

ServiceWorkerClient - Connects a page/component TO the SW host.

This is what runs in the main thread to connect to the SW host.

## Constructors

### Constructor

```ts
new ServiceWorkerClient(_channelName): ServiceWorkerClient;
```

Defined in: src/newer/next/transport/ServiceWorkerHost.ts:571

#### Parameters

##### \_channelName

`string`

#### Returns

`ServiceWorkerClient`

## Accessors

### isConnected

#### Get Signature

```ts
get isConnected(): boolean;
```

Defined in: src/newer/next/transport/ServiceWorkerHost.ts:729

Check if connected

##### Returns

`boolean`

## Methods

### connect()

```ts
connect(): Promise<void>;
```

Defined in: src/newer/next/transport/ServiceWorkerHost.ts:576

Connect to SW host

#### Returns

`Promise`\<`void`\>

***

### disconnect()

```ts
disconnect(): void;
```

Defined in: src/newer/next/transport/ServiceWorkerHost.ts:628

Disconnect from SW host

#### Returns

`void`

***

### emit()

```ts
emit(
   eventType, 
   data, 
   targetChannel?): void;
```

Defined in: src/newer/next/transport/ServiceWorkerHost.ts:699

Send event to SW host

#### Parameters

##### eventType

`string`

##### data

`any`

##### targetChannel?

`string`

#### Returns

`void`

***

### on()

```ts
on(eventType, handler): Subscription;
```

Defined in: src/newer/next/transport/ServiceWorkerHost.ts:720

Subscribe to specific event type

#### Parameters

##### eventType

`string`

##### handler

(`data`) => `void`

#### Returns

[`Subscription`](../../../types/Interface/interfaces/Subscription.md)

***

### request()

```ts
request<T>(action, payload?): Promise<T>;
```

Defined in: src/newer/next/transport/ServiceWorkerHost.ts:668

Send request to SW host

#### Type Parameters

##### T

`T` = `any`

#### Parameters

##### action

`string`

##### payload?

`any` = `{}`

#### Returns

`Promise`\<`T`\>

***

### subscribe()

```ts
subscribe(handler): Subscription;
```

Defined in: src/newer/next/transport/ServiceWorkerHost.ts:713

Subscribe to messages from SW host

#### Parameters

##### handler

(`msg`) => `void`

#### Returns

[`Subscription`](../../../types/Interface/interfaces/Subscription.md)

***

### subscribeToChannel()

```ts
subscribeToChannel(channel): void;
```

Defined in: src/newer/next/transport/ServiceWorkerHost.ts:646

Subscribe to a channel

#### Parameters

##### channel

`string`

#### Returns

`void`

***

### unsubscribeFromChannel()

```ts
unsubscribeFromChannel(channel): void;
```

Defined in: src/newer/next/transport/ServiceWorkerHost.ts:657

Unsubscribe from a channel

#### Parameters

##### channel

`string`

#### Returns

`void`
