# ADR 090: Domain Knowledge Preservation

## Status
Accepted

## Context
During the migration to the Business View & Question Pipeline (Phase BVQ), we identified a critical risk: refactoring technical layers could inadvertently delete or orphan existing business domain logic. LightBI currently scatters domain knowledge across `home-guidance.ts` (hero prompts), `dataset-capabilities.ts` (profiling), `question-suggestions.ts` (execution), and `Home.tsx` (UI maps).

## Decision
We enforce the **Domain Knowledge Preservation Principle**.

1. **Refactoring Must Not Reduce Capability:** No architectural rewrite is permitted to remove a domain, workflow, or analytical intent that currently exists in LightBI.
2. **Catalog First:** Before replacing legacy logic, existing business knowledge must be exhaustively cataloged. The `domain-knowledge-catalog-v1.md` serves as the benchmark against which future pipelines are measured.
3. **Reorganization is Permitted, Removal is Not:** We may centralize knowledge from `home-guidance.ts` and `dataset-capabilities.ts` into a unified `BusinessViewRegistry` and `BusinessSignalRegistry`, provided the net analytical power of the platform remains identical or expands.

## Consequences
- **Positive:** Guarantees that LightBI will not lose its rich contextual awareness (e.g., its understanding of HR, Finance, and IT domains currently living in `home-guidance.ts`).
- **Positive:** Forces future refactors to map every legacy "prompt" to a concrete `BusinessView` and `QuestionTemplate` eventually.
- **Negative:** Requires rigorous tracking and migration of dozens of loosely defined concepts into strict, evidence-driven definitions.
