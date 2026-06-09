# Development Log: Phase 3 - Runtime Foundation

**Date:** 2026-06-01
**Phase:** Phase 3 Application Runtime Foundation

## Summary
Introduced the Application Runtime layer to bridge the React UI and the Domain Model. Established the `@lightbi/runtime` package utilizing Zustand to manage application state (active project, workspace preferences). Refactored all UI components to fetch mock data from the central runtime store rather than maintaining isolated local state.

## Files Created / Modified
- **Created**: `docs/adr/ADR-004-application-runtime.md`
- **Created**: `docs/architecture/runtime-model.md`
- **Created**: `packages/runtime` (including `package.json`, `src/types.ts`, `src/store.ts`, `src/index.ts`)
- **Modified**: `apps/desktop/src/components/layout/AppLayout.tsx` (Migrated sidebar state to runtime store)
- **Modified**: UI Pages (`Dashboards.tsx`, `DashboardBuilder.tsx`, `Charts.tsx`, `ChartBuilder.tsx`, `Datasets.tsx`, `DataSources.tsx`)
- **Deleted**: `apps/desktop/src/store/index.ts` (Replaced by `@lightbi/runtime`)

## Architecture Decisions
- **ADR-004**: Established the Application Runtime layer to decouple React from Domain State. React is now strictly a presenter, and Runtime owns the state. `packages/runtime` is explicitly documented as a UI Runtime Store / Frontend Runtime Adapter that delegates durable state to the Rust core.

## Known Limitations
- The project loader uses mock data injected into the runtime state.
- No actual database connections, DuckDB execution, SQLite persistence, or Tauri IPC logic are implemented yet.
- The Runtime package does NOT contain data processing or persistence logic, which is exclusively reserved for the Rust core.
