# Agent Handoff — MB-LQ3, Worker Safety, R2 Gate, NEXT047 — 2026-09-07

Status: handoff / current execution continuity; **not canonical architecture and not owner acceptance**
Date: 2026-09-07
Scope: Micro Brain MB-LQ3 direct R2 contribution transport, Worker Safety Gate, NEXT runtime/trust state, successor packaging, and the exact continuation path.
Supersedes: none; this is newer execution context than [`AGENT_HANDOFF_PRE_NEXT_SUCCESSOR_TECH_DEBT_AND_ISSUER_HOT_RELOAD_2026-09-07.md`](./AGENT_HANDOFF_PRE_NEXT_SUCCESSOR_TECH_DEBT_AND_ISSUER_HOT_RELOAD_2026-09-07.md), which remains historical provenance.
Primary sources: [`../../plans/AGENT_IMPLEMENTATION_PLAN_MICRO_BRAIN_R2_REDIS_LEARNING_PIPELINE_2026-09-07.md`](../../plans/AGENT_IMPLEMENTATION_PLAN_MICRO_BRAIN_R2_REDIS_LEARNING_PIPELINE_2026-09-07.md), [`../../../../architecture/micro-brain-cross-domain-semantic-expansion.md`](../../../../architecture/micro-brain-cross-domain-semantic-expansion.md), [`../../../../architecture/road-to-1-0-trust-release-contract.md`](../../../../architecture/road-to-1-0-trust-release-contract.md), [`../../../../project-book/LIGHTBI_PROJECT_BOOK.md`](../../../../project-book/LIGHTBI_PROJECT_BOOK.md), [`../../../../project-book/LIBRARY_RULES.md`](../../../../project-book/LIBRARY_RULES.md).

## 1. Read this first

This handoff exists because the active workstream is too stateful to reconstruct safely from chat history. A successor must **verify exact source/runtime truth before mutation**, use this document as a navigation aid rather than canonical authority, and preserve every fail-closed boundary below.

Do not archaeology the whole project again. Start with the primary-source links above, then inspect the exact repos/commits listed here. If any live fact differs from this handoff, current code + Git + reproducible runtime evidence wins.

Absolute operational rules at this checkpoint:

- **Production is untouched. Keep it untouched.**
- **Do not restart installation issuer PID `3817149`.**
- **Do not restart signer PID `12020`.**
- Do not kill/restart user systemd manager PID `943` merely to restore `/run/user/1000/bus`; protected trust services are children of that manager.
- Do not reuse the broad Production R2 credential for Micro Brain learning.
- Do not call NEXT047 PASS merely because its workflow was pushed; its Actions result is intentionally untracked.
- Do not call Worker Safety live-accepted until exact `975884e...` workers are active and the live idle/outage/stuck-job rehearsal passes.
- Do not call MB-LQ3 complete until a dedicated learning-only R2 credential/bucket exists and the real direct-upload rehearsal passes.

## 2. Repository identities — exact handoff baseline

### Product / Desktop

- Repo: `/home/ubuntu/n8n2erpnext/LightBI-exp-focus-subject`
- Branch: `codex/r1-roadmap-integration`
- HEAD = remote: `65092cd86c7c63c861109a6c01796f1c35a62978`
- This is the MB-LQ3 Desktop/native source candidate: signed learning job polling, local privacy package, app-owned outbox, and direct R2 single/multipart streaming.
- The working tree has five unrelated untracked Phase-5M2 audit JSON files. They pre-existed this work and **must not be staged, deleted, normalized, or claimed**:
  - `docs/architecture/phase-5m2-import-isolation-audit.json`
  - `docs/architecture/phase-5m2-migration-gate-audit.json`
  - `docs/architecture/phase-5m2-question-action-corpus-audit.json`
  - `docs/architecture/phase-5m2-question-action-policy-audit.json`
  - `docs/architecture/phase-5m2-ranking-audit.json`

### Control Plane

- Repo: `/home/ubuntu/n8n2erpnext/lightbi-control-plane-r1p14-signed-transport`
- Branch: `codex/r1p14-signed-transport`
- HEAD = remote: `975884e4a009049e94341aab570c9acef5c30c71`
- Relevant recent chain:
  - `dbf7bfeb77cac8bbabff4b1525b6e7efe3665697` — MB-LQ2 scheduler/Admin queue.
  - `387db91e1123cb9e6da6d565951c393fd43a65bf` — MB-LQ3 direct R2 contribution transport.
  - `c302f9933c8ba50b189df2e596eb84f6e936881a` — fail-closed R2 readiness gate.
  - `7f35320fe308a2636a315720e3c38423b10a8c29` — bounded Worker Safety execution.
  - `975884e4a009049e94341aab570c9acef5c30c71` — worker DB/Redis bootstrap outage backoff.

**Important correction:** the exact full SHA for `c302f99` is `c302f9933c8ba50b189df2e596eb84f6e936881a`. Older prose containing another suffix is stale documentation, not Git truth.

### Windows acceptance orchestration

- Repo: `/home/ubuntu/n8n2erpnext/LightBI-r1p13-rc`
- Branch: `codex/r1p13-rc-acceptance`
- HEAD = remote: `2ba518263d7ef5072de1b364dfc977ee1f4515ef`
- Candidate: `0.9.2-beta.7-next.47` / `g-2026-09-07-next-047`
- Parent generation: `g-2026-09-07-next-046`
- Product pin: `65092cd86c7c63c861109a6c01796f1c35a62978`
- CP pin: `c302f9933c8ba50b189df2e596eb84f6e936881a`
- Schema pin: `071_micro_brain_learning_r2_transport`
- Artifact name expected: `LightBI-Windows-NEXT047-R1P13-Native-Trust-Acceptance`
- Workflow was push-triggered but intentionally not polled. It is **candidate evidence only**, not a successful build claim.
- NEXT047 does **not** include Worker Safety CP `975884e` or schema 072. Avoid unnecessary owner reinstall unless a client-specific LQ3 test genuinely requires NEXT047.

### Documentation

- Repo: `/home/ubuntu/n8n2erpnext/LightBI-bada-docs-20260903`
- Branch/upstream: `docs/ba-da-mode-future-20260903`
- Pre-handoff HEAD/upstream: `73fcb9f585766db8959f0c93b7e938cc3d2b0192`
- Do not use `origin/main` as the docs upstream. That ref is a different/public Product history and must not be merged into this archive branch.

## 3. Live NEXT runtime — source candidate is ahead of live processes

At handoff creation, the live API and workers still execute CP `c302f9933c8ba50b189df2e596eb84f6e936881a`:

| Component | PID | Working directory |
| --- | ---: | --- |
| CP API | `1598271` | `/home/ubuntu/services/lightbi-control-plane-next034-c302f99/apps/distribution` |
| legacy CP worker | `1598272` | same |
| async `short` | `1606932` | same |
| async `default` | `1606946` | same |
| async `long` | `1606982` | same |

Therefore Worker Safety source at `975884e...` is **not live-activated yet**, even though its migration and machine rehearsal are closed.

## 4. Worker Safety Gate — why it exists and what is closed

The owner explicitly stopped MB-LQ3 real R2 work to prevent the class of worker failures seen in older ERPNext generations: idle busy-looping, one stuck job being mistaken for queue pressure, helper-worker multiplication, Redis/DB outage restart storms, and manual restart becoming the normal recovery mechanism.

The implemented contract intentionally chooses a **bounded worker pool**, not autoscaling:

- queues remain `short`, `default`, `long`;
- hard process cap = **1 process per lane**;
- hard concurrency cap = **1 running server job per lane**;
- global active-job default = **2**, hard maximum = **3**;
- no worker can spawn/fork another worker and no queue-depth autoscale path exists;
- PostgreSQL advisory lock prevents a duplicate process for the same lane from acquiring execution authority;
- Redis delivery is never execution authority; the PostgreSQL lease remains authoritative;
- stuck `leased|running` jobs continue counting against resource budget even after lease timestamp expiry;
- an expired lease is recoverable only when the owning worker heartbeat is also stale — **lease expiry alone does not mean the worker died**;
- long handlers retain an independent process heartbeat and receive cancellation/deadline authority;
- Redis idle reads block for 10 seconds rather than tight-polling;
- DB rehydration and Redis reclaim default to 60-second intervals;
- DB/Redis failures use exponential backoff + jitter from 1s to 60s;
- bootstrap DB/Redis outages also back off inside the process instead of repeatedly exiting into systemd;
- poison failure threshold = 3 consecutive failures; circuit cooldown = 300s;
- durable lane states: `running`, `paused`, `draining`, `stopped`;
- `draining` rejects new work, finishes the current active job, then transitions to paused;
- Admin controls are logical only: `Start/Resume`, `Pause`, `Drain`, `Stop`, `Reset circuit`; the web Admin receives no shell/systemd/sudo authority.

Systemd unit source is also bounded:

- `Restart=on-failure`
- `RestartSec=15`
- `StartLimitIntervalSec=300`
- `StartLimitBurst=3`
- `TasksMax=64`
- `MemoryHigh=384M`
- `MemoryMax=512M`
- `CPUQuota=75%`
- `Nice=5`

Source verification after the final race/startup hardening:

- Worker Safety focused gate: **23/23 PASS**.
- Complete Control Plane suite: **286/286 PASS**, `0` fail.
- TypeScript backend, Web, test typecheck and build: PASS.
- No autoscale/child-process path in async worker source.
- Strong Admin re-auth required for worker mutations; static tests forbid systemd/sudo authority in Admin web.

Two commits own the gate:

1. `7f35320fe308a2636a315720e3c38423b10a8c29` — process/concurrency caps, global lease budget, lane states, circuit breaker, Admin worker controls, bounded unit resources/restart policy, long-handler heartbeat/cancellation and stale-owner recovery rules.
2. `975884e4a009049e94341aab570c9acef5c30c71` — bootstrap DB/Redis outage self-backoff so dependency failure does not turn into a systemd restart loop.

## 5. Migration 072 and current PostgreSQL safety state

Migration `072_micro_brain_worker_safety` was applied only after read-only migration status proved it was the **sole pending migration**. Current NEXT schema truth is:

- migrations: **26**
- pending: **0**
- latest: `072_micro_brain_worker_safety`

Current durable global policy after rehearsal cleanup:

`active_job_limit=2`, `max_processes_total=3`, `idle_block_ms=10000`, `rehydrate_interval_seconds=60`, `reclaim_interval_seconds=60`, `heartbeat_interval_seconds=30`, `error_backoff_base_ms=1000`, `error_backoff_max_ms=60000`, `poison_failure_threshold=3`, `circuit_cooldown_seconds=300`.

All three lane rows are clean after rehearsal:

- `short`: `running`, process cap 1, concurrency cap 1, failures 0, circuit null, last_error null.
- `default`: same.
- `long`: same.
- Active server jobs at the final read: none.
- Synthetic worker-safety jobs remaining: **0**.

The real NEXT PostgreSQL machine rehearsal PASSed:

```text
workerSafetyRehearsal=PASS
duplicateProcessRejected=true
globalCapDenied=true
freshOwnerProtectsExpiredLease=true
deadOwnerAllowsRecovery=true
drainCompletesToPaused=true
drainState=paused
poisonCircuitOpened=true
syntheticJobsRemaining=0
```

The first rehearsal attempt failed in the **rehearsal script's restore SQL placeholder numbering**, not in worker runtime. The script's `finally` cleanup removed synthetic job/heartbeat state; lane state was explicitly restored to `running/failures=0/circuit=null`, the script was corrected, and the complete rehearsal was rerun to the PASS result above. Preserve this distinction; do not hide the failed harness attempt and do not classify it as a product failure.

## 6. Worker Safety live activation remains OPEN

A complete immutable deploy of exact CP `975884e...` already exists at:

`/home/ubuntu/services/lightbi-control-plane-next034-975884e`

Its `.deployed-commit` is exact `975884e4a009049e94341aab570c9acef5c30c71`. The prepared runtime env is:

`/home/ubuntu/.config/lightbi-next034-cp-worker-safety-975884e.env`

Permissions are `0600`; do not print its values into chat or docs.

Prepared user-systemd drop-ins exist for API, legacy worker and all three async lanes, all pointing at the immutable `975884e` directory. They have **not** been daemon-reloaded because `/run/user/1000/bus` is absent and `systemctl --user` returns `Failed to connect to bus: No medium found`.

Prepared drop-ins:

- `/home/ubuntu/.config/systemd/user/lightbi-control-plane-next.service.d/zzzzzzzzzzzzzzz-next034-worker-safety-975884e.conf`
- `/home/ubuntu/.config/systemd/user/lightbi-control-plane-next-worker.service.d/zzzzzzzzzzzzzz-next034-worker-safety-975884e.conf`
- `/home/ubuntu/.config/systemd/user/lightbi-control-plane-next-worker-short.service.d/zzz-worker-safety-975884e.conf`
- `/home/ubuntu/.config/systemd/user/lightbi-control-plane-next-worker-default.service.d/zzz-worker-safety-975884e.conf`
- `/home/ubuntu/.config/systemd/user/lightbi-control-plane-next-worker-long.service.d/zzz-worker-safety-975884e.conf`

User systemd manager PID `943` is alive and currently parents the protected Trust container launchers. **Do not kill/restart it simply to recover the bus.** A successor must either find a demonstrably safe way to restore user-systemd control or keep activation OPEN.

Before calling Worker Safety live-accepted, prove all of the following on exact `975884e`:

1. API/legacy/async live PIDs and cwd all point to the immutable candidate.
2. Queue-empty idle observation over a meaningful window shows near-zero CPU and bounded RSS; no repeated DB/Redis polling loop.
3. Starting a duplicate lane process is rejected by the advisory process slot; existing lane process count does not increase.
4. A long synthetic sleeping/stuck job does not create helper workers or increase process count.
5. Poison work reaches the bounded retry/circuit rule and does not spin forever.
6. Redis unavailable in an isolated/safe rehearsal causes exponential backoff without restart storm.
7. DB unavailable in an isolated/safe rehearsal does the same.
8. Expired lease + fresh owner heartbeat remains protected; expired lease + stale owner is recoverable.
9. `Pause`, `Drain`, `Stop`, `Start/Resume`, and `Reset circuit` behave through the Admin/logical authority layer.
10. Loaded systemd unit properties actually contain the new bounded restart/resource settings.
11. Synthetic DB/Redis state is fully cleaned and all lane policies return to intended normal state.

Until that list passes, **do not unlock real R2 learning traffic**.

## 7. MB-LQ0 → LQ3 implementation map

The durable plan is [`../../plans/AGENT_IMPLEMENTATION_PLAN_MICRO_BRAIN_R2_REDIS_LEARNING_PIPELINE_2026-09-07.md`](../../plans/AGENT_IMPLEMENTATION_PLAN_MICRO_BRAIN_R2_REDIS_LEARNING_PIPELINE_2026-09-07.md). Current implementation provenance:

- **MB-LQ0** — CP `00e8abb7aed68d2fa872dd4758c0443819ba1527`: strict privacy manifest/record contracts, Redis/R2 namespaces, size/cadence defaults, migration 069 design. Focused acceptance reached 12/12 PASS before later phases.
- **MB-LQ1** — CP `77dd7df5804da725169bd4c2260b1c7c944d7134`, unit templates `84099b3ea7470243519682b7604a3f64da45f21e`: durable `lightbi_async_jobs`, Redis Streams/consumer groups, PG lease authority, retry/rehydrate/reclaim and async worker runtime. Real NEXT PG+Redis rehearsal proved normal completion, Redis dispatch loss→rehydrate→completion, expired-lease recovery and cleanup.
- **MB-LQ2** — CP `dbf7bfeb77cac8bbabff4b1525b6e7efe3665697`, migration 070: `server|client` target split, 5:3:1 scheduler, aging/value/network-fit scoring, quotas/backpressure, strong-auth Admin Queue/Scheduler. Full CP 264/264 at closure; synthetic NEXT scheduler/client-vs-server/backpressure proof PASS.
- **MB-LQ3 Desktop** — Product `65092cd86c7c63c861109a6c01796f1c35a62978`.
- **MB-LQ3 CP** — `387db91e1123cb9e6da6d565951c393fd43a65bf`; readiness descendant `c302f9933c8ba50b189df2e596eb84f6e936881a`; migration 071.
- **Worker Safety prerequisite before real LQ3 R2** — CP `7f35320...` + `975884e...`; migration 072.

## 8. MB-LQ3 transport contract already implemented

The intended byte path is permanently:

```text
Desktop -> Cloudflare R2
```

not:

```text
Desktop -> Control Plane/VPS -> R2
```

Control Plane receives only bounded signed metadata/control requests. Product `65092cd...` polls an assigned client-target job through protected Signed Transport, builds a privacy-safe gzip/NDJSON package locally, stages it only under LightBI's app-owned outbox and uses native streaming for R2 upload.

Relevant current rules:

- single upload for small packages; medium/large use fixed 16 MiB multipart ranges;
- resumable multipart receipts, upload ID and verification state are durable in PostgreSQL;
- short-lived SigV4 grants default to 600s and hard-cap at 900s;
- native uploader accepts only a LightBI-staged package identity, not arbitrary filesystem paths;
- R2 URLs must be HTTPS and match the presign contract;
- server-side validation streams the object, checks compressed bytes, SHA-256, gzip/NDJSON schema, record/evidence counts and strict privacy allowlists;
- malformed/raw business fields fail closed;
- duplicate content is deduplicated without increasing learning authority;
- transport/R2 outage retries and is **not** mislabeled as privacy rejection;
- consent withdrawal aborts the contribution, deletes local staged bytes, and requires remote R2 object cleanup before durable abort completion.

LQ3 source evidence before Worker Safety work:

- CP full suite at exact readiness candidate: **275/275 PASS**.
- Product release-authoritative suite: PASS; governed regression **41/41**.
- Product native Tauri: **28 PASS / 0 FAIL / 1 live-only ignored**.
- Attestation verifier suite: **18/18 PASS**.
- Migration 071 was sole pending before apply and now remains applied beneath migration 072.

## 9. R2 credential/broker boundary — still a hard blocker

Expected broker socket:

`/home/ubuntu/.local/run/lightbi-mb-r2-broker/broker.sock`

Current truth at handoff creation: **socket absent / broker inactive**.

The dedicated broker credential file is not provisioned. Existing VPS R2 credentials used by distribution, staging labels and backup were compared by fingerprint/equality only and resolve to the same broad Production credential/bucket. They were deliberately **not reused** for learning. The VPS also had no Cloudflare API token/Wrangler auth capable of minting a least-privileged learning key automatically.

Security contract:

- Create a dedicated **NEXT learning-only** R2 credential and preferably a dedicated bucket or least-privileged prefix authority.
- Credential belongs only to the R2 broker process.
- Distribution/CP/async workers receive only the broker Unix socket; they must not receive R2 access-key/secret values.
- Never solve this blocker by copying the current Production-wide R2 key into `/home/ubuntu/.config/lightbi-mb-r2-broker.env`.

The scheduler currently fails closed when the broker is unavailable. Prior live proof under the absent-broker state showed `0` active client collection jobs and `0` newly issued collection jobs in the observed 15-minute window.

## 10. Real R2 rehearsal required after Worker Safety live gate

After the dedicated credential exists **and** exact `975884e` Worker Safety is live-accepted, run one bounded NEXT-only end-to-end rehearsal:

1. Start the learning-only broker and prove health/prefix confinement.
2. Issue an App-like client contribution job through the normal scheduler/binding path.
3. Build a valid strict privacy package and direct-upload a small object to R2.
4. Exercise multipart upload and crash/resume using durable part receipts.
5. Complete upload and prove `intake -> quarantine`.
6. Let server validation stream from R2 and prove exact size/SHA/schema/privacy verification.
7. Prove valid unique content reaches `ready`.
8. Upload duplicate content and prove dedupe/archive without learning-authority growth.
9. Submit malformed/forbidden raw/private fields and prove rejection.
10. Exercise R2/broker outage and prove bounded retry rather than privacy rejection or byte proxy fallback.
11. Exercise consent withdrawal and prove local + remote cleanup.
12. Inspect network/API implementation again to prove large bytes never traverse CP/VPS as upload proxy.
13. Delete all synthetic R2 objects and clean PG/Redis job/contribution state.

Only after that machine proof may MB-LQ3 be classified complete and work advance to MB-LQ4 validation/training-worker processing.

## 11. Current Trust runtime and immutable TEST release authority

Protected Trust processes at handoff creation:

- signer launcher PID `12020`, image `lightbi-next-trust-signer:8568ed90c5a4-trust-10de4da8`;
- installation issuer launcher PID `3817149`, image `lightbi-next-trust-installation-issuer:e4deadf864c9-trust-10de4da8`;
- attestation PID `1505209`, image `lightbi-next-trust-attestation:387db91e1123-trust-10de4da8`;
- Trust Contracts commit `10de4da8e551a46f93f7b62985a0a6e611581b8e`;
- Production authority: false.

Issuer health is currently healthy and hot-reload capable:

- `ok=true`
- `environment=next_internal_test_only`
- `signingAuthority=false`
- `productionAuthority=false`
- `trustHotReload=true`
- `trustSnapshotHealth=healthy`
- `trustPublicationCount=12`
- `trustLatestVersion=0.9.2-beta.7-next.46`
- `trustLastReloadError=null`

Attestation health is `ok=true`, `next_internal_test_only`, `signingAuthority=false`, `statePersisted=true`.

The current TEST runtime catalog still points to NEXT046:

- version `0.9.2-beta.7-next.46`
- runtime release ID `release:0.9.2-beta.7-next.46:windows:x86_64:runtime`
- artifact `LightBI.exe`
- SHA-256 `be643683d6f99cc434eb6501793588c1054dbd473ddb2c562f65e80c094f771f`
- size `77,124,608` bytes
- Product source SHA in publication `fc82ce52340f17a2724cca0fa2746133418776ab`
- authority `next-test-20260902-031220`
- `promotableToProduction=false`.

Do not mutate old REL bytes. A successor version always receives a new immutable TEST REL after canonical NSIS-installed-runtime verification.

## 12. Why new Windows builds previously failed Trust, and what is fixed versus still open

Two independent snapshot/cache defects were already fixed in source/runtime:

1. Installation Issuer used to require restart to learn a successor REL. It now hot-reloads the signed release catalog and preserves old challenges/old-good snapshot fail-closed behavior.
2. Attestation verifier also used to cache allowed releases. It was hardened so a newly published valid successor release is accepted without recreating the verifier.

NEXT046 demonstrated both the fixed behavior and the remaining orchestration gap. The owner installed NEXT046 while TEST `runtime-latest` was still NEXT044, so the issuer correctly returned `installation_issuer_release_not_allowed`. The exact canonical NEXT046 Actions artifact was later verified, its TEST runtime REL published, and the existing issuer hot-reloaded publication count `11 -> 12`, latest `NEXT044 -> NEXT046`, with issuer/signer PIDs unchanged. Fresh public proof then passed:

`challenge 201 -> issue 201 -> certificate verification PASS -> nonce 201`.

Thus the hot-reload bugs are fixed. What is **not yet fully automated** is the release orchestration:

```text
Windows build
-> silent-install NSIS
-> canonical installed-runtime identity
-> acceptance PASS
-> publish immutable TEST REL
-> external Root/keyset/REL verification
-> issuer sees successor
-> attestation accepts certificate
-> challenge/issue/nonce probe
-> only then mark artifact READY FOR INSTALL
```

Until that is automated, a green GitHub build must not be interpreted as Trust-ready. If successor packaging is resumed, add/require a machine-readable `trust_ready=true` style gate before owner install.

## 13. NEXT047 handling recommendation

NEXT047 is already cut, but it predates Worker Safety and remains untracked. Do not burn another owner install merely to consume a build number.

Preferred path:

- finish Worker Safety live activation/rehearsal;
- provision the dedicated learning R2 broker authority and close MB-LQ3 real transport rehearsal;
- then cut a newer immutable successor (likely NEXT048 or later) from Product `65092cd...` plus the final accepted CP source at/after `975884e...`, schema 072 or later;
- let that successor use the complete `build -> TEST REL -> issuer/attestation proof -> trust-ready` gate before asking the owner to install.

If a specific Desktop-only LQ3 test requires NEXT047 first, identify its exact workflow result, download only the artifact for acceptance commit `2ba518263...`, verify the NSIS-installed runtime evidence, publish a new NEXT047 TEST REL, and complete Trust probes before installation. Never reuse NEXT046 REL for a NEXT047 runtime.

## 14. Adjacent owner-visible fixes that must not regress

### Sidebar cleanup

Product source removed `Sources` from the left navigation and removed the `MB healthy` sidebar badge. The underlying `/datasources` route remains intentionally available for deep links/internal consumers. Micro Brain health/status remains in Settings.

### Micro Brain Live Lab routing

`https://lightbi-next.thaiduy.digital/micro-brain/status` is owned by the Control Plane, not the Desktop SPA fallback. The Live Lab shows active apps, observation batches, 6-hour/7-day charts, today/yesterday comparison, recent batch log and signed capability progress. Public `/api/micro-brain/status` remains privacy-safe.

The existing small observation pulse is **not** the large training-transport lane. Desktop aggregates small counters and flushes around 25 retrievals or 60 seconds; failures retry later. It carries bounded aggregate activity such as retrievals/candidate hits/abstentions, not workbooks, SQL results or raw business values.

### Complimentary PRO entitlement repair

An older active Complimentary Pro license for `th.dangduy@gmail.com` existed without an entitlement binding. NEXT durable state was repaired and verified as `pro/active` in both legacy and authority entitlement layers, with source license/capability binding. Admin reconciliation/Attach logic was added so older eligible active Pro keys can be attached without relying on user re-redemption. Do not infer a future UI regression from historical “Not redeemed” screenshots without reading current DB/API state.

### Signed Transport nonce 401

The prior `Signed-transport nonce rejected (HTTP 401)` was traced to `attestation_release_not_allowed`: issuer had learned NEXT044 while Attestation still held the old release authority. The Attestation hot-reload source fix and later image lineage close that architectural defect. Do not paper over future nonce failures by weakening response correlation, replay protection or Signed Transport fallback rules.

## 15. Privacy/authority invariants for all next work

- Observation volume is not capability progress.
- Data arriving in R2 is not Micro Brain learning.
- Worker output is candidate/evidence material, not production knowledge authority.
- Only review/validation/deterministic rebuild and signed Intelligence Pack activation may advance signed capability progress.
- Redis is disposable cache/coordination/dispatch, never job, entitlement, Trust, evidence or signed-pack authority.
- PostgreSQL owns durable async-job and contribution state.
- R2 owns object bytes, not scheduler truth.
- Raw local business data is not the default contribution format.
- Any future raw/anonymized sample-data program requires its own explicit consent contract.
- Trust Root/keyset/REL/ATT/ENT, Signed Transport replay/sequence authority, entitlement writes and governed BA evidence must never be granted by optional Redis cache state.

## 16. Exact next action — successor session should start here

Do these in order; do not skip directly to R2:

### Gate A — re-read truth

1. `git status`, branch, HEAD and upstream for Product, CP, acceptance and docs repos.
2. Confirm live API/worker PIDs and `/proc/<pid>/cwd` still point to the expected source.
3. Confirm migration status remains `26 / pending=0 / latest 072`.
4. Confirm issuer/signer PIDs and issuer hot-reload health before any process operation.
5. Confirm `/run/user/1000/bus` state; do not assume the previous blocker persists or disappeared.

### Gate B — safely activate Worker Safety exact source

If a safe systemd-control path exists, daemon-reload and rotate only the CP API/legacy worker/async-worker units to immutable `975884e...`. If the only apparent route is restarting/killing user manager PID `943`, **stop and keep the gate OPEN** rather than risking Trust services.

After activation, prove exact commit/cwd/PIDs and run the live acceptance list in §6. Measure idle CPU/RSS over enough time to distinguish real blocking from short sampling noise. The primary acceptance criterion is not “process is alive”; it is **bounded resource behavior without manual reset/restart dependence**.

### Gate C — provision learning-only R2 authority

Only after Worker Safety passes live. Create a least-privileged NEXT learning credential/bucket/prefix for the broker. Do not print secret values. Create the broker env with restrictive permissions and prove the CP env does not inherit R2 secret fields.

### Gate D — real MB-LQ3 R2 rehearsal

Run the 13-point rehearsal from §10. Cleanup is part of PASS. If cleanup or R2 deletion cannot be proven, classify the rehearsal incomplete.

### Gate E — successor packaging/trust readiness

Reconcile whether NEXT047 is useful. Prefer a fresh successor after Worker Safety/R2 closure. Before owner install, require exact Actions artifact, canonical NSIS-installed runtime SHA/size, immutable TEST REL publication, external REL verification and challenge/issue/nonce proof.

## 17. Useful source/code bookmarks

Control Plane Worker Safety:

- `apps/distribution/src/async-worker.ts`
- `apps/distribution/src/worker/async-worker-runtime.ts`
- `apps/distribution/src/platform/jobs/async-jobs.ts`
- `apps/distribution/src/platform/jobs/redis-stream-dispatch.ts`
- `apps/distribution/src/domains/intelligence/micro-brain-worker-safety.ts`
- `apps/distribution/src/domains/intelligence/micro-brain-learning-contracts.ts`
- `apps/distribution/src/domains/intelligence/micro-brain-learning-schema.ts`
- `apps/distribution/worker-safety.test.ts`
- `apps/distribution/async-worker-foundation.test.ts`
- `deploy/lightbi-control-plane-next-worker-{short,default,long}.service`

Control Plane LQ3/R2:

- `apps/distribution/src/domains/intelligence/micro-brain-learning-contribution-service.ts`
- `apps/distribution/src/domains/intelligence/micro-brain-learning-r2-client.ts`
- `apps/distribution/src/domains/intelligence/micro-brain-learning-scheduler.ts`
- `apps/distribution/src/learning-r2-broker.ts`
- `apps/distribution/src/platform/object-store/r2-sigv4.ts`
- `apps/distribution/src/server.ts`
- `apps/distribution/src/web/micro-brain.ts`

Product/Desktop LQ3:

- inspect Product commit `65092cd86c7c63c861109a6c01796f1c35a62978` for the exact native learning outbox/uploader and coordinator files before editing; do not rely on a remembered filename if the commit layout differs.
- Signed Transport route classification for `/api/micro-brain/learning/*` is part of this boundary and must remain native-protected.

Documentation bookmarks:

- [`../../plans/AGENT_IMPLEMENTATION_PLAN_MICRO_BRAIN_R2_REDIS_LEARNING_PIPELINE_2026-09-07.md`](../../plans/AGENT_IMPLEMENTATION_PLAN_MICRO_BRAIN_R2_REDIS_LEARNING_PIPELINE_2026-09-07.md) — implementation owner/phase map.
- [`../../../../architecture/micro-brain-cross-domain-semantic-expansion.md`](../../../../architecture/micro-brain-cross-domain-semantic-expansion.md) — canonical Micro Brain authority/learning lifecycle.
- [`../../../../architecture/road-to-1-0-trust-release-contract.md`](../../../../architecture/road-to-1-0-trust-release-contract.md) — Trust/release boundaries.
- [`../../../../project-book/LIGHTBI_PROJECT_BOOK.md`](../../../../project-book/LIGHTBI_PROJECT_BOOK.md) — current Project Truth synthesis.
- [`../../../../project-book/LIGHTBI_WORKLOG.md`](../../../../project-book/LIGHTBI_WORKLOG.md) — chronology/provenance.
- [`../../../../project-book/LIBRARY_RULES.md`](../../../../project-book/LIBRARY_RULES.md) — mandatory documentation governance.

## 18. Handoff status matrix

| Boundary | Status at handoff |
| --- | --- |
| MB-LQ0 contracts | source-closed |
| MB-LQ1 Postgres/Redis worker foundation | source + synthetic machine proof closed |
| MB-LQ2 scheduler/Admin | source + schema + synthetic machine proof closed |
| MB-LQ3 Desktop direct R2 source | source gates closed |
| MB-LQ3 CP control/validation source | source gates closed |
| Migration 071 | applied |
| Worker Safety source | closed at `975884e...` |
| Migration 072 | applied; 26/26 pending 0 |
| Worker Safety PostgreSQL rehearsal | PASS |
| Worker Safety live process activation | **OPEN** — live workers still `c302f99...` |
| dedicated learning-only R2 credential/broker | **OPEN** |
| real Cloudflare R2 LQ3 rehearsal | **OPEN** |
| MB-LQ3 overall phase | **OPEN** |
| NEXT047 Actions/build | intentionally untracked; **not claimed PASS** |
| NEXT047 Trust-ready REL/probes | **OPEN** |
| current TEST runtime REL | NEXT046 |
| Production | untouched |

A successor may close only the boundary for which it obtains exact machine/runtime evidence. Do not collapse source PASS, schema PASS, machine rehearsal, live activation, Windows package acceptance, owner UAT and Production promotion into one status.
