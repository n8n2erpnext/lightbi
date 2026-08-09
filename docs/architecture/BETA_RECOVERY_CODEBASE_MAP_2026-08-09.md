# LightBI Beta Recovery Codebase Map

This map identifies the production path that must stay coherent from raw data
to a governed decision dashboard. It is a maintenance and release checklist,
not a list of sample-specific implementations.

## 1. Product entry and navigation

- `apps/desktop/src/pages/Home.tsx` owns Easy Mode intake, restored session
  state, single/multi-source grouping, perspective selection and transition to
  investigation.
- `apps/desktop/src/components/home/HomeWorkspaceView.tsx` is the non-technical
  landing surface for file, connector and database intake.
- `apps/desktop/src/lib/home-canonical-artifact.ts` builds the shared canonical
  artifact used by both single- and multi-source paths.
- `apps/desktop/src/pages/Investigation.tsx` owns governed execution, primary
  and supporting charts, BA disclosure and dashboard handoff.
- `apps/desktop/src/pages/Advanced.tsx` remains the technical review/mapping
  workspace and must not become a prerequisite for ordinary Easy Mode usage.

Invariant: Back navigation restores the in-memory canonical artifact and the
selected perspective; it must not reread or reimport the source.

## 2. Understanding core

- `apps/desktop/src/lib/understanding-core/signal-engine.ts` detects semantic
  signals from headers, values and source structure.
- `apps/desktop/src/lib/understanding-core/grain-candidate.ts` and grain
  resolution modules determine the record grain without treating identifiers
  as additive measures.
- `apps/desktop/src/lib/understanding-core/ontology.ts` declares canonical
  concepts and expandable domain vocabulary.
- `apps/desktop/src/lib/understanding-core/question-engine.ts` produces safe,
  evidence-backed analysis opportunities.
- `apps/desktop/src/lib/understanding-core/commerce-distribution-question-policy.ts`
  is a declared question pack; it is not allowed to own orchestration.
- `apps/desktop/src/lib/semantic-registry.ts` is the registry boundary through
  which domain packs and future SDK plugins contribute concepts and actions.
- `apps/desktop/src/lib/canonical-capability-ladder.ts` prevents useful
  structured sources from collapsing to Data Trust when safe descriptive
  analysis remains possible.

Invariant: runtime behavior may depend on declared semantic evidence, never a
sample filename, exact sample row or workbook-specific branch.

## 3. Perspectives and analysis bundles

- `apps/desktop/src/components/analysis/CanonicalPerspectiveSelector.tsx`
  presents business perspectives derived from the canonical evidence.
- `apps/desktop/src/lib/perspective-analysis-bundle.ts` selects a primary action
  and diverse supporting actions belonging to the selected perspective.
- `apps/desktop/src/components/analysis/CanonicalMultiSourceReview.tsx` and
  `UnderstandingNextCard.tsx` expose the same decision contract for grouped and
  single sources.
- `apps/desktop/src/lib/understanding-core/question-engine.ts` and registry
  policies remain the source of question breadth; UI cards must not invent or
  narrow domains.

Invariant: a ready perspective owns an executable primary analysis and, where
evidence permits, supporting analyses. Selecting a perspective is sufficient;
the user must not select an unrelated technical bundle afterward.

## 4. Governed execution and charts

- `apps/desktop/src/lib/duckdb-wasm-loader.ts` loads the browser DuckDB runtime
  and must fail transparently to supported alternatives in non-browser tests.
- `apps/desktop/src/lib/governed-descriptive-executor.ts` executes safe
  descriptive actions over the full source.
- Investigation preflight and executor modules enforce source continuity,
  metric semantics and result validation before rendering.
- `apps/desktop/src/components/dashboards/DashboardChartWidget.tsx` renders chart
  shapes from executed results; scalar results must be KPIs rather than
  meaningless one-bar charts.

Invariant: document, shipment and transaction identifiers are counted
distinctly and never summed. Charts and BA must use the same executed action.

## 5. BA and deep BA

- `apps/desktop/src/lib/single-source-ba-overview.ts` creates selected-angle BA
  KPIs, trends, breakdowns, findings, actions and limitations from bounded
  representative rows while preserving full-source execution provenance.
- `apps/desktop/src/components/investigation/SingleSourceBAOverviewCard.tsx`
  presents that specialized evidence in EN or VI.
- `apps/desktop/src/components/investigation/InvestigationBAReadouts.tsx` renders
  the basic answer from the same decision artifact.
- `apps/desktop/src/components/investigation/InvestigationDeepAnalysis.tsx`
  owns deep disclosure and the perspective-dashboard call to action.
- `apps/desktop/src/components/analysis/BADecisionBriefPanel.tsx` handles
  governed multi-source BA evidence.

Invariant: deep BA is selected-perspective analysis, not a generic file summary.
Basic BA, deep BA, charts and dashboards must agree on question, measures,
dimensions, source scope and limitations.

## 6. Enterprise dashboard

- `apps/desktop/src/pages/DashboardBuilder.tsx` composes a dashboard from the
  selected perspective evidence bundle.
- `apps/desktop/src/pages/Dashboards.tsx` lists saved decision dashboards.
- Dashboard cards retain dataset, action, perspective, evidence scope and
  generated-at metadata and include BA KPIs and breakdowns in addition to the
  primary/supporting charts.

Invariant: dashboard composition reuses evidence; it does not re-infer a new
truth path. Layout remains editable and responsive after generation.

## 7. Clean Data and downstream handoff

- `apps/desktop/src/lib/clean-data-handoff.ts` creates a non-destructive cleaning
  plan, audit metadata, data dictionary and Power BI-ready workbook package.
- Dataset and source pages expose preview/export without mutating raw source
  files.

Invariant: raw data remains recoverable; every normalization is previewable and
auditable, and exports include the interpretation needed by downstream users.

## 8. Language and display preferences

- `apps/desktop/src/stores/display-preferences-store.ts` owns language, locale
  and currency defaults.
- `apps/desktop/src/lib/ui-language.ts` is the shared boundary for deterministic
  engine text, canonical question titles and business-purpose localization.
- Monetary input in Easy Mode uses Settings unless source evidence conflicts;
  it is not requested again as ordinary workflow input.

Invariant: engine contracts remain stable English identifiers. Presentation is
fully EN/VI and must not mix languages or show mojibake.

## 9. Desktop packaging

- The Tauri host embeds the LightBI execution core in the desktop process.
- The Windows release must launch one LightBI application process, bind no
  externally fixed application port and require no separately installed
  `lightbi-server.exe`.
- WebView2 and compiler-runtime DLLs are packaging dependencies, not a second
  LightBI backend service.

Packaging is the final gate, after core/web acceptance. Installation, launch,
single-process behavior, import, analysis and uninstall are smoke-tested on
Windows before release.

## 10. Permanent acceptance gates

- Unit/architecture regression: every suite passes.
- TypeScript and production build: pass without ignored errors.
- VPS Chromium: single source, multi-source, period comparison, Clean Data and
  enterprise dashboard journeys pass.
- Complete sample matrix: every discovered sample reaches at least two useful
  perspectives, one executable perspective, a governed chart and deep BA.
- Held-out and dirty fixtures verify capability continuity without filename
  conditions.
- Generated audit artifacts and this session log are updated before commit.
