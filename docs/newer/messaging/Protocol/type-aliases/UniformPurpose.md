[**@fest-lib/uniform v0.1.27**](../../../../README.md)

***

[@fest-lib/uniform](../../../../README.md) / [newer/messaging/Protocol](../README.md) / UniformPurpose

# Type Alias: UniformPurpose

```ts
type UniformPurpose = "invoke" | "mail" | "attach" | "deliver" | "defer";
```

Defined in: uniform.ts/src/newer/messaging/Protocol.ts:7

Unified protocol envelope for transport/invocation/messaging.
Keeps a single canonical payload while remaining backward compatible
with the legacy UnifiedMessage shape used by app code.
