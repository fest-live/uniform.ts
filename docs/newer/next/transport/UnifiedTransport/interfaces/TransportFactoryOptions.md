[**@fest-lib/uniform v0.1.3**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/transport/UnifiedTransport](../README.md) / TransportFactoryOptions

# Interface: TransportFactoryOptions

Defined in: src/newer/next/transport/UnifiedTransport.ts:179

## Properties

### atomics?

```ts
optional atomics?: object;
```

Defined in: src/newer/next/transport/UnifiedTransport.ts:232

#### config?

```ts
optional config?: AtomicsTransportConfig;
```

#### recvBuffer

```ts
recvBuffer: SharedArrayBuffer;
```

#### sendBuffer

```ts
sendBuffer: SharedArrayBuffer;
```

***

### broadcast?

```ts
optional broadcast?: object;
```

Defined in: src/newer/next/transport/UnifiedTransport.ts:201

#### name?

```ts
optional name?: string;
```

***

### chrome?

```ts
optional chrome?: object;
```

Defined in: src/newer/next/transport/UnifiedTransport.ts:212

#### mode

```ts
mode: "runtime" | "tabs" | "port" | "external";
```

#### options?

```ts
optional options?: ChromeObservableOptions;
```

#### portName?

```ts
optional portName?: string;
```

#### tabId?

```ts
optional tabId?: number;
```

***

### port?

```ts
optional port?: object;
```

Defined in: src/newer/next/transport/UnifiedTransport.ts:206

#### config?

```ts
optional config?: PortTransportConfig;
```

#### port?

```ts
optional port?: MessagePort;
```

***

### rtc?

```ts
optional rtc?: object;
```

Defined in: src/newer/next/transport/UnifiedTransport.ts:239

#### config?

```ts
optional config?: RTCTransportConfig;
```

#### mode

```ts
mode: "peer" | "manager";
```

***

### serviceWorker?

```ts
optional serviceWorker?: object;
```

Defined in: src/newer/next/transport/UnifiedTransport.ts:226

#### config?

```ts
optional config?: SWHostConfig;
```

#### mode

```ts
mode: "host" | "client";
```

***

### sharedWorker?

```ts
optional sharedWorker?: object;
```

Defined in: src/newer/next/transport/UnifiedTransport.ts:188

#### options?

```ts
optional options?: SharedWorkerOptions;
```

#### scriptUrl?

```ts
optional scriptUrl?: string | URL;
```

***

### socketio?

```ts
optional socketio?: object;
```

Defined in: src/newer/next/transport/UnifiedTransport.ts:220

#### options?

```ts
optional options?: SocketObservableOptions;
```

#### socket

```ts
socket: SocketIOLike;
```

***

### websocket?

```ts
optional websocket?: object;
```

Defined in: src/newer/next/transport/UnifiedTransport.ts:194

#### protocols?

```ts
optional protocols?: string | string[];
```

#### reconnect?

```ts
optional reconnect?: boolean;
```

#### url

```ts
url: string;
```

***

### worker?

```ts
optional worker?: object;
```

Defined in: src/newer/next/transport/UnifiedTransport.ts:181

#### existing?

```ts
optional existing?: Worker;
```

#### options?

```ts
optional options?: WorkerOptions;
```

#### scriptUrl?

```ts
optional scriptUrl?: string | URL;
```
