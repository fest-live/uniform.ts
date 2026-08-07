[**@fest-lib/uniform v0.1.2**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/proxy/Proxy](../README.md) / ProxyInvoker

# Type Alias: ProxyInvoker

```ts
type ProxyInvoker = (action, path, args) => Promise<any>;
```

Defined in: src/newer/next/proxy/Proxy.ts:26

Proxy invoker function - sends requests to remote

## Parameters

### action

  \| [`WReflectAction`](../../../types/Interface/enumerations/WReflectAction.md)
  \| `string`

### path

`string`[]

### args

`any`[]

## Returns

`Promise`\<`any`\>
