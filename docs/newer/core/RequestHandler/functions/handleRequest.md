[**@fest-lib/uniform v0.1.22**](../../../../README.md)

***

[@fest-lib/uniform](../../../../README.md) / [newer/core/RequestHandler](../README.md) / handleRequest

# Function: handleRequest()

```ts
function handleRequest(
   request, 
   reqId, 
   channelName, 
   options?): Promise<
  | {
  response: any;
  transfer: any[];
}
| null>;
```

Defined in: src/newer/core/RequestHandler.ts:342

Handle request and return response (unified handler)

## Parameters

### request

[`WReq`](../../../next/types/Interface/interfaces/WReq.md)

### reqId

`string`

### channelName

`string`

### options?

[`ExecuteOptions`](../interfaces/ExecuteOptions.md)

## Returns

`Promise`\<
  \| \{
  `response`: `any`;
  `transfer`: `any`[];
\}
  \| `null`\>
