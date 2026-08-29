# Post-Beta filtered Deep BA handoff — 2026-08-13

## Read this first

This note records the generic fixes made after the multi-sheet dirty-workbook work. It is intended to let a new AI session resume without rereading the full chat.

Repository: `/home/ubuntu/n8n2erpnext/LightBI`

Working branch: `codex/beta-recovery-20260801`

Pre-change rollback ref: `origin/backup/pre-filtered-deep-ba-20260813` at `37de050f7c1f4475e8cc6f7031a96968bc10eef9`.

Do not touch the pre-existing untracked ZIP, PID, log, or `releases/` artifacts.

## User-visible workflow now covered

1. Import an XLS/XLSX workbook.
2. Choose one sheet or analyze the full workbook.
3. Choose the existing business perspective and analysis.
4. Execute the governed full-source chart.
5. Click a chart group to open source-bound drill-through rows.
6. Apply the existing composable filters and checkbox selection.
7. Click `Phân tích sâu dữ liệu đã chọn`.
8. The existing `SingleSourceBAOverview` and existing Deep Analysis panel are reused with only the selected rows as input.

Step 2 does not introduce a second BA engine. It changes the evidence input of the existing framework and adds explicit selected-data provenance.

## Fix 1 — dirty workbook row-count parity

Root cause of `RUNTIME_MATERIALIZATION_ROW_COUNT_EXCESS`:

- selected-sheet inspection used `blankrows:false`, compressing blank rows before the detected header;
- the resulting header index was later treated as a physical worksheet coordinate by the full-file runtime parser;
- on `Ton kho vat tu 022025.xlsx#Tổng hợp`, inspection produced 331 rows but runtime materialized 332.

Fix:

- explicit workbook inspection now preserves physical blank-row positions with `blankrows:true`;
- the runtime materializer safety check remains strict and was not weakened.

Actual workbook verification after the fix:

- detected physical header row index: 5 (Excel row 6);
- canonical source rows: 331;
- runtime materialized rows: 331.

## Fix 2 — constrain runtime columns to the canonical table

Dirty workbooks may have formatting/merged regions extending far beyond the analytical table. SheetJS then generated `__empty` columns in drill-through even though the canonical profile had only 9 physical columns.

The runtime file binding now carries `physicalColumnCount`. XLSX materialization constrains its range to the canonical header row and canonical physical column count. CSV/TSV/JSON behavior is unchanged.

Actual workbook verification: drill-through filter options are exactly:

`stt`, `tên vật tư`, `mvt`, `đvt`, `đầu kỳ`, `nhập`, `xuất`, `cuối kỳ`, `ghi chú`.

No `__empty` fields remain.

## Fix 3 — Deep BA step 2 over selected rows

`InvestigationDrillThroughPanel` owns the live filters and selection, so it emits a typed `FilteredDeepAnalysisScope` containing:

- exact selected rows;
- active filters;
- parent chart point;
- matched and selected counts;
- row-limit/truncation provenance.

`Investigation.tsx` passes those rows to the existing `createSingleSourceBAOverview` and renders the existing `InvestigationDeepAnalysis`. It does not reuse the full-source `BADecisionBrief` for the filtered scope. The full-source dashboard CTA is hidden in step 2 until a separately governed filtered-dashboard contract exists.

The panel explicitly states that KPIs, breakdowns, findings, and recommendations are recalculated only from the selected rows. If drill-through reaches its cap, it discloses that limitation.

## Fix 4 — selected count-angle fidelity

The existing general/performance BA fallback previously treated `record_count` as unresolved and selected the first numeric column (for this workbook, `STT`). The shared BA framework now recognizes record-count/distribution angles, preserves `selectedMeasure=record_count`, preserves the resolved selected dimension, and produces count-based context instead of averages over an unrelated numeric identifier.

This applies to normal Deep BA and filtered Deep BA because both reuse the same engine.

## Real-file E2E evidence

Workbook: `C:\Users\Admin\Downloads\Ton kho vat tu 022025.xlsx`

Completed in the running VPS web application:

- imported workbook;
- selected `Tổng hợp`;
- source recognized as 331 rows / 9 columns;
- opened inventory perspective;
- executed `Cơ cấu danh mục theo nhóm` successfully (`EXECUTED`, 14 result rows);
- confirmed no row-count runtime error;
- clicked `ĐVT = Cái` (185 matching source rows);
- filtered `MVT = TSN412812` (1 matching and selected row);
- opened `Phân tích BA chuyên sâu · Bước 2`;
- confirmed selected scope 1/1, `record_count`, dimension `đvt`;
- confirmed no `average STT`, no full-file claim, no dashboard CTA, and no browser console errors.

## Regression gates

Focused tests cover:

- physical blank-row/header parity;
- canonical physical-column range;
- selected filter rows passed to step 2;
- Deep Analysis selected-scope boundary;
- record-count action not falling back to an unrelated numeric identifier;
- existing Investigation, drill/filter/export, and BA tests.

Before release, retain these invariants:

- never weaken fingerprint, generation, row-count, or canonical-handoff checks;
- do not reinterpret a filtered selection as a governed full-source result;
- do not persist a filtered dashboard using the current full-source dashboard serializer;
- preserve physical source columns for drill/export;
- preserve selected action measure and dimensions through chart, BA, and dashboard paths.
