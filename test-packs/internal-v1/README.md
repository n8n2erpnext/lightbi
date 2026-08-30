# LightBI NEXT Internal Acceptance Pack

Status: current internal test-pack candidate
Version: `lightbi.uat.v1`
Generation contract: `lightbi.generation.v1`

This pack is the owner-facing acceptance layer for a LightBI NEXT generation. It does not replace unit, contract, CI, Rust, package or security tests. It answers a different question: **can the exact successor generation be used like the product and still preserve LightBI trust boundaries?**

## Rules

- Test exactly one `generation_id` per acceptance record.
- Record the generation manifest before testing.
- Use repository fixtures by hash; do not silently substitute another file.
- Production accounts, databases, Redis state, analytics, release namespace and integrations are never test authority.
- A restored workspace is convenience metadata until current source identity is revalidated.
- A filename is never source identity.
- Multi-source analysis must use governed relationships; similar column names alone never authorize a join.
- Formula-driven Pivot View is the approved Excel v1 behavior. Native PivotTable/PivotChart is not part of this pack.

## Levels

**SMOKE** — fast owner check after a new NEXT generation is built.

**FEATURE** — deeper product behavior covering BA, multi-source, exports and persistence.

**RELEASE ACCEPTANCE** — generation provenance, isolation, restart continuity and promotion evidence.

The machine-readable source of scenario truth is [`manifest.json`](./manifest.json). Use [`CHECKLIST.md`](./CHECKLIST.md) while testing manually.
Copy [`ACCEPTANCE_RECORD_TEMPLATE.json`](./ACCEPTANCE_RECORD_TEMPLATE.json) outside the source tree for each generation test run; keep screenshots/bug evidence keyed by the same `generation_id`.
