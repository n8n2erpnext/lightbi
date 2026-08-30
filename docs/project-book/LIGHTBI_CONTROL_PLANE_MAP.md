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
