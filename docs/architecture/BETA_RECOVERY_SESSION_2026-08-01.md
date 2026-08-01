# LightBI Beta Recovery Session ??? 2026-08-01

## Status

- Run: active
- Branch: `codex/beta-recovery-20260801`
- Starting commit: `8212a8e3fa12bc3357b2a952faffb492c4025ef2`
- Product status at start: **NOT BETA READY**
- Packaging: deferred until web/core acceptance passes
- Distribution/licensing web: out of scope

## Mission

Complete the LightBI Beta as one coherent product recovery, not as a sequence of
sample-specific patches. Easy Mode must accept raw single or multi-source data,
understand it, propose evidence-backed business perspectives, execute useful
analyses and charts for the selected perspective, provide BA and deep BA output,
and prepare non-destructive clean data for downstream tools. Advanced Mode must
remain the technical workspace for review, cleaning, mapping, query and export.

## Product invariants to reread before every implementation phase

1. Never hardcode a sample filename, sheet name, exact sample schema or sample
   row value into production behavior.
2. A canonical migration may not reduce a previously available capability.
3. Strict governance controls claim strength and execution authority; it must
   not turn useful structured data into a dead end.
4. Data Trust is supplementary. It is the sole perspective only when no safe
   structural analysis can be produced.
5. Single-file and multi-file flows share the same understanding, perspective,
   visualization and BA contracts.
6. A selected perspective produces an analysis bundle, not one arbitrary chart.
7. Basic BA and deep BA consume the same evidence artifact at different levels
   of disclosure.
8. Currency and language come from Settings unless source evidence conflicts.
9. Cleaning is non-destructive, previewable, auditable and exportable.
10. Domain extension must be possible through a declared pack and SDK contract,
    without editing core orchestration.
11. AI is optional and cannot own semantic truth, KPI computation or safety.
12. No Beta declaration is valid without full corpus, held-out, dirty-data and
    Playwright Easy Mode acceptance.

## Confirmed architectural regression

- Commit `522c019` (2026-07-15) cut the Home production path over to the
  canonical consumer and set legacy guided investigation and legacy dataset
  understanding outputs to null before held-out parity had been demonstrated.
- The current production boundary activates only `commerce_distribution_mvp`.
- Question generation, metric preflight, runtime preflight, runtime contracts,
  handoff and multi-source restrictions remain coupled to that pack.
- The generic question engine and older cross-domain capabilities remain in the
  repository but are bypassed by the Home production path.
- Multi-file execution in `Home.tsx` still maps selected perspectives to fixed
  sales/accounting/logistics roles and fixed metrics.
- Investigation begins with one action/query/chart while deep BA may inspect a
  wider row set, producing the observed mismatch between a trivial chart and a
  richer deep analysis.
- Cleaning/export components exist, but there is no complete governed cleaning
  artifact from intake through downstream export.

## Recovery slices and gates

### R0 ??? Baseline and rollback

- Preserve the existing dirty state and generated policy audits.
- Create and push the recovery branch.
- Capture current sample outcomes and disk usage.
- Gate: reproducible rollback point and baseline report.

### R1 ??? Contracts and non-regression bridge

- Add ADR supersession and authoritative recovery contracts.
- Add capability-ladder and no-dead-end tests.
- Restore safe structural/semantic analyses when a governed domain action is not
  available, without allowing unsupported business claims.
- Gate: bank, DATA_XUAT and other useful structured files cannot collapse to
  Data Trust only.

### R2 ??? Domain-neutral production path

- Remove direct commerce-pack ownership from core orchestration contracts.
- Make domain activation, metric/question policy and runtime dispatch registry
  driven.
- Prove a test domain can reach perspective, action, execution, chart and BA
  without a core edit.
- Gate: SDK E2E extension contract passes.

### R3 ??? Perspective analysis bundles and unified BA

- Generate KPI, primary chart, supporting charts, breakdowns, exceptions and
  evidence tables per selected perspective.
- Use one BA evidence artifact for basic and deep presentations.
- Gate: scalar results render as KPI, operational files expose comparisons such
  as on-time/late by route, vehicle and driver when evidence exists.

### R4 ??? Generic multi-source

- Replace fixed role/metric branches with relationship and domain declarations.
- Support user-selected periods and unified single/multi presentation.
- Gate: six ERP anchors pass without being the only supported collection shape.

### R3B - Perspective dashboard composer

- Add `Create dashboard from this perspective` after Deep BA.
- Compose KPI cards, primary/supporting charts, breakdowns, filters, warnings and
  provenance from the same perspective evidence bundle used by BA.
- Keep the generated dashboard editable, responsive and saveable without
  introducing a second analysis truth path.
- Gate: dashboard title, KPIs, charts and filters retain the selected perspective,
  metric bindings and source provenance; no sample or filename-specific layout.

### R5 ??? Clean data and downstream export

- Add a non-destructive cleaning plan, before/after preview, audit trail, clean
  dataset artifact, data dictionary and Power BI-ready export package.
- Gate: dirty fixtures can be normalized and exported without mutating source.

### R6 ??? Product acceptance and release

- Run tracked sample, corpus 1.4, held-out, metamorphic and dirty-data matrices.
- Run Playwright Chromium E2E on VPS for the full Easy Mode journey.
- Update release documentation only from generated acceptance evidence.
- Build Windows only after web/core Beta gates pass.

## Acceptance minimums

- No filename/sample-specific production rule.
- Every useful structured sample has at least one non-trust perspective and one
  executable safe analysis.
- Every ready perspective has one primary and, where evidence permits, at least
  two supporting analyses.
- Charts are selected from result shape; no meaningless one-bar scalar chart.
- Basic and deep BA agree on metrics and provenance.

## Execution checkpoint 1 - capability continuity

- Added a production capability ladder that preserves canonical governed
  actions and fills uncovered domains with safe descriptive actions from the
  existing generic question engine.
- Universal fallback action identifiers are namespaced and never receive a
  fabricated canonical handoff. Runtime source continuity is still required.
- Domain perspectives are augmented from detected semantic signals and
  executable actions, independent of filename.
- Corrected the generic adapter so universal actions are assigned to the
  detected lens domain instead of defaulting to revenue.
- Removed the single-source intake dead end: one accessible source can enter
  Easy Mode without first declaring an ERP source role. Role correction remains
  available as optional technical evidence.
- Unit gates: capability ladder held-out/metamorphic tests pass.
- Build gate: desktop TypeScript and production Vite build pass.
- Browser gate: bank-additional-full.xlsx now completes upload -> Easy Mode ->
  Customer/Performance/Operations/Finance perspectives -> governed question ->
  investigation workspace in Chromium on the VPS.
- Corpus browser matrix is running next; any remaining one-perspective or
  non-executable result is treated as a contract failure, not a fixture patch.

## Execution checkpoint 2 - safe execution continuity

- Found and eliminated a false-positive browser gate: reaching the investigation
  route did not prove that an analysis could execute. Universal actions were
  being rejected there because the page accepted only canonical handoffs.
- Restored the existing safe SQL/full-source execution boundary only for
  explicitly namespaced `universal:` descriptive actions. Canonical actions
  continue to require their canonical handoff and governed preflight.
- Universal execution still requires an active runtime source and a non-blocked
  runtime plan. Validation rejects empty or structurally invalid results.
- Strengthened the Chromium corpus gate: each fixture must have multiple useful
  perspectives, enter investigation without a preflight block, execute against
  data, render a chart, and enable deeper BA analysis.
- Verified on VPS Chromium with real full-source execution:
  `DATA_XUAT.xlsx`, `bcctnhapTTKT_19122024.xlsx`,
  `Logistics_ERP_June_2026.csv`, and
  `Amazon_1-level_46-MB_minified.json` (4/4 passed).
- Visual review confirms the previously blocked operational workbook now renders
  a multi-category stock/quantity chart, while `DATA_XUAT.xlsx` renders a real
  group distribution instead of a blocked placeholder.
- Disk checkpoint: 30 GB available, 76% used. No broad or destructive cleanup
  performed.

## Execution checkpoint 3 - perspective-aligned analysis bundle

- Made the single-source BA overview explicitly action-aware. A mixed source
  that contains both commercial and operational evidence now keeps the BA mode
  aligned with the user's selected perspective instead of defaulting to revenue.
- Added a regression test proving the same mixed dataset produces an operations
  BA for an operations action and a commercial BA for a revenue action.
- Added a domain-neutral perspective analysis bundle. Supporting analyses are
  selected only from executable actions in the same detected perspective,
  diversified by result shape, and remain independent of source filename.
- Investigation sessions now preserve the primary analysis plus safe supporting
  analyses. Supporting charts execute through the same full-source validation
  boundary and failed preflights are omitted rather than rendered as evidence.
- Browser acceptance now verifies that the Deep BA panel repeats the exact
  primary decision question shown in the chart workspace.
- Gates: six focused unit tests pass; desktop TypeScript and production Vite
  build pass; VPS Chromium corpus passes 4/4 for DATA_XUAT, bcctnhapTTKT,
  Logistics ERP and Amazon JSON. Amazon also proves a visible supporting chart.
- Scope note: content depth still requires the universal BA quality matrix in
  R3. A panel opening is not considered sufficient BA acceptance.
- Disk checkpoint: 30 GB available, 76% used.

## Execution checkpoint 4 - universal BA depth and exact angle alignment

- Expanded the single-source BA contract beyond commerce/logistics/inventory to
  outcome, customer and performance analysis using semantic-field declarations
  plus bounded structural profiling.
- Added bilingual operational/export aliases as domain dictionary evidence,
  never filename conditions. Semantic briefing mappings remain authoritative.
- Added outcome-rate, interaction-duration and campaign-contact KPIs; generated
  group comparisons include sample sizes to prevent misleading small-group ranks.
- Fixed exact-angle alignment inside a perspective: a count/distribution question
  uses the selected dimension and count measure, while an outcome-rate question
  uses the governed outcome label. Deep BA no longer switches from `poutcome` to
  `y` merely because both exist in the bank source.
- Permanent BA matrix now covers Logistics ERP, Amazon JSON, bcctnhapTTKT,
  bank-additional-full, DATA_XUAT and BHX_PHIEUXUAT. Every accepted brief must
  include multiple KPIs/breakdowns where evidence permits, findings, three next
  actions and explicit limitations.
- Browser gate: bank customer journey reaches an executable chart and Deep BA;
  the panel is checked against the selected question and visibly ranks the exact
  `poutcome` dimension. TypeScript and production build pass.
- Added R3B dashboard composition to the plan as requested. It must reuse this
  same evidence bundle rather than create a parallel analytics path.
- Disk checkpoint: 30 GB available, 76% used.

## Execution checkpoint 5 - perspective dashboard bridge

- Connected the existing Chart Library and Dashboard runtime to the final Easy
  Mode BA step. The Deep BA panel now offers `Create perspective dashboard`
  only after the selected action has an executed, renderable result.
- Dashboard composition reuses the selected action identity, primary governed
  result, BA KPI set, BA breakdowns and any completed supporting charts. It does
  not re-infer a new perspective or start a parallel query path.
- Each generated chart carries dataset, action, perspective, evidence scope and
  generated-at metadata. Dashboard metadata states when the primary result is
  full-source but BA breakdowns use a representative sample.
- Fixed timestamp-only chart/dashboard identifiers, which could overwrite cards
  created in the same millisecond during one-click composition.
- Upgraded the dashboard presentation with perspective context, governance and
  evidence-scope badges, responsive 20-column layout, KPI cards and ranked
  breakdown charts.
- Chromium gate: `bank-additional-full.xlsx` completes Customer perspective ->
  selected `poutcome` question -> chart -> aligned Deep BA -> generated
  Dashboard. The resulting dashboard contains eight real cards in visual QA.
- Gate status: desktop TypeScript passes; Playwright dashboard journey passes.
- Disk checkpoint remains 30 GB available, 76% used.
