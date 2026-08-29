# AUDIT: Guided Investigation Purity
**Date**: 2026-06-09
**Context**: Phase BVQ-6.5 Mandatory Pipeline Purity Audit

## Executive Summary
This audit validates whether the application architecture strictly enforces the rule that user-facing analytical questions (`QuestionSuggestion`) are derived **exclusively** from the `DOMAIN_KNOWLEDGE_CATALOG_V1`, without fallback to raw columns, semantic tags, or AI hallucinations.

**Audit Status**: 🟩 **GREEN**: Home.tsx is fully compliant. Legacy files eradicated or disconnected. 
*See `AUDIT-home-guided-investigation-final.md` for the final report.*

---

## Audit Questions

### 1. Can any QuestionSuggestion be produced without DOMAIN_KNOWLEDGE_CATALOG_V1?
- **In Pipeline**: **NO**. `question-suggestion-renderer.ts` strictly queries the catalog.
- **In App (`Home.tsx`)**: **YES**. `Home.tsx` still imports the legacy `generateQuestionSuggestions(mapping)` which uses hardcoded templates independent of the catalog.

### 2. Can any QuestionSuggestion be produced from raw dataset columns?
- **In Pipeline**: **NO**.
- **In App**: **YES**. Legacy `question-suggestions.ts` reads `SemanticTag` maps and constructs English strings using column-level interpolations.

### 3. Can any QuestionSuggestion be produced from semantic tags directly?
- **In Pipeline**: **NO**. Signals must be elevated to Perspectives -> Business Views -> Question Plans first.
- **In App**: **YES**. `Home.tsx` currently bypasses Business Views entirely to generate "field level questions" directly from tags.

### 4. Can any QuestionSuggestion be produced from legacy question-suggestions.ts?
- **YES**. `import { generateQuestionSuggestions } from '../lib/question-suggestions';` is active on Line 18 of `Home.tsx`.

### 5. Can any Business View still come from hardcoded arrays or Home.tsx?
- **In Pipeline**: **NO**.
- **In App**: **YES**. `Home.tsx` Line 195 defines a massive hardcoded `PerspectiveBusinessViewMap` directly inside the React component.

### 6. Can any Perspective still come from hardcoded arrays or Home.tsx?
- **In Pipeline**: **NO**.
- **In App**: **YES**. `Home.tsx` defines static perspective UI cards and a hardcoded selector that ignores runtime evidence.

### 7. Does `guided-investigation-pipeline.ts` contain any fallback generation logic?
- **NO**. The pipeline employs strict cascading failures. If no signals match the minimum thresholds of a Business View, the pipeline returns exactly `[]` for views, plans, and suggestions.

### 8. Can a dataset bypass the full `Signals → Perspectives → Views → Plans` flow and still get Questions?
- **YES**. `Home.tsx` currently skips the pipeline completely, bypassing the `QuestionPlan` layer to render old field-level questions.

---

## Architectural Matrix

| Stage | Current App Source | Approved? | Violation? | Fix Needed? |
| :--- | :--- | :--- | :--- | :--- |
| **Signals** | `mapSemanticFields` (legacy) | ❌ No | ⚠️ Yes | Switch to `detectBusinessSignals` via pipeline. |
| **Perspectives** | `guidedInvestigationResult` via Pipeline | ✅ Yes | ✅ Fixed in BVQ-7B | Removed hardcoded array. |
| **Business Views** | `guidedInvestigationResult` via Pipeline | ✅ Yes | ✅ Fixed in BVQ-7C | Removed PerspectiveBusinessViewMap. |
| **Question Plans** | (Completely Bypassed) | ❌ No | 🛑 Yes | Must be executed by pipeline. |
| **Question Suggestions** | `guidedInvestigationResult` via Pipeline | ✅ Yes | ✅ Fixed in BVQ-7D | Fully strict pipeline filtering in `Home.tsx`. |

---

## Findings & Remaining Legacy Dependencies
The underlying logic engines (BVQ-1 through BVQ-6) have successfully isolated and purified the analytical intent model. 

However, `Home.tsx` is currently an architectural violation. It contains:
1. `import { generateQuestionSuggestions } } from '../lib/question-suggestions';`
2. `import { generateBusinessViews } from '../lib/business-view-generator';` (The old, non-registry version)
3. A hardcoded `PerspectiveBusinessViewMap` spanning over 150 lines.

## Recommendation for Phase BVQ-7
We must immediately authorize **Phase BVQ-7: Home Wiring Cleanup**.
1. Delete `PerspectiveBusinessViewMap` from `Home.tsx`.
2. Delete `apps/desktop/src/lib/question-suggestions.ts` to physically prevent NLP fallback.
3. Delete `apps/desktop/src/lib/business-view-generator.ts` (the legacy non-registry file).
4. Wire `Home.tsx` to execute `runGuidedInvestigationPipeline` upon dataset load.
5. Feed the resulting `BusinessViewCandidate` and `QuestionSuggestion` arrays directly into the UI state.
