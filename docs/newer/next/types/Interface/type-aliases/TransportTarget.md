[**@fest-lib/uniform v0.1.26**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/types/Interface](../README.md) / TransportTarget

# Type Alias: TransportTarget

```ts
type TransportTarget = 
  | Worker
  | MessagePort
  | BroadcastChannel
  | WebSocket
  | RTCDataChannel
  | "chrome-runtime"
  | "chrome-tabs"
  | "chrome-port"
  | "chrome-external"
  | "service-worker-client"
  | "service-worker-host"
  | "shared-worker"
  | "rtc-data"
  | "atomics"
  | "self";
```

Defined in: uniform.ts/src/newer/next/types/Interface.ts:175

Transport target (runtime objects or string identifiers)
