import {
  LIGHTBI_PLUGIN_API_VERSION,
  defineLightBIProviderPlugin,
  type LightBIConnectionInput,
  type LightBIConnectionHandle,
  type LightBIDiagnostic,
  type LightBIQueryRequest,
} from '../src';

const providerId = 'sqlserver';

function notImplemented(operation: string): never {
  throw new Error(`SQL Server provider example does not implement ${operation}`);
}

export default defineLightBIProviderPlugin({
  manifest: {
    apiVersion: LIGHTBI_PLUGIN_API_VERSION,
    id: providerId,
    displayName: 'SQL Server',
    version: '0.1.0',
    providerKind: 'relational',
    description: 'Example provider manifest for the first LightBI enterprise database plugin.',
    defaultPort: 1433,
    urlSchemes: ['sqlserver', 'mssql'],
    connectionFields: [
      { id: 'host', label: 'Host', kind: 'text', required: true },
      { id: 'port', label: 'Port', kind: 'number', defaultValue: 1433 },
      { id: 'database', label: 'Database', kind: 'text', required: true },
      { id: 'username', label: 'Username', kind: 'text' },
      { id: 'password', label: 'Password', kind: 'password', secret: true },
      {
        id: 'encrypt',
        label: 'Encrypt connection',
        kind: 'boolean',
        defaultValue: true,
        helpText: 'Map this to the SQL Server driver TLS/encryption option.',
      },
      {
        id: 'trustServerCertificate',
        label: 'Trust server certificate',
        kind: 'boolean',
        defaultValue: false,
      },
    ],
    capabilities: {
      connect: true,
      schemaDiscovery: true,
      readOnlyQuery: true,
      cancellableQuery: true,
      exportRows: true,
      writeback: true,
      ddl: true,
      explain: true,
    },
    sqlDialect: {
      identifierQuote: 'bracket',
      parameterStyle: 'at_number',
      limitStyle: 'offset_fetch',
      defaultSchema: 'dbo',
      supportsSchemas: true,
      supportsTransactions: true,
      supportsExplain: true,
      supportsSavepoints: true,
    },
  },
  async testConnection(_input: LightBIConnectionInput) {
    return {
      ok: false,
      diagnostics: [
        {
          code: 'SQLSERVER_EXAMPLE_ONLY',
          severity: 'warning',
          message: 'This example manifest is not wired to a SQL Server driver yet.',
        },
      ],
    };
  },
  async connect(_input: LightBIConnectionInput): Promise<LightBIConnectionHandle> {
    return notImplemented('connect');
  },
  async disconnect(_connection: LightBIConnectionHandle): Promise<void> {
    return undefined;
  },
  async discoverSchema(_connection: LightBIConnectionHandle) {
    return {
      providerId,
      schemas: [],
      tables: [],
      routines: [],
    };
  },
  async query(_connection: LightBIConnectionHandle, _request: LightBIQueryRequest) {
    return notImplemented('query');
  },
  normalizeError(error: unknown): LightBIDiagnostic {
    const message = error instanceof Error ? error.message : 'Unknown SQL Server provider error';

    return {
      code: 'SQLSERVER_PROVIDER_ERROR',
      severity: 'error',
      message,
      retryable: false,
    };
  },
});
