# LightBI Code Map

**Edition:** 0.3 Codebase Baseline
**Initial snapshot:** 2026-08-29
**Code audit completed:** 2026-08-30
**Repository baseline:** `0142e92c75e9fd3e190f82fe2a67cf255180cfca`
**Current VPS working branch:** `codex/beta-recovery-20260801`
**Status:** **Codebase audit baseline complete and later reconciled by Git, CI/CD, and private control-plane audits.** Read the companion maps before treating branch-relative findings as current project-wide truth.

---

## Reading contract

This map answers four separate questions for every important code surface:

1. **Is it reachable from the current production entry point?**
2. **Does it own truth, adapt truth, execute truth, or only present truth?**
3. **Is it committed at the archive baseline HEAD, modified in that dirty worktree, or untracked relative to that branch?** Git-wide truth is reconciled separately in [`LIGHTBI_GIT_HISTORY_MAP.md`](./LIGHTBI_GIT_HISTORY_MAP.md).
4. **What source should be read next when a behavior must be changed safely?**

Do not infer current behavior from filename, age, or file size alone. LightBI retains substantial historical/compatibility code that is not on the current production path.

### Post-0.4 Git reconciliation note

This Code Map was intentionally branch-relative: it audited archive baseline `0142e92` plus that worktree. The later Git audit proved that the public repository was deliberately re-rooted at `b10f8d0`, preserving almost all product source while dropping the internal docs/history corpus. Several files marked dirty/untracked here — including account, updater, Advanced SQL, release-contract, and distribution surfaces — have committed public-main history. Read [`LIGHTBI_GIT_HISTORY_MAP.md`](./LIGHTBI_GIT_HISTORY_MAP.md) before interpreting any “dirty-only” label as project-wide truth.
# Part I — Repository Shape and Runtime Surfaces

## 1. Workspace topology

The repository is a hybrid TypeScript/Rust workspace.

JavaScript/TypeScript workspace roots are declared by [`pnpm-workspace.yaml`](../../pnpm-workspace.yaml):

```text
apps/*
packages/*
```

Rust workspace roots are declared by [`Cargo.toml`](../../Cargo.toml):

```text
crates/*
apps/server
```

The current dirty VPS tree contains roughly 2,200 non-build/non-dependency files. The dominant implementation languages are TypeScript/TSX and Rust; a large additional surface is governed test/evidence JSON rather than product runtime code.
## 2. Major executable surfaces

### Desktop web application

Path: [`apps/desktop`](../../apps/desktop)

Technology: React 19, React Router, TypeScript, Vite, Zustand, ECharts, DuckDB WASM, Monaco, Tauri APIs.

Production browser/native-webview entry point is [`apps/desktop/src/main.tsx`](../../apps/desktop/src/main.tsx), which renders the router rather than `App.tsx`.

### Local core/API

Path: [`apps/server`](../../apps/server)

Technology: Rust, Axum, Tokio, SQLx, MongoDB driver, Tiberius, LightBI workspace crates.

The binary entry point delegates to the server library; the server library owns the Axum router and project/backend state.

### Native shell

Path: [`crates/lightbi-tauri`](../../crates/lightbi-tauri)

Tauri embeds the Axum router in-process and bridges frontend requests through a custom URI scheme rather than requiring a separately installed Node/Rust server.
### Shared TypeScript packages

`packages/*` provide contracts and lightweight shared runtime pieces:

- [`packages/core-types`](../../packages/core-types) — shared dataset/query/release types;
- [`packages/query-models`](../../packages/query-models) — query model contracts;
- [`packages/chart-schema`](../../packages/chart-schema) and [`dashboard-schema`](../../packages/dashboard-schema) — visualization/dashboard contracts;
- [`packages/runtime`](../../packages/runtime) — frontend application runtime/store and coordination;
- [`packages/plugin-sdk`](../../packages/plugin-sdk) — provider plugin contract boundary;
- [`packages/ui`](../../packages/ui) — shared UI package.

### Distribution/control-plane state in the recovery worktree

The dirty VPS worktree contains an **untracked relative to `0142e92`** `apps/distribution/` Node application. Later Git and control-plane reconciliation proved that the implementation was committed publicly, then intentionally removed from public `main`, and migrated to private `n8n2erpnext/lightbi-control-plane`. The local recovery-tree copy is historical/workbench residue and is not current online-service authority.
# Part II — Frontend Production Reachability

## 3. Production entry point and route graph

[`apps/desktop/src/main.tsx`](../../apps/desktop/src/main.tsx) renders `RouterProvider` using [`routes/index.tsx`](../../apps/desktop/src/routes/index.tsx).

Current route graph:

```text
AppLayout
├─ /                → Home
├─ /dashboards      → Dashboards
├─ /dashboards/:id  → DashboardDetail
├─ /charts          → Charts
├─ /datasets        → Datasets
├─ /datasources     → DataSources
├─ /settings        → Settings
├─ /investigation   → Investigation
└─ /advanced        → Advanced
```

When served under `/app`, the router uses `/app` as basename. Otherwise it uses `/`.

`main.tsx` in the dirty worktree also initiates installation pairing and app-usage telemetry for native LightBI. Those dependencies are untracked WIP and therefore are not baseline-HEAD behavior.
## 4. Static reachability warning

A static relative-import walk from `main.tsx` reached 249 production TS/TSX modules out of roughly 312 non-test TS/TSX files.

The unreached set includes genuine legacy/dead-ish code such as [`App.tsx`](../../apps/desktop/src/App.tsx), old Understanding Next orchestration modules, shadow comparison/audit modules, and old presentation components. It also includes some worker/dynamic-import files that a simple import parser cannot prove dead.

Therefore use these labels:

- **reachable** — proven through the static production entry graph;
- **dynamic/worker candidate** — may be loaded through `new Worker`, `new URL`, or dynamic framework behavior;
- **verification-only** — tests/audit harnesses intentionally outside production entry graph;
- **legacy/compatibility** — retained for migration or old contracts;
- **dead candidate** — no production/import evidence yet, but deletion still requires dedicated reachability audit.

Never delete a file solely because this static walk did not reach it.
## 5. Important legacy trap: `App.tsx`

[`apps/desktop/src/App.tsx`](../../apps/desktop/src/App.tsx) still contains the old Milestone-1 demonstration flow: import a sample sales CSV, create a simple chart, and export it.

It is **not rendered by the current `main.tsx` entry point**.

This makes it a strong example of why file existence is not runtime authority. An AI reading `App.tsx` first would reconstruct an obsolete LightBI architecture.

The current product flow starts from `RouterProvider` → `AppLayout` → route pages.

## 6. App shell

[`components/layout/AppLayout.tsx`](../../apps/desktop/src/components/layout/AppLayout.tsx) owns the visible application shell/navigation and consumes shared runtime state.

In the dirty worktree it also imports:

- `useLightBIAccount`;
- `useUpdateStore`;
- app-usage telemetry.

Those integrations are part of dirty 0.9.x work and need Git reconciliation before they can be called committed product behavior.
# Part III — Home / Easy Mode Canonical Path

## 7. `Home.tsx` is orchestration, not semantic authority

[`pages/Home.tsx`](../../apps/desktop/src/pages/Home.tsx) is large because it coordinates intake, session recovery, overlays, canonical artifact construction, multi-source review, perspective selection, and Investigation handoff.

It should not become a second understanding engine.

The current path is approximately:

```text
source intake / inspection
→ retained semantic/sample rows + full-source profile/runtime source
→ canonical source boundary
→ optional source-bound user overlay/evidence
→ buildHomeCanonicalArtifact()
→ canonical consumer artifact
→ canonical presentation + capability ladder
→ selectable governed action
→ runtime-source continuity check
→ canonical Investigation handoff
→ InvestigationSession
```

Home may coordinate these stages and present them, but semantic/grain/metric/runtime authority lives below the page.
## 8. Source boundary and full-file truth

[`home-source-boundary.ts`](../../apps/desktop/src/lib/home-source-boundary.ts) converts inspected local-file evidence into [`canonical-source-boundary.ts`](../../apps/desktop/src/lib/understanding-core/canonical-source-boundary.ts).

The source boundary binds:

- dataset/source identity;
- source fingerprint;
- inspection/profile generations;
- representative semantic sample;
- full-file physical profile;
- full-file semantic/grain understanding;
- runtime file handles required to rematerialize the complete source.

This is the code expression of the project rule **sample evidence is not execution authority**.

[`runtime-dataset-source.ts`](../../apps/desktop/src/lib/runtime-dataset-source.ts) carries the local runtime files and source-binding identity. It deliberately distinguishes `full_file`, `retained_rows`, `semantic_sample`, and `preview` row scopes.

[`runtime-source-continuity.ts`](../../apps/desktop/src/lib/runtime-source-continuity.ts) fails closed when the current runtime source no longer matches the canonical binding. A stale/reloaded session therefore requires source reselection instead of silently running against retained sample rows.
## 9. User mapping/evidence overlay

[`canonical-user-overlay.ts`](../../apps/desktop/src/lib/understanding-core/canonical-user-overlay.ts) is the governed correction layer above raw evidence.

It owns versioned source-bound decisions such as:

- temporary semantic mapping decisions;
- source role declarations;
- document identity declarations;
- reporting period evidence;
- reporting currency evidence;
- inventory snapshot evidence.

Every overlay is bound to source identity/generations. Validation rejects stale or incompatible declarations. Applying an overlay projects a new semantic/evidence view; it does **not mutate the original rows**.

Home rebuilds the canonical artifact after overlay change and marks presentation stale/pending until the new overlay identity has been consumed successfully.
## 10. Canonical consumer artifact is the main Easy-mode truth envelope

[`canonical-consumer-boundary.ts`](../../apps/desktop/src/lib/understanding-core/canonical-consumer-boundary.ts) is one of the most important production files.

For a valid input it constructs:

```text
physical full-file artifact
→ semantic candidate/evidence/resolution
→ optional user overlay projection
→ grain candidate/resolution
→ readiness
→ canonical metric source
→ domain activation
→ governed metric preflight
→ governed question/action generation
→ CanonicalConsumerArtifactV1
```

If a modern `CanonicalSourceBoundaryV1` already exists, it reuses full-file physical/semantic/grain artifacts rather than re-inferring them from sample rows.

The artifact identity binds dataset state, source identity, overlay identity, domain activation, metric preflight and question generation. Failed construction returns an explicit invalid artifact with no question/execution authority.
## 11. Semantic registry and canonical ownership

[`semantic-registry.ts`](../../apps/desktop/src/lib/semantic-registry.ts) owns atomic semantic signal definitions and the runtime taxonomy/dictionary projections.

[`understanding-core/OWNERSHIP.md`](../../apps/desktop/src/lib/understanding-core/OWNERSHIP.md) freezes the intended authority split:

- semantic registry owns atomic vocabulary;
- understanding-core owns canonical dataset understanding;
- domain support manifest owns product support truth;
- adapters translate but must not independently profile/map/score/activate/generate authority;
- UI, AI, execution, charting and export are downstream consumers.

The directory also intentionally retains many **shadow/verification-only migration modules** from Phase 3–5. They are architectural evidence and test assets, not automatically production runtime owners.

`understanding-next` remains primarily a compatibility/downstream layer. Its old independent profiler, detector and orchestrator should not regain semantic authority merely because the files still exist.
# Part IV — Governed Business Analysis Pipeline

## 12. Metric preflight: “recognized” is not “safe to aggregate”

[`governed-metric-preflight.ts`](../../apps/desktop/src/lib/understanding-core/governed-metric-preflight.ts) evaluates governed metric definitions against canonical source evidence.

It checks, among other things:

- source/hash/full-profile integrity;
- semantic requirements;
- grain compatibility;
- exact/atomic measure binding;
- repeated-measure risk;
- governed identity for counts;
- source-bound document identity;
- currency compatibility;
- UOM compatibility;
- inventory snapshot evidence/as-of semantics;
- required readiness capabilities;
- cross-source relationship requirements.

Output state may be `ready`, `conditionally_ready`, `blocked`, `unknown`, `unsupported`, or `not_applicable`. A populated numeric column is never sufficient by itself to authorize SUM/AVG/count semantics.
## 13. Question/action generation: visible lens still does not equal executable action

[`governed-question-action-generator.ts`](../../apps/desktop/src/lib/understanding-core/governed-question-action-generator.ts) combines:

- domain support manifest/activation;
- governed metric preflight;
- semantic dimension bindings;
- time requirements;
- question-family policy.

It creates question candidates and action candidates, then immediately aligns advertised actions with runtime preflight.

This is important: a question can remain useful as explanation even when runtime requirements are not satisfied. Actions that runtime preflight cannot support are removed from the runnable set and the question becomes blocked/explanation-only with structured blockers/remediation.

Default ranking is deterministic and bounded; the current commerce/distribution policy limits default questions rather than hiding the full governed candidate set.
## 14. Runtime preflight is the execution gate

[`governed-runtime-preflight.ts`](../../apps/desktop/src/lib/understanding-core/governed-runtime-preflight.ts) revalidates policy identity and exact canonical bindings before planning.

It rejects stale/mutated action candidates, policy-hash mismatch, unsupported domain/metric combinations, ambiguous/missing physical bindings, unsafe identity/count semantics, invalid time/as-of bindings, currency/UOM mismatch, repeated-measure risk, and unproved relationship requirements.

Only `executable` or explicitly permitted `conditionally_executable` states can proceed.

Even when execution is allowed, the contract deliberately retains restrictions such as `DECISION_USE_PROHIBITED`: successful execution is evidence, not automatic authorization of a business decision.

The code therefore separates **runtime action authorization** from **business decision authority**.
## 15. Query planner owns deterministic SQL shape, not semantic discovery

[`governed-metric-query-planner.ts`](../../apps/desktop/src/lib/understanding-core/governed-metric-query-planner.ts) accepts only a valid governed runtime preflight.

Supported governed operators currently include:

- governed SUM;
- point-in-time snapshot SUM;
- governed average;
- governed distinct identity count;
- governed physical source-row count;
- governed revenue-minus-cost for gross profit.

The planner compiles physical column bindings to DuckDB SQL and structured parameters. It does not infer a new metric or repair missing evidence.

For grouped results it also computes a hidden full-scope metric total (`__lightbi_full_scope_metric_total__`) so the visible top-N/group rows cannot accidentally redefine the total used by evidence/BA layers.
## 16. Local DuckDB execution boundary

[`governed-local-duckdb-boundary.ts`](../../apps/desktop/src/lib/understanding-core/governed-local-duckdb-boundary.ts) adapts a governed query plan into [`local-duckdb-executor.ts`](../../apps/desktop/src/lib/local-duckdb-executor.ts).

The local executor initializes DuckDB WASM, materializes either:

- the complete bound runtime source; or
- controlled retained rows when no full runtime source exists for non-governed/legacy use.

For governed production execution, callers pass the runtime source and expected binding. The file is re-materialized locally, loaded as `__LIGHTBI_PREVIEW_TABLE__`, and queried inside the browser/native webview process.

Execution returns explicit scope and actual materialized row count. [`governed-metric-executor.ts`](../../apps/desktop/src/lib/understanding-core/governed-metric-executor.ts) refuses to call full-file execution successful unless expected source row count and full-file evidence match.

This is the current code-level enforcement behind “Real source → real full-file local DuckDB → governed result”.
# Part V — Multi-Source and Period Analysis

## 17. Canonical multi-source boundary

[`canonical-multisource-boundary.ts`](../../apps/desktop/src/lib/understanding-core/canonical-multisource-boundary.ts) keeps member sources distinct and records explicit source roles/evidence.

Current source-role vocabulary includes sales, accounting, logistics, inventory snapshot, inventory movement, and unknown/other.

The current governed production relationship code has an explicit Sales↔Accounting approval path using source-bound document/period/currency evidence. It produces relationship states such as confirmed, conditional, ambiguous, rejected, insufficient-evidence, and stale.

A canonical multi-source dataset therefore contains:

- ordered source memberships;
- each member's canonical source/artifact/runtime source;
- governed relationship artifacts;
- analyses with required source IDs and a metric source;
- dataset identity tied to source membership/evidence.

It does not flatten all source files into an ungoverned table.
## 18. Multi-source execution

[`governed-multisource-duckdb-boundary.ts`](../../apps/desktop/src/lib/understanding-core/governed-multisource-duckdb-boundary.ts) validates the multi-source artifact/handoff, materializes every required member source against its source binding, and preserves source-role/period/currency/row-count lineage.

The key design is still conservative: a multi-source relationship can establish that a governed business analysis is valid across a logical dataset while the actual metric may execute from one designated metric source. Relationship evidence authorizes the scope; it does not automatically authorize arbitrary cross-source measure joins.

Home can also build period-partition workspaces for multiple source periods. These are canonical member artifacts, not a filename-driven month merge.

## 19. Current multi-source restriction to preserve

Do not generalize the existing Sales↔Accounting Gross Profit path into “LightBI may join any two files on similarly named columns.” New multi-source business capabilities require explicit relationship policy, source-role evidence, metric semantics, runtime tests, and negative probes.
# Part VI — Investigation and BA Readout

## 20. Investigation session is a handoff envelope, not canonical truth storage

[`investigation-session.ts`](../../apps/desktop/src/lib/investigation-session.ts) stores the currently selected action, runtime intent/plan, rows, AI briefing, runtime source, source scope, canonical handoff, multi-source dataset, execution results and an in-memory Easy workspace snapshot.

The store is currently module-level in-memory state. It helps navigation continuity but canonical validity must still be rechecked against current artifact/source identities.

The comment saying “we aren't using a real backend or persistent DB yet” is historically imprecise for the whole product: workspace sessions do have backend persistence elsewhere. Treat this module comment as local implementation commentary, not global architecture truth.

## 21. `Investigation.tsx` revalidates before execution

[`pages/Investigation.tsx`](../../apps/desktop/src/pages/Investigation.tsx) validates canonical handoff freshness, full-file source availability, multi-source handoff identity and runtime binding before running governed execution.
When validation passes, Investigation builds a governed execution request from the already-planned handoff and executes either:

```text
single source
→ executeGovernedMetricRequest()
→ createGovernedLocalDuckDBBoundary()
```

or:

```text
multi source
→ executeCanonicalMultiSourceMetric()
→ governed metric result
```

The resulting `canonicalExecutionResult` retains metric/action/query-plan identity, evidence, limitations, restrictions, full-file row count and source fingerprint. UI readouts consume this result rather than recomputing the metric independently.

If execution returns an empty result or result validation rejects it, Investigation converts the apparent success into an explicit failed state rather than rendering a misleading chart.
## 22. BA and chart layers are downstream consumers

Investigation passes governed execution context into BA/readout components including the BA decision engine, deep-analysis panels and chart model/renderer.

The relevant rule is not “BA code may infer anything useful.” It must preserve the selected action's governed metric, source scope, evidence, restrictions and full-file proof.

Important downstream files include:

- [`ba-decision-engine.ts`](../../apps/desktop/src/lib/ba-decision-engine.ts) — structured BA brief generation;
- [`business-brain-brief.ts`](../../apps/desktop/src/lib/business-brain-brief.ts) — Business Brain KPI/variance/root-cause/risk/recommendation/evidence model;
- [`ba-comparison-engine.ts`](../../apps/desktop/src/lib/ba-comparison-engine.ts) — period/comparison analysis;
- [`chart-preview-model.ts`](../../apps/desktop/src/lib/chart-preview-model.ts) — result-to-chart model projection;
- [`ChartPreviewRenderer.tsx`](../../apps/desktop/src/components/analysis/ChartPreviewRenderer.tsx) — ECharts presentation;
- Investigation deep-analysis/drill-through components — interactive evidence-bound follow-up.

These modules are powerful downstream analytics, but canonical source/metric/runtime authority remains upstream.
# Part VII — Advanced Mode

## 23. Advanced is a production route, not a side experiment

[`pages/Advanced.tsx`](../../apps/desktop/src/pages/Advanced.tsx) is reachable from `/advanced` and is the current technical workspace for file/database users.

Its page component is orchestration. Provider I/O is delegated to [`advanced-api.ts`](../../apps/desktop/src/lib/advanced-api.ts), workspace state/helpers, edit-session hooks, file-session code, and the Rust server.

The dirty VPS working tree currently extends this area substantially beyond baseline HEAD. Therefore exact feature breadth must be reconciled with Git history before it is called committed product truth.

Current working-tree provider coverage in the Rust backend includes PostgreSQL, MySQL/MariaDB, SQLite, MongoDB, and SQL Server. Capabilities are not symmetric: for example MongoDB uses the document-query path, and some mutation/script operations are deliberately unavailable for MongoDB or SQL Server.

Advanced is therefore a provider-capability workspace, not one universal SQL abstraction pretending every backend behaves identically.

## 24. Advanced → Easy handoff must re-enter the canonical boundary

[`advanced-result-handoff.ts`](../../apps/desktop/src/lib/advanced-result-handoff.ts) is the critical boundary. It does not hand arbitrary query rows directly to BA code.

It rebuilds a canonical consumer artifact, prepares a canonical Investigation handoff, and refuses selection overrides that would substitute a different metric/operator/action from the governed one.

[`useAdvancedResultTransferActions.ts`](../../apps/desktop/src/hooks/useAdvancedResultTransferActions.ts) only opens an Advanced result in Easy/Investigation when the result is classified as complete. Partial/truncated results remain display/export material, not full-source decision authority.

`returnFullSourceToEasy()` additionally blocks while edits are pending, refreshes the selected table/source in pages, materializes continuity, then feeds that complete post-edit source back through the same canonical handoff.

This preserves a core architectural invariant:

```text
Advanced technical freedom
→ complete source materialization
→ canonical understanding/governance
→ Investigation
```

Advanced does not get a private semantic backdoor.

## 25. Advanced persistence is real and split between durable metadata and ephemeral runtime state

The Rust server stores Advanced history, favorites, connection profiles, and workspace sessions in `metadata.db` through [`advanced_workspace.rs`](../../apps/server/src/advanced_workspace.rs).

Connection profile secrets are encrypted before persistence; the encryption key is stored separately by the server-side vault-key path.

By contrast, active connection sessions, schema/count caches, run handles, import jobs and export jobs live in the in-process `AdvancedState` and are runtime state rather than durable workspace truth.

This distinction matters when restarting the embedded core:

- saved profiles/history/favorites/sessions can survive;
- active database handles, running jobs and caches do not.

The frontend also keeps presentation/editor state such as Advanced tabs in browser storage. That state is convenience state and must not be confused with server metadata authority or canonical semantic truth.

# Part VIII — Rust/Axum Core and Persistence

## 26. `apps/server` is the local API/core boundary

[`apps/server/src/lib.rs`](../../apps/server/src/lib.rs) owns `build_router()` and can run as a normal Axum HTTP server or be embedded directly inside the Tauri process.

Its route families currently cover:

- health and project/current-source/source-file operations;
- chart/export/question/preview execution;
- online CSV/Excel acquisition;
- provider-plugin discovery;
- Advanced connection/schema/query/mutation/script/import/export operations;
- Advanced history/favorites/profiles;
- saved project workspace sessions.

The server constructs a `ProjectContext`, registers the DuckDB runtime backend, and shares this state across the Axum router. It is therefore broader than “just the Advanced database API”.

## 27. `LIGHTBI_DATA_DIR` defines the durable local project boundary

The server resolves its project root from `LIGHTBI_DATA_DIR`; without it, development falls back to a temporary `lightbi-project-1` directory.

Inside that root the current server creates at least:

```text
metadata.db
files/
work/
```

Uploaded/saved source files are copied into `files/` under generated file IDs. Temporary exports and other generated work artifacts use `work/`.

In the native Tauri shell, setup resolves the OS application-data directory, creates it, sets `LIGHTBI_DATA_DIR`, and only then builds the embedded Axum router. Packaged native persistence therefore follows the OS app-data location rather than the repository or current working directory.

## 28. `lightbi-store` is an architectural persistence foundation, not the sole live persistence owner

[`crates/lightbi-store`](../../crates/lightbi-store) defines SQLite initialization/migrations and a unified `ProjectStore` trait. [`lightbi-project`](../../crates/lightbi-project) depends on it.

However, the current Axum server also owns a `SqlitePool` directly in `ProjectContext`, and Advanced workspace persistence performs direct SQL against that pool.

The `ProjectStore` trait itself still contains skeletal placeholder domain types (`Project`, `Recipe`, `Dashboard`, `EventLog`). Therefore an AI must not read the historical persistence ADR and conclude that every current persistence operation flows through a mature `ProjectStore` implementation.

Current code truth is mixed:

```text
persistence architecture foundation → lightbi-store
live project/server SQLite pool       → ProjectContext
Advanced durable records             → advanced_workspace direct SQL
source-file bytes                     → project files/ directory
```

Git-history reconciliation must explain how this split evolved.

# Part IX — Native Shell

## 29. Tauri embeds the Axum router in-process

[`crates/lightbi-tauri/src/main.rs`](../../crates/lightbi-tauri/src/main.rs) is the compiled Cargo entry point.

It creates a Tokio runtime, calls `lightbi_server::build_router()`, and stores the resulting Axum `Router` inside `EmbeddedCore`. A custom `lightbi` URI protocol forwards WebView requests directly into that router with `tower::ServiceExt::oneshot()`.

On Windows, WebView2 maps the custom scheme to `http://lightbi.localhost`; on other supported native paths the API base is `lightbi://localhost`. [`api-base.ts`](../../apps/desktop/src/lib/api-base.ts) contains the corresponding frontend detection/fallback logic.

This means the packaged architecture is not:

```text
Tauri UI → separately spawned localhost server
```

but rather:

```text
Tauri WebView → custom protocol → embedded Axum router → local core
```

The standalone port-5172 server used on the VPS is a development/demo deployment shape, not the only product runtime shape.

## 30. Native command authority is smaller than the dirty WIP suggests

The compiled `src/main.rs` currently registers only the baseline native commands around runtime configuration, Beta license state, and embedded-backend readiness.

The dirty working tree also contains **untracked** `crates/lightbi-tauri/main.rs` with proposed commands for OS-keyring account-session storage and SHA-256-verified update installation.

Cargo does not point at that root-level file; by convention it compiles `src/main.rs`. Therefore those untracked commands are **not currently wired into the native binary**.

This creates an important transitional mismatch: dirty frontend files such as `account-api.ts` and `update-store.ts` can invoke command names that the compiled native entry point does not yet register.

Do not describe native account-token vaulting or automatic installer execution as completed runtime capability until Git/code integration moves those commands into the compiled entry point and tests the path.

**Post-Git reconciliation:** this statement is true for the audited recovery worktree snapshot, but not for public-main history as a whole. Public commits `a9d30ca` and `a9d97cd` later modify tracked `crates/lightbi-tauri/src/main.rs` for account/update integration and staged update behavior. Use the public tag/commit being audited before deciding whether native wiring is complete.

## 31. Tauri packaging configuration is Windows-Beta oriented

[`tauri.conf.json`](../../crates/lightbi-tauri/tauri.conf.json) currently identifies LightBI as `digital.thaiduy.lightbi`, targets NSIS packaging, and uses the desktop Vite build as `frontendDist`.

The bundle still carries MinGW runtime DLL resources for Windows packaging. The configuration has no active `externalBin` declaration; the embedded Axum core is compiled into the Tauri binary through the Rust dependency on `lightbi-server`.

The `beforeBuildCommand` still runs `prepare-native-sidecar.mjs --runtime-only` before the frontend build. That build-step history must be examined during Git/CI audit rather than assumed to mean a runtime sidecar is currently launched.

Current code evidence therefore favors **embedded core runtime** with some packaging/build lineage still visible from earlier sidecar work.

# Part X — Dirty-Only Distribution, Account, Telemetry, and Update Work

## 32. The dirty frontend has already become coupled to untracked control-plane files

The current VPS working tree modifies tracked production entry files such as `main.tsx`, `AppLayout.tsx`, `Settings.tsx`, and `Advanced.tsx` while importing several completely untracked modules:

```text
apps/desktop/src/lib/distribution-pairing.ts
apps/desktop/src/lib/account-api.ts
apps/desktop/src/hooks/useLightBIAccount.ts
apps/desktop/src/lib/app-usage-telemetry.ts
apps/desktop/src/stores/update-store.ts
packages/core-types/src/release.ts
apps/distribution/
```

So this is not merely dormant scratch code: parts of the dirty frontend production graph reference it. Relative to baseline HEAD `0142e92`, these modules are working-tree additions.

**Post-Git reconciliation:** several of these same surfaces are repository-tracked on the deliberately re-rooted public `main`: Advanced SQL in `70d671c`, release contracts in `872194d`, account/native updater in `a9d30ca`, and staged updater work in `a9d97cd`. `apps/distribution/` was also tracked publicly before being intentionally removed by the Phase 0–1 control-plane split. Branch-relative dirty state must not be promoted into a project-wide provenance claim.

## 33. Current dirty license/account code is transitional relative to the 1.0 trust design

`distribution-pairing.ts` generates a browser-stored installation ID, pairs it with the distribution service, writes `lightbi-license-tier` to localStorage, and still exposes direct license-key activation.

`account-api.ts` is a newer layer: it models an authenticated account, entitlement and devices, supports native device-login flow, email/Google auth, key redemption, device revocation, and attempts to store native session tokens through Tauri commands.

These two layers coexist in the dirty tree. That coexistence is a migration signal, not a final trust architecture.

The imported 1.0 design explicitly says Pro authority must not reduce to a reusable key or localStorage tier. Therefore:

- localStorage tier is UI/cache state at best;
- account + trusted installation + entitlement is the intended authority direction;
- control-plane reconciliation confirms `/api/license/activate` and key-redemption are current-Beta transitional flows, not frozen 1.0 Pro authority.

Code existence here must not override the stronger design freeze without explicit reconciliation.

## 34. Dirty telemetry is native-only and consent-gated, but installation identity is still browser-generated

`app-usage-telemetry.ts` only sends app events when running in native LightBI and when anonymous pairing is enabled. It records app-open/app-close/feature-use and update lifecycle events against installation/session identifiers.

`main.tsx` starts pairing and telemetry only for native runtime. `AppLayout.tsx` additionally records feature-surface usage as routes change.

This is privacy-safer than unconditional browser telemetry, but the installation identifier currently originates from browser storage rather than the future device-key/certificate model described for 1.0.

Treat this as **Beta operational telemetry WIP**, not final attestation or device identity.

## 35. Dirty updater implements manifest check + SHA verification, but not yet the frozen 1.0 lifecycle

`update-store.ts` fetches `/api/releases/latest`, validates the `lightbi.release.v1` shape, selects the Windows x86_64 artifact, compares versions, and exposes an explicit install action.

The untracked proposed native command downloads over HTTPS, computes SHA-256, writes through a `.partial` file, renames to a verified installer path, starts the Windows installer and exits the app.

That is useful integrity work, but it is not yet the full frozen lifecycle:

```text
detect → download → verify → stage → READY → explicit Update & Restart
```

The current dirty UI asks for explicit confirmation before invoking install, yet the native proposal performs download and installer launch in one command and is not compiled into `src/main.rs` anyway.

For the recovery-worktree snapshot alone, classify this updater copy as **partially integrated relative to that branch baseline**.

**Post-Git reconciliation:** public `main` later contains committed staged-updater work at `a9d97cd` and release preparation at `5884595`; `v0.9.2-beta.7` peels to `28e2aae`. CI/CD audit is still required to prove the exact build/publication behavior of those commits.

## 36. `apps/distribution` is a real running control-plane implementation, but untracked in this LightBI tree

The dirty VPS tree contains an untracked Node application at `apps/distribution/` (path annotation only; it is absent from this clean docs worktree baseline).

Its `server.mjs` currently exposes release discovery, account auth, device-login, installation pairing, telemetry/app events, download tracking, license activation/redeem, checkout/Stripe webhook, admin auth/stats/revenue/licenses/accounts, and static distribution UI.

It uses local SQLite plus optional PostgreSQL/Redis-backed helpers and mail integrations. Port defaults to `5174`, matching the current VPS distribution service.

This code is substantial enough to be operational, but its location here must not be confused with repository ownership. The project already has a dedicated control-plane repository; later reconciliation must decide which copy/commit is authoritative and which is deployment/workbench residue.

Git reconciliation confirms that public `apps/distribution/` history existed and was then deliberately removed from current public `main` during Phase 0–1. The local untracked directory is not byte-identical to the last pre-cutover public snapshot, so the separate control-plane audit is still required before assigning current ownership.

# Part XI — Legacy, Compatibility, and Reachability Classification

## 37. “Not statically reachable” does not automatically mean dead

The earlier static import walk found 249 production TS/TSX modules reachable from `main.tsx` out of the then-scanned production set, with 64 not reached by that simple walk.

That result is a triage tool only. Worker entry points, dynamic imports, test harnesses, compatibility adapters and build-time modules can legitimately sit outside the main static graph.

Use four classifications instead of one “dead code” bucket:

1. **production authority/reachable** — participates in current user runtime;
2. **production compatibility/projection** — adapts canonical truth into older contracts/UI shapes;
3. **verification-only/historical harness** — retained because tests/audits replay old behavior;
4. **orphan candidate** — no current route/import/test/build consumer found and safe only after Git/CI audit.

Deletion requires proving category 4, not merely failing a static walk.

## 38. Known examples

- `App.tsx` is a strong legacy/orphan candidate: production `main.tsx` renders `RouterProvider`, not `App`.
- `pages/ChartBuilder.tsx` has no route or other TS/TSX consumer on current public `main` either; retain the classification **orphan candidate**, but deletion still requires a scoped code-change review.
- old `semantic-fields.ts` / `semantic-tag-registry.ts` and `relationship-discovery.ts` are largely test/legacy surfaces rather than current semantic authority.
- `understanding-next` must **not** be deleted wholesale: current Home/presentation code still consumes its contracts/adapters. Canonical core projects into this shape through adapters such as `canonical-consumer-presentation-adapter.ts` and `understanding-core/next-adapter.ts`.
- `legacy-observation-harness`, legacy/canonical comparison modules, paired replay, shadow sidecar and related Phase-5 modules are verification/history machinery. They can be outside production reachability while still protecting migration evidence.

This is why filenames such as `legacy`, `next`, `shadow`, or `adapter` cannot be used as deletion instructions.

# Part XII — Test and Evidence Topology

## 39. Verification density is unusually high and is part of the architecture

Current working-tree inventory measured:

```text
523  desktop TS/TSX source files
211  Vitest test files under apps/desktop/src
25   Playwright *.spec.ts files under apps/desktop
84   Rust source files across crates + apps/server/src
24   Rust #[test]/#[tokio::test] attributes
354  docs/architecture machine-evidence JSON files
```

A prior exact-path audit found at least **129 of those 354 architecture JSON files directly consumed by tests/scripts**. This is why documentation cleanup froze their paths.

LightBI's phase closures are therefore not merely prose archives: a significant subset of the evidence corpus participates in executable governance/regression checks.

## 40. Test layers protect different kinds of truth

Vitest covers semantic contracts, canonical boundaries, adapters, UI logic, phase gates and regression behavior. Playwright covers browser/user-flow evidence. Rust tests cover backend/runtime/storage/provider behavior. Architecture JSON provides frozen inputs/expected evidence for many phase-specific checks.

These layers answer different questions:

```text
unit/contract test passes      ≠ production route is reachable
browser flow passes            ≠ native packaging path is correct
Rust handler test passes       ≠ frontend calls it correctly
historical replay passes       ≠ legacy module should be production authority
machine evidence is consumed   ≠ file may be freely moved
```

The later CI audit is complete in [`LIGHTBI_CI_CD_MAP.md`](./LIGHTBI_CI_CD_MAP.md): current public CI runs a bounded selected suite rather than the entire archive verification surface. This Code Map establishes where the broader surfaces live and what they protect.

# Part XIII — Authority Map for Future Changes

## 41. Where to start when changing behavior

| Change intent | Start reading here | Authority warning |
|---|---|---|
| semantic recognition | `semantic-registry.ts` + understanding-core | old semantic registries are not authority |
| source/sample/full-file handling | canonical source boundary + Home intake | never promote sample evidence to aggregate authority |
| metric/action availability | governed metric/runtime preflight | visible metric ≠ executable metric |
| generated SQL for governed BA | governed metric query planner | planner may not invent semantics |
| Investigation execution | Investigation + governed executor + DuckDB boundary | handoff must be revalidated |
| multi-source BA | canonical multi-source boundary/executor | relationship scope ≠ arbitrary join authority |
| Advanced DB/file workspace | Advanced page/hooks + advanced API + Rust `advanced.rs` | provider capabilities differ |
| Advanced → Easy | advanced result handoff | must rebuild canonical truth from complete source |
| persistent workspace metadata | server `ProjectContext` + `advanced_workspace.rs` | `ProjectStore` is not yet sole live owner |
| native API routing | Tauri `src/main.rs` + `api-base.ts` | recovery snapshot differs from later public-main account/update wiring |
| account/license/update | public-main commits + recovery-local divergence + dedicated control-plane repo | not final 1.0 trust authority |
| release/distribution UI | private `lightbi-control-plane` main | local recovery copy is historical/workbench residue |
## 42. Current VPS deployment shape is operational context, not architectural authority

At this audit checkpoint the VPS intentionally runs host processes rather than Dockerized LightBI services:

```text
5172  LightBI API/backend
5173  LightBI live demo / Vite frontend
5174  distribution web/control plane
```

These ports explain the current demo/development environment. They must not be baked into product architecture assumptions: native Tauri uses the embedded router, and future deployment/containerization can change host topology without changing canonical product truth.

## 43. Working-tree state is materially ahead of baseline HEAD

At the 2026-08-30 continuation audit, the original LightBI worktree contains **78 tracked dirty paths and 36 untracked paths**.

Several high-impact areas are among those changes: Advanced frontend/backend, app shell, Settings, native shell configuration, account/update/telemetry modules, release types, and the entire local distribution application.

Therefore this map intentionally carries two truths at once:

- **baseline repository truth** anchored at `0142e92...`;
- **current VPS implementation evidence** observed in the dirty `codex/beta-recovery-20260801` worktree.

Git-history reconciliation is now complete in [`LIGHTBI_GIT_HISTORY_MAP.md`](./LIGHTBI_GIT_HISTORY_MAP.md). It proves that some recovery-dirty paths correspond to later public-main commits, while other local files/directories diverge from or are absent on current `main`. Dirty-state findings here remain branch-relative implementation evidence; the Git map supplies merge/release provenance.


**Post-audit companions:** [`LIGHTBI_GIT_HISTORY_MAP.md`](./LIGHTBI_GIT_HISTORY_MAP.md), [`LIGHTBI_CI_CD_MAP.md`](./LIGHTBI_CI_CD_MAP.md), and [`LIGHTBI_CONTROL_PLANE_MAP.md`](./LIGHTBI_CONTROL_PLANE_MAP.md) complete the branch/release/deployment provenance needed to interpret this code snapshot.

## 44. Post-Truth durability checkpoint: persisted analysis identity is metadata, not authority

Feature-branch commit `326d991a8f305fef938e9aab47897dd233146770` adds `analysis-session-identity.ts` and integrates `AnalysisSessionIdentityV1` with the existing workspace-session persistence path. The identity can carry the current `AnalysisWorkbookPlanV1` / `DecisionVisualizationPlanV1` identity plus single-source canonical source anchors or multi-source dataset/relationship/membership anchors.

The authority boundary is explicit: persisted identity carries no execution authority and requires current-source revalidation. `useHomeWorkspaceSessions` clears the transient analysis-export plan when opening/switching sessions; Home autosave does not manufacture identity from a potentially stale global export plan. Investigation is the durable-identity producer only after it has the current governed execution, current decision-visualization plan, and current canonical dataset in one lifecycle.

This closes a continuity gap without turning `workspace_sessions` into canonical truth storage. Restore may recover identity/history metadata, but current governed execution and decision-use authorization must still be re-established from current source truth.

The broader historical Vitest universe is currently not a clean public-main gate. A full run on the feature branch was baseline-red largely because sanitized public history no longer contains many archive-era `docs/architecture/*.json` artifacts consumed by old tests. Representative detached-head comparison at `999dc75` reproduced the same selected failure identities before this durability change. Future changes must therefore distinguish current selected release regressions from archive/governance replay debt instead of treating the full historical suite as one undifferentiated pass/fail signal.

## 45. NEXT generation identity is build/runtime provenance, not data authority

The successor manifest/diagnostics foundation entered at `ef2434ac01ec6a817f4a04f58d16ef41c447b9dc`; the current Internal Core successor head is `d96011bfe2d3deca8424eac15f6d3e7d39cf7a97`, paired with private CP `f1879c65453cdf0bc9798257e462264f0424e907` in NEXT-015. Early lineage through `b1b4027` added the internal gateway, governed Excel perspective identity and its UAT regression; later code-map sections record the additional feature/refactor and source-continuity heads through NEXT-012. `LightBIGenerationManifestV1` binds parent generation, core/source/control-plane commits, CP schema target, app/test-pack version, trust state and internal infrastructure scopes.

This metadata answers **which successor code is intended to run**. It does not grant semantic, entitlement or execution authority. Canonical data/analysis truth continues to come from the existing governed source/execution boundaries, and `AnalysisSessionIdentityV1` remains revalidation-only metadata.

Internal desktop diagnostics cross-check the manifest against core health and the private NEXT control plane. A control-plane generation/commit mismatch marks the backend unhealthy rather than silently accepting a different generation. Runtime verification must also distinguish the worktree HEAD from the actually built/running artifacts: on 2026-08-30 the internal Core process was already running from a binary whose mtime predates `a875098`/`b1b4027`, and the latest ordinary desktop gate build removed the internal `lightbi-generation.json` from the served `dist` directory. Latest source HEAD alone is therefore insufficient evidence that the running internal stack is the accepted successor generation.


## 46. NEXT modularization topology and source-size gate

At Core NEXT `a8ebc27c9d4284665855d7a0a0150c629e44f86e`, oversized production owners were decomposed without changing route or semantic authority. `apps/server/src/lib.rs` is now a small composition root; source/online/preview/analysis handlers live in focused sibling modules. `apps/server/src/advanced.rs` is a facade plus shared contracts/tests, with connection, schema, query filters/runners/values, mutation, scripts, import jobs and export jobs owned by `apps/server/src/advanced/`.

Frontend page ownership follows the same rule. `Home.tsx` delegates canonical multi-source build orchestration and presentation derivation; `Investigation.tsx` delegates persistence and chart/dashboard actions; `HomeWorkspaceView.tsx` delegates source-understanding/presentation helpers. The question-fit engine is split into shared constructors, business-lens construction and the main generator. The understanding-core question engine is a facade over shared signal context plus ordered primary/secondary candidate builders. Business Brain separates analysis from guidance; BA decision separates insight/scoring analysis from brief orchestration. These splits do **not** create new analytical authorities.

The repository-wide executable guard is `scripts/check-source-module-size.mjs`, exposed as `pnpm test:source-module-size` and run by public CI. It checks production `.ts/.tsx/.rs` modules, excludes test/spec corpus, warns at 800 lines and fails above 1,000. At the current NEXT-015 checkpoint it scans 471 production modules with zero violations. A future AI must not add an allowlist or `part1/part2` style split merely to bypass this gate; an exception requires explicit owner approval and a documented architectural reason.


## 47. Fresh NEXT runtime proof topology

The exact post-refactor build `g-2026-08-30-next-002` has a verified temporary Internal runtime topology: gateway/web `5373` proxies the exact Core artifact on `5372` and the exact CP `c251fb1` API on `5374`. The served generation manifest is byte-identical to the immutable generated artifact (SHA-256 `57783e4c370271da5e5b0f16b00405504f56367b2b66a19a24c51fe71a365912`) and pins Core `a8ebc27...`, CP `c251fb1...`, parent `bootstrap-current-8d59d05f575373e6`, and schema `061_integrations_delivery`.

These `537x` ports are not product architecture and must not replace the existing rule that ports are deployment context. They exist because the automation safety boundary would not terminate the predecessor `527x` Internal processes. The fresh Core binary is independently proven by SHA-256 `0c9d37ae54b874e85ff3ad2ce792875a318e72c32146ad9e340383d5831d3d60`. The remaining runtime blocker is cross-generation worker identity: CP `next-002` sees the still-running predecessor worker heartbeat from `next-001`. UAT may not begin until the worker generation matches.
## 48. Internal bug-test routing after NEXT-002 cutover

The canonical Internal web entrypoint is again `5273`, but its current routing is deliberately explicit: `5273 -> fresh Core 5372` for `/api/*` and `5273 -> fresh CP 5374` for `/distribution-api/*`. Static assets and the generation manifest are the `g-2026-08-30-next-002` build. Direct predecessor listeners `5272`/`5274` are therefore not in the user-facing execution path used for current bug testing. This proxy topology is operational context only and must not become a product architecture assumption.


## 49. Perspective Deep BA and selected-data Step 2 are separate UI scopes

At Core NEXT `eadba8fdf07b04bbdbd674518422713fefb68009`, Investigation no longer represents Deep BA with a loose boolean plus a retained optional drill scope. The page owns one discriminated view state: `perspective` or `selected_data`. The main perspective `Analyze deeper` action always opens the full selected perspective context; chart drill-through `Deep analysis of selected data` opens only the explicitly selected-row scope. Closing either view clears the active view, so a Step 2 scope cannot leak into a later perspective Deep BA invocation.

This is a UI/context ownership invariant, not a new analytical authority. Selected-data Step 2 continues to recalculate through the existing BA framework over its selected rows, while perspective Deep BA continues to consume the governed perspective result. Regression coverage executes the exact sequence `chart drill -> selected-data Step 2 -> close -> perspective Deep BA` and requires the final view to have no filtered Step 2 scope.


## 50. Supporting analyses are drillable with per-chart runtime ownership

At Core NEXT `1ecf36e959d3a9aa5af2e1f800b0ac0bb3f7b020`, the supporting charts inside Investigation are no longer presentation-only. Both time-series and categorical supporting analyses reuse the same source-row drill-through, selection/filter/export panel and selected-data Deep BA Step 2 workflow as the primary chart. This does **not** make the supporting cards a second analytical authority.

Each rendered chart carries an explicit drill origin containing its own `AnalysisAction`, the exact prepared `RuntimePlanPreview` used to produce that chart, and its `ChartPreviewModel`. `useInvestigationDrillThrough.ts` owns the transient drill execution/result/selection lifecycle. The page passes the primary chart's origin to the primary renderer and each supporting chart's own origin to its renderer. A supporting click must never be executed with the primary perspective runtime plan merely because both charts share `ChartPreviewRenderer`.

Selected-data Step 2 also retains that origin. Its title/action/chart context therefore follows the supporting analysis that was clicked, while the perspective Deep BA workflow remains independent under the `perspective | selected_data` scope invariant established at `eadba8f`. The extraction reduced `Investigation.tsx` to 933 lines and keeps the new hook at roughly 101 lines rather than growing the page back toward the 1,000-line gate.

Regression coverage clicks both a supporting line chart (`Money over time`) and supporting bar chart (`Activity volume by item`), asserts that each call reaches `executeDrillThrough` with its own runtime-plan identity, and verifies that selected-data Deep BA opens under the matching supporting action. Focused Investigation/DeepAnalysis verification passes 2 files / 21 tests; the selected governed CI regression remains 11 files / 39 tests; desktop build and the 465-module source-size gate pass.


## 51. Native Excel Pivot is a presentation adapter over canonical truth

At Core NEXT `1292fd71209dcfeb6d23c9b4a618d5ff081f7714`, native Pivot export has three explicit owners. `clean-data-handoff.ts` exposes `createCleanDataHandoffFromCanonicalBoundary(...)`, which rematerializes the verified `CanonicalSourceBoundaryV1.runtimeSource` instead of treating Investigation sample/result rows as full source. `excel-pivot-export.ts` owns the versioned export contract, scope selection, perspective recipe resolution, safe aggregation policy, workbook metadata and save flow. `excel-pivot-ooxml.ts` owns only OOXML packaging for `LightBI_Data`, PivotTable and PivotCache parts.

The authority flow is `canonical runtime source -> clean handoff + lineage -> AnalysisAction/DecisionVisualizationPlan + governed metric policy -> Pivot recipe -> OOXML presentation`. Recognition or an action-level aggregation hint cannot override governed semi-additive/non-additive semantics. The writer supports native `SUM` and `COUNT` presets; unsupported calculations fail closed or are omitted from the default recipe. All cleaned source fields still enter the cache so Excel can replace the primary row field, add dimensions, or otherwise reshape the Pivot after export.

`InvestigationDeepAnalysis.tsx` owns only the dropdown interaction and progress/error display. `Full cleaned data + Pivot` requires a canonical source boundary and ignores transient chart selection when constructing its source. `Current selection + Pivot` is enabled only when selected drill-through rows exist, cleans those selected rows through the same lineage mapping, and records applied filters in `About`. `Investigation.tsx` passes the existing canonical source boundary and dataset label into this presentation surface; no export-specific data authority is created in the page.

The native writer intentionally remains small: SheetJS constructs the ordinary workbook and the existing `fflate` dependency is made direct so the adapter can add standards-based package relationships and cache records. The accepted zero-column spike proved that a Pivot can begin with only row fields plus one value field; native PivotChart, calculated fields and multi-value preset generation are not claimed by v1. The hard Excel capacity is 1,048,575 data rows and overflow is rejected before cloning/export allocation.

Runtime proof for `g-2026-08-31-next-005` returns the canonical Internal topology to `5273 -> Core 5272` and `5273 -> CP 5274`. The served manifest is real JSON and pins exact Core/CP identities; CP and worker diagnostics match `next-005`, so the former cross-generation worker blocker is closed. Ports remain deployment context rather than analytical architecture.


## 52. Advanced SQL completion is a context resolver, not an editor-owned rule pile

At Core `6d895de57ca42ae0ac530424416bfc2cd741e65e`, `apps/desktop/src/components/advanced/AdvancedSqlEditor.tsx` only adapts Monaco completion requests into LightBI completion items. `apps/desktop/src/lib/advanced-sql-completion.ts` owns SQL cursor context, source/alias discovery, table/column ranking, deduplication and suppression. Existing `apps/desktop/src/lib/advanced-sql-suggestions.ts` remains the dialect-neutral keyword/function/snippet catalog.

The resolver may inspect the whole current SQL document to discover sources that appear after the cursor, but it derives replacement prefix and clause context only from text before the cursor. `alias.` is source-bound and must never return columns from unrelated tables. Multi-source unqualified contexts emit alias-qualified inserts to avoid ambiguity. Schema snapshots are consumed per completion request, so a refreshed workspace cannot retain stale tables. String/comment positions return no completion items. Schema-derived suggestions preserve the existing capability gate; this feature changes IDE quality, not product entitlement authority.

## 53. Advanced/Easy round-trip source authority

At Core `ecfff03fe7924fe5d7477f10df61b26b31cd9258`, the Advanced/Easy boundary distinguishes navigation continuity from result derivation. `advanced-source-store.ts` may retain `easyReturnDataset` with a source and owns `activateAdvancedSourceForEasyDataset(...)`, which activates only an exact source ID that actually exists. `Home.tsx` invokes that authority before `Open Advanced`, so a source registered later by Investigation cannot become the Easy dataset merely because it is newer or currently active.

`useAdvancedResultTransferActions.ts` owns the semantic split. `Return to Easy` for an inherited local source requests the preserved Easy dataset and navigates home without rerunning `SELECT *`, creating a new Investigation session, or changing dataset identity. `Analyze result in Simple` remains the explicit path for turning a complete Advanced query result into a derived canonical source. Database/post-commit return may also rematerialize the complete table and re-enter canonical intake because the source itself has actually changed.

Investigation is still allowed to register its result rows as a separate Advanced workspace source for intentional result exploration. That registration is presentation/workspace convenience, not canonical-source promotion. When the user enters Advanced from the Easy dataset header, the exact Easy source wins. This preserves the larger invariant: navigation state, recency and editor selection do not grant source authority.

## 54. Investigation sources are supplementary unless explicitly activated

Core `92906b1a91b283d248b9a7eb911265a8126498b9` extends the Advanced-source authority rule beyond Home's `Open Advanced` button. `Investigation.tsx` may register the current result rows as an Advanced workspace source, but that registration uses the store's non-activating path. The source remains discoverable for intentional result exploration while the already-active canonical Easy source keeps CURRENT authority. Normal canonical intake/restore registration still activates by default.

`fcefeb0d3c3a3c0d36f618d77c9cd654e8635a6d` adds a component-level Investigation regression for this exact ordering. The invariant is therefore owned at both store and component boundaries: registration availability and active-source authority are separate concepts. Sidebar navigation to Advanced can no longer turn a newer Investigation result into the canonical source merely because no Home-specific activation handler ran.

## 55. Governed multi-table collections preserve one Easy continuity envelope

Core `d82bdb625b69755af51f42c01e2a35fe00731c28` makes `canonical_perspective_collection` a first-class Advanced/Easy continuity source. `home-canonical-multisource-build.ts` constructs the Easy `readyDataset` before registering the Advanced collection, stores an explicit `advancedSourceId` on that dataset, and attaches the identical object to the Advanced source as `easyReturnDataset`. The explicit source ID is required because the user-facing Easy dataset label (`executive overview analysis`) is not the same identity string as the Advanced collection source (`canonical_perspective_collection:executive_overview`).

`advanced-source-store.ts` owns `getAdvancedEasyReturnDataset(...)` and `canReturnAdvancedSourceToEasy(...)`. The latter allows a multi-table source to expose `Return to Easy` when a valid continuity envelope exists; table count is no longer treated as a proxy for authority. `activateAdvancedSourceForEasyDataset(...)` prefers an explicit source ID and refuses to activate an ID that is not registered.

`useAdvancedResultTransferActions.ts` continues to distinguish continuity from derivation. For a six-table governed collection carrying an Easy snapshot, Return consumes that snapshot and navigates home without querying, materializing, merging or creating a synthetic Investigation dataset. All six source files, their roles/periods and governed relationship remain represented by the restored collection object. Reopening Advanced resolves the same collection source and six DuckDB tables. This is navigation/workspace continuity only; canonical multi-source analytical authority still resides in the existing collection, relationship and governed execution contracts.


## 56. NEXT-013 recovery, demo, documentation, and routing owners

Core `00e6d89c9465fd75bd72a824f48dabbdc83495b6` adds no second semantic engine. `home-demo-scenarios.ts` owns only deterministic synthetic teaching-file construction and scenario metadata; `Home.tsx` remains orchestration and sends those files through the same local intake/canonical understanding path as ordinary files. Demo suppression in the workspace-session hook prevents built-in teaching files from becoming persisted user-session authority.

`account-api.ts` now owns the runtime-specific fetch credential mode: browser account calls may carry HttpOnly session cookies, while native account calls use Bearer/vault state and omit browser credentials. This is a transport/security distinction only; entitlement/account authority remains in the control plane. `project-source-file-api.ts` remains the durable full-source recovery adapter, and its native regression freezes the Windows embedded-Core origin instead of introducing a native-only persistence model.

Internal gateway routing is owned by `scripts/internal-gateway-routing.mjs` plus `run-internal-gateway.mjs`. The helper deliberately recognizes only `/docs*` and `/distribution-assets/*` as public CP surfaces. `/distribution-api/*` is handled separately as the desktop API proxy; `/api/*` remains Core; `/distribution` is deliberately not a CP mount. Ports are still deployment context rather than product architecture.

Private CP now advances through `497ffbf9592faddefec72280a4ddd244efab648c` and `f1879c65453cdf0bc9798257e462264f0424e907`. Documentation remains owned by `src/domains/documentation/schema.ts` and `documentation-service.ts`, while `server.ts` remains composition/routing. TypeScript under `src/web/app.ts`, `src/web/docs.ts` and `src/web/hero-demo.ts` is the editable web source; `public/app.js`, `public/docs.js` and `public/hero-demo.js` are compiled outputs. The content model remains schema-backed by `062_documentation_content`; public fallback content is read-only and admin CRUD remains under existing admin authority.

Current source-size governance scans 471 production modules with zero hard-limit violations. These additions therefore preserve the anti-bloat rule established during NEXT modularization.


## 57. Distribution first-paint ownership for secondary routes

CP `f1879c65453cdf0bc9798257e462264f0424e907` closes a browser-only routing presentation gap without creating new route authority. `public/index.html` is still the common static shell, but a synchronous `<head>` guard classifies only `/docs`, `/docs/*`, `/account` and `/admin` before `<body>` is parsed. While that marker exists, CSS suppresses only the distribution homepage's direct `.nav`, `#top` and footer children. The module router in `src/web/app.ts` / compiled `public/app.js` still decides which Docs, Account or Admin renderer executes and replaces the body normally.

This boundary exists specifically because serving a full homepage body and then awaiting route-specific API work allowed one browser frame of incorrect Home content to paint. The guard is therefore a first-paint presentation contract, not a navigation-delay hack, redirect, second SPA router, authentication authority or SEO authority. `server.test.mjs` freezes the requirement that the guard occurs before `<body>` for Docs index/detail, Admin and Account. Headless Chromium additionally samples visibility every animation frame and requires the homepage hero never to become visible on Docs, Account, Admin or Admin Accounts navigation.

NEXT-015 runtime identity is Core `d96011b...`, CP `f1879c6...`, schema 062, manifest SHA-256 `110d7503bed7b93a849a9e453fa82bb9fc4be7be4aad30670fb69e04f719e97a`; CP full tests are 128/128 and the selected Core gates remain 11/39 plus 3/10 demo/session regressions.
