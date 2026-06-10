# ADR-094: Question Plan Before Question

## Context
During the Business View and Question (BVQ) refactoring, we successfully mapped `Dataset -> Signals -> Perspectives -> Business Views`. The next step is to generate analytical questions from the approved Business Views.

Historically, LightBI generated final English text strings (e.g., "Which drivers have the most delayed shipments?") directly from Business Views. This merged analytical intent (what data we want to query) with natural language presentation (how we phrase it).

This tight coupling caused problems:
- NLP string manipulation leaked into the analytical execution engine.
- Internationalization (i18n) became incredibly complex.
- Evaluating the safety of a query required parsing English strings.

## Decision
We enforce a strict boundary between analytical intent and linguistic presentation.

1. **Question Plans are analytical intent**: The `Question Plan` layer is responsible for defining *what* the question aims to achieve functionally (e.g., "Analyze trend over time", "Rank entities by metric") using abstract `dimensions` and `measures`.
2. **Question Suggestions are presentation**: The `Question Suggestion` layer is responsible for generating human-readable English/Vietnamese text.
3. **The planner owns intent, the UI owns wording**: Execution engines will eventually consume `QuestionPlans` (or its child nodes) without ever reading human text. The text is for the user's benefit.
4. **Never merge them**: The `question-plan-generator.ts` is explicitly forbidden from returning NLP structures like `prompt`, `title`, `description`, or `question`.

## Consequences
- The Question Planner now derives `QuestionPlan` objects purely by reading the `DOMAIN_KNOWLEDGE_CATALOG_V1`. It creates one plan per `intentId`.
- The engine computes a structural requirement (e.g., a "trend" intent needs a `time` dimension) generically, without hardcoding business domains.
- Future execution engines can safely compile `QuestionPlan` structures into `CompiledQueryContracts` without parsing English strings.
- The UI layer (in Phase BVQ-5B) will be responsible for translating these abstract Plans into user-facing suggestions using the catalog's `questionTemplates`.
