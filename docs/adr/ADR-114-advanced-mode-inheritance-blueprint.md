# ADR-114: Advanced Mode Inherits the Shared Data Platform

**Date:** 2026-06-19  
**Status:** Accepted; Phase B foundation implemented

## Decision

Advanced Mode will not create an independent connector or execution stack. It will be a professional workspace over the same source identity, connection sessions, schema catalog, execution lifecycle, and result buffers used by Simple Mode.

TablePro informs architecture and lifecycle. JiveDB public documentation informs product invariants and connector QA. LightBI implementation remains original and preserves its semantic-understanding advantage.

## Current LightBI Assets to Inherit

| Existing asset | Shared use |
|---|---|
| `SourceInspectionResult` accessible gate | Both modes only operate on validated sources |
| semantic sampling and understanding core | Simple uses it directly; Advanced may request an understanding/profile for a selected table or result |
| `SourceCapabilities` | Planner and UI feature availability |
| Rust `SourceRegistry` / `ConnectorContract` | Connector discovery and capability ownership |
| Rust `SchemaRegistry` / semantic registry | Cached structural and semantic metadata |
| Rust `ExecutionBackend::ResultSet` | Already column definitions plus row matrix |
| TypeScript `QueryResultBuffer` | Browser-neutral result transport and grid input |
| `ExecutionRunCoordinator` | Generation, cancellation, stale-result protection |
| display preferences and chart renderer | Shared formatting and result visualization |
| result validation contracts | Simple analysis validation; reusable for Advanced chart mappings |

## Current Gaps to Correct

The existing `/api/database/inspect` path is a prototype, not the Advanced foundation:

- it hardcodes engine branches in `apps/server/src/main.rs`;
- it bypasses `SourceRegistry` and registers only CSV in the project context;
- it opens a new one-connection pool per inspection request;
- it accepts a raw connection URI on every request instead of a connection/session ID;
- Postgres and MySQL values are cast to text, losing native type fidelity;
- `rows_count` is the number of sampled rows, not the table count;
- it has no schema tree, query execution API, server cancellation, or session lifecycle;
- MongoDB `Int64` can cross into JavaScript as an unsafe number;
- TypeScript and Rust capability models have drifted and must be generated from or mapped to one canonical contract.

## Target Architecture

```text
Simple Mode                         Advanced Workspace
  understanding/profile              connection explorer
  suggested analysis                 query tabs/editor
  summary/chart/table                 result grid/chart
            \                         /
             Shared frontend runtime
               ExecutionRunCoordinator
               QueryRunState
               ResultBufferStore
               QueryResultBuffer
                         |
                  Interactive Query API
                         |
                    Execution Gate
             read-only policy / limits / timeout
                         |
              ConnectionSessionRegistry
                 |              |
          SchemaCatalog     Connector adapters
                 |       PG / MySQL / MariaDB /
                 |       SQLite / MongoDB
                 |
          SourceRegistry + ProjectContext
```

## Backend Ownership

### Connector contract

Owns source-specific behavior:

- connection validation and session creation;
- capabilities and dialect;
- database/schema/entity discovery;
- column, key, relationship, and native-type metadata;
- bounded query execution and cancellation;
- safe identifier quoting and parameter binding.

Connectors must not own chart logic, semantic business rules, or UI state.

### Query execution service

The only service allowed to invoke connector execution. It owns:

- authorization and read-only/write policy;
- statement classification;
- row cap, timeout, and cancellation token;
- explicit `connectionId`, database, schema, and tab/run identity;
- conversion from connector output to the standard matrix `ResultSet`;
- sequential multi-statement behavior;
- execution telemetry and history.

The service keeps the connector from bypassing the planner/policy boundary while still supporting explicit user-authored queries.

### Schema catalog

Evolves the existing `SchemaRegistry` with:

- cache keys by connection/database/schema/entity;
- keyed in-flight task deduplication;
- generation/invalidation tokens;
- targeted invalidation after DDL;
- estimate-first/exact-count-later metadata;
- best-effort parallel loading tolerant of inaccessible databases/schemas.

### Connection session registry

Project-scoped, never global. It owns:

- live pools/clients by `connectionId`;
- selected database/schema as tab context, not connection default;
- health checks that do not collide with active non-thread-safe sessions;
- cleanup of sessions, schema cache, tabs, and runs;
- SQLite serialized access, WAL policy, and clean close;
- future TLS/mTLS/SSH configuration without exposing secrets to query payloads.

## Result Contract

Rust `ResultSet` and TypeScript `QueryResultBuffer` should become one serialized contract:

- ordered columns with logical and native type;
- row matrix rather than per-row maps;
- optional stable row IDs;
- page offset/limit/has-more and estimated total;
- execution timing, source, truncation, and warnings;
- precision-sensitive numeric values serialized losslessly as strings plus native type metadata.

Simple Mode may project matrix rows into named objects at the semantic/UI boundary. Advanced Grid consumes the matrix directly.

## Frontend Ownership

### Shared

- query run lifecycle and cancellation;
- result-buffer store keyed by `runId`;
- formatting preferences;
- chart model input;
- source/connection identity;
- errors, warnings, truncation, and execution scope.

### Simple-only

- representative semantic sampling;
- business concepts, entities, workflow, readiness, opportunities;
- guided analysis and opinionated summary/chart experience.

### Advanced-only

- connection and schema explorer;
- SQL/non-SQL editor tabs;
- virtualized matrix grid;
- query history/favorites;
- explicit filter/sort/pagination controls;
- result-set tabs and optional query plan view.

Advanced-specific state references shared result buffers. It does not duplicate rows into persisted React/Zustand state.

## Delivery Phases

### Phase A: Platform convergence

1. Define one canonical connector capability and result schema across Rust/TypeScript.
2. Add `ConnectionSessionRegistry` and typed connection IDs.
3. Move Postgres inspection behind a real registered connector.
4. Add schema/entity discovery and estimate/exact count phases.
5. Route Simple database inspection through the new platform without changing its UI.

This proves inheritance before Advanced UI begins.

### Phase B: Advanced read-only Postgres

1. Add Advanced route/workspace shell.
2. Add connection explorer, database/schema context, query tabs, and editor.
3. Add read-only execution gate, row cap, timeout, and cancellation.
4. Feed matrix results into a virtualized grid and existing chart renderer.
5. Add query history and session-only result eviction.

### Phase C: Additional engines

1. MySQL and MariaDB through one dialect family with separate capability profiles.
2. SQLite with serialized session and WAL/close safety.
3. MongoDB with a non-SQL editor/request model and nested-value renderer.
4. Original deterministic acceptance fixtures for types, schemas, relationships, partitions, TLS/mTLS, and SSH.

### Deferred

- row editing/writeback;
- DDL authoring;
- unrestricted multi-statement execution;
- Redis;
- ERD editing.

These features have larger safety and state implications and are not required to establish a professional analytics workspace.

## Acceptance Invariants

- Simple database intake and Advanced queries resolve the same connector/session contracts.
- No engine-name branching exists in frontend planning or workspace components.
- Every query is bound to an explicit connection/database/schema context.
- Starting or cancelling a run invalidates every stale result and metadata task.
- First rows do not wait for exact counts or deep schema metadata.
- Default execution is bounded and read-only.
- Result values preserve native type and numeric precision.
- Grid cost scales with visible cells and current page, not source table size.
- Closing a connection releases pools, cancels runs, and clears only related schema/results/tabs.
- Advanced Mode can request LightBI understanding for any selected table/result without copying the execution stack.

## Phase B Foundation Implemented (2026-06-19)

- Added project-process-scoped PostgreSQL connection sessions; credentials remain inside SQLx pools and are never returned to the browser.
- Added schema discovery with table/view kind, columns, native types, nullability, and estimate-first row counts from `pg_class.reltuples`.
- Added a read-only query service accepting only `SELECT`/`WITH`, enforcing a 1,000-row hard cap, a 15-second PostgreSQL statement timeout, and a database `READ ONLY` transaction.
- Added run cancellation through server task abort plus shared frontend `ExecutionRunCoordinator` generation guards.
- Standardized Advanced transport on ordered typed columns plus row matrices. PostgreSQL `INT8` and `NUMERIC` cross the JSON boundary as strings.
- Added `/advanced` with connection session form, schema explorer, SQL editor, bounded run/cancel controls, windowed result grid, and chart projection from the same `QueryResultBuffer`.
- Routed browser API traffic through the same-origin `/api` reverse proxy, so the backend does not need to expose port 5172 over NetBird.

At the first foundation checkpoint, tabs/history, paging/filter/sort, exact counts, connector convergence, and additional engines remained deferred. The next section records the workspace lifecycle slice completed afterward.

## Phase B Workspace Lifecycle Implemented (2026-06-19)

- Query tabs now own lightweight editor/context/layout state while each result matrix remains session-only and is evicted when its tab closes.
- Every tab has an independent `ExecutionRunCoordinator`, active run ID, page, sort, error, warning, grid/chart view, and result reference.
- Persisted tab state is capped at 12 tabs and 100 KB SQL per tab; result rows and credentials never enter local storage.
- Query history is bounded to 100 browser-local entries and records success, failure, row count, database, and execution duration without duplicating result buffers.
- PostgreSQL execution supports bounded outer-query paging and native server-side sorting. Sort columns must exist in described result metadata before an identifier is emitted.
- Schema explorer exposes columns, native types, and nullability; selecting a table creates or reuses a table-bound query tab.
- Closing a connection aborts every run owned by that connection before closing its pool. Browser `pagehide` sends best-effort session cleanup.
- The shared app shell collapses to a 48px icon rail on mobile; the Advanced explorer is hidden at small widths and its result grid scrolls internally without page overflow.

Still deferred: project-backed history/favorites, multi-result execution, query plans/export, additional engines, and migration of Simple database intake onto the session platform. Bound filters, schema caching, and lazy exact counts are recorded below.

## Phase B Filter and Catalog Performance Implemented (2026-06-19)

- PostgreSQL result filtering is server-side and parameterized. Operators are limited to contains, equals, starts-with, and ends-with; filter columns must exist in described result metadata before an identifier is emitted.
- Query paging, sorting, and filtering share the same bounded outer-query execution path. Filter values, limit, and offset are SQLx bind parameters.
- A query accepts at most five filters and rejects oversized values, unknown columns, and unsupported operators before execution.
- Schema catalogs use a 60-second per-connection cache with keyed refresh locks, preventing duplicate concurrent discovery while retaining explicit refresh.
- Exact table counts are lazy: expanding a base table requests its count on demand. Counts use a read-only transaction, a five-second timeout, and a five-minute cache; LightBI never launches an unbounded all-table count sweep.
- Disconnecting a session removes its schema cache, count cache, and refresh lock alongside the connection pool.

## Phase B/C Workspace Completion Implemented (2026-06-20)

- Query history and favorites moved from browser-only storage into the project metadata SQLite database. History is capped at 200 entries; result matrices and credentials are never persisted with it.
- Added bounded multi-statement execution in the client: at most five read-only statements are parsed with quote/comment awareness and executed into independent result tabs.
- Added PostgreSQL `EXPLAIN (FORMAT JSON)` under a read-only transaction and statement timeout. Plans render in a dedicated workspace view.
- Added CSV export from the current result buffer. Export does not rerun SQL and prefixes spreadsheet-formula cells before RFC-style quoting.
- Generalized connection sessions to PostgreSQL, MySQL/MariaDB, SQLite, and MongoDB. SQL adapters share result, paging, filter, sort, timeout, count, cache, cancellation, and lifecycle contracts; MongoDB uses an explicit collection/filter/projection/sort document request.
- Simple database intake now opens the same Advanced session, catalog, query, count, and close lifecycle. The old `/api/database/inspect` route is no longer registered.
- Project metadata now uses `/tmp/lightbi-project-1/metadata.db` instead of an in-memory SQLite database.
- Added encrypted connection profiles. URLs are encrypted with AES-256-GCM; the key is stored separately with mode `0600`, and API responses expose only non-secret metadata.
- TLS profile policy is applied to stored driver URLs. SSH host/user/port are retained as connection-profile metadata; LightBI intentionally does not spawn an unmanaged SSH process or persist SSH private keys. Deployments provide an approved tunnel endpoint when required.

Live acceptance passed against Docker PostgreSQL, Docker MySQL, SQLite, MongoDB Atlas, and ERPNext MariaDB in LXD. The MariaDB test used a temporary LXD proxy because production MariaDB listens on loopback; the proxy was removed immediately afterward.

## Unified Document Sources Implemented (2026-06-21)

Advanced Mode is a source-neutral analytical workspace, not a database-only screen. Simple Mode remains the owner of source preflight, bounded representative sampling, profiling, and semantic understanding. After a local file or online workbook is accepted, Simple publishes a session-only descriptor containing the original `File`, tables/sheets, row counts, columns, profiles, and sample provenance.

Advanced consumes that descriptor without uploading or profiling the source again. A document adapter materializes each CSV/Excel sheet into a quoted DuckDB view; the existing explorer, tabs, read-only SQL editor, bounded result matrix, paging, validated filter/sort, grid, chart, history, favorites, multi-result execution, and CSV export are reused unchanged. Database connectors continue through backend sessions. This follows TablePro's document/source-adapter separation as an architectural reference only; no TablePro AGPL code was copied.

### 2026-06-21 Source Commit Vertical Slice

SQLite direct-table results now support capability-gated source commit through the existing immutable result-edit overlay. The schema contract supplies primary-key and writable-base-table metadata; a tab keeps base-table identity only until the user edits its SQL. The browser sends key values, changed values, and expected originals to a provider adapter. The server validates the request, compiles parameterized SQL, previews placeholders only, and executes all row updates in one transaction. Every statement must affect exactly one row or the entire batch rolls back with an optimistic-concurrency conflict.

The contract is intentionally provider-neutral, but only the SQLite adapter is enabled in this slice. PostgreSQL and MySQL/MariaDB discovery already emit key/write metadata; their binding and transaction adapters require independent acceptance before enablement. MongoDB, arbitrary SQL results, local files, and online sheets remain non-writable. This preserves the source-capability boundary instead of making editability an unchecked grid property.

### 2026-06-26 SQL Source Commit Adapter Expansion

PostgreSQL, MySQL, and MariaDB now use the same source-commit contract as SQLite for direct base-table tabs. Each adapter compiles quoted, parameterized `UPDATE` statements server-side, previews only redacted placeholder SQL, validates the requested table/key/changed columns/expected originals, executes the batch in one transaction, and rolls back on any stale-row or affected-row mismatch.

PostgreSQL adds a conservative scalar type-cast allowlist so bound values are cast explicitly without opening arbitrary type-name SQL. MySQL and MariaDB bind scalar JSON values and rely on the engine's native coercion. MongoDB, arbitrary SQL results, local files, and online sheets remain non-writable source targets; those paths should continue toward transformed copy/export flows rather than in-place mutation.

The descriptor store is intentionally memory-only because browser `File` handles and downloaded Microsoft 365/Google Sheet payloads must not be serialized. Refreshing the page requires selecting the source again. Queries remain read-only (`SELECT`/`WITH`) and capped at 1,000 rows per page.

Acceptance covered a 41K-row local workbook handoff, a smaller multi-sheet workbook query, a live Microsoft 365 workbook with 1,644 rows, and a CSV query/chart at a 390x844 viewport with no horizontal page overflow.
