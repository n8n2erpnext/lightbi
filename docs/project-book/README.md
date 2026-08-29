# LightBI Project Book

> Stable onboarding, provenance, retrieval, and documentation-governance entry point for humans and AI agents.

## Read in this order

1. [`LIBRARY_RULES.md`](./LIBRARY_RULES.md) — mandatory rules for reading, writing, naming, shelving, moving, and indexing documentation.
2. [`LIGHTBI_PROJECT_BOOK.md`](./LIGHTBI_PROJECT_BOOK.md) — docs-derived model of the product and architecture.
3. [`DOCUMENT_LIBRARY_MAP.md`](./DOCUMENT_LIBRARY_MAP.md) — shelf/authority map for the documentation library.
4. [`SOURCE_CATALOG.md`](./SOURCE_CATALOG.md) — exhaustive human-readable source bookmark catalog.
5. [`source_catalog.json`](./source_catalog.json) — machine-readable source catalog with checksums/metadata.
6. [`LIGHTBI_WORKLOG.md`](./LIGHTBI_WORKLOG.md) — chronological work journal and architecture evolution.
7. [`PATH_MIGRATION_INDEX.md`](./PATH_MIGRATION_INDEX.md) — second-pass old-path → current-path lookup.
8. [`../history/LEGACY_ROOT_INDEX.md`](../history/LEGACY_ROOT_INDEX.md) — first-pass legacy root filename lookup.
9. [`DOCUMENT_TEMPLATE.md`](./DOCUMENT_TEMPLATE.md) — starting template for durable new engineering documents.
10. `LIGHTBI_CODE_MAP.md` — code map draft; do not treat as complete until the codebase audit phase is closed.

## Snapshot boundary

- Initial documentation snapshot: **2026-08-29**.
- Repository branch at initial capture: `codex/beta-recovery-20260801`.
- Initial HEAD: `0142e92c75e9fd3e190f82fe2a67cf255180cfca`.
- The original working tree was not clean; the book distinguishes working-tree knowledge from committed repository truth.
- Library cleanup occurs on `docs/project-library-cleanup-20260829` so Beta-recovery work remains untouched.

## Source-precedence rule

The Project Book is synthesis, not magical authority. When claims conflict, prefer current code + latest verified closure/audit, then current canonical contracts, then recent handoffs/ADRs, and finally older progress/changelog/history. The later Git/CI audit may revise docs-derived conclusions.

## Integrity and provenance

- [`PROJECT_BOOK_MANIFEST.json`](./PROJECT_BOOK_MANIFEST.json) preserves the original book baseline checksum set.
- [`EXTERNAL_SOURCE_REGISTER.md`](./EXTERNAL_SOURCE_REGISTER.md) records important non-repository session/source inputs.
- [`DOC_REORGANIZATION_PLAN.json`](./DOC_REORGANIZATION_PLAN.json) records the first root-document cleanup.
- [`DOC_LIBRARY_REORGANIZATION_2026-08-30.json`](./DOC_LIBRARY_REORGANIZATION_2026-08-30.json) records the second library cleanup.
- [`KNOWN_HISTORICAL_LINK_DEBT.json`](./KNOWN_HISTORICAL_LINK_DEBT.json) records links that were already missing historically and must not be silently fabricated.

## Contribution rule

Any human or AI that writes durable documentation must follow [`LIBRARY_RULES.md`](./LIBRARY_RULES.md) and use [`DOCUMENT_TEMPLATE.md`](./DOCUMENT_TEMPLATE.md) when a new document is actually justified.
