# Uniform Interop Specification

Version: `2026-04`

## Purpose

`fest/uniform` defines the compatibility contract for messages that move between:

- window/main-thread code
- dedicated and shared workers
- service worker host/client flows
- Chrome extension runtime/tab/port flows
- websocket and socket-io transports
- native bridge shells that reuse the same logical envelope

This spec is compatibility-first. It keeps both high-level message shapes that already exist in the codebase, but makes the mapping between them explicit instead of implicit.

## Canonical Contracts

### 1. `UniformProtocolEnvelope`

Use this when transport metadata, routing, replay guards, bridge information, or richer protocol semantics matter.

Required fields:

- `id` or `uuid`
- `type`
- `source`
- `payload` or `data`
- `protocol`
- `purpose`
- `srcChannel`

Common optional fields:

- `destination`
- `dstChannel`
- `op`
- `path`
- `flags`
- `redirect`
- `metadata`
- `timestamp`
- `error`
- `result`
- `transfer`
- `defer`

### 2. `UnifiedMessage`

Use this for app-local routing, view/shell delivery, and queueing where a slim RPC-style shape is enough.

Required fields:

- `id`
- `type`
- `source`
- `data`

Common optional fields:

- `destination`
- `contentType`
- `metadata`

## Mapping Rules

`UnifiedMessage -> UniformProtocolEnvelope`

- `id` maps to `id` and `uuid`
- `source` maps to `source`, `sender`, and default `srcChannel`
- `destination` maps to `destination`, `target`, and default `dstChannel`
- `data` maps to both `data` and `payload`
- `metadata.timestamp` becomes the envelope timestamp when present
- missing `purpose` defaults to `["mail"]`
- missing `op` defaults to `deliver`

`UniformProtocolEnvelope -> UnifiedMessage`

- prefer `id`, then `uuid`
- prefer `destination`, then `target`, then `dstChannel`
- prefer `data`, then `payload`
- carry protocol and transport hints into `metadata`
- receivers normalize destination aliases before dispatch

## Transport Taxonomy

Canonical transport names used by the newer transport layer:

- `worker`
- `shared-worker`
- `service-worker`
- `broadcast`
- `message-port`
- `websocket`
- `chrome-runtime`
- `chrome-tabs`
- `chrome-port`
- `chrome-external`
- `socket-io`
- `rtc-data`
- `atomics`
- `self`
- `internal`

Accepted aliases that must normalize before diagnostics or routing decisions:

- `ws` and `socket` -> `websocket`
- `socketio` -> `socket-io`
- `service`, `sw`, `service-worker-client`, and `service-worker-host` -> `service-worker`
- Chrome-family protocol wrappers normalize to `chrome` at the logical protocol layer

## Protocol Families

Logical protocol names are broader than transport names:

- `window`
- `worker`
- `chrome`
- `socket`
- `broadcast`
- `unknown`

Examples:

- Chrome runtime messages may use `protocol: "chrome"` with `transport: "chrome-runtime"`
- service worker ingress may use `protocol: "worker"` with `transport: "service-worker"`
- websocket relay frames may use `protocol: "socket"` with `transport: "websocket"`

## Delivery Semantics

- `purpose` may be a string or array, but implementations normalize to arrays
- `type` expresses logical intent, not transport framing
- `op` refines how the payload is used, for example `invoke`, `deliver`, `attach`, `request`, `response`
- `srcChannel` and `dstChannel` are transport-facing routing hints
- `destination` is the app-facing logical target
- transferables remain transport-specific and are only guaranteed on worker/message-port capable transports

## Replay And Echo Guards

- duplicate envelopes within the replay window must be rejected by `ProtocolReplayGuard`
- senders should not process their own envelope again when `srcChannel` matches the local channel identity
- transport wrappers may add short suppression windows for noisy streams such as clipboard or reconnect events

## Bootstrap Guidance

### Service worker host

- create a `ServiceWorkerHost`
- bind it with `bindServiceWorkerHostBridge(...)`
- let the bridge own `message` forwarding into `handleClientMessage(...)`

### Service worker client

- use `ServiceWorkerClient`
- connect once the registration is ready
- treat the service worker as the host and the page as the client

### Chrome runtime

- use `chrome-runtime` for extension-wide request/reply traffic
- use `chrome-tabs` for content-script targeting
- use `chrome-port` only when a persistent connection is required

### Broadcast/view fan-out

- `BroadcastChannel` is a transport, not a separate message system
- any `rs-view-*` fan-out must land in the same canonical view handler path as direct unified message delivery

## Boundary Rule

`SignedEnvelope` and websocket crypto framing are lower-level transport wrappers. They are not the same thing as the app-level interop envelope and must stay separate in naming and documentation.
