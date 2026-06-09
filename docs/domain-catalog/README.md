# Domain Knowledge Catalog

## Purpose
The Domain Knowledge Catalog preserves LightBI's business knowledge strictly outside of implementation code. By separating business intelligence from execution logic, we ensure that architectural refactors never accidentally destroy analytical capabilities.

## Structure
Every domain catalog file in this directory must include:
1. **Domain purpose:** High-level summary of the domain.
2. **Business concepts:** Core entities mapping to Signals.
3. **Canonical signals:** The exact identifiers used in the Signal Registry.
4. **Intent families:** Groupings of analytical goals.
5. **Question templates:** The human-readable questions the system can answer.
6. **Business views:** The workflows that contain these questions.
7. **Required signals:** Minimum evidence for instantiation.
8. **Optional signals:** Enrichment evidence.
9. **Example use cases:** How it applies to real data.
10. **Notes for future expansion:** Where the domain can grow.

## The Model
Knowledge flows sequentially through this model:

```text
Domain
  → Concepts
    → Signals
      → Intent Families
        → Question Templates
          → Business Views
```

**Rule:** Question templates are *knowledge assets*. They must be documented here in the Knowledge Layer and ultimately consumed by the Execution Layer; they should never be scattered or hardcoded across UI components (like `Home.tsx` or `question-suggestions.ts`).
