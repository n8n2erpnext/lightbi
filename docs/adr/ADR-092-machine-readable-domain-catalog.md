# ADR 092: Machine-Readable Domain Catalog

## Status
Accepted

## Context
In Phase DK-2, we successfully isolated LightBI's business knowledge into a series of Markdown documents (`docs/domain-catalog/*.md`). While this provides an excellent human-readable reference, our execution engines (e.g., Business View Candidate Generator, Question Planner) cannot reliably or safely parse Markdown files at runtime without risk of errors or drift.

If we force the execution engines to hardcode this logic in TypeScript while keeping the Markdown as a separate source, the two will inevitably drift apart over time.

## Decision
We create the **Machine-Readable Domain Catalog Registry** (`domain-knowledge-catalog.ts`).

1. **Dual Representation, Single Truth:** The TypeScript registry is an exact mirror of the Markdown catalog. The TS registry serves as the runtime dependency for all Execution Layer modules.
2. **Strict Validation:** A comprehensive suite of unit tests guarantees that the TS registry adheres to the structural rules defined in the Markdown catalog (e.g., exact domain presence, signal validity, intent resolution).
3. **Engine Decoupling:** Engines like the Business View Candidate Generator must import and consume `DOMAIN_KNOWLEDGE_CATALOG_V1`. They may no longer define internal registries of business views.
4. **Future Expansion:** In the future, this TS array can be refactored to dynamically parse a `catalog.json` or `catalog.yaml` file to further remove code-changes from domain additions, but for V1.0, the strongly typed TS file provides the necessary safety.

## Consequences
- **Positive:** Execution engines are fully decoupled from domain definitions. We can modify the "brain" of LightBI by simply editing a data object.
- **Positive:** Guarantees 100% alignment between the documentation built in DK-2 and the actual runtime behavior of the app.
- **Negative:** For now, updating a domain still requires a code change to the TS file, meaning business analysts must submit PRs to add domains. (Mitigated by future JSON dynamic loading).
