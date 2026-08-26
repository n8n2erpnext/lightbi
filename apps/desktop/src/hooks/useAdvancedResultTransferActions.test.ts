// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AdvancedQueryResult } from '../lib/advanced-api';
import { createAdvancedTab } from '../lib/advanced-workspace';
import { hydrateTab } from '../lib/advanced-workspace-helpers';
import type { AdvancedFileSession } from '../lib/advanced-file-session';
import type { AdvancedWorkspaceSource } from '../stores/advanced-source-store';

const mocks = vi.hoisted(() => ({
  createInvestigationSession: vi.fn(),
  executeAdvancedQuery: vi.fn(),
}));

vi.mock('../lib/investigation-session', async importOriginal => ({
  ...await importOriginal<typeof import('../lib/investigation-session')>(),
  createInvestigationSession: mocks.createInvestigationSession,
}));

vi.mock('../lib/advanced-api', async importOriginal => ({
  ...await importOriginal<typeof import('../lib/advanced-api')>(),
  executeAdvancedQuery: mocks.executeAdvancedQuery,
}));

import { createAdvancedResultTransferActions } from './useAdvancedResultTransferActions';

const columns = [{ id: 'column:0:id', name: 'id', logicalType: 'number' as const, nativeType: 'INTEGER' }];

function resultPage(offset: number, rowCount: number, hasMore: boolean): AdvancedQueryResult {
  return {
    runId: `run-${offset}`,
    columns,
    rows: Array.from({ length: rowCount }, (_, index) => [offset + index + 1]),
    page: { offset, limit: 1000, hasMore, estimatedTotal: 1500 },
    truncated: false,
    warnings: hasMore ? ['More rows are available on the next page.'] : [],
    executionMs: 2,
  };
}

function context(overrides: Record<string, unknown> = {}) {
  const activeTab = {
    ...hydrateTab(createAdvancedTab(1, {
      title: 'data',
      sql: 'SELECT * FROM "data"',
    })),
    tableContext: { schema: 'workspace', table: 'data' },
  };
  const patchTab = vi.fn();
  const base = {
    activeTab,
    addTab: vi.fn(() => activeTab),
    connection: null,
    displayResult: null,
    exportCancelRef: { current: false },
    exportJobIdRef: { current: null },
    fileSession: { current: { execute: vi.fn(), open: vi.fn(), close: vi.fn() } as unknown as AdvancedFileSession },
    fileSource: null,
    hasActivePendingChanges: false,
    importDraft: {} as never,
    importJobIdRef: { current: null },
    patchTab,
    recordHistory: vi.fn(),
    refreshSchema: vi.fn().mockResolvedValue(undefined),
    runQuery: vi.fn().mockResolvedValue(undefined),
    setActiveTabId: vi.fn(),
    setExportProgress: vi.fn(),
    setImportDraft: vi.fn(),
    setIsExportingAll: vi.fn(),
    setTabs: vi.fn(),
    sources: [],
    tabs: [activeTab],
    workspaceProvider: 'duckdb' as const,
    writableTables: [],
    ...overrides,
  };
  return { activeTab, patchTab, value: base as Parameters<typeof createAdvancedResultTransferActions>[0] };
}

describe('Advanced full-source return to Easy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState(null, '', '/advanced');
  });

  it('materializes every page for a zero-edit 1,500-row local source before the Easy handoff', async () => {
    const fileSource: AdvancedWorkspaceSource = {
      id: 'local:1500', name: 'orders.csv', sourceType: 'local_csv', sourceKind: 'local_file', registeredAt: new Date().toISOString(),
      tables: [{ id: 'data', name: 'data', rowCount: 1500, columns: ['id'], profiles: {}, file: new File(['id\n1'], 'orders.csv', { type: 'text/csv' }) }],
    };
    const execute = vi.fn().mockImplementation(({ offset }: { offset: number }) => Promise.resolve(offset === 0
      ? resultPage(0, 1000, true)
      : resultPage(1000, 500, false)));
    const { patchTab, value } = context({
      fileSource,
      fileSession: { current: { execute, open: vi.fn(), close: vi.fn() } as unknown as AdvancedFileSession },
    });

    await createAdvancedResultTransferActions(value).returnFullSourceToEasy();

    expect(execute.mock.calls.map(call => call[0].offset)).toEqual([0, 1000]);
    const completed = patchTab.mock.calls.map(call => call[1]).find(patch => patch?.result);
    expect(completed.result.rows).toHaveLength(1500);
    expect(completed.result.page).toEqual({ offset: 0, limit: 1500, hasMore: false, estimatedTotal: 1500 });
    expect(completed.error).toBeUndefined();
    expect(mocks.createInvestigationSession).toHaveBeenCalledOnce();
    expect(window.location.pathname).toBe('/investigation');
  });

  it('refreshes the complete post-commit database table before handing it back to Easy', async () => {
    mocks.executeAdvancedQuery
      .mockResolvedValueOnce(resultPage(0, 1000, true))
      .mockResolvedValueOnce(resultPage(1000, 500, false));
    const { patchTab, value } = context({
      connection: { connectionId: 'connection-1', name: 'Warehouse', database: 'analytics', provider: 'postgresql' },
      workspaceProvider: 'postgresql',
      fileSource: null,
      hasActivePendingChanges: false,
    });

    await createAdvancedResultTransferActions(value).returnFullSourceToEasy();

    expect(mocks.executeAdvancedQuery).toHaveBeenCalledTimes(2);
    expect(mocks.executeAdvancedQuery.mock.calls[0][1]).toMatchObject({ offset: 0, limit: 1000 });
    expect(mocks.executeAdvancedQuery.mock.calls[1][1]).toMatchObject({ offset: 1000, limit: 1000 });
    const completed = patchTab.mock.calls.map(call => call[1]).find(patch => patch?.result);
    expect(completed.result.rows).toHaveLength(1500);
    expect(mocks.createInvestigationSession).toHaveBeenCalledOnce();
  });

  it('does not attempt a return while uncommitted edits are still active', async () => {
    const { activeTab, patchTab, value } = context({ hasActivePendingChanges: true });
    await createAdvancedResultTransferActions(value).returnFullSourceToEasy();
    expect(patchTab).toHaveBeenCalledWith(activeTab.id, {
      warnings: ['Commit or discard pending edits before returning to Easy analysis.'],
    });
    expect(mocks.executeAdvancedQuery).not.toHaveBeenCalled();
    expect(mocks.createInvestigationSession).not.toHaveBeenCalled();
  });
});
