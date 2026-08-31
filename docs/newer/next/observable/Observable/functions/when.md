[**@fest-lib/uniform v0.1.19**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/observable/Observable](../README.md) / when

# Function: when()

## Call Signature

```ts
function when<K>(target, eventName): Observable<HTMLElementEventMap[K]>;
```

Defined in: src/newer/next/observable/Observable.ts:351

### Type Parameters

#### K

`K` *extends* keyof `HTMLElementEventMap`

### Parameters

#### target

`EventTarget`

#### eventName

`K`

### Returns

[`Observable`](../classes/Observable.md)\<`HTMLElementEventMap`\[`K`\]\>

## Call Signature

```ts
function when(target, eventName): Observable<Event>;
```

Defined in: src/newer/next/observable/Observable.ts:352

### Parameters

#### target

`EventTarget`

#### eventName

`string`

### Returns

[`Observable`](../classes/Observable.md)\<`Event`\>
