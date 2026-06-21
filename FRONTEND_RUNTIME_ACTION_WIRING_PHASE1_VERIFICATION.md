# Frontend Runtime Action Wiring Phase 1 — Verification

Date: 2026-06-14  
Status: **Crash blocker fixed at component/contract level; production E2E rerun requires explicit data-egress approval**

## What Was Fixed

`Investigation.tsx` was still rendering legacy AI briefing fields:

```text
trustLevel
trustRationale
grainNote
safeActions
```

The current AI briefing contract exposes:

```text
readinessTier
readinessScore
grainEvidence
caveats
safeActionHints
```

Calling:

```text
aiBriefing.trustLevel.toUpperCase()
```

could crash the Investigation render cycle before the `Run preview` button mounted. This is a plausible direct cause of the real-sample audit blocker:

```text
NO_RUN_BUTTON
```

## Files Changed

```text
apps/desktop/src/pages/Investigation.tsx
apps/desktop/src/pages/Investigation.test.tsx
apps/desktop/src/lib/investigation-session.ts
apps/desktop/audit_real_samples.mjs
```

## Code Changes

1. Replaced legacy briefing field reads with current `AISafeBriefing` fields.
2. Mapped readiness display from `readinessTier`.
3. Rendered caveats/readiness score as rationale.
4. Rendered `grainEvidence`.
5. Rendered `safeActionHints`, with an empty-state fallback.
6. Fixed `investigation-session.ts` to use `AISafeBriefing` instead of the non-exported `AISemanticBriefing`.
7. Added a regression test proving Investigation renders `Run preview` when `aiBriefing` uses the current readiness contract.
8. Updated `audit_real_samples.mjs` to accept `LIGHTBI_AUDIT_DIR` so reruns do not overwrite previous evidence.

## Tests Run

```bash
cd /home/ubuntu/n8n2erpnext/LightBI/apps/desktop
npx vitest run src/pages/Investigation.test.tsx src/lib/ai-briefing-generator.test.ts
```

Result:

```text
2 test files passed
13 tests passed
```

Additional targeted suite:

```bash
npx vitest run src/lib/analysis-opportunity-actions.test.ts \
  src/lib/analysis-runtime-contract.test.ts \
  src/lib/runtime-planner-preview.test.ts \
  src/pages/Investigation.test.tsx
```

Result:

```text
4 test files passed
27 tests passed
```

## Typecheck

Attempted:

```bash
npx tsc -p tsconfig.app.json --noEmit
```

Result:

```text
FAIL
```

The failure is dominated by pre-existing stale contract/test issues across dataset-understanding, dashboard tests, semantic graph, audit runner, and other out-of-scope modules. The targeted runtime-action wiring tests passed.

## Production E2E Rerun

Attempted to rerun:

```bash
LIGHTBI_AUDIT_DIR=/home/ubuntu/n8n2erpnext/LightBI/ui-audit/real-sample-e2e-action-wiring-2026-06-14 \
node apps/desktop/audit_real_samples.mjs
```

In the restricted sandbox, Chromium failed to launch:

```text
FATAL: content/browser/sandbox_host_linux.cc:41
Operation not permitted
```

An escalated rerun was requested, but it was rejected because the audit uploads real logistics sample files to `https://lightbi.thaiduy.digital`, which is treated as external data egress unless explicitly approved by the user.

Therefore, this phase has **not** produced new production E2E evidence yet.

## Current Truth

Correct statement:

```text
The Investigation render crash caused by stale AI briefing fields has been fixed and covered by unit/component tests. Production E2E must still be rerun with explicit approval before claiming NO_RUN_BUTTON is fully eradicated.
```

Incorrect statement:

```text
All real sample files now pass.
```

## Next Required Step

Rerun the real sample E2E audit on VPS Chromium after explicit user approval for uploading the real sample files to:

```text
https://lightbi.thaiduy.digital
```

Expected output directory:

```text
ui-audit/real-sample-e2e-action-wiring-2026-06-14/
```

