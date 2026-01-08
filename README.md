# Fest/Uniform - Advanced Web Worker Communication Library

**Fest/Uniform** is an experimental web worker communication library that provides seamless, inline-like function calls across worker boundaries using advanced reflection and proxy techniques.

## Features

- **Seamless API**: Call worker functions as if they were local
- **Automatic Serialization**: Handles complex data types and transferables
- **Optimized Protocol**: Batching, timeouts, and error recovery
- **Type Safety**: Full TypeScript support with reflection
- **Performance**: Efficient message passing with minimal overhead

## Quick Start

### Basic Usage

```typescript
import { createWorkerChannel } from 'fest/uniform';

// Create a worker channel
const worker = await createWorkerChannel({
    name: 'my-worker',
    script: './my-worker.uniform.worker.ts'
});

// Call worker functions seamlessly
const result = await worker.request('processData', { data: 'hello' });
```

### Queued Channels (Recommended)

```typescript
import { createQueuedWorkerChannel } from 'fest/uniform';

// Create queued channel - operations queue until worker is ready
const worker = new QueuedWorkerChannel({
    name: 'my-worker',
    script: './my-worker.uniform.worker.ts'
}, (channel) => {
    console.log('Worker channel ready!');
});

// Operations will queue until the channel connects
const result = await worker.request('processData', { data: 'hello' });
```

### Optimized Protocol

```typescript
import { createOptimizedWorkerChannel } from 'fest/uniform';

// Create optimized channel with advanced features
const worker = await createOptimizedWorkerChannel({
    name: 'my-worker',
    script: './my-worker.uniform.worker.ts'
}, {
    timeout: 10000,
    retries: 3,
    batching: true,
    compression: false
});

// Request with automatic batching and retry
const result = await worker.request('processData', { data: 'hello' });

// Fire-and-forget notifications
worker.notify('logMessage', 'Processing complete');
```

### Queued Optimized Channels

```typescript
import { createQueuedOptimizedWorkerChannel } from 'fest/uniform';

// Best of both worlds: queuing + optimization
const worker = createQueuedOptimizedWorkerChannel({
    name: 'my-worker',
    script: './my-worker.uniform.worker.ts'
}, {
    timeout: 10000,
    retries: 3,
    batching: true
}, (channel) => {
    console.log('Optimized worker channel ready!');
});

// Operations queue until ready, then use optimized protocol
const result = await worker.request('processData', { data: 'hello' });
```

### Context-Specific Usage

#### Service Worker Context
```typescript
import { detectExecutionContext, createServiceWorkerChannel } from 'fest/uniform';

if (detectExecutionContext() === 'service-worker') {
    // In service worker, use BroadcastChannel communication
    const channel = await createServiceWorkerChannel({
        name: 'sw-cache-worker',
        script: './cache-worker.js'
    });

    // Communicate through BroadcastChannel
    const result = await channel.request('cacheData', { data: 'important' });
}
```

#### Chrome Extension Context
```typescript
import { createChromeExtensionChannel } from 'fest/uniform';

const worker = await createChromeExtensionChannel({
    name: 'extension-worker',
    script: 'workers/processor.js' // Will be resolved with chrome.runtime.getURL()
});

// Automatic extension URL resolution
const result = await worker.request('processExtensionData', data);
```

## Worker Implementation

### Basic Worker

```typescript
// my-worker.uniform.worker.ts
import { registerWorkerAPI } from 'fest/uniform';

const workerAPI = {
    async processData(payload: { data: string }) {
        // Process the data
        return payload.data.toUpperCase();
    },

    async logMessage(message: string) {
        console.log('[Worker]', message);
    }
};

registerWorkerAPI(workerAPI);
```

### Advanced Worker with Optimized Protocol

```typescript
// my-worker.uniform.worker.ts
import { registerWorkerAPI } from 'fest/uniform';
import { MessageEnvelope } from 'fest/uniform/src/optimized-protocol';

const workerAPI = {
    async processData(payload: { data: string }) {
        return payload.data.toUpperCase();
    }
};

// Handle optimized protocol messages
const processMessage = async (envelope: MessageEnvelope) => {
    if (envelope.type === 'batch') {
        const results = [];
        for (const msg of envelope.payload) {
            results.push(await processSingleMessage(msg));
        }
        return results;
    }
    return await processSingleMessage(envelope);
};

const processSingleMessage = async (envelope: MessageEnvelope) => {
    const handler = workerAPI[envelope.type as keyof typeof workerAPI];
    if (!handler) {
        throw new Error(`Unknown message type: ${envelope.type}`);
    }
    return await handler(envelope.payload);
};

// Register API and message processor
registerWorkerAPI(workerAPI);
(globalThis as any).processMessage = processMessage;
```

## API Reference

### Core Functions

#### `createWorkerChannel(config: WorkerConfig): Promise<WorkerChannel>`

Creates a basic worker channel.

**Parameters:**
- `config.name`: Unique channel name
- `config.script`: Path to worker script
- `config.options`: Worker options

#### `createOptimizedWorkerChannel(config: WorkerConfig, options?: ProtocolOptions): Promise<OptimizedWorkerChannel>`

Creates an optimized worker channel with advanced features.

**Protocol Options:**
- `timeout`: Request timeout in milliseconds (default: 30000)
- `retries`: Number of retry attempts (default: 3)
- `batching`: Enable message batching (default: true)
- `compression`: Enable payload compression (default: false)

### WorkerChannel Methods

#### `request(method: string, args: any[]): Promise<any>`

Call a worker method and wait for response.

#### `close(): void`

Close the worker channel.

### OptimizedWorkerChannel Methods

#### `request(type: string, payload: any, options?: Partial<ProtocolOptions>): Promise<any>`

Send request with optimization features.

#### `notify(type: string, payload: any): void`

Send fire-and-forget message.

#### `stream(type: string, data: any[]): AsyncGenerator<any>`

Stream data with backpressure handling.

## Advanced Features

### Message Batching

Automatically batches multiple messages to reduce overhead:

```typescript
const worker = await createOptimizedWorkerChannel(config, { batching: true });

// These calls will be batched automatically
await Promise.all([
    worker.request('method1', data1),
    worker.request('method2', data2),
    worker.request('method3', data3)
]);
```

### Error Handling and Retries

```typescript
const worker = await createOptimizedWorkerChannel(config, {
    retries: 3,
    timeout: 5000
});

try {
    const result = await worker.request('unreliableMethod', data);
} catch (error) {
    console.error('All retries failed:', error);
}
```

### Streaming Data

```typescript
const worker = await createOptimizedWorkerChannel(config);

// Stream large datasets
for await (const result of worker.stream('processChunk', largeDataArray)) {
    console.log('Processed chunk:', result);
}
```

## Integration Examples

### OPFS Worker (Real Example)

```typescript
// From fest/lure OPFS implementation
import { createOptimizedWorkerChannel } from 'fest/uniform';

const workerChannel = await createOptimizedWorkerChannel({
    name: "opfs-worker",
    script: "./OPFS.uniform.worker.ts"
}, {
    timeout: 10000,
    batching: true
});

// Use like a regular function call
const result = await workerChannel.request('readFile', {
    rootId: 'user',
    path: '/data.json'
});
```

## Performance Benefits

- **Reduced Latency**: Message batching minimizes round trips
- **Better Throughput**: Optimized serialization and transfer handling
- **Automatic Retry**: Built-in error recovery
- **Memory Efficient**: Proper transferable object handling
- **Type Safe**: Full TypeScript support across worker boundaries

## Migration from postMessage

### Before (Traditional)

```typescript
const worker = new Worker('./worker.js');

worker.postMessage({ type: 'process', data });

worker.onmessage = (e) => {
    const { result, error } = e.data;
    if (error) handleError(error);
    else handleResult(result);
};
```

### After (Uniform)

```typescript
const worker = await createWorkerChannel({
    name: 'my-worker',
    script: './worker.uniform.worker.ts'
});

try {
    const result = await worker.request('process', data);
    handleResult(result);
} catch (error) {
    handleError(error);
}
```

## Execution Context Support

Fest/Uniform automatically adapts to different JavaScript execution contexts:

### Main Thread Context
- Full dedicated worker support
- MessageChannel communication
- All optimization features available

### Service Worker Context
- BroadcastChannel-based communication
- No dedicated worker creation (not supported)
- Queued operations with fallback handling

### Chrome Extension Context
- Dedicated worker support with extension URL resolution
- Automatic detection of extension environment
- Fallback communication patterns

### Context Detection
```typescript
import { detectExecutionContext, supportsDedicatedWorkers } from 'fest/uniform';

const context = detectExecutionContext(); // 'main' | 'service-worker' | 'chrome-extension' | 'unknown'
const hasWorkers = supportsDedicatedWorkers(); // boolean
```

## Browser Support

Requires modern browsers with:
- ES2020 modules
- MessageChannel API (main thread)
- BroadcastChannel API (service workers)
- Proxy API
- WeakRef (optional)

Compatible with all Chromium-based browsers and modern Firefox/Safari.

## Examples

- [Service Worker Integration](./examples/service-worker-integration.ts) - Using uniform channels in service worker context
- [Chrome Extension Integration](./examples/chrome-extension-integration.ts) - Chrome extension worker communication

## Contributing

This library is experimental and evolving. Contributions welcome!

## License

MIT License