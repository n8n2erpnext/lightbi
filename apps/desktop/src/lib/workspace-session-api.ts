import { getApiBaseUrl } from './api-base';

export type WorkspaceSessionSnapshot = Record<string, unknown>;

export type WorkspaceSessionRecord = {
  id: string;
  title: string;
  sourceType: string;
  rowCount: number;
  columnCount: number;
  sourceSummary: unknown;
  snapshot: WorkspaceSessionSnapshot;
  createdAt: string;
  updatedAt: string;
};

export type SaveWorkspaceSessionRequest = {
  id?: string;
  title: string;
  sourceType: string;
  rowCount: number;
  columnCount: number;
  sourceSummary: unknown;
  snapshot: WorkspaceSessionSnapshot;
};

async function readResponse<T>(response: Response): Promise<T> {
  if (response.ok) return response.json() as Promise<T>;
  const body = await response.json().catch(() => null) as { message?: string } | null;
  throw new Error(body?.message || `Workspace session API returned ${response.status}.`);
}

export async function loadWorkspaceSessions(): Promise<WorkspaceSessionRecord[]> {
  const url = `${getApiBaseUrl()}/api/project/sessions`;
  let response = await fetch(url);
  if (response.status === 404) {
    await new Promise(resolve => setTimeout(resolve, 350));
    response = await fetch(url);
  }
  return readResponse(response);
}

export async function saveWorkspaceSession(record: SaveWorkspaceSessionRequest): Promise<WorkspaceSessionRecord> {
  return readResponse(await fetch(`${getApiBaseUrl()}/api/project/sessions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(record),
  }));
}

export async function deleteWorkspaceSession(sessionId: string): Promise<void> {
  const response = await fetch(`${getApiBaseUrl()}/api/project/sessions/${encodeURIComponent(sessionId)}`, { method: 'DELETE' });
  if (!response.ok) throw new Error(`Workspace session API returned ${response.status}.`);
}
