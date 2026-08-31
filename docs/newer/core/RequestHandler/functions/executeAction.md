[**@fest-lib/uniform v0.1.18**](../../../../README.md)

***

[@fest-lib/uniform](../../../../README.md) / [newer/core/RequestHandler](../README.md) / executeAction

# Function: executeAction()

```ts
function executeAction(
   action, 
   path, 
   args, 
   options?): ExecuteResult;
```

Defined in: src/newer/core/RequestHandler.ts:117

Execute a reflect action

Unified implementation used by all channel/proxy handlers.
Supports both DataBase-backed paths and direct object targets.

## Parameters

### action

`string`

Action to execute (WReflectAction or string)

### path

`string`[]

Object path

### args

`any`[]

Action arguments

### options?

[`ExecuteOptions`](../interfaces/ExecuteOptions.md) = `{}`

Execution options

## Returns

[`ExecuteResult`](../interfaces/ExecuteResult.md)
