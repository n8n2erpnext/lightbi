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
