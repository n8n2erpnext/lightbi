# Question Classification Model

The `QuestionClassifier` acts as the natural language parser for LightBI.

## Core Operations

1. **Intent Detection**: Analyzes the question phrasing to determine if it is a `TopN`, `Trend`, `Comparison`, or `Distribution` request.
2. **Entity Detection**: Maps nouns (e.g., "Western Region") to the active `Semantic Scope`.
3. **Measure Detection**: Maps verbs/adjectives (e.g., "Total", "Average") to the active `Semantic Measures`.
4. **Confidence Scoring**: Calculates a float `(0.0 - 1.0)`. If the score is below the strict `TemplateResolver` threshold (e.g., `< 0.75`), the request is rejected and the user is prompted for clarification.

## Detachment
This module is explicitly detached from execution. It has no knowledge of databases, SQL dialects, or query planners. It operates purely on semantic arrays.
