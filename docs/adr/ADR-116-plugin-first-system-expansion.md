# ADR-116: Plugin-First System Expansion

**Date:** 2026-06-28  
**Status:** Accepted, SDK contract scaffolded

## Context

LightBI now has enough built-in source coverage for the current product core:

- local files: CSV, TSV, JSON, TXT, Excel;
- online spreadsheet/file links, including Microsoft 365/OneDrive flows;
- core database providers: PostgreSQL, MySQL/MariaDB, SQLite, MongoDB/Atlas.

TablePro was reviewed as an architecture reference. Its SQL Server support is not a small UI switch. It is modeled as provider-specific capability and driver work: a database type registry, plugin driver, SQL dialect, schema queries, SSL/TLS mapping, DDL helpers, and writeback/import/export behavior.

Adding every enterprise system directly into LightBI core would make the BA engine and Advanced workspace harder to stabilize. LightBI needs a stable core first, then a provider ecosystem.

## Decision

Freeze the current built-in provider core unless a source is required for baseline LightBI operation. New enterprise systems should be added through a plugin contract rather than patched directly into core.

Core owns:

- data understanding and BA decision briefing;
- trust scoring, evidence, chart recommendations, and dashboard handoff;
- shared Simple/Advanced execution lifecycle;
- result buffers, chart contracts, import/export orchestration, and safety policies;
- built-in providers needed for common SME workflows.

Plugins own provider-specific behavior:

- provider identity, icon, default port, URL schemes, and connection fields;
- SQL or document dialect;
- connection validation/session creation;
- schema, table, column, index, FK, routine, and size metadata;
- query execution, cancellation, and streaming;
- import/export capabilities;
- DDL/writeback capabilities and safe-mode policy;
- diagnostics and provider-specific error normalization.

## Immediate Scope

`@lightbi/plugin-sdk` is introduced as a TypeScript contract scaffold. It is intentionally interface-only for now. It allows LightBI to design SQL Server, Oracle, BigQuery, Snowflake, DynamoDB, Redis, Etcd, ERP, and other connectors as plugins without committing to dynamic runtime loading in this phase.

The first SDK manual lives at `docs/plugin-sdk/provider-plugin-manual.md`. It defines the provider lifecycle, minimum UI exposure gate, schema metadata expectations, streaming import/export contracts, writeback/DDL review flow, diagnostics, and deployment checklist.

The current Rust backend mirrors the manifest and exposure-gate shape in `apps/server/src/plugin_host.rs`. It exposes:

- `GET /api/plugins/providers` for public/exposable providers;
- `GET /api/plugins/providers/diagnostics` for all registered providers, including hidden planned plugins.

SQL Server should be the first real driver plugin when this track resumes. Do not add SQL Server to Simple database intake or Advanced provider selection until a plugin host can register:

- a `sqlserver` provider manifest;
- bracket identifier quoting;
- `@p1` or driver-native parameter handling;
- `TOP/OFFSET FETCH` query shaping;
- `dbo` schema defaults;
- SQL Server catalog queries;
- TLS/encryption options;
- transaction/writeback review behavior.

## Non-Goals For This Phase

- No third-party plugin loading from arbitrary packages yet.
- No marketplace, signing, sandbox, or permission prompt yet.
- No cloud sync for plugin settings yet.
- No backend driver dependency added just to expose a UI option.

## Invariant

LightBI must never expose a provider option in user-facing Simple or Advanced flows unless the provider can at least connect, discover schema, run a bounded read-only query, and return typed result rows through the shared result buffer contract.
