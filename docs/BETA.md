# Public Beta notes

## Release scope

The public Beta focuses on evidence-governed analysis of local spreadsheets and related operational exports, with a Windows desktop distribution and a web evaluation environment.

## Included

- local Excel/CSV/TSV/JSON intake;
- multi-sheet selection and independent inspection;
- online sheet intake;
- canonical semantic and grain evidence;
- governed and universal descriptive analysis;
- chart drill-through, composable filtering, and filtered Deep BA;
- single-source and governed multi-source/period analysis;
- Deep BA image/PDF export and Dashboard creation;
- data cleaning and downstream Excel/Power BI handoff;
- Advanced database workspace for PostgreSQL, MySQL, MariaDB, SQLite, and MongoDB;
- English and Vietnamese display languages.

## Known boundaries

- Dashboards and Investigation sessions are currently in-memory workspace artifacts.
- Full decision-use authorization remains fail-closed when identity, grain, source continuity, or metric evidence is insufficient.
- Generic database Easy Mode is intentionally narrower than the Advanced workspace.
- Public fixtures are sanitized and do not cover every operational schema used during private acceptance testing.

## Versioning

Beta releases use SemVer prerelease tags such as `v0.9.0-beta.2`. A release tag identifies the exact source commit used by GitHub Actions to produce the installer and checksum.
