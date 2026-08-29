# JiveDB Public Product Evidence Audit

**Date:** 2026-06-19  
**Reference:** `references/JiveDBApp` at commit `ecc2057`  
**Evidence available:** README, release notes, deterministic database fixtures, Docker/TLS/SSH test infrastructure  
**Source availability:** Application source is not present in the repository

## Legal and Evidence Boundary

JiveDB is distributed under a proprietary EULA. The repository does not expose the application implementation, and the license prohibits reverse engineering and use of the software to develop a competing product.

This audit therefore does not inspect binaries, reproduce UI implementation, or copy fixtures/code. It only records high-level product behavior described in public text and independently applicable QA lessons.

## Useful Product Invariants

### Fast first result, exact metadata later

JiveDB reports quick table row estimates first and computes exact counts in the background. This supports the same two-phase direction found in TablePro: usable rows must not wait for expensive exact metadata.

### Server-side bounded grids

The documented grid uses server-side filtering, sorting, pagination, configurable page sizes, and virtualization. Fetching an entire database table is not the normal interaction path.

### Explicit database and schema context

PostgreSQL query tabs bind both database and schema. MySQL query tabs bind a selected database. Autocomplete and object discovery follow that explicit context rather than a global default.

### Multi-statement semantics are deliberate

Statements run sequentially, stop at the first error, and retain earlier successful results. Statement splitting understands PostgreSQL dollar-quoted function/procedure bodies.

### Targeted invalidation

DDL refreshes the containing schema group and related ERD/data tabs rather than invalidating the whole workspace. Deleting a connection closes its live session and clears related tabs and schema cache.

### Type fidelity matters

Precision-sensitive values such as `bigint`, `numeric`, `decimal`, and money are represented as strings at the UI boundary. Structured values retain JSON/array structure. This avoids silent JavaScript precision loss.

### SQLite is a special concurrency case

Release notes identify serialized file access, WAL mode, and clean shutdown as data-safety requirements. SQLite should not be treated exactly like a network database merely because it accepts SQL.

### Progressive batch feedback

Long Redis command batches expose progress. The general lesson is that work consisting of known units should report progress rather than only a spinner.

## QA Strategy Worth Adopting Independently

The repository demonstrates a broad connector acceptance matrix:

- equivalent relational domains across PostgreSQL, MySQL, and SQLite;
- multi-database and multi-schema installations;
- relationships, views, triggers, routines, enums, partitions, and unusual native types;
- Redis values across strings, hashes, lists, sets, sorted sets, TTL, and counters;
- TLS modes, mTLS, and SSH tunneling;
- deterministic generated data at small and larger scales.

LightBI should create its own original fixture suite with the same categories. This is more valuable than relying on a few manually configured production databases.

## What JiveDB Cannot Tell Us

Because source is absent, the repository provides no verifiable evidence about:

- internal driver interfaces;
- state ownership;
- cancellation implementation;
- row-buffer representation;
- connection pooling;
- virtualization mechanics;
- cache implementation;
- query parser implementation.

TablePro remains the stronger architecture reference. JiveDB contributes product requirements and test coverage ideas only.

## Relevance to LightBI

The strongest additions to the existing LightBI direction are:

1. treat database/schema context as part of every query tab;
2. preserve exact native type metadata and precision at the result boundary;
3. define explicit multi-statement execution semantics;
4. use targeted schema/tab invalidation after DDL;
5. give SQLite its own safe session policy;
6. build a deterministic multi-engine security/type/schema acceptance suite.
