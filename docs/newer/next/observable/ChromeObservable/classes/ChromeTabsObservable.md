[**@fest-lib/uniform v0.1.15**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/observable/ChromeObservable](../README.md) / ChromeTabsObservable

# Class: ChromeTabsObservable

Defined in: src/newer/next/observable/ChromeObservable.ts:142

## Extends

- `BaseChromeObservable`\<[`ChromeMessage`](../interfaces/ChromeMessage.md)\>

## Constructors

### Constructor

```ts
new ChromeTabsObservable(_tabId?, _options?): ChromeTabsObservable;
```

Defined in: src/newer/next/observable/ChromeObservable.ts:143

#### Parameters

##### \_tabId?

`number`

##### \_options?

[`ChromeObservableOptions`](../interfaces/ChromeObservableOptions.md) = `{}`

#### Returns

`ChromeTabsObservable`

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

Defined in: src/newer/next/observable/ChromeObservable.ts:147

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

### setTabId()

```ts
setTabId(id): void;
```

Defined in: src/newer/next/observable/ChromeObservable.ts:145

#### Parameters

##### id

`number`

#### Returns

`void`

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
