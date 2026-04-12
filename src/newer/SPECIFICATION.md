# Uniform Protocol Specification

That/this specification may/can be changed by AI

## Core (invoking)

```
{
    protocol: "worker" | "chrome" | "socket" | etc... # what protocol or channel types was used
    redirect: boolean,
    type: "request" | "response" | "ack",
    result: any | any[], # REFLECT result
    args: any | any[],
    op: "get" | "set" | "apply" | "deleteProperty"... # etc... operation of REFLECT and PROXY, and some specific operations, such as "import"
    error: errorType (string)
    timestamp: number,
    uuid: UUIDv4, # what UUID will be resolved by promises
    sender: CHANNEL_NAME,
    destination: CHANNEL_NAME,
    payload: any | any[],
    transfer: (any | any[]) is Transferable,
    extension: any | any[] # TODO
}
```

## Extensions

TODO...
