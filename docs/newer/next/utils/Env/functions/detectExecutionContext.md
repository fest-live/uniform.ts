[**@fest-lib/uniform v0.1.29**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/utils/Env](../README.md) / detectExecutionContext

# Function: detectExecutionContext()

```ts
function detectExecutionContext(): ExecutionContext;
```

Defined in: uniform.ts/src/newer/next/utils/Env.ts:31

Detect the current runtime context.

NOTE: In MV3, the background is a Service Worker but still part of the
extension runtime. We treat it as "chrome-extension" for API compatibility.

## Returns

[`ExecutionContext`](../type-aliases/ExecutionContext.md)
