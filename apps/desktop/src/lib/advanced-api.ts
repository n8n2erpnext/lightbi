import type { QueryResultBuffer } from '@lightbi/core-types';
import { getApiBaseUrl } from './api-base';

export type AdvancedConnection = {
  connectionId: string;
  name: string;
  database: string;
  provider: 'postgresql' | 'mysql' | 'mariadb' | 'sqlite' | 'mongodb';
};

export type AdvancedColumnNode = {
  name: string;
  nativeType: string;
  nullable: boolean;
  primaryKey?: boolean;
};

export type AdvancedTableNode = {
  name: string;
  kind: string;
  estimatedRows?: number | null;
  writable?: boolean;
  columns: AdvancedColumnNode[];
};

export type AdvancedSchemaNode = {
  name: string;
  tables: AdvancedTableNode[];
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
export type AdvancedFilterOperator = 'contains' | 'equals' | 'starts_with' | 'ends_with';
export type AdvancedFilter = { column: string; operator: AdvancedFilterOperator; value: string };
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
export type AdvancedMutationRow = { key: Record<string, unknown>; changes: Record<string, unknown>; expected: Record<string, unknown> };
export type AdvancedMutationRequest = { schema: string; table: string; rows: AdvancedMutationRow[] };
export type AdvancedMutationPreview = { statements: string[]; rowCount: number; canCommit: boolean };
export type AdvancedMutationCommit = { updatedRows: number };
export type AdvancedConnectionProfile = {
  id: string; name: string; provider: AdvancedConnection['provider']; database: string; tlsMode: string;
  sshHost?: string; sshPort?: number; sshUser?: string; createdAt: string; updatedAt: string;
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
  signal?: AbortSignal
): Promise<AdvancedConnection> {
  const response = await fetch(`${getApiBaseUrl()}/api/advanced/connections`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name, connectionUrl, provider, databaseName }),
    signal
  });
  return readResponse(response);
}

export async function createAdvancedConnectionFromProfile(name: string, profile: AdvancedConnectionProfile, signal?: AbortSignal): Promise<AdvancedConnection> {
  return readResponse(await fetch(`${getApiBaseUrl()}/api/advanced/connections`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name, profileId: profile.id, provider: profile.provider, databaseName: profile.database || undefined }), signal,
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
  request: { runId: string; sql: string; limit: number; offset?: number; sort?: AdvancedSort; filters?: AdvancedFilter[] },
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
  sshHost?: string; sshPort?: number; sshUser?: string;
}): Promise<AdvancedConnectionProfile> {
  return readResponse(await fetch(`${getApiBaseUrl()}/api/advanced/profiles`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(record),
  }));
}

export async function deleteAdvancedProfile(profileId: string): Promise<void> {
  const response = await fetch(`${getApiBaseUrl()}/api/advanced/profiles/${encodeURIComponent(profileId)}`, { method: 'DELETE' });
  if (!response.ok) throw new Error(`Advanced API returned ${response.status}.`);
}
