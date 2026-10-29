[**@fest-lib/uniform v0.1.35**](../../../../README.md)

***

[@fest-lib/uniform](../../../../README.md) / [newer/messaging/UnifiedMessaging](../README.md) / PipelineConfig

# Interface: PipelineConfig

Defined in: modules/projects/uniform.ts/src/newer/messaging/UnifiedMessaging.ts:69

## Properties

### errorHandler?

```ts
optional errorHandler?: (error, stage, message) => void;
```

Defined in: modules/projects/uniform.ts/src/newer/messaging/UnifiedMessaging.ts:72

#### Parameters

##### error

`unknown`

##### stage

[`PipelineStage`](PipelineStage.md)

##### message

[`UnifiedMessage`](UnifiedMessage.md)

#### Returns

`void`

***

### name

```ts
name: string;
```

Defined in: modules/projects/uniform.ts/src/newer/messaging/UnifiedMessaging.ts:70

***

### stages

```ts
stages: PipelineStage[];
```

Defined in: modules/projects/uniform.ts/src/newer/messaging/UnifiedMessaging.ts:71

***

### timeout?

```ts
optional timeout?: number;
```

Defined in: modules/projects/uniform.ts/src/newer/messaging/UnifiedMessaging.ts:73
