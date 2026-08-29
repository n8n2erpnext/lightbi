# Phase 0 Semantic and Support Audit

- Date: 2026-07-10
- Scope: architecture and domain-support truth freeze only
- Runtime behavior changed: no
- Machine-readable inventory: `docs/architecture/phase-0-semantic-registry-inventory.json`

## Executive result

LightBI does not currently have one semantic authority. Home builds a legacy guided result and a separate `understanding-core` result for the same dataset. `understanding-next` also remains an independently callable profiler/detector/orchestrator. Support metadata exists in the registry but is not carried into candidates, domain affinity, questions, actions, AI readiness, or runtime guards.

Phase 0 therefore freezes the future authority in `understanding-core`, leaves runtime untouched, introduces an empty support-manifest contract, and records all existing registry entries conservatively. No current registry signal is called `mvp_proven` without Phase 1 acceptance evidence.

## 1. Runtime understanding trace

### Home: legacy guided path

```text
currentDataset columns/profiles
  -> Home.guidedInvestigationResult
  -> runGuidedInvestigationPipeline
  -> detectBusinessSignals
  -> semantic-registry + context-semantic-dictionary
  -> perspective candidates
  -> business-view candidates
  -> question plans
  -> runnable question suggestions
  -> legacy createDatasetUnderstanding
  -> generateAIBriefing (fallback)
```

This path currently owns `activeBusinessViews`, selected views, and legacy question suggestions in Home.

### Home: understanding-core path

```text
currentDataset source/columns/rows/profiles
  -> createUnderstandingCoreInputFromSource
  -> createUnderstandingCoreResult
  -> core column profile + registry-backed ontology/signal engine
  -> core question engine and actions
  -> adaptCoreToUnderstandingNext
  -> UnderstandingNextCard
  -> generateAIBriefingFromUnderstandingNext (primary)
```

The adapter also infers generic domains, legacy grain/document types, lenses, and action compatibility. Those inferences are migration compatibility, not final support truth.

### Understanding Next peer path

`createDatasetUnderstandingResult` remains an independent callable path:

```text
UnderstandingInput
  -> buildDatasetProfile
  -> detectBusinessSignals
  -> inferSemanticDomainAffinities
  -> generateStakeholderFits
  -> generateQuestionFit
  -> createGuardedActions
  -> DatasetUnderstandingResult
```

It is not the current primary Home build, but it is a peer engine with its own profiler, registry projection, supplemental rules, domain affinity, question generation, and action guard.

### Investigation, AI, and runtime

When a user chooses a core/Next-compatible action, Home creates a runtime intent and plan, generates the Next AI briefing when available, persists an Investigation session, and navigates to Investigation. Investigation executes the stored plan through the backend preview executor, permits the JS DuckDB sandbox fallback only for configured narrow cases, validates the result, and derives chart/BA/deep-analysis views.

Separately, the older Home virtual-plan path constructs execution guard, DuckDB logical plan, runtime boundary, expected result, safe SQL, sandbox policy, and a deprecated mock preview runtime. This is another production-reachable execution contract chain, but not another raw semantic detector.

The AI generators consume legacy or Next-shaped understanding objects. They do not receive a canonical domain-support decision and cannot distinguish proven product support from broad registry recognition.

## 2. Registry inventory

| Current field | Count |
|---|---:|
| Total signals | 321 |
| `coverageStatus: supported` | 62 |
| `coverageStatus: partial` | 259 |
| `coverageStatus: advertised_only` | 0 |

Primary generic-domain counts are: operations 78, performance 62, finance 61, inventory 42, customer 41, revenue 35, and core 2. These are ontology labels, not product support declarations.

Phase 0 audit classification is deliberately conservative:

| Phase 0 recognition status | Count | Rule |
|---|---:|---|
| `mvp_proven` | 0 | Requires Phase 1 corpus proof; none is claimed in Phase 0. |
| `experimental` | 62 | Current implicit/explicit `supported` entries. |
| `research_only` | 259 | Current `partial` entries. |

Every canonical ID and its current/provisional status is present in the machine-readable inventory. This classification is audit evidence only; registry code and runtime behavior remain unchanged.

## 3. Normalized collisions

Normalization lowercases, trims, removes Vietnamese diacritics, maps `đ` to `d`, treats `_`/`-` as spaces, and collapses whitespace.

| Collision surface | Distinct normalized aliases with multiple canonical IDs |
|---|---:|
| `aliases` | 58 |
| effective `headerAliases` | 75 |

Representative high-impact collisions include:

- `status` -> `status`, `lead_status`, `ticket_status`;
- `quantity` / `qty` -> `quantity`, `stock_qty`;
- `margin pct`, `margin percent`, `gross margin` -> `margin`, `margin_pct`;
- `courier`, `shipper` -> `carrier`, `driver`;
- `cost` -> `cost`, `spend`;
- `sales` -> `revenue`, `sales`;
- `order qty` -> `order`, `ordered_qty`;
- `channel`, `sales channel` -> `channel`, `sales_channel`;
- `score` -> `quality_score`, `rating_score`;
- `unit` -> `unit`, `uom`;
- `on time` -> `on_time_rate`, `on_time_status`;
- `delivery date` -> `delivery_date`, `report_date`.

The complete collision sets and canonical-ID memberships are recorded in the JSON inventory. No alias was added, removed, or changed.

## 4. Support-gate gaps

Repository search finds `coverageStatus` only in the dictionary contract/declaration outside `semantic-registry.ts`; no consumer uses it as a decision gate. The ignored points are:

1. `context-semantic-dictionary.ts`: entries carry `coverageStatus`, but `ContextSemanticCandidate` omits it and inference iterates the full dictionary.
2. `business-signal-detector.ts`: merges context candidates into legacy signals without support metadata or a support-scope filter.
3. `guided-investigation-pipeline.ts`: creates perspectives, views, plans, and runnable suggestions from detected signals without a support-level gate.
4. `understanding-core/ontology.ts`: projects every registry entry into core rules without carrying `coverageStatus`.
5. `understanding-core/signal-engine.ts`: detects universal signals from those rules without recognition/support status.
6. `understanding-core/question-engine.ts`: creates questions/actions from signal presence and health, not product support truth.
7. `understanding-core/next-adapter.ts`: infers generic domains and ready/partial availability without a domain-support manifest.
8. `understanding-next/signal-detector.ts`: builds rules from all registry entries and supplements them with independent compatibility rules; support status is not propagated.
9. `understanding-next/semantic-domain-affinity.ts`: reads registry domains but not `coverageStatus`, allowing research signals to strengthen generic-domain affinity.
10. `understanding-next/question-fit-engine.ts`: ranks questions from profile/signals without product support status.
11. `understanding-next/runtime-action-guard.ts`: gates only structural requirements and fit score; it does not gate experimental/research signals or domain support.
12. `domain-ba-playbooks.ts` and `domain-knowledge-catalog.ts`: downstream definitions can be selected from detected signal IDs/domains without a canonical support decision.
13. `ai-briefing-generator.ts`: reports semantic fields, readiness, and safe-action hints without a domain-support manifest. Its `coverageStatus` output field describes mapping coverage, not registry product support.
14. Home and Investigation runtime chains: runtime intent/preflight validates fields and plan shape but does not receive registry recognition status or domain-pack activation evidence.

## 5. Frozen domain capability truth

The following is the Phase 0 product boundary to prove. It does not activate the empty manifest.

| Capability | Truth level | Conditions / refusal boundary |
|---|---|---|
| Revenue and sales transactions | `mvp_supported` target | Requires reliable period, monetary/derivable revenue basis, transaction identity, compatible grain, and requested dimensions. |
| Inventory snapshot | `mvp_supported` target | Requires item, stock quantity/value, location where relevant, and period for comparison. No summing duplicated snapshots. |
| Inventory movement | `conditional` | Requires movement time/type, quantity, item identity, and compatible locations. |
| Delivery and operational execution | `mvp_supported` target | Requires shipment/event grain and relevant route/driver/carrier/status/time/SLA evidence. Generic status alone cannot prove on-time performance. |
| Finance and profitability | `conditional` | Requires explicit or derivable aligned revenue/cost/COGS/period/grain. No broad accounting, tax, cash-flow, or reconciliation claim. |
| Customer contribution/repeat purchase | `conditional` | Requires stable customer identity and dated transaction history for repeat behavior. |
| Performance target vs actual | `conditional` | Requires explicit formula-compatible target/actual units and grain. |
| Churn, retention, LTV, generic KPI/score interpretation | `detect_only` | Recognition may be shown; no decision support without a proven pack and definitions. |
| Healthcare, education, HR/payroll, legal, real estate, construction, agriculture, utilities, marketing attribution, IT/logs, maintenance/IoT, nonprofit, manufacturing/QC-specific analysis | `advertised_only` | Research ontology only for MVP; cannot activate recommendations or executable domain support. |

The words `mvp_supported target` mean the roadmap boundary intended for proof, not that current parallel runtime has already passed the release gate. Until corpus acceptance and manifest activation exist, the new manifest remains empty.

## 6. Sample-test gaps

`apps/desktop/src/lib/understanding-next/real-sample.test.ts` contains 40 missing-file silent-pass branches:

- 35 occurrences of `if (!loaded) return`;
- 5 occurrences covering missing `loadedDefault` / `loadedRecovered` variants.

Additional conditional returns can skip assertions when an expected column/signal is absent. Some tests also accept broad alternatives or tautologies, for example a non-empty/boolean existence check, which is not machine-readable ground truth. Phase 0 records these gaps only; changing tests or starting the corpus is Phase 1 and is forbidden here.

`DOMAIN_SAMPLE_MATRIX.md` remains descriptive. It lacks versioned sample IDs, required and forbidden mappings, expected grains, allowed/blocked domain packs, executable action truth, verified answers, held-out designation, and missing-corpus failure policy.

## Required decisions frozen

- `understanding-core` is the only future canonical engine.
- `semantic-registry.ts` owns atomic signals only.
- `understanding-core/domain-support-manifest.ts` owns product support truth.
- Partial/research recognition cannot activate MVP decision support.
- The sample matrix must become machine-readable acceptance evidence.

## Exact Phase 1 file list

Phase 1 should be constrained to this exact list; it is not started by this audit:

1. `sample-corpus/manifest.json`
2. `sample-corpus/ground-truth/revenue-sales.json`
3. `sample-corpus/ground-truth/inventory.json`
4. `sample-corpus/ground-truth/operations-delivery.json`
5. `sample-corpus/ground-truth/finance-accounting.json`
6. `sample-corpus/ground-truth/multi-file.json`
7. `sample-corpus/ground-truth/adversarial-dirty.json`
8. `apps/desktop/src/lib/semantic-registry.test.ts`
9. `apps/desktop/src/lib/semantic-sampler.test.ts`
10. `apps/desktop/src/lib/understanding-next/real-sample.test.ts`
11. `DOMAIN_SAMPLE_MATRIX.md`
12. `docs/architecture/phase-1-corpus-verification.md`

Actual sample binaries may be referenced from their existing local locations or placed under a corpus data directory only when the Phase 1 task explicitly authorizes those paths.

## Phase 0 changed files

1. `docs/adr/ADR-122-canonical-understanding-pipeline.md`
2. `apps/desktop/src/lib/understanding-core/OWNERSHIP.md`
3. `apps/desktop/src/lib/understanding-core/domain-support-manifest.ts`
4. `docs/architecture/phase-0-semantic-registry-inventory.json`
5. `docs/architecture/phase-0-semantic-support-audit.md`

`docs/MVP_sol.md`, runtime code, detectors, aliases, tests, UI, domain playbooks, and legacy modules were not changed.

## Rollback note

Delete the five Phase 0 files listed above. The manifest is empty and unreferenced, so rollback requires no code migration, persisted-data migration, or runtime restoration.

## Stop condition

Phase 0 ends with this audit. Detector implementation, alias changes, corpus creation, test-hardening changes, domain activation, and all Phase 1 work remain intentionally unstarted.
