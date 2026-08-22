# Uniform.TS

`@fest-lib/uniform` — cross-context channels for fest-lib. One API over dedicated workers, SharedWorker, Service Worker, MessagePort, BroadcastChannel, WebSocket, Chrome extension ports, SharedArrayBuffer/Atomics, and WebRTC data channels.

Canonical runtime: `UnifiedChannel` / `createUnifiedChannel`. Invoker (`Requestor` / `Responder`) gives request/response across those transports. Legacy `createWorkerChannel` helpers remain under `src/original` and `src/newer/next/utils`.

## Install

```bash
npm install @fest-lib/uniform
```

```ts
import {
  createUnifiedChannel,
  createInvoker,
  detectContextType
} from "@fest-lib/uniform";

const channel = createUnifiedChannel({ name: "opfs" });
const invoker = createInvoker(channel);
```

Worker-style (queued until ready):

```ts
import { createQueuedWorkerChannel } from "@fest-lib/uniform";

const worker = createQueuedWorkerChannel(
  { name: "my-worker", script: "./my-worker.uniform.worker.ts" },
  () => { /* connected */ }
);
const result = await worker.request("processData", { data: "hello" });
```

## Layout

| Path | Role |
| --- | --- |
| `src/newer/next/channel/UnifiedChannel.ts` | primary channel |
| `src/newer/next/proxy/Invoker.ts` | request/response |
| `src/newer/core/TransportCore.ts` | transport factory |
| `src/newer/messaging/*` | queues / protocol |
| `src/original/*` | older worker helpers |

Peer: `@fest-lib/core`. Build: `npm run build`. Publish: `npm run publish`.
