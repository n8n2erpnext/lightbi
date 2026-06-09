# ADR-037 Question Template Architecture

Status:
Accepted

Context:
If users type natural language questions and the system hands them directly to an LLM to generate SQL or Recipes, the result is wildly unpredictable. Hallucinations destroy trust in Business Intelligence tools. We need a way to snap unstructured text into deterministic, proven boundaries.

Decision:
We establish the **Question Template Layer**.
- **Template Identity:** Templates represent reusable analytical questions (e.g., "Top N Customers", "Revenue Trend").
- **Template Composition:** A Template acts as a parameterized factory for Recipes. Instead of generating a Recipe from scratch, the system resolves a Template and fills in the parameters.
- **Architectural Enforcement:** `Question -> Question Template -> Recipe`. The system never goes directly from Question to Recipe.

Consequences:
- Hallucination risk drops to near zero because the LLM/Classifier only has to select a pre-approved template and extract entities, rather than inventing complex logic on the fly.
