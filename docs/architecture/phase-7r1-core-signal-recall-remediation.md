# Phase 7R1 Core Signal Recall Remediation

Date: 2026-07-15
Base commit: `522c019623540581353d6668077ee0ab4395cec6`
Corpus: `1.2.0`, 30 cases, 37 source occurrences

## Scope

Phase 7R1 changed only semantic candidate generation, bounded type
compatibility, and one resolver specificity rule. Metrics, questions, actions,
runtime planning, DuckDB, domain activation policy, UI, and Phase 6 consumer
wiring were not changed.

## Recall denominator

The Phase 7 values measure different populations. The 59.09% release metric
was 13 of 22 required core-signal occurrences across the 12 holdout cases. The
70% diagnostic was 42 of all 60 required holdout mappings, including non-core
and partially supported signals. The roadmap gates held-out **core MVP signal**
recall, so 22 remains the canonical denominator and the 90% threshold is
unchanged.

After remediation, core recall is 20/22, or 90.91%. All-required holdout recall
is 50/60, or 83.33%. The two unresolved core observations are `Quantity` and
`Qty`; both remain ambiguous against `stock_qty` because there is no independent
evidence that safely distinguishes the concepts.

## Corrections

- Excel serial dates now satisfy date compatibility before numeric compatibility.
- Governed date suffixes can support generic role-prefixed date headers.
- Governed money-measure heads retain meaning with bounded accounting qualifiers.
- Shipment document references use generic Vietnamese/English token composition
  and accept string or numeric identifier representations.
- Identifier conflicts consider parser failures relevant to their native physical
  representation; mixed and malformed evidence remains material.
- A specific stock-threshold header defeats a colliding status candidate unless
  actual status-value evidence exists.

No alias was added for a customer file, filename, sample ID, source hash, exact
row count, or expected answer. Holdout cases were used only to evaluate the
generic corrections.

## Evaluation

The unchanged 30-case evaluator reports:

| Measurement | Phase 7 | Phase 7R1 |
| --- | ---: | ---: |
| Held-out core recall | 59.09% | 90.91% |
| All required mapping recall | 67.19% | 74.22% |
| Confirmed precision | 96.15% | 100% |
| Probable precision | 100% | 100% |
| Combined high-confidence precision | 99.02% | 100% |
| Ambiguous/unknown rate | 55.72% | 53.86% |
| Confident false mappings | 1 | 0 |

`Ngưỡng tồn -> stock_status` was a generic resolver-order defect. It now
resolves to `stock_threshold`; no new confident false mapping was observed.
Domain activations increased from 15 to 20 and advertised actions from 21 to
28 as downstream observations. Action execution, metric correctness, and
packaging debt were deliberately not fixed in this phase.

## Verification

Phase 7R1 targeted tests cover positive, negative, collision, input-order,
heldout evaluation, import isolation, grain safety, and downstream policy hash
invariants: 1 file and 16 tests passed. The unchanged Phase 7 evaluator passed
and retained a complete observation at SHA-256
`57eb8ba8b8b90ab394e8ed9fab2914b668c8095ebf4ca3884b15ff8f1ba63192`.
Phase 5/6 regression gates passed 11 files and 36 tests. The complete
`understanding-core` matrix passed 67 files and 305 tests. Repository TypeScript
passed with zero diagnostics. All 175 architecture/corpus JSON files parsed,
import and sample-specificity scans passed, and `git diff --check` passed.

The full desktop suite was run exactly once. It reported 160 files and 1,119
tests: 156 files/1,110 tests passed. The nine failures were exactly the governed
baseline identities: six deterministic failures and three permitted BA timeout
failures. Unexpected and Phase 7R1-owned failures were zero. The process exit
status was 1 because governed baseline failures remain present; the complete log
SHA-256 is
`39fdebd91e75f9435f044f062dcc84f556b0f159e3d59facacdee27ee2e81b9a`.

Rollback is limited to the three production semantic files, the Phase 7R1 test,
and the seven Phase 7R1 evidence files. Historical Phase 3 through Phase 7 audits
and the Phase 5B6B baseline allowlist remain unchanged.

signal_recall_ready_for_release_gate_retest
