# LightBI Documentation Library

Start with [`project-book/README.md`](./project-book/README.md). The Project Book is the onboarding/provenance layer; the rest of this directory is source material.

## Primary shelves

- [`project-book/`](./project-book/) — project book, worklog, library map, source catalog, path migration indexes, and code-map work;
- [`architecture/`](./architecture/) — current model/contracts, phase records, and path-sensitive machine evidence;
- [`adr/`](./adr/) — architecture decision history;
- [`domain-catalog/`](./domain-catalog/) — domain knowledge sources;
- [`plugin-sdk/`](./plugin-sdk/) — provider/plugin documentation;
- [`product/`](./product/) — product/commercial drafts; preserve draft status;
- [`release/`](./release/) — dated release evidence/checklists;
- [`design/`](./design/) — design baselines;
- [`history/`](./history/) — superseded plans, audits, checkpoints, handoffs, progress, changelog, and other provenance.

## Retrieval rules

1. Use [`project-book/DOCUMENT_LIBRARY_MAP.md`](./project-book/DOCUMENT_LIBRARY_MAP.md) to choose the shelf.
2. Use [`project-book/SOURCE_CATALOG.md`](./project-book/SOURCE_CATALOG.md) for exact source lookup.
3. Use [`project-book/PATH_MIGRATION_INDEX.md`](./project-book/PATH_MIGRATION_INDEX.md) and [`history/LEGACY_ROOT_INDEX.md`](./history/LEGACY_ROOT_INDEX.md) for old paths.
4. Do not treat historical documents as current authority without checking source precedence.
5. Do not move `docs/architecture/*.json` until Code Map + Git/CI audit proves every consumer path is safe.
