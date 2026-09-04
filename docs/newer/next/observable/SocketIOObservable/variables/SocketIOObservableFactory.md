[**@fest-lib/uniform v0.1.25**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/observable/SocketIOObservable](../README.md) / SocketIOObservableFactory

# Variable: SocketIOObservableFactory

```ts
const SocketIOObservableFactory: object;
```

Defined in: uniform.ts/src/newer/next/observable/SocketIOObservable.ts:239

## Type Declaration

### create

```ts
create: (socket, channelName, options?) => SocketIOObservable;
```

#### Parameters

##### socket

[`SocketIOLike`](../interfaces/SocketIOLike.md)

##### channelName

`string`

##### options?

[`SocketObservableOptions`](../interfaces/SocketObservableOptions.md)

#### Returns

[`SocketIOObservable`](../classes/SocketIOObservable.md)

### room

```ts
room: (parent, roomName) => SocketIORoomObservable;
```

#### Parameters

##### parent

[`SocketIOObservable`](../classes/SocketIOObservable.md)

##### roomName

`string`

#### Returns

[`SocketIORoomObservable`](../classes/SocketIORoomObservable.md)
