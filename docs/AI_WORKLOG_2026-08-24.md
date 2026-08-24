# LightBI AI worklog and next-phase handoff — 2026-08-24

This file is the detailed, credential-free continuation record for maintainers and future AI sessions. Read it together with `BETA7_HANDOFF.md`, `ARCHITECTURE.md`, `PRIVACY.md`, and the current Git history before changing production code.

## Current checkpoint

- Repository: `https://github.com/n8n2erpnext/lightbi`
- Working branch used by Codex: `codex/native-sqlserver-xomdata-beta7`; changes are pushed to `main` explicitly.
- Released desktop version remains `0.9.1-beta.7`.
- Distribution portal version remains `0.1.4`.
- Do **not** bump, tag, or build the next Windows release until the owner asks after live testing.
- Current feature checkpoints: `c363eab`/`3aa344b` for durable history and portability, followed by `0d7dace` for temporal chart drill-through.
- Previous Monaco checkpoint: `78bdfc0`; initial Monaco feature: `70d671c`.
- User-owned untracked files `audit-before.json` and `audit-after.json` must not be deleted or committed accidentally.

## Live topology

- `https://lightbi.thaiduy.digital/` — public distribution portal.
- `https://lightbi.thaiduy.digital/app` — LightBI web demo.
- `https://lightbi.thaiduy.digital/admin` — protected distribution administration.
- `lightbi-frontend.service` — Vite web demo/edge router on port 5173, user systemd service.
- `lightbi-distribution.service` — distribution backend on port 5174, user systemd service.
- PostgreSQL and Redis back the privacy-safe distribution analytics and admin sessions.
- NetBird routing was not modified during these tasks.
- VPS package cache was pruned on 2026-08-24: about 1.88 GB removed; root filesystem improved from 85% used/19 GB free to 83% used/22 GB free.

## Product work completed during this extended Beta 7 phase

### Source intake and execution

- Fixed real-world Excel/Google Sheets intake, including dirty multi-sheet workbooks and explicit sheet selection/full-workbook review.
- Added exact full-table SQL Server Easy Mode materialization; representative samples remain understanding evidence only.
- Preserved source continuity and fail-closed behavior when a complete source cannot be recovered.
- Added single-file and governed multi-file ERP analysis without silently joining unrelated rows.
- Fixed DuckDB WASM public deployment so Vite no longer emits inaccessible package-internal `/@fs/...` imports.

### Semantic and BA expansion

- Expanded the semantic dictionary using the Xóm Data corpus without hard-coding dataset names.
- Validated 17 business schemas and 63 SQL tables across retail, e-commerce, manufacturing, HR, transport, banking, coffee/POS, CRM, education, healthcare, logistics, gaming, social, web analytics, FMCG, aviation, and Vietnamese marketplace exports.
- Added context × capability reasoning so domains may overlap: for example healthcare can expose patient/customer, medicine/inventory, revenue, operations, finance, and performance when evidence exists.
- Enriched Deep BA into structured What/Where/Who/When/Why/How much/What next/Unknown layers with evidence, confidence, limitations, and domain playbooks.
- Added chart-selected subset analysis (Step 2) and supported repeated drill-down without inventing a new analytical contract.
- Fixed Step 2 drill-through for temporal dimensions. Chart values formatted as localized dates now map back to ISO timestamps, epoch milliseconds, epoch seconds, or Excel serial dates in the raw source; non-temporal dimensions remain strict equality matches.
- Added multi-file BA comparison, chart selection, Step 2 subset analysis, dashboards, export, cleaning, and BI handoff parity with single-file flows.

### Advanced Mode

- Added governed database workspace support for PostgreSQL, MySQL, MariaDB, SQLite, MongoDB, and SQL Server.
- Added schema explorer, tabs, history, favorites, parameters, filters, result views, safe reviewed writes, structure operations, full export, and a grid context menu.
- Fixed the grid context menu so outside pointer interaction, Escape, scroll, and resize dismiss it.
- Added a local, code-split Monaco mini-IDE. It is bundled with the app; no CDN is used.
- Basic SQL completion now includes keywords, common functions, CASE/IN, SELECT, aggregation, and safe templates.
- Pro and the public web demo add live schema/table/column and dialect-aware templates; SQL Server templates use `TOP`, not `LIMIT`.
- SQL text, schema identity, table names, and column names remain local and are never telemetry.
- Added `Ctrl/Cmd+Enter` to run and `Ctrl/Cmd+Shift+Enter` to run all statements.
- Added `Return to Easy`: after committed grid/database edits, Advanced re-queries and materializes every page of the post-edit source, creates a new canonical handoff, and returns to Easy without export/re-import. Single-table file workspaces retain this path even when the editor clears `tableContext`.

### Session and connection continuity — checkpoint `c363eab`

- Root cause of the Windows history screenshot: legacy sessions retained only a bounded sample and had no durable source file, so Windows could not legally recover the original browser `File` handle after restart.
- New local-file sessions persist source copies under the application data directory and save only the durable file identifier/path metadata in the session.
- If initial persistence failed but a runtime `File` still exists, session save retries persistence for single and multi-file sources.
- Transient runtime `File` objects are never serialized into session JSON.
- Legacy local sessions now open the file picker immediately. The selected source is rebound only when its name matches the saved source, then the same session ID is updated with durable source metadata. A mismatched later import cannot overwrite the legacy session.
- Online-source sessions retain the normalized URL and refresh the complete online source when reopened.
- Session status messages are now translated in Vietnamese rather than displaying mixed English text.
- Advanced database connections default to an explicit checked “remember” option. Secrets are encrypted with AES-256-GCM in the local backend vault; a random local vault key is stored separately. Profile list responses never expose the URL/password.
- The most recently selected encrypted profile is remembered, so users reopen Advanced, review the profile, and connect without retyping credentials. Connection success is not blocked if profile persistence fails.

### Distribution, licensing, and privacy

- Replaced the repository landing material with English-first/VI documentation and real product screenshots.
- Distribution root now serves the product portal; demo moved to `/app` and uses title `LightBI — Live Demo`.
- Built privacy-safe analytics for views, visitors, visits, bounce rate, duration, downloads, installs, active machines, versions, platforms, browser/OS/device/language, hashed-network/time-zone signals, campaign attribution, and week/month/quarter/year ranges.
- Raw IP addresses are not retained. Network identity is one-way HMAC pseudonymized; timezone/location signals are coarse and documented.
- Added PostgreSQL primary storage and Redis cache/admin sessions.
- Added one-admin login, scrypt password hashing, HttpOnly/Secure/SameSite cookies, throttling, Zoho SMTP password reset, and branded HTML mail.
- Added Basic/Pro pairing, manual/automatic/partner-discount/complimentary license issuance, rotation, revocation, device limits, expiry, and Pro revenue views.
- License keys are stored only as hashes. SMTP, admin, Stripe, and signing secrets live only in environment/service configuration and must never be copied into source or this log.
- Native telemetry is opt-out-aware and whitelisted. It reports anonymous installation/session/version/platform/tier and coarse feature identifiers, never business data, SQL, URLs, schemas, tables, columns, charts, or BA findings.

### Security and release work

- Replaced vulnerable jsPDF dependency chain with patched versions and cleared the earlier Dependabot group.
- Added a pnpm override for patched DOMPurify required by Monaco. `pnpm audit --prod` reports no known vulnerabilities at this checkpoint.
- Latest published Windows prerelease remains `v0.9.1-beta.7`; its GitHub-built installer and checksum were verified before this checkpoint.
- No release/tag/version bump was made for the current session-history and SQL-completion work.

## Verification at this checkpoint

- Clean TypeScript build: `pnpm exec tsc -b apps/desktop --clean` then `pnpm exec tsc -b apps/desktop` passed.
- Focused regression: 6 files / 27 tests passed, covering Monaco suggestions, context-menu dismissal, Advanced→Easy materialization, durable workspace persistence, legacy reselection, and all 17 Advanced workspace UI tests.
- Production Vite build passed. Monaco remains a separate lazy chunk, so Easy Mode does not eagerly load the editor.
- `pnpm audit --prod`: no known vulnerabilities.
- GitHub CI for checkpoint `78bdfc0` passed before the current history patch; wait for CI on the new pushed checkpoint after the documentation commit.
- The complete historical corpus suite requires private/frozen artifacts that are intentionally absent from the public repository. Do not classify missing corpus files or byte-freeze audits as regressions from these UI changes; use focused public tests plus CI.

## Deployment discipline

- The VPS checkout is intentionally dirty because production has historically been overlaid from validated commits. Do not run destructive Git cleanup/reset on the VPS.
- Deploy only the validated files needed for the web demo, run frontend TypeScript on the VPS, restart `lightbi-frontend.service`, then inspect service logs and browser console.
- Do not remove project data, SQLite/PostgreSQL databases, source files, releases, or sample corpus while cleaning disk. Only prune confirmed disposable build/package caches.
- Windows installers must be built by GitHub Actions on `windows-latest`, not on the ARM VPS.

## Next phase entry conditions

1. Push this handoff and feature checkpoint to `main`; confirm GitHub CI is green.
2. Deploy the checkpoint to the web demo and verify SQL completion visually against a real understood source.
3. Test a new local-file session in the packaged Windows app: import, analyze/save, close app, reopen, and open history without selecting the file again.
4. Test one legacy session: click history, select the same original file, confirm the old session ID is upgraded, close/reopen, and verify the second open no longer asks for the file.
5. Test an online URL session after restart and an encrypted Advanced database profile after restart.
6. Keep version `0.9.1-beta.7` until the owner explicitly approves the next version/tag/build.

## Known non-blocking debt

- Tailwind content glob still warns that a pattern may scan too much of `node_modules`; this predates the checkpoint and affects build performance, not runtime correctness.
- Monaco is correctly code-split but its Advanced-only chunk is large; future optimization may replace the broad editor API with a narrower custom build if installer size becomes material.
- Legacy sessions cannot recover an original local file that was never copied. One explicit reselection is unavoidable; the new relink migration makes subsequent opens durable.
- Stripe remains intentionally dormant until production credentials and post-beta commercial policy are configured.

## V1 account, updater, and installer checkpoint — in progress, version unchanged

- Added the shared `lightbi.release.v1` manifest and release index used by the distribution portal, R2 publication, and the native updater. GitHub Releases remain the fallback/archive; immutable R2 objects live only below `/release/lightbi/<version>/`.
- Added an explicit native update flow with semantic-version comparison, release notes, SHA-256 verification, temporary partial artifacts, and user-confirmed **Update & Restart**. The app never silently installs or terminates while the user is working.
- Added PostgreSQL-backed LightBI accounts, identities, account sessions, entitlements, and device slots. Google OAuth uses authorization code + PKCE; native session tokens use Windows Credential Manager rather than browser storage.
- Added email/password registration and login alongside Google. Registration always sends a one-time verification link before a password is attached, including when the same email already has a Google identity. This prevents same-email account takeover while still linking both identities to one account.
- Added generic forgot-password responses, single-use 15-minute reset tokens, session revocation after reset, login throttling, and branded SMTP verification/reset mail. Raw passwords and reset/session tokens are not logged or stored in plaintext.
- Added account UI directly in LightBI Settings and on `/account`: Google, email sign-in, account creation, forgot/reset password, Pro redemption, devices, revocation, and logout. The web demo confirmed a real Google account login on 2026-08-24.
- Added ephemeral Redis plaintext retention for newly issued/rotated license keys. Permanent storage remains hash + safe suffix/metadata only; after Redis expiry, admin must rotate rather than reveal a key.
- Replaced the broken black native icon resource with the supplied yellow/black LightBI app mark. The Windows release workflow now regenerates all Tauri icon sizes from the branded PNG and fails before packaging if the PNG/ICO set is missing, malformed, undersized, or not multi-resolution.
- Live demo deployment was backed up to `/home/ubuntu/lightbi-deploy-backups/account-email-20260824-1219.tar.gz` before the account overlay. `lightbi-frontend.service` and `lightbi-distribution.service` remained active.

### Verification for this in-progress checkpoint

- Desktop TypeScript and production Vite build passed.
- Focused account/update tests: 6 tests passed after adding email registration/login/reset client coverage.
- Distribution portal: 17 tests passed; syntax checks passed.
- Dependency install with frozen lockfile passed; `pnpm audit --prod` reports no known vulnerabilities.
- Native icon contract validation passed.
- Live `/api/config` reports both `googleAccountAvailable` and `emailAccountAvailable`; invalid registration is rejected with HTTP 400.
- The broad private/frozen corpus run still reports the documented missing private audit/corpus artifacts and byte-freeze mismatches. It was stopped after confirming those historical gates; focused public tests and CI remain the release gates for this work.
- Version is still `0.9.1-beta.7`. Do not tag or build the next Beta until the remaining V1 matrix and Windows GitHub build validation pass.
