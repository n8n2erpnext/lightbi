# Post-Beta Deep BA Vietnamese completion — 2026-08-13

## Outcome

- Completed the Vietnamese presentation boundary for dynamic Deep BA investigation copy, including the eight W layers, evidence-row labels, missing-signal labels, confidence/priority labels, anomaly diagnostics, and follow-up actions.
- Removed hard-coded mixed-language workbook copy and routed dynamic selected-sheet labels through the language catalog.
- Added Vietnamese coverage for dynamic single-source and multi-source perspective/result summaries observed in the production workflow.
- Source column names, source values, filenames, and business identifiers remain unchanged by design.

## Regression protection

- `language-coverage.test.ts` now audits user-visible Deep BA object fields in `deep-ba-investigation.ts`.
- `language-registry.test.ts` covers representative dynamic workbook, perspective, Deep BA, anomaly, and multi-source result sentences.
- Focused BA/i18n gate: 43/43 tests passed.
- Full desktop gate: 205 files, 1,364 tests passed.
- Production desktop build passed (`tsc -b` and Vite).

## Files changed

- `apps/desktop/src/i18n/languages/vi.json`
- `apps/desktop/src/i18n/language-registry.test.ts`
- `apps/desktop/src/i18n/language-coverage.test.ts`
- `apps/desktop/src/components/investigation/SingleSourceBAOverviewCard.tsx`
- `apps/desktop/src/components/home/WorkbookSheetSelector.tsx`

## Invariant

Language selection affects only LightBI-owned presentation copy. It must never translate or mutate source column names, source values, filenames, IDs, semantic evidence, query bindings, or governed execution contracts.
