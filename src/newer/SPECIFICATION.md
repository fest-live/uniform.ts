# Uniform Protocol Specification

That/this specification may/can be changed by AI

## Core (invoking)

```
{
    purpose: "invoke" | "mail" | "attach",
    protocol: "worker" | "chrome" | "socket" | "service" | etc... # what protocol or channel types was used
    redirect: boolean,
    flags: {...},
    type: "request" | "response" | "ack" | "act" | "ask", // act isn't require response
    result: any | any[], # REFLECT result
    args: any | any[],
    op: "get" | "set" | "apply" | "deleteProperty"... # etc... operation of REFLECT and PROXY, and some specific operations, such as "import"
    error: errorType (string)
    timestamp: number,
    uuid: UUIDv4, # what UUID will be resolved by promises
    sender: CHANNEL_NAME,
    destination: CHANNEL_NAME,
    bridges: [CHANNEL_NAME...], # proxy channeling
    payload: any | any[],
    transfer: (any | any[]) is Transferable,
    extension: any | any[], # TODO
    defer: "none" | "idb" | "storage" | "promise" | "allowed"
}
```

```
return/response types (in result):
- void (none) if 'act' type
- promise with object or primitive
- promise with remote description (proxy class/object)
- promise with rejection/error
```

## Extensions

TODO...
