[**@fest-lib/uniform v0.1.18**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/observable/ChromeObservable](../README.md) / ChromeObservableFactory

# Variable: ChromeObservableFactory

```ts
const ChromeObservableFactory: object;
```

Defined in: src/newer/next/observable/ChromeObservable.ts:267

## Type Declaration

### external

```ts
external: (extensionId?) => ChromeExternalObservable;
```

#### Parameters

##### extensionId?

`string`

#### Returns

[`ChromeExternalObservable`](../classes/ChromeExternalObservable.md)

### port

```ts
port: (name, tabId?) => ChromePortObservable;
```

#### Parameters

##### name

`string`

##### tabId?

`number`

#### Returns

[`ChromePortObservable`](../classes/ChromePortObservable.md)

### runtime

```ts
runtime: (handler?, options?) => ChromeRuntimeObservable;
```

#### Parameters

##### handler?

[`InvokerHandler`](../../../types/Interface/type-aliases/InvokerHandler.md)\<[`ChromeMessage`](../interfaces/ChromeMessage.md)\<`any`\>\>

##### options?

[`ChromeObservableOptions`](../interfaces/ChromeObservableOptions.md)

#### Returns

[`ChromeRuntimeObservable`](../classes/ChromeRuntimeObservable.md)

### tabs

```ts
tabs: (tabId?, options?) => ChromeTabsObservable;
```

#### Parameters

##### tabId?

`number`

##### options?

[`ChromeObservableOptions`](../interfaces/ChromeObservableOptions.md)

#### Returns

[`ChromeTabsObservable`](../classes/ChromeTabsObservable.md)
