[**@fest-lib/uniform v0.1.10**](../../../../README.md)

***

[@fest-lib/uniform](../../../../README.md) / [original/next/Queued](../README.md) / CrxRuntimeModule

# Interface: CrxRuntimeModule

Defined in: src/original/next/Queued.ts:196

Chrome Extension Runtime Module Interface

## Methods

### capture()

```ts
capture(rect?, mode?): Promise<any>;
```

Defined in: src/original/next/Queued.ts:198

#### Parameters

##### rect?

###### height

`number`

###### width

`number`

###### x

`number`

###### y

`number`

##### mode?

`string`

#### Returns

`Promise`\<`any`\>

***

### captureScreenshot()

```ts
captureScreenshot(rect?): Promise<any>;
```

Defined in: src/original/next/Queued.ts:201

#### Parameters

##### rect?

###### height

`number`

###### width

`number`

###### x

`number`

###### y

`number`

#### Returns

`Promise`\<`any`\>

***

### captureWithRect()

```ts
captureWithRect(mode?): Promise<any>;
```

Defined in: src/original/next/Queued.ts:209

#### Parameters

##### mode?

`string`

#### Returns

`Promise`\<`any`\>

***

### close()

```ts
close(): void;
```

Defined in: src/original/next/Queued.ts:212

#### Returns

`void`

***

### doCopy()

```ts
doCopy(data, options?): Promise<any>;
```

Defined in: src/original/next/Queued.ts:207

#### Parameters

##### data

###### data?

`any`

###### text?

`string`

##### options?

###### showToast?

`boolean`

#### Returns

`Promise`\<`any`\>

***

### getCurrentTab()

```ts
getCurrentTab(): Promise<Tab | null>;
```

Defined in: src/original/next/Queued.ts:210

#### Returns

`Promise`\<`Tab` \| `null`\>

***

### loadMarkdown()

```ts
loadMarkdown(src): Promise<any>;
```

Defined in: src/original/next/Queued.ts:208

#### Parameters

##### src

`string`

#### Returns

`Promise`\<`any`\>

***

### processImage()

```ts
processImage(imageData, mode?): Promise<any>;
```

Defined in: src/original/next/Queued.ts:204

#### Parameters

##### imageData

`string` \| `Blob`

##### mode?

`string`

#### Returns

`Promise`\<`any`\>

***

### processText()

```ts
processText(text, options?): Promise<any>;
```

Defined in: src/original/next/Queued.ts:206

#### Parameters

##### text

`string`

##### options?

###### type?

`string`

#### Returns

`Promise`\<`any`\>

***

### sendMessage()

```ts
sendMessage(type, data?): Promise<any>;
```

Defined in: src/original/next/Queued.ts:211

#### Parameters

##### type

`string`

##### data?

`any`

#### Returns

`Promise`\<`any`\>
