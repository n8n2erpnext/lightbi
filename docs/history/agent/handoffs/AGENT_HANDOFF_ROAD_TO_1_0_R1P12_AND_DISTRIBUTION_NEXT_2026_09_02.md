# Road-to-1.0 R1-P12 + Distribution NEXT Handoff

Status: historical
Date: 2026-09-02
Scope: Session continuity for the active R1-P12 anti-impersonation audit and the Distribution NEXT dynamic-data regression.
Supersedes: none
Superseded by: none
Primary sources: ../../../architecture/road-to-1-0-trust-release-contract.md, ../../../project-book/LIGHTBI_PROJECT_BOOK.md, ../../../project-book/LIGHTBI_CONTROL_PLANE_MAP.md, ../../agent/plans/AGENT_PLAN_CLI_LIGHTBI_SIGNER_OPERATOR_CONSOLE.md

## Purpose

Preserve the exact execution position after deep repository/runtime reconciliation so the next agent does not infer state from stale worktrees or screenshots.

## Starting state

- Authoritative continuity worktree for Road-to-1.0/CLI docs: `LightBI-docs-cli-lightbi` on `docs/cli-lightbi-signer-plan-20260902`.
- Its micro-checkpoint records R1-P11 NEXT rehearsal PASS and R1-P12 active.
- Separate `LightBI-docs-cleanup` worktree has 13 unrelated dirty README/catalog files; do not conflate those with the 8 R1-P11 closure files in the CLI docs worktree.
- Production remains untouched and blocked before Production R1-P6 by missing explicit owner freeze at R1-P5.
## Verified current position

- `cli-lightbi` Phase A is closed at source `86512968d02ceca91c3292bb8a8648275ce60a22`; installed binary SHA-256 `ee2f65c5a80e64bae49ac190be52ac5cab3e35d9d3da23a6fc5bbf58f919a7b6`.
- CLI Phase B/C/D, operator MFA and mutation helpers remain unauthorized.
- R1-P11 NEXT private Pro delivery rehearsal is closed at `deda7c284a6eafaa8cb69d491b96476a025ed15c`; wrong-device and replay probes fail closed.
- Active app runtime remains NEXT-029, runtime core `b3ada6776417fdb422e7e852b6f4363b328ab650`, CP runtime `6936fc4272bc92cd1badc00b9256cfd912e4a9ad`, exact Trust contracts `10de4da8e551a46f93f7b62985a0a6e611581b8e`.
- R1-P12 is the active Road-to-1.0 step. OS publisher signing/notarization is a separate trust plane and must not be represented as satisfied by LightBI REL/ATT or manifest SHA verification.

## Distribution NEXT regression

Fresh Chromium reproduction at 412×915 and 1440×1000 shows the same failure: hero raw source rows and ranked evidence remain empty.

The failure is not a mobile CSS layout issue. Browser module evaluation aborts with:

`SyntaxError: './admin-security.js' does not provide an export named 'adminStrongMutation'`
`apps/distribution/src/web/admin-security.ts` exports `adminStrongMutation`, but the checked-in/generated `apps/distribution/public/admin-security.js` does not. Since `app.js` imports that symbol, the whole public module graph aborts before `initHeroDemo()` runs. Desktop sessions that still look correct are consistent with stale browser module cache.

## Exact next actions

1. Finish/reconcile the 8 existing R1-P11 closure docs in `LightBI-docs-cli-lightbi`; preserve the separate 13-file docs-cleanup worktree.
2. Refresh source catalog after this handoff and run librarian/link/diff checks before committing documentation.
3. Fix the Distribution NEXT generated web-module boundary in a source worktree descended from P11, then run web type/build/tests plus fresh mobile and desktop headless probes.
4. Deploy/restart only the NEXT Distribution runtime after gates pass. Do not mutate Production.
5. Continue R1-P12 anti-impersonation audit after the web regression is closed; do not claim `official_verified` without the evidence required by the canonical Trust contract.

## Boundaries

This handoff is continuity evidence only. It does not grant Production freeze, CLI Phase B/C/D authority, or platform publisher trust.

## Session update — Distribution NEXT regression closed

A P11-descended private source branch `codex/next032-distribution-module-fix` was created from `deda7c284a6eafaa8cb69d491b96476a025ed15c`. Running the governed web build regenerated the stale browser modules; commit `9f0255c` contains only `public/account-security.js`, `public/admin-security.js`, and `public/marketing-admin.js` synchronization.

Distribution authoritative suite passes **197/197** after the root workspace build. The three generated modules were copied only into `/home/ubuntu/services/lightbi-control-plane-next/apps/distribution/public`; Production was not modified and no Trust service was restarted.

Fresh cache-busted Chromium verification passes at both 412×915 and 1440×1000: ranked evidence has 3 rows, visible source data has 7 tokens, WHAT renders `₫82.1M`, and there are zero page errors. The reported mobile blank-data regression is therefore closed on NEXT.

`cli-lightbi` remains installed at `~/.local/bin/cli-lightbi` → `/home/ubuntu/services/cli-lightbi/current/bin/cli-lightbi`, SHA-256 `ee2f65c5a80e64bae49ac190be52ac5cab3e35d9d3da23a6fc5bbf58f919a7b6`. `doctor` is fully green; Phase A remains read-only and Phase B/C/D remain unauthorized.
