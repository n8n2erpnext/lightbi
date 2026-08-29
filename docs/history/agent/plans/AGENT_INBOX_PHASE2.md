# AGENT INBOX PHASE 2

## Task
Implement **ROADMAP-MVP-V1 Phase 2: Grain hint in Dataset Understanding** only.

This task must strictly follow:
- `memory.md`
- `docs/architecture/ADR-110-mvp-v1-product-modes-and-priorities.md`
- `docs/architecture/ADR-111-multi-evidence-understanding-engine.md`
- `docs/architecture/ROADMAP-MVP-V1.md`

## Goal
Add a lightweight, deterministic `grainHint` to `DatasetUnderstanding` so LightBI can answer:

`What does one row most likely represent?`

This must improve the shared understanding core without changing runtime execution contracts.

## Architecture Lock
Keep this architecture unchanged:

`DetectorInput -> BusinessSignalRegistry -> DatasetUnderstanding -> Analysis Opportunities -> RuntimeIntent`

Do not redesign the pipeline.
Do not move understanding logic into runtime/execution files.

## Scope Allowed
Primary file:
- `apps/desktop/src/lib/dataset-understanding-contract.ts`

Allowed supporting test files:
- `apps/desktop/src/lib/dataset-understanding-contract.test.ts`
- `apps/desktop/src/lib/dataset-understanding-domain-coverage.test.ts`
- `apps/desktop/src/lib/analysis-opportunity-actions.test.ts`
- other directly-related understanding tests only if required

## Scope Forbidden
Do NOT edit:
- `apps/server/src/main.rs`
- DuckDB runtime / preview execution files
- `apps/desktop/src/lib/backend-preview-executor.ts`
- `apps/desktop/src/pages/Home.tsx`
- `apps/desktop/src/pages/Investigation.tsx`
- chart renderer files
- DU-8 registry logic
- `business-signal-detector.ts` unless a tiny type fix is absolutely required

Do NOT introduce:
- cloud AI / LLM dependency
- second understanding architecture
- runtime redesign
- non-deterministic heuristics

## Required Implementation Direction
Add a first-class structured field on `DatasetUnderstanding`:

```ts
grainHint: "event" | "entity" | "snapshot" | "summary" | "unknown"
```

Implement this as a lightweight derived output using already-detected signals.

### Practical Heuristic Direction
Use simple deterministic rules that fit current supported domains:

1. `event`
   - likely when the dataset has operational activity signals such as:
     - `report_date`
     - `shipment`
     - `route`
     - `driver`
   - especially when time + activity/entity signals coexist

2. `snapshot`
   - likely when the dataset looks like an inventory or point-in-time state view such as:
     - `stock_age`
     - `stock_status`
     - `warehouse`
     - `sku`

3. `entity`
   - likely when the dataset mostly describes entities/records rather than events over time
   - use conservatively; do not over-classify

4. `summary`
   - likely when time exists but row-level activity/entity evidence is weak and the dataset feels aggregated
   - keep this conservative for now

5. `unknown`
   - fallback when evidence is weak or ambiguous

Important:
- Start simple.
- Prefer correctness and determinism over “smart” guessing.
- It is acceptable for MVP v1 to leave many datasets as `unknown`.

## Product Intent Reminder
This work supports all three modes from the same shared understanding core:
- Standard Mode: explain what each row likely represents
- Advanced Mode: help DA understand raw dataset shape faster
- AI Mode: provide safer local-first semantic briefing before action

## Acceptance Criteria
1. `DatasetUnderstanding` exposes a structured `grainHint`.
2. Delivery-style dataset tests prove `grainHint === "event"`.
3. Inventory-style dataset tests prove `grainHint === "snapshot"` or another clearly justified deterministic result.
4. Existing DU and action-generation behavior remains green.
5. No runtime execution contract changes.

## Verification Commands
Run these after implementation:

```bash
cd /home/ubuntu/n8n2erpnext/LightBI/apps/desktop
/home/ubuntu/.npm-global/bin/pnpm exec vitest run src/lib/dataset-understanding-contract.test.ts src/lib/dataset-understanding-domain-coverage.test.ts src/lib/analysis-opportunity-actions.test.ts src/lib/guided-investigation-pipeline.test.ts src/lib/guided-investigation-pipeline.cross-domain.test.ts
```

Then run:

```bash
cd /home/ubuntu/n8n2erpnext/LightBI/apps/desktop
/home/ubuntu/.npm-global/bin/pnpm test
```

Do not claim success unless both commands pass.

## Handoff Requirements
When pausing, update `AGENT_HANDOFF.md` with:
- touched files
- exact `grainHint` shape added
- heuristic rules used
- test results
- whether any existing understanding behavior changed

## Final Reminder
Do not jump to:
- decision readiness guidance
- Advanced handoff artifact
- AI briefing contract
- capability vs opportunity separation

This task is **Phase 2 only**:
- add `grainHint`
- keep scope tight
- keep pipeline shape unchanged
