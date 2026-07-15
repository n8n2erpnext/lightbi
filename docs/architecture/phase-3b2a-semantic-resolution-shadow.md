# Phase 3B2A Semantic Resolution Shadow Verification

- Date: 2026-07-11
- Scope: Phase 3B2A only
- Owner: `understanding-core`
- Production wiring changed: no
- Phase 3B2B or Phase 4 started: no

## Objective And Result

Phase 3B2A adds a deterministic shadow resolver that converts the unchanged Phase 2 physical artifact, Phase 3A candidate artifact, and Phase 3B1.1 contextual artifact into conservative semantic states. It does not alter candidate generation, registry aliases, contextual relations, corpus 1.2.0, runtime behavior, UI, AI, BA, DuckDB, domains, metrics, questions, or actions.

The resolver prioritizes abstention. Unknown and ambiguous are valid outcomes. It does not require a minimum confirmed count and makes no semantic-accuracy or `mvp_proven` claim.

## Contracts

`semantic-resolution-contracts.ts` defines versioned resolution artifacts, column states, candidate traces, evidence-independence assessments, partial-order dominance, limitations, and candidate-absence debt. Every candidate trace embeds the complete Phase 3B1.1 evidence profile.

The artifact records source identity/hash, all upstream artifact versions, registry version, aggregation policy identity, resolution policy identity, complete physical-column coverage, candidate-preservation proof, limitations, debt, and `productionWiring.executed: false`.

## Policy And Decision Lattice

Policy version is `lightbi.semantic-resolution-policy.v1`. SHA-256 over canonical policy JSON is `03760815ec922ab0a24469d559402ba4a24c379d665c6926b48cf87a2827450a`.

Resolution uses explicit ordered rules, not a weighted score. Technical and unsupported observations are preserved first. No candidate and weak-only evidence abstain. Material conflicts block selection. Multiple incomparable candidates remain ambiguous. Probable requires one viable exact candidate and an independent non-lexical family. Confirmed additionally requires two independent non-lexical families, full-file physical/cardinality corroboration, no material conflict, no unresolved collision, no competitor, and no high-impact structural limitation.

Lexical classes distinguish canonical ID, canonical label, header alias, alias, token containment, value-only, and no lexical evidence. Containment, representative values, generic physical compatibility, absence of conflict, and context alone cannot confirm or become probable.

## Independence And Anti-Circularity

Evidence remains visible while correlated contributions are separated from independent contributions. The policy identifies repeated header surfaces, repeated representative-sample evidence, lexical-only sibling reuse, mutual sibling support, shared collision surfaces, duplicate physical facts, and repeated relation classes.

One relation class contributes at most one contextual family. Mutual weak candidates cannot bootstrap one another. Context corroborates only when an endpoint already has independent non-contextual support. Technical and structural conflicts are not canceled by unrelated support.

## Dominance

Dominance is a partial order, never a total ranking. Candidate A can dominate B only with a strict independent-support superset, no worse material conflict, equal-or-stronger lexical class, no more severe limitations, and a decision not caused by context alone. Incomparable candidates remain viable and force ambiguity. Candidate output order remains Phase 3A order.

## Candidate Absence

All 14 governed debt records are carried: four required gaps and ten contextual gaps. Nine directly match a physical column in the per-source resolution runs; the remaining five remain visible at artifact level. Absence never becomes rejection or support and can force unknown/ambiguity or block confirmation.

## Shadow Expectations

`sample-corpus/shadow-resolution-expectations.v1.json` is independent of corpus 1.2.0 recognition truth. It governs conservative state permissions, forbidden states, evidence/provenance requirements, structural limitations, confirmation permission, tuning provenance, and reason codes. Only synthetic/golden records may guide policy. Holdout, adversarial, and multi-file cases are evaluation-only.

Mandatory probes include exact lexical classes, containment/value-only evidence, all collisions, generic and delivery status, opaque headers, contextual fields, technical columns, mixed/parse-conflicted columns, unsupported columns, and absence debt. Real mandatory physical columns from the corpus are asserted present.

## Diagnostics

Across 30 cases there are 752 physical-column resolutions: five confirmed, 126 probable, 401 ambiguous, 219 unknown, one technical, and zero unsupported input. By group:

| Group | Confirmed | Probable | Ambiguous | Unknown | Technical |
|---|---:|---:|---:|---:|---:|
| Golden | 2 | 24 | 72 | 54 | 0 |
| Holdout | 3 | 45 | 146 | 82 | 0 |
| Adversarial | 0 | 3 | 15 | 53 | 1 |
| Multi-file | 0 | 54 | 168 | 30 | 0 |

All 1,223 input candidates have one output trace with complete evidence and stable order. Candidate dispositions are 131 selected, 302 viable, 566 insufficient, 179 materially conflicted, 44 correlated-only, and one dominated. Selection uses canonical-ID exact evidence 93 times and header-alias exact evidence 38 times; no containment-only or value-only candidate is selected.

There are 588 profiles with explicitly correlated evidence, 59 selected results with independent contextual corroboration, 146 columns carrying material candidate conflict, nine columns directly affected by debt, and one deterministic dominance. All 84 header-only collisions remain ambiguous. All 18 broad-candidate occurrences remain ambiguous with no forced selection.

These are behavior diagnostics, not semantic accuracy measurements.

## Determinism And Isolation

Tests cover canonical byte stability under evidence order changes and duplicate evidence, stable candidate order, relation deduplication inherited from Phase 3B1.1, canonical SHA-256 stability under key order, mutation sensitivity, complete column coverage, and fail-closed source/hash/version/registry/policy/column/candidate checks. Canonical output contains no generated timestamp, path, environment, locale, or machine-specific field.

The only public exports are explicit canonical shadow contracts/policy/resolver exports. Search found no production consumer. `DOMAIN_SUPPORT_MANIFEST` remains empty.

## Limitations

- Resolution quality remains bounded by Phase 3A candidate coverage.
- Context support proves compatibility, not semantic correctness.
- Candidate absence prevents certainty but cannot identify the missing semantic definition.
- The inspected validation corpus is not a fresh unseen holdout.
- Grain, relationships, domains, business processes and execution readiness remain intentionally unavailable.

## Files Changed

Phase-owned additions are `semantic-resolution-contracts.ts`, `semantic-resolution-policy.ts`, `semantic-resolver.ts`, their two test files, `sample-corpus/shadow-resolution-expectations.v1.json`, this report, and `phase-3b2a-resolution-audit.json`. The canonical index and ownership table expose/classify the shadow modules. No upstream detector, registry, relation policy, corpus 1.2.0 truth, runtime, UI, AI, BA, DuckDB, or domain-support file was changed for this phase.

## Tests

Verification completed on 2026-07-11:

- Phase 3B2A targeted: nine tests passed across two files;
- Phase 3B1/3B1.1 regression: eight tests passed across two files;
- Phase 3A/3A.1/3A.2 regression: 37 tests passed across four files;
- Phase 2 profiler/sampler regression: 12 tests passed across two files;
- Phase 1/1B corpus, collision, source and hash verification: 62 tests passed across three files;
- legacy business-signal detector regression: 35 tests passed across three files;
- `npx tsc --noEmit`: passed;
- `git diff --check`: passed;
- full desktop suite, run exactly once at the end: 870 tests passed and nine failed; 101 files passed and four failed.

The nine full-suite failures are the exact documented baseline: three BA comparison timeouts, one guided-investigation failure, three numeric-health failures, and two virtual-dataset-planner failures. No Phase 3B2A test failed and no new failure class appeared.

## Rollback

Delete the three semantic-resolution modules, two resolution tests, the shadow-expectation file, this report and the machine audit; remove the three shadow exports and ownership rows. No runtime, database, registry, corpus 1.2.0, source file, or domain manifest rollback is required.

## Stop Condition

Phase 3B2A stops after deterministic shadow resolution and verification. Do not begin Phase 3B2B, grain inference, relationships, domain activation, metrics, questions, actions, BA output, runtime wiring, AI/UI/DuckDB work, or Phase 4.
