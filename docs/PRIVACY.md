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

The current public Beta does not require an analytics account or license key. Repository builds do not embed a mandatory remote telemetry service.

## Operational guidance

- Do not publish workbooks containing confidential or regulated data.
- Use database read-only credentials during evaluation.
- Protect the operating-system account and application-data directory.
- Treat exported evidence files according to the classification of their source data.
