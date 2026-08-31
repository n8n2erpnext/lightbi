import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { classifyDatasetFamilies } from '../lib/batch-inspection';
import { createBusinessFusionOverview } from '../lib/business-fusion-overview';
import { createPreviewRows } from '../lib/data-intake-preview-rows';
import { createFileSourceCandidate, createSourceCandidate, type SourceCandidate, type SourceInspectionResult } from '../lib/source-preflight';
import { inspectLocalFile } from '../lib/local-file-inspector';
import { inspectOnlineSource } from '../lib/online-source-inspector';
import { downloadProjectSourceFile, uploadProjectSourceFile } from '../lib/project-source-file-api';
import { createWorkspaceUnderstandingState } from '../lib/workspace-understanding-state';
import { deleteWorkspaceSession, loadWorkspaceSessions, saveWorkspaceSession, type SaveWorkspaceSessionRequest, type WorkspaceSessionRecord } from '../lib/workspace-session-api';
import { attachPersistedFile, createWorkspaceSessionSnapshot, persistedFilesFromSession } from '../lib/home-workspace-persistence';
import { parseCanonicalUserOverlay } from '../lib/understanding-core/canonical-user-overlay';
import type { MultiSourceDraftV1 } from '../components/analysis/CanonicalMultiSourceReview';
import { createLocalCanonicalSourceBoundary } from '../lib/home-source-boundary';
import { applyHomeOnlineSourceInspection } from './useHomeOnlineSourceIntake';
import type { AdvancedWorkspaceSource } from '../stores/advanced-source-store';
import { createAdvancedWorkspaceSourceFromFamily } from '../lib/advanced-source-from-family';
import { useAnalysisExportStore } from '../stores/analysis-export-store';
import {
  parseAnalysisSessionIdentity,
  revalidateAnalysisSessionSourceIdentity,
  type AnalysisSessionIdentityV1,
} from '../lib/analysis-session-identity';

interface HomeWorkspaceSessionDependencies {
  registerAdvancedSource: (source: AdvancedWorkspaceSource) => void;
  currentDataset: any;
  setCurrentDataset: (value: any) => void;
  setWorkspaceState: (value: any) => void;
  setDecisionTrustReport: (value: any) => void;
  setPendingLocalBatch: (value: any) => void;
  setMultiSourceDrafts: (value: any) => void;
  setMultiSourceBuildResult: (value: any) => void;
  setSelectedTopic: (value: any) => void;
  setResult: (value: any) => void;
  setPreviewActionId: (value: any) => void;
  requestLocalFileReselection?: (session: WorkspaceSessionRecord) => void;
}

export function useHomeWorkspaceSessions(deps: HomeWorkspaceSessionDependencies) {
  const location = useLocation();
  const navigate = useNavigate();
  const [workspaceSessions, setWorkspaceSessions] = useState<WorkspaceSessionRecord[]>([]);
  const [sessionStatus, setSessionStatus] = useState<string | null>(null);
  const [isSavingSession, setIsSavingSession] = useState(false);
  const lastAutoSaveSignatureRef = useRef('');
  const returnSessionRestoredRef = useRef<string | null>(null);

  const refreshWorkspaceSessions = useCallback(async () => {
    try {
      setWorkspaceSessions(await loadWorkspaceSessions());
      setSessionStatus(null);
    } catch (error) {
      setSessionStatus(error instanceof Error ? error.message : 'Could not load saved sessions.');
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void loadWorkspaceSessions().then(records => {
      if (!cancelled) setWorkspaceSessions(records);
    }).catch(error => {
      if (!cancelled) setSessionStatus(error instanceof Error ? error.message : 'Could not load saved sessions.');
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const handleFocus = () => void refreshWorkspaceSessions();
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') void refreshWorkspaceSessions();
    };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refreshWorkspaceSessions]);

  const sessionSignature = (dataset: any) => JSON.stringify({
    name: dataset?.file_name,
    sourceType: dataset?.sourceType,
    rows: dataset?.rows_count,
    columns: Array.isArray(dataset?.columns) ? dataset.columns : [],
    sourceFiles: (dataset?.sourceFiles || []).map((file: any) => ({
      name: file?.name, rows: file?.rows, fileId: file?.persistedFile?.fileId, path: file?.persistedFile?.filePath,
    })),
    analysisRows: Array.isArray(dataset?.analysisRows) ? dataset.analysisRows.length : 0,
    understandingRows: Array.isArray(dataset?.understandingRows) ? dataset.understandingRows.length : 0,
    objectKey: dataset?.objectKey,
    selectedView: dataset?.selectedBusinessView?.id,
    canonicalOverlayId: parseCanonicalUserOverlay(dataset?.canonicalUserOverlay)?.overlayId ?? null,
    canonicalMultiSourceIdentity: dataset?.canonicalMultiSourceDataset?.identity ?? null,
  });

  const createSaveRequest = (dataset: any): SaveWorkspaceSessionRequest => {
    return {
      id: dataset.restoredFromSessionId,
      title: dataset.file_name || 'Untitled session',
      sourceType: dataset.sourceType || 'dataset',
      rowCount: Number(dataset.rows_count) || 0,
      columnCount: Array.isArray(dataset.columns) ? dataset.columns.length : 0,
      sourceSummary: dataset.sourceFiles || [],
      snapshot: createWorkspaceSessionSnapshot(dataset),
    };
  };

  const ensureLocalSourcesPersisted = async (dataset: any) => {
    if (typeof File === 'undefined') return dataset;
    const sourceFiles = Array.isArray(dataset?.sourceFiles) ? dataset.sourceFiles.map((source: any) => ({ ...source })) : [];
    const runtimeFiles = Array.isArray(dataset?.runtimeFileReferences)
      ? dataset.runtimeFileReferences.filter((file: unknown): file is File => file instanceof File)
      : dataset?.file_reference instanceof File ? [dataset.file_reference] : [];
    const normalizedUrl = typeof dataset?.normalizedUrl === 'string' ? dataset.normalizedUrl : '';
    const sourceType = typeof dataset?.sourceType === 'string' ? dataset.sourceType : '';
    const isLocalSource = normalizedUrl.startsWith('file://')
      || sourceType.startsWith('local_')
      || runtimeFiles.length > 0
      || sourceFiles.some((source: any) => !source?.url && source?.persistedFile?.fileId);
    if (!isLocalSource) return dataset;
    if (sourceFiles.length > 0 && sourceFiles.every((source: any) => source?.persistedFile?.fileId)) {
      return { ...dataset, sourceFiles };
    }
    if (runtimeFiles.length === 0) {
      throw new Error('Local session was not saved because its complete source file is no longer available for durable persistence.');
    }
    if (sourceFiles.length === 0) {
      const persisted = await Promise.all(runtimeFiles.map(uploadProjectSourceFile));
      return {
        ...dataset,
        sourceFiles: persisted.map((persistedFile, index) => ({
          name: persistedFile.originalName,
          rows: runtimeFiles.length === 1 ? Number(dataset?.rows_count) || 0 : 0,
          columns: runtimeFiles.length === 1 && Array.isArray(dataset?.columns) ? dataset.columns.length : 0,
          persistedFile,
          runtimeIndex: index,
        })),
      };
    }
    for (let index = 0; index < sourceFiles.length; index += 1) {
      if (sourceFiles[index]?.persistedFile?.fileId) continue;
      const file = runtimeFiles.find((candidate: File) => candidate.name === sourceFiles[index]?.name) ?? runtimeFiles[index];
      if (!file) continue;
      sourceFiles[index] = { ...sourceFiles[index], persistedFile: await uploadProjectSourceFile(file) };
    }
    const missing = sourceFiles.filter((source: any) => !source?.persistedFile?.fileId);
    if (missing.length > 0) {
      throw new Error(`Local session was not saved because ${missing.length} complete source file${missing.length === 1 ? '' : 's'} could not be persisted.`);
    }
    return { ...dataset, sourceFiles };
  };

  const saveCurrentWorkspaceSession = async (dataset: any, options: { silent?: boolean } = {}) => {
    if (dataset?.status !== 'ready') return null;
    if (!options.silent) {
      setIsSavingSession(true);
      setSessionStatus(null);
    }
    try {
      const durableDataset = await ensureLocalSourcesPersisted(dataset);
      const saved = await saveWorkspaceSession(createSaveRequest(durableDataset));
      setWorkspaceSessions(current => [saved, ...current.filter(item => item.id !== saved.id)].slice(0, 100));
      deps.setCurrentDataset((current: any) => current ? { ...current, sourceFiles: durableDataset.sourceFiles, restoredFromSessionId: saved.id } : current);
      if (!options.silent) setSessionStatus('Session saved.');
      return saved;
    } catch (error) {
      setSessionStatus(error instanceof Error ? error.message : 'Could not save session.');
      return null;
    } finally {
      if (!options.silent) setIsSavingSession(false);
    }
  };

  const handleSaveWorkspaceSession = async () => {
    const saved = await saveCurrentWorkspaceSession(deps.currentDataset);
    if (saved && deps.currentDataset) {
      lastAutoSaveSignatureRef.current = sessionSignature({ ...deps.currentDataset, restoredFromSessionId: saved.id });
    }
  };

  const resetAnalysisState = (sessionId: string) => {
    useAnalysisExportStore.getState().clearPlan();
    deps.setWorkspaceState(createWorkspaceUnderstandingState({ type: 'dataset', datasetId: sessionId }));
    deps.setDecisionTrustReport(null);
    deps.setPendingLocalBatch(null);
    deps.setSelectedTopic(null);
    deps.setResult(null);
    deps.setPreviewActionId(null);
  };

  const attachAnalysisIdentityRevalidation = (dataset: any, identity: AnalysisSessionIdentityV1 | null) => {
    if (!identity || !dataset) return dataset;
    const validation = revalidateAnalysisSessionSourceIdentity(identity, dataset);
    return {
      ...dataset,
      restoredAnalysisSessionIdentity: identity,
      analysisIdentityRevalidation: {
        sourceValid: validation.valid,
        blockers: validation.blockers,
        currentPlanRequired: true,
        exportAuthorityRestored: false,
      },
    };
  };

  const handleOpenWorkspaceSession = async (session: WorkspaceSessionRecord) => {
    useAnalysisExportStore.getState().clearPlan();
    const savedAnalysisIdentity = parseAnalysisSessionIdentity((session.snapshot as any)?.analysisSessionIdentity);
    const restoredDataset = (session.snapshot as any)?.currentDataset;
    if (!restoredDataset) {
      setSessionStatus('Saved session does not contain a dataset snapshot.');
      return;
    }
    const restoredUrl = typeof restoredDataset.normalizedUrl === 'string' ? restoredDataset.normalizedUrl : '';
    const onlineUrl = (!restoredUrl.startsWith('file://') ? restoredUrl : '')
      || restoredDataset.sourceFiles?.find((source: any) => typeof source?.url === 'string' && !source.url.startsWith('file://'))?.url;
    if (onlineUrl) {
      setSessionStatus('Refreshing the saved online source...');
      try {
        const candidate = createSourceCandidate(onlineUrl);
        if ('status' in candidate) throw new Error(('message' in candidate && candidate.message) || 'The saved online source URL is no longer valid.');
        const inspection = await inspectOnlineSource(candidate);
        if (inspection.status !== 'accessible') throw new Error(inspection.message || 'The saved online source is not accessible.');
        const applied = await applyHomeOnlineSourceInspection(inspection, {
          registerAdvancedSource: deps.registerAdvancedSource,
          setCurrentDataset: value => deps.setCurrentDataset((current: any) => {
            const next = typeof value === 'function' ? value(current) : value;
            return attachAnalysisIdentityRevalidation({ ...next, restoredFromSessionId: session.id }, savedAnalysisIdentity);
          }),
          setWorkspaceState: deps.setWorkspaceState,
          setDecisionTrustReport: deps.setDecisionTrustReport,
          resetAnalysis: () => {
            deps.setPendingLocalBatch(null);
            deps.setSelectedTopic(null);
            deps.setResult(null);
            deps.setPreviewActionId(null);
          },
        });
        if (!applied) throw new Error('The saved online source could not be restored.');
        setSessionStatus('Online source refreshed. The complete source is ready for analysis.');
        return;
      } catch (error) {
        setSessionStatus(error instanceof Error ? error.message : 'Could not refresh the saved online source.');
      }
    }
    const persistedFiles = persistedFilesFromSession(session);
    if (persistedFiles.length > 0) {
      setSessionStatus('Reloading saved source files...');
      try {
        const files = await Promise.all(persistedFiles.map(downloadProjectSourceFile));
        const results = await Promise.all(files.map((file, index) => {
          const candidate = createFileSourceCandidate(file);
          if ('status' in candidate) return Promise.resolve(candidate as SourceInspectionResult);
          return inspectLocalFile(candidate as SourceCandidate).then(result => attachPersistedFile(result, persistedFiles[index]));
        }));
        if (results.filter(result => result.status === 'accessible').length !== files.length) {
          throw new Error('One or more saved files could not be parsed after reload.');
        }
        const families = classifyDatasetFamilies(files.map((file, index) => ({ file, result: results[index] as SourceInspectionResult })), 'strict');
        if (restoredDataset.sourceType === 'canonical_multisource') {
          const memberships = restoredDataset.canonicalMultiSourcePersistence?.memberships ?? [];
          const drafts = Object.fromEntries(files.map((file, index) => {
            const membership = memberships.find((item: any) => item?.overlay?.binding?.datasetId === file.name);
            const declarations = Array.isArray(membership?.overlay?.sourceEvidenceDeclarations) ? membership.overlay.sourceEvidenceDeclarations : [];
            const latest = (kind: string) => declarations.filter((item: any) => item?.validationStatus === 'valid' && item?.value?.kind === kind).at(-1)?.value;
            const role = latest('source_role');
            const documentIdentity = latest('document_identity');
            const period = latest('reporting_period');
            const currency = latest('reporting_currency');
            return [`${index}:${file.name}`, {
              selected: Boolean(membership), role: role?.role === 'unknown_other' ? '' : role?.role ?? '', documentColumn: documentIdentity?.physicalColumn ?? '',
              periodStart: period?.start ?? '', periodEnd: period?.end ?? '', currency: currency?.currency ?? '',
              monetaryColumns: Array.isArray(currency?.monetaryColumns) ? currency.monetaryColumns.join(', ') : '',
            } satisfies MultiSourceDraftV1];
          }));
          deps.setCurrentDataset(null);
          deps.setMultiSourceDrafts(drafts);
          deps.setMultiSourceBuildResult({ relationshipState: null, blockers: ['Saved evidence was reloaded. Rebuild the relationship before analysis; prior executable handoffs remain invalid.'] });
          deps.setPendingLocalBatch({ files, status: 'ready', results, families, selectedFamilyId: null, isRestored: true, step: 'family_selection', businessOverview: createBusinessFusionOverview(families) });
          setSessionStatus('Sources reloaded. Review source-bound evidence and rebuild the governed multi-source dataset.');
          return;
        }
        if (restoredDataset.sourceType === 'business_fusion_view') {
          throw new Error('Legacy fused sessions are production-ineligible. Re-import the original sources and build a governed multi-source dataset.');
        }
        const family = families[0];
        const rawSemanticRows = family.files.flatMap(item => {
          if (item.result.status !== 'accessible') return [];
          const md = item.result.metadata;
          return md?.is_workbook && md.default_sheet && md.sheets ? md.sheets[md.default_sheet]?.semantic_rows || md.sheets[md.default_sheet]?.preview_rows || [] : md?.semantic_rows || md?.preview_rows || [];
        });
        const rawAnalysisRows = family.files.flatMap(item => {
          if (item.result.status !== 'accessible') return [];
          const md = item.result.metadata;
          return md?.is_workbook && md.default_sheet && md.sheets ? md.sheets[md.default_sheet]?.analysis_rows || [] : md?.analysis_rows || [];
        });
        const first = family.files.find(item => item.result.status === 'accessible');
        const firstMd = first?.result.status === 'accessible' ? first.result.metadata : null;
        const rawPreviewRows = firstMd?.is_workbook && firstMd.default_sheet && firstMd.sheets ? firstMd.sheets[firstMd.default_sheet]?.preview_rows || [] : firstMd?.preview_rows || [];
        const sourceFiles = family.files.map(item => {
          const md = item.result.status === 'accessible' ? item.result.metadata : null;
          return {
            name: item.file.name,
            rows: md?.is_workbook && md.default_sheet && md.sheets?.[md.default_sheet] ? md.sheets[md.default_sheet].rows_count : md?.rows_count ?? 0,
            columns: family.columns.length, fingerprint: family.schemaFingerprint, persistedFile: md?.persisted_file,
            sheetNames: md?.is_workbook && md.default_sheet ? [md.default_sheet] : [],
          };
        });
        const selectedSheet = firstMd?.is_workbook && firstMd.default_sheet && firstMd.sheets
          ? firstMd.sheets[firstMd.default_sheet]
          : null;
        const canonicalSourceBoundary = first && family.files.length === 1
          ? createLocalCanonicalSourceBoundary({
            datasetId: restoredDataset.file_name || family.name,
            columns: family.columns,
            semanticRows: rawSemanticRows,
            semanticSample: selectedSheet?.semantic_sample ?? firstMd?.semantic_sample,
            profile: selectedSheet?.canonical_full_file_profile ?? firstMd?.canonical_full_file_profile,
            file: first.file,
            sheetName: firstMd?.is_workbook ? firstMd.default_sheet : undefined,
          })
          : undefined;
        const semanticSample = {
          strategy: rawSemanticRows.length >= family.totalRows ? 'full' : 'matrix_sample',
          sourceRowCount: family.totalRows,
          sampleRowCount: rawSemanticRows.length,
        };
        if (canonicalSourceBoundary) {
          deps.registerAdvancedSource(createAdvancedWorkspaceSourceFromFamily({
            family,
            sourceName: restoredDataset.file_name || family.name,
            semanticSample,
            canonicalSourceBoundary,
            canonicalUserOverlay: parseCanonicalUserOverlay(restoredDataset.canonicalUserOverlay) ?? undefined,
          }));
        }
        deps.setCurrentDataset(attachAnalysisIdentityRevalidation({
          ...restoredDataset, status: canonicalSourceBoundary ? 'ready' : 'stale', file_name: restoredDataset.file_name || family.name,
          rows_count: family.totalRows, columns: family.columns, profiles: family.profiles,
          sourceType: family.files[0]?.result.status === 'accessible' ? family.files[0].result.sourceType : restoredDataset.sourceType,
          sourceFiles, file_reference: first?.file ?? null,
          runtimeDatasetSource: canonicalSourceBoundary?.runtimeSource,
          canonicalSourceBoundary,
          semanticSample,
          analysisRowScope: rawAnalysisRows.length >= family.totalRows ? 'full' : 'not_retained',
          semanticRows: rawSemanticRows, analysisRows: rawAnalysisRows,
          previewRows: createPreviewRows(rawPreviewRows, family.columns), restoredFromSessionId: session.id,
        }, savedAnalysisIdentity));
        resetAnalysisState(session.id);
        setSessionStatus(canonicalSourceBoundary
          ? 'Session opened from the complete saved source file.'
          : 'Saved sample restored. Reselect the complete source before analysis.');
        return;
      } catch (error) {
        const missingPath = persistedFiles.map(file => file.filePath).join(', ');
        setSessionStatus(`${error instanceof Error ? error.message : 'Could not reload saved source file.'} Missing path: ${missingPath}. Showing saved snapshot.`);
      }
    }
    deps.setCurrentDataset(attachAnalysisIdentityRevalidation({ ...restoredDataset, status: 'stale', file_reference: null, runtimeDatasetSource: undefined, canonicalSourceBoundary: undefined, restoredFromSessionId: session.id }, savedAnalysisIdentity));
    resetAnalysisState(session.id);
    setSessionStatus('This legacy session needs its original local file. Choose the same source to relink and update the saved session.');
    deps.requestLocalFileReselection?.(session);
  };

  const handleDeleteWorkspaceSession = async (sessionId: string) => {
    setSessionStatus(null);
    try {
      await deleteWorkspaceSession(sessionId);
      setWorkspaceSessions(current => current.filter(session => session.id !== sessionId));
      if (deps.currentDataset?.restoredFromSessionId === sessionId) {
        deps.setCurrentDataset((dataset: any) => dataset ? { ...dataset, restoredFromSessionId: undefined } : dataset);
      }
      setSessionStatus('Session deleted.');
    } catch (error) {
      setSessionStatus(error instanceof Error ? error.message : 'Could not delete session.');
    }
  };

  useEffect(() => {
    const sessionId = (location.state as { restoreWorkspaceSessionId?: string } | null)?.restoreWorkspaceSessionId;
    if (!sessionId || returnSessionRestoredRef.current === sessionId || workspaceSessions.length === 0) return;
    const saved = workspaceSessions.find(item => item.id === sessionId);
    if (!saved) return;
    returnSessionRestoredRef.current = sessionId;
    void handleOpenWorkspaceSession(saved).finally(() => navigate('/', { replace: true, state: null }));
  }, [location.state, navigate, workspaceSessions]);

  return {
    workspaceSessions, sessionStatus, isSavingSession, lastAutoSaveSignatureRef, sessionSignature, refreshWorkspaceSessions,
    createWorkspaceSessionSaveRequest: createSaveRequest,
    saveCurrentWorkspaceSession, handleSaveWorkspaceSession, handleOpenWorkspaceSession, handleDeleteWorkspaceSession,
  };
}
