import { beforeEach, describe, expect, it } from 'vitest';
import { activateAdvancedSourceForEasyDataset, advancedSourceId, useAdvancedSourceStore, type AdvancedWorkspaceSource } from './advanced-source-store';

function source(id: string, name: string, sourceType: string, easyReturnDataset?: unknown): AdvancedWorkspaceSource {
  return {
    id, name, sourceType, sourceKind: 'local_file', registeredAt: new Date().toISOString(), easyReturnDataset,
    tables: [{ id: '0:data', name, rowCount: 1500, columns: ['id'], profiles: {}, file: new File(['id\n1'], name) }],
  };
}

describe('Advanced source authority routing', () => {
  beforeEach(() => useAdvancedSourceStore.setState({ sources: [], activeSourceId: null, pendingEasyReturnSourceId: null }));

  it('pins the original Easy source even after Investigation registered a newer synthetic source', () => {
    const dataset = { status: 'ready', sourceType: 'local_xlsx', file_name: 'Sales_ERP_May_2026.xlsx' };
    const originalId = advancedSourceId(dataset.sourceType, dataset.file_name);
    useAdvancedSourceStore.getState().registerSource(source(originalId, dataset.file_name, dataset.sourceType, dataset));
    useAdvancedSourceStore.getState().registerSource(source('investigation:sales', dataset.file_name, 'investigation'));
    expect(useAdvancedSourceStore.getState().activeSourceId).toBe('investigation:sales');

    expect(activateAdvancedSourceForEasyDataset(dataset)).toBe(originalId);
    expect(useAdvancedSourceStore.getState().activeSourceId).toBe(originalId);
    expect(useAdvancedSourceStore.getState().sources.find(item => item.id === originalId)?.easyReturnDataset).toBe(dataset);
  });

  it('does not pin a non-existent source id', () => {
    expect(activateAdvancedSourceForEasyDataset({ sourceType: 'local_xlsx', file_name: 'missing.xlsx' })).toBeNull();
    expect(useAdvancedSourceStore.getState().activeSourceId).toBeNull();
  });
});
