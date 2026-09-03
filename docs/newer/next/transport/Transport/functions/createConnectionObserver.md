[**@fest-lib/uniform v0.1.24**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/transport/Transport](../README.md) / createConnectionObserver

# Function: createConnectionObserver()

```ts
function createConnectionObserver(transports): object;
```

Defined in: uniform.ts/src/newer/next/transport/Transport.ts:768

Create a connection observer that aggregates incoming connections
from multiple transports

## Parameters

### transports

[`TransportAdapter`](../classes/TransportAdapter.md)[]

## Returns

`object`

### getConnections

```ts
getConnections: () => TransportIncomingConnection[];
```

#### Returns

[`TransportIncomingConnection`](../interfaces/TransportIncomingConnection.md)[]

### subscribe

```ts
subscribe: (handler) => Subscription;
```

#### Parameters

##### handler

(`conn`) => `void`

#### Returns

[`Subscription`](../../../types/Interface/interfaces/Subscription.md)
