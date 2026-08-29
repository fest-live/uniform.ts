[**@fest-lib/uniform v0.1.15**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/transport/ServiceWorkerHost](../README.md) / bindServiceWorkerHostBridge

# Function: bindServiceWorkerHostBridge()

```ts
function bindServiceWorkerHostBridge(host, scope?): ServiceWorkerHostBridgeHandle;
```

Defined in: src/newer/next/transport/ServiceWorkerHost.ts:787

Bind a ServiceWorkerHost to the ambient service-worker lifecycle.

WHY: the host object manages routing and storage, but the SW still needs one
bootstrap that forwards `message` events into `handleClientMessage()`.

## Parameters

### host

[`ServiceWorkerHost`](../classes/ServiceWorkerHost.md)

### scope?

[`ServiceWorkerGlobalScope`](../../../../types/worker-globals/classes/ServiceWorkerGlobalScope.md) = `...`

## Returns

[`ServiceWorkerHostBridgeHandle`](../interfaces/ServiceWorkerHostBridgeHandle.md)
