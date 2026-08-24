// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useHomeWorkspaceSessions } from './useHomeWorkspaceSessions';
import type { WorkspaceSessionRecord } from '../lib/workspace-session-api';

vi.mock('../lib/workspace-session-api', async importOriginal => {
  const original = await importOriginal<typeof import('../lib/workspace-session-api')>();
  return {
    ...original,
    loadWorkspaceSessions: vi.fn().mockResolvedValue([]),
    saveWorkspaceSession: vi.fn(),
    deleteWorkspaceSession: vi.fn(),
  };
});

describe('Home workspace session restoration', () => {
  beforeEach(() => vi.clearAllMocks());

  it('routes legacy local snapshots through source reselection instead of pretending the sample is executable', async () => {
    const requestLocalFileReselection = vi.fn();
    const setCurrentDataset = vi.fn();
    const deps = {
      currentDataset: null,
      registerAdvancedSource: vi.fn(), setCurrentDataset, setWorkspaceState: vi.fn(), setDecisionTrustReport: vi.fn(),
      setPendingLocalBatch: vi.fn(), setMultiSourceDrafts: vi.fn(), setMultiSourceBuildResult: vi.fn(),
      setSelectedTopic: vi.fn(), setResult: vi.fn(), setPreviewActionId: vi.fn(), requestLocalFileReselection,
    };
    const wrapper = ({ children }: { children: ReactNode }) => <MemoryRouter>{children}</MemoryRouter>;
    const { result } = renderHook(() => useHomeWorkspaceSessions(deps), { wrapper });
    const session: WorkspaceSessionRecord = {
      id: 'legacy-session', title: 'sales.xlsx', sourceType: 'local_xlsx', rowCount: 1500, columnCount: 13,
      sourceSummary: [{ name: 'sales.xlsx', rows: 1500 }],
      snapshot: { currentDataset: { status: 'ready', file_name: 'sales.xlsx', sourceType: 'local_xlsx', rows_count: 1500, columns: ['id'], sourceFiles: [{ name: 'sales.xlsx' }], analysisRows: [{ id: 1 }] } },
      createdAt: '', updatedAt: '',
    };
    await act(async () => { await result.current.handleOpenWorkspaceSession(session); });
    expect(setCurrentDataset).toHaveBeenCalledWith(expect.objectContaining({ status: 'stale', restoredFromSessionId: 'legacy-session' }));
    expect(requestLocalFileReselection).toHaveBeenCalledWith(session);
    expect(result.current.sessionStatus).toContain('original local file');
  });
});
