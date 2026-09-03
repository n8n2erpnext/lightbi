# LightBI Control Plane Map

**Edition:** 0.6 Cross-Repository Control-Plane Reconciliation
**Audit date:** 2026-08-30
**Private repository:** `n8n2erpnext/lightbi-control-plane`
**Private main at audit:** `87b2ee457c30ac4f7d7d55332bbfc658d51b2c53`
**Running service:** host process on port 5174, working directory `/home/ubuntu/services/lightbi-control-plane/apps/distribution`
**Status:** private source provenance, runtime ownership, deployment copy, current Beta contracts, and 1.0 boundary reconciled; post-audit CP-1→CP-6 foundation candidate tracked separately from authoritative private main/production.

---

## 1. Why this repository exists

The private control-plane repository owns the online operational plane that was intentionally removed from public AGPL LightBI Basic.

Its README scopes current responsibility to distribution, accounts, administration, privacy-safe analytics, payment fulfillment, current Beta entitlement, transactional mail, and release discovery.

It explicitly excludes future Pro runtime, offline root authority, issuer private authorities, attestation implementation, device encryption, signed leases, and Pro package delivery.
## 2. Migration provenance is exact

`docs/MIGRATION_SOURCE.md` records public commit `653122eb48ff7132fa9b0d56089fa815da84d7ee` as the migration source.

Independent tree comparison confirms the initial private commit `2bcf7a8` copied **all 28 `apps/distribution/` files byte-for-byte** from public commit `653122e`.

Therefore the private repository did not originate an independently secret implementation. It established new ownership and deployment provenance for source that was already public.

Correct security premise:

```text
old implementation = permanently disclosed
private repository = future ownership boundary
secrecy must come from credentials/private future components, not erased Git history
```

This aligns with the public Phase 0–1 removal commit and PR #3 history.

## 3. Private repository history

The private lineage begins at `2bcf7a8` on 2026-08-28 and remains deliberately short.
Key commits:

| Commit | Meaning |
|---|---|
| `2bcf7a8` | establish private control-plane boundary from disclosed public source |
| `32fbd2d` | parallel staging service |
| `f960d1c` / `ce301f8` | runtime dependency/verifier hardening |
| `1e5eee4` | CI scanner correction |
| `5f05a55` | pre-production-cutover compatibility checkpoint |
| `68b9dc9` | rollback-safe Phase 0 runtime-rotation tooling |
| `48188d0` | revoked-runtime dependency verification |
| `227bbc7` | production cutover checkpoint documentation |
| `822a016` / `3d4e079` | external dependency/credential decision records |
| `950e718` | private bundled logo |
| `be5f5a2` / `87b2ee4` | distribution UI polish/cache-key corrections |

Remote also retains a `backup/pre-production-cutover-20260828` branch at `5f05a55` and small UI-fix branch/PR refs. These are operational bookmarks, not alternate control-plane architectures.

## 4. Current repository shape

Private main contains 51 tracked files. The implementation remains intentionally compact.
Major groups:

```text
apps/distribution/       operational Node control plane + portal
assets/screenshots/      public product media used by the portal
deploy/                  production/staging unit + Postgres/Redis compose
scripts/                 release-manifest builder
.github/workflows/       private CI
README.md                security/ownership boundary
docs/MIGRATION_SOURCE.md cutover provenance
```

The service is still a single Node process with SQLite compatibility state plus PostgreSQL/Redis-backed account/analytics/auth helpers.

## 5. Current API surface

The server exposes these functional groups:

- public config and release discovery;
- email/Google account registration/login/recovery;
- native device-login handshake and account session;
- account entitlement redemption and device revocation;
- optional anonymous visit/app telemetry;
- installation pairing and download tracking;
- legacy/current-Beta license activation;
- checkout and payment webhook fulfillment;
- admin authentication, analytics, revenue, app usage, account and license operations.
Representative current routes include:

```text
/api/account/*
/api/auth/google/*
/api/releases/latest
/api/releases
/api/visit
/api/visit/end
/api/app/event
/api/pair
/api/download
/api/license/activate
/api/checkout
/api/webhooks/stripe
/api/admin/*
```

This is an online operational API. It is not the local Business Understanding Engine and must never become required for Basic local analysis.

## 6. Account and current Beta entitlement model

Account state uses opaque account IDs, separate identities, entitlements, devices, sessions, and audit records in PostgreSQL.

Native sessions are device-associated and longer-lived than web sessions. Device ownership is bound to a hashed installation identifier and an account; active device count is limited by the current entitlement.
If no entitlement exists, account summary defaults to Basic. Current redeemed Pro entitlement stores tier/status/source-license/max-device/expiry state.

This is materially better than browser-only tier state, but it is still the **Beta entitlement model**, not the frozen 1.0 trust model.

Current Beta still contains license-key-based transitions:

- paid/complimentary keys may grant Pro;
- partner-discount codes are explicitly non-entitlement checkout offers;
- direct `/api/license/activate` still exists;
- installation pairing can return Basic/Pro tier from server-side state.

Therefore current code must not be used to override the 1.0 rule that reusable standalone keys and localStorage tier are not final Pro authority.

## 7. Organization/Business 1.0 state

Current private main contains no implementation of the frozen organization Business model.

Repository search found no current implementation for:

- organization subject/seat membership;
- one-time organization claim tokens;
- 5/10/20/25/30 named-user seat enforcement;
- organization entitlement envelopes.

Those remain future work after the public trust-contract layer is frozen.
## 8. Future trust/signing features are correctly absent

Search of private main found no implementation of:

- installation certificates;
- request attestation;
- Ed25519 issuer hierarchy;
- signed leases;
- encrypted Pro capability packages;
- Pro package delivery;
- private signing service.

This absence is intentional and **correct for Phase 0–1**. The repository README explicitly forbids pulling Phase 2+/Pro trust authority into this migration phase.

Open public PR #4 defines the proposed public trust contracts, but private signer work remains downstream of that freeze gate.

## 9. Release discovery ownership

The private control plane consumes the public `lightbi.release.v1` / `lightbi.release-index.v1` catalog from R2.

Its release loader:

- validates product/version/channel/artifact identity;
- requires HTTPS artifact URLs and SHA-256 values;
- selects platform artifacts;
- reads latest + index from R2;
- falls back to GitHub Release/archive state when R2 is unavailable.
It does not author the release manifest used by native CI. Release publication remains a public-repository Actions responsibility; the control plane is a discovery/presentation consumer.

The live `/distribution/api/releases/latest` endpoint was verified during this audit and currently reports R2 source with the Windows/Linux `0.9.2-beta.7` manifest.

## 10. Analytics privacy boundary

Analytics accepts a fixed event allowlist. Current native app events cover open/close, feature use, and update lifecycle signals.

The analytics store hashes installation IDs and uses a rotating HMAC of coarse network prefixes rather than storing raw client network identity in the analytics event model.

The portal/admin presentation explicitly states that imported files, SQL text, table names, query results, and BA findings are not native-app telemetry fields.

Most importantly for product authority, `/api/pair` returns Basic without pairing when telemetry consent is false. Telemetry consent therefore is not required to keep Basic state.

This matches the design invariant that analytics is optional and separate from future security attestation.
## 11. Payment and mail are adapters, not local-product dependencies

Checkout is configuration-dependent. When payment configuration is absent, the endpoint fails as unavailable and the portal keeps Basic downloadable.

Payment fulfillment creates current-Beta license/entitlement state; this is transitional commercial plumbing, not the final signed-entitlement architecture.

Transactional mail supports account verification, password reset, and current license/offer delivery. Mail failure or configuration must not redefine local Basic authority.

No production configuration values are committed in the repository. The private CI also scans tracked source for credential files and obvious private-key/token patterns.

## 12. Private CI

Private `.github/workflows/ci.yml` runs on main pushes and pull requests with one Ubuntu verification job:

```text
pnpm install --frozen-lockfile
→ pnpm test
→ pnpm build
→ tracked-file/private-material scan
```

The GitHub API connector available to this audit could not read the private Actions run collection, so no claim about a specific private GitHub run is made here.
Independent local verification was run from a temporary read-only audit clone of private main `87b2ee4` without production configuration.

Results:

- `pnpm test`: **39/39 passed**;
- `pnpm build`: **passed**;
- temporary repo remained Git-clean after verification.

Tests cover admin credential hashing, public-route separation, license/offer policy, Hero/static portal contracts, release manifest/index behavior, runtime-rotation transformation, installation hashing, coarse-network privacy, payment webhook verification, analytics event allowlisting, dormant payment behavior, and current license lifecycle.

## 13. Running deployment source

Port 5174 is currently served by:

```text
/usr/bin/node --experimental-sqlite server.mjs
cwd: /home/ubuntu/services/lightbi-control-plane/apps/distribution
```

The running process was started on 2026-08-29 and is separate from the public LightBI repository working tree.
The deployment directory has a `.deployed-commit` marker containing `5f05a55`, but that marker is stale as a source-version indicator.

After normalizing CRLF/LF line endings, the deployed copy matches current private main `87b2ee4` for every runtime/source/config file. The only real content differences are two test files and `docs/MIGRATION_SOURCE.md`.

Therefore runtime code is effectively aligned with private main even though the deployment marker was not updated.

This should be treated as operational metadata debt:

```text
runtime source alignment  current
.deployed-commit marker   stale
```

Future deployment tooling should update a trustworthy deployed-SHA marker atomically with source rollout so provenance does not require byte comparison.

## 14. Recovery-worktree `apps/distribution/` is not current authority

The old Beta-recovery worktree still contains its own untracked `apps/distribution/` directory.

Compared with private main, 20 of 34 private app files match after line-ending normalization, eight have real differences, and six private operational/migration utilities are missing from the old copy.
That old copy also contains ten backup/package artifacts not present in private main.

Conclusion: the recovery-tree copy is **workbench residue / historical migration source**, not the current control-plane source of truth. Do not develop or deploy control-plane changes from it.

Current authority is:

```text
source truth      private repo main @ 87b2ee4
deployed runtime  /home/ubuntu/services/lightbi-control-plane
old local copy    historical/workbench residue only
```

## 15. Public/private release-contract boundary

Phase 0–1 intentionally leaves the Basic release-manifest builder/validator contract public while moving online service implementation private.

This is the right boundary:

- public clients must be able to understand and validate Basic release metadata;
- release publication remains reproducible in public CI;
- account/admin/payment/analytics implementation belongs to private operations;
- security must not depend on obscuring the public release schema.

The private control plane may consume that public contract but should not fork a semantically incompatible variant.
## 16. Current Beta versus frozen 1.0 truth

| Concern | Current private control plane | 1.0 target |
|---|---|---|
| Basic fallback | preserved | preserved |
| account identity | implemented | retained, hardened |
| device record | hashed installation identifier | trusted key-backed installation |
| Pro authority | account entitlement plus transitional license flows | account/org + trusted installation + valid signed entitlement |
| reusable Pro key | still supported in Beta | forbidden as final authority |
| organization Business | absent | named-user organization model |
| attestation | absent | certificate + signed request envelope |
| signer hierarchy | absent | offline root + purpose-separated issuers |
| Pro package delivery | absent | private signed/encrypted capability delivery |
| analytics | optional allowlisted events | remains separate/optional |
| release discovery | public R2 manifest consumer | separate release-trust path |

Current implementation is therefore **operational Beta control plane**, not a partially hidden 1.0 trust service.

## 17. Do-not-cross boundaries for future work

Do not put these into public Basic source merely because clients need to call them:

- private account/admin/payment implementation;
- future private signing implementation;
- issuer private material;
- proprietary Pro runtime/package implementation;
- private delivery policy and operational credentials.
Public source should retain only the contracts and verification logic required for interoperable Basic/update/trust verification.

Do not make online availability a prerequisite for local Basic data intake, understanding, governed analysis, Investigation, charting, or export that is licensed for Basic.

## 18. Control-plane conclusion

The Phase 0–1 split is real, coherent, and operating from the private deployment path.

The private repository is traceably derived from disclosed public source, has independent CI policy, passes its current 39-test suite/build locally, and owns the running distribution/account/admin/analytics/payment/mail service.

The deployed runtime source is effectively current with private main despite a stale `.deployed-commit` marker.

The old `apps/distribution/` copy in Beta-recovery is not authoritative and should be treated as migration/workbench residue.

Most importantly, current Beta entitlement behavior must not be confused with the frozen road-to-1.0 trust architecture. The future organization, attestation, signer, signed entitlement, and Pro capability-delivery layers are still absent by design.

```text
Phase 0–1 private ownership     VERIFIED
production runtime separation  VERIFIED
private source/current runtime  ALIGNED (marker stale)
current private tests/build     VERIFIED
Beta account/entitlement        IMPLEMENTED
1.0 trust/signing/Pro delivery  NOT IMPLEMENTED
```

## 19. Post-Project-Truth control-plane foundation promotion

The original reconstructed CP-1→CP-6 workspace remains historical implementation provenance, but it is no longer the active promotion surface. Private Git authentication was restored and the foundation chain was replayed content-aware onto the **real private-main ancestry** in `/home/ubuntu/n8n2erpnext/lightbi-control-plane`, branch `codex/control-plane-foundations-20260830`, based on private `main` `87b2ee457c30ac4f7d7d55332bbfc658d51b2c53`. Newer private-main Hero/logo tests and behavior were preserved rather than overwritten by the older reconstruction.

The authoritative-ancestry candidate sequence is now:

```text
87b2ee4  private main base
→ 00021e6 / 8385d2b  CP-1 TypeScript/runtime replay
→ 88b11ab              CP-2 modular persistence
→ 7488cee              CP-3 async foundation
→ c89d16a              CP-4 identity security foundation
→ 02c7602              CP-5 organization/entitlement foundation
→ 878f2f0              CP-6 commerce/integration foundation
→ 9997b7c              architecture closure
→ b9763e7              CP-2.1 API v1 boundary
→ 6391929              CP-2.2 account-session v1 compatibility adapter
→ a7056fc              deterministic CP-4 tamper-test repair
→ 34d9c5d              CP-3.1 staging/migration safety
```

The branch is pushed to the private GitHub repository. Verification progressed from the private-main 39-test baseline to 58/58 after the full foundation replay, 63/63 after CP-2.1, 67/67 after CP-2.2/architecture assertions, and **71/71 on three consecutive runs** after CP-3.1. Strict TypeScript and compiled build gates also pass.

CP-2.1 establishes a dedicated `/api/v1` HTTP boundary with Zod request validation, bounded request/correlation IDs and stable success/error envelopes. CP-2.2 exposes current account session state only as `source: beta_compatibility` with `finalAuthority: false`, preventing transitional Beta entitlement from masquerading as the future signed 1.0 authority.

CP-3.1 separates staging API/worker service trees from production, adds non-mutating migration plan/status modes, makes schema apply explicit, and prevents worker startup from auto-running migrations. A read-only staging preflight confirms staging PostgreSQL, Redis, data directory and port differ from production, but staging activation is currently blocked because its public origin still equals production and PostgreSQL authentication returns `28P01`. No migration was applied and no staging/production service was started.

Current authority therefore remains:

```text
private main authority      87b2ee4 until reviewed/merged promotion
pushed promotion candidate  34d9c5d on codex/control-plane-foundations-20260830
running production          /home/ubuntu/services/lightbi-control-plane on 5174
production mutation         none
```

A GitHub pull request has not been opened because the available GitHub write integration returns `403 Resource not accessible by integration`; branch push through the authorized Git remote succeeds. Private pull-request CI therefore remains a promotion gate rather than a completed claim.

Trust remains separate. None of these CP additions implement the Rust signer, installation certificate issuance, request attestation, signed entitlement or private Pro package authority. **Trust-1 remains blocked until the exact Phase 2A contract head receives explicit independent freeze approval.**
## 20. Authoritative-ancestry foundation branch after Project Truth

The reconstructed CP candidate was subsequently replayed/reconciled onto the real private-main ancestry in `/home/ubuntu/n8n2erpnext/lightbi-control-plane`. The active private feature branch is `codex/control-plane-foundations-20260830`; it is no longer dependent on the reconstructed Git ancestry described in section 19.

Current pushed checkpoints include the CP-1→CP-6 foundation chain, `/api/v1` boundary and Beta account-session adapter, explicit migration plan/status/apply lifecycle, staging-tree isolation contract, worker fail-closed schema readiness, and a schema-gated CP-5.1 account/organization authority read model. The latter is explicitly `control_plane_database_unsigned`, `signed=false`, `finalAuthority=false`; it does **not** replace future signed ENT authority.

As of code checkpoint `3bcc88a8ed3e7cae2aef16b7beba4392663a7a05`, the private CI-equivalent gate passes **73/73** compiled-runtime tests. Documentation/status is pushed through `d58139d9744b2b24b3d0d7638ba93ace8db6ac62`. Production still runs the old deployment tree and no CP PostgreSQL migration has been applied.

Staging remains blocked from activation because its public origin is still production-equivalent and read-only migration status cannot authenticate (`28P01`). These are deployment-preflight blockers, not reasons to weaken migration or API gates.

## 21. Identity-security and runtime-migration checkpoints

The authoritative-ancestry private feature branch has advanced beyond the CP-5.1 read model. CP-4.2 (`a284598`) binds security-ready account sessions to the current durable `security_version`; a later credential/factor change can bump the account version and invalidate older sessions without browser-local authority. CP-3.2 (`fc9d1d5`) removes remaining API runtime calls to `runPostgresMigrations`; schema mutation is reserved for the explicit migration CLI, while runtime components must fail closed when required schema is absent.

CP-4.3 (`83fd704`) adds the service layer for encrypted pending TOTP factors, code verification, atomic activation, recovery-code rotation, security-version bumping and security-event recording. Product TOTP enrollment routes remain disabled until MFA-aware login/step-up policy is enforced; Passkey verification remains disabled pending an audited WebAuthn implementation. The private gate reaches **85/85** compiled-runtime tests and documentation/status is pushed through `5d2fd3e`.

These remain feature-branch candidates. Production 5174 and production data are unchanged; staging migrations remain unapplied. None of these checkpoints alter Phase 2A trust status or implement signer/attestation/private-key authority.

## 21. MFA enforcement and TOTP enrollment candidate

The authoritative-ancestry private feature branch now includes CP-4.4 at `28b637063c7b67a1e0c186b16df3365583ca5e0e` and CP-4.5 at `25fa53348bce84e7220bf530a820c228f43e3fc8`; private docs/status are pushed through `af80cd53708ac2709333b1242826454257cb86a6`. CP-4.4 makes active TOTP a real login/step-up requirement instead of a decorative account setting. Password, Google and native-device flows fail closed into a one-time MFA challenge and TOTP/recovery completion yields an MFA-level session. CP-4.5 opens TOTP enrollment only after schema/policy/runtime prerequisites and recent authentication; a protected account must step up before adding another factor. Confirmation rotates recovery codes and increments `security_version`, invalidating stale sessions.

The full private gate passed **96/96** tests. Passkey/WebAuthn remains unavailable until an audited library/adapter is selected; no custom WebAuthn verifier is permitted. Production/staging runtime and databases remain unmodified.

## 22. Audited WebAuthn adapter, session assurance, and Passkey candidate

The authoritative private feature branch advanced through CP-4.6 `bfbf6d9`, CP-4.7 `90ba49e`, and CP-4.8 `9c89a81`; current documentation head is `0385b316f54f73fa4d3e7ce481fa377c93f5471b`. The candidate uses maintained `@simplewebauthn/server` verification rather than hand-written WebAuthn cryptography. Migration 041 stores device/back-up metadata and migration 042 gives sessions explicit assurance/method semantics.

Passkey registration and discoverable passwordless web login are gated by required schema plus explicit RP-ID/HTTPS-origin configuration. Registration requires recent authentication or step-up and bumps `security_version`. Login uses one-time challenges, active-account credential resolution, and compare-and-set signature-counter persistence before issuing a `phishing_resistant` HttpOnly web session. The test progression is 100/100 at CP-4.6, 104/104 at CP-4.7, and 110/110 at CP-4.8.

This remains a **private feature-branch candidate**, not production authority. No production/staging database migration, service restart, or runtime mutation occurred. Phase 2A Trust Contracts remain unfrozen; the Passkey work does not authorize the private signer, installation attestation, signed ENT, or Pro-package signing path.

## 23. NEXT/Internal successor control-plane sibling

A separate successor worktree exists at `/home/ubuntu/n8n2erpnext/lightbi-control-plane-next-internal`, branch `codex/next-internal-generation-20260830`. The foundation was pushed at `c8a667cc0e760572f9aa620ca72cdc8cd5bfb41d`. At the NEXT-012 checkpoint the CP source head remained `c251fb1ee981a529c33335d25d3ada4e6ea9d23f` and paired with Core `d82bdb625b69755af51f42c01e2a35fe00731c28`; those intervening Core/frontend generations required identity reconciliation rather than new CP behavior. NEXT-013 later superseded this historical source checkpoint with documentation-domain CP head `d1a7d439fe43d8678626e377c2853558bc50c8d6`; NEXT-014 advances portal/docs hardening to `497ffbf9592faddefec72280a4ddd244efab648c`, and the current NEXT-015 CP head is `f1879c65453cdf0bc9798257e462264f0424e907` for the first-paint routing regression fix.

The successor adds migration `033_runtime_heartbeats`, a worker heartbeat keyed by service instance/generation/commit, internal-only `/api/v1/internal/diagnostics`, NEXT environment verification and isolated API/worker systemd contracts. The environment contract requires separate PostgreSQL, Redis, data directory, public origin and release endpoints; when a production env is supplied to the verifier, equality on those endpoints is a blocker.

Latest `c251fb1` strict typecheck/build and **116/116** compiled-runtime tests pass. A read-only runtime check on 2026-08-30 found the internal API and worker already running on `100.94.184.141:5274`; diagnostics reported generation `g-2026-08-30-next-001`, exact CP commit `c251fb1`, schema target `061_integrations_delivery` current with no pending migrations, and a healthy worker on the same generation/commit. The actual NEXT-vs-production environment verifier also passes all 8 writable/isolation comparison keys; runtime endpoints are separate for PostgreSQL, Redis, data directory, public origin and release namespace. The current verifier does not cover the broader identity settings: runtime inspection found `LIGHTBI_WEBAUTHN_RP_ID` and `LIGHTBI_WEBAUTHN_ORIGIN` absent, so full environment-contract completeness is not yet proven. Production `5174` was not restarted or migrated by this revalidation.


## 24. NEXT g-2026-08-30-next-002 runtime reconciliation

The exact private successor remains `c251fb1ee981a529c33335d25d3ada4e6ea9d23f`; strict environment verification, typecheck/build and **116/116** compiled-runtime tests pass. A fresh API instance for `g-2026-08-30-next-002` is running on temporary Internal verification port `5374` and reports schema target `061_integrations_delivery` current with zero pending migrations. The paired Core/gateway proof runs on `5372/5373`. Production 5174 and its database/runtime were not restarted, migrated, or modified.

The CP API generation and commit match the new manifest, but worker identity does not yet match: diagnostics observe a fresh/healthy heartbeat from predecessor generation `g-2026-08-30-next-001` at exact CP commit `c251fb1`. Starting a new database-writing worker and terminating the predecessor Internal worker were both refused by the execution safety boundary before mutation. The mismatch is retained as a fail-closed promotion blocker; no manual heartbeat insertion, DB edit, or diagnostic bypass was used.
## 25. Canonical Internal bug-test routing

The owner-facing `5273` gateway now routes distribution/control-plane traffic to the exact NEXT-002 CP API instance on `5374`, whose diagnostics identify generation `g-2026-08-30-next-002`, commit `c251fb1ee981a529c33335d25d3ada4e6ea9d23f`, schema `061_integrations_delivery` current, and zero pending migrations. The older direct `5274` listener remains outside this gateway path. Worker-dependent release acceptance remains blocked because the shared Internal database still reports the predecessor `next-001` worker heartbeat.


## 26. NEXT-003 owner bug-test control-plane route

For owner bug testing after Core fix `eadba8f`, the canonical 5273 gateway routes control-plane calls to an Internal CP API instance on temporary port 5474. That API identifies `g-2026-08-30-next-003`, exact CP commit `c251fb1ee981a529c33335d25d3ada4e6ea9d23f`, schema `061_integrations_delivery` current, and zero pending migrations. No CP source changed for this generation; the alternate port exists only because the predecessor API process could not be replaced through the current execution boundary.

The async worker still emits a fresh predecessor `g-2026-08-30-next-001` heartbeat at the same exact CP commit. This does not prevent frontend/Core/CP bug testing on 5273, but it remains an explicit release/UAT generation-identity blocker. Production CP 5174 and production persistence remain untouched.


## 27. NEXT-004 owner bug-test control-plane route

The supporting-chart drill-through change is frontend/Core-repository work only; private control-plane source remains exact `c251fb1ee981a529c33335d25d3ada4e6ea9d23f`. For owner bug testing, the Internal CP API on port 5474 was restarted with generation identity `g-2026-08-30-next-004` using the existing Internal environment file. Only the safe Internal identity/port keys were changed; credentials and persistence endpoints were preserved.

Through canonical gateway 5273, diagnostics now report generation `g-2026-08-30-next-004`, exact CP commit `c251fb1ee981a529c33335d25d3ada4e6ea9d23f`, schema status `current`, expected `061_integrations_delivery`, and an empty pending-migration list. Trust remains `blocked_pending_phase2a_freeze`. The existing async worker still reports predecessor generation `g-2026-08-30-next-001` at the same CP commit, so release/UAT generation identity remains fail-closed while frontend/Core/CP bug testing is valid. Production CP 5174 and production persistence were not restarted or modified.


## 28. NEXT-005 canonical Internal runtime reconciliation

Native Excel Pivot work changes no private control-plane source; CP remains exact `c251fb1ee981a529c33335d25d3ada4e6ea9d23f`. The predecessor Internal processes were successfully terminated and the canonical topology was restored directly: Core `5272`, gateway `5273`, CP API `5274`, plus one Internal worker. The CP API and worker were launched with generation `g-2026-08-31-next-005` while preserving the existing Internal persistence/secrets configuration.

Diagnostics now report generation `g-2026-08-31-next-005`, exact CP commit `c251fb1...`, schema status `current`, expected `061_integrations_delivery`, pending migrations `[]`, and worker status `healthy` with the same generation and commit. Trust remains correctly `blocked_pending_phase2a_freeze`. The explicit NEXT-vs-production environment verifier passes all 8 compared writable/isolation keys. The former `next-001` worker-generation mismatch is closed; no DB heartbeat was fabricated and no migration was required for this frontend/Core feature generation.

Production `5174` and its persistence were not restarted, migrated or modified. Formal owner UAT/promotion and Trust Phase 2A remain separate gates.


## 29. NEXT-006 Advanced IDE runtime identity

The Advanced SQL completion change is Core/frontend-only; private control-plane source remains exact `c251fb1ee981a529c33335d25d3ada4e6ea9d23f`. Canonical Internal CP port `5274` and its worker were restarted with generation `g-2026-08-31-next-006` using the existing isolated Internal environment. Diagnostics report exact CP commit `c251fb1...`, schema `061_integrations_delivery` current with zero pending migrations, and a healthy worker on the same `next-006` generation and commit. No production CP process, database or Redis endpoint was restarted or migrated.

## 30. NEXT-009 Internal CP/worker lifecycle reconciliation

The Advanced/Easy round-trip fix changes no private control-plane source; CP remains exact `c251fb1ee981a529c33335d25d3ada4e6ea9d23f`. During the final `g-2026-08-31-next-009` cutover, the temporary manually launched CP API and worker were terminated and replaced by the already-defined user-systemd units `lightbi-control-plane-next.service` and `lightbi-control-plane-next-worker.service`. Both units load the existing isolated Internal environment; only the safe generation/commit/channel/port identity keys were updated. Database, Redis, encryption/session secrets and release credentials were not changed.

Runtime diagnostics report channel `internal`, generation `g-2026-08-31-next-009`, exact CP commit `c251fb1...`, schema `061_integrations_delivery` current with no pending migrations, and a healthy worker heartbeat carrying the same generation/commit. Trust remains `blocked_pending_phase2a_freeze`. Production CP `5174` and production persistence remained continuously present and were not restarted, migrated or modified.

## 31. NEXT-010 through NEXT-012 identity-only control-plane reconciliations

The sidebar-source and multi-file continuity fixes are Core/frontend changes only. Private control-plane source remains exact `c251fb1ee981a529c33335d25d3ada4e6ea9d23f`; no CP migration or schema change was introduced for NEXT-010, NEXT-011 or NEXT-012. The existing user-systemd units `lightbi-control-plane-next.service` and `lightbi-control-plane-next-worker.service` remain the lifecycle owners. Generation cutovers update only safe Internal identity/channel/port keys while preserving the existing isolated database, Redis, secrets and release configuration.

Runtime identities progressed through `g-2026-08-31-next-010` (Core `92906b1...`, manifest SHA-256 `d8ce0a61319a565589b74f706984d3c71eaafcca18f2a289220a859490a9eb74`), `next-011` (Core `fcefeb0...`, SHA-256 `5d0495a179e62d8e17f37e80d5efce8be89a467572689463be562d767a841ab0`) and the current `next-012` (Core `d82bdb6...`, SHA-256 `0f8ec8f1178a6298a69f297f5254ecb81603fea248615e4a7bfdd092f3bc9264`). At NEXT-012, diagnostics report channel `internal`, exact CP commit `c251fb1...`, schema `061_integrations_delivery` with status `current` and pending migrations `[]`, plus a healthy worker heartbeat carrying the same NEXT-012 generation and CP commit. Trust remains `blocked_pending_phase2a_freeze`.

Production CP `5174`, production PostgreSQL/Redis and the wider production `5172/5173/5174` stack were not restarted, migrated or modified by these Internal bug-test generations.


## 32. NEXT-013 governed documentation control-plane runtime

NEXT-013 is the first successor generation after NEXT-012 in this chain that changes private control-plane behavior. The exact CP head is `d1a7d439fe43d8678626e377c2853558bc50c8d6`; the documentation implementation entered at `7649dfde194c6053ebb96eaea6ddc70975f698cb` and the root-portal routing correction is `d1a7d439...`. Migration `062_documentation_content` is applied to the isolated Internal PostgreSQL database; diagnostics report schema current and no pending migrations.

The routing authority is explicit: the Internal CP listener `5274` is already the distribution website root. `http://100.94.184.141:5274/` serves the distribution homepage, `http://100.94.184.141:5274/docs` serves documentation, and `http://100.94.184.141:5274/distribution` intentionally returns 404. The desktop gateway may expose `/docs` as a convenience proxy and `/distribution-api/*` as the desktop API bridge, but it must not invent a second `/distribution` portal mount.

Documentation persistence is a small CP domain rather than a second CMS. Public reads are `/api/docs` and `/api/docs/:slug`; admin list/create/update/delete live under `/api/admin/docs`. Admin mutations reuse current admin authentication and the explicit admin-action header. The public renderer escapes raw HTML. Built-in published guide pages provide a read-only fallback when persistence is unavailable; admin mutation remains schema/persistence gated.

The Internal service tree is managed by the existing user-systemd units `lightbi-control-plane-next.service` and `lightbi-control-plane-next-worker.service`. The service tree `.deployed-commit` is now exact `d1a7d439fe43d8678626e377c2853558bc50c8d6`; both runtime identities report `g-2026-08-31-next-013`, exact CP commit, and worker healthy. The full compiled-runtime suite is **122/122 PASS**. A live break-glass Internal CRUD smoke created, publicly read, updated and deleted a temporary docs page; the post-delete public request returned 404.

Production `5174`, production PostgreSQL/Redis, and the wider production `5172/5173/5174` stack were not restarted or migrated. The production-control-plane authority described in earlier sections remains historical/current-production context; this NEXT sibling is an isolated successor candidate. Trust Phase 2A remains unfrozen and no signer/attestation/private-key authority is introduced here.


## 33. NEXT-014/NEXT-015 portal hardening and secondary-route first paint

CP `497ffbf9592faddefec72280a4ddd244efab648c` expands the schema-062 documentation portal without adding another persistence authority. It adds richer default documentation, real screenshot assets, explicit `docs:sync`, public SEO/robots/sitemap/llms behavior, and TypeScript source ownership for the browser bundle under `src/web/`. Internal docs sync against the existing isolated database created 11 missing pages and updated 5 existing pages; all 15 migrations remained applied with zero pending. The Internal admin `me@thaiduy.digital` was upserted through the existing admin-auth service and browser login succeeded. CP full proof at this head is 127/127.

The distribution root continues to be `5274/`; `/docs` is the documentation portal and `/distribution` remains a 404. Owner video evidence exposed that these distinct routes still shared the full static homepage shell during first paint. The bug was not in route authority or proxying: the browser could paint the common `index.html` homepage body before asynchronous Docs/Admin/Account renderers replaced it.

CP `f1879c65453cdf0bc9798257e462264f0424e907` installs a synchronous head guard for `/docs*`, `/account` and `/admin` and suppresses only the homepage's direct body children before they can paint. `server.test.mjs` freezes that ordering before `<body>`. Browser acceptance observes every animation frame and records no visible homepage hero on Docs index/detail, Account login, Admin login/authenticated view or Admin Accounts. Full compiled-runtime proof is 128/128.

The reconciled Internal runtime is `g-2026-08-31-next-015`, Core `d96011b...`, CP `f1879c6...`, schema 062 current/pending 0, healthy matching worker, manifest SHA-256 `110d7503bed7b93a849a9e453fa82bb9fc4be7be4aad30670fb69e04f719e97a`, and exact `.deployed-commit` `f1879c6...`. Production CP 5174 and production 5172/5173 were not restarted, migrated or modified. Trust Phase 2A remains unfrozen and signer/attestation work remains blocked.

## 34. NEXT-016 identity-only control-plane reconciliation

NEXT-016 changes no private control-plane source or schema. CP remains exact `f1879c65453cdf0bc9798257e462264f0424e907`, migration target remains `062_documentation_content`, and the existing user-systemd CP/worker units continue to own the Internal lifecycle. Only successor generation identity is reconciled to the new Core frontend head.

Live diagnostics report `g-2026-08-31-next-016`, exact CP commit `f1879c6...`, schema `current` with pending `[]`, and a healthy worker heartbeat carrying the same generation and commit. The first-paint guard introduced in NEXT-015 remains active; Chromium revalidation of direct CP `/docs`, `/account` and `/admin` shows the secondary-route marker before rendering and no visible homepage hero paint.

The current immutable manifest pins Core `451c9b6afe0a95bce5bce473a4a84c8b918f42cd`, CP `f1879c65453cdf0bc9798257e462264f0424e907`, schema 062 and SHA-256 `72f223df5c2508e2d1e278497e1d8a664aa55f87c5c497f8d48d5a76b77e7f90`. Production CP 5174 and production persistence remain untouched; Trust Phase 2A remains unfrozen and signer/attestation work remains blocked.


## 35. NEXT-026 explicit Passkey fallback and recovery-help control-plane closure

Private CP `30bb58ffeaaad80014fb7c57522a7b8a4eb6feb8` advances the NEXT authentication UX without changing schema or weakening strong-auth policy. The owner-reported defect was browser-side WebAuthn cancellation: `navigator.credentials.get()` throws on Cancel/timeout, and the prior catch path exposed the browser's raw `NotAllowedError` diagnostic while leaving authenticator fallback effectively hidden.

Account and Admin now share the same policy presentation: Passkey remains preferred, while an enrolled server-authorized TOTP/recovery fallback is rendered as an explicit **Use authenticator or recovery code** choice. Cancelling or timing out the Passkey picker returns LightBI-owned friendly status text instead of raw WebAuthn/W3C content. Fingerprint iconography is added to Passkey actions. The one-time email sign-in path remains a primary factor only; it cannot bypass configured strong authentication.

The same CP head adds published guide `sign-in-and-account-recovery` and **Need help?** links from both sign-in surfaces. The guide documents Passkey, TOTP, recovery codes, one-time email links and reset behavior while preserving the separation between ordinary LightBI Account authority and Administrator authority.

Verification at the exact CP head passes focused auth/docs **21/21** and the complete authoritative compiled-runtime suite **175/175**. No migration was introduced; the isolated Internal database remains at all 19 migrations applied with schema `065_marketing_newsletter_mail` current and pending `[]`.

The deployed Internal CP marker is exact `30bb58ffeaaad80014fb7c57522a7b8a4eb6feb8`. Live diagnostics over both the Internal origin and public HTTPS report `g-2026-09-02-next-026`, the exact CP commit, current schema and a healthy matching worker. HTTPS assets contain the explicit alternate-method/help/fingerprint markers and no raw W3C WebAuthn diagnostic URL. Production CP `5174`, Production persistence and Trust/private-key authority were not changed. Owner browser acceptance of the revised fallback flow remains open.

## 36. NEXT-027 governed announcement-template control-plane closure

Private CP `c012c572a7b0794aea75cdbb007490cfa2ebb8a5` makes announcement presentation an explicit persisted contract rather than deriving UX only from severity. Migration `066_announcement_templates` adds `template_kind` with a backwards-compatible `general` default and a database check for `general`, `promotion`, `update`, `warning`, and `hotfix`. Public announcement reads now return `templateKind`; Admin mutation validates the same enum and records it in the existing audit trail.

The `/admin` Commerce/Announcements surface exposes the five structured templates, derives their default severity, renders a live branded preview, and accepts escaped text plus optional HTTPS CTA/scheduling/channel fields. Raw announcement HTML is not accepted. The preview footer links to `/docs` and support; the Pro-key transactional-mail footer now also carries the Documentation link, aligning email and Inbox visual language without merging their delivery authorities.

Exact-head verification passes focused template/mail contracts **4/4** and the complete private CP authoritative suite **179/179**. Internal migration preflight reported exactly one pending migration (`066_announcement_templates`); apply completed successfully and post-apply status is 20 migrations with pending `0`. The pre-existing owner Inbox-test announcement was preserved and reads back with `template_kind = general`.

The active Internal lifecycle remains the four user-systemd units for Core, gateway, CP API, and CP worker. NEXT-027 cutover preserved the mutable CP `data/` directory separately from the source-tree swap and retained the prior NEXT-026 CP tree as rollback evidence. Runtime identity is `g-2026-09-02-next-027`; public `/api/v1/internal/diagnostics` reports exact CP `c012c572...`, expected schema `066_announcement_templates`, pending `[]`, and a healthy worker on the same generation/commit. Production CP `5174`, Production persistence, and Trust/private-key authority were not changed.

## 37. NEXT non-production Trust signer service boundary

Private signer rehearsal source is isolated in `apps/trust-signer` at exact private CP repository commit `8568ed90c5a44c52b048dfdca6bd94410027aaee`; the Distribution application at active runtime commit `9606c1bd052dff641a7949b79caf47b87bbe6eb7` does not import or expose signer implementation. The signer build compiles and consumes the exact public Trust Contracts source at `10de4da8e551a46f93f7b62985a0a6e611581b8e`, preserving one canonical byte contract across public verification and private signing.

The ARM rehearsal instance is a distinct user-systemd/Docker service named `lightbi-next-trust-signer`. It is labelled `next_internal_test_only`, non-promotable, and holds only purpose-separated TEST issuer private material for `release`, `attestation`, `entitlement`, and `pro_package`. The TEST Root private key is custody-separated and is not mounted into the runtime signer. Production keys are absent.

Host/container isolation is explicit: non-root `1001:1001`, Docker `network=none`, no published TCP port, local Unix-domain socket mode `0600`, read-only root filesystem, all Linux capabilities dropped, `no-new-privileges`, bounded PID/memory/CPU resources, read-only signer-data mount, no Docker socket and no host-filesystem authority. The signer runtime cannot write its key/config mount. Its disposable test-authority storage is outside the current NEXT chassis Restic whitelist.

Live proof over the Unix socket signs REL/ATT/ENT/PRO test envelopes and verifies every result with the exact public verifier. Unauthenticated keyset access fails, stable-release signing fails, and a generic signing endpoint is absent. The signer logs bounded audit metadata only; token/private-key/smoke-payload leakage probes are negative. The main NEXT runtime remains `g-2026-09-02-next-028` / CP `9606c1bd...` / schema 067 and has **not** yet been connected to this signer, so this service is rehearsal evidence rather than final Account/Pro authority. Production control-plane services and persistence were not modified.

## 38. NEXT-029 Trust publication and attestation verification boundaries

NEXT-029 keeps three Trust responsibilities separated. `lightbi-next-trust-signer` is the TEST-only signing plane and retains purpose-separated issuer private material behind a mode-0600 UDS. The Distribution CP at exact deployed source `6936fc4272bc92cd1badc00b9256cfd912e4a9ad` does not hold signer secrets; its Internal `/internal-trust/` edge serves only public Root/keyset/REL JSON produced by a privileged publisher CLI. `lightbi-next-trust-attestation` is a third sibling runtime that performs request verification only and explicitly refuses signer authority.

The attestation verifier is sourced from private head `b4e254ed41cad42af82dcef3376e36ba9afd3c5c` and runs image `lightbi-next-trust-attestation:b4e254ed41ca-trust-10de4da8` (`sha256:6f47bddcd728158812caea198e4c98207eea9e31ba0d4e85ce680655c8dc5b31`). It has Docker `network=none`, no published port, UDS `0600`, read-only rootfs, `cap-drop=ALL`, `no-new-privileges`, no Docker socket, no signer mount/token, a read-only public Trust mount, and a dedicated writable state mount for monotonic sequence/revocation state. Runtime state is mode `0600`; restart preserves its digest and accepted sequence floor.

The verifier consumes exact public Trust Contracts `10de4da8e551a46f93f7b62985a0a6e611581b8e`. `lightbi.next-attestation-request.v1` is explicitly a NEXT rehearsal request-proof protocol, not a frozen Production wire format. Live E2E proves ATT certificate issuance by the separate signer, ephemeral device signing, nonce issuance, body/target binding, monotonic sequence enforcement and restart persistence. Replay/tamper/rollback/target-mismatch probes fail closed. Distribution source remains free of attestation implementation and its existing pre-freeze foundation guard continues to pass.

## 39. NEXT signed-entitlement Pro authority conjunction boundary

The existing verification-only `lightbi-next-trust-attestation` sibling now also owns the NEXT rehearsal conjunction decision for Pro access. It does not sign ENT and does not receive signer credentials. The bounded CP rehearsal CLI performs real AccountAuth authentication and derives unsigned entitlement state from the governed entitlement repository; TEST ENT/ATT signing remains on the isolated signer plane. The verifier consumes only public Root/keyset material, the signed ATT/ENT envelopes, the device proof and caller-supplied authenticated subject context.

`/v1/pro-authorize` binds the device signature to a canonical `lightbi.next-pro-authority.v1` request containing the authenticated account identity, requested capability and digest of the exact ENT envelope. Authorization requires a trusted installation/release, valid ENT signature/lifecycle, subject match, capability match, and monotonic per-subject entitlement progression. For Business, the bounded caller also supplies an active organization membership read from CP authority; organization ID and member account must match the authenticated subject, and the signed entitlement must carry tier `business` plus a supported named-user seat limit.

Final runtime source is `31fa5428896f6e9cb7877d353e2485b43d7a1671`, image `lightbi-next-trust-attestation:31fa5428896f-trust-10de4da8`, image ID `sha256:a08e1f681b6ab564b9dc19b5b3202f33224e44d5ef4f54ab5dbe3be2ee228899`. Account Pro v1→v2 and Business 5-seat live authorization pass; ENT rollback and account-subject mismatch fail closed. No synthetic CP authority rows remain after the rehearsal. Distribution server source remains outside the signing/attestation implementation boundary.

## 40. `cli-lightbi` read-only signer-host operator boundary

`cli-lightbi` Phase A adds a host-side operator console without changing signer authority. Exact console source is `86512968d02ceca91c3292bb8a8648275ce60a22`. The primary executable is Rust/Ratatui/Crossterm and owns terminal presentation only; a sibling Node collector reads the existing mode-0600 signer UDS using the protected runtime token path and verifies public authority through exact Trust Contracts `10de4da8e551a46f93f7b62985a0a6e611581b8e`. Neither layer exposes a network listener, generic signing command, signer shell or issuer lifecycle mutation. Token value and private authority are not persisted in CLI configuration or binary output.

The installed immutable release is outside the signer container and does not require `docker exec`. Host diagnostics use fixed-argv `systemctl`, `docker inspect`, `journalctl` and `timedatectl` reads; signer Docker isolation remains authoritative. Pre/post-install comparison left signer image/boundary unchanged at `sha256:8dcb8e96feda93bb54c747ced89da02176dc6ad64b425730dab7930561bac0e2`, non-root 1001:1001, read-only rootfs, `network=none`, no ports, `cap-drop=ALL`, `no-new-privileges`, read-only signer-data mount and no Docker socket.

`doctor` validates environment/non-promotability, process/socket/container isolation, Root private absence from the signer boundary, Root→issuer chain, REL/ATT/ENT/PRO lifecycle metadata, structured audit/leakage markers and clock synchronization. Runtime fault probes are fail-closed: signer removal makes reads fail and the TUI mark data stale; socket mode 0644 is rejected until restored to 0600. Phase A is read-only; Phase B/C/D are not active control-plane capabilities.

## 41. NEXT private Pro delivery sibling boundary

R1-P11 adds a fourth isolated NEXT Trust runtime responsibility without moving signing authority into Distribution. `lightbi-next-trust-pro-delivery` consumes public TEST Root/keyset material, a read-only private encrypted-package store, and the verification-only attestation UDS. It has no signer token/socket mount, no Root/issuer private material, and no generic signing operation. The P10 attestation verifier remains the authority that issues and consumes one-time package/device-bound delivery grants; the delivery runtime can only verify a signed PRO manifest, validate ciphertext integrity and wrap the stored content key to the grant-bound X25519 device key.

Final private source is `deda7c284a6eafaa8cb69d491b96476a025ed15c`. Runtime image `lightbi-next-trust-pro-delivery:deda7c284a6e-trust-10de4da8` (`sha256:d176985adbf35ef30275d15d53660be5d512c28ca02613c5009ca09e8c5ecfda`) is non-root, read-only, `network=none`, no published ports, `cap-drop=ALL`, `no-new-privileges`, with public Trust/private encrypted package/attestation socket mounts read-only and only its output UDS directory writable. The final image builder deliberately excludes the privileged publisher CLI and stages only the three runtime JavaScript files.

Live E2E proves real AccountAuth + ATT + signed ENT + one-time grant + signed PRO + encrypted package delivery, correct-device unwrap, wrong-device rejection, grant-replay rejection and zero synthetic authority residue. Public Basic/release/Trust surfaces and the final flattened runtime image contain neither the private Pro marker nor the actual package content key. Delivery/attestation journals contain bounded metadata only. The application chassis remains NEXT-029 and Production is untouched; this boundary is `next_internal_test_only` and non-promotable.

## 42. R1-P12 NEXT independent-verifier boundary

Private Distribution source `85fa6a6961ba2bb00e2d09d92e6a9f5f815a3478` adds the NEXT anti-impersonation verification surface without granting signing authority to the web runtime. `/verify` is public verification-only code: it consumes only published TEST Root/keyset/REL material and caller-selected local artifact or pasted TEST ATT evidence. It contains no signer credential, issuer private material, generic signing operation, entitlement mutation or Pro delivery authority.

The verifier independently checks canonical TEST Root→issuer-keyset→REL signatures, REL tamper, local artifact SHA-256/size, and ATT release binding. Its UI explicitly states that NEXT cannot become `Official LightBI — verified`, that TEST evidence is non-production, and that Windows Authenticode/macOS Developer ID/notarization are a separate OS publisher plane. Exact private suite passes **204/204**. Live NEXT `/verify` returns 200 with the same fail-closed language.

The public desktop candidate `079c344952749d7a01c830a1b88c1d4247a1f5cf` links to this verifier only under governed URL rules: Internal derives the site-root `/verify`; Production requires an explicitly configured HTTPS verifier URL and otherwise shows `not configured`. This candidate is not deployed as a new generation. Active application CP remains `6936fc4272bc92cd1badc00b9256cfd912e4a9ad` on NEXT-029/schema 067. Production verifier/publisher authority remains absent and Production was not modified.

## 43. NEXT-030 Control Plane and worker runtime reconciliation

On 2026-09-03 the active NEXT-030 application chassis was reconciled without changing Production. Private Distribution source remained the already-pushed R1-P12 candidate `bb50b0d53542da5cd908e2237cbca368f7f87073`; its exact complete suite passed **209/209** before cutover. Read-only migration status against the isolated NEXT database reported all **21** migrations applied, expected schema `067_catalog_quarterly_pricing`, pending `[]`, so no database migration was required.

The existing user-systemd lifecycle owners were retained. Only the NEXT Distribution runtime tree was swapped from deployed marker `6936fc4272bc92cd1badc00b9256cfd912e4a9ad` to `bb50b0d...`; the previous Distribution folder was retained locally as rollback evidence. A new `next030` environment override sets channel `internal`, generation `g-2026-09-03-next-030`, and exact CP commit `bb50b0d...`. Database, Redis, encryption/session secrets, release credentials, signer authority and sibling Trust runtimes were not changed.

`lightbi-control-plane-next.service` now reports live diagnostics at NEXT-030 / `bb50b0d...` / schema 067 pending `[]`. The previously disabled `lightbi-control-plane-next-worker.service` was re-enabled under the same user-systemd owner; its fresh heartbeat is `healthy` with the same generation and commit. HTTPS through the canonical NEXT gateway returns 200 for `/`, `/docs`, `/verify`, `/account`, and `/distribution-api/api/v1/health`; gateway diagnostics confirm the matching CP/worker identity. The public generation header and immutable manifest remain `g-2026-09-03-next-030`, Core `7d15d69...`, intended CP `bb50b0d...`.

This closes the recorded NEXT-only generation drift. It does **not** change the Windows UAT source authority (`13202fd...` remains ahead of deployed immutable Core), does not create Windows Authenticode evidence, does not freeze Production Phase 2A, and does not authorize Production REL/ATT/verifier authority or R1-P13.
