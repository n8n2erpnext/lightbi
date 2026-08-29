# LightBI Post-Beta AI Handoff — 2026-08-13

This is the fast-entry document for the next AI session. Read this file first,
then inspect the named production files before changing code. Historical ADRs
and recovery checkpoints are context, not automatically current authority.

## Repository state

- Working branch: `codex/beta-recovery-20260801`
- Current tested HEAD: `7ec4b32` (`feat: enrich evidence-bound deep BA`)
- Alignment fix commit: `f607cd6` (`fix: align BA and dashboard with selected analysis`)
- Pre-change rollback ref: `origin/backup/pre-ba-dashboard-alignment-20260813`
- Rollback commit: `56d35fceb996505d72a6831e5e93639c04562d9f`
- `origin/main` at recovery start: `7813c80`
- `origin/storage` at recovery start: `522c019`
- `storage` is a historical Phase-6B ancestor, not the active peer branch.

Do not remove the pre-existing untracked ZIP, PID/log, or `releases/` artifacts.
They are user-owned and were deliberately excluded from all commits.

## Product invariants

1. Home understands and selects; Investigation validates and executes.
2. Canonical source identity, fingerprint, profile generation, grain guards and
   runtime-source continuity must remain fail-closed.
3. The selected perspective/question/action is the authority for dimension,
   measure and aggregation. BA, chart and dashboard must not infer a different
   angle from filenames, generic domain defaults or fuzzy substrings.
4. Full-source governed execution and representative sampled BA context are
   separate evidence scopes and must be labelled separately.
5. Back navigation must preserve the imported source and current workspace.
6. Drill-through must keep physical source columns, composable filters,
   selected rows and safe CSV/XLSX export.
7. The Create Dashboard CTA is visible in the live Deep Analysis UI but must
   never be inside the PNG/PDF capture surface.
8. Do not build Windows until web tests and the production web build pass.

## Current production path

```text
Home.tsx
  -> inspectLocalFile / canonical source boundary
  -> canonical consumer artifact + capability ladder
  -> selected perspective/action
  -> investigation-session.ts
Investigation.tsx
  -> canonical handoff + runtime continuity validation
  -> governed DuckDB execution
  -> chart-preview-model.ts
  -> BADecisionBrief (executed result)
  -> SingleSourceBAOverview (bounded representative context)
  -> Deep Analysis / perspective dashboard
```

Primary files to read before touching this flow:

- `apps/desktop/src/pages/Home.tsx`
- `apps/desktop/src/lib/canonical-consumer-boundary.ts`
- `apps/desktop/src/lib/perspective-analysis-bundle.ts`
- `apps/desktop/src/lib/investigation-session.ts`
- `apps/desktop/src/pages/Investigation.tsx`
- `apps/desktop/src/lib/single-source-ba-overview.ts`
- `apps/desktop/src/components/investigation/InvestigationDeepAnalysis.tsx`
- `apps/desktop/src/pages/DashboardBuilder.tsx`
- `packages/runtime/src/store.ts`

## Bug fixed after Beta Recovery

### Root cause

`single-source-ba-overview.ts` reconstructed intent downstream with regex and
broad substring matching. Its Operations branch always led with delivery count
and used delivery fee/stock for breakdowns and trends. Its Commercial branch
always used revenue. A selected cargo-weight, volume, quantity or other measure
could therefore execute correctly in the primary chart while Deep BA and the
dashboard described a different metric.

### Fix in `f607cd6`

- Physical action binding now prefers exact physical-column matches and exact
  or qualified canonical suffix matches; arbitrary substring matching was
  removed.
- Operations and Commercial BA now bind the selected physical measure,
  dimensions and `SUM`/`AVG`/`COUNT` aggregation before domain defaults.
- Selected measure drives the first KPI, breakdowns, trends, value kind and
  findings. Domain-wide KPIs remain secondary context only.
- Resolved selected bindings and the action contract are serialized into
  dashboard metadata.
- Sample-derived BA cards are no longer falsely marked as governed full-source
  results; their evidence scope is explicit.
- Dashboard charts preserve money versus number formatting.
- Deep Analysis CTA was moved outside `deep-analysis-export-surface` and the
  CTA/dashboard chrome was returned to the neutral UI baseline.
- The stale Vietnamese E2E assertion was updated to the catalog value
  `Bảng điều khiển theo góc nhìn có quản trị`.

### Deep BA enrichment in `7ec4b32`

- Deep Analysis now exposes the selected physical measure and dimensions so a
  reviewer can verify the scope before reading conclusions.
- Existing evidence is presented more fully: largest-group concentration,
  observed time coverage, IQR outlier count and the lowest ranked groups that
  warrant inspection.
- These diagnostics reuse computed BA artifacts and source evidence. They do
  not add causal claims, new semantic inference or ungoverned metrics.
- New copy is catalogued in Vietnamese and passes static language coverage.

## Tests added and gates passed

New contract cases:

- Operations cargo weight by route: selected KPI, route breakdown and time
  trend all use Weight, not delivery fee/count.
- Commercial quantity by product: selected KPI, product breakdown and trend
  all use Quantity, not revenue.
- Deep Analysis CTA remains visible but is outside the export capture surface.

Verified on the VPS at `f607cd6`:

- Focused new/existing BA + export-boundary tests: `13/13` passed.
- Perspective, Investigation, dashboard and drill regression tests: `33/33`
  passed.
- Complete desktop unit suite after alignment: `202` files, `1,345/1,345`
  tests passed.
- Complete desktop unit suite after Deep BA enrichment: `203` files,
  `1,346/1,346` tests passed.
- Desktop production build: TypeScript and Vite build passed.
- Playwright: `enterprise_dashboard.spec.ts` and
  `drill_and_export_acceptance.spec.ts`: `2/2` passed.
- Playwright enterprise dashboard was run again after Deep BA enrichment:
  `1/1` passed.

Expected non-failing stderr remains in deliberate negative tests (executor
failure, corrupt XLSX sibling, unavailable localStorage). Existing build
warnings remain for the broad Tailwind content pattern and large JS chunks.
No Windows installer was built in this change.

## Known boundaries and remaining risks

- Single-source specialized BA still uses at most 1,000 representative rows;
  the primary canonical metric execution remains full-source.
- Dashboards/charts live in the in-memory Zustand runtime store and disappear
  on reload; persistence is not implemented.
- The Easy database intake path is sampled and does not yet provide the same
  full-file runtime source binding as local/online file intake.
- Broad typed analysis-contract ownership should eventually move into a shared
  core type. The current commit serializes and consumes the contract safely at
  the Investigation/BA/dashboard boundary without changing canonical runtime.
- `understanding-core/OWNERSHIP.md`, ADR-119, ADR-122 and parts of the older Beta
  recovery map contain known drift. Verify claims against imports and current
  call sites before relying on them.
- Do not hand-edit generated render bindings, Tauri schemas, build output or
  ignored reference repositories.

## Safe continuation protocol

1. Confirm `git status`, current HEAD and the rollback ref.
2. Read this handoff plus the production files directly involved in the next
   request; do not restart from dormant guided/legacy presentation paths.
3. Add a contract/regression test that reproduces the requested behavior.
4. Change the shared authority before presentation-specific fallbacks.
5. Run focused tests, related regression tests, the full unit suite, TypeScript
   + Vite build, then relevant Playwright flows.
6. Preserve drill-through, Back navigation, source identity and evidence-scope
   metadata in every Investigation/dashboard change.
7. Create a fresh backup ref before the next material change and update this
   handoff with the new tested commit and remaining work.
