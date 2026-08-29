# ROADMAP-MVP-V1 Phase 1: Multi-evidence signal strengthening

I have successfully completed Phase 1: strengthening the `BusinessSignal` detection quality using cheap local evidence.

## Changes Made
- **Extended `DetectorInput`**: Added optional fields `sampleValues`, `distinctRatio`, and `uniqueValuesCount` to the column interfaces in `apps/desktop/src/lib/business-signal-detector.ts`.
- **Enhanced `profileSupport` Heuristics**: Upgraded the scoring mechanism in `detectBusinessSignals` to utilize the new cheap local evidence fields:
  - **Date-like parsing**: Gives a `+20` boost for time signals when values parse as valid dates.
  - **Low-cardinality status**: Gives a `+20` boost for status-like dimensions when the distinct ratio is low or unique values count is small.
  - **Numeric/categorical reinforcement**: Gives `+20` for measures with numeric evidence, `-10` penalty for measures looking categorical, and `+10` boost for string dimensions.
  - **Distinct-ratio hints**: Gives `+15` boost for identifier dimensions (e.g., `shipment`, `sku`, `driver`) with high distinct ratios.
- **Added Evidence Tests**: Wrote dedicated test cases in `apps/desktop/src/lib/business-signal-detector.test.ts` to prove each of the specific heuristic enhancements.

## Validation Results
- **Targeted Vitest**: Successfully ran the isolated test suite on the VPS: `38 passed`.
- **Full Vitest**: Successfully ran the entire desktop module test suite: `328 passed`.
- No downstream behavior was affected, as the shape of the pipeline remains completely unchanged. `AGENT_HANDOFF.md` has been updated with the success evidence.
