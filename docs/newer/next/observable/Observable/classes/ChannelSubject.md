[**@fest-lib/uniform v0.1.10**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/observable/Observable](../README.md) / ChannelSubject

# Class: ChannelSubject\<T\>

Defined in: src/newer/next/observable/Observable.ts:93

Subject - Observable that can be pushed to

## Extended by

- [`ReplayChannelSubject`](ReplayChannelSubject.md)
- [`MessageObservable`](MessageObservable.md)

## Type Parameters

### T

`T` = `any`

## Implements

- [`Subscribable`](../../../types/Interface/interfaces/Subscribable.md)\<`T`\>

## Constructors

### Constructor

```ts
new ChannelSubject<T>(options?): ChannelSubject<T>;
```

Defined in: src/newer/next/observable/Observable.ts:99

#### Parameters

##### options?

[`SubjectOptions`](../interfaces/SubjectOptions.md) = `{}`

#### Returns

`ChannelSubject`\<`T`\>

## Accessors

### subscriberCount

#### Get Signature

```ts
get subscriberCount(): number;
```

Defined in: src/newer/next/observable/Observable.ts:130

##### Returns

`number`

## Methods

### complete()

```ts
complete(): void;
```

Defined in: src/newer/next/observable/Observable.ts:115

#### Returns

`void`

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

***

### getBuffer()

```ts
getBuffer(): T[];
```

Defined in: src/newer/next/observable/Observable.ts:129

#### Returns

`T`[]

***

### getValue()

```ts
getValue(): T | undefined;
```

Defined in: src/newer/next/observable/Observable.ts:128

#### Returns

`T` \| `undefined`

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

#### Implementation of

[`Subscribable`](../../../types/Interface/interfaces/Subscribable.md).[`subscribe`](../../../types/Interface/interfaces/Subscribable.md#subscribe)
