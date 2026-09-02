[**@fest-lib/uniform v0.1.22**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/transport/Worker](../README.md) / IncomingConnection

# Interface: IncomingConnection

Defined in: src/newer/next/transport/Worker.ts:27

Incoming connection event

## Properties

### channel

```ts
channel: string;
```

Defined in: src/newer/next/transport/Worker.ts:31

Channel name

***

### id

```ts
id: string;
```

Defined in: src/newer/next/transport/Worker.ts:29

Connection ID

***

### options?

```ts
optional options?: any;
```

Defined in: src/newer/next/transport/Worker.ts:41

Connection options

***

### port?

```ts
optional port?: MessagePort;
```

Defined in: src/newer/next/transport/Worker.ts:37

MessagePort if provided

***

### sender

```ts
sender: string;
```

Defined in: src/newer/next/transport/Worker.ts:33

Sender context name

***

### timestamp

```ts
timestamp: number;
```

Defined in: src/newer/next/transport/Worker.ts:39

Timestamp

***

### type

```ts
type: "broadcast" | "socket" | "channel" | "port";
```

Defined in: src/newer/next/transport/Worker.ts:35

Connection type
