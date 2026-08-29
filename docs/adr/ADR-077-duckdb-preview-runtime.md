# ADR-077: DuckDB Preview Runtime

## Status
Accepted

## Context
Following the completion of the Trust Layer's initial wiring and provisional confidence scoring (Phase T.3), the system is ready to securely execute queries against data. 
However, before full runtime execution and materialization is implemented, we need a tightly constrained preview environment.

## Decision
We implement the **DuckDB Preview Runtime**.

### Rules and Constraints
1. **Limited Execution Only**: The preview runtime must strictly cap output rows. It enforces limits from the Sandbox Policy (default 100 rows).
2. **Cannot Bypass Sandbox Policy**: If the Sandbox Policy evaluates `canExecute = false`, the runtime acts as a hard block and does not touch the engine.
3. **Cannot Bypass PreviewResultContract**: If the PreviewResultContract is invalid or blocked, execution is aborted.
4. **Cannot Bypass ExpectedResultContract**: The output columns must mathematically map back to the dimensions and measures defined in the PreviewResultContract (and transitively, the ExpectedResultContract).
5. **Trust Output Propagation**: It must not mark results as final. The raw output is meant to feed the Result Validator, which subsequently unlocks the Business Confidence Engine's final mode.
6. **No AI or UI Leaks**: The preview mode cannot generate charts or bypass the trust layers. It is purely for validation of the compiled SQL contract against data reality.

## Consequences
- We introduce actual query execution simulation/adapters that enforce safety rules.
- The UI can now safely show limited data samples for validation.
- We open the path for Result Validator Integration (Phase R.6 / Full Validation), where actual rows are tested against ExpectedResultContracts.
