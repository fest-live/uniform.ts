[**@fest-lib/uniform v0.1.18**](../../../../README.md)

***

[@fest-lib/uniform](../../../../README.md) / [original/next/Queued](../README.md) / WorkerConfig

# Interface: WorkerConfig

Defined in: src/original/next/Queued.ts:14

## Properties

### context?

```ts
optional context?: "service-worker" | "main" | "chrome-extension";
```

Defined in: src/original/next/Queued.ts:18

***

### currentTabChannel?

```ts
optional currentTabChannel?: boolean;
```

Defined in: src/original/next/Queued.ts:21

***

### currentTabOptions?

```ts
optional currentTabOptions?: object;
```

Defined in: src/original/next/Queued.ts:22

#### tabIdGetter?

```ts
optional tabIdGetter?: () => number | Promise<number>;
```

##### Returns

`number` \| `Promise`\<`number`\>

#### useVisibleTab?

```ts
optional useVisibleTab?: boolean;
```

***

### name

```ts
name: string;
```

Defined in: src/original/next/Queued.ts:15

***

### options?

```ts
optional options?: WorkerOptions;
```

Defined in: src/original/next/Queued.ts:17

***

### script

```ts
script: string | Worker | (() => Worker);
```

Defined in: src/original/next/Queued.ts:16

***

### tabsChannel?

```ts
optional tabsChannel?: boolean;
```

Defined in: src/original/next/Queued.ts:19

***

### tabsOptions?

```ts
optional tabsOptions?: object;
```

Defined in: src/original/next/Queued.ts:20

#### tabFilter?

```ts
optional tabFilter?: (tab) => boolean;
```

##### Parameters

###### tab

`Tab`

##### Returns

`boolean`
