# Post-Beta EN/VI Language Separation Handoff — 2026-08-13

## Outcome

- English and Vietnamese now use the same JSON-owned presentation boundary.
- English can translate legacy Vietnamese BA engine output and can restore UI copy after an in-session VI → EN switch.
- Vietnamese comparison BA patterns cover dynamic revenue, quantity, discount, cost, contribution, profit, and margin statements.
- The component-local single-source BA English dictionary was removed; its exact messages and dynamic patterns now live in `en.json`.
- Domain abbreviations and physical source values remain unchanged (for example BA, ERP, KPI, SKU, SLA, COD, SQL, CSV, VND, `ĐVT`, and source category values).

## Runtime design

1. Components and engines emit stable source text.
2. `translateCatalogMessage` resolves exact messages, then catalog patterns.
3. English additionally uses a precomputed reverse index of exact non-English catalog values. This supports legacy Vietnamese engine text and safe live language switching without duplicating the complete VI catalog.
4. `UiTranslationBoundary` runs for every selected language and changes rendered copy/accessible attributes only. It never mutates source rows, semantic artifacts, SQL, or governed results.

## Regression gates

- Symmetric static coverage: English UI strings require VI catalog coverage; Vietnamese visible-boundary strings require EN coverage.
- Representative exact and dynamic EN/VI translation tests.
- Single-source BA and multi-period comparison BA tests.
- Full desktop unit suite, TypeScript, and production build.
- Browser workflow checks: Settings switch in both directions, English Home, Vietnamese Home, dirty six-sheet inventory workbook selection, canonical understanding, governed execution, and Deep BA.

## Browser interpretation rule

Physical source headers and values are evidence, not UI copy. They deliberately remain verbatim even when they contain another language (for example `ĐVT`, `TÊN VẬT TƯ`, `Cái`, and `Viên`). Product sentences, navigation, controls, explanations, and BA labels must follow the selected UI language.

## Backups

- Pre-change: `backup/pre-i18n-separation-20260813`
- Post-change: `backup/post-i18n-separation-20260813`
