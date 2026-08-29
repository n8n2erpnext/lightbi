# ADR-095: Question Suggestion Renderer

## Context
In Phase BVQ-5A, we created the `Question Plan` contract to isolate analytical intent (e.g., dimensions, measures) from Natural Language Processing (NLP). 

Now, in Phase BVQ-5B, we need to bridge this abstract `QuestionPlan` back to the human-readable UI. Previously, execution, planning, and text generation were heavily intertwined, leading to issues where analytical properties leaked into the user interface, or UI strings interfered with backend querying logic.

## Decision
We enforce a strict separation of concerns where the `Question Suggestion Renderer` is exclusively responsible for presentation text.

1. **Presentation only, not planning**: The `QuestionSuggestion` is pure presentation. It holds the final text and inherits tracking IDs/confidence, but does NOT plan dimensions or measures.
2. **Consumes QuestionPlan + Domain Catalog**: The renderer simply looks up the `intentId` specified by the `QuestionPlan` in the `DOMAIN_KNOWLEDGE_CATALOG_V1`, and retrieves predefined `questionTemplates`.
3. **No Inference**: The renderer never tries to infer, modify, or generate questions dynamically. If a template is missing, it produces no suggestion. 
4. **No Raw Column Names**: The renderer never constructs fallback questions using raw column names (e.g., "Analyze `sales_total` by `customer_name`").
5. **No AI Generation**: In this phase, AI generation is strictly forbidden to guarantee absolute determinism and 100% catalog alignment.
6. **No Placeholder Leakage**: Abstract structural markers from the planner like `time`, `metric`, or `category` are completely omitted from the text, preventing backend constructs from leaking into the UI.

## Consequences
- The UI layer will now consume `QuestionSuggestion` objects which guarantee safe, localized, human-readable text.
- The execution pipeline is definitively protected from NLP side-effects.
- Expanding languages or changing question phrasing is now exclusively isolated to the `DOMAIN_KNOWLEDGE_CATALOG_V1` and the renderer, touching no execution engines.
- We strictly adhere to the "No Fallback" rule; without catalog templates, no text is rendered.
