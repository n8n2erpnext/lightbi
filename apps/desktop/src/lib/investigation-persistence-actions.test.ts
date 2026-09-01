import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createInvestigationPersistenceActions } from './investigation-persistence-actions';
import { saveWorkspaceSession } from './workspace-session-api';
import { createAnalysisSessionIdentity } from './analysis-session-identity';

vi.mock('./workspace-session-api', () => ({ saveWorkspaceSession: vi.fn() }));
vi.mock('./analysis-session-identity', () => ({ createAnalysisSessionIdentity: vi.fn(() => null) }));

describe('Investigation workspace persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createAnalysisSessionIdentity).mockReturnValue(null);
  });

  it('never persists built-in demo datasets when returning from Investigation', async () => {
    const navigate = vi.fn();
    const session = {
      datasetId: 'LightBI_Demo_Branch_Revenue.csv',
      analysisAction: { opportunityName: 'Revenue' },
      rows: [{ Revenue: 1 }],
      rowScope: 'full_file',
      workspaceDataset: {
        status: 'ready',
        file_name: 'LightBI_Demo_Branch_Revenue.csv',
        demoSynthetic: true,
        sourceFiles: [{ name: 'LightBI_Demo_Branch_Revenue.csv' }],
      },
    } as any;
    const actions = createInvestigationPersistenceActions({ session, durableAnalysisWorkbookPlan: null as any, navigate });

    expect(await actions.persistWorkspaceSession()).toBeNull();
    await actions.returnToCurrentDataset();

    expect(saveWorkspaceSession).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith('/', { state: null });
  });

  it('refuses to create or overwrite local history when no durable source-file payload exists', async () => {
    const navigate = vi.fn();
    const session = {
      datasetId: 'sales.xlsx',
      analysisAction: { opportunityName: 'Revenue' },
      rows: [{ Revenue: 1 }],
      rowScope: 'semantic_sample',
      workspaceDataset: {
        status: 'ready', file_name: 'sales.xlsx', sourceType: 'local_xlsx', normalizedUrl: 'file://sales.xlsx',
        sourceFiles: [{ name: 'sales.xlsx', rows: 1500 }], file_reference: { name: 'sales.xlsx' },
      },
    } as any;
    const actions = createInvestigationPersistenceActions({ session, durableAnalysisWorkbookPlan: null as any, navigate });

    expect(await actions.persistWorkspaceSession()).toBeNull();
    expect(saveWorkspaceSession).not.toHaveBeenCalled();
  });

  it('preserves complete persisted source metadata when Investigation updates analysis identity', async () => {
    const navigate = vi.fn();
    const persistedFile = { fileId: 'file-1', originalName: 'sales.xlsx', filePath: 'files/file-1-sales.xlsx', bytesWritten: 1234 };
    const payload = {
      id: 'session-1', title: 'sales.xlsx', sourceType: 'local_xlsx', rowCount: 1500, columnCount: 13,
      sourceSummary: [{ name: 'sales.xlsx', rows: 1500, persistedFile }],
      snapshot: { version: 3, currentDataset: { status: 'ready', file_name: 'sales.xlsx', sourceType: 'local_xlsx', normalizedUrl: 'file://sales.xlsx', sourceFiles: [{ name: 'sales.xlsx', rows: 1500, persistedFile }] } },
    };
    vi.mocked(createAnalysisSessionIdentity).mockReturnValue({ schemaVersion: 'lightbi.analysis-session-identity.v1' } as any);
    vi.mocked(saveWorkspaceSession).mockImplementation(async request => ({ ...request, id: request.id || 'session-1', createdAt: '', updatedAt: '' }));
    const session = {
      datasetId: 'sales.xlsx', analysisAction: { opportunityName: 'Revenue' }, rows: [{ Revenue: 1 }], rowScope: 'full_file',
      workspaceDataset: { status: 'ready', file_name: 'sales.xlsx', sourceType: 'local_xlsx', normalizedUrl: 'file://sales.xlsx', sourceFiles: [{ name: 'sales.xlsx', persistedFile }] },
      workspaceSessionPayload: payload,
    } as any;
    const actions = createInvestigationPersistenceActions({ session, durableAnalysisWorkbookPlan: {} as any, navigate });

    const saved = await actions.persistWorkspaceSession();
    expect(saved).not.toBeNull();
    expect(saveWorkspaceSession).toHaveBeenCalledWith(expect.objectContaining({
      id: 'session-1',
      sourceSummary: [expect.objectContaining({ persistedFile })],
      snapshot: expect.objectContaining({ currentDataset: expect.objectContaining({ sourceFiles: [expect.objectContaining({ persistedFile })] }) }),
    }));
  });

});
