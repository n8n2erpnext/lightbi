# ADR 091: Domain Knowledge Catalog

## Status
Accepted

## Context
Recent architecture audits (Phases BVQ and DK-1) revealed that LightBI's business knowledge (question templates, business views, hardcoded perspectives) was dangerously scattered across UI code (`Home.tsx`), profiling code (`dataset-capabilities.ts`), and engine code (`question-suggestions.ts`). 

If business questions live only inside UI or engine code, any future refactor of the Execution Layer risks silently destroying analytical capabilities.

LightBI requires a stable, independent **Knowledge Layer**.

## Decision
We establish the **Domain Knowledge Catalog** as a first-class architectural asset.

1. **Separation of Concerns:** 
   - **Knowledge Layer:** Defines *what* LightBI knows about a domain (Concepts, Intent Families, Question Templates, Business View Definitions).
   - **Execution Layer:** Defines *how* LightBI generates insights (Business Signal Detector, Perspective Candidate Generator, Business View Candidate Generator, Question Planner, Runtime, Confidence Engine).

2. **Dependency Direction:** 
   - Engines *consume* catalogs. Catalogs *do not depend* on engines.
   - The Knowledge Layer must not import from the Execution Layer.

3. **Extension Model:**
   - Adding a new domain (e.g., Medical, Education) must be done by adding a domain catalog file, not by rewriting core engines.
   - The Domain Knowledge Catalog serves as the ultimate source of truth for the Business Signal taxonomy, Perspective candidates, Business View Registry, and Question Intent Templates.

4. **Preservation Guarantee:** 
   - Refactoring must preserve or expand catalog coverage. It must never silently reduce it.

## Consequences
- **Positive:** Refactoring the Execution Layer becomes infinitely safer because the Knowledge Layer acts as a concrete test suite and capability baseline.
- **Positive:** Domain experts can contribute new domains (e.g., Hospitality) simply by writing markdown/JSON catalog files without touching TypeScript execution engines.
- **Negative:** Requires rigorous discipline to ensure developers do not slip hardcoded domain logic back into engine or UI code.
