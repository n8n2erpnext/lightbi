# LightBI Documentation Library

Start with [`project-book/README.md`](./project-book/README.md). Before creating or moving documentation, read [`project-book/LIBRARY_RULES.md`](./project-book/LIBRARY_RULES.md).

## Primary shelves

- [`project-book/`](./project-book/) — project book, governance, worklog, library map, source catalog, path migration indexes, and code-map work;
- [`architecture/`](./architecture/) — current model/contracts, phase records, and path-sensitive machine evidence;
- [`adr/`](./adr/) — architecture decision history;
- [`domain-catalog/`](./domain-catalog/) — domain knowledge sources;
- [`plugin-sdk/`](./plugin-sdk/) — provider/plugin documentation;
- [`product/`](./product/) — product/commercial drafts; preserve draft status;
- [`release/`](./release/) — dated release evidence/checklists;
- [`design/`](./design/) — design baselines;
- [`history/`](./history/) — superseded plans, audits, checkpoints, handoffs, progress, changelog, and other provenance.

## Retrieval and contribution rules

1. Read [`project-book/LIBRARY_RULES.md`](./project-book/LIBRARY_RULES.md) before writing or reorganizing documentation.
2. Use [`project-book/DOCUMENT_LIBRARY_MAP.md`](./project-book/DOCUMENT_LIBRARY_MAP.md) to choose the shelf.
3. Use [`project-book/SOURCE_CATALOG.md`](./project-book/SOURCE_CATALOG.md) for exact source lookup.
4. Use [`project-book/PATH_MIGRATION_INDEX.md`](./project-book/PATH_MIGRATION_INDEX.md) and [`history/LEGACY_ROOT_INDEX.md`](./history/LEGACY_ROOT_INDEX.md) for old paths.
5. Use [`project-book/DOCUMENT_TEMPLATE.md`](./project-book/DOCUMENT_TEMPLATE.md) when a durable new document is justified.
6. Do not treat historical documents as current authority without checking source precedence.
7. Do not move `docs/architecture/*.json` until Code Map + Git/CI audit proves every consumer path is safe.
