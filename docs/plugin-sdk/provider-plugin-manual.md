# LightBI Provider Plugin SDK Manual

**Status:** Draft v0.1  
**Applies to:** `@lightbi/plugin-sdk` v0.1.0  
**Date:** 2026-06-28

## Purpose

LightBI uses plugins to expand data-source coverage without turning the core app into a pile of provider-specific code.

The core product remains a Business Understanding Engine. A plugin only supplies data access, metadata, execution, diagnostics, and optional import/export or writeback operations. LightBI core then turns the result into data trust, business understanding, BA briefs, charts, dashboards, and exportable evidence.

## Current Phase

The SDK is currently a TypeScript contract and manual, not a dynamic third-party marketplace runtime.

Supported implementation paths in this phase:

- built-in plugin modules compiled with LightBI;
- first-party provider packages used by the backend host;
- experimental local plugins for SQL Server and future enterprise sources.

The SDK now includes `LightBIPluginRegistry`, a small trusted-host helper that can register built-in plugin objects, evaluate the minimum exposure gate, initialize providers, list manifests, and dispose providers. It is not a dynamic marketplace loader.

The Rust backend mirrors the same provider manifest and exposure-gate shape in `apps/server/src/plugin_host.rs`. This lets the current Axum backend expose trusted built-in providers before the TypeScript SDK has a dynamic runtime loader.

Backend routes:

- `GET /api/plugins/providers`: provider entries that pass the exposure gate and may be shown in user-facing source lists.
- `GET /api/plugins/providers/diagnostics`: all registered entries, including planned or hidden providers such as SQL Server.

Deferred:

- arbitrary third-party package loading;
- signed marketplace distribution;
- cloud plugin sync;
- per-plugin permission prompts;
- sandboxed remote plugin execution.

## Hard Gate Before UI Exposure

Do not expose a provider in Simple intake, Advanced provider selection, or dashboard refresh until it satisfies all minimum checks:

1. `manifest.capabilities.connect === true`
2. `connect()` returns a stable `LightBIConnectionHandle`
3. `discoverSchema()` returns tables, columns, and native types
4. `query()` can run a bounded read-only query with `limit`
5. query results include typed `columns` and row buffers
6. errors are normalized with `normalizeError()` or converted to `LightBIDiagnostic`
7. credentials are not logged or returned to the frontend

This rule prevents UI-only provider options that look connected but fail once the user asks LightBI to understand the data.

## Plugin Lifecycle

Recommended lifecycle:

1. Host loads plugin module.
2. Host registers it with `LightBIPluginRegistry`.
3. Host checks `entry.exposureGate.canExpose`.
4. Host calls `initialize(context)` once.
5. User creates or opens a connection profile.
6. Host calls `testConnection(input)` if implemented.
7. Host calls `connect(input)` and stores the session handle in backend memory.
8. Host calls `discoverSchema(handle)`.
9. Advanced mode uses `query()`, `streamQuery()`, `exportRows()`, `previewWrite()`, or `commitWrite()` based on capabilities.
10. Simple mode may request bounded samples through the shared result contract.
11. Host calls `disconnect(handle)` when the session ends.
12. Host calls `dispose()` during shutdown or plugin reload.

## Registry Example

```ts
import {
  LightBIPluginRegistry,
  type LightBIPluginContext,
} from '@lightbi/plugin-sdk';
import sqlServerPlugin from './providers/sqlserver';

const registry = new LightBIPluginRegistry();
const entry = registry.register(sqlServerPlugin);

if (!entry.exposureGate.canExpose) {
  throw new Error(
    `Provider cannot be exposed: ${entry.exposureGate.missingCapabilities.join(', ')}`,
  );
}

const context: LightBIPluginContext = {
  logger,
  secrets,
  hostVersion: '0.1.0',
};

await registry.initialize(context);
```

Use `registry.listExposable()` when building a provider list for UI. Use `registry.list()` for internal diagnostics so hidden/incomplete providers can still be inspected by developers.

## Manifest Rules

Use `apiVersion: LIGHTBI_PLUGIN_API_VERSION`.

Provider IDs should be lowercase, stable, and unique:

- good: `sqlserver`, `oracle`, `bigquery`, `erpnext`
- avoid: `SQL Server`, `my-plugin-v2`, `test`

Connection fields should describe only what the provider owns. Do not duplicate LightBI global controls such as safe mode or TLS mode unless the provider needs extra driver-specific fields.

Secrets must use either:

- `kind: 'password'` plus `secret: true`; or
- a secret reference stored through the host secret store.

## SQL Dialect

Relational providers should define:

- identifier quoting style;
- parameter style;
- limit/offset behavior;
- default schema;
- transaction support;
- returning/savepoint support if available.

Examples:

- PostgreSQL: double quotes, `$1`, `LIMIT/OFFSET`
- MySQL/MariaDB: backticks, `?`, `LIMIT/OFFSET`
- SQL Server: brackets, `@p1`, `TOP` or `OFFSET FETCH`, default schema `dbo`

The host should use the dialect to compile filters, previews, exports, and writeback plans instead of string-splicing provider-specific SQL in UI code.

## Schema Metadata

`discoverSchema()` should return as much metadata as the provider can safely collect:

- schemas;
- tables, views, collections, and materialized views;
- columns with native and logical types;
- nullable, primary key, default, generated, and comments;
- indexes;
- foreign keys;
- triggers;
- routines/functions/procedures;
- estimated row counts and table size.

Schema discovery can be progressive. The first response should be fast enough for navigation, while deeper metadata can be refreshed later by the host.

## Query Execution

`query()` must respect:

- `limit`;
- `offset`;
- `maxRows`;
- `timeoutMs`;
- `readOnly`;
- `parameters`;
- cancellation signal when practical.

Providers must never ignore bounded query constraints. If a source cannot safely limit rows, return a warning and set `truncated: true`.

`streamQuery()` is optional and should be used for large exports, long reads, and future dashboard refresh workers.

## Import and Export

Plugins can support:

- `exportRows()` for CSV, XLSX, JSON, or SQL export;
- `previewImport()` for parsing and mapping user files;
- `importRows()` for batch row import with error modes.

Import error modes:

- `stop_rollback`: stop on first error and rollback all rows;
- `stop_commit`: stop on first error and keep committed rows;
- `skip_continue`: skip bad rows and continue.

For enterprise providers, prefer backend streaming import/export over frontend memory buffers.

## Writeback and DDL

Writeback is always a two-step flow:

1. `previewWrite()` or `previewDdl()` returns a `LightBIWritePlan`
2. `commitWrite()` or `commitDdl()` executes that plan

A write plan must include:

- statements;
- parameters if any;
- transaction policy;
- `canCommit`;
- warnings for destructive or ambiguous operations.

Respect safe mode:

- `read_only`: no writes, imports, or DDL;
- `confirm_writes`: preview required before commit;
- `off`: still prefer preview for destructive actions.

## Diagnostics

All provider errors should be normalized into `LightBIDiagnostic`:

- `code`: stable provider or LightBI code;
- `severity`: `info`, `warning`, `error`, or `fatal`;
- `message`: short user-facing explanation;
- `providerMessage`: raw provider message when useful;
- `hint`: practical next action;
- `retryable`: whether a retry might work.

Do not leak passwords, tokens, private keys, or full URLs with credentials.

## Simple Mode Handoff

Simple Mode should not know the provider internals. It receives:

- typed row samples;
- schema metadata;
- execution warnings;
- diagnostics;
- source identity;
- trust and caveat inputs.

The BA engine can then answer:

- What data is this?
- How trustworthy is it?
- Which business lenses are available?
- What insight or chart can be generated?
- Which raw rows support or weaken the conclusion?

## SQL Server First Plugin Notes

SQL Server should be the first real provider plugin when this track resumes.

The starter manifest lives at `packages/plugin-sdk/examples/sqlserver-provider.ts`. It is intentionally not wired to a driver and must not be exposed to users as a working connector.

Minimum SQL Server checklist:

- provider ID: `sqlserver`
- default port: `1433`
- URL schemes: `sqlserver`, `mssql`
- quote style: bracket
- parameter style: `@p1`
- default schema: `dbo`
- TLS/encryption fields mapped to driver options
- schema catalog using SQL Server system views
- bounded read-only query support
- cancellation if driver supports it
- export rows to CSV/XLSX/JSON/SQL
- writeback preview with explicit transaction review

## Deployment Checklist

For a first-party plugin:

1. Create package under `packages/provider-<id>`.
2. Depend on `@lightbi/plugin-sdk`.
3. Export a default `LightBIProviderPlugin`.
4. Add unit tests for manifest, dialect, schema mapping, and error normalization.
5. Add integration tests for connect, schema, bounded query, cancellation, and export.
6. Register the plugin in the backend plugin host.
7. Keep the provider hidden in UI until the hard gate passes.
8. Update ADR-116 and handoff logs with supported capabilities.

## Backend Host Bridge

Current backend host status:

- implemented in Rust Axum, not TypeScript;
- mirrors the SDK manifest/exposure-gate model;
- registers current built-in providers as `core_builtin`;
- registers SQL Server as `planned_plugin` with `connect`, `schemaDiscovery`, and `readOnlyQuery` disabled so it cannot appear in public provider lists yet.

The bridge is intentionally boring: it does not execute plugins yet. Its job is to make provider availability explicit and prevent UI-only provider options.

## Release Readiness

A provider is beta-ready when:

- bounded query and schema discovery work on real data;
- unsafe operations are blocked by safe mode;
- import/export can handle large files without frontend memory spikes;
- diagnostics are understandable to non-technical users;
- Simple Mode can generate a trust score and at least one BA lens from the provider result.
