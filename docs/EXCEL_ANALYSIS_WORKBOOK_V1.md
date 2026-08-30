# LightBI Excel Analysis Workbook v1

**Status:** implementation candidate on `codex/excel-analysis-workbook-20260830`  
**Scope:** local-first Excel handoff for an analysis LightBI has already governed and executed.

## Contract

The workbook is an export consumer, not a second BI engine.

```text
canonical source / governed collection
→ selected business perspective
→ governed metric result + evidence
→ Excel Analysis Workbook
```

It must not infer new relationships, repair semantics, or recompute business metrics independently of the LightBI analysis path.

For multi-source analysis, only governed metric-result rows may appear in the combined summary. Raw source evidence remains source-bound and is written to separate evidence sheets.
## Workbook layout

V1 writes:

- `Analysis Overview` — workbook identity, perspective, selected scope and combination policy;
- `Analysis Summary` — the governed metric-result table;
- `Pivot View` — a formula-driven cross-tab that references `Analysis Summary` cells and never recomputes business metrics;
- one `Evidence …` sheet per source/role/period;
- `Source Lineage` — source names, roles, periods and disclosed source row counts;
- `Decision Notes` — findings, recommended actions, caveats and export notes.

When the user carries the analysis into `Datasets`, the transient analysis plan is combined with the existing clean-data handoff and appends `Clean Data`, `Data Dictionary`, `Transformation Audit`, and `Clean Handoff Manifest` without changing the analysis authority model. The handoff is in-memory only and is deliberately not persisted as business authority.

## Pivot policy

V1 intentionally exports governed summary tables plus a formula-driven `Pivot View` rather than manufacturing an independent Pivot engine. Native Excel PivotTable/PivotChart generation is additive if a future workbook runtime can generate it deterministically and preserve the same analysis identity, source lineage, restrictions and drill evidence.

The current SheetJS path does not grant permission to fabricate a raw multi-source table merely because Excel can represent one.

## Single-source Deep BA

The same workbook contract is also used by `InvestigationDeepAnalysis`. When a single-source BA overview exists, its already-computed KPIs become the summary. Otherwise the governed chart-result rows are preserved as the summary. Selected drill-through rows are emitted as an `Evidence …` sheet only when a source-bound Step 2 scope exists; ordinary chart rows are never relabeled as raw evidence.

This keeps multi-source perspective analysis and single-source Deep BA on one export contract without inventing a second Pivot or metric engine.

## Safety and limits

- Excel data sheets are bounded by the XLSX row limit; oversized tables fail explicitly instead of truncating silently.
- Sheet names are sanitized and made unique without altering source identity stored in workbook metadata.
- A selected chart point may narrow evidence sheets to that governed period/metric scope.
- Without a selected point, evidence sources remain separate rather than being concatenated.
- Local Basic remains independent of the online control plane for this export.

## Current production entry

`PerspectiveCollectionResultCard` exposes `Export Excel analysis` beside the existing analysis handoff actions. It packages the already-rendered governed summary and source-bound evidence through `analysis-workbook.ts`.

The public CI regression set includes `analysis-workbook.test.ts` so future changes cannot silently remove the multi-source separation rule.
## Shared decision-visualization plan

Executed perspective results now produce `DecisionVisualizationPlanV1` (`lightbi.decision-visualization-plan.v1`) after governed execution. It is deliberately downstream from `PerspectiveAnalysisPlanV1`: the understanding plan says what may be analyzed, while the decision-visualization plan says how an already-governed result is presented.

The plan carries the analysis/perspective identity, selected dimension/metric scope, source references, governed result rows, primary chart intent, and the invariant `rawMultiSourceJoinAllowed=false`. Dashboard creation and Excel workbook export consume this shared post-execution plan so they cannot silently choose incompatible result scopes or evidence policies. The dimension field is generic, so period comparison and single-source dimensions such as Store/Route/SKU can use the same contract.
