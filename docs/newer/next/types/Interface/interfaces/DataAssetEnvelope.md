[**@fest-lib/uniform v0.1.28**](../../../../../README.md)

***

[@fest-lib/uniform](../../../../../README.md) / [newer/next/types/Interface](../README.md) / DataAssetEnvelope

# Interface: DataAssetEnvelope

Defined in: uniform.ts/src/newer/next/types/Interface.ts:77

Compact cross-transport binary/text payload descriptor.
Designed for File/Blob/base64/data-url/url values normalized to hash-named data.

## Properties

### data?

```ts
optional data?: string | ArrayBuffer;
```

Defined in: uniform.ts/src/newer/next/types/Interface.ts:83

***

### hash

```ts
hash: string;
```

Defined in: uniform.ts/src/newer/next/types/Interface.ts:78

***

### mimeType

```ts
mimeType: string;
```

Defined in: uniform.ts/src/newer/next/types/Interface.ts:80

***

### name

```ts
name: string;
```

Defined in: uniform.ts/src/newer/next/types/Interface.ts:79

***

### size

```ts
size: number;
```

Defined in: uniform.ts/src/newer/next/types/Interface.ts:81

***

### source?

```ts
optional source?: "blob" | "url" | "file" | "data-url" | "base64" | "uri" | "text";
```

Defined in: uniform.ts/src/newer/next/types/Interface.ts:82
