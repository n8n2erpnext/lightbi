# Phase 8A Production Full-Source Boundary Closure

## Scope

Phase 8A closes the Simple Mode large-local-file boundary only. It does not
change mappings, aliases, domains, metric formulas, questions, runtime policy,
or visual design.

## Defect And Correction

The previous canonical consumer required retained object rows to equal the
declared source row count. Files above the retention limit therefore failed
with `full_file_row_coverage_required`, although the inspector knew the exact
count and the browser retained the original `File`.

The production boundary now keeps three non-interchangeable scopes:

1. A bounded semantic sample for interpretation and preview.
2. A SHA-256-bound full-file physical profile plus canonical semantic/grain
   artifacts produced while complete raw rows are locally available.
3. A runtime file reference bound to the same dataset, source, fingerprint,
   inspection generation, profile generation, and row count.

Home passes that boundary into the canonical consumer without retaining the
full row array in React state. Investigation verifies the handoff and runtime
binding, materializes the original file in the existing worker, checks the
actual row count, and executes only the governed M3 DuckDB plan. Failure never
falls back to retained sample rows.

## Production Proof

The Phase 8A test generates a deterministic 20,123-row commerce CSV in memory
and computes revenue independently. Actual inspector, profiler, canonical
M1/M2/M3, handoff, parser, and governed executor modules produce an exact
oracle match using all 20,123 rows. No complete analysis row array is retained.

Advanced results now carry `complete`, `bounded`, `paginated`, `truncated`, or
`unknown` completeness. Any partial state remains `retained_rows`, preserves a
stable blocker through handoff, and cannot claim decision support.

## Verification

- Phase 8A and production page tests: pass.
- Complete understanding-core plus Phase 5-7R4.1 matrix: 78 files and 363
  tests passed.
- TypeScript: zero diagnostics.
- Architecture and corpus JSON: 274 documents parsed.
- Canonical import/reachability scan: no production legacy/mock executor.
- Governed baseline allowlist unchanged at
  `baa86950582b7d758396abb0c69fdaffcd3c2cbbb22b71dd3bbdb3c0aed1c4f5`.
- `git diff --check`: pass.
- Final full desktop suite ran exactly once: 168 files (164 passed, 4 governed
  baseline failures) and 1,143 tests (1,134 passed, 9 governed baseline
  failures). All nine failure identities match the unchanged allowlist;
  unexpected and Phase 8A-owned failures are zero. The complete log is
  `/tmp/phase8a-final-full-desktop.log` with SHA-256
  `5d08726c36488014d9bb53eb44fedf754f067f2608175a8b8055bb18822132a4`.

## Rollback

Revert the single Phase 8A checkpoint commit. The candidate parent is
`11803066709d55a629de6c2576b9da9cd94da695`; the intervening evidence-only
commit is preserved in ancestry. No data migration is required.

## Boundary

Phase 8B and later interaction, confirmation, UX, domain, metric, AI, and SDK
work was not started.

Classification: `production_full_source_boundary_ready_for_evidence_interaction`.
