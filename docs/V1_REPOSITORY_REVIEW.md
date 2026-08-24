# LightBI V1 repository review

Review date: 2026-08-24. This is a release-readiness audit, not a request to redesign stable components.

## Outcome

The repository retains a coherent product spine: local-first intake/canonical analysis, governed runtime, Advanced data workspace, native shell, and a separate distribution/account service. The V1 account/release work remains additive and does not move business data to the distribution backend.

No critical/high production dependency issue was found by `pnpm audit --prod`. One moderate Rust advisory remains upstream-blocked through Tauri's GTK3 stack; see Risks.

## Responsibility map

### Native and local analysis

- `apps/desktop`: product UI, canonical understanding, Easy/Advanced handoff, charts, BA, dashboard/export, account/update presentation.
- `apps/server`: embedded/local API and Advanced database execution.
- `crates/lightbi-tauri`: native shell, Credential Manager session storage, verified installer handoff, embedded server protocol.
- `packages/*`: shared contracts, query/runtime/chart/dashboard/plugin boundaries.

### Distribution and release

- `apps/distribution`: public portal, privacy-safe analytics, account/entitlement/device administration, transactional mail, license lifecycle.
- `packages/core-types/src/release.ts`: shared release contract.
- `scripts/build-release-manifest.mjs`: deterministic manifest/index generation.
- `.github/workflows/release.yml`: Windows/Linux build and gated GitHub/R2 publication.

## Large-file audit

### `apps/server/src/advanced.rs` — 5,735 lines

This is the main maintainability risk. Its responsibilities are currently:

1. connection/session state and SSH tunnels;
2. PostgreSQL/MySQL/MariaDB/SQLite/MongoDB/SQL Server schema discovery;
3. safe read query validation/execution and provider codecs;
4. mutation preview/commit and conflict control;
5. script preview/commit;
6. import/export jobs, cancellation and serialization;
7. provider integration tests.

The router boundary in `apps/server/src/lib.rs` calls these responsibilities through explicit Advanced endpoints, and `advanced_workspace.rs` already owns durable history/favorites/profiles. A future split is justified, but not during final Beta stabilization. Recommended order after release:

- `advanced/connections.rs`
- `advanced/schema/{postgres,mysql,sqlite,mongo,sqlserver}.rs`
- `advanced/query/{filters,execution,codecs}.rs`
- `advanced/mutations.rs`
- `advanced/jobs/{import,export}.rs`

Preserve the existing public handlers and tests while extracting. Do not rewrite provider logic.

### Other size observations

- `apps/server/src/lib.rs` (1,949): router plus legacy/local-analysis implementation; extraction should follow endpoint ownership only after Advanced split.
- `apps/desktop/src/pages/Home.tsx` (1,229): exceeds the governed 1,200-line page-shell target by 29 lines. Extract the next stable presentation block; do not move business logic back into the page.
- `Investigation.tsx` (1,110) and `Advanced.tsx` (813): large but still below the current page gates.
- understanding/BA engines between 800–1,400 lines are domain-heavy pure modules with substantial tests; split only around proven capability boundaries.
- generated schemas, language JSON, and lockfiles are not refactor candidates.

## Security and privacy review

- Google OAuth uses state, PKCE, verified audience/email, and provider subject linking.
- Email/password uses salted scrypt, verification before password attachment, generic reset responses, single-use expiring tokens, login/register/reset throttling, and session revocation after reset.
- Browser cookies are HttpOnly/Secure with SameSite boundaries; privileged admin mutations require an explicit admin-action header.
- Native account tokens use OS credential storage. The server is authoritative for entitlement and device limits; offline grace is bounded.
- License plaintext is never permanently stored. Admin surfaces expose only product prefix + masked middle + suffix. Redis retains new/rotated plaintext only for short delivery/resend.
- Distribution/app telemetry is whitelist-based and excludes source identity and business data.
- Admin account disable preserves audit history and revokes active sessions.

## Dependency review

- JavaScript production audit: no known vulnerability at this checkpoint.
- Dependabot alert 21 / `RUSTSEC-2024-0429`: `glib 0.18.5`, moderate soundness advisory, patched in `glib >=0.20.0`. Current Tauri 2.11/Wry Linux GTK3 dependency still resolves GTK/glib 0.18, so a direct version override is not semver-compatible. Do not dismiss silently or force an incompatible patch. Track upstream Tauri GTK dependency migration; LightBI does not directly use `VariantStrIter`.
- Keep Monaco and DuckDB code-split. Their large chunks affect Advanced/loading size, not Easy Mode correctness.

## Test and release gaps

- Public CI and focused gates are green; private/frozen historical corpus artifacts are intentionally absent from the public repository and must not be treated as product regressions.
- Cross-platform native build must finish successfully in GitHub Actions before version/tag publication.
- The Windows installer needs internal icon/install/update verification.
- The `.deb` needs installation on a clean supported Ubuntu/Debian VM.
- Real transactional email registration/verification/reset requires an owner-controlled inbox test.
- Account entitlement/device/legacy-key cases must complete the explicit V1 matrix.
- R2 credential/bucket read validation is green; tagged immutable upload/latest publication is intentionally untested until the approved release tag.

## Decisions

- No large refactor before the next Beta.
- Fix release blockers, security boundary violations, leaks, crashes, or verified regressions only.
- Carry `advanced.rs`, the Home page size excess, private-corpus availability, and upstream glib advisory as documented debt with owners and acceptance criteria.
