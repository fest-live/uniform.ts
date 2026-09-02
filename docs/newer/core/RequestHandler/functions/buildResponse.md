[**@fest-lib/uniform v0.1.23**](../../../../README.md)

***

[@fest-lib/uniform](../../../../README.md) / [newer/core/RequestHandler](../README.md) / buildResponse

# Function: buildResponse()

```ts
function buildResponse(
   reqId, 
   action, 
   channel, 
   sender, 
   path, 
   rawResult, 
   toTransfer): Promise<{
  response: any;
  transfer: any[];
}>;
```

Defined in: uniform.ts/src/newer/core/RequestHandler.ts:274

Build response object with descriptor

## Parameters

### reqId

`string`

### action

`string`

### channel

`string`

### sender

`string`

### path

`string`[]

### rawResult

`any`

### toTransfer

`any`[]

## Returns

`Promise`\<\{
  `response`: `any`;
  `transfer`: `any`[];
\}\>
