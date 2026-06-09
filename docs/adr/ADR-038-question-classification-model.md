# ADR-038 Question Classification Model

Status:
Accepted

Context:
To resolve a natural language string to a Question Template, the system requires a structured classification mechanism. We need to identify *what* the user is trying to ask before we evaluate *how* to answer it.

Decision:
We establish the **Question Classification Model**.
- The `QuestionClassifier` takes raw text and produces a `TemplateCandidate`.
- It performs **Intent Detection** (e.g., classifying "Who are the best..." as a Ranking Intent).
- It performs **Entity Detection** (extracting "Customers" and mapping it to a semantic field).
- It calculates a **Confidence Score**. If the score falls below a threshold, the system asks for clarification instead of guessing.

Consequences:
- We abstract away the AI parsing logic into a discrete component. If we swap out the classification engine (e.g., from a local BERT model to an LLM API), the rest of the application remains unchanged.
