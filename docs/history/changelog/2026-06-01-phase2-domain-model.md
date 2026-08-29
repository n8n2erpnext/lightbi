# Development Log: Phase 2 - Domain Model

**Date:** 2026-06-01
**Phase:** Phase 2 Domain Model Foundation

## Summary
Established the core architecture and domain model for LightBI. Shifted the application paradigm to a dataset-centric model (Project -> Datasource -> Dataset -> Chart -> Dashboard) rather than a query-centric model. Solidified the local-first architecture and the separation of concerns where Rust owns all business logic, while React is strictly a UI layer.

## Files Created
- `docs/adr/ADR-001-core-domain-model.md`
- `docs/adr/ADR-002-local-first-architecture.md`
- `docs/adr/ADR-003-rust-core-engine.md`
- `docs/architecture/domain-model.md`
- `packages/core-types/src/project.ts`
- `packages/core-types/src/datasource.ts`
- `packages/core-types/src/dataset.ts`
- `packages/core-types/src/chart.ts`
- `packages/core-types/src/dashboard.ts`
- `packages/core-types/src/index.ts`
- `docs/history/changelog/2026-06-01-phase2-domain-model.md`

## Architecture Decisions
- **ADR-001:** Adopted Dataset-centric model over Query-centric model.
- **ADR-002:** Decided on a strict local-first architecture where server sync is optional.
- **ADR-003:** Enforced that the core data processing engine, connections, and logic live exclusively in Rust.

## Known Limitations
- No execution code implemented.
- Database connectors, DuckDB integration, and SQLite persistence are not yet built. This phase provides the strict schema definitions required before functional logic can be implemented.
