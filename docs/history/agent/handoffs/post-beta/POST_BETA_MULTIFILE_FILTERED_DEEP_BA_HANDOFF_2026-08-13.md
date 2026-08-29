# Post-Beta multi-file filtered Deep BA handoff — 2026-08-13

## Outcome

The governed six-file ERP comparison flow now supports the same two-stage investigation pattern as a single source:

1. Run the existing governed multi-source comparison.
2. Select a period/metric point on the executive chart.
3. Review the source-bound rows for that point.
4. Run the existing Deep BA framework again on the selected evidence scope.

No new BA inference engine was introduced. Step 2 reuses `createSingleSourceBAOverview` and `SingleSourceBAOverviewCard` for each relevant governed source.

The collection runtime now supports both generic temporal modes:

- One reporting period: governed snapshot with independently executed role metrics; no fabricated 0% period movement.
- Two or more reporting periods: governed comparison/trend.

Single-period role sources no longer require a duplicate comparison-period file. This is based on governed role/period/metric declarations, never filenames or sample-specific months.

Multi-file Deep BA now also supports the same downstream actions as the single-source flow:

- PNG and PDF export of the visible deep-analysis surface.
- Governed perspective Dashboard creation with metric KPIs and selected-scope BA breakdowns.
- Clean-data handoff through the existing Datasets workflow. Collection tables remain separate during cleaning/export.

## Safety boundaries

- Sources remain separate. LightBI never joins unrelated raw sales, accounting, and logistics rows.
- `sales_revenue` selects the sales source for the chosen period.
- `delivery_count` selects the logistics source for the chosen period.
- `gross_profit` analyzes the sales and accounting sources separately.
- Each Step-2 card retains the full source row count and discloses representative sampling.
- Physical column names and source values remain untouched by UI translation.
- Chart selection is available both from ECharts and accessible period/metric buttons.

## Main files

- `apps/desktop/src/components/analysis/PerspectiveCollectionResultCard.tsx`
- `apps/desktop/src/components/analysis/PerspectiveCollectionResultCard.test.tsx`
- `apps/desktop/src/components/analysis/BusinessComparisonBriefCard.tsx`
- `apps/desktop/src/components/home/HomeWorkspaceView.tsx`
- `apps/desktop/src/pages/Home.tsx`
- `apps/desktop/src/lib/understanding-core/canonical-period-partition-boundary.ts`
- `apps/desktop/e2e/phase8f2_authentic_six_source_remote.spec.ts`
- `apps/desktop/src/i18n/languages/vi.json`

## Verified gates

- Production build: passed.
- Full desktop unit suite: 206 files / 1,369 tests passed.
- Six-source Playwright suite: 3/3 passed.
- New exact journey: `2026-05 / sales_revenue` -> May sales source evidence -> Deep BA Step 2 passed.
- Exact three-source/same-period journey: Sales + Accounting + Logistics for `2026-06` produced revenue, delivery count and gross profit; displayed a snapshot; exported PNG/PDF; and created a Dashboard.
- Vietnamese language registry/coverage/UI tests: 17/17 passed.

## Regression invariants

- Preserve source/period governance and do not merge raw rows across roles.
- Preserve the single-source chart drill and filtered Deep BA Step 2 flow.
- Keep source physical columns available for evidence preview and export.
- Treat multi-source Step 2 as a scoped follow-up analysis, not a replacement for the governed full-source result.
