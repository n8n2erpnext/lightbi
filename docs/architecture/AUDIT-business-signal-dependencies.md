# Mandatory Audit: Business Signal Dependencies

## Trace Target
`Signal -> Perspective -> Business View -> Question -> Insight -> Confidence`

## Goal
Verify every downstream system consumes `BusinessSignal` instead of raw dataset fields.

## Trace Results

### 1. Signal -> Perspective
- **Status:** **VIOLATION**
- **Location:** `apps/desktop/src/pages/Home.tsx`
- **Evidence:** Perspectives are a hardcoded UI array (`[{ id: "operations", name: "Operations" }, ...]`). The selection relies purely on user click events, not on the presence or detection of `BusinessSignal` objects.

### 2. Perspective -> Business View
- **Status:** **VIOLATION**
- **Location:** `apps/desktop/src/pages/Home.tsx`
- **Evidence:** Business Views are a hardcoded dictionary (`PerspectiveBusinessViewMap`). They do not accept a `BusinessSignalRegistry` to filter invalid views. They are simply mapped 1:1 with the selected UI perspective.

### 3. Business View -> Question
- **Status:** **VIOLATION**
- **Location:** `apps/desktop/src/lib/question-suggestions.ts`
- **Evidence:** `generateQuestionSuggestions(mapping: SemanticMapping)` consumes raw `SemanticMapping` (derived from dataset columns). It does not accept `BusinessView` constraints, nor does it consume canonical `BusinessSignal` objects. It maps directly from raw data to questions.

### 4. Question -> Insight
- **Status:** **PENDING / VIOLATION**
- **Location:** `apps/desktop/src/lib/insight-contract.ts` (Phase U, incomplete)
- **Evidence:** The current preview logic relies on `PreviewResultContract` generated from the Question string. Insights are not currently tied back to the foundational `BusinessSignal` that triggered the question.

### 5. Insight -> Confidence
- **Status:** **VIOLATION**
- **Location:** `apps/desktop/src/lib/business-confidence-engine.ts`
- **Evidence:** `calculateBusinessConfidence` relies on `DatasetHealthResult` and `PreviewResultContract`. It completely bypasses the semantic signals. Confidence should be intrinsically linked to the `confidenceScore` of the `BusinessSignal` that forms the foundation of the view.

## Conclusion
The current implementation systematically violates the LightBI philosophy. Every layer (Perspective, Business View, Question, Confidence) bypasses the canonical semantic layer and couples directly to raw data structures or hardcoded UI states. The `BusinessSignalRegistry` must be implemented to sever these direct connections.
