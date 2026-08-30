# LightBI NEXT / Internal Generation

Status: successor foundation candidate. This is not a production release or promotion approval.

## Successor model

LightBI evolves by generation rotation:

`CURRENT N -> inherit -> NEXT N+1 -> machine gates -> owner UAT -> promote -> CURRENT N+1`

NEXT is the direct successor of CURRENT. It is not a temporary code fork that later gets piecemeal-merged back into the older runtime.

Code lineage is inherited. Writable data infrastructure is isolated. Promotion reuses the accepted source generation while production is wired to its own PostgreSQL, Redis, data, analytics, release and integration infrastructure.

## Generation identity

Every accepted NEXT build must create `lightbi.generation.v1` with:

- generation and parent generation IDs;
- full core/source/control-plane SHAs;
- control-plane schema target;
- app version and build timestamp;
- owner test-pack version;
- Phase 2A trust status/head;
- internal update channel, analytics namespace and release namespace;
- explicit internal infrastructure scopes;
- source branch/build provenance.

Use:

```bash
pnpm build:internal-generation-manifest /path/to/lightbi-generation.json
```

The command is intentionally fail-closed. An internal build is rejected when commits are not pinned, parent identity is absent, the production distribution origin is used, update channel is not internal, namespaces are not internal, or an infrastructure scope is production.

## Runtime diagnostics

Internal builds display `NEXT` in the application shell and show a detailed panel under Settings -> General.

The panel reports:

- generation and parent generation;
- core/control-plane SHAs;
- schema target and runtime state;
- core API and control-plane health;
- worker health;
- update/trust/analytics/release identity;
- isolation blockers.

A NEXT desktop probes the internal control plane diagnostics endpoint. A generation/commit mismatch makes control-plane health fail rather than silently accepting a different backend generation.

## Internal infrastructure contract

The corresponding control-plane generation must run with separate:

- PostgreSQL database;
- Redis endpoint/namespace;
- data directory;
- public origin;
- analytics namespace;
- update/release namespace;
- test accounts, payment events and integrations.

Production user/order/license data is not NEXT authority. Only schema/migration lineage is inherited.

## Owner acceptance

The canonical owner pack is `test-packs/internal-v1/`.

It reuses hashed repository fixtures and contains three levels:

1. SMOKE — generation identity, revenue analysis, Deep BA evidence, Excel Analysis/Pivot.
2. FEATURE — period comparison, governed multi-source, Power BI/Excel handoff and persistence/revalidation.
3. RELEASE ACCEPTANCE — provenance, infrastructure isolation, whole-stack restart and promotion evidence.

The pack is validated in CI with `pnpm test:internal-uat-pack`. Expected business totals are grounded in the existing LightBI acceptance ground truth, not newly invented fixtures.

## Promotion rule

A NEXT generation may be considered for promotion only when:

- machine gates pass;
- internal infrastructure diagnostics match the generation manifest;
- owner acceptance evidence names exactly one generation ID;
- required UAT scenarios pass;
- production migration plan has been separately reviewed;
- the owner explicitly approves promotion.

Promotion is not automatic. Phase 2A trust remains unfrozen, so Trust-1/signer/attestation stay blocked.
