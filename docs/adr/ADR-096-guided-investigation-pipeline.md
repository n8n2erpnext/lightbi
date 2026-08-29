# ADR-096: Guided Investigation Pipeline Orchestrator

## Context
Following the completion of Phase BVQ-1 through BVQ-5B, we have built five robust, strictly-typed, and isolated layers for data understanding and question generation:
1. `BusinessSignalDetector`
2. `PerspectiveCandidateGenerator`
3. `BusinessViewCandidateGenerator`
4. `QuestionPlanGenerator`
5. `QuestionSuggestionRenderer`

Previously, execution pipelines were fragmented, or they were loosely tied together inside `Home.tsx` or other React component files, causing UI re-render issues and state complexity.

## Decision
We introduce `runGuidedInvestigationPipeline(input: DetectorInput): GuidedInvestigationResult` as the singular, definitive orchestrator function for the semantic analytical pipeline.

1. **Strict Determinism**: The pipeline executes top-to-bottom sequentially. Data flows exclusively in one direction.
2. **Framework Agnostic**: The orchestrator is a pure TypeScript function. It holds no React state, executes no UI hooks, and has zero dependencies on browser APIs.
3. **Immutable Layers**: Each layer receives the output of the preceding layer and never reaches backward to mutate previous states.
4. **No Side Effects**: The pipeline evaluates possibilities; it does not issue DuckDB queries, it does not fetch external LLMs, and it does not block the event loop with I/O. 

## Consequences
- The UI layer (`Home.tsx`) can simply call this one orchestrator function and receive a massive, fully structured context graph detailing exactly how LightBI understands the dataset.
- Testing the entire Business View logic from columns -> English text is now trivial via a single unit test.
- We are officially ready to strip out legacy wiring in the frontend component layer.
