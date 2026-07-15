# Phase 3B2B Resolution Validation And Policy Freeze

- Date: 2026-07-11
- Scope: Phase 3B2B only
- Canonical owner: `understanding-core`
- Production wiring changed: no
- Freeze classification: `freeze_ready_with_documented_debt`

## Executive Decision

The semantic-resolution policy is frozen as release candidate `lightbi.semantic-resolution-policy.v2`, SHA-256 `064e6861cc208e7d35074d9b872e0d4a11dfacdbc850e6d017c24f32462d6ad3`.

The selected-result audit found one generic false-confidence mechanism in v1: representative value semantics, or physical/cardinality records whose provenance was changed to representative evidence, could still enter `independentSupportFamilies`. A new synthetic mutation reproduced the defect without using a corpus header, value, filename, sample ID, or expected answer. Policy v2 excludes representative value families and representative-sourced physical/cardinality records from independent support. No validation-only case tuned the rule.

This correction downgraded one of the five Phase 3B2A confirmed outcomes to probable. Reduction in certainty is intentional. There are zero unresolved high-severity false-confidence violations after correction.

## Selected-Result Audit

The machine audit contains all 131 selected outcomes, each with sample/source identity in audit metadata only, tuning provenance, physical column, candidate, state, lexical class, independent and correlated families, conflicts, competitors, structural limitations, full-file versus representative provenance, context relations, dominance, debt effects, rules, governed allowed/forbidden states, conformance, risk class, and disposition.

Final selected distribution is four confirmed and 127 probable. All selected results use exact governed lexical evidence; containment-only, value-only, physical-only, context-only, and representative-only candidates are never selected. No selected result has material conflict, unresolved viable competition, or directly relevant candidate-absence debt.

High-risk review covers generic status/date, party/account semantics, quantity/UOM, monetary fields, identifiers/names, delivery status/timestamps, employee/manager, category/location/campaign, score/rank/rating, every contextual selection, every representative-bearing selection, every debt-affected column, and all validation-only confirmed results. Representative evidence remains visible in traces but is not counted as an independent family.

## Confirmed Traces

| Phase 3B2A result | Group | Column | Candidate | Final | Independent families | Disposition |
|---|---|---|---|---|---|---|
| confirmed | golden | `Đơn vị tính` | `uom` | probable | lexical, physical | downgraded; representative value was not independent |
| confirmed | holdout | `Tình trạng tải` | `load_status` | confirmed | lexical, physical, cardinality | valid confirmed |
| confirmed | golden | `Xe đến đúng hẹn` | `on_time_status` | confirmed | lexical, physical, cardinality | valid confirmed |
| confirmed | holdout | `Xe đến đúng hẹn` | `on_time_status` | confirmed | lexical, physical, cardinality | valid confirmed |
| confirmed | holdout | `Xe đến đúng hẹn` | `on_time_status` | confirmed | lexical, physical, cardinality | valid confirmed |

The three validation-only confirmed outcomes were audited but did not change policy. They are not an `mvp_proven` claim and cannot be treated as fresh holdout proof.

## Governed Shadow Conformance

These are governed shadow-conformance metrics, not real-world accuracy metrics.

| Group | Columns | Governed selected | Forbidden violations | Wrong selected | Confirmed | Probable | Ambiguous | Unknown | Unguided/abstention observations |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Synthetic policy/counterfactual | 20 mutations | 20 | 0 | 0 | n/a | n/a | n/a | n/a | 0 |
| Golden, tuning eligible | 152 | 26 | 0 | 0 | 1 | 25 | 72 | 54 | 126 |
| Holdout, evaluation only | 276 | 48 | 0 | 0 | 3 | 45 | 146 | 82 | 228 |
| Adversarial, evaluation only | 72 | 3 | 0 | 0 | 0 | 3 | 15 | 53 | 69 |
| Multi-file, evaluation only | 252 | 54 | 0 | 0 | 0 | 54 | 168 | 30 | 198 |

Ambiguous and unknown outcomes are not failures. The large unguided set remains explicit evaluation debt because the current shadow expectation layer does not govern every physical column individually. No excessive-abstention threshold is invented in this phase.

## Counterfactual And Monotonicity

Twenty deterministic mutations cover sibling removal, representative removal, cardinality removal, lexical downgrade, opaque headers, viable competitors, collisions, material absence, physical conflict, mixed-type uncertainty, evidence/relation duplication, evidence and sibling-order shuffle, unrelated siblings, relation endpoint removal, mutual weak support, representative-only conversion, sparsity, and canonical policy formatting.

All 20 pass the validation partial order `confirmed > probable > {ambiguous, unknown}`. Ambiguous and unknown remain incomparable. Removing support or adding conflict, competition, structural uncertainty, or relevant debt never increases certainty. Duplicate/correlated evidence and unrelated context never increase certainty or change target selection. Technical and unsupported inputs never become business mappings.

The counterfactual order is validation-only and is not a numeric confidence score or candidate ranking.

## Forbidden Confidence Checks

Explicit negative tests prohibit:

- containment-, value-, physical-, context-, or representative-only probable/confirmed states;
- selection with material conflict, unresolved competitor, or relevant absence debt;
- confirmation using correlated support as independent evidence;
- mutual sibling bootstrapping;
- generic `Status` becoming a forced domain status;
- `UnitCost` becoming `unit`/`uom` through containment;
- opaque `y` becoming conversion;
- sports `Event` becoming `error_event` or `audit_action`;
- numeric rank/score fields becoming KPI through value shape alone.

All 84 header-only collisions remain unresolved and all 18 broad-candidate occurrences remain safe.

## Dominance Audit

The single corpus dominance is `stock_status` over `stock_threshold` for `Ngưỡng tồn`. The dominant independent support set is a strict superset (lexical, physical, cardinality versus lexical and physical), lexical class is no weaker, conflict and limitation severity are no worse, context alone did not cause dominance, Phase 3A order is preserved, and no total ranking exists. Synthetic negative cases keep incomparable candidates ambiguous.

## Candidate-Absence Debt

All 14 records are unchanged. Nine unique source-column effects resolve to unknown or ambiguous with no selected candidate. Five additional absent alternatives are retained at artifact level because they share an already-blocked source-column effect; they do not create additional negative evidence. A synthetic unrelated-debt mutation proves artifact-level debt does not change certainty on unrelated columns.

Absent candidates are never manufactured, rejected, treated as negative evidence, or used as support.

## Preservation And Isolation

- 752/752 physical-column resolutions remain covered;
- 1,223/1,223 candidate traces remain exactly once and in Phase 3A order;
- no candidate is added or removed;
- 84 collisions, 18 broad occurrences, and 14 debt records remain governed;
- source/hash/version/registry/policy mismatches still fail closed;
- canonical output remains deterministic and machine-independent;
- `productionWiring.executed` remains false;
- `DOMAIN_SUPPORT_MANIFEST` remains empty;
- no production consumer imports or executes the shadow resolver.

## Remaining Debt

- The separate expectation layer governs policy probes and all selected outcomes, but not every abstained physical column.
- Four valid required-candidate gaps and ten contextual-candidate gaps remain upstream debt.
- The inspected holdout, adversarial, and multi-file corpus is no longer pristine unseen evidence.
- Grain, relationships, domains, metrics, questions, actions, BA output, runtime, AI, UI and DuckDB remain intentionally untouched.

## Machine Outputs

- `phase-3b2b-selected-resolution-audit.json` contains all 131 selected outcomes, all five original confirmed traces, dominance, debt, conformance and final dispositions.
- `phase-3b2b-counterfactual-audit.json` contains all 20 mutations and deterministic monotonicity results.

## Tests

Verification completed on 2026-07-11:

- Phase 3B2B validation/counterfactual: eight tests passed across two files;
- Phase 3B2A regression: ten tests passed across two files;
- Phase 3B1/3B1.1 regression: eight tests passed across two files;
- Phase 3A/3A.1/3A.2 regression: 37 tests passed across four files;
- Phase 2 profiler/sampler regression: 12 tests passed across two files;
- Phase 1/1B corpus, collision, source and hash checks: 62 tests passed across three files;
- legacy business detector regression: 35 tests passed across three files;
- `npx tsc --noEmit`: passed;
- `git diff --check`: passed;
- full desktop suite, run exactly once at the end: 879 tests passed and nine failed; 103 files passed and four failed.

The nine failures exactly match the documented out-of-scope baseline: three BA comparison timeouts, one guided-investigation failure, three numeric-health failures and two virtual-dataset-planner failures. No Phase 3B2B test failed and no new failure class appeared.

## Rollback

Restore semantic-resolution policy/contracts to v1 and restore v1 independence-family handling. Delete the Phase 3B2B validation/counterfactual tests and three Phase 3B2B reports/audits. Regenerate the previous policy hash. No runtime, database, corpus 1.2.0, registry, relation-policy, source-file, or domain-manifest rollback is required.

## Stop Condition

Phase 3B2B stops after validation and policy freeze. Do not begin grain inference, relationships, domain activation, metrics, questions, actions, BA output, runtime wiring, AI/UI/DuckDB behavior, or Phase 4.
