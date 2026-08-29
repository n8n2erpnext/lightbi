# ADR 084: Business View Driven Question Pipeline

## Status
Accepted

## Context
The architectural audit in `AUDIT-perspective-business-view-question.md` confirmed that the Question Engine was completely decoupled from the Business Context layer. The dataset was generating questions unconditionally via regex-based column templates, while the UI only applied cosmetic filtering on those pre-generated questions. 

This resulted in a fatal fallback flaw where missing keywords caused unrelated questions to bleed across domains (e.g., Inventory questions appearing under a Logistics Journey business view). It directly violated LightBI's locked architectural hierarchy: `Perspective -> Business View -> Question -> Insight`.

## Decision
We must enforce the strictly hierarchical and evidence-based **Business View Driven Question Pipeline**. Questions can no longer be generated directly from dataset columns without passing through the Business View gateway.

The new enforced pipeline is:
`Dataset -> Business Signal Detection -> Perspective Candidate Generation -> Business View Candidate Generation -> Question Plan -> Question Suggestions`

### 1. Business Signal Detection
- **Input:** Dataset profile, semantic fields, detected capabilities, relationship graph.
- **Output:** Array of `BusinessSignal` (e.g., route, driver, sku, revenue).
- **Rule:** Extracts semantic evidence directly from the data.

### 2. Perspective Candidate Generation
- **Input:** Array of `BusinessSignal`.
- **Output:** Array of `PerspectiveCandidate` (e.g., Operations, Inventory).
- **Rule:** Perspectives must be derived from signals. A perspective cannot exist in the UI if there is zero supporting signal evidence for it.

### 3. Business View Candidate Generation
- **Input:** Selected `PerspectiveCandidate` + Array of `BusinessSignal`.
- **Output:** Array of `BusinessViewCandidate` (e.g., Logistics Journey, Delivery SLA).
- **Rule:** Business Views must be supported by concrete evidence. Hardcoded views cannot be shown if the underlying semantic signals are missing.

### 4. Question Plan
- **Input:** Selected `BusinessViewCandidate`.
- **Output:** Array of `QuestionPlan`.
- **Rule:** Questions must belong exclusively to a selected Business View and strictly cite its evidence.

### 5. Question Suggestions
- **Input:** Array of `QuestionPlan`.
- **Output:** Rendered questions in the UI.
- **Rule:** Questions shown in a Business View context must have been generated *for* that Business View. 

## Hard Prohibition: The Fallback
The fatal fallback that caused cross-domain contamination is strictly prohibited:
```typescript
// DO NOT DO THIS
if (businessViewQuestions.length === 0) {
  show datasetQuestions
}
```
If a Business View yields no questions, the system must render: "No reliable questions found for this Business View." It must never fall back to raw dataset questions.

## Consequences
- **Positive:** Questions are guaranteed to match the user's selected business context.
- **Positive:** Eliminates UI confusion where unrelated questions leak across domains.
- **Positive:** Strongly aligns the codebase with LightBI's semantic intent architecture.
- **Negative:** Datasets with weak semantic metadata might yield fewer questions than the previous scattershot regex approach.
