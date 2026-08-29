# ADR 093: Registry-Driven Business View Generation

## Status
Accepted

## Context
Previously, the `business-view-candidate-generator.ts` held a hardcoded internal array `BUSINESS_VIEW_REGISTRY` that duplicated business domain logic. This directly violated the architectural mandate set in Phase DK-2, which dictates that execution engines must be decoupled from domain knowledge.

## Decision
We enforce **Registry-Driven Business View Generation**.

1. **No Hardcoded Knowledge:** The Business View Candidate Generator must not contain any `const BUSINESS_VIEWS = [...]` arrays or hardcoded domain mappings.
2. **Catalog Consumption:** The generator must dynamically consume `DOMAIN_KNOWLEDGE_CATALOG_V1` (via `getDomainCatalog()`) at runtime.
3. **Pure Evaluation Role:** The generator's only responsibility is to evaluate `PerspectiveCandidate` + `BusinessSignalRegistry` against the mathematical thresholds (`minimumRequiredMatches`) defined in the catalog.
4. **Dynamic Extensibility:** Adding a new domain (e.g., Medical) to the Catalog Registry automatically allows the generator to process it without any code changes to the generator itself.

## Consequences
- **Positive:** Perfect separation of concerns. The Engine computes math; the Registry defines business truth.
- **Positive:** Zero risk of drift between the Knowledge Layer and the Execution Layer.
- **Negative:** Errors in the Registry file (e.g., typos in `requiredSignals`) will directly cause the Engine to fail to match views, placing strict importance on Registry validation tests.
