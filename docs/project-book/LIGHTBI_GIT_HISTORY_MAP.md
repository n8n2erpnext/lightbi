# LightBI Git History Reconciliation

> Edition 0.4 repository-history map. This document reconciles the archived development lineage, the deliberately re-rooted public `main`, release tags, backup branches, PR history, and the dirty Beta-recovery worktree.

**Audit date:** 2026-08-30
**Public repository:** `n8n2erpnext/lightbi`
**Public default branch:** `main`
**Public main at audit:** `466898372fcf3869ae10140cafce83bf57c5d392`
**Archive branch at audit:** `storage` → `87dce4dd5e2cdbe964789696946760a43f974e08`
**Recovery branch at audit:** `codex/beta-recovery-20260801` → `0142e92c75e9fd3e190f82fe2a67cf255180cfca`

## 1. Scope and authority

This phase answers questions that the documentation and Code Map could not answer alone:

- which architecture closures have actual remote commits;
- why `storage`/recovery history and public `main` do not share ancestry;
- which backup branches are historical bookmarks rather than parallel product branches;
- which release tags point to which exact commits;
- which public-era account/update/distribution capabilities were committed, later moved, or removed;
- which dirty VPS files are already represented by public Git history;
- which current branches are safe historical references versus current product truth.

Git history establishes repository provenance. It does **not** by itself prove CI success, deployment state, or control-plane runtime truth; those remain later audit phases.
## 2. The repository has two intentional lineages

The key reconciliation is that LightBI history was deliberately re-rooted when the clean public repository was published.

```text
historical/internal archive lineage
6145017 ... → 522c019 → ... → 87dce4d → 0142e92
                               │
                               └─ source snapshot / sanitize / publicize

public clean lineage
b10f8d0 (root commit, no parent) → ... → 28e2aae → ... → c06ef00 → 4668983
```

GitHub confirms `b10f8d0034735adc267a299ae6a30f854505b397` has **no parents**. It is therefore a real root commit, not a normal descendant of the archive lineage.

GitHub also confirms `0142e92c75e9fd3e190f82fe2a67cf255180cfca` has parent `87dce4dd5e2cdbe964789696946760a43f974e08`.

Therefore `git compare` correctly reports no common ancestor between `codex/beta-recovery-20260801` and public `main`. This is expected repository design, not corruption or lost product history.
## 3. Public root is a sanitized snapshot, not a rewrite

A direct tree comparison between archive tip `87dce4d` and public root `b10f8d0` proves that product source was preserved almost byte-for-byte while historical/internal material was removed from the public snapshot.

| Surface | Archive files | Public files | Common | Byte-identical | Changed | Removed | Added |
|---|---:|---:|---:|---:|---:|---:|---:|
| `apps/desktop/src/` | 521 | 521 | 521 | **521** | 0 | 0 | 0 |
| `apps/server/src/` | 5 | 5 | 5 | **5** | 0 | 0 | 0 |
| `packages/` | 33 | 33 | 33 | **33** | 0 | 0 | 0 |
| `scripts/` | 5 | 5 | 5 | **5** | 0 | 0 | 0 |
| `crates/` | 130 | 131 | 130 | **128** | 2 | 0 | 1 |
| `docs/` | 676 | 3 | 0 | 0 | 0 | **676** | 3 |
| whole tree | 1,799 | 834 | 821 | **814** | 7 | 978 | 13 |

The seven changed common files were packaging/release configuration surfaces: `.gitignore`, `CHANGELOG.md`, `Cargo.lock`, `apps/desktop/package.json`, `crates/lightbi-tauri/Cargo.toml`, `crates/lightbi-tauri/tauri.conf.json`, and root `package.json`.

Public-only additions included CI/release workflows, public README/CONTRIBUTING/SECURITY material, screenshots, a Windows Tauri config, and three compact public docs.

**Repository-history conclusion:** publicization reset commit ancestry and removed the internal documentation corpus, but did not replace the LightBI product implementation.
## 4. Archive lineage roles

At audit time the remote archive topology is best read as a historical library, not a set of pending feature branches.

- `origin/storage` contains 122 commits from 2026-06-09 through 2026-08-13.
- `origin/codex/beta-recovery-20260801` contains 123 commits and is exactly `storage` plus the AGPL `LICENSE` commit `0142e92`.
- Most `origin/backup/pre-*` and `origin/backup/post-*` refs from July/August point to commits already contained in `storage`.
- Those backup refs are durable bookmarks around risky changes; they are not merge obligations.
- `codex/lightbi-beta-native-20260729` is also already contained in `storage`.
- `codex/single-ba-backup-20260801` is an alternate archive fork from `da23740`, so it must be treated as a preserved branch of experimentation, not as missing work from `storage`.

Examples of bookmark semantics:

| Branch | Commit | Historical meaning |
|---|---|---|
| `backup/pre-beta-realignment-20260729` | `c84605c` | pre-Beta realignment checkpoint; also bundled 8F1/8F2 evidence |
| `backup/pre-ba-dashboard-alignment-20260813` | `56d35fc` | before later BA/dashboard alignment |
| `backup/pre-multifile-step2-20260813` | `9c7a5f5` | before governed multifile deep analysis step |
| `backup/pre-single-period-multifile-ba-20260813` | `9c6c30c` | before final single-period multifile fix |
| `backup/pre-public-main-20260813` | `7813c80` | archive checkpoint before public repository publication |
| `backup/pre-public-storage-20260813` | `522c019` | canonical-pipeline checkpoint retained as a named bookmark |
## 5. Historical architecture timeline from Git

The archive lineage records the actual sequence behind the documentation corpus.

### 5.1 June foundation and Understanding reset

Early commits establish the real progression from understanding-first analysis into governed execution:

- `764f5d8` — understanding-first checkpoint before domain coverage fixes;
- `bf5fba5` — real-file validation of the understanding-first preview pipeline;
- `799143d` — runtime execution-boundary audits;
- `cb04fc6` — Phase 0+1 checkpoint;
- `e2ba8d9` — Phase 2 grain hint;
- `ab6970c` — Phase 3 readiness guidance;
- `a3b1996` — Phase 4 capability/opportunity separation;
- `80f2d3b` — Phase 5 Advanced handoff artifact;
- `b7773df` — Phase 6 AI semantic briefing contract;
- `6847044` and follow-up corrective commits — guarded SUM moves validation into DuckDB execution behavior.

These commits are repository evidence that “Understanding First” and trust/readiness were implemented as code evolution, not added later only as documentation language.

### 5.2 Canonical authority migration

`522c019` (`feat: establish canonical understanding pipeline through phase 6b`) is the major authority-migration commit. It introduces/expands canonical consumer, governed metric, governed action, runtime preflight, grain/readiness, domain support, comparison/replay, and ownership surfaces in one large checkpoint.
### 5.3 Phase 7 release-proof era

The next major checkpoints are:

- `bbb9b99` — packages the MVP release candidate and contains several Phase 6B/7R3 closure documents;
- `a83f168` — Phase 7R4 verification evidence;
- `1180306` — repository-safe acceptance corpus;
- `61e6052` — closes Phase 7R4.1 verification.

This is the point where repository-safe reproducibility and acceptance corpus behavior become explicit release concerns rather than only implementation concerns.

### 5.4 Phase 8 production boundary sequence

The Git sequence matches the phase ordering in the architecture library:

- `a6a13e3` — Phase 8A full-source canonical boundary;
- `000f0c8` — Phase 8B source-bound evidence interaction;
- `788b277` — Phase 8C blocker-remediation UX;
- `eb93cef` — canonical multi-source production flow / Phase 8D.1 core;
- `7bab14a` — Phase 8D.1 checkpoint closure document;
- `1ebf60b` — Phase 8E code separation without intended behavior change;
- `b031c2a` — Phase 8E final checkpoint;
- `879592e` — core UI functional parity;
- `c84605c` — pre-Beta realignment snapshot containing later 8F1/8F2 closure/evidence work.
## 6. Architecture closure documents ↔ actual commits

The following closure files are confirmed in remote Git history. “Bundled” means the closure first appears inside a broader checkpoint commit rather than a dedicated one-purpose commit.

| Closure family | Git commit | Reconciliation |
|---|---|---|
| Phase 5B1 / 5M4 | `522c019` | committed with canonical pipeline migration |
| Phase 6B1 | `bbb9b99` | committed with MVP RC packaging |
| Phase 7R3.1 / 7R3.2 / 7R3.6 / 7R3.7 | `bbb9b99` | bundled in RC checkpoint |
| Phase 7R4 | `a83f168` | dedicated verification evidence commit |
| Phase 7R4.1 | `61e6052` | dedicated closure commit |
| Phase 8A | `a6a13e3` | dedicated implementation/closure commit |
| Phase 8B | `000f0c8` | dedicated implementation/closure commit |
| Phase 8C | `788b277` | dedicated blocker-remediation closure |
| Phase 8D / 8D.1 production multi-source | `eb93cef` | implementation and production closure |
| Phase 8D.1 final checkpoint | `7bab14a` | dedicated docs checkpoint |
| Phase 8E code separation | `1ebf60b` | large refactor + architecture evidence |
| Phase 8E final checkpoint | `b031c2a` | committed final checkpoint record |
| Phase 8F core/UI parity | `879592e`, later updated in `c84605c` | committed, then amended by pre-Beta realignment |
| Phase 8F1 ready/runtime continuity | `c84605c` | **bundled** into pre-Beta realignment checkpoint |
| Phase 8F2 multifile parity | `c84605c` | **bundled** into pre-Beta realignment checkpoint |

No closure in this table is merely an unpushed local document. All are reachable from the remote archive lineage.
## 7. Late archive / Beta-recovery evolution before publicization

After the formal Phase 8 closures, the archive lineage continued to harden real product behavior rather than stopping at a frozen MVP.

Important checkpoints include:

- `7bdcaf2` — governed multi-source perspectives in Easy Mode;
- `c734d93` — native Beta sidecar/local runtime work;
- `6a8489e` + `ae31f3d` — governed BA deep-dive and runtime;
- `76fd77e` — Easy Mode handoff + Beta localization;
- `824d972` — embeds the native API in the LightBI process;
- `35cb097` → `d97608e` — Beta recovery run, execution continuity, BA/chart/dashboard alignment;
- `d6ccb59` + `0bec786` + `7813c80` — consolidated Beta recovery/localized governed workflow;
- `53db01b` / `56d35fc` — source-column-bound composable drill-through;
- `d023e53` — governed multi-sheet dirty workbook intake;
- `b638189` / `87236e1` / `9a59962` / `c5c00f4` — filtered Deep BA, evidence investigation, Vietnamese presentation, localized restrictions;
- `9c7a5f5` / `9c6c30c` / `87dce4d` — broader semantic coverage and governed single-period multifile analysis.

This late archive work is the direct product source that was sanitized into public root `b10f8d0` twenty-one minutes after `87dce4d`.
## 8. Public `main` timeline after re-root

Public `main` contains 59 commits at this audit and should be read in release eras rather than as continuation of archive commit ancestry.

### 8.1 2026-08-13 — clean public Beta foundation

- `b10f8d0` — root commit: public v0.9.0 Beta repository snapshot;
- `671eb5d` — dependency hardening + BA showcase;
- `5d29f5b` — package-version synchronization;
- `3c3bc38` — removes vulnerable Rust dependency paths;
- `ca68718` — fixes native release command paths;
- `b4b38cd` — completes SQLx 0.9 migration for Beta 6.

### 8.2 2026-08-20 — native SQL Server and Beta 7

- `92630c0` adds native SQL Server support and materially broadens semantic coverage across Advanced/server/plugin/Tauri/corpus surfaces;
- `beae728` fixes database inspection for insecure origins;
- `c92dca6` ships the Beta 7 semantic + distribution stack, including database snapshot, semantic capability matrix, pairing, Settings integration, and the public distribution application;
- `bdc609b` removes obsolete SQL Server rustls dependency paths.
### 8.3 2026-08-22/23 — public distribution, telemetry, account/admin, post-edit handoff

The public repository then temporarily owned the distribution/control-plane implementation directly.

- `109d145` / `d206620` — canonical portal URL and hardened media delivery;
- `6b36d1e` / `c20ee35` / `0f57a97` — privacy-safe distribution analytics and dashboarding;
- `dd09fc0` — database admin + Pro revenue console;
- `8e6ff9c` — decouples portal and desktop versions;
- `0b63163` — governed app telemetry + license operations;
- `3dadf08` + `1b69c6a` — returns edited Advanced sources to Easy analysis through a governed handoff.

This proves that account/distribution/telemetry work seen as untracked from the recovery branch is **not globally “never committed.”** Some of it became public-main product history before the later control-plane split.

### 8.4 2026-08-24 — Advanced IDE, persistence, R2 releases, accounts and native updater

Key commits:

- `70d671c` — local Monaco SQL workspace;
- `c363eab` — durable source and connection history;
- `872194d` — manifest-driven R2 releases;
- `a9d30ca` — verified accounts and native updater integration;
- `9f25742` — account menu/admin access controls;
- `bc7d46c` — Debian release pipeline;
- `917a926` / `e0cf5fb` — R2 release-storage validation and secret normalization;
- `18c3199` — rate limits account email actions.
### 8.5 2026-08-26/27 — staged updater and 0.9.2 Beta 7 release

- `a9d97cd` is the major updater lifecycle commit: staged background download, checksum verification, explicit user-facing ready/install states, native staging logic, and regression coverage;
- `5884595` prepares the 0.9.2 Beta 7 updater/release state;
- `969fb56` restores durable local analysis workflows;
- `d6b17a4`, `779a3c3`, `5d88b4e`, `0702c70`, `653122e` harden public distribution behavior and presentation;
- `28e2aae` finalizes the 0.9.2 Beta 7 release audit;
- PR #2 adds AGPL-3.0 via `788a9ce`, merged as `134a7b7`.

This Git evidence corrects one Code Map limitation: staged updater and native account/update commands are committed public-main history, even though the recovery worktree represented related files as dirty/untracked relative to `0142e92`.

### 8.6 2026-08-28/29 — control-plane separation and trust-contract branch

- `bf21b2b` documents the 1.0 control-plane boundary;
- `66d84ee` extracts the public Basic release-manifest contract;
- `75cc096` records the private control-plane cutover;
- `99e42bd` removes `apps/distribution`, production distribution service/compose definitions, and their dependencies from the public tree;
- `cfaf579` hardens the public-boundary guard;
- PR #3 merges these changes as `c06ef00`;
- PR #5 adds the separate unsigned universal macOS Beta workflow, merged as current main `4668983`.
## 9. Release tags are exact repository checkpoints

The annotated tags peel to these commits:

| Tag | Commit | Meaning |
|---|---|---|
| `v0.9.0-beta.2` | `b10f8d0` | public root snapshot |
| `v0.9.0-beta.3` | `671eb5d` | hardened BA/release snapshot |
| `v0.9.0-beta.4` | `3c3bc38` | Rust dependency hardening |
| `v0.9.0-beta.5` | `ca68718` | native release path fixes |
| `v0.9.0-beta.6` | `b4b38cd` | SQLx 0.9 migration complete |
| `v0.9.0-beta.7` | `bdc609b` | SQL Server/Beta 7 release line |
| `v0.9.1-beta.7` | `1b69c6a` | post-edit Easy handoff fix included |
| `v0.9.2-beta.7` | `28e2aae` | staged updater + cross-platform release audit |

The GitHub release for `v0.9.2-beta.7` is a prerelease with Windows x64 NSIS and Debian/Ubuntu amd64 artifacts plus SHA-256 files.

Tags must be preferred over a release page's `target_commitish: main` field when answering “what exact source built this version?” because the annotated tag object names the precise commit.
## 10. Pull-request history at audit

The public repository exposes four relevant PRs in the current history window:

| PR | State | Head | Base at creation | Result |
|---|---|---|---|---|
| #2 — AGPL-3.0 license | merged | `788a9ce` | `28e2aae` | merged as `134a7b7` |
| #3 — Phase 0–1 control-plane separation | merged | `cfaf579` | `653122e` | merged as `c06ef00` |
| #4 — Phase 2A public trust contracts | **open draft** | `d17abe0` | `c06ef00` | not merged |
| #5 — unsigned universal macOS Beta | merged | `42b09e3` | `c06ef00` | merged as `4668983` |

PR #4 remains intentionally draft. Its branch adds the public Phase 2A trust-contract implementation and tests, but it does not change the released product version or create a release.

Because PR #5 landed after PR #4 branched, GitHub currently reports the trust-contract branch as diverged from `main`: one trust-contract commit ahead and the macOS merge one commit behind, with merge base `c06ef00`.

The external Phase 2 handoff's `c06ef003...` base and `d17abe0...` audit-candidate SHA are therefore verified against GitHub history. GitHub currently shows no submitted PR review comments or review objects for PR #4.
## 11. Local branch names are not reliable current-truth labels

The VPS contains local branch names that predate the public-history reset. Future agents must not infer authority from the branch name alone.

At audit:

- local `main` points to historical commit `879592e` while `origin/main` points to public commit `4668983`;
- local `main` is reported as `ahead 54, behind 59` relative to `origin/main` because the two sides belong to different ancestry roots;
- this is **not** a normal fast-forward situation and must never be “fixed” by an automatic merge;
- local `public-main` worktree points to `b4b38cd` (Beta 6) and has no evidence of being the current default branch;
- current public repository truth is `origin/main` / GitHub `main`, not the local branch name `main`;
- current archive truth is `origin/storage` plus explicitly named backup/codex refs.

Safe rule: resolve a branch to its SHA and lineage before using it as architecture or release authority.
## 12. Dirty Beta-recovery worktree reconciled against public Git

The original VPS worktree is intentionally on `codex/beta-recovery-20260801`, so `git status` there measures changes relative to archive HEAD `0142e92`, **not** relative to current public `main`.

At this audit the worktree exposes 114 status paths. Comparing each file's current blob to `origin/main` produces:

- 20 files exactly equal to current public `main`;
- 73 files present on `main` but with different current contents;
- 17 files absent from current public `main`;
- 4 untracked directories requiring directory-level classification.

Exact public-main matches include `apps/server/src/advanced.rs`, `apps/server/src/advanced_workspace.rs`, `api-base.ts`, `useLightBIAccount.ts`, `database-runtime-snapshot.ts`, semantic capability/corpus files, `packages/core-types/src/release.ts`, and several package manifests.

This proves that a dirty/untracked marker on recovery branch does not imply “never committed anywhere.” It often means public-era work is present in a worktree whose Git base intentionally remains on the archive lineage.
### 12.1 Untracked directory classification

Directory-level comparison gives the following branch-relative picture:

- `assets/`: four files, all equal to current public `main`;
- `releases/`: three local installer artifacts, absent from current public source tree;
- `docs/project-book/`: documentation work created by the current archaeology/reconciliation effort, intentionally absent from public `main`;
- `apps/distribution/`: 38 non-`node_modules` files, all absent from current public `main` because Phase 0–1 deliberately removed that implementation from the public repository.

The local `apps/distribution/` directory is also **not** an exact copy of the last pre-cutover public tree at `653122e`: 28 comparable files differ and 10 local backup/generated files are absent there.

Later control-plane reconciliation resolved this ambiguity: current authority is private `n8n2erpnext/lightbi-control-plane` main, while local recovery-tree `apps/distribution/` is historical/workbench residue and differs from the private source. It is neither current public-main source nor current private authority.
## 13. Git corrections to Code Map branch-relative labels

The Code Map deliberately described what was tracked at baseline HEAD `0142e92` versus dirty in that worktree. Git reconciliation now upgrades several labels:

1. **Account frontend is committed public history.** `a9d30ca` added verified-account frontend/native integration on public `main`.
2. **Updater is committed public history.** `a9d30ca` introduced the native updater path and `a9d97cd` substantially upgraded it to staged background updates; later release work refined it.
3. **Advanced Monaco SQL is committed public history.** `70d671c` introduced the editor/suggestions and related workspace changes.
4. **Durable source/connection history is committed public history.** `c363eab` hardened the persistence path.
5. **R2 release manifest support is committed public history.** `872194d` introduced the manifest-driven release contract and tooling.
6. **Public `apps/distribution` was committed, then intentionally removed.** It existed in public history from Beta 7 through the Phase 0–1 split and was removed by the control-plane separation sequence.
7. **Native embedded-core ownership predates publicization.** `824d972` in archive history embedded the API in the LightBI process; later public updater/account work modifies the tracked Tauri `src/main.rs` further.

Therefore “dirty-only” in `LIGHTBI_CODE_MAP.md` must always be read as **dirty-only relative to the archive baseline used for that code audit**, not as a project-wide Git-history verdict.
## 14. Superseded and transitional implementation map

Git history exposes several implementation transitions that filename archaeology alone cannot distinguish.

| Earlier state | Later state | Git evidence |
|---|---|---|
| native sidecar/local runtime work | in-process embedded Axum API | archive `c734d93` → `824d972` |
| initial native updater integration | staged background updater lifecycle | public `a9d30ca` → `a9d97cd` |
| public in-repo distribution/control plane | private-repository ownership + public boundary guard | public `c92dca6`/later → `99e42bd`/`cfaf579` → merge `c06ef00` |
| raw public release-manifest ownership inside distribution app | standalone Basic release contract | `66d84ee`, finalized in Phase 0–1 merge |
| archive repository without root license | archive recovery adds AGPL file | `87dce4d` → `0142e92` |
| public repository without root license | public PR #2 adds AGPL file independently | `28e2aae` → `788a9ce`/`134a7b7` |
| Phase 2A trust design only | public trust-contract implementation candidate | branch `d17abe0`, **not merged** |
| Windows/Linux public release path | macOS unsigned validation workflow added to main | PR #5 → `4668983`, without changing the 0.9.2 tag |

A later implementation should be treated as superseding an earlier one only when the later commit actually replaces/changes ownership or behavior. Historical commits remain valuable for provenance and regression archaeology.
## 15. Fast feature → history lookup

Use these Git anchors when a later audit needs to explain why a current surface exists.

| Surface | First high-value history anchor | Later public anchor |
|---|---|---|
| canonical consumer/governed metric/action/runtime authority | `522c019` | public snapshot `b10f8d0` |
| full-source execution boundary | `a6a13e3` | public snapshot `b10f8d0` |
| source-bound evidence interaction | `000f0c8` | public snapshot `b10f8d0` |
| canonical multi-source production | `eb93cef` | public snapshot `b10f8d0` |
| Phase 8 code separation | `1ebf60b` | public snapshot `b10f8d0` |
| runtime source continuity / 8F1 | `c84605c` | public snapshot `b10f8d0` |
| authentic multifile operational parity / 8F2 | `c84605c`, later `87dce4d` | public snapshot `b10f8d0` |
| embedded native API | `824d972` | inherited by public root and later Tauri commits |
| native SQL Server | — | `92630c0` |
| Advanced Monaco SQL workspace | — | `70d671c` |
| durable local history | — | `c363eab` / `969fb56` |
| R2 manifest releases | — | `872194d` |
| account/native updater | — | `a9d30ca` |
| staged updater | — | `a9d97cd` |
| public/private control-plane split | — | `bf21b2b` → `c06ef00` |
| Phase 2A trust-contract candidate | — | branch `d17abe0` |
| unsigned macOS universal validation | — | `4668983` |
## 16. Rules for future Git archaeology

When a future human or AI asks “is this implemented?” use this order:

1. identify the exact repository and branch lineage;
2. resolve the branch/tag to a SHA;
3. for releases, peel the annotated tag to its commit;
4. inspect current code at that SHA;
5. inspect introducing/superseding commits;
6. only then use historical docs as rationale/evidence;
7. do not use local branch names as current authority without comparing them to remotes;
8. do not call a recovery-worktree file “uncommitted project work” until checking public-main history;
9. do not merge archive and public histories merely to make ancestry look conventional;
10. preserve `storage` and backup refs as historical evidence unless the owner explicitly approves archival cleanup.

For LightBI specifically, the lineage reset is intentional. Reconnecting it with an artificial merge would destroy the clean public-history model and add no product value.
## 17. What Git history alone cannot prove

The following could not be established from Git history alone at Edition 0.4:

- whether every workflow/job cited in commit messages still exists and passes on current `main`;
- exact GitHub Actions triggers, matrices, allowed failures, artifact retention and release publication behavior;
- exact R2 publication path and current manifest promotion rules;
- macOS signing/notarization status beyond the unsigned validation workflow history;
- whether all release artifacts were built from a clean checkout of the tagged commit;
- the current private `lightbi-control-plane` repository implementation and deployment state;
- whether local `apps/distribution/` residue corresponds to any private-repo commit;
- Phase 2A freezeability beyond the fact that PR #4 exists and is unmerged;
- final commercial entitlement and Pro delivery authority.

Those questions belong to the CI/CD and control-plane reconciliation phases, not to Git-history inference. Editions 0.5 and 0.6 subsequently resolve the workflow/R2/macOS/control-plane/runtime-residue questions; Phase 2A freezeability and future commercial/Pro authority remain explicit implementation/design gates.

## 18. Edition 0.4 conclusion

LightBI now has a reconciled repository-history model:

**archive lineage preserves how the product was built; public `main` is a deliberate sanitized snapshot lineage; release tags and PRs define shipped/public transitions; branch-relative dirty state is no longer confused with project-wide Git truth.**

This closes the Git History Reconciliation phase. GitHub Actions / CI/CD and private control-plane audits were subsequently completed and are linked from the Project Book entry point.
