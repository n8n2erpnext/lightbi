# ADR-121: Runtime Semantic Registry Source of Truth

## Status
Accepted - Phase 30 V1 implemented

## Context

ADR-120 added context-aware semantic detection, but the same semantic facts still live in multiple places. A signal such as payment method, carrier, margin, or delivery fee may be known by one layer and invisible to another.

That creates the product failure the user calls "blindness":

```text
data is present
-> semantic layer misses or drops it
-> BA report and AI mode cannot reason from it
```

## Decision

Introduce `semantic-registry.ts` as the runtime source of truth for supported BA signal definitions.

The registry owns:

- canonical signal id;
- primary domain;
- label;
- signal type;
- role;
- semantic family;
- support status;
- domains;
- header aliases;
- value aliases;
- value patterns;
- compatible types.

`business-signal-detector.ts` must consume a taxonomy view derived from the registry.

`context-semantic-dictionary.ts` must consume a dictionary view derived from the registry.

## Non-Negotiable Rules

1. No detector or BA layer may introduce a supported runtime canonical signal that is absent from the semantic registry.
2. Cross-file and neighbor evidence remain support evidence, not standalone mapping authority.
3. Unknown populated business-like fields remain visible as coverage gaps.
4. Guidance-only domains remain advertised or partial until they have registry entries, playbooks, tests, and executable actions.
5. Source-of-truth migration must be incremental: stable flows stay working while legacy layers are bridged.

## Consequences

This does not make the product understand every arbitrary enterprise file yet. It does remove the current class of drift where the dictionary, detector, and BA layers disagree about which runtime signals exist.

V1 keeps broader legacy/universal ontology layers as adapters, not owners. Runtime-supported BA signals must exist in `semantic-registry.ts`; playbooks and domain catalog are guarded against referencing unknown runtime signals.
