# Changelog

All notable public changes to LightBI are recorded here.

## [0.9.0-beta.2] - 2026-08-13

### Added

- Explicit sheet selection and complete-workbook intake for multi-sheet Excel files.
- Evidence-governed filtered-subset Deep BA after chart drill-through.
- Governed multi-source and single-period ERP analysis.
- Multi-source Deep BA PNG/PDF export and Dashboard creation.
- Data-cleaning handoff and downstream BI workbook export.
- English/Vietnamese presentation separation across the Beta workflow.
- Public GitHub CI and reproducible Windows Beta release workflow.

### Improved

- Structured Deep BA investigation frame with evidence, confidence, unknowns, follow-up questions, and action candidates.
- Broader customer, territory, employee, logistics, inventory, sales, and finance semantic coverage.
- Source-bound drill-through and composable filters.
- Runtime source continuity, guarded aggregation, and physical-column resolution.

### Fixed

- Workbook runtime row-count continuity after sheet selection.
- Physical-column binding failures in drill-through queries.
- One-period multi-source charts no longer imply a false 0% period comparison.
- Deep BA export boundaries no longer include application-only actions.
- Advanced provider loading lifecycle race during test teardown.

## [0.9.0-beta.1]

Initial native Beta baseline.
