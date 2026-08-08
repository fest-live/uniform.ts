[**@fest-lib/uniform v0.1.4**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/observable/Observable](../README.md) / MessageObservable

# Class: MessageObservable

Defined in: src/newer/next/observable/Observable.ts:238

Subject - Observable that can be pushed to

## Extends

- [`ChannelSubject`](ChannelSubject.md)\<[`ChannelMessage`](../../../types/Interface/interfaces/ChannelMessage.md)\>

## Constructors

### Constructor

```ts
new MessageObservable(source, messageType?): MessageObservable;
```

Defined in: src/newer/next/observable/Observable.ts:239

#### Parameters

##### source

[`Subscribable`](../../../types/Interface/interfaces/Subscribable.md)\<[`ChannelMessage`](../../../types/Interface/interfaces/ChannelMessage.md)\<`any`\>\>

##### messageType?

`string`

#### Returns

`MessageObservable`

#### Overrides

[`ChannelSubject`](ChannelSubject.md).[`constructor`](ChannelSubject.md#constructor)

## Accessors

### subscriberCount

#### Get Signature

```ts
get subscriberCount(): number;
```

Defined in: src/newer/next/observable/Observable.ts:130

##### Returns

`number`

#### Inherited from

[`ChannelSubject`](ChannelSubject.md).[`subscriberCount`](ChannelSubject.md#subscribercount)

## Methods

### complete()

```ts
complete(): void;
```

Defined in: src/newer/next/observable/Observable.ts:115

#### Returns

`void`

#### Inherited from

[`ChannelSubject`](ChannelSubject.md).[`complete`](ChannelSubject.md#complete)

***

### error()

```ts
error(err): void;
```

Defined in: src/newer/next/observable/Observable.ts:114

#### Parameters

##### err

`Error`

#### Returns

`void`

#### Inherited from

[`ChannelSubject`](ChannelSubject.md).[`error`](ChannelSubject.md#error)

***

### getBuffer()

```ts
getBuffer(): ChannelMessage<any>[];
```

Defined in: src/newer/next/observable/Observable.ts:129

#### Returns

[`ChannelMessage`](../../../types/Interface/interfaces/ChannelMessage.md)\<`any`\>[]

#### Inherited from

[`ChannelSubject`](ChannelSubject.md).[`getBuffer`](ChannelSubject.md#getbuffer)

***

### getValue()

```ts
getValue(): 
  | ChannelMessage<any>
  | undefined;
```

Defined in: src/newer/next/observable/Observable.ts:128

#### Returns

  \| [`ChannelMessage`](../../../types/Interface/interfaces/ChannelMessage.md)\<`any`\>
  \| `undefined`

#### Inherited from

[`ChannelSubject`](ChannelSubject.md).[`getValue`](ChannelSubject.md#getvalue)

***

### next()

```ts
next(value): void;
```

Defined in: src/newer/next/observable/Observable.ts:104

#### Parameters

##### value

[`ChannelMessage`](../../../types/Interface/interfaces/ChannelMessage.md)

#### Returns

`void`

#### Inherited from

[`ChannelSubject`](ChannelSubject.md).[`next`](ChannelSubject.md#next)

***

### subscribe()

```ts
subscribe(observerOrNext): Subscription;
```

Defined in: src/newer/next/observable/Observable.ts:117

#### Parameters

##### observerOrNext

  \| [`Observer`](../../../types/Interface/interfaces/Observer.md)\<[`ChannelMessage`](../../../types/Interface/interfaces/ChannelMessage.md)\<`any`\>\>
  \| ((`v`) => `void`)

#### Returns

[`Subscription`](../../../types/Interface/interfaces/Subscription.md)

#### Inherited from

[`ChannelSubject`](ChannelSubject.md).[`subscribe`](ChannelSubject.md#subscribe)
