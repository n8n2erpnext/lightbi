import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createInvestigationPersistenceActions } from './investigation-persistence-actions';
import { saveWorkspaceSession } from './workspace-session-api';

vi.mock('./workspace-session-api', () => ({ saveWorkspaceSession: vi.fn() }));
vi.mock('./analysis-session-identity', () => ({ createAnalysisSessionIdentity: vi.fn(() => null) }));

describe('Investigation workspace persistence', () => {
  beforeEach(() => vi.clearAllMocks());

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
});
