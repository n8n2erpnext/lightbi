# LightBI 1.0 control-plane boundary

Status: approved architecture baseline for Phase 0–1. This document describes a trust-boundary migration, not a stable-product release. LightBI remains on `0.9.x-beta.*` until the owner explicitly approves leaving Beta.

## Locked invariants

1. No client-controlled value can establish official LightBI identity or Pro entitlement.
2. Public LightBI source must never be sufficient to reconstruct the commercial Pro product by bypassing a license check.
3. A trust, network, entitlement, or integrity failure may remove commercial privileges but must never make local Basic functionality unusable.
4. Until the private boundary is complete, no new Pro enforcement or local licensing mechanism may be added to the public repository.

All server-side control-plane source previously committed to the public LightBI repository must be treated as permanently disclosed. Removing it from the current tree does not restore secrecy and is not a substitute for credential rotation.

## Current production truth

- Public repository: `n8n2erpnext/lightbi`.
- Migration branch: `codex/trust-boundary-phase-0-1` based on public `main` commit `653122eb48ff7132fa9b0d56089fa815da84d7ee`.
- Current desktop release remains `v0.9.2-beta.7`.
- Production control plane currently runs from `/home/ubuntu/n8n2erpnext/LightBI/apps/distribution` under the user service `lightbi-distribution.service`.
- Production runtime configuration is loaded from `/home/ubuntu/.config/lightbi-distribution.env`.
- PostgreSQL and Redis are active dependencies. License issuance/audit state also uses the application-owned SQLite WAL data directory.
- No actual Google, Stripe, private-key, PostgreSQL-URL, or Redis-password credential was found in the tracked tree/history by the Phase 0 pattern audit. The only `whsec_` match is a deterministic test fixture. This is not a guarantee that a credential was never disclosed through another channel; rotation remains mandatory where listed below.

## A. Public client contracts — retain

These files or responsibilities remain public because a standalone Basic build must compile and communicate with official services without importing private server implementation:

| Path/responsibility | Public reason |
| --- | --- |
| `apps/desktop/src/lib/account-api.ts` | Public account request/response client and official endpoint contract. |
| `apps/desktop/src/hooks/useLightBIAccount.ts` | Desktop account state consumer; not account authority. |
| `apps/desktop/src/lib/distribution-pairing.ts` | Random installation identifier and pairing client. Installation ID is identity only, not authentication. |
| `apps/desktop/src/lib/app-usage-telemetry.ts` | Optional, allowlisted telemetry client. Disabling it must not affect Basic or future Pro trust. |
| `apps/desktop/src/stores/update-store.ts` | Public Basic update client and staged update state machine. |
| `apps/desktop/src/components/settings/UpdateSettingsPanel.tsx` | Public update UI consumer. |
| `packages/core-types/src/release.ts` | Public release/update manifest types. |
| `crates/lightbi-tauri/src/main.rs` update commands | Native Basic artifact staging, digest verification, and explicit installation. |
| `apps/desktop/vite.config.ts` | Public routing compatibility for official service URLs. |
| `scripts/build-release-manifest.mjs` | Official Basic release tooling; must depend only on a public release-contract module after the split. |

Endpoint names, payload formats, official base URLs, installation-ID formats, and update protocols are not secrets.

## B. Private control plane — remove from public HEAD after cutover

The following server implementation moves to private `lightbi-control-plane`:

| Current path | Responsibility |
| --- | --- |
| `apps/distribution/server.mjs` | Production HTTP routing, account/admin/payment/license/analytics authority and static portal serving. |
| `apps/distribution/account-auth.mjs` | Account schema, email/Google identity, sessions, entitlement/device operations. |
| `apps/distribution/admin-auth.mjs` | Production administrator identity, session and throttling. |
| `apps/distribution/create-admin.mjs` | Administrator bootstrap utility. |
| `apps/distribution/analytics.mjs` | Production analytics persistence and Redis summaries. |
| `apps/distribution/license-policy.mjs` | Current Beta server-side license/offer policy. |
| `apps/distribution/license-secret-cache.mjs` | Temporary plaintext license delivery cache. |
| `apps/distribution/mailer.mjs` | Production transactional mail implementation. |
| `apps/distribution/public-url-contract.mjs` | Server-owned public URL construction for verification/reset/OAuth callbacks. |
| `apps/distribution/package.json` | Control-plane runtime package metadata. |
| `apps/distribution/*.test.mjs` | Server/control-plane contract tests, except release-contract tests extracted for Basic release tooling. |
| `deploy/lightbi-distribution.service` | Production service working directory and environment boundary. |
| `deploy/distribution-data.compose.yml` | Production PostgreSQL/Redis topology and credentials interface. |

`apps/distribution/release-manifest.mjs` contains a public Basic release contract, not commercial authority. Before removing `apps/distribution`, its validation/index/artifact-selection logic must be extracted to a public release-tooling module and consumed by `scripts/build-release-manifest.mjs`. A copy may remain private for the portal, but the public release workflow must not import the private repository.

## C. Website and marketing assets — reviewed

The files below contain no secret trust authority but are currently coupled to the private server and account/admin application shell:

- `apps/distribution/public/index.html`
- `apps/distribution/public/styles.css`
- `apps/distribution/public/admin.css`
- `apps/distribution/public/app.js`
- `apps/distribution/public/hero-demo.js`
- `apps/distribution/public/demo-data/*`

For Phase 1 they move with the private control plane so production has one deployable source boundary. Their previously public contents remain disclosed. A future public marketing-only repository may be created independently, but this migration will not introduce a second deployment pipeline merely to preserve their public location.

## D. Legacy disclosed material

The complete historical implementation of account sessions, administrator auth, license issuance, Stripe adapter/webhook, analytics, mail, URL routing, SQLite/PostgreSQL schema, Redis cache conventions, static portal and deployment topology is treated as adversary-known. No future trust decision may depend on these implementation details being hidden.

The current Beta mechanisms — local tier cache, `/api/license/activate`, `beta_unrestricted`, and `keyRequired=false` — are temporary compatibility behavior. Phase 0–1 freezes them; it does not convert them into the LightBI 1.0 trust architecture.

## Environment and rotation matrix

No values are recorded here.

| Variable/credential class | Purpose | Secret | Current dependency | Rotation/replacement | Destination/status |
| --- | --- | ---: | --- | --- | --- |
| `LIGHTBI_ADMIN_SESSION_SECRET` | Signs/administers admin sessions | Yes | Active | Required after private parallel verification | Private runtime secret store; revoke old value after cutover |
| `LIGHTBI_ACCOUNT_SESSION_SECRET` | Signs account sessions | Yes | Active | Required; planned session invalidation must be explicit | Private runtime secret store |
| `LIGHTBI_DISTRIBUTION_ADMIN_TOKEN` | Legacy break-glass admin token | Yes | Not configured on observed VPS | Keep absent unless an audited emergency mechanism is required | Private runtime only |
| `LIGHTBI_INSTALLATION_PEPPER` | HMAC pepper for installation identifiers | Yes | Not configured; public default currently used | Mandatory new private value | Private runtime secret store |
| `DATABASE_URL` | PostgreSQL account/analytics authority | Yes | Active | Create LightBI-specific credential, verify, then revoke old credential | Private runtime; no public repo secret |
| `LIGHTBI_POSTGRES_PASSWORD` | PostgreSQL container/bootstrap credential | Yes | Present in runtime env | Rotate with database credential and private compose deployment | Private runtime/compose secret |
| `REDIS_URL` | Session/cache/one-time-key cache | Yes when authenticated | Active | Introduce LightBI-specific authenticated Redis credential | Private runtime secret store |
| `GOOGLE_CLIENT_ID` | Public OAuth client identifier | No | Active | May remain unless a new OAuth application is created | Private runtime configuration; public identifier may appear in protocol |
| `GOOGLE_CLIENT_SECRET` | OAuth confidential client credential | Yes | Active | Rotate after private callback is verified | Private runtime secret store |
| `LIGHTBI_GOOGLE_REDIRECT_URL` | Legacy callback override | No | Present but not referenced by current server | Remove after callback contract verification | Retired |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_FROM` | Mail transport configuration | Mostly no | Active | Recreate in private environment | Private runtime configuration |
| `SMTP_USER`, `SMTP_PASSWORD` | Transactional mail identity/credential | Yes | Active | Rotate provider credential after private mail verification | Private runtime secret store |
| `STRIPE_SECRET_KEY` | Checkout authority | Yes | Not configured on observed VPS | Do not reuse any historical value; configure only when commercial checkout is enabled | Private runtime secret store |
| `STRIPE_WEBHOOK_SECRET` | Webhook authenticity | Yes | Not configured on observed VPS | New endpoint-specific secret when Stripe is enabled | Private runtime secret store |
| `STRIPE_PRICE_ID` | Product price reference | Configuration | Not configured on observed VPS | Recreate/verify when payment activates | Private runtime configuration |
| `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` | Basic release object publication | Yes | Unnecessarily present in current runtime env; GitHub Actions also uses release credentials | Remove from control-plane runtime. Rotate to a Basic-release-scoped CI token | Public repo GitHub Actions secrets only; values never in source |
| `R2_ACCOUNT_ID`, `R2_BUCKET`, `R2_PUBLIC_URL` | Basic release storage location | Mixed | Present | Keep public location metadata; credentials remain CI-only | Public release workflow configuration/secrets |
| `LIGHTBI_RELEASE_URL`, `LIGHTBI_RELEASE_ARCHIVE_URL`, `LIGHTBI_RELEASE_MANIFEST_URL`, `LIGHTBI_RELEASE_INDEX_URL` | Public Basic release endpoints | No | Active | Preserve exact URLs through cutover | Private portal runtime + public client contract as applicable |
| `LIGHTBI_DISTRIBUTION_PUBLIC_URL` | Public origin for account/reset/OAuth links | No | Active | Preserve exact origin | Private runtime configuration |
| `LIGHTBI_DISTRIBUTION_DATA_DIR` | SQLite Beta license/audit state path | No | Active | Migrate/copy with integrity backup before private service starts | Private service-owned data path |
| `LIGHTBI_PRO_PRICE_LABEL` | Portal copy | No | Active | Preserve current Beta copy | Private runtime configuration |
| `PORT` | Service listener | No | Active | Parallel service uses a distinct port until cutover | Private runtime configuration |
| GitHub/VPS deployment credential | Delivers private source | Yes | No dedicated private pipeline observed | Create least-privilege private deploy mechanism; do not reuse broad personal tokens | Private repo/runner secret or manual audited deployment |

## Approved Basic/Pro product boundary — documentation only

Basic must complete a real workflow:

```text
raw data → understand → analyze → drill/evidence → explain → useful export
```

Basic retains file/sheet/database intake, Easy Mode, core BA, foundational Deep BA, evidence drill-down, data understanding/trust, charts, useful basic export, history, SQL read/query, basic Advanced workspace, and a small multi-file workflow. Candidate quotas such as approximately three files and 70k rows require benchmarking before becoming a hard promise.

Future private Pro implementation monetizes scale, depth, automation, operational workflows, large datasets, full dashboards, database edit/writeback, Smart Excel/pivot-ready workbooks, canonical exports, advanced SQL/typed filters/parameters, large multi-source workflows, batch automation, commercial modules, advanced device entitlement, and Pro runtime/update delivery.

Basic/Pro enforcement is out of scope for Phase 0–1. Any capability whose implementation justifies Pro pricing must eventually live outside the public Basic source tree; merely hiding a public implementation is not a product boundary.

## Phase 0–1 migration order

```text
inventory
→ private repository
→ private CI and deployable package
→ parallel private service
→ functional verification
→ production cutover
→ credential rotation/revocation
→ remove public server implementation
→ verify standalone public Beta build
```

Cutover must precede removal. Phase 0–1 stops before offline roots, issuer keys, signing, attestation, request challenges, device encryption, native capability authority, Pro runtime, or private Pro delivery.

