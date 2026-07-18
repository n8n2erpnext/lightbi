# Phase 8B Production Evidence Interaction Closure

## Scope

Phase 8B adds one source-bound, versioned overlay to the production Simple
Mode canonical path. It does not add aliases, domains, metrics, execution
operators, AI behavior, or a new layout. The Phase 8A checkpoint was
`a6a13e3d54de3f3fa38367f326dcd4957cdf620b` with tree
`34770bcda295ea6f75f2d1d2f466e876f826daec` and parent
`61e605201d5f3657e7ea3f3998c07e0e248ce1c3`. It descends from the required
`11803066709d55a629de6c2576b9da9cd94da695`; tracked state was clean before
implementation.

## Production Loop

`CanonicalEvidenceReview` writes immutable mapping decisions and source
evidence declarations into `currentDataset.canonicalUserOverlay`. Home retains
that versioned overlay in its existing local workspace snapshot. Overlay
identity participates in the canonical consumer cache key and artifact
identity. Every change clears selected results and preview state, rebuilds the
artifact from the original Phase 8A source boundary, and re-runs unchanged
M1 and M2. Investigation derives M3 from the rebuilt artifact and rejects a
handoff whose artifact, overlay, or source has been superseded.

Legacy `DatasetUnderstandingCard` mapping controls no longer appear in Home as
an independent state owner. The new controls expose inferred candidates and
their supporting or contradicting evidence separately from user-confirmed
evidence. They also expose inferred, confirmed, ignored, stale/invalid, and
rebuild states. Detailed blocker prioritization remains Phase 8C work.

## Safety

The overlay can select only compatible signals already in the registry. It
cannot create a signal, target a derived metric, alter source rows, activate a
domain, authorize an action, weaken M1/M3, or erase inferred candidate lineage.
Currency, UOM, period, as-of, role, and identity declarations are validated
and bound to exact fingerprint and profile generations. Invalid and stale
records remain non-authoritative. Serialized state is accepted only when the
version, nested contract, and deterministic overlay identity are intact.

## Exact Positive Proofs

The source-bound VND and reporting-period declarations unlock gross profit
only after all other requirements pass. Governed DuckDB returns exactly
`3,075,721,244`. Removing currency removes the advertised action again.

The inventory path requires mappings for item, warehouse, on-hand quantity,
time and UOM plus snapshot role, UOM, as-of date, item identity, and warehouse
identity. The item/warehouse action returns exactly `211,067`; every detailed
item/warehouse/as-of key and quantity matches the independent oracle with no
missing, unexpected, duplicate, or mismatched row. Removing any required
declaration returns inventory to a non-advertised state.

All 24 required negative probes fail closed or remain non-authoritative.
Original source rows remain unchanged.

## Verification

- Phase 8B production interaction: 3/3 tests passed.
- Production Advanced, Investigation, and understanding-card projection:
  30/30 tests passed.
- Complete understanding-core matrix: 76 files and 332 tests passed.
- Repository TypeScript: zero diagnostics.
- JSON parsing passed for 292 files; diff and canonical reachability checks
  passed.
- The final desktop suite ran exactly once: 169 files and 1,146 tests. Eight
  failures on four files matched the governed allowlist by identity and
  signature: six deterministic baseline failures and two permitted BA
  timeouts; the third timing-sensitive case passed. Unexpected and Phase
  8B-owned failures were zero. The complete retained log SHA-256 is
  `bd61d973edf97f237330817e7377fd2f639f311c452786cdca40f3e9f2e1b89d`.

No push is part of this phase. Phase 8C and later work were not started.
