# ROADMAP-MVP-V1 Phase 5: Lightweight Advanced Handoff Artifact (Revised Plan)

This plan implements a minimal structured artifact for Data Analysts (Advanced Mode) to accelerate their data preparation workflows. It focuses explicitly on raw-to-canonical lineage, avoiding any attempt to build an ETL pipeline or notebook replacement.

## Proposed Changes

### 1. New Contract: `advanced-handoff-contract.ts`
We will introduce a new file `apps/desktop/src/lib/advanced-handoff-contract.ts` to hold the artifact type definition and its generator function.

**Location**: `apps/desktop/src/lib/advanced-handoff-contract.ts`

**Proposed Interface**:
```typescript
import type { DecisionReadinessTier } from './decision-readiness-engine';

export type FieldLineage = {
  originalColumn: string;
  canonicalConcept: string | null; // e.g., 'report_date', 'revenue'
  signalType: 'measure' | 'dimension' | 'time' | 'status' | 'unknown';
  confidenceScore: number;
  derivationNote?: string; // Optional note if cheaply available, e.g. "Matched via alias"
};

export type AdvancedHandoffArtifact = {
  datasetName: string;
  grainHint: "event" | "entity" | "snapshot" | "summary" | "unknown";
  rawToCanonicalMapping: FieldLineage[];
  caveats: string[]; // Aggregated from understanding and readiness engine
  readiness: {
    tier: DecisionReadinessTier;
    summary: string;
  };
};
```

### 2. Generator Function
We will implement `generateAdvancedHandoff(understanding: DatasetUnderstanding): AdvancedHandoffArtifact` in the same file.

**Handling Edge Cases & Derivation Logic**:
- **Raw-to-Canonical Lineage (`rawToCanonicalMapping`)**:
  - Derived primarily from `understanding.detectedConcepts`.
  - **Concept supported by multiple evidence columns**: `detectedConcepts` holds an `evidence: string[]` array. We will iterate over `evidence` so that *every* raw column gets its own `FieldLineage` entry.
  - **Multiple raw columns to same concept**: Handled naturally by the above. Two different `originalColumn` strings will map to the same `canonicalConcept`.
- **Role Derivation**: 
  - We will use `getSignalType()` for the base type (`measure`, `dimension`, `time`). 
  - To be honest about `status`, we will apply a lightweight explicit rule: if `canonicalConcept` is `status`, `delivery_status`, or `stock_status`, we assign the role `'status'`.
- **Missing or Partial Readiness**:
  - If `understanding.readiness` is missing or undefined (e.g. partial generic dataset), we will fall back to a safe default: `tier: "exploratory_only"` and provide a safe `summary`.
- **`grainHint`**: Carried straight through from `understanding.grainHint`.
- **`caveats`**: Combines `understanding.caveats` and `understanding.readiness?.caveats` safely, de-duplicating if necessary.

### 3. Usage & Scope Constraints
- **Synchronous Derivative**: The artifact is purely derived from the existing `DatasetUnderstanding` object synchronously.
- **Local-first**: Operates completely locally without cloud AI.
- **No Backend/UI Sprawl**: No changes to the DuckDB runtime or execution layers. No UI will be built in this phase; the focus is solely on the contract and passing tests.
- **No Second Architecture**: It reuses the exact output of the existing signal detection pipeline.

## Verification Plan

Create `apps/desktop/src/lib/advanced-handoff-contract.test.ts` to assert:
1. **Explicit Lineage**: Raw-to-canonical mapping is preserved and explicit. A concept with multiple evidence columns correctly produces multiple `FieldLineage` records.
2. **Strict Readiness**: Readiness is aggregated safely, defaulting to `exploratory_only` if the source readiness is missing/partial.
3. **Grain Hint**: `grainHint` is accurately carried through.
4. **Honest Roles**: `status`-like canonical concepts receive the `"status"` role, while others get their honest `getSignalType()` result.
5. **Generic Safeties**: Generic datasets produce valid, non-throwing artifacts.
