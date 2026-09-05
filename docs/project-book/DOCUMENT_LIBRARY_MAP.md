# LightBI Document Library Map


> **SOL 5.6 GOVERNANCE NOTE — 2026-09-05**
>
> This governance foundation was authored and curated during the GPT-5.6 Sol era of LightBI. Every successor model, agent, or human maintainer must read, understand, and rigorously follow the rules and source-precedence contracts here before changing documentation or project truth. Greater model capability never grants authority to bypass governance.
>
> — **GPT-5.6 Sol** · *LightBI Architecture & Governance Era, 2026*

> Master map for humans and AI. This is a navigation contract, not a replacement for source documents.

## Recommended retrieval route

1. Read [`LIBRARY_RULES.md`](./LIBRARY_RULES.md) before writing, moving, or interpreting documentation as authority.
2. Read [`LIGHTBI_PROJECT_BOOK.md`](./LIGHTBI_PROJECT_BOOK.md) for the docs-derived project model.
3. Use this map to choose the correct shelf.
4. Use [`SOURCE_CATALOG.md`](./SOURCE_CATALOG.md) for exact source lookup and checksum.
5. Use [`PATH_MIGRATION_INDEX.md`](./PATH_MIGRATION_INDEX.md) or [`../history/LEGACY_ROOT_INDEX.md`](../history/LEGACY_ROOT_INDEX.md) when an old path is mentioned.
6. Use [`DOCUMENT_TEMPLATE.md`](./DOCUMENT_TEMPLATE.md) only when a durable new document is justified.
7. For implementation truth, consult [`LIGHTBI_CODE_MAP.md`](./LIGHTBI_CODE_MAP.md), then [`LIGHTBI_GIT_HISTORY_MAP.md`](./LIGHTBI_GIT_HISTORY_MAP.md) for commit/branch/release provenance. CI/CD execution truth remains a later audit. Documentation alone does not prove current code behavior.

## Authority-oriented shelves

- **Onboarding / synthesis / governance:** `docs/project-book/` — derived map, provenance, rules, worklog, catalogs.
- **Current architecture source:** `docs/architecture/` — contracts/models plus phase records and machine evidence.
- **Decision history:** `docs/adr/` — ADR sequence; later evidence may supersede earlier ADRs.
- **Canonical project contract:** `docs/MVP_sol.md` — high-value project architecture/product contract; reconcile against current code when conflicts appear.
- **Domain knowledge:** `docs/domain-catalog/`.
- **Plugin/provider surface:** `docs/plugin-sdk/`.
- **Product/commercial drafts:** `docs/product/` — draft status must be preserved; do not treat pricing drafts as current business truth automatically.
- **Release records:** `docs/release/` — dated release evidence/checklists.
- **Public compliance governance:** `docs/compliance/` — canonical claim/disclosure/legal-applicability framework and future compliance registers; not a substitute for implementation evidence or qualified legal advice.
- **Design baseline:** `docs/design/`.
- **Historical archive:** `docs/history/` — provenance, superseded plans, audits, checkpoints, progress/changelog.

## Shelf counts

| Shelf | Markdown | JSON |
|---|---:|---:|
| `MVP_sol.md` | 1 | 0 |
| `README.md` | 1 | 0 |
| `adr` | 123 | 0 |
| `architecture` | 108 | 354 |
| `design` | 1 | 0 |
| `domain-catalog` | 8 | 0 |
| `history` | 259 | 0 |
| `plugin-sdk` | 1 | 0 |
| `product` | 3 | 0 |
| `release` | 1 | 0 |

`docs/project-book/` is a governance/synthesis layer and is intentionally excluded from `SOURCE_CATALOG` to avoid self-referential catalog churn. Its files are indexed by this map and `project-book/README.md`.

Project Truth companions now include Code Map 0.3, Git History 0.4, CI/CD 0.5, Control Plane 0.6, and machine-readable [`PROJECT_TRUTH_STATUS.json`](./PROJECT_TRUTH_STATUS.json).

## Machine-path lock

The cleanup intentionally leaves `docs/architecture/*.json` in place. Earlier audit found a substantial subset consumed by tests/scripts. The completed Code Map/Git/CI audit does not authorize moving them: archive tests/scripts consume their paths, while public CI intentionally excludes this internal evidence library. Path lock is retained unless a future dedicated migration proves all consumers and archive parity.

## Historical identity rule

Cleanup may move files and repair bookmarks, but it must not silently rewrite old conclusions, renumber ADRs, or promote historical documents into current authority.

## Contribution contract

Humans and AI agents must follow [`LIBRARY_RULES.md`](./LIBRARY_RULES.md) before adding durable documentation. When a new document is justified, start from [`DOCUMENT_TEMPLATE.md`](./DOCUMENT_TEMPLATE.md), place it by long-term authority, and update the appropriate entry point/index before declaring the task complete.
