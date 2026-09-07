# Agent Implementation Plan — Micro Brain R2 + Redis Learning Pipeline — 2026-09-07

Status: owner-approved implementation plan; not implementation/runtime truth
Date: 2026-09-07
Scope: privacy-safe Micro Brain contribution scheduling, R2 learning lakes, Redis-backed async workers, queue/admin operations, and LightBI Redis-cache adoption audit
Supersedes: none
Superseded by: none
Primary sources: [`../../../architecture/micro-brain-cross-domain-semantic-expansion.md`](../../../architecture/micro-brain-cross-domain-semantic-expansion.md), [`../../../architecture/road-to-1-0-trust-release-contract.md`](../../../architecture/road-to-1-0-trust-release-contract.md), [`../../../project-book/LIGHTBI_PROJECT_BOOK.md`](../../../project-book/LIGHTBI_PROJECT_BOOK.md)
Code evidence at planning time: Product `fc82ce52340f17a2724cca0fa2746133418776ab`; Control Plane `eea0de340615c145feeb8461d568364c5d041d66`

## 1. Purpose

Turn the current privacy-safe Micro Brain observation pulse into a scalable learning-contribution system without turning LightBI into a raw-data collection service or making Redis/R2 an authority.

The owner approved an ERPNext-style async-worker model with three worker classes: `short`, `default`, and `long`. Redis already exists in the LightBI Control Plane and should be reused for dispatch, cache and coordination where it is appropriate.

This plan also audits current LightBI features for Redis-cache opportunities. The rule is selective adoption: cache read models and coordination state, never security/trust/evidence authority merely because Redis is available.

## 2. Current verified baseline

The current Desktop does not wait for a server pull. It pushes a tiny aggregate Micro Brain observation batch when either 25 retrievals accumulate or 60 seconds elapse; failed batches retry after 60 seconds, pending work may flush 5 seconds after an ACK, and page hide flushes with keepalive.

The batch is aggregate-only: retrieval count, candidate-hit count, abstention count and bounded runtime metadata. It contains no raw query, file, worksheet, SQL result, business value or column payload.
The current Control Plane already has `redis ^5.8.2`, PostgreSQL transactional outbox/retry/idempotency, a persistent worker heartbeat, Redis-backed Account/Admin challenge state and rate limits, a 30-second analytics summary cache, marketing throttling, and a short-lived plaintext license-delivery cache.

The existing transactional outbox remains the owner of domain events such as commerce completion, integration delivery and newsletter delivery. Long-running learning/import/export commands must not be overloaded into that event stream.

## 3. Non-negotiable invariants

1. **Data arrived != Micro Brain learned.** Only reviewed, validated and signed Intelligence Pack changes advance capability progress.
2. Production semantic truth never self-mutates from one customer dataset, one correction or one uploaded contribution.
3. Default learning contribution contains sanitized evidence, not raw workbooks, SQL results, customer records, queries or business values.
4. Any future raw/anonymized sample-data program requires a separate explicit consent contract from ordinary `Micro Brain local learning`.
5. App-to-server pulse traffic stays independent from large training contribution traffic.
6. Large contribution bytes travel App → R2 directly using short-lived upload authorization; they do not proxy through the VPS.
7. PostgreSQL is durable job/lake metadata truth. Redis is disposable acceleration and coordination. R2 is object storage, not scheduler truth.
8. Trust Root, Keyset, REL/ATT/ENT verification, Signed Transport replay authority, entitlement/security writes and governed BA evidence never depend on an optional Redis cache hit.
9. NEXT/Internal is the first rollout chassis. Production remains untouched until explicit acceptance.

## 4. Three traffic lanes

### Lane A — Live pulse
Existing aggregate observation batches remain small and frequent. They power Live Lab charts and active-app presence only.

### Lane B — Learning contribution jobs
The Control Plane creates bounded contribution jobs. Desktop polls for an assigned job instead of requiring inbound connectivity through NAT/firewalls.

### Lane C — Training lake
Approved contribution packages upload directly to R2, move through validation/training lake states, and are consumed by VPS workers gradually.
## 5. Polling and contribution cadence

Desktop checks for a learning job every **5 minutes plus 0–90 seconds jitter** by default. An actively used app may shorten this to roughly 2–3 minutes; an idle/offline app exponentially backs off toward 15–30 minutes.

Automatic contribution cadence defaults to **6 hours per installation**, but the scheduler creates a job only when fresh learning material exists. An elapsed interval alone is never a reason to upload an empty or duplicate package.

Admin presets: `15m`, `30m`, `1h`, `3h`, `6h` default, `12h`, `24h`, and `Paused`.

The server never performs a continuous bandwidth test. Network fitness is a coarse class derived from previous actual upload throughput and, where safely available, metered/unmetered and power/idle hints.

## 6. Contribution package boundary

Default packages may contain only reusable sanitized learning evidence such as:

- physical/schema signatures and normalized type shapes;
- unresolved-concept fingerprints and confusion-pair hits;
- semantic candidate/abstention counters and resolver-state summaries;
- neighboring canonical-concept identifiers;
- domain/chart-planning signal aggregates;
- bounded cardinality/distribution buckets;
- sanitized vocabulary fragments only under the explicit privacy policy.

Packages must be deterministic enough to hash, schema-versioned, locally privacy-validated before upload, compressed, content-addressed, and rejected when forbidden fields are detected.
## 7. R2 learning-lake layout

Use one private logical namespace unless an operational reason later requires physical bucket separation:

```text
micro-brain-learning/
  intake/
  quarantine/
  ready/
  training/
  learned/
  rejected/
  archive/
```

Partition beneath each lake by `year/month/day/domain/generation/job-id`. Objects are private and immutable after finalization; the Desktop receives only short-lived upload grants for its assigned object path.

State meaning:
- `intake`: upload landed but is not trusted for learning;
- `quarantine`: hash/schema/privacy checks pending or suspicious;
- `ready`: validated and eligible for worker consumption;
- `training`: leased to a long worker;
- `learned`: processed into candidate knowledge/evidence, not automatically promoted;
- `rejected`: duplicate, invalid, policy-violating or corrupt;
- `archive`: bounded audit/rollback retention.

R2 lifecycle/TTL rules must prevent unbounded storage growth. Object metadata and state transitions remain represented durably in PostgreSQL.
## 8. Size and quota contract

- default maximum contribution job: **1 GiB**;
- absolute exceptional ceiling: **2 GiB/job**;
- default VPS active training working set: **<=2 GiB** across leased objects/chunks;
- default per-installation contribution budget: **250 MiB/day**;
- global daily ingest budget: Admin-configurable;
- multipart upload is required for medium/large objects and must support resume.

The 1–2 GiB limit is a per-job/working-set guardrail, not a total R2 bucket limit. R2 may hold more data subject to retention and global quotas while the VPS processes only bounded leases.

## 9. Durable async-job model

Add a PostgreSQL `lightbi_async_jobs` ledger rather than repurposing the transactional outbox. Minimum fields:

`id, kind, queue_class, priority, status, subject_ref, payload_json/ref, result_ref, available_at, attempts, max_attempts, leased_by, lease_expires_at, progress, created_at, updated_at, completed_at, last_error`.

Required states: `scheduled`, `ready`, `leased`, `running`, `retry`, `completed`, `failed`, `cancelled`, `deferred`.

Learning-specific metadata lives in dedicated tables referencing the job ID: contribution manifest, installation hash, privacy policy version, expected bytes/hash, R2 object path, lake state, network class, novelty/value score and training outcome.

PostgreSQL transitions are authoritative and auditable. Redis loss must be recoverable by rehydrating ready jobs from PostgreSQL without duplicating completed work.
## 10. Redis worker topology — ERPNext-style

Keep the existing `redis` dependency; do not add BullMQ in the first implementation. Use Redis Streams + consumer groups as a bounded dispatch accelerator while PostgreSQL remains job truth.

Streams:
- `lightbi:q:short:v1`
- `lightbi:q:default:v1`
- `lightbi:q:long:v1`

Consumer groups:
- `lightbi-workers-short-v1`
- `lightbi-workers-default-v1`
- `lightbi-workers-long-v1`

Each stream entry carries only durable job identity and minimal routing metadata, never a large payload or credential. Workers acquire/renew a PostgreSQL lease before executing, persist the result/state, then ACK Redis. Orphaned pending stream entries are reclaimable; missing Redis entries are rehydrated from PostgreSQL.

Run separate systemd worker units so each queue can have its own resource/concurrency policy and health signal. NEXT defaults:
- `short`: concurrency 4; expected wall time <=30s;
- `default`: concurrency 2; expected wall time <=10m;
- `long`: concurrency 1; expected wall time <=60m, with explicit lease renewal.

These are initial A1/24-GB chassis settings, not hard product ceilings. Production may scale worker replicas independently.
## 11. Worker-class assignment

### `short`
- MB observation aggregation and cache invalidation;
- worker/app presence consolidation;
- lightweight webhooks/outbox handoff;
- queue/lake metric refresh;
- public read-model cache invalidation;
- contribution-job eligibility probe;
- release/docs/catalog refresh signals.

### `default`
- contribution manifest validation;
- R2 multipart finalization and object-hash verification;
- privacy/schema validation for sanitized packages;
- duplicate detection and lake transition `intake -> quarantine -> ready`;
- daily MB rollups;
- medium export/import metadata work;
- documentation/catalog synchronization and operational reconciliation.

### `long`
- 256 MiB–2 GiB contribution processing;
- bounded R2 chunk download/streaming;
- semantic feature extraction and candidate mining;
- held-out/counterfactual candidate evaluation;
- large import/profile/export jobs when those server-side lanes exist;
- candidate Intelligence Pack build/validation work, never signing authority itself;
- archive/compaction/retention sweeps that can be safely resumed.
## 12. Learning scheduler and fairness

Contribution candidates are divided into size lanes:
- Small `<32 MiB`
- Medium `32–256 MiB`
- Large `256 MiB–1 GiB`
- Exceptional `1–2 GiB` only when policy/admin explicitly permits it.

Use weighted deficit/fair scheduling with initial service ratio **5 Small : 3 Medium : 1 Large**. Exceptional jobs consume the Large budget and cannot starve ordinary Large work.

Within each lane rank by a deterministic score conceptually equivalent to:

`novelty + age + learning_value + network_fit + size_efficiency + admin_boost`

`age` must monotonically improve a waiting job's chance so slow/large contributors cannot starve forever. `network_fit` uses coarse transfer history, not invasive network profiling. `admin_boost` is bounded and audited.

The scheduler fills only a small Redis ready window, approximately 2x active worker capacity, in current priority order. This keeps Boost/Pause/cancellation meaningful before a job is leased while Redis Streams still provide consumer-group delivery semantics.

Scheduled/deferred wake-up indexes may use Redis sorted sets for acceleration, but PostgreSQL `available_at` remains recovery truth.
## 13. Redis cache adoption audit

The audit distinguishes **cache**, **ephemeral security/coordination state**, and **durable authority**. Existing Redis use is retained unless listed for hardening.

| LightBI surface | Current state | Decision |
| --- | --- | --- |
| Distribution analytics summary | Redis cache, 30s TTL | Keep; add explicit namespace/version and event invalidation where practical. |
| Micro Brain Live Lab rollups | PostgreSQL computed reads | Add Redis read cache, 10–30s TTL; invalidate on batch insert and signed-pack snapshot. |
| Active-app presence | Derived from persisted observations | Add Redis TTL presence key, ~10m; Postgres remains historical truth. |
| Queue/worker/lake dashboard metrics | Not yet present | Redis counters/read cache 5–10s; rebuild from Postgres/R2 metadata. |
| Public commerce catalog/pricing | PostgreSQL read | Add 30–60s versioned cache for browse UI; checkout revalidates authoritative DB state. |
| Announcements/public docs index | PostgreSQL/read-only content | Add 60–300s cache with mutation invalidation; safe because writes remain in Postgres. |
| App-usage/install aggregate views | PostgreSQL analytics | Reuse analytics cache pattern, 10–30s depending view cost. |
| R2 learning-lake aggregate sizes | Not yet present | Cache 10–30s; object/job metadata truth stays Postgres/R2. |
| Scheduler candidate score/index | Not yet present | Redis sorted/index cache allowed; deterministic rehydrate from Postgres. |
| R2 multipart progress lookup | Not yet present | Redis accelerator allowed; durable resumable upload state must be reconstructible/persisted. |
| License plaintext resend secret | Redis 24h ephemeral cache | Keep bounded; never extend into durable license authority. |
| Marketing global throttle | Redis coordination | Keep; outage defers mail rather than bypassing limits. |
| Account/Admin challenges, OAuth/native login, rate limits | Redis ephemeral security state | Keep as protocol state, not classify as generic cache. |
### Surfaces deliberately not added to Redis cache

| Surface | Decision / reason |
| --- | --- |
| Release catalog / immutable release artifacts | Keep filesystem/R2/HTTP/Cloudflare cache semantics; Redis adds no useful authority and can introduce stale release identity. |
| Intelligence Pack artifact bytes | Immutable signed object + HTTP cache only; do not duplicate pack authority into Redis. |
| Account session/entitlement summary | No new generic cache in first rollout; security/device/entitlement mutations require exact fresh authority. Revisit only with explicit invalidation proof. |
| Admin Accounts/Licenses operator tables | No cache; operator actions require current assignment/revocation state and traffic is low. |
| Commerce checkout/order/entitlement commit | No authority cache; all mutations and price/offer validation hit durable state. |
| Newsletter campaign/delivery operator state | No generic cache; low traffic and exact send state matters. |
| DB migration state | Never cache as authority. |
| Trust Root/Keyset/REL/ATT/ENT verification | Never cache as optional Redis authority. |
| Signed Transport nonce/sequence/replay authority | Preserve protocol-specific persisted verifier state; never substitute Redis cache. |
| Local Desktop BA, evidence, charts, datasets, vault/credentials | Remain local-first; server Redis must not become a copy of user business data. |
| Deterministic BA/evidence truth | A pure computation may later memoize by immutable content hash locally, but Redis never grants factual authority. |

## 14. Redis coordination keys

Use versioned, environment-scoped prefixes. Illustrative namespaces:

- `lightbi:<env>:q:<short|default|long>:v1` — worker streams;
- `lightbi:<env>:worker:<queue>:<id>` — heartbeat TTL;
- `lightbi:<env>:scheduler:leader:v1` — short lease for one scheduler leader;
- `lightbi:<env>:mb:presence:<installation-hash>` — app presence TTL;
- `lightbi:<env>:mb:candidate-score:v1` — rehydratable scheduler index;
- `lightbi:<env>:mb:backpressure:v1` — ephemeral derived pressure counters;
- `lightbi:<env>:cache:<read-model>:<version>:<key>` — bounded read caches.

Every key class needs TTL or an explicit bounded retention rule. NEXT and Production prefixes/credentials remain isolated.
## 15. Backpressure and failure behavior

Initial global policy:
- Ready-lake quota <80%: normal scheduling;
- >=80%: reduce new issuance and Large share;
- >=90%: admit only high-value and Small jobs unless Admin overrides;
- 100%: pause automatic intake; manual audited jobs remain possible;
- long-worker queue depth/working-set pressure high: stop issuing new Large jobs;
- elevated upload/validation failures: exponential backoff with jitter;
- Redis unavailable: stop new dispatch safely, retain PostgreSQL jobs, and rehydrate after recovery;
- R2 unavailable: preserve jobs and multipart state, do not proxy large uploads through VPS;
- worker crash: lease expires, Redis pending entry is reclaimed or job is rehydrated;
- duplicate upload/batch: content/job idempotency returns the existing durable result.

## 16. Admin `/admin -> Micro Brain` contract

Add five sub-surfaces:

1. **Live** — existing active apps, observation batches, today/yesterday, intake and signed capability progress.
2. **Queue** — job state, queue class, size lane, age, score, app/generation, bytes, retry and worker lease. Actions: `Boost`, `Pull now`, `Pause/Defer`, `Cancel` where safe.
3. **Scheduler** — Auto collection On/Off, cadence, lane weights, max concurrent uploads/workers, per-app/global daily quota, job-size ceiling and allowed network class.
4. **Data Lakes** — byte/object counts for intake/quarantine/ready/training/learned/rejected/archive, TTL/retention, `Pause intake`, `Drain ready`, `Purge expired`, temporary quota override.
5. **Learning** — discovered candidates, confusion candidates, validation accepted/rejected, signed-pack pending, and pack N vs N-1 deltas.

Admin mutations are audited and stored durably in PostgreSQL. Redis reflects them only as runtime coordination state.
## 17. Proposed API and scheduler surface

Exact routes are implementation-detail candidates, but the first contract should cover:

- app poll: obtain zero or one currently assigned contribution job plus policy/cadence hints;
- contribution prepare: submit local sanitized manifest, expected bytes/hash and network class;
- upload grant: return a short-lived R2 multipart/presigned target bound to job/install/object path;
- upload complete: commit final object hash/size and enqueue validation;
- job progress/abort: resumable client acknowledgement without trusting client-only state;
- Admin queue/scheduler/lake reads and audited mutations;
- Internal worker health and per-queue diagnostics.

Job polling must authenticate the installation using the existing trusted native transport boundary once the relevant route class is implemented. Poll responses reveal only the caller's assignment and global policy required by the client.

## 18. Learning processing pipeline

```text
sanitized package uploaded
  -> hash/size/schema/privacy validation
  -> duplicate/content-address check
  -> quarantine or ready
  -> bounded long-worker lease
  -> feature/candidate extraction
  -> reusable knowledge candidates
  -> golden + holdout + counterfactual + grain/formula/negative-knowledge gates
  -> review/approval
  -> deterministic corpus/index rebuild
  -> signed/versioned Intelligence Pack
```

Worker output is evidence/candidate material. Workers do not possess Root, signer or production-promotion authority.
## 19. Implementation phases

### MB-LQ0 — contracts and migration design
Freeze job/lake schemas, privacy package schema, queue classes, key namespaces, admin policy model, R2 object path contract and test fixtures. No live collection expansion yet.

### MB-LQ1 — async-job + Redis worker foundation
Add `lightbi_async_jobs`, dispatcher/rehydrator, Redis Streams, three consumer groups, leases, retries, DLQ/failure state, worker heartbeat and diagnostics. Migrate no existing outbox events unless a separate reason exists.

### MB-LQ2 — scheduler + Admin Queue/Scheduler
Implement app-presence, eligibility, 5:3:1 fairness, score/aging, cadence, quota/backpressure, Admin controls and audit records.

### MB-LQ3 — R2 direct contribution transport
Implement privacy manifest, short-lived direct upload grants, multipart resume, content hash/size verification, intake/quarantine/ready state transitions and lifecycle policy.

### MB-LQ4 — validation + training workers
Implement default/long handlers, bounded working set, candidate extraction, dedupe, learned/rejected outcomes and Live Lab queue/lake metrics.

### MB-LQ5 — selective Redis cache adoption
Add only the approved cache rows in §13, with TTL, namespace/version, invalidation tests, Redis-loss fallback and stale-authority negative tests.

### MB-LQ6 — signed learning progress integration
Connect validated learning outcomes to the existing offline corpus/rebuild/acceptance pipeline. Preserve `data arrived != learned`; only signed pack activation advances capability metrics.

### MB-LQ7 — NEXT scale and failure acceptance
Run synthetic multi-app queue/load tests, Redis restart, worker kill/reclaim, R2 outage/resume, quota saturation, duplicate upload, malformed/private-data package rejection and Admin pause/resume before any Production consideration.
## 20. Acceptance gates

A phase cannot claim closure without machine proof for its own boundary. Minimum integrated gates before owner UAT:

- Redis loss/restart causes no durable job loss and no duplicate completed work;
- PostgreSQL rehydration reconstructs Redis dispatch state;
- worker crash after dispatch, after lease and during execution recovers correctly;
- `short/default/long` concurrency/resource separation is observable and enforceable;
- scheduler fairness proves Small jobs do not monopolize service and Large jobs do not starve;
- 1 GiB default / 2 GiB hard object ceilings fail closed;
- App -> R2 uploads never proxy large payloads through CP/VPS;
- forbidden/raw fields are rejected before upload grant where detectable and again in server-side validation;
- duplicate content is deduplicated without increasing learning authority;
- Admin Pause stops automatic issuance without destroying queued durable state;
- quota/backpressure thresholds behave deterministically;
- all approved Redis read caches survive eviction/unavailability by falling back to source-of-truth reads;
- Trust/account/license/entitlement/security/evidence negative tests prove cache cannot grant authority;
- signed pack progress changes only after validated signed Intelligence Pack activation;
- Production services, data, Redis namespace and R2 learning namespace remain untouched during NEXT acceptance.

## 21. SLO/observability targets for NEXT

Expose per queue: ready depth, oldest age, leased/running, retry/dead, throughput, p50/p95 wait time and worker heartbeat. Expose per lake: object/byte count, oldest age, ingress/egress, validation rejection reasons and current quota pressure.

Target scheduler/API overhead should remain small relative to analysis work. Normal app polling should return quickly and usually return `no_job`; the system must tolerate large populations through jitter, backoff and bounded issuance rather than per-app server timers.

## 22. Current status

**Implementation has advanced through MB-LQ2 on NEXT.** MB-LQ0 contracts/migration design are source-closed at Control Plane `00e8abb7aed68d2fa872dd4758c0443819ba1527`. MB-LQ1 durable Postgres jobs, Redis Streams dispatch/rehydration, lease-governed async runtime and diagnostics are source-closed at `77dd7df5804da725169bd4c2260b1c7c944d7134`; NEXT async systemd unit templates are recorded at `84099b3ea7470243519682b7604a3f64da45f21e`. MB-LQ2 scheduler, `server|client` execution-target separation, bounded backpressure/fairness and Admin Queue/Scheduler controls are source-closed at `dbf7bfeb77cac8bbabff4b1525b6e7efe3665697`.

Migrations `069_micro_brain_learning_foundation` and `070_micro_brain_learning_scheduler_hardening` are applied on NEXT. Current schema status is `24` migrations, `pending=0`. Full Control Plane regression after LQ2 is `264/264 PASS`. A real NEXT Postgres+Redis LQ2 rehearsal proved Redis leader election, automatic creation of two client-target collection jobs, server-dispatch exclusion of those client jobs, server-lease rejection of a client job, deterministic `100% -> paused` ready-lake pressure, and scheduler refusal with `backpressure_paused`. The rehearsal rolled back all synthetic Postgres state (`installations=0`, `jobs=0`, `contributions=0`) and removed its Redis leader key.

Live activation of the three new `short/default/long` systemd workers remains **OPEN**, not failed: the existing user systemd manager PID `943` is alive but `/run/user/1000/bus` is still absent, so `systemctl --user` cannot connect. Restarting that manager could restart protected trust services, therefore activation remains deliberately deferred. The live NEXT Control Plane runtime has also **not** been rotated to `dbf7bfe`; it remains `eea0de340615c145feeb8461d568364c5d041d66`, so the new Admin Queue/Scheduler surface is source-closed and schema-ready but not yet live-served. Trust issuer PID `3817149` and signer PID `12020` were unchanged across the LQ2 migration/rehearsal. MB-LQ3 App -> R2 direct contribution transport is the next implementation phase; R2 intake is not yet active and no large learning payload is proxied through the VPS. Production remains untouched.

## 23. Source bookmarks

Canonical architecture:
- [`../../../architecture/micro-brain-cross-domain-semantic-expansion.md`](../../../architecture/micro-brain-cross-domain-semantic-expansion.md)
- [`../../../architecture/micro-semantic-brain-vector-inference.md`](../../../architecture/micro-semantic-brain-vector-inference.md)
- [`../../../architecture/road-to-1-0-trust-release-contract.md`](../../../architecture/road-to-1-0-trust-release-contract.md)

Verified code surfaces at plan time:
- Product `apps/desktop/src/lib/app-usage-telemetry.ts` — current 25-retrieval / 60-second aggregate observation batching and retry identity.
- Control Plane `apps/distribution/src/domains/analytics/analytics.ts` — current Redis-backed analytics cache and Micro Brain observation persistence.
- Control Plane `apps/distribution/src/worker.ts` and `src/worker/worker-runtime.ts` — current single worker and transactional outbox handlers.
- Control Plane `apps/distribution/src/platform/events/outbox.ts` — durable Postgres event retry/claim model that remains distinct from future command jobs.
- Control Plane `apps/distribution/src/domains/identity/account-auth.ts`, `domains/admin/admin-auth.ts`, `domains/identity/security-challenges.ts` — current Redis ephemeral authentication/challenge/rate-limit state.
- Control Plane `apps/distribution/src/platform/cache/license-secret-cache.ts` — bounded one-time/plaintext license resend cache.
- Control Plane `apps/distribution/src/domains/marketing/redis-throttle.ts` — Redis coordination where failure defers instead of bypassing rate policy.

The exact implementation must re-audit current HEAD before mutation; these bookmarks describe the 2026-09-07 planning baseline, not a perpetual code-location contract.
