# ADR 089: Business View Registry V1

## Status
Accepted

## Context
As we migrate LightBI to a Signal-Driven architecture, we must ensure we do not accidentally shrink the product's capabilities. A full audit of the codebase (`AUDIT-existing-business-domain-coverage.md`) revealed extensive existing domain logic across `Home.tsx` (UI maps), `question-suggestions.ts` (Templates), and `dataset-capabilities.ts` (Profiler).

To centralize and safeguard these capabilities, we need a canonical, evidence-driven registry.

## Decision
We establish the **Business View Registry V1** (`business-view-registry-v1.md`) as the canonical catalog of supported business interpretations in LightBI.

1. **Comprehensive Coverage:** V1 must natively support Operations, Revenue, Inventory, Customer, and Performance perspectives, explicitly covering all legacy hardcoded UI states and question templates.
2. **Evidence-Driven Exclusivity:** The Registry is the *only* source of truth for what a dataset can do. If a dataset does not meet the `minimumRequiredMatches` for a definition's `requiredSignals`, that view cannot exist.
3. **Extensibility Contract:** Adding a new domain (e.g., HR, Education) to LightBI strictly requires:
   - Adding semantic aliases to the Signal Detector.
   - Adding View Definitions to the Business View Registry.
   - Writing tests to prove generation.
4. **Generator Integration:** The `Business View Candidate Generator` (Phase BVQ-4) must exclusively consume this V1 Registry.

## Consequences
- **Positive:** Guarantees LightBI retains all its legacy functionality while upgrading its architectural purity.
- **Positive:** Provides a crystal-clear roadmap for product expansion (e.g., building a "Finance Plugin").
- **Negative:** Requires mapping dozens of views and testing them thoroughly to ensure no regressions occur during the UI cutover.
