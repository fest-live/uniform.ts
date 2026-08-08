[**@fest-lib/uniform v0.1.3**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/observable/ChromeObservable](../README.md) / ChromeExternalObservable

# Class: ChromeExternalObservable

Defined in: src/newer/next/observable/ChromeObservable.ts:216

## Extends

- `BaseChromeObservable`\<[`ChromeMessage`](../interfaces/ChromeMessage.md)\>

## Constructors

### Constructor

```ts
new ChromeExternalObservable(_extensionId?): ChromeExternalObservable;
```

Defined in: src/newer/next/observable/ChromeObservable.ts:217

#### Parameters

##### \_extensionId?

`string`

#### Returns

`ChromeExternalObservable`

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

### send()

```ts
send(msg): void;
```

Defined in: src/newer/next/observable/ChromeObservable.ts:219

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
