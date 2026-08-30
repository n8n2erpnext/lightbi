import { describe, expect, it } from 'vitest';
import { attachPersistedPrimarySource, createWorkspaceSessionSnapshot, persistedFilesFromSession } from './home-workspace-persistence';

describe('workspace source persistence', () => {
  it('binds a persisted copy to a legacy single-file dataset', () => {
    const persistedFile = { fileId: 'file-1', originalName: 'sales.xlsx', filePath: 'project/files/file-1', bytesWritten: 128 };
    const dataset = attachPersistedPrimarySource({ file_name: 'sales.xlsx', rows_count: 10, columns: ['id'], sourceFiles: [{ name: 'sales.xlsx', rows: 10 }] }, persistedFile);
    const files = persistedFilesFromSession({ id: 's', title: 'sales', sourceType: 'local_xlsx', rowCount: 10, columnCount: 1, sourceSummary: dataset.sourceFiles, snapshot: {}, createdAt: '', updatedAt: '' });
    expect(files).toEqual([persistedFile]);
  });

  it('retains the normalized online URL but excludes transient runtime file handles', () => {
    const snapshot = createWorkspaceSessionSnapshot({
      status: 'ready', file_name: 'Online sheet', rows_count: 2, columns: ['id'], profiles: {},
      sourceType: 'google_sheets', normalizedUrl: 'https://docs.google.com/spreadsheets/d/example/edit',
      sourceFiles: [{ name: 'Online sheet', url: 'https://docs.google.com/spreadsheets/d/example/edit' }],
      runtimeFileReferences: [{ private: true }], analysisRows: [], semanticRows: [], previewRows: [],
    }) as { currentDataset: Record<string, unknown> };
    expect((snapshot as any).version).toBe(3);
    expect((snapshot as any).analysisSessionIdentity).toBeNull();
    expect(snapshot.currentDataset.normalizedUrl).toContain('docs.google.com');
    expect(snapshot.currentDataset).not.toHaveProperty('runtimeFileReferences');
  });
});
