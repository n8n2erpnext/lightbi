# LightBI Beta 7 handoff

This is the short operational handoff for maintainers and future AI sessions. It contains no credentials or private data.

## Release identity

- Version: `0.9.1-beta.7`
- Public repository: `https://github.com/n8n2erpnext/lightbi`
- Web demo: `https://lightbi.thaiduy.digital/app`
- Distribution portal: `https://lightbi.thaiduy.digital/`
- Distribution admin: `https://lightbi.thaiduy.digital/admin`
- Windows artifacts: GitHub Actions builds the tagged source on `windows-latest`, generates branded Tauri icons, creates an NSIS installer and SHA-256 checksum, then attaches both to the prerelease.

## Product spine

1. Home intake inspects files, selected workbook sheets, online sheets, or read-only database tables.
2. Canonical profiling resolves physical structure, semantic evidence, grain and source continuity.
3. The capability ladder combines governed domain actions with safe universal descriptive actions.
4. Investigation executes the bound full source with DuckDB, renders chart + BA evidence and supports drill-through.
5. Deep BA Step 2 reuses the same BA framework on chart-selected and user-filtered rows.
6. Multi-file analysis keeps sources separate unless role, period, identity and relationship evidence authorize a governed route.

## Beta 7 changes

- SQL Server Easy Mode materializes exact paginated row coverage into an in-memory runtime file; bounded samples remain understanding evidence only.
- `normalizeHeader` now normalizes spaces and `_ . / -` separators consistently for database and local-file headers.
- A context × capability matrix separates industry context from analytical capability. Healthcare, for example, can expose customer/patient, inventory/medicine, revenue, finance, operations and performance independently when the required fields exist.
- Xóm Data regression corpus: 17 schemas, 63 tables, 690 columns and 311 real read-only sample rows.
- Semantic audit: 249 → 315 recognized columns, 441 → 375 unresolved columns, 53 → 56 tables with executable questions, zero table-level recognition losses.
- DuckDB browser runtime is explicitly prebundled by Vite; do not restore `optimizeDeps.exclude` for `@duckdb/duckdb-wasm` because that exposes a package-internal `/@fs/.../duckdb-browser.mjs` URL on the public domain.

## Distribution and licensing

- `apps/distribution` is a Node service on port 5174 using PostgreSQL for privacy-safe analytics, Redis for cache/admin sessions, and SQLite WAL for license fulfillment.
- The Vite edge router serves Distribution at `/`, the protected console at `/admin`, the web demo at `/app`, and retains `/distribution/api/*` compatibility for released desktop clients.
- Each desktop installation creates a random installation ID. The server stores only an HMAC hash plus version, platform and Basic/Pro tier.
- Pairing can be disabled in Settings. No imported file, column, query result, chart or BA finding is telemetry.
- Pro licenses are random high-entropy keys stored as hashes, paired to a bounded number of installations.
- The admin account is stored in PostgreSQL with a salted scrypt hash; Redis holds expiring HttpOnly-cookie sessions and one-time password-reset tokens.
- Zoho SMTP sends branded automatic-purchase and manual-partner license templates. Recipient email is transient and is not stored by LightBI.
- Native usage telemetry accepts only whitelisted app/mode/feature identifiers and durations; it never accepts SQL text or business-data identity.
- Stripe Checkout is an environment-configured adapter. Webhook fulfillment is signature-checked and idempotent; the one-time license response is bound to the checkout installation.
- Required production variables are documented by `apps/distribution/server.mjs`. Never commit their values.

## Validation evidence

- Full internal desktop gate: 208 test files / 1,385 tests passed initially; the two expected catalog/freeze failures were updated and passed in focused reruns, yielding 1,387/1,387 effective pass.
- Xóm Data source-kind parity: all 63 tables return identical semantic signals/actions for `database_table` and `local_file` inputs.
- Local public build: TypeScript + Vite production build passed.
- Distribution portal: backend tests, syntax build and live visual QA passed.
- Dependency gate: `pnpm audit --audit-level=high` reports no known vulnerabilities.
- Rust SQL Server TLS moved from Tiberius' obsolete rustls chain to OS-native TLS to remove `rustls-webpki 0.101.7`; only patched `rustls-webpki 0.103.14` remains.

## Operational notes

- VPS Rust `target` is a disposable build cache. It reached 19 GB during this release and was safely removed; never delete source, releases, sample data or application databases as cache.
- The distribution service is installed as the user unit `lightbi-distribution.service` and survives SSH logout.
- The web edge router is installed as `lightbi-frontend.service` and survives SSH logout.
- Stripe remains disabled until `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID` and `STRIPE_WEBHOOK_SECRET` are configured.
- The public repo intentionally excludes private operational fixtures and long internal architecture archives; `sample-corpus` contains the sanitized public regression evidence.
