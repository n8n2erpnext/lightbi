# LightBI Phase 21 - Virtual Dataset Runtime & Materialization Foundation

**Date:** 2026-06-01

## New Architectural Decisions
- **ADR-041 (Runtime Virtual Dataset Model)**: Mandated that UI components (Charts, Dashboards) may never consume raw `ResultSets`. They must consume `RuntimeDatasets` which hold lineage and refresh metadata.
- **ADR-042 (Materialization Strategy)**: Established the caching patterns (Memory, Local Disk, Incremental) that will allow LightBI to achieve sub-second dashboard loads without constantly polling source databases.

## Rust Implementation (`lightbi-vdataset-runtime`)
- Created `crates/lightbi-vdataset-runtime` to serve as the bridge between execution and visualization.
- Modeled `RuntimeDataset`, `RefreshStrategy`, and `CacheType`.
- Authored the `DatasetMaterializer` responsible for trapping a transient `ResultSet` and upgrading it into a reusable asset.
- Authored the `RuntimeDatasetRegistry` to govern active analytical assets in memory.

## Extensibility & Persistence
- Authored `migrations/20260601100000_vdataset_runtime_foundation.sql` establishing the SQLite tables: `runtime_datasets`, `dataset_refresh_history`, and `dataset_cache_entries`.
- Merged the `DatasetMaterializer` and `RuntimeDatasetRegistry` cleanly into the `ProjectContext`.
