[**@fest-lib/uniform v0.1.13**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/observable/ChromeObservable](../README.md) / ChromePortObservable

# Class: ChromePortObservable

Defined in: src/newer/next/observable/ChromeObservable.ts:177

## Extends

- `BaseChromeObservable`\<[`ChromeMessage`](../interfaces/ChromeMessage.md)\>

## Constructors

### Constructor

```ts
new ChromePortObservable(_portName, _tabId?): ChromePortObservable;
```

Defined in: src/newer/next/observable/ChromeObservable.ts:181

#### Parameters

##### \_portName

`string`

##### \_tabId?

`number`

#### Returns

`ChromePortObservable`

#### Overrides

```ts
BaseChromeObservable<ChromeMessage>.constructor
```

## Accessors

### isConnected

#### Get Signature

```ts
get isConnected(): boolean;
```

Defined in: src/newer/next/observable/ChromeObservable.ts:209

##### Returns

`boolean`

***

### portInfo

#### Get Signature

```ts
get portInfo(): PortInfo | null;
```

Defined in: src/newer/next/observable/ChromeObservable.ts:208

##### Returns

[`PortInfo`](../interfaces/PortInfo.md) \| `null`

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

### connect()

```ts
connect(): void;
```

Defined in: src/newer/next/observable/ChromeObservable.ts:183

#### Returns

`void`

***

### send()

```ts
send(msg): void;
```

Defined in: src/newer/next/observable/ChromeObservable.ts:193

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
