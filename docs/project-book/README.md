# LightBI Project Book

> Documentation knowledge base and provenance map for LightBI.

## Purpose

This directory is the stable entry point for humans and AI agents that need to understand LightBI before touching code.

Read in this order:

1. [`LIGHTBI_PROJECT_BOOK.md`](./LIGHTBI_PROJECT_BOOK.md) — current docs-derived model of the product and architecture.
2. [`LIGHTBI_WORKLOG.md`](./LIGHTBI_WORKLOG.md) — chronological work journal and architecture evolution.
3. [`SOURCE_CATALOG.md`](./SOURCE_CATALOG.md) — exhaustive human-readable bookmark catalog.
4. [`source_catalog.json`](./source_catalog.json) — machine-readable catalog for tooling and AI retrieval.

## Snapshot boundary

- Snapshot date: **2026-08-29**.
- Repository branch at capture: `codex/beta-recovery-20260801`.
- HEAD at capture: `0142e92c75e9fd3e190f82fe2a67cf255180cfca`.
- The worktree was **not clean** at capture time.
- These files describe the working-tree documentation corpus; they do not claim that HEAD alone contains every described state.

## Safety rule

Do not reorganize, delete, rename, or normalize legacy documents until the Project Book and Source Catalog have been reviewed. The next cleanup phase must preserve provenance links or update them atomically.
## Integrity manifest

[`PROJECT_BOOK_MANIFEST.json`](./PROJECT_BOOK_MANIFEST.json) records the SHA-256 and size of the Project Book baseline files before any documentation reorganization. Regenerate it after an intentional book update; do not silently overwrite the baseline during file moves.
- [`EXTERNAL_SOURCE_REGISTER.md`](./EXTERNAL_SOURCE_REGISTER.md) — provenance for important non-repository session/source inputs.
