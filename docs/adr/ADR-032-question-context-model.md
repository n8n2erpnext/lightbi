# ADR-032 Question Context Model

Status:
Accepted

Context:
Once a user asks a Question and a Perspective is resolved, the system requires a structured payload to hand over to the Recipe Engine. Passing raw text strings directly to execution layers guarantees brittle behavior.

Decision:
We establish the `QuestionContext` model.
This context acts as the formal boundary between the user's intent and the mechanical Recipe Engine.

It contains:
- The resolved `Perspective` object.
- The `Dataset Scope` (the subset of datasets this perspective is allowed to see).
- The `Semantic Scope` (the business fields relevant to this question).
- The `Business Intent` (the parsed natural language intent, e.g., "Trending Analysis", "Summary").

Consequences:
- Future Recipe Planners and AI execution engines will consume the `QuestionContext`, insulating them from parsing user roles or permissions.
- This creates perfectly deterministic boundaries for AI pipelines.
