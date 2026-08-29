# ADR-067: Safe SQL Compiler Contract

## Status
Accepted

## Context
Compiling complex abstract planning graphs directly into executable SQL queries often results in unmaintainable string-manipulation code, SQL injection vectors, and untestable edge cases. Before sending any query to the DuckDB execution engine, we need an isolated environment that parses logic and generates the final structural contract of the query.

## Decision
We introduce the `CompiledQueryContract` layer.
- The `Safe SQL Compiler` evaluates the `RuntimeBoundaryArtifact` and the `ExpectedResultContract`.
- The compiler strictly uses the `ExpectedResultContract` as the primary authority. If the Expected Result requires an aggregate (e.g., `shape: ranking`), the compiler MUST generate aggregates.
- The compiler outputs a `CompiledQueryContract` detailing `sources`, `joins`, `aggregates`, and `sorts`.
- For preview purposes only, the compiler also generates a placeholder SQL string (`sql`). This string is never executed. It contains placeholders for tables and joins (e.g., `table_d1`, `/* JOIN Placeholder */`) to simulate what the query looks like.

## Rules
- The Compiler must **NOT** execute anything.
- The Compiler must **NOT** connect to DuckDB.
- The Compiler must **NOT** accept raw Question inputs; it strictly consumes the boundary artifact.
- If the compiler detects a structural mismatch (e.g., LogicalPlan missing joins for a multi-dataset artifact), it must output a warning or block the plan entirely.

## Rationale
By enforcing this compiler contract, we ensure that:
1. Every component of the query is testable individually via objects.
2. We can provide the user with a transparent preview of exactly what SQL will be run before the backend sandbox initializes.
3. The actual runtime sandbox (in the Rust backend) has a clear blueprint to follow when physically compiling the real DuckDB SQL.
