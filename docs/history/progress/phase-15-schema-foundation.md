# LightBI Phase 15 - Schema Discovery & Semantic Model Foundation

**Date:** 2026-06-01

## New Architectural Decisions
- **ADR-029 (Schema Discovery Architecture)**: Mandated that Datasets own their Schema. This ensures that a Virtual Dataset's shape is structurally guaranteed, eliminating the need to query physical sources to deduce column types.
- **ADR-030 (Semantic Model Foundation)**: Banned the system from inferring business logic from raw column names. Established semantic fields (`Dimensions`) and semantic measures (`Aggregations`) as a first-class abstraction.

## Rust Implementation (`lightbi-schema`)
- Created `crates/lightbi-schema` separating meaning and structure from execution.
- Modeled `ColumnMetadata` and `RelationshipMetadata`.
- Modeled `SemanticField` and `SemanticMeasure`.
- Authored the `SchemaRegistry` and `SemanticRegistry` ensuring schemas are looked up safely inside the active memory rather than triggering database operations mid-execution.

## Extensibility & Persistence
- Expanded `ConnectorContract` in `lightbi-connectors` to include `discover_columns()` and `discover_relationships()`.
- Authored `migrations/20260601040000_schema_foundation.sql` mapping `schemas`, `columns`, `relationships`, `semantic_fields`, and `semantic_measures` tables to the SQLite metadata store.
- Re-wired `ProjectContext` to hold the newly established `SchemaRegistry` and `SemanticRegistry`.
