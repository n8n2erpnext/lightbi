# Post-Beta MotoDetail Semantic Handoff — 2026-08-13

## Resume point

- Repository: `/home/ubuntu/n8n2erpnext/LightBI`
- Branch: `codex/beta-recovery-20260801`
- Pre-change rollback ref: `origin/backup/pre-motodetail-semantic-fix-20260813`
- Evidence workbook: `motodetail.xlsx`, sheet `Bản sao của Moto Detail`, 1,461 material rows and 16 physical columns.

## User-visible defect and correction

The workbook contains usable business dimensions under abbreviated ERP headers. The canonical and universal paths now recognize the abbreviations by exact header shape, without using the workbook name or sheet name:

- `CUST. NAME` → customer
- `AREA` → territory/region
- `WHA. ID` → warehouse
- `EMP. ID` → employee actor
- `ORD. CODE` → order identity
- Excel-serial `DATE` remains a time field, never a generic KPI.
- `__PowerAppsId__` and formula-error columns remain technical/data-quality evidence and are excluded from normal BA dimensions.

The universal capability ladder now offers safe record-count analysis by customer. Operations can recommend workload by employee and volume by warehouse/area. Data-quality review stays available but no longer displaces an executable business question when trustworthy dimensions exist.

## Deep BA correction

- Generic numeric fallback excludes dates and technical identifiers.
- Data-quality actions remain descriptive/count-based.
- `record_count` breakdowns count rows; they no longer count the grouping value as a distinct identity, which previously made every customer appear as `1`.
- Full-source governed output and representative-sample Deep BA retain separate evidence scopes.

## Governance and regression state

- Semantic aliases are exact-header additions, not broad substring or value-pattern rules.
- No metric authorization, aggregation policy, decision-use authorization, filename rule, or sheet-name rule changed.
- Governed corpus expansion: 752 physical columns, 1,197 candidate traces, 393 selected results, 47 confirmed results, zero high-severity conformance violations.
- Focused semantic, grain, canonical presentation, i18n, Investigation and Deep BA tests pass.
- TypeScript check and production web build pass.
- Browser E2E on the exact workbook passed: import → canonical understanding → Customer perspective → full-file execution → Deep BA. The top full-source customer count and representative-sample breakdown are consistent with their declared scopes.

## Safety invariants for the next AI session

1. Do not infer business meaning from file or sheet names.
2. Keep `DATE` as time and PowerApps/GUID-like fields out of KPI/dimension fallbacks.
3. Keep `record_count` as row count unless a separately governed identity metric is explicitly selected.
4. Preserve canonical source identity, fingerprint, runtime materialization, and full-source/sample evidence labels.
5. Do not relax exact ERP abbreviations into broad token matching without rerunning the complete governed corpus.
