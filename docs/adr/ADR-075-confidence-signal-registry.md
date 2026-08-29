# ADR-075: Confidence Signal Registry

## Status
Accepted

## Context
ADR-074 defines the default confidence weights (Dataset Health 25%, Relationship Quality 25%, Result Validation 25%, Coverage 15%, Business View Match 10%).

If the Business Confidence Engine directly hardcodes these sources (e.g. `score = datasetHealth + relationship + resultValidation`), it becomes difficult to add future confidence sources such as:
- Freshness
- Source Reliability
- Runtime Stability
- User Confirmation
- Data Lineage Confidence
- Semantic Confidence

We need a registry architecture to decouple the engine from specific signal types.

## Architecture Principles
The Business Confidence Engine must **not** know specific signal types. Instead, it follows this flow:
`ConfidenceSignal -> Registry -> Aggregator -> BusinessConfidenceResult`

The engine consumes signals. The engine does not own signals.

## Signal Registry Model

### Categories
```typescript
export type ConfidenceSignalCategory =
  | "dataset_health"
  | "relationship_quality"
  | "result_validation"
  | "coverage"
  | "business_view"
  | "future";
```

### Signal Structure
```typescript
export type ConfidenceSignal = {
  id: string;
  category: ConfidenceSignalCategory;
  label: string;
  score: number;
  weight: number;
  enabled: boolean;
  explanation: string;
  sourceContract?: string;
};
```

### Registry Structure
```typescript
export type ConfidenceSignalRegistry = {
  version: string;
  signals: ConfidenceSignal[];
};
```

## Rules
1. **Signals are independent.**
   - Dataset Health must not directly modify Relationship Quality.
   - Relationship Quality must not directly modify Coverage.
2. **Signals are composable.**
   - Future signals can be added without rewriting the engine.
3. **Signals are replaceable.**
   - Example: Coverage V1 can later become Coverage V2 without redesigning the Business Confidence Engine.

## Aggregation Model
The Business Confidence Engine's future behavior:
- **Input**: `ConfidenceSignal[]`
- **Output**: `BusinessConfidenceResult`
- **Formula**: Weighted average of enabled signals.

No hardcoded categories exist inside the engine.

### Missing Signals
If a signal is unavailable, its `enabled` property is set to `false`. The Engine recalculates weight normalization for the remaining enabled signals.

*Example*:
- Dataset Health = 25
- Relationship = 25
- Business View = 10
- Result Validation = unavailable
- Coverage = unavailable

The Engine normalizes across the available weights (25 + 25 + 10 = 60). The score becomes the weighted average across 60. The mode is marked as `provisional`.

## Versioning
The Registry must support versioning:
- `version: "1.0"`
- Future: `version: "2.0"`

This allows Business Confidence evolution without breaking old projects.

## Architecture Rule
The Business Confidence Engine **must consume** the `ConfidenceSignalRegistry`.
It **must not directly consume**:
- Dataset Health
- Relationship Graph
- Result Validator
- Coverage Metrics

Adapters will convert those systems into standard `ConfidenceSignal` objects for the registry.

## Benefits
- Creates a plug-in style trust architecture.
- Future confidence sources become easy to add.
- Business Confidence Engine remains stable and focused only on mathematical aggregation.
