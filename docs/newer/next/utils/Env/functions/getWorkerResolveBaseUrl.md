[**@fest-lib/uniform v0.1.10**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/utils/Env](../README.md) / getWorkerResolveBaseUrl

# Function: getWorkerResolveBaseUrl()

```ts
function getWorkerResolveBaseUrl(): string;
```

Defined in: src/newer/next/utils/Env.ts:63

Base URL for `new URL(workerPath, base)` when spawning workers from a string specifier.

Prefer `WorkerGlobalScope` / `window` URLs so this module stays **`import.meta`-free**.
Including `import.meta.url` anywhere in the uniform graph trips Rolldown's `EMPTY_IMPORT_META`
when the PWA service worker is built as IIFE (`vite-plugin-pwa` injectManifest).

Dedicated worker threads expose `globalThis.location` at the worker script URL; MV3 SW exposes the

## Returns

`string`
