# Observable-Based Channel System

## Overview

This document describes the new Observable-based channel system for `fest/uniform`.
Instead of classical `addEventListener("message")` / `postMessage` patterns,
channels now use `subscribe` / `next` pattern following the [WICG Observable proposal](https://github.com/WICG/observable).

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        Application Layer                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐            │
│  │  Component   │  │    View      │  │   Module     │            │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘            │
│         │                 │                  │                    │
│         └────────────────┬───────────────────┘                   │
│                          │                                        │
│                          ▼                                        │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                Observable Channel API                        │ │
│  │  subscribe() / next() / request() / emit()                  │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                          │                                        │
│                          ▼                                        │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                   Transport Layer                            │ │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │ │
│  │  │ Worker  │ │WebSocket│ │ Chrome  │ │   SW    │           │ │
│  │  │Transport│ │Transport│ │ Runtime │ │Transport│           │ │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘           │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                          │                                        │
│                          ▼                                        │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                   Storage Layer                              │ │
│  │  IndexedDB: defer, pending, mailbox, exchange                │ │
│  └─────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

## Key Concepts

### 1. Channels are Connections, Not Workers

Workers, WebSockets, Chrome APIs are **wrappers** around the internal Observable API.
Channels represent logical connections that can use any transport.

### 2. Observable Pattern - Direct Method Mapping

The Observable pattern directly wraps native transport methods:

| Observable Method | Transport Method |
|-------------------|------------------|
| `next()` | `postMessage()` / `send()` / etc. |
| `subscribe()` | `addEventListener("message")` / `onmessage` / etc. |

Instead of:
```typescript
// Old pattern
worker.postMessage({ type: "request", data });
worker.addEventListener("message", handler);
```

Use:
```typescript
// New pattern - internally calls postMessage
workerObservable.next(message);

// Subscribing activates addEventListener
workerObservable.subscribe(handler);
```

### 3. Lazy Listener Activation

Listeners are only activated when the first subscriber is added:

```typescript
const observable = TransportObservableFactory.worker(myWorker);

// No listener yet - worker.addEventListener NOT called
console.log(observable.isListening); // false

// First subscriber activates the listener
const sub1 = observable.subscribe(handler1);
// NOW worker.addEventListener("message", ...) is called
console.log(observable.isListening); // true

// Second subscriber reuses existing listener
const sub2 = observable.subscribe(handler2);

// Unsubscribe first
sub1.unsubscribe();
// Listener still active (sub2 exists)

// Unsubscribe last - deactivates listener
sub2.unsubscribe();
// NOW worker.removeEventListener("message", ...) is called
console.log(observable.isListening); // false
```

### 4. Request/Response with next()

```typescript
// Request uses next() internally (which calls postMessage)
const result = await channel.request(path, action, args, options, toChannel);
```

## Core Components

### TransportObservable.ts

**Direct Observable wrappers around transport methods:**

Each transport implements:
- `next(value)` → calls the transport's send method (`postMessage`, `send`, etc.)
- `subscribe(observer)` → activates the transport's receive listener (`addEventListener`, `onmessage`, etc.)

| Class | `next()` calls | `subscribe()` activates |
|-------|----------------|------------------------|
| `WorkerObservable` | `worker.postMessage()` | `worker.addEventListener("message")` |
| `MessagePortObservable` | `port.postMessage()` | `port.addEventListener("message")` + `port.start()` |
| `BroadcastChannelObservable` | `channel.postMessage()` | `channel.addEventListener("message")` |
| `WebSocketObservable` | `ws.send()` | `ws.addEventListener("message")` |
| `ChromeRuntimeObservable` | `chrome.runtime.sendMessage()` | `chrome.runtime.onMessage.addListener()` |
| `ChromeTabsObservable` | `chrome.tabs.sendMessage()` | `chrome.runtime.onMessage.addListener()` |
| `ServiceWorkerClientObservable` | `serviceWorker.postMessage()` | `navigator.serviceWorker.addEventListener("message")` |
| `ServiceWorkerHostObservable` | `client.postMessage()` | `self.addEventListener("message")` |
| `SelfObservable` | `self.postMessage()` | `self.addEventListener("message")` |

```typescript
import { TransportObservableFactory } from "fest/uniform";

// Create worker observable
const workerObs = TransportObservableFactory.worker(myWorker);

// next() internally calls worker.postMessage()
workerObs.next({ channel: "ch", sender: "main", type: "request", ... });

// subscribe() activates worker.addEventListener("message", ...)
workerObs.subscribe((msg) => console.log("Received:", msg));
```

### Observable.ts

Core Observable primitives:

- `ChannelObservable<T>` - Base observable for channel messages
- `ChannelSubject<T>` - Observable that can push values (bidirectional)
- `ReplayChannelSubject<T>` - Replays last N values to new subscribers
- `MessageObservable` - Specialized for channel messages with request/response

Operators:
- `filter()`, `map()`, `take()`, `merge()`
- `debounce()`, `throttle()`, `buffer()`

Utilities:
- `fromEvent()`, `fromPromise()`, `fromIterable()`
- `timer()`, `interval()`
- `toPromise()`, `toArray()`

### Connection.ts

Channel connection abstraction:

```typescript
const connection = getConnection("worker-channel", "worker");

// Subscribe to messages
connection.subscribe((msg) => console.log(msg));

// Send message
connection.next({ channel: "worker", sender: "main", type: "event", ... });

// Request/response
const result = await connection.request("worker", payload, { action: "getData" });
```

### Transport.ts

Transport adapters wrap various communication mechanisms:

- `WorkerTransport` - Web Workers
- `MessagePortTransport` - Channel Messaging API
- `BroadcastChannelTransport` - BroadcastChannel
- `WebSocketTransport` - WebSocket connections
- `ChromeRuntimeTransport` - Chrome Extension runtime
- `ChromeTabsTransport` - Chrome Extension tabs
- `SelfTransport` - Same context (worker self)
- `ServiceWorkerTransport` - Service Worker

Factory:
```typescript
const transport = TransportFactory.worker("channel", workerUrl);
transport.attach();

// Now connection uses next() instead of postMessage
transport.connection.next(message);
```

### Storage.ts

IndexedDB integration for persistent channel operations:

```typescript
const storage = getChannelStorage("my-channel");

// Defer message for later delivery
const id = await storage.defer(message, { priority: 1, expiresIn: 3600000 });

// Get pending messages
const pending = await storage.getDeferredMessages(channel, { status: "pending" });

// Exchange data between contexts
await storage.exchangePut("shared-key", value, { sharedWith: ["*"] });
const value = await storage.exchangeGet("shared-key");

// Transactions
const tx = await storage.beginTransaction();
tx.put("messages", message1);
tx.put("messages", message2);
await tx.commit();
```

### ServiceWorkerHost.ts

PWA Service Worker as host (reverse pattern):

```typescript
// In Service Worker
const host = createServiceWorkerHost({
    channelName: "pwa-host",
    enableOfflineQueue: true
});

await host.start();

// Handle client connections
host.onClientEvent(({ type, client }) => {
    console.log(`Client ${client.id} ${type}`);
});

// Broadcast to all clients
await host.broadcastToAll(message);
```

```typescript
// In page/component
const client = createServiceWorkerClient("pwa-host");
await client.connect();

// Subscribe to channel
client.subscribeToChannel("updates");

// Request data
const data = await client.request("getData", { id: 123 });

// Listen for events
client.on("update", (data) => console.log(data));
```

## Usage Examples

### Transport Observable - Direct Usage

```typescript
import { TransportObservableFactory, type ChannelMessage } from "fest/uniform";

// ============================================
// WORKER
// ============================================

// Create from existing worker
const workerObs = TransportObservableFactory.worker(myWorker);

// Or create from URL
const workerObs2 = TransportObservableFactory.workerFromUrl("./worker.ts");

// Subscribing activates addEventListener("message")
workerObs.subscribe((msg) => {
    console.log("From worker:", msg);
});

// next() calls worker.postMessage()
workerObs.next({
    id: crypto.randomUUID(),
    channel: "worker",
    sender: "main",
    type: "request",
    payload: { action: "process" },
    timestamp: Date.now()
});

// ============================================
// WEBSOCKET
// ============================================

const wsObs = TransportObservableFactory.websocket("wss://api.example.com/ws");

// Connect first
wsObs.connect();

// Subscribe to state changes
wsObs.onState((state) => {
    console.log("WS state:", state); // "connecting" | "open" | "closing" | "closed"
});

// Subscribe to messages - activates ws.addEventListener("message")
wsObs.subscribe((msg) => {
    console.log("From server:", msg);
});

// Send - calls ws.send()
wsObs.next({
    id: crypto.randomUUID(),
    channel: "api",
    sender: "client",
    type: "request",
    payload: { query: "getData" },
    timestamp: Date.now()
});

// ============================================
// BROADCAST CHANNEL
// ============================================

const broadcastObs = TransportObservableFactory.broadcast("my-channel");

// Subscribe - activates channel.addEventListener("message")
broadcastObs.subscribe((msg) => {
    console.log("Broadcast received:", msg);
});

// Send - calls channel.postMessage()
broadcastObs.next({
    id: crypto.randomUUID(),
    channel: "my-channel",
    sender: "tab-1",
    type: "event",
    payload: { type: "sync", data: { key: "value" } },
    timestamp: Date.now()
});

// ============================================
// MESSAGE PORT / MESSAGE CHANNEL
// ============================================

// Create a channel with two connected ports
const { port1, port2 } = TransportObservableFactory.messageChannel();

// In context A - subscribe to port1
port1.subscribe((msg) => {
    console.log("Port1 received:", msg);
});

// In context B - send via port2 (which sends to port1)
port2.next({
    id: crypto.randomUUID(),
    channel: "port",
    sender: "contextB",
    type: "request",
    payload: { data: "hello" },
    timestamp: Date.now()
});

// ============================================
// CHROME EXTENSION
// ============================================

// Runtime messaging
const chromeObs = TransportObservableFactory.chromeRuntime();

// Subscribe - activates chrome.runtime.onMessage.addListener()
chromeObs.subscribe((msg) => {
    console.log("Extension message:", msg);
});

// Send - calls chrome.runtime.sendMessage()
chromeObs.next({
    id: crypto.randomUUID(),
    channel: "background",
    sender: "popup",
    type: "request",
    payload: { action: "getData" },
    timestamp: Date.now()
});

// Tab messaging
const tabObs = TransportObservableFactory.chromeTabs(tabId);
tabObs.next(message); // calls chrome.tabs.sendMessage(tabId, ...)

// ============================================
// SERVICE WORKER (Client Side)
// ============================================

const swClientObs = TransportObservableFactory.serviceWorkerClient();
await swClientObs.connect();

// Subscribe - activates navigator.serviceWorker.addEventListener("message")
swClientObs.subscribe((msg) => {
    console.log("From SW:", msg);
});

// Send - calls serviceWorker.postMessage()
swClientObs.next({
    id: crypto.randomUUID(),
    channel: "sw",
    sender: "page",
    type: "request",
    payload: { action: "cache" },
    timestamp: Date.now()
});

// ============================================
// SERVICE WORKER (SW Side / Host)
// ============================================

// Inside service worker
const swHostObs = TransportObservableFactory.serviceWorkerHost();

// Subscribe - activates self.addEventListener("message")
swHostObs.subscribe((msg) => {
    console.log("From client:", msg._clientId, msg);

    // Reply to specific client
    swHostObs.next({
        ...responseMessage,
        _clientId: msg._clientId // Target specific client
    });
});

// Broadcast to all clients (no _clientId)
swHostObs.next(broadcastMessage);

// ============================================
// WORKER CONTEXT (Self)
// ============================================

// Inside a worker, listening to messages from main thread
const selfObs = TransportObservableFactory.self();

// Subscribe - activates self.addEventListener("message")
selfObs.subscribe((msg) => {
    console.log("From main:", msg);

    // Reply - calls self.postMessage()
    selfObs.next(responseMessage);
});
```

### Basic Channel Communication

```typescript
import {
    getConnection,
    TransportFactory
} from "fest/uniform";

// Main thread
const transport = TransportFactory.worker("worker", "./worker.ts");
transport.attach();

const connection = transport.connection;

// Subscribe to responses
connection.subscribe((msg) => {
    if (msg.type === "response") {
        console.log("Got response:", msg.payload);
    }
});

// Send request
connection.next({
    id: crypto.randomUUID(),
    channel: "worker",
    sender: "main",
    type: "request",
    payload: { action: "process", data: [1, 2, 3] },
    timestamp: Date.now()
});
```

### Using Observable Operators

```typescript
import {
    getConnection,
    filter,
    map,
    debounce
} from "fest/uniform";

const connection = getConnection("data-channel");

// Filter and transform messages
const dataUpdates = filter(
    connection.subscribe((msg) => msg),
    (msg) => msg.type === "event" && msg.payload?.type === "dataUpdate"
);

const debouncedUpdates = debounce(dataUpdates, 100);

debouncedUpdates.subscribe({
    next: (msg) => updateUI(msg.payload.data)
});
```

### Offline-First with Storage

```typescript
import { getConnection, getChannelStorage } from "fest/uniform";

const connection = getConnection("api-channel");
const storage = getChannelStorage("api-channel");

async function sendWithFallback(message) {
    if (connection.isConnected) {
        connection.next(message);
    } else {
        // Queue for later
        await storage.defer(message, { priority: 1 });
    }
}

// When reconnected, process queue
connection.onStateChange(async (state) => {
    if (state === "connected") {
        const pending = await storage.getDeferredMessages("api-channel");
        for (const msg of pending) {
            connection.next(msg);
            await storage.markDelivered(msg.id);
        }
    }
});
```

### Cross-Context Data Exchange

```typescript
import { getChannelStorage } from "fest/uniform";

// In worker
const storage = getChannelStorage("shared");
await storage.exchangePut("user-data", { id: 1, name: "Alice" });

// In main thread
const storage = getChannelStorage("shared");
const userData = await storage.exchangeGet("user-data");

// With locking
await storage.exchangeLock("user-data");
try {
    const data = await storage.exchangeGet("user-data");
    data.count++;
    await storage.exchangePut("user-data", data);
} finally {
    await storage.exchangeUnlock("user-data");
}
```

### PWA Service Worker Pattern

```typescript
// sw.ts (Service Worker)
import { createServiceWorkerHost } from "fest/uniform";

const host = createServiceWorkerHost({
    channelName: "pwa",
    enableOfflineQueue: true,
    messageTTL: 24 * 60 * 60 * 1000
});

self.addEventListener("activate", async (event) => {
    event.waitUntil(host.start());
});

self.addEventListener("message", (event) => {
    host.handleClientMessage(event.source?.id, event.data);
});

// Broadcast updates to all clients
async function notifyClients(data) {
    await host.broadcastToAll({
        id: crypto.randomUUID(),
        channel: "pwa",
        sender: "sw",
        type: "event",
        payload: { type: "update", data },
        timestamp: Date.now()
    });
}
```

```typescript
// app.ts (Page)
import { createServiceWorkerClient } from "fest/uniform";

const client = createServiceWorkerClient("pwa");
await client.connect();

// Listen for updates
client.on("update", (data) => {
    console.log("Received update:", data);
});

// Request data from SW
const config = await client.request("getConfig");
```

## Migration from Old API

### Old Pattern
```typescript
import { createOrUseExistingChannel, SELF_CHANNEL } from "fest/uniform";

const channel = await createOrUseExistingChannel("worker");
channel.request(["path"], "get", [args]);
```

### New Pattern
```typescript
import {
    createOrUseExistingObservableChannel,
    SELF_CHANNEL
} from "fest/uniform";

const channel = await createOrUseExistingObservableChannel("worker");
channel.request(["path"], "get", [args]); // Same API, Observable internally
```

## API Reference

### ChannelConnection

| Method | Description |
|--------|-------------|
| `subscribe(handler, fromChannel?)` | Subscribe to incoming messages |
| `next(message)` | Send message (replaces postMessage) |
| `request(toChannel, payload, options)` | Request/response pattern |
| `emit(toChannel, eventType, data)` | Fire-and-forget event |
| `onStateChange(handler)` | Subscribe to connection state changes |

### ChannelStorage

| Method | Description |
|--------|-------------|
| `defer(message, options)` | Queue message for later delivery |
| `getDeferredMessages(channel, options)` | Get queued messages |
| `markDelivered(id)` | Mark message as delivered |
| `exchangePut(key, value, options)` | Put shared data |
| `exchangeGet(key)` | Get shared data |
| `exchangeLock(key)` | Acquire lock |
| `exchangeUnlock(key)` | Release lock |
| `beginTransaction()` | Start batch transaction |

### ServiceWorkerHost

| Method | Description |
|--------|-------------|
| `registerClient(id, info)` | Register client connection |
| `sendToClient(id, message)` | Send to specific client |
| `broadcastToChannel(channel, message)` | Broadcast to channel subscribers |
| `broadcastToAll(message)` | Broadcast to all clients |
| `onClientEvent(handler)` | Subscribe to client events |

### ServiceWorkerClient

| Method | Description |
|--------|-------------|
| `connect()` | Connect to SW host |
| `disconnect()` | Disconnect |
| `subscribeToChannel(channel)` | Subscribe to channel |
| `request(action, payload)` | Request/response |
| `emit(eventType, data)` | Fire event |
| `on(eventType, handler)` | Listen for events |

## Native Observable Pattern (WICG-aligned)

The `NativeObservable.ts` module provides a pattern aligned with the [WICG Observable proposal](https://github.com/WICG/observable).

### Core Pattern

```typescript
new ChannelNativeObservable((subscriber) => {
    // Setup channel invoker - this activates addEventListener
    // The handler receives: data (incoming), respond (send back), subscriber
    return makeWorkerInvoker(worker, (data, respond, subscriber) => {
        // data = incoming message/request data
        // respond = function to send response back (calls postMessage)
        // subscriber = to push data to observers (subscriber.next())

        // Example: Handle request and send response
        if (data.type === "request") {
            const result = processRequest(data);
            respond({
                id: crypto.randomUUID(),
                channel: data.sender,
                sender: "my-channel",
                type: "response",
                reqId: data.reqId,
                payload: { result },
                timestamp: Date.now()
            });
        }

        // Push to observers
        subscriber.next(data);
    })(subscriber);
});
```

### How It Works

1. **Creating Observable** - The producer function is stored but NOT executed yet
2. **Subscribe** - When `subscribe({ next, channelMeta })` is called:
   - Creates a `Subscriber` with the observer's `next/error/complete` handlers
   - Invokes the producer function, passing the `Subscriber`
   - Producer calls `makeXxxInvoker(target, handler)` which sets up `addEventListener`
   - When message arrives, handler is called with `(data, respond, subscriber)`
   - Returns cleanup function that calls `removeEventListener`

### Handler Signature

Each invoker accepts an optional handler with this signature:

```typescript
type InvokerHandler<T> = (
    data: T,           // Incoming message/request data
    respond: ResponderFn<T>,  // Function to send response back
    subscriber: Subscriber<T> // To push data to observers
) => void | Promise<void>;

type ResponderFn<T> = (result: T, transfer?: Transferable[]) => void;
```

### Built-in Request Handlers

#### `createRequestHandler(channelName)` - Full Reflect Handler

Handles all reflection actions (get, set, call, apply, construct, etc.) like `handleAndResponse` in Channels.ts:

```typescript
const observable = new ChannelNativeObservable((subscriber) => {
    return makeWorkerInvoker(worker, createRequestHandler("my-channel"))(subscriber);
});
```

#### `createSimpleRequestHandler(channelName, handlers)` - Custom Actions

Handle custom action names:

```typescript
const observable = new ChannelNativeObservable((subscriber) => {
    return makeWorkerInvoker(worker, createSimpleRequestHandler("my-channel", {
        getData: async (args) => ({ items: [1, 2, 3] }),
        processItem: async (args) => args[0] * 2,
        saveData: async (args) => { /* save */ return { success: true }; }
    }))(subscriber);
});
```

### Channel Invokers

Each invoker maps to native methods:

| Invoker | What it sets up |
|---------|-----------------|
| `makeWorkerInvoker(worker)` | `worker.addEventListener("message", ...)` |
| `makeMessagePortInvoker(port)` | `port.addEventListener("message", ...)` + `port.start()` |
| `makeBroadcastInvoker(name)` | `new BroadcastChannel(name).addEventListener("message", ...)` |
| `makeWebSocketInvoker(url)` | `new WebSocket(url).addEventListener("message", ...)` |
| `makeChromeRuntimeInvoker()` | `chrome.runtime.onMessage.addListener(...)` |
| `makeServiceWorkerClientInvoker()` | `navigator.serviceWorker.addEventListener("message", ...)` |
| `makeServiceWorkerHostInvoker()` | `self.addEventListener("message", ...)` |
| `makeSelfInvoker()` | `self.addEventListener("message", ...)` |

### Usage Examples

```typescript
import {
    ChannelNativeObservable,
    createChannelObservable,
    createBidirectionalChannelNative,
    makeWorkerInvoker,
    createRequestHandler,
    createSimpleRequestHandler,
    when,
    filter,
    map,
    take,
    takeUntil
} from "fest/uniform";

// ============================================
// Method 1: Low-level with custom handler
// ============================================

const workerObservable = new ChannelNativeObservable((subscriber) => {
    // Handler receives: data, respond, subscriber
    return makeWorkerInvoker(myWorker, (data, respond, subscriber) => {
        console.log("Incoming:", data);

        // Handle requests
        if (data.type === "request") {
            const result = doSomething(data.payload);

            // Send response via respond() - calls worker.postMessage()
            respond({
                id: crypto.randomUUID(),
                channel: data.sender,
                sender: "my-channel",
                type: "response",
                reqId: data.reqId,
                payload: { result },
                timestamp: Date.now()
            });
        }

        // Push to observers
        subscriber.next(data);
    })(subscriber);
});

// Subscribe with implementation and channel metadata
workerObservable.subscribe({
    next(message) {
        console.log("Received:", message);
    },
    channelMeta: {
        name: "my-worker",
        transport: "worker"
    }
});

// ============================================
// Method 1b: With built-in request handler
// ============================================

const workerWithHandler = new ChannelNativeObservable((subscriber) => {
    // Uses createRequestHandler for full Reflect-based handling
    return makeWorkerInvoker(myWorker, createRequestHandler("my-channel"))(subscriber);
});

// ============================================
// Method 1c: With simple custom handlers
// ============================================

const workerWithSimpleHandler = new ChannelNativeObservable((subscriber) => {
    return makeWorkerInvoker(myWorker, createSimpleRequestHandler("my-channel", {
        // Handle action: "getData"
        getData: async (args) => {
            return { items: await fetchData() };
        },
        // Handle action: "processItem"
        processItem: async (args) => {
            const [item] = args;
            return processItem(item);
        },
        // Handle action: "saveData"
        saveData: async (args) => {
            await saveToDatabase(args[0]);
            return { success: true };
        }
    }))(subscriber);
});

// ============================================
// Method 2: Factory function
// ============================================

const channel = createChannelObservable("worker", myWorker);

channel.subscribe({
    next(msg) {
        console.log("From worker:", msg);
    }
});

// ============================================
// Method 3: Bidirectional channel
// ============================================

const biChannel = createBidirectionalChannelNative("worker", myWorker);

// Subscribe to incoming (activates addEventListener)
biChannel.subscribe({
    next(msg) {
        console.log("In:", msg);
    }
});

// Send outgoing (calls postMessage)
biChannel.send({
    id: crypto.randomUUID(),
    channel: "worker",
    sender: "main",
    type: "request",
    payload: { action: "getData" },
    timestamp: Date.now()
});

// ============================================
// Method 4: Pipe operators (WICG-style)
// ============================================

createChannelObservable("worker", myWorker)
    .pipe(
        filter((msg) => msg.type === "event"),
        map((msg) => msg.payload),
        take(5)
    )
    .subscribe({
        next(payload) {
            console.log("Event payload:", payload);
        }
    });

// ============================================
// Method 5: when() for EventTarget (WICG .when() pattern)
// ============================================

// Similar to element.when('click') from WICG proposal
when(element, "click")
    .pipe(
        filter((e) => (e.target as Element).matches(".button")),
        map((e) => ({ x: e.clientX, y: e.clientY }))
    )
    .subscribe({
        next: handleClick
    });

// With takeUntil for automatic cleanup
when(element, "mousemove")
    .pipe(takeUntil(when(document, "mouseup")))
    .subscribe({
        next: (e) => console.log("Moving:", e.clientX, e.clientY)
    });
```

### Observer with Channel Metadata

When subscribing, you can pass `channelMeta` alongside handlers:

```typescript
observable.subscribe({
    // Handler implementations
    next(message) {
        console.log("Received:", message);
    },
    error(err) {
        console.error("Error:", err);
    },
    complete() {
        console.log("Done");
    },

    // Channel metadata for connection setup
    channelMeta: {
        name: "my-channel",
        transport: "worker",
        isHost: false,
        target: "worker-channel",
        options: {
            timeout: 30000
        }
    }
});
```

## Chrome Extension Observable API

Direct Observable wrapper for Chrome Extension messaging (not through Worker).

### ChromeRuntimeObservable

```typescript
import { ChromeRuntimeObservable, ChromeObservableFactory, createChromeRequestHandler } from "fest/uniform";

// Simple: Listen to all runtime messages
const runtimeObs = ChromeObservableFactory.runtime();

runtimeObs.subscribe({
    next(msg) {
        console.log("From:", msg._sender?.id, "Data:", msg.payload);
    }
});

// With request handler
const runtimeWithHandler = ChromeObservableFactory.runtime(
    createChromeRequestHandler("background", {
        getData: async (args) => ({ items: await fetchData() }),
        saveItem: async (args) => { await save(args[0]); return { ok: true }; }
    }),
    { asyncResponse: true }
);

// Send message
await ChromeRuntimeObservable.send({
    type: "request",
    payload: { action: "getData" }
});
```

### ChromeTabsObservable

```typescript
import { ChromeTabsObservable, ChromeObservableFactory } from "fest/uniform";

// Listen to messages from all tabs
const tabsObs = ChromeObservableFactory.tabs();

// Listen to messages from specific tab
const specificTabObs = ChromeObservableFactory.tabs(tabId);

tabsObs.subscribe({
    next(msg) {
        console.log(`Tab ${msg._tabId}:`, msg.payload);
    }
});

// Send to tab
await ChromeTabsObservable.send(tabId, { action: "highlight" });

// Broadcast to all tabs
await ChromeTabsObservable.broadcast({ action: "refresh" });

// Send to active tab
await ChromeTabsObservable.sendToActiveTab({ action: "capture" });
```

### ChromePortObservable (Long-lived connections)

```typescript
import { ChromeObservableFactory } from "fest/uniform";

// Client: Connect to background
const portClient = ChromeObservableFactory.port("my-channel");

portClient.subscribe({
    next(msg) {
        console.log("Port message:", msg);
    }
});

portClient.send({ action: "subscribe", topic: "updates" });

// Host (background): Listen for connections
const portHost = ChromeObservableFactory.portHost("my-channel", (data, respond, subscriber) => {
    if (data.payload?.action === "subscribe") {
        // Handle subscription
        respond({ status: "subscribed" });
    }
    subscriber.next(data);
});

portHost.subscribe({
    next(msg) {
        console.log("Client connected:", msg);
    }
});
```

## Socket.IO Observable API

Direct Observable wrapper for Socket.IO client.

### Basic Usage

```typescript
import { SocketIOObservable, SocketIOObservableFactory, createSocketObservable } from "fest/uniform";
import { io } from "socket.io-client";

// From existing socket
const socket = io("https://api.example.com");
const socketObs = SocketIOObservableFactory.fromSocket(socket);

// Or with URL (requires global io)
const socketObs2 = createSocketObservable("https://api.example.com");

// Subscribe to events
socketObs.subscribe({
    next(msg) {
        console.log(`[${msg.event}]`, msg.payload);
    }
});

// Emit events
socketObs.emit("chat", { text: "Hello!" });

// Request with acknowledgment
const response = await socketObs.request("getData", { id: 123 });
```

### With Custom Events

```typescript
const socketObs = SocketIOObservableFactory.withEvents(
    socket,
    ["chat", "notification", "presence", "typing"],
    (data, respond, subscriber) => {
        // Handle incoming events
        if (data.event === "chat") {
            // Process chat message
            respond({ received: true });
        }
        subscriber.next(data);
    }
);
```

### Room Observable

```typescript
const roomObs = SocketIOObservableFactory.room(socket, "room-123");

// Join room
roomObs.join();

// Listen to room messages
roomObs.subscribe({
    next(msg) {
        console.log(`[Room ${msg.room}]`, msg.payload);
    }
});

// Emit to room
roomObs.emitToRoom("message", { text: "Hello room!" });

// Leave room
roomObs.leave();
```

### Request Handler

```typescript
import { createSocketRequestHandler } from "fest/uniform";

const socketObs = SocketIOObservableFactory.fromSocket(socket,
    createSocketRequestHandler({
        // Handle "chat" event
        chat: async (args, msg) => {
            const [message] = args;
            await saveMessage(message);
            return { saved: true };
        },
        // Handle "presence" event
        presence: async (args, msg) => {
            return { online: true, users: getOnlineUsers() };
        }
    })
);
```

---

## Unified Channel Message Handler

### Message Type Detection

The `ChannelMessageHandler` provides unified message routing with polymorphic `respond()`:

```
┌────────────────────────────────────────────────────────────────────┐
│                    Message Flow Detection                           │
│                                                                     │
│  ┌─────────────┐     ┌───────────────────────────────────────┐    │
│  │   Source    │────▶│           MESSAGE TYPE                │    │
│  └─────────────┘     │  ┌─────────┐ ┌──────────┐ ┌────────┐ │    │
│                      │  │ request │ │ response │ │  event │ │    │
│                      │  └────┬────┘ └────┬─────┘ └───┬────┘ │    │
│                      └───────│───────────│───────────│──────┘    │
│                              │           │           │            │
│                              ▼           ▼           ▼            │
│                      ┌───────────┐ ┌───────────┐ ┌───────────┐   │
│                      │  respond  │ │  respond  │ │  respond  │   │
│                      │     =     │ │     =     │ │     =     │   │
│                      │postMessage│ │ resolve() │ │   send()  │   │
│                      │  (back)   │ │ (promise) │ │  (pass)   │   │
│                      └───────────┘ └───────────┘ └───────────┘   │
│                                                                     │
│  Destination                     Source (awaiting)                  │
│  handles request                 resolves pending                   │
│  responds via postMessage        promise                            │
└────────────────────────────────────────────────────────────────────┘
```

### Usage Pattern

```typescript
import { 
    makeChannelMessageHandler,
    ChannelNativeObservable 
} from "fest/uniform";

// Create Observable with unified message handler
const observable = new ChannelNativeObservable((subscriber) => {
    return makeChannelMessageHandler(worker, "my-channel", (data, respond) => {
        // data = incoming message
        // respond = polymorphic based on message type:
        //   - For type:"request" → sends response via postMessage
        //   - For type:"response" → resolves pending promise

        if (data.type === "request") {
            // Handle incoming request from source
            const result = processRequest(data);
            respond(result);  // → worker.postMessage(response)
        }
        // type:"response" is auto-handled (resolves pending)
    })(subscriber);
});
```

### The `respond()` Function

The `respond()` function is **polymorphic** - its behavior depends on context:

| Message Type | respond() Behavior |
|--------------|-------------------|
| `request` | Sends via `postMessage` / `chrome.sendResponse` / `socket.emit` |
| `response` | Resolves pending promise in awaiting source |
| `event` | Passes through / custom send |

```typescript
// Example: respond() for incoming request
makeChannelMessageHandler(worker, "channel", (data, respond) => {
    if (data.type === "request") {
        // respond() HERE sends via worker.postMessage()
        respond({
            channel: data.sender,
            sender: "channel",
            type: "response",
            reqId: data.reqId,
            payload: { result: "done" }
        });
    }
});

// Example: respond() for response (auto-handled)
// When response arrives, it auto-resolves the pending promise
// No need to call respond() manually
```

### RequestProxy with Observable (next() dispatch)

The `RequestProxy` now dispatches via `next()` through Observable:

```typescript
import { 
    createObservableChannel, 
    wrapObservableChannel,
    ChannelMessageObservable
} from "fest/uniform";

// Create Observable channel
const { observable, wrap, subscribe, request } = createObservableChannel(
    worker,
    "my-channel"
);

// Subscribe to incoming messages
subscribe({
    next(msg) {
        console.log("Received:", msg);
        // Responses are auto-resolved to pending promises
    }
});

// Create proxy that dispatches via next()
const remoteModule = wrap("worker-channel");

// All operations go through Observable.next()
await remoteModule.someMethod();  // → observable.next(request) → awaits response
await remoteModule.property;     // → observable.next(get request) → awaits response

// Or use request() directly
const result = await request({
    id: crypto.randomUUID(),
    channel: "worker",
    sender: "my-channel",
    type: "request",
    payload: { action: "getData", args: [] },
    timestamp: Date.now()
});
```

### Flow Diagram

```
┌──────────────┐                               ┌──────────────┐
│    Source    │                               │ Destination  │
│ (RequestProxy│                               │   (Handler)  │
└──────┬───────┘                               └──────┬───────┘
       │                                              │
       │  1. proxy.someMethod()                       │
       │                                              │
       ▼                                              │
┌──────────────┐                                      │
│  dispatch()  │                                      │
│  via next()  │                                      │
└──────┬───────┘                                      │
       │                                              │
       │  2. observable.next(request)                 │
       │     (registers pending promise)              │
       │                                              │
       ▼                                              │
┌──────────────┐                                      │
│  Transport   │──────── 3. postMessage ─────────────▶│
│ (Worker etc) │                                      │
└──────────────┘                                      │
       │                                              ▼
       │                                       ┌──────────────┐
       │                                       │  onMessage   │
       │                                       │ (listener)   │
       │                                       └──────┬───────┘
       │                                              │
       │                                              │  4. type:"request"
       │                                              │     detected
       │                                              │
       │                                              ▼
       │                                       ┌──────────────┐
       │                                       │  handler()   │
       │                                       │ (data,respond│
       │                                       └──────┬───────┘
       │                                              │
       │                                              │  5. process &
       │                                              │     respond()
       │                                              │
       │◀────────── 6. postMessage (response) ────────│
       │                                              │
       ▼                                              │
┌──────────────┐                                      │
│  onMessage   │                                      │
│ type:"resp"  │                                      │
└──────┬───────┘                                      │
       │                                              │
       │  7. resolve pending promise                  │
       │                                              │
       ▼                                              │
┌──────────────┐                                      │
│  Promise     │                                      │
│  resolved!   │                                      │
└──────────────┘                                      │
```

### Complete Example

```typescript
import {
    ChannelNativeObservable,
    makeChannelMessageHandler,
    createChannelRequestHandler,
    ChannelMessageObservable,
    wrapObservableChannel
} from "fest/uniform";

// === DESTINATION (Worker/Handler side) ===

const handlerObservable = new ChannelNativeObservable((subscriber) => {
    return makeChannelMessageHandler(
        self,  // Worker self
        "worker-channel",
        createChannelRequestHandler("worker-channel", {
            onRequest: (req) => console.log("Request:", req.action),
            onResponse: (resp) => console.log("Responding")
        })
    )(subscriber);
});

// Start listening
handlerObservable.subscribe({
    next(msg) { console.log("[Worker] Msg:", msg); }
});


// === SOURCE (Main thread / Client side) ===

const clientChannel = new ChannelMessageObservable(worker, "main-channel");

// Subscribe to receive responses
clientChannel.subscribe({
    next(msg) {
        console.log("[Main] Received:", msg);
        // Responses auto-resolve pending promises
    }
});

// Create proxy that dispatches via next()
const remote = wrapObservableChannel(clientChannel, "worker-channel");

// Use proxy - all calls go through Observable pattern
const result = await remote.someRegisteredFunction("arg1", "arg2");
// ↑ This:
//   1. Creates request message
//   2. Registers pending promise
//   3. Calls clientChannel.next(message)
//   4. Transport calls worker.postMessage()
//   5. Worker receives, processes, responds
//   6. Response arrives, pending promise resolves
//   7. Returns result
```

### Chrome Extension with Message Handler

```typescript
import {
    ChannelNativeObservable,
    makeChannelMessageHandler,
    createChannelRequestHandler
} from "fest/uniform";

// Background script
const bgObservable = new ChannelNativeObservable((subscriber) => {
    return makeChannelMessageHandler(
        "chrome-runtime",
        "background-channel",
        createChannelRequestHandler("background-channel")
    )(subscriber);
});

bgObservable.subscribe({
    next(msg) { console.log("BG received:", msg); }
});

// Content script - sends via next(), receives responses
const contentChannel = new ChannelMessageObservable(
    "chrome-runtime",
    "content-channel"
);

const bg = wrapObservableChannel(contentChannel, "background-channel");
const data = await bg.getData();  // → chrome.runtime.sendMessage() internally
```

## References

- [WICG Observable](https://github.com/WICG/observable)
- [Chrome Status: Observable](https://chromestatus.com/feature/5154593776599040)
- [Channel Messaging API](https://developer.mozilla.org/en-US/docs/Web/API/Channel_Messaging_API)
- [Chrome Extension Messaging](https://developer.chrome.com/docs/extensions/mv3/messaging/)
- [Socket.IO Client](https://socket.io/docs/v4/client-api/)