# Question Template Architecture

In LightBI, a Question Template is the secure bridge between natural language and deterministic execution. It prevents wild LLM hallucinations by forcing all questions to resolve into pre-approved, parameterized structures.

## Architectural Flow

```mermaid
graph TD
    subgraph Natural Language
        Q[User Question]
    end

    subgraph Template Resolution
        Q --> C[Question Classifier]
        C -->|Extracts| Params[Entities / Metrics]
        C -->|Scores Intent| R[Template Resolver]
        
        R -->|Validates| T[Question Template]
    end

    subgraph Recipe Generation
        T -->|Fills| F[Template Instance]
        F -->|Compiles| Rec[Recipe]
    end
```

## Anti-Hallucination Guardrails
Because the system never allows an LLM to generate SQL or Recipes directly, the AI's only job is to perform named-entity recognition and intent classification on the user's string, drastically simplifying the prompt and reducing error rates to near zero.
