# Domain Sample Matrix

Status: descriptive index only. This file does not prove signal recognition, domain support, action executability, or metric correctness.

The Phase 1B machine-readable source of truth is corpus version `1.1.0`:

- `sample-corpus/manifest.json` for corpus policy and required files;
- `sample-corpus/ground-truth/*.json` for per-sample recognition, ambiguity, grain, support, action, and metric expectations;
- `docs/architecture/phase-1-corpus-verification.md` for the verification result.

Do not infer `mvp_supported` from this document or from a signal's generic registry domain. `DOMAIN_SUPPORT_MANIFEST` remains empty in Phase 1B.

## Corpus coverage

| Ground-truth category | Cases | Purpose |
|---|---:|---|
| Revenue and sales | 5 | Transaction identity, revenue/payment/product mappings, profitability refusal when cost is absent. |
| Inventory | 5 | Product master, snapshot aging/backlog, and event-grain movement distinctions. |
| Operations and delivery | 5 | Shipment, route, trip, vehicle, driver/carrier, on-time, status, and fee evidence. |
| Finance and accounting | 5 | Explicit invoice/revenue/cost/profit mappings plus refusal for unsupported accounting conclusions. |
| Adversarial and dirty | 5 | Generic/misleading headers, merged headers, dirty exports, and out-of-wedge datasets. |
| Multi-file | 5 | Monthly bundles, period pairs, relationship expectations, and join refusal. |

Total: 30 sample cases. Domain validation contains 12 held-out cases out of 20 domain cases (60%). Holdout cases are forbidden for alias or threshold tuning.

## Collision coverage

The adversarial ground truth contains 84 normalized collision cases representing the union of all current `aliases` and effective `headerAliases` collisions in the Phase 0 registry inventory. Each case requires ambiguity from the header alone and defines a separate contextual-resolution contract; contextual evidence may retain ambiguity or resolve it.

## Interpretation boundary

The corpus deliberately separates:

```text
recognition truth
  != domain-pack eligibility
  != executable action truth
  != verified metric truth
```

The corpus defines future acceptance targets. It does not state that the current detector passes those targets, and it does not promote any signal or domain to `mvp_proven`.
