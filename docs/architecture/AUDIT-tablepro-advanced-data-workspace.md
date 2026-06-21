# TablePro Architecture Audit for LightBI Advanced Mode

**Date:** 2026-06-19  
**Reference:** `references/TablePro` at commit `e84c6bf`  
**Scope:** Architecture and data-processing patterns only. TablePro is AGPL-3.0, so LightBI must not copy implementation code unless the project deliberately accepts the license implications.

## Executive Verdict

TablePro is useful as a reference for the professional data-workspace layer, not for LightBI's semantic understanding engine. Its strongest idea is a strict separation between connection capabilities, query execution, tab-local sessions, compact result buffers, and an incremental native grid.

LightBI should keep its current Simple Mode and understanding pipeline. Advanced Mode should be a separate workspace that consumes the same connector contracts but owns its own query sessions and result buffers.

## Architecture Map

```text
UI workspace / tab
  -> execution gate
  -> query execution coordinator
  -> database manager (explicit connection ID)
  -> driver adapter (capability based)
  -> database plugin/connector

query result
  -> phase 1: columns + typed row matrix -> grid immediately
  -> phase 2: keys + foreign keys + defaults + enum values + row count
  -> tab session registry (large rows remain session-only)
  -> incremental grid updates through deltas
```

## What TablePro Does Well

### 1. Open driver boundary

- Database kinds are open string identifiers rather than a closed enum.
- Drivers expose capabilities such as cancellation, transactions, schemas, procedures, and parameterized queries.
- A plugin adapter translates public plugin types into internal application types.
- Coordinators depend on the internal driver contract, never on a concrete Postgres/MySQL implementation.

This matches LightBI's existing source-capability direction and confirms that Advanced Mode must not grow branches such as `if source === "postgres"` inside UI or planning code.

### 2. Explicit connection sessions

- Every operation resolves a session and driver by connection ID.
- Connection establishment is deduplicated by an in-flight keyed task.
- Query counters prevent background health pings from colliding with active work on a non-thread-safe connection.
- The active database/schema is runtime session state, not merely the saved connection default.

For LightBI, a query tab should carry `connectionId`, `database`, and `schema` explicitly. A global active source is insufficient once tabs can target different systems.

### 3. Two-phase query results

TablePro applies rows immediately, then enriches the result asynchronously with schema metadata, primary keys, foreign keys, enum values, and counts. Metadata work is guarded by a query generation and tab/table identity so stale async results cannot overwrite a newer query.

This is the best pattern to import conceptually:

```text
execute -> first rows -> usable grid
                 \-> metadata/count/profile -> enrich grid and chart controls
```

The first paint must not wait for exact counts or full profiling.

### 4. Compact result representation

Results use:

- one ordered column array;
- one parallel type array;
- a row matrix of typed cell values;
- stable row IDs and an ID-to-index map;
- `ContiguousArray` storage in the native implementation.

This avoids allocating a property map for every row and gives the grid stable positional access. LightBI Advanced Mode should use a transport-neutral matrix contract instead of `Record<string, unknown>[]` as its main result model.

### 5. Session-only large data

Persistent tab metadata and live tab sessions are different objects. Large row buffers are not serialized with the tab snapshot, and inactive tab rows may be evicted and lazily loaded again.

For the web frontend, query rows should live in an external result store keyed by `runId`, not in persisted Zustand state, route state, or large React component props.

### 6. Incremental grid contract

Data mutations produce deltas such as:

- one cell changed;
- multiple cells changed;
- rows inserted/removed;
- columns replaced;
- full replacement.

The grid reloads only affected cells when possible. It also snapshots structural inputs, caches formatted display values by row ID, prewarms cache within a small frame budget, and pauses prewarming during live scrolling.

In LightBI, this maps naturally to a virtualized grid plus an external store with row/cell subscriptions. React should orchestrate the grid, not render thousands of cell components eagerly.

### 7. Bounded execution by default

- User SELECT queries receive a row cap.
- Cancellation invalidates the current generation and asks the driver to cancel when supported.
- Pagination and load-more are source-side operations.
- Fetch-all is explicit and warns about memory cost.
- Approximate counts are accepted before exact counts are available.

Advanced Mode should default to a bounded result window and make full extraction a separate export/materialization workflow.

### 8. Isolated edit tracking

Pending updates, inserts, deletes, modified cells, and undo state are maintained outside the base row buffer with O(1) indexes. SQL generation is delegated to a separate dialect-aware component.

LightBI does not need editable database rows in the first Advanced release. When added, it should be a capability-gated module with optimistic concurrency or key/version checks, not a property mixed into the query grid.

## Limits and Things Not to Copy

- TablePro is a macOS AppKit/SwiftUI application; its native table techniques cannot be transplanted directly into React.
- Its coordinator has accumulated a broad API surface. LightBI should preserve smaller service boundaries rather than reproduce a single large coordinator.
- Some filter SQL is generated as escaped text. LightBI should prefer parameterized query AST compilation wherever the connector supports it.
- Fetch-all still materializes the complete result in memory. That is acceptable as an explicit desktop operation, but LightBI should stream exports and large materializations through the backend or a worker.
- TablePro focuses on database operation, not semantic understanding, business concepts, multi-evidence sampling, or chart recommendation. Those remain LightBI-owned strengths.

## Recommended LightBI Advanced Architecture

```text
AdvancedWorkspace
  QueryTabRegistry
  ConnectionSessionRegistry
  SchemaCatalogService
  QueryExecutionService
  QueryHistoryRepository
  ResultBufferStore
  AdvancedGrid
  ChartWorkbench

ConnectorAdapter
  capabilities()
  execute(request, signal)
  cancel(runId)
  discoverSchema(scope)
  estimateCount(query)
  compileFilter(ast)
```

Suggested core contracts:

```ts
type QueryResultBuffer = {
  runId: string;
  columns: Array<{ id: string; name: string; logicalType: string; nativeType?: string }>;
  rows: CellValue[][];
  rowIds?: string[];
  page: { offset: number; limit: number; hasMore: boolean; estimatedTotal?: number };
  timing: { executeMs: number; transferMs?: number };
  truncated: boolean;
};

type QueryRunState = {
  generation: number;
  status: "idle" | "running" | "partial" | "complete" | "cancelled" | "failed";
  resultRef?: string;
  metadataStatus: "idle" | "loading" | "ready" | "failed";
};
```

## Proposed Delivery Order

1. Build the Advanced workspace shell: connection explorer, query tabs, editor, results grid, and chart panel.
2. Define `QueryResultBuffer`, `QueryRunState`, connector capabilities, execution errors, and cancellation contracts in shared types.
3. Add one read-only Postgres path end to end with row cap, server-side pagination, generation guards, and schema discovery.
4. Add MySQL/MariaDB and SQLite adapters through the same contract; add MongoDB with a capability-aware non-SQL editor mode.
5. Add persistent query history and tab snapshots while keeping result rows session-only.
6. Add phase-2 metadata/profile enrichment and allow the same result buffer to feed both the grid and chart workbench.
7. Add streaming export/materialization. Defer editable rows until read-only execution is stable.

## Acceptance Invariants

- Switching tabs or connections cannot apply stale results to another tab.
- Cancelling a query invalidates its generation even if the driver cannot cancel remotely.
- No default query can return an unbounded in-memory result.
- Grid rendering cost scales with visible cells, not total result rows.
- Exact count and profiling never block the first result paint.
- Connector-specific behavior is selected by capabilities or adapters, not scattered engine-name checks.
- Simple Mode and Advanced Mode share source identity and semantic metadata, but not bulky UI/session state.

## Conclusion

The reference validates the direction already present in LightBI: capability-driven sources and bounded data surfaces. The main architectural addition is a professional query-session layer with compact result buffers, two-phase enrichment, strict cancellation/generation handling, and a virtualized grid. That layer should sit beside the existing understanding experience, not replace it.

## LightBI Parity Progress (2026-06-21)

Implemented independently in LightBI:

- source/schema explorer with table search and a mobile quick switcher;
- query tabs, bounded execution, cancellation, paging, filter/sort, history, favorites, multi-result execution, explain and export;
- one compact result matrix feeding Grid, Chart, JSON, and Structure views;
- result Structure profiling with logical/native type, null count, sampled distinct count, numeric min/max, and example value;
- clipboard CSV and file export without rerunning the query;
- local/online documents through DuckDB plus PostgreSQL, MySQL, MariaDB, SQLite, and MongoDB backend sessions.

Still intentionally separate and not yet implemented:

- source-level row insertion/deletion and persistent writeback;
- capability-gated SQL mutation compilation;
- SQL review plus explicit transaction commit/rollback;
- table/schema DDL editing, ERD, backup/restore, server metrics, and plugin marketplace behavior.

The next safe parity step is an isolated edit session for uniquely identifiable relational rows. File sources should first support a non-destructive transformed copy/export workflow; mutating the user's original browser file is not a valid transaction model.

### Result Edit Session Added

LightBI now has an original result-edit overlay outside the immutable query buffer. A user can edit a visible cell, inspect the changed values in Grid/JSON/Structure, undo, redo, discard, copy, or export the edited bounded page. Pending edits block rerun, sort, filter, paging, and table switching so positional result edits cannot drift onto different rows. This is deliberately not presented as database commit or full-file mutation.

Column visibility is now tab-local and shared by every result surface. Stable column IDs translate projected-grid edits back to original matrix positions, avoiding the common bug where hiding a leading column causes edits to target the wrong source column.
