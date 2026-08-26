# Changelog

All notable public changes to LightBI are recorded here.

## [0.9.2-beta.7] - 2026-08-26

- Added a non-blocking staged updater: detect, notify, stream-download, SHA-256 verify, atomically stage, and wait for an explicit **Update & Restart** action.
- Added deterministic update recovery across restarts, duplicate-download coalescing, partial-file rejection, staged-file re-verification, and suspicious same-version checksum blocking.
- Added matching update progress/retry/ready controls in the notification menu and Settings without auto-installing or forcing a restart.
- Added native updater integrity tests to both Windows and Linux release jobs.
- Added cross-platform release artifacts: a branded Windows NSIS installer and a Debian/Ubuntu `.deb`, published through one manifest only after both builds pass.
- Fixed the Windows installer executable icon so File Explorer displays the LightBI yellow/black mark instead of the generic NSIS icon.
- Fixed newly saved local-file history sessions so `file://` source identity no longer bypasses durable internal source persistence; a session now fails to save rather than pretending a retained sample is restorable.
- Fixed Advanced local-file pagination so `hasMore` means another page is recoverable while `truncated` remains reserved for irreversible row loss, allowing complete 1,500-row Advanced-to-Easy round trips.

## Distribution Portal [0.1.4] - 2026-08-22

- Moved the distribution portal to `/`, the web demo to `/app`, and the protected console to `/admin` without changing the NetBird domain target.
- Added Zoho SMTP password reset, automatic purchase-key delivery, branded manual-key delivery, and protected license creation, rotation, revocation, complimentary, and partner-discount workflows.
- Added App Usage reporting for privacy-governed native telemetry.

## [0.9.1-beta.7] - 2026-08-22

- Added opt-out-aware native app session duration and whitelisted Easy/Advanced feature-use telemetry.
- Added governed `advanced_database_edit` usage events without collecting SQL, database identity, schema, table, column, file, or business data.
- Added full-source post-edit refresh and direct Advanced-to-Easy handoff so Easy analysis sees committed database changes without export/re-import.

## Distribution Portal [0.1.3] - 2026-08-22

- Replaced the shared admin token prompt with a single PostgreSQL-backed administrator account, scrypt password hashing, Redis sessions, secure HttpOnly cookies, and login throttling.
- Added a protected Pro Revenue tab with period filters, paid-order, active-license, currency, average-order, and revenue-series views ready for Stripe activation after Beta.

## Distribution Portal [0.1.2] - 2026-08-22

- Added week, month, quarter, and year views to distribution analytics.
- Added privacy-safe visits, bounce rate, duration, active visitors, pages, sources, browser, OS, device, language, and timezone-offset reporting inspired by Umami metric definitions.
- Added monthly rotating HMAC network counts from coarse `/24` IPv4 and `/48` IPv6 prefixes; raw client IPs are never stored.

## Distribution Portal [0.1.1] - 2026-08-22

- Added privacy-safe distribution analytics backed by PostgreSQL with Redis summary caching.
- Separated web visitors from real desktop installation pairing.
- Added page-view, download, daily-active, Basic/Pro, version, platform, and campaign signals to the protected admin dashboard.
- Kept payment integration dormant until production Stripe configuration is supplied.

## [0.9.0-beta.7] - 2026-08-20

### Added

- Native read-only SQL Server intake with exact full-table runtime snapshots.
- A 17-schema, 63-table cross-domain semantic regression corpus built from read-only Xóm Data samples.
- Evidence-based context × capability matrix so healthcare, commerce, logistics, education, workforce, finance, and digital sources can expose intersecting customer, inventory, revenue, operations, finance, and performance angles.
- LightBI Distribution Portal with Basic/Pro plans, anonymous installation pairing, license activation, download statistics, and a Stripe Checkout adapter.
- New LightBI application mark and automated Tauri icon generation in the Windows release workflow.

### Improved

- Generic underscore, dot, slash, and hyphen normalization for database and local-file headers.
- Semantic coverage for finance, education, healthcare survey, taxi, aviation review, social, mobile app, and web analytics sources.
- Customer geography and profile analysis without unsafe grouping by high-cardinality customer keys.

### Fixed

- Database Easy Mode now materializes exact row coverage instead of failing at governed execution.
- Geographic state/province fields no longer become lifecycle status.
- Release-period and product-code fields no longer drift into unsafe date or product-name analyses.

## [0.9.0-beta.6] - 2026-08-13

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
