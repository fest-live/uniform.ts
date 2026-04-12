# Uniform Protocol Specification (Base)

This specification doesn't recommended to change by AI

## Core (invoking)

```
{
    redirect: boolean,
    type: "request" | "response" | "ack",
    result: any | any[], # REFLECT result
    args: any | any[],
    op: "get" | "set" | "apply" | "deleteProperty"... # etc... operation of REFLECT and PROXY, and some specific operations, such as "import"
    error: errorType (string)
    timestamp: number,
    uuid: UUIDv4,
    sender: CHANNEL_NAME,
    destination: CHANNEL_NAME,
    payload: any | any[],
    transfer: (any | any[]) is Transferable
}
```
