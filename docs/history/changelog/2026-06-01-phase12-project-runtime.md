# Development Log: Phase 12 - Project Runtime & Workspace Lifecycle

**Date:** 2026-06-01
**Phase:** Phase 12 Project Runtime & Workspace Lifecycle

## Summary
In Phase 12, we formally established the `Project` as the absolute aggregate root of the LightBI application. A project is no longer just a loose collection of SQLite files; it is a governed workspace with strict lifecycle rules.

## Architecture Decisions
- **ADR-024 (Project Lifecycle & Workspace Runtime):** Established the exact states a project can inhabit (`Draft`, `Active`, `Closed`, `Archived`, `Deleted`). Outlined the strict rule that global singleton state is forbidden—all future services (Planner, DuckDB Engine, AI) must receive and execute within an active `ProjectContext`.
- **Project Manifest Contract:** Finalized `project_manifest.json` as a lightweight identity and schema version tracker. Runtime states belong in SQLite, not the manifest.
- **Project Settings:** Added the `project_settings` table to `lightbi-store` migrations specifically for scoped runtime preferences (`timezone`, `locale`, `theme`, etc.).

## Executable Foundations (`lightbi-project`)
- Scaffolded the `crates/lightbi-project` crate.
- Created `ProjectContext`, passing down the `sqlite_pool`, `manifest`, and `project_settings`.
- Established the `ProjectManager` async trait outlining the fundamental operations: `create_project`, `open_project`, `archive_project`, and `.projectbundle` export/import contracts.
- As dictated by the constraints, zero execution logic, AI, or DuckDB components were created in this phase.
