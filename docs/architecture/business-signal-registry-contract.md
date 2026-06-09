# Business Signal Registry Contract

This document formalizes the TypeScript shapes and contracts for the Business Signal layer.
**No Implementation Allowed Here. Contracts Only.**

## 1. BusinessSignalEvidence
Represents the raw dataset trace used to justify the detection of a signal.

```typescript
export interface BusinessSignalEvidence {
  columnName: string;
  sampleValues: string[];
  dataType: string;
  matchReason: string; // e.g., "Regex match on 'nhân viên giao hàng'"
}
```

## 2. BusinessSignalConfidence
Encapsulates the probability that a detected signal is accurate.

```typescript
export interface BusinessSignalConfidence {
  score: number; // 0.0 to 1.0
  isVerified: boolean; // True if confirmed by user or strict structural rules
}
```

## 3. BusinessSignalCandidate
An intermediate state emitted by a single detector before it is reconciled into the registry.

```typescript
export interface BusinessSignalCandidate {
  canonicalId: string; // Must map to ADR-087 Taxonomy (e.g., 'driver')
  domain: string; // e.g., 'operations'
  evidence: BusinessSignalEvidence;
  confidence: BusinessSignalConfidence;
  detectorId: string; // e.g., 'regex_detector_v1'
}
```

## 4. BusinessSignal
The final, reconciled semantic unit consumed by downstream analytical layers.

```typescript
export interface BusinessSignal {
  canonicalId: string;
  domain: string;
  label: string; // The canonical display name (e.g., "Driver")
  confidenceScore: number; // Aggregated score from multiple candidates
  supportingEvidence: BusinessSignalEvidence[]; // Can contain evidence from multiple columns
}
```

## 5. BusinessSignalDetectorResult
The standard output of any detector plugin.

```typescript
export interface BusinessSignalDetectorResult {
  detectorId: string;
  executionTimeMs: number;
  candidates: BusinessSignalCandidate[];
}
```

## 6. BusinessSignalRegistry
The central source of truth for semantic understanding in the workspace.

```typescript
export interface BusinessSignalRegistry {
  datasetId: string;
  signals: BusinessSignal[];
  
  // Contractual Read Methods for downstream consumers
  hasSignal(canonicalId: string): boolean;
  getSignal(canonicalId: string): BusinessSignal | undefined;
  getSignalsByDomain(domain: string): BusinessSignal[];
  getOverallConfidence(): number;
}
```
