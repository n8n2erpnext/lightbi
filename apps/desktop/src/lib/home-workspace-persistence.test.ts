import { describe, expect, it } from 'vitest';
import { createDurableInvestigationWorkspaceHandoff, createWorkspaceSessionSnapshot } from './home-workspace-persistence';

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


describe('multi-file workspace snapshot', () => {
  it('persists bounded perspective/Focus recovery metadata without copying raw evidence rows', () => {
    const snapshot = createWorkspaceSessionSnapshot({
      status: 'ready', file_name: 'Revenue analysis', sourceType: 'canonical_perspective_collection', rows_count: 4, columns: ['reporting_period', 'sales_revenue'],
      analysisRows: [{ reporting_period: '2026-05', sales_revenue: 300 }], semanticRows: [], previewRows: [],
      sourceFiles: [{ name: 'sales-may.csv', rows: 2 }, { name: 'sales-june.csv', rows: 2 }],
      canonicalPerspectiveId: 'executive_overview',
      canonicalPerspectiveBrief: { schemaVersion: 'brief.v1', headline: 'Revenue changed.' },
      canonicalPerspectiveFocusBrief: { schemaVersion: 'brief.v1', headline: 'Widget A changed.' },
      canonicalPerspectiveFocusSubject: { canonicalId: 'product', value: 'Widget A', displayLabel: 'Widget A' },
      canonicalPerspectiveEvidenceSources: [{
        period: '2026-05', role: 'sales', sourceId: 'source-may', sourceName: 'sales-may.csv', sourceRowCount: 2,
        rows: [{ Product: 'Widget A', Revenue: 100 }],
        semanticFields: [{ canonicalId: 'product', physicalColumn: 'Product' }],
        focusBinding: { state: 'matched_exact', field: 'Product' },
      }],
    });
    const restored = (snapshot as any).currentDataset.canonicalPerspectivePersistence;
    expect(restored).toMatchObject({
      perspectiveId: 'executive_overview',
      focusSubject: { canonicalId: 'product', value: 'Widget A' },
      evidenceSources: [expect.objectContaining({ sourceName: 'sales-may.csv', sourceRowCount: 2 })],
    });
    expect(restored.evidenceSources[0]).not.toHaveProperty('rows');
    expect((snapshot as any).currentDataset.analysisRows).toHaveLength(1);
  });
});
