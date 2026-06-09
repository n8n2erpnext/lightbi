# Development Log: Phase 11 - Persistence Architecture

**Date:** 2026-06-01
**Phase:** Phase 11 Persistence Architecture & SQLite Metadata Store

## Summary
Transitioned from pure conceptual architecture into the foundation of execution by establishing the physical persistence boundaries. LightBI now formally adopts a directory-based project model, utilizing SQLite for metadata.

## Architecture Decisions
- **ADR-021 (Metadata Persistence Model):** Designated SQLite as the authoritative store for all domain abstractions (Recipes, Charts, Perspectives, etc.). Strictly forbade the use of DuckDB for metadata CRUD operations.
- **ADR-022 (Project File Format):** Adopted a self-contained directory model (`project_manifest.json`, `metadata.db`, `cache/`, `exports/`, `logs/`). This makes projects highly portable and offline-first by design.

## Executable Foundations (`lightbi-store`)
- Initialized the `crates/lightbi-store` Rust package.
- Leveraged `sqlx` to provide asynchronous SQLite connections and embedded migrations without introducing ORM layers.
- Established the initial `migrations/` folder containing the table definitions for the core domain objects, notably including the `event_log` table crucial for future audit trails and AI explainability.
- Authored the `ProjectStore` Trait. LightBI is project-centric rather than CRUD-centric; thus we replaced fragmented per-entity repositories with a unified `ProjectStore` contract.
