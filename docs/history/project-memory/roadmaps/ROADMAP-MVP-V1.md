# LightBI MVP v1 Roadmap

## Purpose
This roadmap exists to prevent drift after quota interruptions, model switches, or long implementation gaps.

It is the operational path to MVP v1.

If the team resumes work later, this file should answer:
- where we are now
- what is already locked
- what comes next
- what must not be reopened

## North Star
LightBI MVP v1 is a **Business Understanding Layer** that helps:

1. **Standard Mode**
   Guide normal users from raw data to understanding, visualization, and decision readiness.
2. **Advanced Mode**
   Help Data Analysts classify and prepare raw data faster.
3. **AI Mode**
   Provide a local-first semantic briefing layer before AI executes user intent.

Target stack:

`Multi Raw Data -> LightBI -> Clean / Prepared Data -> Human Reading / BI / Downstream Analytics`

## Locked Product Truths
These are already decided and must not be reopened casually:

1. LightBI is not a classic dashboard builder.
2. Understanding comes before questions.
3. `0 Questions != 0 Understanding`.
4. Standard Mode is the primary MVP path.
5. Advanced and AI Mode must reuse the same shared Dataset Understanding core.
6. Local-first remains non-negotiable for base understanding.
7. Runtime execution must remain structurally separated from semantic understanding.

Key references:
- [memory.md](../memory.md)
- [ADR-110-mvp-v1-product-modes-and-priorities.md](../../../adr/ADR-110-mvp-v1-product-modes-and-priorities.md)
- [ADR-111-multi-evidence-understanding-engine.md](../../../adr/ADR-111-multi-evidence-understanding-engine.md)

## Current Checkpoint

### Completed
- DU-7J: backend DuckDB preview proven with real CSVs and visible `backend_duckdb_preview`.
- DU-8: dataset-scoped preview execution implemented and concurrency proof achieved.
- Standard / Advanced / AI mode intent documented in `memory.md`.
- MVP product priorities locked in ADR-110.
- Practical algorithm evolution path locked in ADR-111.

### Current known truth
- The execution path is now stronger than the understanding algorithm.
- The next meaningful value is not more chart plumbing.
- The next meaningful value is a stronger shared understanding core.

## MVP v1 Phase Order

### Phase 0: Keep DU-8 stable
Goal:
- prevent regressions in dataset-scoped execution

Must remain true:
- `/api/preview/execute` requires `dataset_id`
- preview execution does not rely on global `current_source`
- Playwright `verify.spec.ts` stays green
- Playwright `concurrency.spec.ts` stays green
- Vitest excludes Playwright specs

Exit criteria:
- `cargo check` passes
- `pnpm test` passes
- `playwright test verify.spec.ts` passes
- `playwright test concurrency.spec.ts` passes

### Phase 1: Multi-evidence signal strengthening
Goal:
- improve `BusinessSignal` quality without changing pipeline shape

Primary files:
- `apps/desktop/src/lib/business-signal-detector.ts`
- possibly nearby tests only

Add first:
- date-like parsing evidence
- low-cardinality status evidence
- numeric/categorical reinforcement
- distinct-ratio hints

Do not do yet:
- LLM-first detection
- new cloud dependency
- second parallel detector architecture

Exit criteria:
- detector tests expanded
- no regression in existing domain coverage
- understanding outputs remain deterministic

### Phase 2: Grain hint in Dataset Understanding
Goal:
- make LightBI answer what one row most likely represents

Primary files:
- `apps/desktop/src/lib/dataset-understanding-contract.ts`
- tests around dataset understanding

Minimum output:
- `event`
- `entity`
- `snapshot`
- `summary`
- `unknown`

Why this matters:
- Standard Mode: better explanation
- Advanced Mode: better prep signal
- AI Mode: safer semantic briefing

Exit criteria:
- grain hint appears in structured understanding state
- tests cover at least delivery + inventory style datasets

### Phase 3: Decision readiness guidance
Goal:
- make Standard Mode clearly state whether data is fit for decision support

Build from:
- dataset health
- understanding confidence
- semantic coverage
- execution reliability

Minimum tiers:
- `>= 90%`: decision-support ready
- `85% - 89%`: reference only / caution
- `< 85%`: exploratory only

Important:
- this is guidance, not fake certainty
- score must be evidence-backed

Exit criteria:
- visible readiness guidance contract exists
- thresholds are documented and testable
- guidance does not pretend to clean data automatically

### Phase 4: Separate capability from opportunity
Goal:
- avoid confusing “can analyze” with “should investigate”

Primary files:
- `dataset-understanding-contract.ts`
- `analysis-opportunity-actions.ts`

Capability examples:
- can trend over time
- can group by warehouse

Opportunity examples:
- should inspect stock aging risk
- should inspect shipment activity by route

Exit criteria:
- code and docs reflect the distinction
- generated actions feel more business-aware, not just structural

### Phase 5: Lightweight Advanced handoff artifact
Goal:
- make Advanced Mode genuinely useful without turning LightBI into a full ETL suite

Minimum artifact should include:
- raw-to-canonical mapping
- field roles
- grain hint
- caveats
- readiness / trust notes relevant to cleaning

Do not do:
- full pipeline builder
- full notebook replacement
- automatic destructive transformation

Exit criteria:
- structured artifact exists
- artifact is derived from shared understanding core
- useful to DA without manual Python for first-pass classification

### Phase 6: AI semantic briefing contract
Goal:
- give AI a local-first semantic briefing before command execution

Minimum AI briefing:
- key semantic fields
- dataset grain
- readiness summary
- caveat summary
- safe action hints

Important:
- AI reads understanding first
- AI does not become the source of truth

Exit criteria:
- structured AI briefing contract exists
- derived from Dataset Understanding, not a separate AI-only pipeline

## Not In MVP v1
These are explicitly out unless re-approved:

1. Full ETL platform ambitions
2. General-purpose BI replacement work
3. Non-CSV connector expansion as a primary focus
4. Cloud-dependent understanding as a requirement
5. Second independent Standard / Advanced / AI architectures
6. Large runtime redesign unrelated to understanding core

## Decision Rule For Any New Task
Before implementing anything, ask:

`Does this strengthen the shared Dataset Understanding core or one of its direct outputs?`

If no:
- it is probably not MVP v1 work

## Resume Protocol
If work resumes after interruption:

1. Read [memory.md](../memory.md)
2. Read [AGENT_HANDOFF.md](../../agent/handoffs/AGENT_HANDOFF.md)
3. Read this roadmap
4. Check whether DU-8 proofs are still green
5. Continue from the earliest incomplete roadmap phase

Do not resume by inventing a new phase from memory alone.

## Immediate Next Step
The next recommended phase is:

`Phase 1: Multi-evidence signal strengthening`

Specifically:
- strengthen `business-signal-detector.ts`
- keep pipeline shape unchanged
- add deterministic tests
- avoid any cloud or LLM dependency
