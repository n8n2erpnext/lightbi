# @lightbi/plugin-sdk

TypeScript contract for LightBI provider plugins.

This package is intentionally interface-only in the current phase. It defines the stable boundary that future providers such as SQL Server, Oracle, Snowflake, BigQuery, DynamoDB, Redis, ERP connectors, and premium import/export adapters must implement before LightBI exposes them in Simple or Advanced mode.

## Product Boundary

LightBI core owns:

- Business Understanding, data trust, BA briefs, chart suggestions, and dashboard handoff;
- shared result buffers and safety policies;
- common file, online sheet, and baseline database workflows.

Plugins own provider-specific behavior:

- provider identity and connection fields;
- SQL or document dialect;
- connection validation;
- schema metadata;
- bounded read-only query execution;
- optional streaming import/export, DDL, writeback, explain, and diagnostics.

## Minimum Provider Contract

A provider cannot appear in user-facing flows until it can:

1. connect and disconnect;
2. discover schema;
3. run a bounded read-only query;
4. return typed columns and rows through `LightBIQueryResponse`;
5. normalize provider errors into `LightBIDiagnostic`.

## Example

```ts
import {
  LIGHTBI_PLUGIN_API_VERSION,
  LightBIPluginRegistry,
  defineLightBIProviderPlugin,
} from '@lightbi/plugin-sdk';

export default defineLightBIProviderPlugin({
  manifest: {
    apiVersion: LIGHTBI_PLUGIN_API_VERSION,
    id: 'sqlserver',
    displayName: 'SQL Server',
    version: '0.1.0',
    providerKind: 'relational',
    defaultPort: 1433,
    urlSchemes: ['sqlserver', 'mssql'],
    connectionFields: [
      { id: 'host', label: 'Host', kind: 'text', required: true },
      { id: 'database', label: 'Database', kind: 'text', required: true },
      { id: 'username', label: 'Username', kind: 'text' },
      { id: 'password', label: 'Password', kind: 'password', secret: true },
    ],
    capabilities: {
      connect: true,
      schemaDiscovery: true,
      readOnlyQuery: true,
      cancellableQuery: true,
      exportRows: true,
    },
    sqlDialect: {
      identifierQuote: 'bracket',
      parameterStyle: 'at_number',
      limitStyle: 'offset_fetch',
      defaultSchema: 'dbo',
      supportsSchemas: true,
      supportsTransactions: true,
    },
  },
  async connect() {
    throw new Error('Implement provider connection');
  },
  async disconnect() {},
  async discoverSchema() {
    return { providerId: 'sqlserver', tables: [] };
  },
  async query() {
    return { columns: [], rows: [] };
  },
});
```

## Built-In Registry

The SDK includes a small registry helper for first-party or built-in plugins:

```ts
const registry = new LightBIPluginRegistry();
const entry = registry.register(sqlServerPlugin);

if (entry.exposureGate.canExpose) {
  // The host may include this provider in Advanced/Simple source lists.
}
```

The registry is not a marketplace loader. It only validates and organizes plugin objects that the LightBI host already trusts.

## Manual

See `docs/plugin-sdk/provider-plugin-manual.md` for the implementation and deployment checklist.
