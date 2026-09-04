[**@fest-lib/uniform v0.1.25**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/transport/SharedWorkerTransport](../README.md) / SharedWorkerObservableFactory

# Variable: SharedWorkerObservableFactory

```ts
const SharedWorkerObservableFactory: object;
```

Defined in: uniform.ts/src/newer/next/transport/SharedWorkerTransport.ts:371

## Type Declaration

### client

```ts
client: (url, name, opts?) => SharedWorkerClient;
```

#### Parameters

##### url

`string` \| `URL`

##### name

`string`

##### opts?

[`SharedWorkerOptions`](../interfaces/SharedWorkerOptions.md)

#### Returns

[`SharedWorkerClient`](../classes/SharedWorkerClient.md)

### host

```ts
host: (name) => SharedWorkerHost;
```

#### Parameters

##### name

`string`

#### Returns

[`SharedWorkerHost`](../classes/SharedWorkerHost.md)
