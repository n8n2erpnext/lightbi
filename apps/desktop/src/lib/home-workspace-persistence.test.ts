import { describe, expect, it } from 'vitest';
import { createDurableInvestigationWorkspaceHandoff } from './home-workspace-persistence';

describe('durable Investigation workspace handoff', () => {
  it('uses the already-saved durable source metadata instead of rebuilding from stale runtime state', () => {
    const persistedFile = { fileId: 'file-1', originalName: 'sales.xlsx', filePath: 'files/file-1-sales.xlsx', bytesWritten: 1234 };
    const session = {
      id: 'session-1', title: 'sales.xlsx', sourceType: 'local_xlsx', rowCount: 1500, columnCount: 13,
      sourceSummary: [{ name: 'sales.xlsx', rows: 1500, persistedFile }],
      snapshot: { currentDataset: { sourceFiles: [{ name: 'sales.xlsx', rows: 1500, persistedFile }] } },
      createdAt: '', updatedAt: '',
    };
    const runtimeDataset = {
      status: 'ready', file_name: 'sales.xlsx', sourceType: 'local_xlsx',
      sourceFiles: [{ name: 'sales.xlsx', rows: 1500 }], runtimeFileReferences: [{ name: 'sales.xlsx' }],
    };

    const handoff = createDurableInvestigationWorkspaceHandoff(session, runtimeDataset);
    expect(handoff.dataset).toMatchObject({ restoredFromSessionId: 'session-1', sourceFiles: [expect.objectContaining({ persistedFile })] });
    expect(handoff.dataset.runtimeFileReferences).toEqual(runtimeDataset.runtimeFileReferences);
    expect(handoff.payload).toMatchObject({ id: 'session-1', sourceSummary: [expect.objectContaining({ persistedFile })] });
    expect((handoff.payload.snapshot as any).currentDataset.sourceFiles[0].persistedFile).toEqual(persistedFile);
  });
});
