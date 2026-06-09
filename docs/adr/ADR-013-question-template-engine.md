# ADR-013 Question Template Engine

Status:
Accepted

Context:
To power the "Question First Analytics" paradigm without strictly relying on AI Natural Language Processing, the system needs deterministic definitions of common business questions. Users should not be confronted with a blank screen; they need structured starting points that map intent to execution.

Decision:
Questions are represented as reusable templates.
Templates define:
* Business intent
* Recommended sources (e.g., CSV, Sales DB)
* Recommended recipe operations (e.g., Filter, GroupBy, Join)
* Recommended chart types (e.g., Bar Chart, Line Chart)

Consequences:
* Faster onboarding, as users can click predefined questions like "Compare Target vs Actual" to instantly load a recommended workflow.
* AI is strictly optional. The engine provides value entirely through deterministic template mapping.
* Deterministic behavior guarantees stability and explainability.
