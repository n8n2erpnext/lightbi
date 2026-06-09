# LightBI Phase 13 - Source Registry & Connector Contract Foundation

**Date:** 2026-06-01

## New Architectural Decisions
- **ADR-025 (Source Registry Architecture)**: Mandated that all external systems must be governed by a centralized Source Registry that is owned explicitly by the active `ProjectContext`.
- **ADR-026 (Connector Contract)**: Declared a rigid one-way dependency rule: The core runtime depends on Connector Contracts, but connectors must never depend on the runtime engine.

## Rust Implementation (`lightbi-connectors`)
- Created `crates/lightbi-connectors` to govern data connectivity securely.
- Authored `SourceCapabilities` defining what sources can structurally do (`supports_incremental_refresh`, `supports_sql_execution`, etc.).
- Drafted the `ConnectorContract` trait, containing metadata/schema discovery methods (`test_connection`, `discover_schema`, `list_entities`) while strictly forbidding execution logic.
- Built `SourceRegistry`, removing all global assumptions and allowing connectors to register dynamically.

## SQLite Migrations
- Authored `migrations/20260601020000_source_registry.sql` containing the `sources` tracking table and the `source_settings` table.
- Added strict warnings to never store plain-text credentials in `source_settings`.
