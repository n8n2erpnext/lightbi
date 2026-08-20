import type { QueryResultBuffer } from '@lightbi/core-types';
import { getApiBaseUrl } from './api-base';

export type AdvancedConnection = {
  connectionId: string;
  name: string;
  database: string;
  provider: AdvancedProviderId;
};

export type AdvancedProviderId = 'postgresql' | 'mysql' | 'mariadb' | 'sqlite' | 'mongodb' | 'sqlserver';

export type AdvancedProviderCapabilityMap = {
  connect: boolean;
  schemaDiscovery: boolean;
  readOnlyQuery: boolean;
  cancellableQuery: boolean;
  streamingQuery: boolean;
  writeback: boolean;
  ddl: boolean;
  importRows: boolean;
  exportRows: boolean;
  explain: boolean;
  serverDashboard: boolean;
  semanticHints: boolean;
};

export type AdvancedProviderConnectionField = {
  id: string;
  label: string;
  kind: 'text' | 'password' | 'number' | 'boolean' | 'select' | 'path';
  required: boolean;
  defaultValue?: unknown;
  placeholder?: string;
  secret?: boolean;
  helpText?: string;
};

export type AdvancedProviderPlugin = {
  manifest: {
    apiVersion: string;
    id: AdvancedProviderId;
    displayName: string;
    version: string;
    providerKind: string;
    description: string;
    iconName?: string | null;
    defaultPort?: number | null;
    urlSchemes: string[];
    connectionFields: AdvancedProviderConnectionField[];
    capabilities: AdvancedProviderCapabilityMap;
    sqlDialect?: unknown;
  };
  exposureGate: {
    canExpose: boolean;
    missingCapabilities: string[];
    warnings: string[];
  };
  source: string;
};

export type AdvancedColumnNode = {
  name: string;
  nativeType: string;
  nullable: boolean;
  primaryKey?: boolean;
  defaultValue?: string | null;
  comment?: string | null;
};

export type AdvancedIndexNode = {
  name: string;
  columns: string[];
  unique?: boolean;
  definition?: string;
};

export type AdvancedForeignKeyNode = {
  name: string;
  columns: string[];
  referencedTable: string;
  referencedColumns: string[];
  definition?: string;
};

export type AdvancedRoutineNode = {
  name: string;
  kind: string;
  definition?: string;
};

export type AdvancedTableNode = {
  name: string;
  kind: string;
  estimatedRows?: number | null;
  tableSizeBytes?: number | null;
  comment?: string | null;
  ddl?: string | null;
  writable?: boolean;
  columns: AdvancedColumnNode[];
  indexes?: AdvancedIndexNode[];
  foreignKeys?: AdvancedForeignKeyNode[];
};

export type AdvancedSchemaNode = {
  name: string;
  tables: AdvancedTableNode[];
  routines?: AdvancedRoutineNode[];
};

export type AdvancedSchema = {
  connectionId: string;
  connectionName: string;
  database: string;
  schemas: AdvancedSchemaNode[];
  cached?: boolean;
  cacheAgeMs?: number;
};

export type AdvancedSort = { column: string; direction: 'asc' | 'desc' };
export type AdvancedFilterOperator =
  | 'contains' | 'not_contains'
  | 'equals' | 'not_equals'
  | 'starts_with' | 'ends_with'
  | 'greater_than' | 'greater_or_equal'
  | 'less_than' | 'less_or_equal'
  | 'is_blank' | 'is_not_blank'
  | 'in' | 'not_in';
export type AdvancedFilter = { column: string; operator: AdvancedFilterOperator; value?: string };
export type AdvancedFilterNode = AdvancedFilter | AdvancedFilterGroup;
export type AdvancedFilterGroup = { combinator: 'and' | 'or'; children: AdvancedFilterNode[] };
export type AdvancedTableCount = { schema: string; table: string; exactRows: number; cached: boolean };

export type AdvancedQueryResult = QueryResultBuffer & { warnings: string[]; executionMs: number };
export type AdvancedHistoryRecord = {
  id: string; connectionName: string; database: string; provider: string; sql: string;
  status: string; rowCount: number; executionMs: number; createdAt: string;
};
export type AdvancedFavorite = {
  id: string; name: string; sql: string; provider: string; database: string; createdAt: string; updatedAt: string;
};
export type AdvancedExplainResult = { plan: unknown; executionMs: number };
export type AdvancedMutationAction = 'update' | 'insert' | 'delete';
export type AdvancedMutationRow = { action?: AdvancedMutationAction; key: Record<string, unknown>; changes: Record<string, unknown>; expected: Record<string, unknown> };
export type AdvancedMutationRequest = { schema: string; table: string; rows: AdvancedMutationRow[] };
export type AdvancedMutationPreview = { statements: string[]; rowCount: number; canCommit: boolean };
export type AdvancedMutationCommit = { updatedRows: number };
export type AdvancedScriptPreview = { statements: string[]; statementCount: number; canCommit: boolean };
export type AdvancedScriptCommit = { executedStatements: number };
export type AdvancedExportJob = {
  jobId: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  format: string;
  rows: number;
  fileName: string;
  error?: string | null;
};
export type AdvancedImportJob = {
  jobId: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  statementCount: number;
  executedStatements: number;
  skippedStatements: number;
  error?: string | null;
};
export type AdvancedConnectionProfile = {
  id: string; name: string; provider: AdvancedConnection['provider']; database: string; tlsMode: string;
  sshHost?: string; sshPort?: number; sshUser?: string; groupName?: string | null; tagName?: string | null; safeMode: 'off' | 'confirm_writes' | 'read_only'; createdAt: string; updatedAt: string;
};

async function readResponse<T>(response: Response): Promise<T> {
  if (response.ok) return response.json() as Promise<T>;
  const body = await response.json().catch(() => null) as { message?: string } | null;
  throw new Error(body?.message || `Advanced API returned ${response.status}.`);
}

export async function createAdvancedConnection(
  name: string,
  connectionUrl: string,
  provider?: AdvancedConnection['provider'],
  databaseName?: string,
  options?: { tlsMode?: string; sshHost?: string; sshPort?: number; sshUser?: string; safeMode?: AdvancedConnectionProfile['safeMode'] },
  signal?: AbortSignal
): Promise<AdvancedConnection> {
  const response = await fetch(`${getApiBaseUrl()}/api/advanced/connections`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name, connectionUrl, provider, databaseName, ...options }),
    signal
  });
  return readResponse(response);
}

export async function loadAdvancedProviderPlugins(signal?: AbortSignal): Promise<AdvancedProviderPlugin[]> {
  const response = await fetch(`${getApiBaseUrl()}/api/plugins/providers`, { signal });
  const providers = await readResponse<Array<Omit<AdvancedProviderPlugin, 'manifest'> & { manifest: Omit<AdvancedProviderPlugin['manifest'], 'id'> & { id: string } }>>(response);
  return providers.filter((provider): provider is AdvancedProviderPlugin => (
    provider.exposureGate.canExpose
    && ['postgresql', 'mysql', 'mariadb', 'sqlite', 'mongodb', 'sqlserver'].includes(provider.manifest.id)
  ));
}

export async function createAdvancedConnectionFromProfile(name: string, profile: AdvancedConnectionProfile, signal?: AbortSignal): Promise<AdvancedConnection> {
  return readResponse(await fetch(`${getApiBaseUrl()}/api/advanced/connections`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      name,
      profileId: profile.id,
      provider: profile.provider,
      databaseName: profile.database || undefined,
      tlsMode: profile.tlsMode,
      sshHost: profile.sshHost,
      sshPort: profile.sshPort,
      sshUser: profile.sshUser,
      safeMode: profile.safeMode,
    }), signal,
  }));
}

export async function executeAdvancedDocumentQuery(
  connectionId: string,
  request: { runId: string; collection: string; filter?: Record<string, unknown>; projection?: Record<string, unknown>; sort?: Record<string, unknown>; limit: number; offset?: number },
  signal?: AbortSignal
): Promise<AdvancedQueryResult> {
  return readResponse(await fetch(`${getApiBaseUrl()}/api/advanced/connections/${connectionId}/document-query`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(request), signal,
  }));
}

export async function loadAdvancedSchema(connectionId: string, signal?: AbortSignal, refresh = false): Promise<AdvancedSchema> {
  const response = await fetch(`${getApiBaseUrl()}/api/advanced/connections/${connectionId}/schema?refresh=${refresh}`, { signal });
  return readResponse(response);
}

export async function loadAdvancedTableCount(
  connectionId: string,
  schema: string,
  table: string,
  signal?: AbortSignal
): Promise<AdvancedTableCount> {
  const search = new URLSearchParams({ schema, table });
  const response = await fetch(`${getApiBaseUrl()}/api/advanced/connections/${connectionId}/schema/count?${search}`, { signal });
  return readResponse(response);
}

export async function executeAdvancedQuery(
  connectionId: string,
  request: { runId: string; sql: string; limit: number; offset?: number; sort?: AdvancedSort; filters?: AdvancedFilter[]; filterTree?: AdvancedFilterGroup },
  signal?: AbortSignal
): Promise<AdvancedQueryResult> {
  const response = await fetch(`${getApiBaseUrl()}/api/advanced/connections/${connectionId}/query`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(request),
    signal
  });
  return readResponse(response);
}

export async function explainAdvancedQuery(connectionId: string, sql: string, signal?: AbortSignal): Promise<AdvancedExplainResult> {
  return readResponse(await fetch(`${getApiBaseUrl()}/api/advanced/connections/${connectionId}/explain`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sql }), signal,
  }));
}

export async function previewAdvancedMutation(connectionId: string, request: AdvancedMutationRequest): Promise<AdvancedMutationPreview> {
  return readResponse(await fetch(`${getApiBaseUrl()}/api/advanced/connections/${connectionId}/mutations/preview`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(request),
  }));
}

export async function commitAdvancedMutation(connectionId: string, request: AdvancedMutationRequest): Promise<AdvancedMutationCommit> {
  return readResponse(await fetch(`${getApiBaseUrl()}/api/advanced/connections/${connectionId}/mutations/commit`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(request),
  }));
}

export async function previewAdvancedScript(connectionId: string, sql: string): Promise<AdvancedScriptPreview> {
  return readResponse(await fetch(`${getApiBaseUrl()}/api/advanced/connections/${connectionId}/scripts/preview`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sql }),
  }));
}

export async function commitAdvancedScript(connectionId: string, sql: string): Promise<AdvancedScriptCommit> {
  return readResponse(await fetch(`${getApiBaseUrl()}/api/advanced/connections/${connectionId}/scripts/commit`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sql }),
  }));
}

export async function startAdvancedExport(
  connectionId: string,
  request: { sql: string; format: 'csv' | 'json' | 'sql' | 'xlsx'; fileName?: string; tableName?: string; sort?: AdvancedSort; filters?: AdvancedFilter[]; filterTree?: AdvancedFilterGroup }
): Promise<{ jobId: string }> {
  return readResponse(await fetch(`${getApiBaseUrl()}/api/advanced/connections/${connectionId}/exports`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(request),
  }));
}

export async function loadAdvancedExportJob(jobId: string): Promise<AdvancedExportJob> {
  return readResponse(await fetch(`${getApiBaseUrl()}/api/advanced/exports/${encodeURIComponent(jobId)}`));
}

export async function downloadAdvancedExportJob(jobId: string): Promise<Blob> {
  const response = await fetch(`${getApiBaseUrl()}/api/advanced/exports/${encodeURIComponent(jobId)}/download`);
  if (response.ok) return response.blob();
  const body = await response.json().catch(() => null) as { message?: string } | null;
  throw new Error(body?.message || `Advanced export download returned ${response.status}.`);
}

export async function cancelAdvancedExportJob(jobId: string): Promise<void> {
  await fetch(`${getApiBaseUrl()}/api/advanced/exports/${encodeURIComponent(jobId)}`, { method: 'DELETE' });
}

export async function startAdvancedSqlImport(connectionId: string, sql: string): Promise<{ jobId: string }> {
  return readResponse(await fetch(`${getApiBaseUrl()}/api/advanced/connections/${connectionId}/imports/sql`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sql }),
  }));
}

export async function startAdvancedCsvImport(
  connectionId: string,
  request: { file: File; schema: string; table: string; mapping?: Record<string, string>; errorMode?: 'stop_rollback' | 'stop_commit' | 'skip_continue' }
): Promise<{ jobId: string }> {
  const form = new FormData();
  form.append('file', request.file);
  form.append('schema', request.schema);
  form.append('table', request.table);
  form.append('mapping', JSON.stringify(request.mapping ?? {}));
  form.append('errorMode', request.errorMode ?? 'stop_rollback');
  return readResponse(await fetch(`${getApiBaseUrl()}/api/advanced/connections/${connectionId}/imports/csv`, {
    method: 'POST', body: form,
  }));
}

export async function loadAdvancedImportJob(jobId: string): Promise<AdvancedImportJob> {
  return readResponse(await fetch(`${getApiBaseUrl()}/api/advanced/imports/${encodeURIComponent(jobId)}`));
}

export async function cancelAdvancedImportJob(jobId: string): Promise<void> {
  await fetch(`${getApiBaseUrl()}/api/advanced/imports/${encodeURIComponent(jobId)}`, { method: 'DELETE' });
}

export async function cancelAdvancedRun(runId: string): Promise<void> {
  await fetch(`${getApiBaseUrl()}/api/advanced/runs/${encodeURIComponent(runId)}`, { method: 'DELETE' });
}

export async function closeAdvancedConnection(connectionId: string, keepalive = false): Promise<void> {
  await fetch(`${getApiBaseUrl()}/api/advanced/connections/${connectionId}`, { method: 'DELETE', keepalive });
}

export async function loadAdvancedHistory(): Promise<AdvancedHistoryRecord[]> {
  return readResponse(await fetch(`${getApiBaseUrl()}/api/advanced/history`));
}

export async function saveAdvancedHistory(record: Omit<AdvancedHistoryRecord, 'id' | 'createdAt'>): Promise<AdvancedHistoryRecord> {
  return readResponse(await fetch(`${getApiBaseUrl()}/api/advanced/history`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(record),
  }));
}

export async function clearAdvancedHistory(): Promise<void> {
  const response = await fetch(`${getApiBaseUrl()}/api/advanced/history`, { method: 'DELETE' });
  if (!response.ok) throw new Error(`Advanced API returned ${response.status}.`);
}

export async function loadAdvancedFavorites(): Promise<AdvancedFavorite[]> {
  return readResponse(await fetch(`${getApiBaseUrl()}/api/advanced/favorites`));
}

export async function saveAdvancedFavorite(record: Omit<AdvancedFavorite, 'id' | 'createdAt' | 'updatedAt'>): Promise<AdvancedFavorite> {
  return readResponse(await fetch(`${getApiBaseUrl()}/api/advanced/favorites`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(record),
  }));
}

export async function deleteAdvancedFavorite(favoriteId: string): Promise<void> {
  const response = await fetch(`${getApiBaseUrl()}/api/advanced/favorites/${encodeURIComponent(favoriteId)}`, { method: 'DELETE' });
  if (!response.ok) throw new Error(`Advanced API returned ${response.status}.`);
}

export async function loadAdvancedProfiles(): Promise<AdvancedConnectionProfile[]> {
  return readResponse(await fetch(`${getApiBaseUrl()}/api/advanced/profiles`));
}

export async function saveAdvancedProfile(record: {
  name: string; provider: AdvancedConnection['provider']; database?: string; connectionUrl: string; tlsMode: string;
  sshHost?: string; sshPort?: number; sshUser?: string; groupName?: string; tagName?: string; safeMode?: AdvancedConnectionProfile['safeMode'];
}): Promise<AdvancedConnectionProfile> {
  return readResponse(await fetch(`${getApiBaseUrl()}/api/advanced/profiles`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(record),
  }));
}

export async function deleteAdvancedProfile(profileId: string): Promise<void> {
  const response = await fetch(`${getApiBaseUrl()}/api/advanced/profiles/${encodeURIComponent(profileId)}`, { method: 'DELETE' });
  if (!response.ok) throw new Error(`Advanced API returned ${response.status}.`);
}
