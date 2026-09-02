[**@fest-lib/uniform v0.1.22**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/observable/ChromeObservable](../README.md) / ChromeRuntimeObservable

# Class: ChromeRuntimeObservable

Defined in: src/newer/next/observable/ChromeObservable.ts:73

## Extends

- `BaseChromeObservable`\<[`ChromeMessage`](../interfaces/ChromeMessage.md)\>

## Constructors

### Constructor

```ts
new ChromeRuntimeObservable(_handler?, _options?): ChromeRuntimeObservable;
```

Defined in: src/newer/next/observable/ChromeObservable.ts:76

#### Parameters

##### \_handler?

[`InvokerHandler`](../../../types/Interface/type-aliases/InvokerHandler.md)\<[`ChromeMessage`](../interfaces/ChromeMessage.md)\<`any`\>\>

##### \_options?

[`ChromeObservableOptions`](../interfaces/ChromeObservableOptions.md) = `{}`

#### Returns

`ChromeRuntimeObservable`

#### Overrides

```ts
BaseChromeObservable<ChromeMessage>.constructor
```

## Methods

### close()

```ts
close(): void;
```

Defined in: src/newer/next/observable/ChromeObservable.ts:66

#### Returns

`void`

#### Inherited from

```ts
BaseChromeObservable.close
```

***

### request()

```ts
request(msg): Promise<any>;
```

Defined in: src/newer/next/observable/ChromeObservable.ts:87

#### Parameters

##### msg

[`ChromeMessage`](../interfaces/ChromeMessage.md)

#### Returns

`Promise`\<`any`\>

***

### send()

```ts
send(msg): void;
```

Defined in: src/newer/next/observable/ChromeObservable.ts:81

#### Parameters

##### msg

[`ChromeMessage`](../interfaces/ChromeMessage.md)

#### Returns

`void`

#### Overrides

```ts
BaseChromeObservable.send
```

***

### subscribe()

```ts
subscribe(observer): Subscription;
```

Defined in: src/newer/next/observable/ChromeObservable.ts:45

#### Parameters

##### observer

  \| [`Observer`](../../../types/Interface/interfaces/Observer.md)\<[`ChromeMessage`](../interfaces/ChromeMessage.md)\<`any`\>\>
  \| ((`v`) => `void`)

#### Returns

[`Subscription`](../../../types/Interface/interfaces/Subscription.md)

#### Inherited from

```ts
BaseChromeObservable.subscribe
```
