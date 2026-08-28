<p align="center">
  <strong>@fest-lib/uniform</strong><br>
  One channel API across workers, ports, BroadcastChannel, WebSocket, Chrome, Atomics, and WebRTC.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@fest-lib/uniform"><img src="https://img.shields.io/npm/v/@fest-lib/uniform?style=flat-square" alt="npm"></a>
  <a href="LICENSE"><img src="https://img.shields.io/npm/l/@fest-lib/uniform?style=flat-square" alt="MIT"></a>
  <a href="https://github.com/fest-live/uniform.ts"><img src="https://img.shields.io/github/stars/fest-live/uniform.ts?style=flat-square" alt="stars"></a>
</p>

Canonical runtime: `UnifiedChannel` / `createUnifiedChannel`. Invoker (`Requestor` / `Responder` / `createInvoker`) is request/response on a **channel name**. Older worker helpers stay under `src/original` and `src/newer/next/utils`.

```text
core
 └── fest/uniform     ← you are here
      └── object · lure · fl-ui
```

## Install

```bash
npm install @fest-lib/core @fest-lib/uniform
```

Peer: `@fest-lib/core` `>=0.1.0`.

### Unified channel (host ↔ worker)

```ts
import { createUnifiedChannel } from "@fest-lib/uniform";

// worker
const w = createUnifiedChannel("worker");
w.expose("calc", { add: (a: number, b: number) => a + b });

// window
const host = createUnifiedChannel("host");
host.connect(worker);
const calc = host.proxy("worker", ["calc"]);
await calc.add(2, 3); // 5
```

`createUnifiedChannel` accepts a name string or a config object (`{ name, autoListen, … }`).

### Invoker (named channel)

```ts
import { createInvoker, autoInvoker, detectContextType } from "@fest-lib/uniform";

const invoker = createInvoker("opfs");
autoInvoker("opfs");              // connects `self` in worker / SW / Chrome
detectContextType();              // "window" | "worker" | "chrome-*" | …
```

`createInvoker(channelName)` — the first argument is the **string name**, not a `UnifiedChannel` instance. Use `.connect(target)` or `setupInvoker(name, worker)`.

## Layout

| Path | Role |
| --- | --- |
| `src/newer/next/channel/UnifiedChannel.ts` | primary channel |
| `src/newer/next/proxy/Invoker.ts` | request / response |
| `src/newer/core/TransportCore.ts` | transport factory |
| `src/newer/messaging/*` | queues / protocol |
| `src/original/*` | older worker helpers |

## Workspace

```bash
cd modules/projects/uniform.ts
npm test                 # node + deno + browser
npm run build
npm run publish
```

Typedoc: `npm run docs:md`. License: [MIT](LICENSE).
