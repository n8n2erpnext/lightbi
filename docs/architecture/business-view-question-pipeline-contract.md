# Business View Question Pipeline Contract

This document formalizes the TypeScript shapes and rules for the `Dataset -> Business Signal -> Perspective -> Business View -> Question` pipeline.

## 1. Business Signal
Represents semantic evidence extracted from the dataset or relationship graph.

```typescript
type BusinessSignal = {
  id: string; // e.g. "route", "sku", "revenue"
  label: string; // e.g. "Route", "SKU", "Revenue"
  domain: "operations" | "revenue" | "inventory" | "customer" | "performance" | "general";
  confidence: number; // 0.0 to 1.0 probability that this signal is correctly identified
  evidenceFields: string[]; // Source columns representing this signal
};
```
**Rules:**
- `confidence` must be derived from underlying data quality or semantic match confidence.
- Only signals with `confidence > 0.5` should be propagated.

## 2. Perspective Candidate
The highest-level domain derived from accumulated Business Signals.

```typescript
type PerspectiveCandidate = {
  id: string; // e.g. "operations"
  name: string; // e.g. "Operations"
  description: string;
  relevanceScore: number; // Aggregate score based on supporting BusinessSignals
  supportingSignals: BusinessSignal[];
};
```
**Rules:**
- A perspective cannot have a `relevanceScore` greater than 0 if it has 0 supporting signals.
- Perspectives with a score of 0 must NOT be shown to the user.

## 3. Business View Candidate
A specific semantic process within a Perspective, backed by specific combinations of signals.

```typescript
type BusinessViewCandidate = {
  id: string; // e.g. "logistics_journey"
  perspectiveId: string; // e.g. "operations"
  title: string;
  purpose: string;
  confidence: number;
  requiredSignals: BusinessSignal[]; // The core signals that trigger this view
  optionalSignals: BusinessSignal[]; // Additional signals that enrich this view
  belief: string; // Semantic explanation of what the system believes this represents
};
```
**Rules:**
- A Business View MUST possess its minimally required signals.
- If the required signals are absent, the `BusinessViewCandidate` must be rejected and hidden.

## 4. Question Plan
An analytical intent derived strictly from a generated Business View.

```typescript
type QuestionPlan = {
  id: string;
  businessViewId: string;
  templateId: string;
  requiredEvidence: BusinessSignal[];
  feasibilityScore: number; // 0.0 to 1.0 likelihood of the query succeeding
};
```
**Rules:**
- `businessViewId` is mandatory. A Question Plan cannot exist in a vacuum.
- Must cite the `BusinessSignal` evidence from the parent Business View.

## 5. Question Suggestion
The final, human-readable artifact rendered to the UI.

```typescript
type QuestionSuggestion = {
  id: string;
  planId: string;
  label: string;
  question: string;
  confidence: number; // Derived from feasibilityScore
  citedEvidence: string[]; // Display names of the evidence used
};
```
**Rules:**
- **Zero Fallback Rule:** If `QuestionSuggestion[]` length is 0 for a given Business View, the system must render "No reliable questions found for this Business View." It must never substitute raw, un-perspectived questions.
- A Question Suggestion must directly trace back to its `QuestionPlan`.
