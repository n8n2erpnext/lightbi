export const LIGHTBI_PLUGIN_API_VERSION = 'lightbi.plugin.v1' as const;

export type LightBIPluginApiVersion = typeof LIGHTBI_PLUGIN_API_VERSION;

export type LightBIPrimitive = string | number | boolean | null;

export type LightBIProviderKind =
  | 'relational'
  | 'document'
  | 'warehouse'
  | 'key_value'
  | 'file'
  | 'api'
  | 'erp';

export type LightBIParameterStyle =
  | 'question_mark'
  | 'dollar_number'
  | 'at_number'
  | 'named';

export type LightBIIdentifierQuoteStyle =
  | 'double_quote'
  | 'backtick'
  | 'bracket'
  | 'none';

export type LightBILimitStyle =
  | 'limit_offset'
  | 'top'
  | 'offset_fetch'
  | 'none';

export type LightBIConnectionField = {
  id: string;
  label: string;
  kind: 'text' | 'password' | 'number' | 'boolean' | 'select' | 'path';
  required?: boolean;
  placeholder?: string;
  defaultValue?: string | number | boolean;
  secret?: boolean;
  helpText?: string;
  validationPattern?: string;
  options?: { value: string; label: string }[];
};

export type LightBISqlDialect = {
  identifierQuote: LightBIIdentifierQuoteStyle;
  parameterStyle: LightBIParameterStyle;
  limitStyle: LightBILimitStyle;
  defaultSchema?: string;
  supportsSchemas: boolean;
  supportsTransactions: boolean;
  supportsReturning?: boolean;
  supportsExplain?: boolean;
  supportsSavepoints?: boolean;
  reservedWords?: string[];
};

export type LightBIProviderCapabilities = {
  connect: boolean;
  schemaDiscovery: boolean;
  readOnlyQuery: boolean;
  cancellableQuery?: boolean;
  streamingQuery?: boolean;
  writeback?: boolean;
  ddl?: boolean;
  importRows?: boolean;
  exportRows?: boolean;
  explain?: boolean;
  serverDashboard?: boolean;
  semanticHints?: boolean;
};

export type LightBIPluginManifest = {
  apiVersion?: LightBIPluginApiVersion;
  id: string;
  displayName: string;
  version: string;
  providerKind: LightBIProviderKind;
  description?: string;
  author?: string;
  homepage?: string;
  iconName?: string;
  defaultPort?: number;
  urlSchemes?: string[];
  connectionFields: LightBIConnectionField[];
  capabilities: LightBIProviderCapabilities;
  sqlDialect?: LightBISqlDialect;
};

export type LightBIPluginLogger = {
  debug(message: string, metadata?: Record<string, unknown>): void;
  info(message: string, metadata?: Record<string, unknown>): void;
  warn(message: string, metadata?: Record<string, unknown>): void;
  error(message: string, metadata?: Record<string, unknown>): void;
};

export type LightBISecretStore = {
  get(key: string): Promise<string | undefined>;
  set(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
};

export type LightBIPluginContext = {
  logger: LightBIPluginLogger;
  secrets?: LightBISecretStore;
  tempDirectory?: string;
  hostVersion?: string;
};

export type LightBITlsMode = 'driver-default' | 'disable' | 'require' | 'verify-full';

export type LightBISafeMode = 'off' | 'confirm_writes' | 'read_only';

export type LightBISshTunnelInput = {
  host: string;
  port?: number;
  username: string;
  privateKeySecretRef?: string;
  passwordSecretRef?: string;
};

export type LightBIConnectionInput = {
  url?: string;
  fields?: Record<string, string | number | boolean | undefined>;
  tlsMode?: LightBITlsMode;
  safeMode?: LightBISafeMode;
  sshTunnel?: LightBISshTunnelInput;
  profileId?: string;
};

export type LightBIConnectionHandle = {
  id: string;
  providerId: string;
  displayName: string;
  database?: string;
  schema?: string;
  safeMode?: LightBISafeMode;
  expiresAt?: string;
};

export type LightBIConnectionTestResult = {
  ok: boolean;
  latencyMs?: number;
  databaseVersion?: string;
  warnings?: string[];
  diagnostics?: LightBIDiagnostic[];
};

export type LightBIColumnLogicalType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'json'
  | 'binary'
  | 'unknown';

export type LightBIColumnMetadata = {
  name: string;
  nativeType: string;
  logicalType?: LightBIColumnLogicalType;
  nullable: boolean;
  primaryKey?: boolean;
  ordinal?: number;
  defaultValue?: string | null;
  comment?: string | null;
  generated?: boolean;
};

export type LightBIIndexMetadata = {
  name: string;
  columns: string[];
  unique?: boolean;
  primary?: boolean;
  definition?: string;
};

export type LightBIForeignKeyMetadata = {
  name: string;
  columns: string[];
  referencedSchema?: string;
  referencedTable: string;
  referencedColumns: string[];
  updateRule?: string;
  deleteRule?: string;
  definition?: string;
};

export type LightBITriggerMetadata = {
  name: string;
  timing?: 'before' | 'after' | 'instead_of' | 'unknown';
  events?: string[];
  enabled?: boolean;
  definition?: string;
};

export type LightBIRoutineMetadata = {
  schema: string;
  name: string;
  kind: 'function' | 'procedure' | 'aggregate' | 'other';
  returnType?: string;
  arguments?: string[];
  definition?: string;
  comment?: string | null;
};

export type LightBITableMetadata = {
  schema: string;
  name: string;
  kind: 'table' | 'view' | 'materialized_view' | 'collection' | 'other';
  estimatedRows?: number | null;
  tableSizeBytes?: number | null;
  comment?: string | null;
  ddl?: string | null;
  writable?: boolean;
  columns: LightBIColumnMetadata[];
  indexes?: LightBIIndexMetadata[];
  foreignKeys?: LightBIForeignKeyMetadata[];
  triggers?: LightBITriggerMetadata[];
};

export type LightBISchemaMetadata = {
  name: string;
  owner?: string;
  comment?: string | null;
};

export type LightBISchemaCatalog = {
  providerId: string;
  database?: string;
  schemas?: LightBISchemaMetadata[];
  tables: LightBITableMetadata[];
  routines?: LightBIRoutineMetadata[];
  generatedAt?: string;
};

export type LightBIQueryParameter = {
  name?: string;
  index?: number;
  value: LightBIPrimitive | Date;
  logicalType?: LightBIColumnLogicalType;
};

export type LightBIQueryRequest = {
  sql?: string;
  documentQuery?: unknown;
  parameters?: LightBIQueryParameter[];
  limit: number;
  offset?: number;
  maxRows?: number;
  timeoutMs?: number;
  readOnly?: boolean;
  signal?: AbortSignal;
};

export type LightBIQueryCell = LightBIPrimitive | Record<string, unknown> | unknown[];

export type LightBIQueryColumn = {
  id: string;
  name: string;
  logicalType?: LightBIColumnLogicalType;
  nativeType?: string;
};

export type LightBIQueryResponse = {
  columns: LightBIQueryColumn[];
  rows: LightBIQueryCell[][];
  page?: {
    offset: number;
    limit: number;
    hasMore: boolean;
  };
  truncated?: boolean;
  warnings?: string[];
  executionMs?: number;
};

export type LightBIQueryStreamChunk =
  | { kind: 'columns'; columns: LightBIQueryColumn[] }
  | { kind: 'rows'; rows: LightBIQueryCell[][] }
  | { kind: 'progress'; rowsRead?: number; bytesRead?: number; message?: string }
  | { kind: 'warning'; message: string }
  | { kind: 'done'; rowCount?: number; executionMs?: number };

export type LightBIExportFormat = 'csv' | 'xlsx' | 'json' | 'sql';

export type LightBIExportRequest = {
  sourceSql?: string;
  table?: { schema?: string; name: string };
  parameters?: LightBIQueryParameter[];
  format: LightBIExportFormat;
  selectedColumns?: string[];
  limit?: number;
  options?: {
    includeHeader?: boolean;
    delimiter?: string;
    sheetName?: string;
    batchSize?: number;
  };
  signal?: AbortSignal;
};

export type LightBIExportChunk =
  | { kind: 'metadata'; mimeType: string; suggestedFilename: string }
  | { kind: 'bytes'; data: Uint8Array }
  | { kind: 'progress'; rowsWritten?: number; bytesWritten?: number; message?: string }
  | { kind: 'done'; rowsWritten?: number };

export type LightBIImportFormat = 'csv' | 'xlsx' | 'json' | 'sql';

export type LightBIImportErrorMode = 'stop_rollback' | 'stop_commit' | 'skip_continue';

export type LightBIImportSource = {
  format: LightBIImportFormat;
  filename?: string;
  bytes?: Uint8Array;
  stream?: AsyncIterable<Uint8Array>;
  options?: {
    delimiter?: string;
    sheetName?: string;
    headerRow?: number;
    encoding?: string;
  };
};

export type LightBIImportMapping = {
  sourceColumn: string;
  targetColumn: string;
  transform?: 'none' | 'trim' | 'to_number' | 'to_date' | 'to_boolean';
};

export type LightBIImportPreviewRequest = {
  source: LightBIImportSource;
  targetTable?: { schema?: string; name: string };
  createTableName?: string;
  sampleRows?: number;
};

export type LightBIImportPreview = {
  columns: LightBIQueryColumn[];
  rows: LightBIQueryCell[][];
  suggestedMappings?: LightBIImportMapping[];
  createTableSql?: string;
  warnings?: string[];
};

export type LightBIImportRequest = {
  source: LightBIImportSource;
  targetTable: { schema?: string; name: string };
  mappings: LightBIImportMapping[];
  errorMode: LightBIImportErrorMode;
  batchSize?: number;
  signal?: AbortSignal;
};

export type LightBIImportProgress =
  | { kind: 'progress'; rowsRead?: number; rowsWritten?: number; rejectedRows?: number; message?: string }
  | { kind: 'rejected_row'; rowNumber: number; reason: string; values?: Record<string, unknown> }
  | { kind: 'done'; rowsRead: number; rowsWritten: number; rejectedRows: number };

export type LightBIChangeOperation = 'insert' | 'update' | 'delete' | 'bulk_paste';

export type LightBIChangeSet = {
  table: { schema?: string; name: string };
  operation: LightBIChangeOperation;
  rows?: Record<string, LightBIQueryCell>[];
  keys?: Record<string, LightBIQueryCell>[];
  values?: Record<string, LightBIQueryCell>;
};

export type LightBITransactionPolicy = 'auto_commit' | 'single_transaction' | 'manual_review';

export type LightBIWritePlan = {
  statements: string[];
  parameters?: LightBIQueryParameter[][];
  canCommit: boolean;
  transactionPolicy?: LightBITransactionPolicy;
  warnings?: string[];
};

export type LightBICommitResult = {
  affectedRows?: number;
  committed: boolean;
  transactionId?: string;
  warnings?: string[];
};

export type LightBIDdlRequest = {
  statements: string[];
  transactionPolicy?: LightBITransactionPolicy;
};

export type LightBIExplainResponse = {
  text?: string;
  json?: unknown;
  warnings?: string[];
};

export type LightBIDiagnosticSeverity = 'info' | 'warning' | 'error' | 'fatal';

export type LightBIDiagnostic = {
  code: string;
  severity: LightBIDiagnosticSeverity;
  message: string;
  providerMessage?: string;
  retryable?: boolean;
  hint?: string;
  metadata?: Record<string, unknown>;
};

export type LightBIProviderError = Error & {
  diagnostic?: LightBIDiagnostic;
};

export type LightBIProviderExposureGate = {
  canExpose: boolean;
  missingCapabilities: string[];
  warnings: string[];
};

export interface LightBIProviderPlugin {
  manifest: LightBIPluginManifest;
  initialize?(context: LightBIPluginContext): Promise<void> | void;
  dispose?(): Promise<void> | void;
  testConnection?(input: LightBIConnectionInput): Promise<LightBIConnectionTestResult>;
  connect(input: LightBIConnectionInput): Promise<LightBIConnectionHandle>;
  disconnect(connection: LightBIConnectionHandle): Promise<void>;
  discoverSchema(connection: LightBIConnectionHandle): Promise<LightBISchemaCatalog>;
  query(connection: LightBIConnectionHandle, request: LightBIQueryRequest): Promise<LightBIQueryResponse>;
  streamQuery?(
    connection: LightBIConnectionHandle,
    request: LightBIQueryRequest,
  ): AsyncIterable<LightBIQueryStreamChunk>;
  explain?(connection: LightBIConnectionHandle, request: LightBIQueryRequest): Promise<LightBIExplainResponse>;
  cancel?(connection: LightBIConnectionHandle, operationId: string): Promise<void>;
  exportRows?(
    connection: LightBIConnectionHandle,
    request: LightBIExportRequest,
  ): AsyncIterable<LightBIExportChunk>;
  previewImport?(
    connection: LightBIConnectionHandle,
    request: LightBIImportPreviewRequest,
  ): Promise<LightBIImportPreview>;
  importRows?(
    connection: LightBIConnectionHandle,
    request: LightBIImportRequest,
  ): AsyncIterable<LightBIImportProgress>;
  previewWrite?(connection: LightBIConnectionHandle, changeSet: LightBIChangeSet): Promise<LightBIWritePlan>;
  commitWrite?(connection: LightBIConnectionHandle, plan: LightBIWritePlan): Promise<LightBICommitResult>;
  previewDdl?(connection: LightBIConnectionHandle, request: LightBIDdlRequest): Promise<LightBIWritePlan>;
  commitDdl?(connection: LightBIConnectionHandle, plan: LightBIWritePlan): Promise<LightBICommitResult>;
  normalizeError?(error: unknown): LightBIDiagnostic;
}

export function defineLightBIProviderPlugin(plugin: LightBIProviderPlugin): LightBIProviderPlugin {
  return plugin;
}

export function evaluateProviderExposureGate(plugin: LightBIProviderPlugin): LightBIProviderExposureGate {
  const missingCapabilities: string[] = [];
  const warnings: string[] = [];
  const { manifest } = plugin;

  if (manifest.apiVersion && manifest.apiVersion !== LIGHTBI_PLUGIN_API_VERSION) {
    warnings.push(`Unsupported apiVersion: ${manifest.apiVersion}`);
  }

  if (!manifest.id.trim()) {
    missingCapabilities.push('manifest.id');
  }

  if (!manifest.displayName.trim()) {
    missingCapabilities.push('manifest.displayName');
  }

  if (!manifest.capabilities.connect || typeof plugin.connect !== 'function') {
    missingCapabilities.push('connect');
  }

  if (!manifest.capabilities.schemaDiscovery || typeof plugin.discoverSchema !== 'function') {
    missingCapabilities.push('schemaDiscovery');
  }

  if (!manifest.capabilities.readOnlyQuery || typeof plugin.query !== 'function') {
    missingCapabilities.push('readOnlyQuery');
  }

  if (!plugin.normalizeError) {
    warnings.push('normalizeError is recommended before public UI exposure');
  }

  if (manifest.providerKind === 'relational' && !manifest.sqlDialect) {
    warnings.push('Relational providers should declare sqlDialect');
  }

  return {
    canExpose: missingCapabilities.length === 0,
    missingCapabilities,
    warnings,
  };
}

export type LightBIPluginRegistryEntry = {
  plugin: LightBIProviderPlugin;
  exposureGate: LightBIProviderExposureGate;
  registeredAt: string;
};

export class LightBIPluginRegistry {
  private readonly plugins = new Map<string, LightBIPluginRegistryEntry>();
  private initialized = false;

  register(plugin: LightBIProviderPlugin): LightBIPluginRegistryEntry {
    const providerId = plugin.manifest.id.trim();

    if (!providerId) {
      throw new Error('LightBI plugin manifest.id is required');
    }

    if (this.plugins.has(providerId)) {
      throw new Error(`LightBI plugin provider already registered: ${providerId}`);
    }

    const entry: LightBIPluginRegistryEntry = {
      plugin,
      exposureGate: evaluateProviderExposureGate(plugin),
      registeredAt: new Date().toISOString(),
    };

    this.plugins.set(providerId, entry);
    return entry;
  }

  unregister(providerId: string): boolean {
    return this.plugins.delete(providerId);
  }

  get(providerId: string): LightBIProviderPlugin | undefined {
    return this.plugins.get(providerId)?.plugin;
  }

  getEntry(providerId: string): LightBIPluginRegistryEntry | undefined {
    return this.plugins.get(providerId);
  }

  list(): LightBIPluginRegistryEntry[] {
    return Array.from(this.plugins.values());
  }

  listManifests(): LightBIPluginManifest[] {
    return this.list().map((entry) => entry.plugin.manifest);
  }

  listExposable(): LightBIPluginRegistryEntry[] {
    return this.list().filter((entry) => entry.exposureGate.canExpose);
  }

  async initialize(context: LightBIPluginContext): Promise<void> {
    if (this.initialized) {
      return;
    }

    for (const entry of this.plugins.values()) {
      await entry.plugin.initialize?.(context);
    }

    this.initialized = true;
  }

  async dispose(): Promise<void> {
    const entries = Array.from(this.plugins.values()).reverse();

    for (const entry of entries) {
      await entry.plugin.dispose?.();
    }

    this.initialized = false;
  }
}
