[**@fest-lib/uniform v0.1.18**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/proxy/RequestProxy](../README.md) / ObservableRequestProxyHandler

# ~~Class: ObservableRequestProxyHandler~~

Defined in: src/newer/next/proxy/RequestProxy.ts:87

## Deprecated

Use createRemoteProxy from Proxy.ts instead

## Extends

- [`RequestProxyHandlerV2`](RequestProxyHandlerV2.md)

## Constructors

### Constructor

```ts
new ObservableRequestProxyHandler(hostChannelInstance?, options?): ObservableRequestProxyHandler;
```

Defined in: src/newer/next/proxy/RequestProxy.ts:70

#### Parameters

##### hostChannelInstance?

`any` = `null`

##### options?

`any` = `{}`

#### Returns

`ObservableRequestProxyHandler`

#### Inherited from

[`RequestProxyHandlerV2`](RequestProxyHandlerV2.md).[`constructor`](RequestProxyHandlerV2.md#constructor)

## Properties

### ~~hostChannelInstance~~

```ts
hostChannelInstance: any = null;
```

Defined in: src/newer/next/proxy/RequestProxy.ts:71

#### Inherited from

[`RequestProxyHandlerV2`](RequestProxyHandlerV2.md).[`hostChannelInstance`](RequestProxyHandlerV2.md#hostchannelinstance)

***

### ~~options~~

```ts
options: any = {};
```

Defined in: src/newer/next/proxy/RequestProxy.ts:72

#### Inherited from

[`RequestProxyHandlerV2`](RequestProxyHandlerV2.md).[`options`](RequestProxyHandlerV2.md#options)

## Methods

### ~~dispatch()~~

```ts
dispatch(action, args): Promise<any>;
```

Defined in: src/newer/next/proxy/RequestProxy.ts:77

#### Parameters

##### action

[`WReflectAction`](../../../types/Interface/enumerations/WReflectAction.md)

##### args

`any`[]

#### Returns

`Promise`\<`any`\>

#### Inherited from

[`RequestProxyHandlerV2`](RequestProxyHandlerV2.md).[`dispatch`](RequestProxyHandlerV2.md#dispatch)
