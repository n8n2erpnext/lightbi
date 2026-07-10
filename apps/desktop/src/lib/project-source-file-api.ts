import { getApiBaseUrl } from './api-base';

export type PersistedProjectSourceFile = {
  fileId: string;
  originalName: string;
  filePath: string;
  bytesWritten: number;
};

async function readJson<T>(response: Response): Promise<T> {
  if (response.ok) return response.json() as Promise<T>;
  const body = await response.json().catch(() => null) as { error?: string; message?: string } | null;
  throw new Error(body?.error || body?.message || `Project file API returned ${response.status}.`);
}

export async function uploadProjectSourceFile(file: File): Promise<PersistedProjectSourceFile> {
  const form = new FormData();
  form.append('file', file);
  return readJson(await fetch(`${getApiBaseUrl()}/api/project/source-files`, {
    method: 'POST',
    body: form,
  }));
}

export async function downloadProjectSourceFile(sourceFile: PersistedProjectSourceFile): Promise<File> {
  const response = await fetch(`${getApiBaseUrl()}/api/project/source-files/${encodeURIComponent(sourceFile.fileId)}/download`);
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: string; file_path?: string } | null;
    throw new Error(body?.error || `File not found at ${body?.file_path || sourceFile.filePath}.`);
  }
  const blob = await response.blob();
  return new File([blob], sourceFile.originalName, { type: blob.type || 'application/octet-stream' });
}
