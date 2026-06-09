# LightBI Phase 14 - Dataset Model & Virtual Dataset Foundation

**Date:** 2026-06-01

## New Architectural Decisions
- **ADR-027 (Dataset Architecture)**: Declared the Dataset as the fundamental bridge between the Source Registry and the Recipe Runtime. Future execution engines MUST operate on Datasets, NEVER directly on Sources.
- **ADR-028 (Virtual Dataset Model)**: Ensured that Datasets are, by default, virtual constructs. To preserve the lightweight, local-first promise, creating a dataset is instantaneous metadata compilation, not a massive data-duplication pipeline.

## Rust Implementation (`lightbi-dataset`)
- Created `crates/lightbi-dataset` to safely encapsulate dataset governance.
- Authored the core data types in `model.rs`: `SourceDataset`, `VirtualDataset`, `DerivedDataset`.
- Authored the `DatasetLineage` struct to provide programmatic tracking of `source_references` and `parent_dataset_id`, ensuring the Planner can construct valid dependency trees without guesswork.
- Created `DatasetRegistry` in `registry.rs` to act as the in-memory locator for active datasets inside a project.

## SQLite Migrations
- Authored `migrations/20260601030000_dataset_foundation.sql`.
- Overrode the generic `datasets` table with the new explicit schema.
- Added `dataset_dependencies` and `dataset_source_links` to track lineage structurally in SQL.

## Context Integration
- Exported the `DatasetRegistry` into `lightbi-project::context::ProjectContext`. Datasets are therefore fiercely bound to their parent projects, banning global data catalog anti-patterns.
