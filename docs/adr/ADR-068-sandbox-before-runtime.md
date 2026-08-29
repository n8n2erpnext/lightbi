# ADR-068: Sandbox Before Runtime

## Status
Accepted

## Context
Before unleashing compiled queries onto the execution engine (DuckDB), we need a deterministic gate that evaluates the complexity of the query and enforces limits. Running queries against large datasets or executing massive cross-joins can freeze the application or crash the user's machine.

## Decision
Introduce the `SandboxExecutionRequest` and `SandboxEvaluationResult` contracts.
- This layer sits immediately before DuckDB execution.
- It enforces a `SandboxPolicy` comprising `maxDatasets`, `maxRelationships`, `maxRowsPreview`, `maxExecutionMs`, and `maxMemoryMB`.
- If an operation wildly exceeds safe thresholds (e.g., dataset count > max * 2), it blocks.
- If it moderately exceeds, or confidence is low, it issues a warning.

## Rules
- The sandbox must **NOT** execute anything to evaluate safety.
- It strictly relies on the metadata captured in the `CompiledQueryContract` and `ExpectedResultContract`.
- The user must explicitly acknowledge sandbox warnings to proceed.

## Rationale
This prevents runaway queries and forces us to be honest about the cost of an analysis *before* running it. By formalizing memory and time limits here, the future backend runtime has an explicit configuration object that it is bound by law to honor.
