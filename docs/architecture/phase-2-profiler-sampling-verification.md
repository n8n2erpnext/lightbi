# Phase 2 Canonical Profiler and Sampling Verification

- Date: 2026-07-10
- Phase: 2 only
- Canonical owner: `understanding-core`
- Production runtime wiring changed: no
- Semantic mapping or Phase 3 started: no

## Result

Phase 2 adds a versioned, source-neutral physical profiling artifact to `understanding-core`. It accepts a caller-supplied raw row matrix, selects and preserves header/data-region evidence, profiles every selected physical column over the full data region, and creates deterministic representative evidence that remains explicitly separate from full-file truth.

The implementation does not infer business semantics, mappings, aliases, grain, relationships, domains, questions, actions, or support. Existing `understanding-next`, legacy profiling, runtime, UI, AI, playbook, DuckDB, and execution behavior remain unchanged. `DOMAIN_SUPPORT_MANIFEST` remains empty and no `mvp_proven` claim was added.

## Documentation inputs

The following requested paths were absent:

- `docs/CODEX_CANONICAL_CONTEXT.md`
- `docs/MVP.md`

The Phase 2 section of the existing `docs/MVP_sol.md` was used as the roadmap fallback. ADR-122, ownership, Phase 1/1B verification, the corpus manifest, all 30 profiling expectation sections, and relevant `understanding-core` source/contracts/tests were read completely.

## Contracts added

`profiling-contracts.ts` defines:

- `CanonicalPhysicalSourceInputV1` and stable `PhysicalSourceIdentityV1`;
- `SourceProfileV1` and `ColumnPhysicalProfileV1`;
- physical type candidates with confidence and evidence;
- parse success/failure evidence;
- exact or bounded cardinality and uniqueness evidence;
- numeric, date/time, and string/categorical summaries;
- versioned structural issues, limitations, and confidence;
- `RepresentativeEvidenceV1` with physical source-row indices;
- the physical Phase 2 portion of `DatasetUnderstandingArtifactV1`;
- source hash provenance where supplied.

Contracts are independent from `understanding-next`.

## Full-file profiling

`profilePhysicalSource` scans every non-empty row in the selected data region. It reports separate source, profiled, and representative row counts and never substitutes evidence-row facts for full-file aggregates.

Per-column output includes null/non-null counts, candidate physical types, parse counts and failure witnesses, representative raw values, cardinality, duplicate/uniqueness evidence, numeric statistics, date ranges, string lengths/top values, technical-column evidence, issues, and limitations.

Header selection is structural rather than semantic. Skipped pre-header rows remain in the artifact. Empty headers, trailing formatted columns, duplicate headers, inconsistent widths, title rows, possible merged headers, and unsafe header selection are surfaced rather than silently removed.

## Representative evidence

Sources with at most 100 data rows retain every selected data row as evidence. Larger sources deterministically combine:

- five head rows;
- five middle rows;
- five tail rows;
- ten source-stable pseudo-random positions;
- bounded supplementation for parse failures, nulls, rare categorical values, mixed physical types, formula errors, and structural issue witnesses.

Every evidence row preserves both data-region index and physical source-row index. The contract fixes `fullFileTruth` to `false` and carries explicit sampling limitations.

## Corpus results

| Corpus group | Cases passed | Cases failed | Tuning use |
|---|---:|---:|---|
| Golden | 8 | 0 | implementation guidance allowed |
| Holdout | 12 | 0 | validation only |
| Adversarial | 5 | 0 | validation only |
| Multi-file | 5 | 0 | validation only |
| Total | 30 | 0 | governed by corpus provenance |

The runner profiles 19 unique required sources. Reused sources are cached within the test process but each artifact is produced from full raw source rows.

## Assertion classes

Exact assertions:

- source SHA-256 provenance;
- selected zero-based header row;
- full selected data-region row count;
- source identity and full profiling scope;
- preserved physical column names and source-row indices;
- forbidden issue absence.

Bounded or allowed assertions:

- at least one physical type candidate must match the corpus allowed alternatives;
- expected issues must be present, while additional truthful physical issues may be reported;
- representative evidence must cover required regions and columns;
- representative evidence remains smaller than full data for sources over 100 rows;
- parser failure witnesses must appear in representative evidence.

Acceptance ground truth was not changed in Phase 2.

## Profiling limitations

- The profiler receives decoded raw rows; archive, encryption, password, encoding, and workbook-container handling remain the caller's responsibility.
- Date parsing supports explicit ISO and day-first slash/dash forms plus bounded Excel serial candidates. Ambiguous day/month strings are reported rather than locale-guessed.
- Numeric parsing supports finite native values, grouped decimal text, parenthesized negatives, and percentages. Locale-specific comma decimals remain unsupported and explicit as parse failures.
- Distinct cardinality is exact through 50,000 observed values, then becomes a lower bound.
- Header selection is structural. Multi-table sheets, repeated headers inside a sheet, footers, deeply nested headers, and merged-cell reconstruction may remain uncertain.
- Formula results are profiled as supplied decoded values; formula evaluation is not performed.
- Object, binary, rich-cell, and unsupported JavaScript values remain unknown rather than coerced.
- Full-file truth requires the caller to supply all physical rows. A preview-only caller cannot claim a full-file artifact merely by setting a larger row count.

## Unsupported source conditions

Empty sources, missing safe headers, and unavailable data regions produce explicit `not_found`/`unavailable` states and limitations. The pure core does not open files, databases, APIs, or online sheets and does not compute file hashes; source adapters must supply decoded rows and hashes when available.

## Performance observations

- Six focused synthetic profiler/sampler tests complete in under one second of test time.
- The 30-case corpus runner, including XLS/XLSX/CSV file reads for 19 unique sources and full-column scans, completes in approximately 25 seconds in the current workspace.
- Profiling memory is proportional to decoded source rows plus bounded distinct maps. Representative evidence itself is bounded, but exact full-file facts necessarily require a full scan.

## Tests run

### Canonical profiler and sampler

```text
npm test -- --run src/lib/understanding-core/profiler.test.ts src/lib/understanding-core/profiler.corpus.test.ts
2 files passed; 12 tests passed
```

### Phase 1 / 1B corpus validation and required presence/hash

```text
npm test -- --run src/lib/semantic-registry.test.ts src/lib/semantic-sampler.test.ts
2 files passed; 21 tests passed
```

### Required real samples

```text
npm test -- --run src/lib/understanding-next/real-sample.test.ts
1 file passed; 41 tests passed
```

### TypeScript

```text
npx tsc --noEmit
passed
```

### Diff check

```text
git diff --check
passed
```

### Full desktop suite

```text
npm test -- --run --reporter=dot
94 files passed; 4 files failed
833 tests passed; 9 tests failed
```

All Phase 2 profiler/sampler tests passed. The nine failures match the previously recorded failures outside Phase 2:

- three existing numeric-health expectation failures;
- one guided-investigation question-suggestion failure;
- two virtual-dataset planner status failures;
- three BA comparison tests timing out at five seconds.

Investigation tests also log existing relative session-API URL warnings under the test environment, but those tests pass. No failure or warning above is owned by or modified in Phase 2.

## Files changed in Phase 2

1. `apps/desktop/src/lib/understanding-core/profiling-contracts.ts`
2. `apps/desktop/src/lib/understanding-core/profiler.ts`
3. `apps/desktop/src/lib/understanding-core/representative-sampler.ts`
4. `apps/desktop/src/lib/understanding-core/profiler.test.ts`
5. `apps/desktop/src/lib/understanding-core/profiler.corpus.test.ts`
6. `apps/desktop/src/lib/understanding-core/index.ts`
7. `apps/desktop/src/lib/understanding-core/OWNERSHIP.md`
8. `docs/architecture/phase-2-profiler-sampling-verification.md`

No acceptance ground-truth JSON, semantic alias, production detector, legacy/Next profiler, domain manifest, Home, Investigation, UI, AI, playbook, runtime, DuckDB, or execution file changed in Phase 2.

## Rollback

Delete the three new profiling implementation/contract files, the two new tests, and this report; restore `understanding-core/index.ts` and `OWNERSHIP.md`. No runtime rollback, database migration, alias rollback, or support-manifest migration is required because Phase 2 is not wired into production behavior.

## Stop condition

Phase 2 stops here. Do not implement semantic mapping, alias resolution, grain or relationship inference, domain activation, questions, actions, runtime wiring, or any Phase 3 behavior in this change set.
