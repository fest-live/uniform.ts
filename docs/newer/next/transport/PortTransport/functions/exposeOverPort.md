[**@fest-lib/uniform v0.1.10**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/transport/PortTransport](../README.md) / exposeOverPort

# Function: exposeOverPort()

```ts
function exposeOverPort<T>(transport, target): Subscription;
```

Defined in: src/newer/next/transport/PortTransport.ts:493

Expose object methods over PortTransport

Uses unified Proxy module's expose handler.

## Type Parameters

### T

`T` *extends* `object`

## Parameters

### transport

[`PortTransport`](../classes/PortTransport.md)

### target

`T`

## Returns

[`Subscription`](../../../types/Interface/interfaces/Subscription.md)
