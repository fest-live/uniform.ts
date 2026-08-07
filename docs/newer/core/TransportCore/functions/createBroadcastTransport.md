[**@fest-lib/uniform v0.1.2**](../../../../README.md)

***

[@fest-lib/uniform](../../../../README.md) / [newer/core/TransportCore](../README.md) / createBroadcastTransport

# Function: createBroadcastTransport()

```ts
function createBroadcastTransport(channelName): object;
```

Defined in: src/newer/core/TransportCore.ts:556

## Parameters

### channelName

`string`

## Returns

`object`

### channel

```ts
channel: BroadcastChannel;
```

### close

```ts
close: () => void;
```

#### Returns

`void`

### listen

```ts
listen: (handler) => () => void;
```

#### Parameters

##### handler

(`data`) => `void`

#### Returns

() => `void`

### send

```ts
send: SendFn;
```
