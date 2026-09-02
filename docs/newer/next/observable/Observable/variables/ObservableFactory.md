[**@fest-lib/uniform v0.1.20**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/observable/Observable](../README.md) / ObservableFactory

# Variable: ObservableFactory

```ts
const ObservableFactory: object;
```

Defined in: src/newer/next/observable/Observable.ts:365

## Type Declaration

### bidirectional

```ts
bidirectional: (transport, channelName, handler?) => BidirectionalChannel<ChannelMessage<any>> = createBidirectionalChannel;
```

#### Parameters

##### transport

[`TransportTarget`](../../../../core/TransportCore/type-aliases/TransportTarget.md)

##### channelName

`string`

##### handler?

[`InvokerHandler`](../../../types/Interface/type-aliases/InvokerHandler.md)\<[`ChannelMessage`](../../../types/Interface/interfaces/ChannelMessage.md)\<`any`\>\>

#### Returns

[`BidirectionalChannel`](../interfaces/BidirectionalChannel.md)\<[`ChannelMessage`](../../../types/Interface/interfaces/ChannelMessage.md)\<`any`\>\>

### channel

```ts
channel: (transport, name) => ChannelObservable;
```

#### Parameters

##### transport

[`TransportTarget`](../../../../core/TransportCore/type-aliases/TransportTarget.md)

##### name

`string`

#### Returns

[`ChannelObservable`](../classes/ChannelObservable.md)

### delay

```ts
delay: <T>(value, ms) => Observable<T>;
```

#### Type Parameters

##### T

`T`

#### Parameters

##### value

`T`

##### ms

`number`

#### Returns

[`Observable`](../classes/Observable.md)\<`T`\>

### fromEvent

```ts
fromEvent: <K>(target, event) => Observable<HTMLElementEventMap[K]>;
```

#### Type Parameters

##### K

`K` *extends* keyof `HTMLElementEventMap`

#### Parameters

##### target

`EventTarget`

##### event

`K`

#### Returns

[`Observable`](../classes/Observable.md)\<`HTMLElementEventMap`\[`K`\]\>

### fromPromise

```ts
fromPromise: <T>(promise) => Observable<T>;
```

#### Type Parameters

##### T

`T`

#### Parameters

##### promise

`Promise`\<`T`\>

#### Returns

[`Observable`](../classes/Observable.md)\<`T`\>

### handler

```ts
handler: (transport, name) => Observable<ChannelMessage<any>>;
```

#### Parameters

##### transport

[`TransportTarget`](../../../../core/TransportCore/type-aliases/TransportTarget.md)

##### name

`string`

#### Returns

[`Observable`](../classes/Observable.md)\<[`ChannelMessage`](../../../types/Interface/interfaces/ChannelMessage.md)\<`any`\>\>

### interval

```ts
interval: (ms) => Observable<number>;
```

#### Parameters

##### ms

`number`

#### Returns

[`Observable`](../classes/Observable.md)\<`number`\>

### invoker

```ts
invoker: (transport, name, handler?) => Observable<ChannelMessage<any>>;
```

#### Parameters

##### transport

[`TransportTarget`](../../../../core/TransportCore/type-aliases/TransportTarget.md)

##### name

`string`

##### handler?

[`InvokerHandler`](../../../types/Interface/type-aliases/InvokerHandler.md)\<[`ChannelMessage`](../../../types/Interface/interfaces/ChannelMessage.md)\<`any`\>\>

#### Returns

[`Observable`](../classes/Observable.md)\<[`ChannelMessage`](../../../types/Interface/interfaces/ChannelMessage.md)\<`any`\>\>

### merge

```ts
merge: <T>(...sources) => Observable<T>;
```

#### Type Parameters

##### T

`T`

#### Parameters

##### sources

...[`Subscribable`](../../../types/Interface/interfaces/Subscribable.md)\<`T`\>[]

#### Returns

[`Observable`](../classes/Observable.md)\<`T`\>

### when

```ts
when: {
<K>  (target, eventName): Observable<HTMLElementEventMap[K]>;
  (target, eventName): Observable<Event>;
};
```

#### Call Signature

```ts
<K>(target, eventName): Observable<HTMLElementEventMap[K]>;
```

##### Type Parameters

###### K

`K` *extends* keyof `HTMLElementEventMap`

##### Parameters

###### target

`EventTarget`

###### eventName

`K`

##### Returns

[`Observable`](../classes/Observable.md)\<`HTMLElementEventMap`\[`K`\]\>

#### Call Signature

```ts
(target, eventName): Observable<Event>;
```

##### Parameters

###### target

`EventTarget`

###### eventName

`string`

##### Returns

[`Observable`](../classes/Observable.md)\<`Event`\>
