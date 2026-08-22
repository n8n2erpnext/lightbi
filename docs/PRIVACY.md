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

The distribution portal creates a random first-party visitor identifier and records page views, download clicks, referrer host, and explicit `utm_source`, `utm_medium`, and `utm_campaign` values. The service hashes the identifier before PostgreSQL persistence. It does not persist raw IP addresses, email addresses, names, or cross-site advertising identifiers.

The public Beta desktop app creates a separate random installation identifier and may pair it with the LightBI distribution service. Pairing runs only in the native Tauri application—not in the browser demo—and sends only the random identifier, application version, platform, and Basic/Pro tier. The service hashes the identifier before persistence.

Neither path sends imported files, source URLs, database credentials, column names, query results, charts, or BA findings. PostgreSQL is the durable aggregate source and Redis caches only derived dashboard summaries.

Anonymous pairing can be disabled in Settings. A Pro activation sends the entered license key and the random installation identifier only to validate the license and device allowance.

## Operational guidance

- Do not publish workbooks containing confidential or regulated data.
- Use database read-only credentials during evaluation.
- Protect the operating-system account and application-data directory.
- Treat exported evidence files according to the classification of their source data.
