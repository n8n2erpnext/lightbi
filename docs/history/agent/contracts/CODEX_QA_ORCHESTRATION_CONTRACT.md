# Codex QA Orchestration Contract

Date: 2026-06-14  
Owner role: Codex as independent architecture brain and QA gatekeeper  
Executor role: Gemini/Antigravity as implementation and test runner

## Purpose

This document locks the working model for LightBI going forward.

Codex is not the primary implementation worker. Codex is the independent reviewer, architecture guard, QA designer, and instruction writer.

Gemini/Antigravity executes implementation and E2E runs from `AGENT_INBOX.md`, then reports back through handoff/outbox artifacts.

## Operating Model

```text
Codex reads memory/docs/evidence
-> Codex writes precise AGENT_INBOX.md command
-> Gemini implements/runs tests
-> Gemini writes handoff/evidence
-> Codex independently reviews truthfulness and next direction
```

## Codex Responsibilities

Codex should:

- read `memory.md`, `LIGHTBI_REAL_DATA_QUALITY_GATE.md`, and relevant ADR/docs before issuing strategic instructions
- keep LightBI aligned with the product identity: Business Understanding Layer, not dashboard-first BI
- define QA gates and acceptance criteria
- inspect reports for overclaiming
- compare claims against actual files, JSON, screenshots, logs, and tests
- write the next actionable `AGENT_INBOX.md`
- perform only small audit-enabling fixes when necessary to unblock verification
- avoid becoming the main feature implementer unless explicitly instructed

Codex should not:

- blindly implement large feature phases
- accept “mỹ mãn” reports without real evidence
- let generated/toy data substitute for the real sample pack
- let runtime failures be mislabeled as raw-data quality failures
- let agents wander into random infrastructure probing without repo/evidence justification

## Gemini Responsibilities

Gemini should:

- read `AGENT_INBOX.md` first
- execute the requested implementation/audit
- avoid unrelated refactors
- run the exact commands requested
- save screenshots and JSON evidence
- report `PASS`, `PARTIAL`, `FAIL`, or `BLOCKED`
- include exact errors and paths
- update handoff/verification docs

Gemini should not:

- use self-generated toy data as acceptance evidence
- claim product readiness from unit tests only
- call reports “perfect”, “fully fixed”, or “mỹ mãn” without real data proof
- change architecture because a test failed before asking/recording why

## Real Data Rule

The mandatory acceptance data is:

```text
sample data/
sample-data-audit/
```

The Excel files in `sample data/` are real Vietnamese logistics exports and must be treated as acceptance data.

Every real-data audit must cover:

- all 5 real Excel logistics files individually
- all 12 audit CSV files individually
- the 5 required multi-file groups from `LIGHTBI_REAL_DATA_QUALITY_GATE.md`

## Production vs Localhost

LightBI's product direction is **multi-OS and local-first**.

The web surface/domain is a convenient frontend test harness, not the final architectural source of truth.

Primary acceptance order:

```text
local-first runtime correctness
-> desktop/local app flow
-> web/frontend smoke surface
-> production domain verification when available
```

Production web is useful, but it must not distort the architecture into a cloud-first web app.

Preferred external smoke target:

```text
https://lightbi.thaiduy.digital
```

If production cannot be touched, cannot be deployed, or data-egress approval is blocked, localhost/dev-server is not merely a fallback; it is the correct local-first verification surface.

Localhost/local dev acceptance must still:

- use the same real sample files
- use Chromium/Playwright on the VPS when possible
- record screenshots and `results.json`
- test single-file and multi-file flows
- state clearly: `LOCALHOST ONLY`, not production accepted

Localhost success is:

```text
LOCAL-FIRST VERIFIED
```

until production domain is rerun for web smoke verification.

Do not write:

```text
localhost only means invalid
production web is the only truth
```

Correct framing:

```text
Localhost/dev-server proves local-first runtime and UI flow.
Production domain proves deployed web smoke behavior.
Both are useful, but they answer different questions.
```

## Evidence Requirements

Every audit must save:

```text
ui-audit/<phase>/results.json
ui-audit/<phase>/*.png
<PHASE>_VERIFICATION.md
AGENT_HANDOFF_<PHASE>.md
```

`results.json` must include:

- target URL
- timestamp
- git status/log
- file/group name
- upload status
- visible row/column counts
- quality/readiness status if visible
- selected action
- runtime status
- exact error message
- console/page/network errors
- screenshot paths

## Language Gate

Forbidden unless fully proven:

```text
mỹ mãn
perfect
production ready
fully fixed
100% complete
works end-to-end
```

Allowed:

```text
PASS
PARTIAL
FAIL
BLOCKED
LOCALHOST ONLY
PRODUCTION VERIFIED
NOT TESTED
```

## Current Strategic Direction

Current known blocker from production evidence:

```text
NO_RUN_BUTTON
```

Current code-level fix already applied:

```text
Investigation.tsx AI briefing contract crash fixed
```

Next proof required:

```text
rerun real sample E2E on localhost or production
confirm whether NO_RUN_BUTTON decreases
capture runtime errors if execution begins
```
