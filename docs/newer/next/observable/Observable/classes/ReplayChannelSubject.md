[**@fest-lib/uniform v0.1.8**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/observable/Observable](../README.md) / ReplayChannelSubject

# Class: ReplayChannelSubject\<T\>

Defined in: src/newer/next/observable/Observable.ts:133

Subject - Observable that can be pushed to

## Extends

- [`ChannelSubject`](ChannelSubject.md)\<`T`\>

## Type Parameters

### T

`T` = `any`

## Constructors

### Constructor

```ts
new ReplayChannelSubject<T>(bufferSize?): ReplayChannelSubject<T>;
```

Defined in: src/newer/next/observable/Observable.ts:134

#### Parameters

##### bufferSize?

`number` = `1`

#### Returns

`ReplayChannelSubject`\<`T`\>

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
getBuffer(): T[];
```

Defined in: src/newer/next/observable/Observable.ts:129

#### Returns

`T`[]

#### Inherited from

[`ChannelSubject`](ChannelSubject.md).[`getBuffer`](ChannelSubject.md#getbuffer)

***

### getValue()

```ts
getValue(): T | undefined;
```

Defined in: src/newer/next/observable/Observable.ts:128

#### Returns

`T` \| `undefined`

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

`T`

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

  \| [`Observer`](../../../types/Interface/interfaces/Observer.md)\<`T`\>
  \| ((`v`) => `void`)

#### Returns

[`Subscription`](../../../types/Interface/interfaces/Subscription.md)

#### Inherited from

[`ChannelSubject`](ChannelSubject.md).[`subscribe`](ChannelSubject.md#subscribe)
