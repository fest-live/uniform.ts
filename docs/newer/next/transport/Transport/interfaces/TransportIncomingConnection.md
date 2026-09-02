[**@fest-lib/uniform v0.1.20**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/transport/Transport](../README.md) / TransportIncomingConnection

# Interface: TransportIncomingConnection

Defined in: src/newer/next/transport/Transport.ts:30

Incoming channel connection event

## Properties

### channel

```ts
channel: string;
```

Defined in: src/newer/next/transport/Transport.ts:34

Channel name being requested

***

### data?

```ts
optional data?: any;
```

Defined in: src/newer/next/transport/Transport.ts:42

Original message data

***

### id

```ts
id: string;
```

Defined in: src/newer/next/transport/Transport.ts:32

Connection ID

***

### port?

```ts
optional port?: MessagePort;
```

Defined in: src/newer/next/transport/Transport.ts:40

MessagePort if applicable

***

### sender

```ts
sender: string;
```

Defined in: src/newer/next/transport/Transport.ts:36

Sender identifier

***

### timestamp

```ts
timestamp: number;
```

Defined in: src/newer/next/transport/Transport.ts:44

Timestamp

***

### transportType

```ts
transportType: TransportType;
```

Defined in: src/newer/next/transport/Transport.ts:38

Transport type
