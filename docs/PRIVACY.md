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

Neither path sends imported files, source URLs, database credentials, column names, query results, charts, or BA findings. PostgreSQL is the durable aggregate source and Redis caches only derived dashboard summaries.

Native app-usage telemetry is restricted to a server whitelist: app open/close, anonymous session duration, Easy/Advanced mode, governed feature identifiers, and a boolean-style `advanced_database_edit` event. It never includes SQL text, database URLs, schema/table/column names, row counts, cell values, file names, source names, chart contents, or analytical findings.

When a Pro license is purchased or manually issued with an email recipient, the email address is passed transiently to the configured SMTP sender and is not stored in the distribution databases. License keys are stored as hashes; manually generated plaintext keys are returned or emailed once.

Anonymous pairing can be disabled in Settings. A Pro activation sends the entered license key and the random installation identifier only to validate the license and device allowance.

## Operational guidance

- Do not publish workbooks containing confidential or regulated data.
- Use database read-only credentials during evaluation.
- Protect the operating-system account and application-data directory.
- Treat exported evidence files according to the classification of their source data.
