# Privacy and data boundary

LightBI is designed around a local-first analytical boundary.

## Local files

- Workbook and delimited-file parsing runs in the application runtime.
- Local governed queries run with embedded DuckDB.
- A source fingerprint and runtime binding are used to prevent executing against a different file accidentally.
- Files are not uploaded to a LightBI cloud analytics service by the desktop workflow.

## Online sources

When a user explicitly supplies an online sheet or file URL, LightBI fetches that resource and routes the downloaded content through the same canonical inspection boundary. Access remains subject to the sharing permissions of the source provider.

## Database credentials

Advanced connection profiles are stored in the application's data directory. Saved connection URLs are encrypted using AES-256-GCM with a local vault key. Read-only mode is the safe default; write operations require preview and commit boundaries.

## Exports

Exports are created only after a user action. PNG/PDF analysis exports, CSV/Excel evidence exports, and downstream BI workbooks contain the visible analytical scope selected by the user. Users should review exported data before sharing it outside their organization.

## Telemetry

The distribution portal creates random first-party visitor and visit identifiers and records page views, download clicks, visit duration, browser-reported IANA time zone, coarse browser/OS/device type, language, referrer host, and explicit `utm_source`, `utm_medium`, and `utm_campaign` values. The time zone provides only a coarse audience distribution and is not presented as a country or precise location. The service hashes both identifiers before PostgreSQL persistence.

The server never stores a raw client IP. It reduces IPv4 to a `/24` network and IPv6 to `/48`, then creates an HMAC-SHA256 value using a server-only secret and a monthly rotation value. This anonymous network signal cannot be reversed from the database and cannot be linked across monthly rotations. Full user-agent strings, email addresses, names, and cross-site advertising identifiers are not persisted.

The public Beta desktop app creates a separate random installation identifier and may pair it with the LightBI distribution service. Pairing runs only in the native Tauri application—not in the browser demo—and sends only the random identifier, application version, platform, and Basic/Pro tier. The service hashes the identifier before persistence.

## Accounts, entitlements, and devices

When a user explicitly creates or signs into a LightBI account, the distribution service stores the minimum identity and authorization records needed for that account: email address, optional display name/avatar URL from the chosen identity provider, linked provider subject, account status, password hash when email/password is enabled, entitlement, and privacy-safe device metadata. Passwords, Google tokens, raw machine identifiers, and native session tokens are never stored in plaintext. Session and one-time verification/reset tokens are stored only as derived hashes or short-lived Redis values.

Google and verified email/password identities with the same normalized email may link to one account. Email/password is attached only after the one-time verification link is used; merely knowing an existing Google account email cannot add a password.

Device records contain a server-derived installation hash, user-facing device label, platform, app version, status, and first/last-seen timestamps. They do not contain hardware serial numbers, host files, SQL, schemas, or business data. Account owners may revoke their devices; an administrator may disable an account or revoke all sessions without deleting the audit trail.

Neither path sends imported files, source URLs, database credentials, column names, query results, charts, or BA findings. PostgreSQL is the durable aggregate source and Redis caches only derived dashboard summaries.

Native app-usage telemetry is restricted to a server whitelist: app open/close, anonymous session duration, Easy/Advanced mode, governed feature identifiers, and a boolean-style `advanced_database_edit` event. It never includes SQL text, database URLs, schema/table/column names, row counts, cell values, file names, source names, chart contents, or analytical findings.

When a Pro license is purchased or manually issued, the recipient email is retained with the license record so administrators can identify assignment and resend only while the short-lived one-time secret remains available. License keys are permanently stored only as derived hashes plus a safe six-character suffix. Admin views show a fixed product prefix, a masked middle, and that suffix; there is no endpoint to recover plaintext. Newly issued/rotated plaintext may exist in Redis for at most the configured short delivery window, after which Rotate & Resend is required.

Anonymous pairing can be disabled in Settings. A Pro activation sends the entered license key and the random installation identifier only to validate the license and device allowance.

## Operational guidance

- Do not publish workbooks containing confidential or regulated data.
- Use database read-only credentials during evaluation.
- Protect the operating-system account and application-data directory.
- Treat exported evidence files according to the classification of their source data.
