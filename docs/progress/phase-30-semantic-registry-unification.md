# Phase 30: Semantic Registry Unification

## Status
V1 implemented

## Date
2026-07-04

## Safepoint Before Code

This safepoint is recorded before consolidating scattered semantic architecture.

Known-good verification immediately before this phase:

- `pnpm --dir apps/desktop exec vitest run src/lib/context-semantic-dictionary.test.ts src/lib/business-signal-detector.test.ts src/lib/semantic-coverage.test.ts --reporter=dot` -> 38 tests passed.
- `pnpm --dir apps/desktop exec vitest run src/lib/context-semantic-dictionary.test.ts src/lib/business-fusion-overview.test.ts src/lib/business-brain-brief.test.ts src/lib/understanding-core/understanding-core.test.ts src/lib/understanding-core/next-adapter.test.ts src/lib/understanding-next/understanding-next.test.ts src/lib/semantic-coverage.test.ts --reporter=dot` -> 117 tests passed.
- `pnpm --dir apps/desktop exec tsc --noEmit --pretty false --project tsconfig.app.json` -> pass.

Known-running services at safepoint:

- Frontend: `http://100.94.184.141:5173/`
- Backend health target: `http://127.0.0.1:5172/api/plugins/providers`

## Problem

LightBI has semantic knowledge spread across several files:

- `business-signal-detector.ts`
- `context-semantic-dictionary.ts`
- `understanding-core/ontology.ts`
- `understanding-next/signal-detector.ts`
- `domain-ba-playbooks.ts`
- `domain-knowledge-catalog.ts`
- `home-guidance.ts`

This makes the product vulnerable to drift:

```text
one layer knows a signal
-> another layer does not
-> Simple Mode/AI/BA report becomes blind or inconsistent
```

## Locked Direction

Create one runtime semantic registry for supported BA signals, then derive detector taxonomy and contextual dictionary views from it.

Phase 30 must preserve current stable behavior:

- no sample-file hardcoding;
- no rewrite of Simple/Advanced session behavior;
- no breaking downstream consumers;
- registry drift must be guarded by tests.

## Acceptance

- `business-signal-detector.ts` consumes taxonomy from the central semantic registry.
- `context-semantic-dictionary.ts` consumes dictionary entries from the central semantic registry.
- Context dictionary and runtime taxonomy cannot drift silently.
- Supported BA domains remain explicit.
- Existing Phase 28/29 tests remain green.

## Implementation Notes

### 2026-07-04 Registry Bridge

- Added `apps/desktop/src/lib/semantic-registry.ts` as the runtime source of truth for supported and partial BA signal definitions.
- The registry now owns:
  - canonical ids;
  - primary domain;
  - label;
  - signal type;
  - semantic role/family;
  - support status;
  - header aliases;
  - value aliases and patterns;
  - compatible types.
- `business-signal-detector.ts` now exports `TAXONOMY` from `SEMANTIC_TAXONOMY_V1`.
- `context-semantic-dictionary.ts` now exports `CONTEXT_SEMANTIC_DICTIONARY_V1` from `SEMANTIC_CONTEXT_DICTIONARY_V1`.
- Added `semantic-registry.test.ts` as drift guard:
  - detector taxonomy must be the registry taxonomy view;
  - context dictionary must be the registry dictionary view;
  - supported runtime BA domains remain explicit;
  - every signal referenced by `domain-ba-playbooks.ts` and `domain-knowledge-catalog.ts` must exist in the registry.
- Added partial registry entries for playbook-only or derived signals such as `category`, `channel`, `unit_price`, `storage_cost`, `duration`, `transportation_cost`, `customer_value`, and delta metrics.
- Guardrail: generic aliases such as `category` and `group` are not allowed to become exact alias detector matches without value/context evidence.

Verification:

- `pnpm --dir apps/desktop exec vitest run src/lib/semantic-registry.test.ts src/lib/domain-ba-playbooks.test.ts src/lib/domain-knowledge-catalog.test.ts src/lib/context-semantic-dictionary.test.ts src/lib/business-signal-detector.test.ts --reporter=dot` -> 59 tests passed.
- `pnpm --dir apps/desktop exec vitest run src/lib/semantic-registry.test.ts src/lib/context-semantic-dictionary.test.ts src/lib/business-fusion-overview.test.ts src/lib/business-brain-brief.test.ts src/lib/understanding-core/understanding-core.test.ts src/lib/understanding-core/next-adapter.test.ts src/lib/understanding-next/understanding-next.test.ts src/lib/semantic-coverage.test.ts src/lib/domain-ba-playbooks.test.ts src/lib/domain-knowledge-catalog.test.ts --reporter=dot` -> 140 tests passed.
- `pnpm --dir apps/desktop exec tsc --noEmit --pretty false --project tsconfig.app.json` -> pass.

## Cleanup Completed

- Removed the old copied taxonomy and context dictionary migration references after the registry bridge tests stayed green.

## Follow-up Merge Guardrail

Implemented after the initial V1:

- `understanding-core/ontology.ts` is now a registry-backed adapter instead of an independent semantic owner.
  - Core rules are generated from `SEMANTIC_SIGNAL_REGISTRY_V1`.
  - Legacy core patterns are merged into matching registry-owned IDs for compatibility.
  - Remaining core-only supplemental IDs are explicit and allowlisted.
- `understanding-next/signal-detector.ts` is now registry-backed as well.
  - Registry rules are generated first.
  - Next compatibility rules only supplement unmapped IDs.
- The registry was expanded with the runtime-supported payment, logistics, document, status, fiscal, role, quantity, and engagement signals that were previously scattered across detector layers.
- Guard tests now prove detector taxonomy, context dictionary, understanding-core, and understanding-next all derive supported runtime semantics from the registry.

Verification:

- `pnpm --dir apps/desktop exec vitest run src/lib/semantic-registry.test.ts src/lib/context-semantic-dictionary.test.ts src/lib/business-signal-detector.test.ts src/lib/understanding-core/understanding-core.test.ts src/lib/understanding-core/next-adapter.test.ts src/lib/understanding-next/understanding-next.test.ts src/lib/semantic-coverage.test.ts src/lib/semantic-sampler.test.ts src/lib/ai-briefing-generator.test.ts --reporter=dot` -> 158 tests passed.
- `pnpm --dir apps/desktop exec tsc --noEmit --pretty false --project tsconfig.app.json` -> pass.

## Remaining Architecture Boundary

- No known duplicate semantic source-of-truth boundary remains for supported runtime BA signals.
- Newly recognized partial signals still need dedicated BA playbooks/actions before they should be exposed as fully executable decision angles.
