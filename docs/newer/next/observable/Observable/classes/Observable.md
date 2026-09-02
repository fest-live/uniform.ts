[**@fest-lib/uniform v0.1.23**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/observable/Observable](../README.md) / Observable

# Class: Observable\<T\>

Defined in: uniform.ts/src/newer/next/observable/Observable.ts:50

Core Observable with producer function

## Type Parameters

### T

`T` = `any`

## Implements

- [`Subscribable`](../../../types/Interface/interfaces/Subscribable.md)\<`T`\>

## Constructors

### Constructor

```ts
new Observable<T>(_producer): Observable<T>;
```

Defined in: uniform.ts/src/newer/next/observable/Observable.ts:51

#### Parameters

##### \_producer

[`Producer`](../../../types/Interface/type-aliases/Producer.md)\<`T`\>

#### Returns

`Observable`\<`T`\>

## Methods

### pipe()

```ts
pipe<R>(...ops): Observable<R>;
```

Defined in: uniform.ts/src/newer/next/observable/Observable.ts:79

#### Type Parameters

##### R

`R`

#### Parameters

##### ops

...(`s`) => `Observable`\<`R`\>[]

#### Returns

`Observable`\<`R`\>

***

### subscribe()

```ts
subscribe(observerOrNext?, opts?): Subscription;
```

Defined in: uniform.ts/src/newer/next/observable/Observable.ts:53

#### Parameters

##### observerOrNext?

  \| [`Observer`](../../../types/Interface/interfaces/Observer.md)\<`T`\>
  \| ((`v`) => `void`)

##### opts?

###### signal?

`AbortSignal`

#### Returns

[`Subscription`](../../../types/Interface/interfaces/Subscription.md)

#### Implementation of

[`Subscribable`](../../../types/Interface/interfaces/Subscribable.md).[`subscribe`](../../../types/Interface/interfaces/Subscribable.md#subscribe)
