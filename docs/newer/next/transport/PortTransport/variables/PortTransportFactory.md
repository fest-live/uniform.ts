[**@fest-lib/uniform v0.1.17**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/transport/PortTransport](../README.md) / PortTransportFactory

# Variable: PortTransportFactory

```ts
const PortTransportFactory: object;
```

Defined in: src/newer/next/transport/PortTransport.ts:529

## Type Declaration

### create

```ts
create: (port, name, config?) => PortTransport;
```

#### Parameters

##### port

`MessagePort`

##### name

`string`

##### config?

[`PortTransportConfig`](../interfaces/PortTransportConfig.md)

#### Returns

[`PortTransport`](../classes/PortTransport.md)

### createPair

```ts
createPair: (name, config?) => ChannelPairResult;
```

#### Parameters

##### name

`string`

##### config?

[`PortTransportConfig`](../interfaces/PortTransportConfig.md)

#### Returns

[`ChannelPairResult`](../interfaces/ChannelPairResult.md)

### createPool

```ts
createPool: (config?) => PortPool;
```

#### Parameters

##### config?

[`PortTransportConfig`](../interfaces/PortTransportConfig.md)

#### Returns

[`PortPool`](../classes/PortPool.md)

### createProxy

```ts
createProxy: <T>(transport, targetPath) => ProxyMethods<T> = createPortProxy;
```

Create proxy for remote object over PortTransport

Uses unified Proxy module for consistent behavior.

#### Type Parameters

##### T

`T` *extends* `object`

#### Parameters

##### transport

[`PortTransport`](../classes/PortTransport.md)

##### targetPath?

`string`[] = `[]`

#### Returns

[`ProxyMethods`](../../../proxy/Proxy/type-aliases/ProxyMethods.md)\<`T`\>

### createWindowConnector

```ts
createWindowConnector: (target, name, config?) => WindowPortConnector;
```

#### Parameters

##### target

`Window`

##### name

`string`

##### config?

[`WindowPortConnectorConfig`](../interfaces/WindowPortConnectorConfig.md)

#### Returns

[`WindowPortConnector`](../classes/WindowPortConnector.md)

### expose

```ts
expose: <T>(transport, target) => Subscription = exposeOverPort;
```

Expose object methods over PortTransport

Uses unified Proxy module's expose handler.

#### Type Parameters

##### T

`T` *extends* `object`

#### Parameters

##### transport

[`PortTransport`](../classes/PortTransport.md)

##### target

`T`

#### Returns

[`Subscription`](../../../types/Interface/interfaces/Subscription.md)

### listen

```ts
listen: (channelName, handler, config?) => () => void = WindowPortConnector.listen;
```

Listen for incoming connections (target side)

#### Parameters

##### channelName

`string`

##### handler

(`transport`) => `void`

##### config?

[`WindowPortConnectorConfig`](../interfaces/WindowPortConnectorConfig.md)

#### Returns

() => `void`
