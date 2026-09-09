// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useHomeWorkspaceSessions } from './useHomeWorkspaceSessions';
import type { WorkspaceSessionRecord } from '../lib/workspace-session-api';
import { deleteWorkspaceSession, loadWorkspaceSessions, saveWorkspaceSession } from '../lib/workspace-session-api';
import { downloadProjectSourceFile, resolveProjectSourceFile, uploadProjectSourceFile } from '../lib/project-source-file-api';
import { persistedFilesFromSession } from '../lib/home-workspace-persistence';
import { useAnalysisExportStore } from '../stores/analysis-export-store';
import { createAnalysisWorkbookPlan } from '../lib/analysis-workbook';
import { createDecisionVisualizationPlan } from '../lib/decision-visualization-plan';
import { createAnalysisSessionIdentity } from '../lib/analysis-session-identity';

vi.mock('../lib/workspace-session-api', async importOriginal => {
  const original = await importOriginal<typeof import('../lib/workspace-session-api')>();
  return {
    ...original,
    loadWorkspaceSessions: vi.fn().mockResolvedValue([]),
    saveWorkspaceSession: vi.fn(),
    deleteWorkspaceSession: vi.fn(),
  };
});

vi.mock('../lib/project-source-file-api', () => ({
  uploadProjectSourceFile: vi.fn(),
  downloadProjectSourceFile: vi.fn(),
  resolveProjectSourceFile: vi.fn().mockResolvedValue(null),
}));

describe('Home workspace session restoration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(resolveProjectSourceFile).mockResolvedValue(null);
    useAnalysisExportStore.getState().clearPlan();
  });

  it('purges legacy synthetic demo sessions while keeping real Session History entries', async () => {
    const real: WorkspaceSessionRecord = {
      id: 'real-session', title: 'sales.csv', sourceType: 'local_csv', rowCount: 10, columnCount: 2,
      sourceSummary: [], snapshot: {}, createdAt: '', updatedAt: '',
    };
    const demo: WorkspaceSessionRecord = {
      id: 'demo-session', title: 'LightBI_Demo_Branch_Revenue.csv', sourceType: 'local_csv', rowCount: 56, columnCount: 9,
      sourceSummary: [], snapshot: {}, createdAt: '', updatedAt: '',
    };
    vi.mocked(loadWorkspaceSessions).mockResolvedValueOnce([demo, real]);
    const deps = {
      currentDataset: null,
      registerAdvancedSource: vi.fn(), setCurrentDataset: vi.fn(), setWorkspaceState: vi.fn(), setDecisionTrustReport: vi.fn(),
      setPendingLocalBatch: vi.fn(), setMultiSourceDrafts: vi.fn(), setMultiSourceBuildResult: vi.fn(),
      setSelectedTopic: vi.fn(), setResult: vi.fn(), setPreviewActionId: vi.fn(), requestLocalFileReselection: vi.fn(),
    };
    const wrapper = ({ children }: { children: ReactNode }) => <MemoryRouter>{children}</MemoryRouter>;
    const { result } = renderHook(() => useHomeWorkspaceSessions(deps), { wrapper });
    await waitFor(() => expect(result.current.workspaceSessions).toEqual([real]));
    expect(deleteWorkspaceSession).toHaveBeenCalledWith('demo-session');
  });

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


  it('self-heals a legacy local session when the complete source still exists in the project store', async () => {
    const csv = ['id,value', ...Array.from({ length: 1500 }, (_, index) => `${index + 1},value-${index + 1}`)].join('\n');
    const original = new File([csv], 'sales-legacy.csv', { type: 'text/csv' });
    const persistedFile = { fileId: 'legacy-persisted', originalName: original.name, filePath: 'files/legacy-persisted', bytesWritten: original.size };
    vi.mocked(resolveProjectSourceFile).mockResolvedValue(persistedFile);
    vi.mocked(downloadProjectSourceFile).mockResolvedValue(original);
    vi.mocked(saveWorkspaceSession).mockImplementation(async request => ({
      ...request, id: request.id || 'legacy-session', createdAt: '', updatedAt: '',
    }));
    const requestLocalFileReselection = vi.fn();
    const setCurrentDataset = vi.fn();
    const deps = {
      currentDataset: null, registerAdvancedSource: vi.fn(), setCurrentDataset, setWorkspaceState: vi.fn(), setDecisionTrustReport: vi.fn(),
      setPendingLocalBatch: vi.fn(), setMultiSourceDrafts: vi.fn(), setMultiSourceBuildResult: vi.fn(),
      setSelectedTopic: vi.fn(), setResult: vi.fn(), setPreviewActionId: vi.fn(), requestLocalFileReselection,
    };
    const wrapper = ({ children }: { children: ReactNode }) => <MemoryRouter>{children}</MemoryRouter>;
    const { result } = renderHook(() => useHomeWorkspaceSessions(deps), { wrapper });
    const session: WorkspaceSessionRecord = {
      id: 'legacy-session', title: original.name, sourceType: 'local_csv', rowCount: 1500, columnCount: 2,
      sourceSummary: [{ name: original.name, rows: 1500 }],
      snapshot: { currentDataset: { status: 'ready', file_name: original.name, sourceType: 'local_csv', normalizedUrl: `file://${original.name}`, rows_count: 1500, columns: ['id', 'value'], sourceFiles: [{ name: original.name }] } },
      createdAt: '', updatedAt: '',
    };
    await act(async () => { await result.current.handleOpenWorkspaceSession(session); });
    expect(resolveProjectSourceFile).toHaveBeenCalledWith(original.name);
    expect(requestLocalFileReselection).not.toHaveBeenCalled();
    const restored = setCurrentDataset.mock.calls.map(call => call[0]).find(value => value?.restoredFromSessionId === 'legacy-session');
    expect(restored).toMatchObject({ status: 'ready', rows_count: 1500 });
    expect(restored.runtimeDatasetSource).toBeTruthy();
    expect(saveWorkspaceSession).toHaveBeenCalledWith(expect.objectContaining({ id: 'legacy-session' }));
    expect(result.current.sessionStatus).toContain('upgraded for future opens');
  });

  it('clears transient Excel export authority when switching to a saved workspace session', async () => {
    const decision = createDecisionVisualizationPlan({
      perspectiveId: 'inventory', sourceCount: 1, dimensionField: 'Store', metricIds: ['stock_qty'],
      rows: [{ Store: 'A', stock_qty: 12 }], analyticalIntent: 'category_comparison',
      availableRoles: ['category','measure'], cardinality: { points: 1, categories: 1, series: 1 },
      requiredSurfaces: ['preview','persistence','dashboard'],
    });
    const workbook = createAnalysisWorkbookPlan({
      title: 'Inventory', perspectiveId: 'inventory', sourceCount: 1,
      summaryRows: [{ Store: 'A', stock_qty: 12 }], decisionVisualizationPlan: decision,
    });
    const boundary = {
      datasetId: 'inventory.xlsx', sourceId: 'source-1', sourceFingerprint: 'fp-1',
      inspectionGeneration: 'i-1', profileGeneration: 'p-1',
    } as any;
    const identity = createAnalysisSessionIdentity(workbook, { canonicalSourceBoundary: boundary });
    useAnalysisExportStore.getState().setPlan(workbook);
    const setCurrentDataset = vi.fn();
    const deps = {
      currentDataset: null,
      registerAdvancedSource: vi.fn(), setCurrentDataset, setWorkspaceState: vi.fn(), setDecisionTrustReport: vi.fn(),
      setPendingLocalBatch: vi.fn(), setMultiSourceDrafts: vi.fn(), setMultiSourceBuildResult: vi.fn(),
      setSelectedTopic: vi.fn(), setResult: vi.fn(), setPreviewActionId: vi.fn(), requestLocalFileReselection: vi.fn(),
    };
    const wrapper = ({ children }: { children: ReactNode }) => <MemoryRouter>{children}</MemoryRouter>;
    const { result } = renderHook(() => useHomeWorkspaceSessions(deps), { wrapper });
    const session: WorkspaceSessionRecord = {
      id: 'saved-analysis', title: 'inventory.xlsx', sourceType: 'local_xlsx', rowCount: 1, columnCount: 2,
      sourceSummary: [], snapshot: { analysisSessionIdentity: identity, currentDataset: { status: 'ready', file_name: 'inventory.xlsx', sourceType: 'local_xlsx' } },
      createdAt: '', updatedAt: '',
    };
    await act(async () => { await result.current.handleOpenWorkspaceSession(session); });
    expect(useAnalysisExportStore.getState().plan).toBeNull();
    const restored = setCurrentDataset.mock.calls.at(-1)?.[0];
    expect(restored.analysisIdentityRevalidation).toMatchObject({
      sourceValid: false, currentPlanRequired: true, exportAuthorityRestored: false,
    });
    expect(restored.analysisIdentityRevalidation.blockers).toContain('analysis_source_boundary_required');
  });

  it('persists and restores a newly saved 1,500-row local source without reselection after runtime references are discarded', async () => {
    const csv = ['id,value', ...Array.from({ length: 1500 }, (_, index) => `${index + 1},value-${index + 1}`)].join('\n');
    const original = new File([csv], 'sales-1500.csv', { type: 'text/csv' });
    const persistedFile = {
      fileId: 'persisted-sales-1500', originalName: original.name,
      filePath: 'project/source-files/persisted-sales-1500.csv', bytesWritten: original.size,
    };
    vi.mocked(uploadProjectSourceFile).mockResolvedValue(persistedFile);
    vi.mocked(downloadProjectSourceFile).mockResolvedValue(new File([csv], original.name, { type: original.type }));
    vi.mocked(saveWorkspaceSession).mockImplementation(async request => ({
      ...request,
      id: request.id || 'saved-session-1500',
      createdAt: '2026-08-26T00:00:00.000Z',
      updatedAt: '2026-08-26T00:00:00.000Z',
    }));
    const requestLocalFileReselection = vi.fn();
    const setCurrentDataset = vi.fn();
    const registerAdvancedSource = vi.fn();
    const dataset = {
      status: 'ready', file_name: original.name, sourceType: 'local_csv', normalizedUrl: `file://${original.name}`,
      rows_count: 1500, columns: ['id', 'value'], profiles: {},
      sourceFiles: [{ name: original.name, rows: 1500, columns: 2 }],
      file_reference: original, runtimeFileReferences: [original],
      semanticSample: { strategy: 'full', sourceRowCount: 1500, sampleRowCount: 1500 },
      analysisRowScope: 'full', semanticRows: [], analysisRows: [], previewRows: [],
    };
    const deps = {
      currentDataset: dataset,
      registerAdvancedSource, setCurrentDataset, setWorkspaceState: vi.fn(), setDecisionTrustReport: vi.fn(),
      setPendingLocalBatch: vi.fn(), setMultiSourceDrafts: vi.fn(), setMultiSourceBuildResult: vi.fn(),
      setSelectedTopic: vi.fn(), setResult: vi.fn(), setPreviewActionId: vi.fn(), requestLocalFileReselection,
    };
    const wrapper = ({ children }: { children: ReactNode }) => <MemoryRouter>{children}</MemoryRouter>;
    const { result } = renderHook(() => useHomeWorkspaceSessions(deps), { wrapper });

    let saved: WorkspaceSessionRecord | null = null;
    await act(async () => { saved = await result.current.saveCurrentWorkspaceSession(dataset); });
    expect(saved).not.toBeNull();
    expect(uploadProjectSourceFile).toHaveBeenCalledWith(original);
    expect(persistedFilesFromSession(saved!)).toEqual([persistedFile]);
    expect((saved!.snapshot as any).currentDataset).not.toHaveProperty('runtimeFileReferences');
    expect((saved!.snapshot as any).currentDataset).not.toHaveProperty('file_reference');

    await act(async () => { await result.current.handleOpenWorkspaceSession(saved!); });
    expect(vi.mocked(downloadProjectSourceFile).mock.calls[0]?.[0]).toEqual(persistedFile);
    expect(requestLocalFileReselection).not.toHaveBeenCalled();
    const restored = setCurrentDataset.mock.calls.map(call => call[0]).find(value => typeof value === 'object' && value?.restoredFromSessionId === saved!.id);
    expect(restored).toMatchObject({ status: 'ready', rows_count: 1500, restoredFromSessionId: 'saved-session-1500' });
    expect(restored.runtimeDatasetSource).toBeTruthy();
    expect(registerAdvancedSource).toHaveBeenCalledWith(expect.objectContaining({
      name: original.name,
      sourceKind: 'local_file',
      canonicalSourceBoundary: expect.objectContaining({ datasetId: original.name }),
      tables: [expect.objectContaining({ rowCount: 1500, file: expect.any(File) })],
    }));
    expect(result.current.sessionStatus).toContain('complete saved source file');
  }, 30_000);


  it('restores a persisted multi-file perspective with Focus metadata while keeping source evidence exact', async () => {
    const mayCsv = 'Product,Revenue\nWidget A,100\nWidget B,200\n';
    const juneCsv = 'Product,Revenue\nWidget A,120\nWidget B,180\n';
    const mayFile = new File([mayCsv], 'sales-may.csv', { type: 'text/csv' });
    const juneFile = new File([juneCsv], 'sales-june.csv', { type: 'text/csv' });
    const mayPersisted = { fileId: 'may-file', originalName: mayFile.name, filePath: 'project/source-files/may.csv', bytesWritten: mayFile.size };
    const junePersisted = { fileId: 'june-file', originalName: juneFile.name, filePath: 'project/source-files/june.csv', bytesWritten: juneFile.size };
    vi.mocked(downloadProjectSourceFile).mockResolvedValueOnce(mayFile).mockResolvedValueOnce(juneFile);
    const setCurrentDataset = vi.fn();
    const rememberRestoredLocalBatch = vi.fn();
    const setPendingLocalBatch = vi.fn();
    const setMultiSourceBuildResult = vi.fn();
    const deps = {
      currentDataset: null, registerAdvancedSource: vi.fn(), setCurrentDataset, setWorkspaceState: vi.fn(), setDecisionTrustReport: vi.fn(),
      setPendingLocalBatch, setMultiSourceDrafts: vi.fn(), setMultiSourceBuildResult,
      setSelectedTopic: vi.fn(), setResult: vi.fn(), setPreviewActionId: vi.fn(), rememberRestoredLocalBatch, requestLocalFileReselection: vi.fn(),
    };
    const wrapper = ({ children }: { children: ReactNode }) => <MemoryRouter>{children}</MemoryRouter>;
    const { result } = renderHook(() => useHomeWorkspaceSessions(deps), { wrapper });
    const focusSubject = { canonicalId: 'product', value: 'Widget A', displayLabel: 'Widget A' };
    const session: WorkspaceSessionRecord = {
      id: 'multi-focus', title: 'Revenue analysis', sourceType: 'canonical_perspective_collection', rowCount: 4, columnCount: 2,
      sourceSummary: [
        { name: mayFile.name, rows: 2, persistedFile: mayPersisted },
        { name: juneFile.name, rows: 2, persistedFile: junePersisted },
      ],
      snapshot: { currentDataset: {
        status: 'ready', file_name: 'Revenue analysis', sourceType: 'canonical_perspective_collection', rows_count: 4, columns: ['reporting_period', 'sales_revenue'],
        sourceFiles: [
          { name: mayFile.name, rows: 2, role: 'sales', sourceId: 'source-may', reportingPeriod: '2026-05-01/2026-05-31', persistedFile: mayPersisted },
          { name: juneFile.name, rows: 2, role: 'sales', sourceId: 'source-june', reportingPeriod: '2026-06-01/2026-06-30', persistedFile: junePersisted },
        ],
        semanticRows: [], previewRows: [],
        analysisRows: [{ reporting_period: '2026-05', sales_revenue: 300 }, { reporting_period: '2026-06', sales_revenue: 300 }],
        canonicalPerspectivePersistence: {
          perspectiveId: 'executive_overview', deepDiveBrief: { headline: 'Revenue analysis' }, focusDeepDiveBrief: { headline: 'Widget A analysis' }, focusSubject,
          evidenceSources: [
            { period: '2026-05', role: 'sales', sourceId: 'source-may', sourceName: mayFile.name, sourceRowCount: 2, semanticFields: [{ canonicalId: 'product', physicalColumn: 'Product' }], focusBinding: { state: 'matched_exact', field: 'Product' } },
            { period: '2026-06', role: 'sales', sourceId: 'source-june', sourceName: juneFile.name, sourceRowCount: 2, semanticFields: [{ canonicalId: 'product', physicalColumn: 'Product' }], focusBinding: { state: 'matched_exact', field: 'Product' } },
          ],
        },
      } },
      createdAt: '', updatedAt: '',
    };
    await act(async () => { await result.current.handleOpenWorkspaceSession(session); });
    const restored = setCurrentDataset.mock.calls.map(call => call[0]).find(value => value?.sourceType === 'canonical_perspective_collection');
    expect(restored).toMatchObject({ status: 'ready', canonicalPerspectiveId: 'executive_overview', canonicalPerspectiveFocusSubject: focusSubject, restoredFromSessionId: 'multi-focus' });
    expect(restored.canonicalSourceBoundary).toBeTruthy();
    expect(restored.runtimeFileReferences).toHaveLength(2);
    expect(restored.canonicalPerspectiveEvidenceSources).toHaveLength(2);
    expect(restored.canonicalPerspectiveEvidenceSources[0].rows).toEqual(expect.arrayContaining([expect.objectContaining({ Product: 'Widget A' })]));
    expect(restored.canonicalPerspectiveEvidenceSources[1].rows).toEqual(expect.arrayContaining([expect.objectContaining({ Product: 'Widget B' })]));
    expect(rememberRestoredLocalBatch).toHaveBeenCalledTimes(1);
    expect(setPendingLocalBatch).toHaveBeenLastCalledWith(null);
    expect(setMultiSourceBuildResult).not.toHaveBeenCalledWith(expect.objectContaining({ blockers: expect.arrayContaining([expect.stringContaining('relationship')]) }));
    expect(result.current.sessionStatus).toContain('Multi-file Focus analysis restored');
  }, 30_000);


  it('restores canonical multi-source files into source review and keeps execution fail-closed until the relationship is rebuilt', async () => {
    const salesFile = new File(['Order,Amount\nA,100\n'], 'sales.csv', { type: 'text/csv' });
    const accountingFile = new File(['Voucher,Amount\nV1,80\n'], 'accounting.csv', { type: 'text/csv' });
    const salesPersisted = { fileId: 'sales-file', originalName: salesFile.name, filePath: 'project/source-files/sales.csv', bytesWritten: salesFile.size };
    const accountingPersisted = { fileId: 'accounting-file', originalName: accountingFile.name, filePath: 'project/source-files/accounting.csv', bytesWritten: accountingFile.size };
    vi.mocked(downloadProjectSourceFile).mockResolvedValueOnce(salesFile).mockResolvedValueOnce(accountingFile);
    const setCurrentDataset = vi.fn();
    const setPendingLocalBatch = vi.fn();
    const setMultiSourceDrafts = vi.fn();
    const setMultiSourceBuildResult = vi.fn();
    const deps = {
      currentDataset: null, registerAdvancedSource: vi.fn(), setCurrentDataset, setWorkspaceState: vi.fn(), setDecisionTrustReport: vi.fn(),
      setPendingLocalBatch, setMultiSourceDrafts, setMultiSourceBuildResult,
      setSelectedTopic: vi.fn(), setResult: vi.fn(), setPreviewActionId: vi.fn(), requestLocalFileReselection: vi.fn(),
    };
    const wrapper = ({ children }: { children: ReactNode }) => <MemoryRouter>{children}</MemoryRouter>;
    const { result } = renderHook(() => useHomeWorkspaceSessions(deps), { wrapper });
    const declaration = (kind: string, value: Record<string, unknown>) => ({ validationStatus: 'valid', value: { kind, ...value } });
    const session: WorkspaceSessionRecord = {
      id: 'canonical-multi', title: 'Governed multi-source dataset', sourceType: 'canonical_multisource', rowCount: 2, columnCount: 2,
      sourceSummary: [
        { name: salesFile.name, persistedFile: salesPersisted },
        { name: accountingFile.name, persistedFile: accountingPersisted },
      ],
      snapshot: { currentDataset: {
        status: 'ready', file_name: 'Governed multi-source dataset', sourceType: 'canonical_multisource', sourceFiles: [
          { name: salesFile.name, persistedFile: salesPersisted }, { name: accountingFile.name, persistedFile: accountingPersisted },
        ],
        canonicalMultiSourcePersistence: { memberships: [
          { overlay: { binding: { datasetId: salesFile.name }, sourceEvidenceDeclarations: [
            declaration('source_role', { role: 'sales' }), declaration('reporting_period', { start: '2026-05-01', end: '2026-05-31' }), declaration('reporting_currency', { currency: 'VND', monetaryColumns: ['Amount'] }),
          ] } },
          { overlay: { binding: { datasetId: accountingFile.name }, sourceEvidenceDeclarations: [
            declaration('source_role', { role: 'accounting' }), declaration('reporting_period', { start: '2026-05-01', end: '2026-05-31' }), declaration('reporting_currency', { currency: 'VND', monetaryColumns: ['Amount'] }),
          ] } },
        ] },
      } },
      createdAt: '', updatedAt: '',
    };
    await act(async () => { await result.current.handleOpenWorkspaceSession(session); });
    expect(setCurrentDataset).toHaveBeenCalledWith(null);
    expect(setPendingLocalBatch).toHaveBeenCalledWith(expect.objectContaining({ status: 'ready', isRestored: true }));
    const drafts = setMultiSourceDrafts.mock.calls.at(-1)?.[0];
    expect(drafts['0:sales.csv']).toMatchObject({ selected: true, role: 'sales', periodStart: '2026-05-01', currency: 'VND' });
    expect(drafts['1:accounting.csv']).toMatchObject({ selected: true, role: 'accounting', periodEnd: '2026-05-31', monetaryColumns: 'Amount' });
    expect(setMultiSourceBuildResult).toHaveBeenCalledWith({ relationshipState: null, blockers: [expect.stringContaining('Rebuild the relationship before analysis')] });
    expect(result.current.sessionStatus).toContain('rebuild the governed multi-source dataset');
  }, 30_000);

  it('fails closed to restored source review when a multi-file analysis snapshot is missing its recovery metadata', async () => {
    const csv = 'Product,Revenue\nWidget A,100\n';
    const file = new File([csv], 'sales-missing-meta.csv', { type: 'text/csv' });
    const persisted = { fileId: 'missing-meta', originalName: file.name, filePath: 'project/source-files/missing-meta.csv', bytesWritten: file.size };
    vi.mocked(downloadProjectSourceFile).mockResolvedValue(file);
    const setCurrentDataset = vi.fn();
    const setPendingLocalBatch = vi.fn();
    const setMultiSourceBuildResult = vi.fn();
    const deps = {
      currentDataset: null, registerAdvancedSource: vi.fn(), setCurrentDataset, setWorkspaceState: vi.fn(), setDecisionTrustReport: vi.fn(),
      setPendingLocalBatch, setMultiSourceDrafts: vi.fn(), setMultiSourceBuildResult,
      setSelectedTopic: vi.fn(), setResult: vi.fn(), setPreviewActionId: vi.fn(), requestLocalFileReselection: vi.fn(),
    };
    const wrapper = ({ children }: { children: ReactNode }) => <MemoryRouter>{children}</MemoryRouter>;
    const { result } = renderHook(() => useHomeWorkspaceSessions(deps), { wrapper });
    const session: WorkspaceSessionRecord = {
      id: 'bad-multi', title: 'Old multi-file analysis', sourceType: 'canonical_perspective_collection', rowCount: 1, columnCount: 2,
      sourceSummary: [{ name: file.name, rows: 1, persistedFile: persisted }],
      snapshot: { currentDataset: { status: 'ready', file_name: 'Old multi-file analysis', sourceType: 'canonical_perspective_collection', rows_count: 1, columns: ['Product', 'Revenue'], sourceFiles: [{ name: file.name, persistedFile: persisted }] } },
      createdAt: '', updatedAt: '',
    };
    await act(async () => { await result.current.handleOpenWorkspaceSession(session); });
    expect(setCurrentDataset).toHaveBeenCalledWith(null);
    expect(setPendingLocalBatch).toHaveBeenCalledWith(expect.objectContaining({ status: 'ready', isRestored: true }));
    expect(setMultiSourceBuildResult).toHaveBeenCalledWith(expect.objectContaining({ blockers: expect.arrayContaining([expect.stringContaining('metadata is incomplete')]) }));
    expect(result.current.sessionStatus).toContain('metadata is incomplete');
  }, 30_000);

  it('refuses to claim a new local session was saved when no runtime or persisted source survives', async () => {
    const requestLocalFileReselection = vi.fn();
    const dataset = {
      status: 'ready', file_name: 'missing.csv', sourceType: 'local_csv', normalizedUrl: 'file://missing.csv',
      rows_count: 1500, columns: ['id'], sourceFiles: [{ name: 'missing.csv', rows: 1500 }],
    };
    const deps = {
      currentDataset: dataset,
      registerAdvancedSource: vi.fn(), setCurrentDataset: vi.fn(), setWorkspaceState: vi.fn(), setDecisionTrustReport: vi.fn(),
      setPendingLocalBatch: vi.fn(), setMultiSourceDrafts: vi.fn(), setMultiSourceBuildResult: vi.fn(),
      setSelectedTopic: vi.fn(), setResult: vi.fn(), setPreviewActionId: vi.fn(), requestLocalFileReselection,
    };
    const wrapper = ({ children }: { children: ReactNode }) => <MemoryRouter>{children}</MemoryRouter>;
    const { result } = renderHook(() => useHomeWorkspaceSessions(deps), { wrapper });
    let saved: WorkspaceSessionRecord | null = null;
    await act(async () => { saved = await result.current.saveCurrentWorkspaceSession(dataset); });
    expect(saved).toBeNull();
    expect(saveWorkspaceSession).not.toHaveBeenCalled();
    expect(result.current.sessionStatus).toContain('complete source file is no longer available');
  });
});
