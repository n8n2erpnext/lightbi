# LightBI NEXT — Owner Acceptance Checklist

Record before testing:

- Generation ID: `____________________________`
- Parent generation: `_________________________`
- Core SHA: `_________________________________`
- Control-plane SHA: `________________________`
- Build timestamp: `___________________________`
- Tester/date: `________________________________`

## SMOKE

- [ ] **SMOKE-01 — Generation identity and isolation**
  Settings → General shows `LightBI NEXT · Internal`, pinned SHAs, parent generation and `Isolation OK`. Any `BLOCKED` state fails the build.

- [ ] **SMOKE-02 — Revenue understanding**
  Import `sample-corpus/anchors/1.3.0/Sales_ERP_May_2026.xlsx`. Expected: 1,500 rows and revenue **22,973,896,244**.

- [ ] **SMOKE-03 — Deep BA / drill evidence**
  Open governed revenue analysis in Investigation. Deep BA must stay on the selected metric; drill rows must retain source scope.

- [ ] **SMOKE-04 — Excel Analysis/Pivot**
  Export workbook. It must open successfully and include `Analysis Overview`, `Analysis Summary`, `Pivot View`, plus lineage/decision notes where applicable.

## FEATURE

- [ ] **FEATURE-01 — May vs June sales**
  May revenue **22,973,896,244**; June **20,637,539,164**; delta **-2,336,357,080**. No blind row join.

- [ ] **FEATURE-02 — May commerce multi-source**
  Sales revenue **22,973,896,244**; accounting net revenue **22,973,896,244**; gap **0**; delivery fee **147,925,000**; gross profit **3,075,721,244**.

- [ ] **FEATURE-03 — Power BI handoff**
  Export contains canonical `Clean Data` and `Data Dictionary`. Original file remains unchanged.

- [ ] **FEATURE-04 — Excel + clean-data handoff**
  Excel package contains analysis sheets plus `Clean Data`, `Data Dictionary`, `Transformation Audit`, `Clean Handoff Manifest`.

- [ ] **FEATURE-05 — Save / restart / restore**
  Restore re-inspects source. Saved execution authority and transient Excel plan do not silently return.

- [ ] **FEATURE-06 — Same filename, different content**
  Save using May file. Copy June fixture to a temporary folder and rename it `Sales_ERP_May_2026.xlsx`. Restore against that copy. Expected: fingerprint mismatch; old analysis becomes history only.

## RELEASE ACCEPTANCE

- [ ] **RELEASE-01 — Generation manifest**
  Archive `lightbi-generation.json`; all source commits are full SHAs and parent/test-pack/build timestamp are populated.

- [ ] **RELEASE-02 — Infrastructure isolation**
  DB, Redis, data, analytics, releases and integration scopes are Internal. Distribution/update targets are not production.

- [ ] **RELEASE-03 — Whole-stack restart**
  Restart the internal generation and restore a saved workspace. Metadata survives; canonical authority still requires revalidation.

- [ ] **RELEASE-04 — Promotion evidence**
  All accepted evidence names one generation ID and immutable core/control-plane SHAs.

Final decision: `PASS / FAIL / HOLD`

Notes / bug IDs:

```text

```
