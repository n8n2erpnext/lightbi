import { getApiBaseUrl } from '../lib/api-base';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Loader2, ChevronRight, Database, Plus, FileSpreadsheet, Link, Server, Code, Sparkles, Layers, Monitor, Globe, Save, Trash2, History, FolderOpen, X } from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import { useDatasetUpload } from '../hooks/useDatasetUpload';
import { motion, AnimatePresence } from 'framer-motion';
import { homeGuidance } from '../content/home-guidance';
import { DataIntakeDrawer } from '../components/data-intake/DataIntakeDrawer';
import type { DataIntakeRequest } from '../lib/data-intake';
import { selectHeroSuggestionPool, getStructuredPool } from '../lib/home-persona';
import type { HeroSuggestionPrompt } from '../lib/home-persona';
import { createSourceCandidate, createFileSourceCandidate } from '../lib/source-preflight';
import type { SourceCandidate, SourceInspectionResult } from '../lib/source-preflight';
import { inspectLocalFile } from '../lib/local-file-inspector';
import { createPreviewRows } from '../lib/data-intake-preview-rows';
import { classifyDatasetFamilies } from '../lib/batch-inspection';
import type { DatasetFamily } from '../lib/batch-inspection';
import { generateRecipePlan } from '../lib/recipe-planner';
import type { RecipePlan } from '../lib/recipe-planner';
import type { WorkspaceUnderstandingState } from '../lib/workspace-understanding-state';
import { createWorkspaceUnderstandingState, getActiveAnalysisContextLabel } from '../lib/workspace-understanding-state';
import { DatasetUnderstandingCard } from '../components/analysis/DatasetUnderstandingCard';
import { UnderstandingNextCard } from '../components/analysis/UnderstandingNextCard';
import { CanonicalEvidenceReview } from '../components/analysis/CanonicalEvidenceReview';
import { CanonicalMultiSourceReview, type MultiSourceDraftV1, type MultiSourceReviewSourceV1 } from '../components/analysis/CanonicalMultiSourceReview';
import {
  getOrBuildCanonicalConsumerArtifact,
  prepareCanonicalInvestigationHandoff,
} from '../lib/understanding-core/canonical-consumer-boundary';
import { buildCanonicalMultiSourceDataset, buildCanonicalMultiSourceMemberArtifact, prepareCanonicalMultiSourceInvestigationHandoff, type CanonicalMultiSourceDatasetV1 } from '../lib/understanding-core/canonical-multisource-boundary';
import { projectCanonicalArtifactToUnderstandingNext } from '../lib/canonical-consumer-presentation-adapter';
import { presentCanonicalConsumerArtifact, type CanonicalRemediationOperationV1 } from '../lib/understanding-core/canonical-consumer-presentation-contract';
import type { AnalysisAction } from '../lib/analysis-opportunity-actions';
import { createRuntimeIntentFromAnalysisAction } from '../lib/analysis-runtime-contract';
import { createRuntimePlanPreview } from '../lib/runtime-planner-preview';
import { createInvestigationSession } from '../lib/investigation-session';
import { generateCanonicalAIBriefing } from '../lib/canonical-ai-briefing';
import { useLocation, useNavigate } from 'react-router-dom';
import { createVirtualDatasetPlan } from '../lib/virtual-dataset-planner';
import type { VirtualDatasetPlan } from '../lib/virtual-dataset-planner';
import { VirtualDatasetPlanPreview } from '../components/analysis/VirtualDatasetPlanPreview';
import { createRuntimePreview } from '../lib/runtime-preview';
import type { RuntimePreview } from '../lib/runtime-preview';
import { RuntimePreviewCard } from '../components/analysis/RuntimePreviewCard';
import { evaluateExecutionGuard } from '../lib/execution-guard';
import type { ExecutionGuardResult } from '../lib/execution-guard';
import { ExecutionGuardNotice } from '../components/analysis/ExecutionGuardNotice';
import { createDuckDBLogicalPlan } from '../lib/duckdb-logical-plan';
import type { DuckDBLogicalPlan } from '../lib/duckdb-logical-plan';
import { createRuntimeBoundaryArtifact } from '../lib/runtime-boundary-contract';
import { DuckDBLogicalPlanPreview } from '../components/analysis/DuckDBLogicalPlanPreview';
import { createExpectedResultContract } from '../lib/expected-result-contract';
import type { ExpectedResultContract } from '../lib/expected-result-contract';
import { ExpectedResultPreview } from '../components/analysis/ExpectedResultPreview';
import { selectFirstNonEmptyRows } from '../lib/row-surface';
import { compileSafeQuery } from '../lib/safe-sql-compiler';
import type { CompiledQueryContract } from '../lib/safe-sql-compiler';
import { CompiledQueryPreview } from '../components/analysis/CompiledQueryPreview';
import { createSandboxExecutionRequest, evaluateSandboxPolicy } from '../lib/runtime-sandbox-policy';
import type { SandboxExecutionRequest, SandboxEvaluationResult } from '../lib/runtime-sandbox-policy';
import { SandboxPolicyPreview } from '../components/analysis/SandboxPolicyPreview';
import { createPreviewResultContract } from '../lib/preview-result-contract';
import type { PreviewResultContract } from '../lib/preview-result-contract';
import { PreviewResultContractCard } from '../components/analysis/PreviewResultContractCard';
import { calculateDatasetHealth } from '../lib/dataset-health-engine';
import { DataQualityCard } from '../components/data-intake/DataQualityCard';
import { DecisionTrustReportCard } from '../components/analysis/DecisionTrustReportCard';
import { BusinessViewSummaryCard } from '../components/analysis/BusinessViewSummaryCard';
import { useDisplayPreferences } from '../stores/display-preferences-store';
import { formatValue } from '../lib/display-formatter';
import { ExecutionRunCoordinator } from '@lightbi/runtime';
import { advancedSourceId, useAdvancedSourceStore } from '../stores/advanced-source-store';
import { createDecisionTrustReport, type DecisionTrustReport } from '../lib/decision-trust-report';
import { createBusinessFusionOverview, type BusinessFusionOverview } from '../lib/business-fusion-overview';
import { BusinessFusionOpportunityCard } from '../components/analysis/BusinessFusionOpportunityCard';
import { deleteWorkspaceSession, loadWorkspaceSessions, saveWorkspaceSession, type SaveWorkspaceSessionRequest, type WorkspaceSessionRecord } from '../lib/workspace-session-api';
import { downloadProjectSourceFile, uploadProjectSourceFile, type PersistedProjectSourceFile } from '../lib/project-source-file-api';
import type { GuidedInvestigationResult } from '../lib/guided-investigation-pipeline';
import type { DatasetUnderstanding } from '../lib/dataset-understanding-contract';
import { createCanonicalSourceBoundary, type CanonicalFullFileProfileV1, type CanonicalSourceBoundaryV1 } from '../lib/understanding-core/canonical-source-boundary';
import { appendCanonicalEvidenceDeclaration, createCanonicalUserOverlay, parseCanonicalUserOverlay, type CanonicalUserOverlayV1 } from '../lib/understanding-core/canonical-user-overlay';

const WORKSPACE_SESSION_ROW_LIMIT = 250;

function limitSessionRows(rows: unknown): unknown[] {
  return Array.isArray(rows) ? rows.slice(0, WORKSPACE_SESSION_ROW_LIMIT) : [];
}

function compactSemanticSample(sample: any) {
  if (!sample || typeof sample !== 'object') return sample;
  return {
    strategy: sample.strategy,
    sourceRowCount: Number(sample.sourceRowCount) || 0,
    sampleRowCount: Number(sample.sampleRowCount) || 0,
  };
}

function createWorkspaceSessionSnapshot(dataset: any) {
  const analysisRows = limitSessionRows(dataset.analysisRows);
  const semanticRows = limitSessionRows(dataset.semanticRows);
  const understandingRows = limitSessionRows(dataset.understandingRows);
  return {
    version: 2,
    savedAt: new Date().toISOString(),
    rowRetentionLimit: WORKSPACE_SESSION_ROW_LIMIT,
    currentDataset: {
      status: 'ready',
      file_name: dataset.file_name,
      rows_count: dataset.rows_count,
      columns: Array.isArray(dataset.columns) ? dataset.columns : [],
      profiles: dataset.profiles || {},
      sourceType: dataset.sourceType,
      normalizedUrl: dataset.normalizedUrl,
      sourceFiles: dataset.sourceFiles || [],
      selected_sheet: dataset.selected_sheet ?? null,
      semanticSample: compactSemanticSample(dataset.semanticSample),
      analysisRowScope: dataset.analysisRows?.length > WORKSPACE_SESSION_ROW_LIMIT ? 'retained_sample' : dataset.analysisRowScope,
      semanticRows,
      analysisRows,
      previewRows: limitSessionRows(dataset.previewRows).slice(0, 100),
      understandingColumns: dataset.understandingColumns,
      understandingRows,
      understandingProfiles: dataset.understandingProfiles,
      understandingSourceRowCount: dataset.understandingSourceRowCount,
      selectedBusinessView: dataset.selectedBusinessView,
      businessFusionOverview: dataset.businessFusionOverview,
      objectKey: dataset.objectKey,
      canonicalUserOverlay: parseCanonicalUserOverlay(dataset.canonicalUserOverlay),
      canonicalMultiSourcePersistence: dataset.canonicalMultiSourceDataset ? {
        schemaVersion: dataset.canonicalMultiSourceDataset.schemaVersion,
        multiSourceDatasetId: dataset.canonicalMultiSourceDataset.multiSourceDatasetId,
        identity: dataset.canonicalMultiSourceDataset.identity,
        stateGeneration: dataset.canonicalMultiSourceDataset.stateGeneration,
        relationshipArtifactId: dataset.canonicalMultiSourceDataset.relationshipArtifactId,
        relationshipState: dataset.canonicalMultiSourceDataset.relationship.validationState,
        memberships: dataset.canonicalMultiSourceDataset.orderedSourceMemberships.map((member: any) => ({
          sourceId: member.sourceId,
          sourceFingerprint: member.sourceFingerprint,
          inspectionGeneration: member.inspectionGeneration,
          profileGeneration: member.profileGeneration,
          sourceRole: member.sourceRole,
          required: member.required,
          overlay: member.overlay,
        })),
        executableRestored: false,
        reselectionRequiredWhenRuntimeFilesUnavailable: true,
      } : undefined,
    },
  };
}

function persistedFilesFromSession(session: WorkspaceSessionRecord): PersistedProjectSourceFile[] {
  const summary = Array.isArray(session.sourceSummary) ? session.sourceSummary : [];
  const fromSummary = summary
    .map((item: any) => item?.persistedFile)
    .filter(Boolean) as PersistedProjectSourceFile[];
  if (fromSummary.length > 0) return fromSummary;

  const snapshotFiles = (session.snapshot as any)?.currentDataset?.sourceFiles;
  return (Array.isArray(snapshotFiles) ? snapshotFiles : [])
    .map((item: any) => item?.persistedFile)
    .filter(Boolean) as PersistedProjectSourceFile[];
}

function attachPersistedFile(
  result: SourceInspectionResult,
  persistedFile: PersistedProjectSourceFile | null
): SourceInspectionResult {
  if (result.status !== 'accessible' || !persistedFile) return result;
  return {
    ...result,
    metadata: {
      ...result.metadata,
      persisted_file: persistedFile,
    },
  };
}

function createLocalCanonicalSourceBoundary(args: {
  datasetId: string;
  columns: string[];
  semanticRows: Record<string, unknown>[];
  semanticSample?: { strategy: 'full' | 'matrix_sample'; source_row_count: number; sample_row_count: number; row_indexes?: number[] };
  profile?: CanonicalFullFileProfileV1 & { fullFileUnderstanding: CanonicalSourceBoundaryV1['fullFileUnderstanding'] };
  file?: File;
  sheetName?: string;
}): CanonicalSourceBoundaryV1 | undefined {
  if (!args.profile || !args.file || !args.semanticRows.length || !args.semanticSample) return undefined;
  return createCanonicalSourceBoundary({
    datasetId: args.datasetId,
    columns: args.columns,
    semanticRows: args.semanticRows,
    semanticSample: {
      strategy: args.semanticSample.strategy,
      sourceRowCount: args.semanticSample.source_row_count,
      rowIndexes: args.semanticSample.row_indexes,
    },
    fullFileProfile: args.profile,
    fullFileUnderstanding: args.profile.fullFileUnderstanding,
    runtimeFiles: [{ file: args.file, sheetName: args.sheetName }],
  });
}

function unavailableGuidedInvestigation(): GuidedInvestigationResult | null {
  return null;
}

function unavailableLegacyUnderstanding(): DatasetUnderstanding | null {
  return null;
}

const getGreeting = () => {
    // TODO: Pass display_name when auth exists
    const display_name = null;
    const hour = new Date().getHours();
    const period = hour < 12
      ? 'Good morning'
      : hour < 18
        ? 'Good afternoon'
        : hour < 22
          ? 'Good evening'
          : 'Working late';
    if (display_name) return `${period}, ${display_name} 👋`;
    return `${period} 👋`;
};

function familyFromInspectionResult(
  inspectionResult: SourceInspectionResult,
  fallbackName: string
): DatasetFamily | null {
  if (inspectionResult.status !== 'accessible') return null;
  const metadata = inspectionResult.metadata;
  const defaultSheet = metadata.is_workbook && metadata.default_sheet && metadata.sheets
    ? metadata.sheets[metadata.default_sheet]
    : null;
  const columns = defaultSheet?.columns ?? metadata.columns ?? [];
  const profiles = defaultSheet?.profiles ?? metadata.profiles ?? {};
  const totalRows = defaultSheet?.rows_count ?? metadata.rows_count ?? 0;
  const file = inspectionResult.file ?? new File([], fallbackName);
  return {
    id: `source_${fallbackName}`.toLowerCase().replace(/[^a-z0-9_-]+/g, '-'),
    name: fallbackName,
    schemaFingerprint: columns.map(column => column.trim().toLocaleLowerCase()).join('|'),
    files: [{ file, result: inspectionResult }],
    totalRows,
    columns,
    profiles,
  };
}

export const Home: React.FC = () => {
  const { preferences } = useDisplayPreferences();
  const navigate = useNavigate();
  const location = useLocation();
  const [currentDataset, setCurrentDataset] = useState<any>(null);
  const [isDataPreviewOpen, setIsDataPreviewOpen] = useState(false);
  const [workspaceSessions, setWorkspaceSessions] = useState<WorkspaceSessionRecord[]>([]);
  const [sessionStatus, setSessionStatus] = useState<string | null>(null);
  const [isSavingSession, setIsSavingSession] = useState(false);
  const registerAdvancedSource = useAdvancedSourceStore(state => state.registerSource);
  const [workspaceState, setWorkspaceState] = useState<WorkspaceUnderstandingState | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [analysisIntent, setAnalysisIntent] = useState<string | null>(null);
  type PendingLocalFileBatch = {
    files: File[];
    status: "reading" | "ready" | "error";
    results: (SourceInspectionResult | null)[];
    families: DatasetFamily[];
    selectedFamilyId: string | null;
    isRestored?: boolean;
    step: "family_selection";
    businessOverview?: BusinessFusionOverview | null;
  };
  const [pendingLocalBatch, setPendingLocalBatch] = useState<PendingLocalFileBatch | null>(null);
  const [multiSourceDrafts, setMultiSourceDrafts] = useState<Record<string, MultiSourceDraftV1>>({});
  const [multiSourceBuilding, setMultiSourceBuilding] = useState(false);
  const [multiSourceBuildResult, setMultiSourceBuildResult] = useState<{ relationshipState: CanonicalMultiSourceDatasetV1['relationship']['validationState'] | null; blockers: string[] }>({ relationshipState: null, blockers: [] });
  const [lastInspectedFamilies, setLastInspectedFamilies] = useState<DatasetFamily[] | null>(null);
  const [decisionTrustReport, setDecisionTrustReport] = useState<DecisionTrustReport | null>(null);
  const [canonicalOverlayRebuildState, setCanonicalOverlayRebuildState] = useState<'idle' | 'pending' | 'succeeded' | 'failed'>('idle');
  const [canonicalReviewTarget, setCanonicalReviewTarget] = useState<CanonicalRemediationOperationV1 | null>(null);
  const canonicalReviewReturnItem = useRef<string | null>(null);
  const inspectionRuns = useRef(new ExecutionRunCoordinator('simple-inspection'));
  const lastAutoSaveSignatureRef = useRef<string>("");

  useEffect(() => () => inspectionRuns.current.cancel(), []);

  const refreshWorkspaceSessions = useCallback(async () => {
    try {
      const records = await loadWorkspaceSessions();
      setWorkspaceSessions(records);
    } catch (error) {
      setSessionStatus(error instanceof Error ? error.message : 'Could not load saved sessions.');
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void loadWorkspaceSessions()
      .then(records => {
        if (!cancelled) setWorkspaceSessions(records);
      })
      .catch(error => {
        if (!cancelled) setSessionStatus(error instanceof Error ? error.message : 'Could not load saved sessions.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const handleFocus = () => {
      void refreshWorkspaceSessions();
    };
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
      name: file?.name,
      rows: file?.rows,
      fileId: file?.persistedFile?.fileId,
      path: file?.persistedFile?.filePath,
    })),
    analysisRows: Array.isArray(dataset?.analysisRows) ? dataset.analysisRows.length : 0,
    understandingRows: Array.isArray(dataset?.understandingRows) ? dataset.understandingRows.length : 0,
    objectKey: dataset?.objectKey,
    selectedView: dataset?.selectedBusinessView?.id,
    canonicalOverlayId: parseCanonicalUserOverlay(dataset?.canonicalUserOverlay)?.overlayId ?? null,
    canonicalMultiSourceIdentity: dataset?.canonicalMultiSourceDataset?.identity ?? null,
  });

  const createWorkspaceSessionSaveRequest = (dataset: any): SaveWorkspaceSessionRequest => {
    const columns = Array.isArray(dataset.columns) ? dataset.columns : [];
    return {
      id: dataset.restoredFromSessionId,
      title: dataset.file_name || 'Untitled session',
      sourceType: dataset.sourceType || 'dataset',
      rowCount: Number(dataset.rows_count) || 0,
      columnCount: columns.length,
      sourceSummary: dataset.sourceFiles || [],
      snapshot: createWorkspaceSessionSnapshot(dataset),
    };
  };

  const saveCurrentWorkspaceSession = async (dataset: any, options: { silent?: boolean } = {}) => {
    if (dataset?.status !== 'ready') return null;
    if (!options.silent) {
      setIsSavingSession(true);
      setSessionStatus(null);
    }
    try {
      const saved = await saveWorkspaceSession(createWorkspaceSessionSaveRequest(dataset));
      setWorkspaceSessions(current => [saved, ...current.filter(item => item.id !== saved.id)].slice(0, 100));
      setCurrentDataset((dataset: any) => dataset ? { ...dataset, restoredFromSessionId: saved.id } : dataset);
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
    const saved = await saveCurrentWorkspaceSession(currentDataset);
    if (saved && currentDataset) {
      lastAutoSaveSignatureRef.current = sessionSignature({ ...currentDataset, restoredFromSessionId: saved.id });
    }
  };

  const handleOpenWorkspaceSession = async (session: WorkspaceSessionRecord) => {
    const restoredDataset = (session.snapshot as any)?.currentDataset;
    if (!restoredDataset) {
      setSessionStatus('Saved session does not contain a dataset snapshot.');
      return;
    }
    const persistedFiles = persistedFilesFromSession(session);
    if (persistedFiles.length > 0) {
      setSessionStatus('Reloading saved source files...');
      try {
        const files = await Promise.all(persistedFiles.map(sourceFile => downloadProjectSourceFile(sourceFile)));
        const results = await Promise.all(files.map((file, index) => {
          const candidate = createFileSourceCandidate(file);
          if ('status' in candidate) return Promise.resolve(candidate as SourceInspectionResult);
          return inspectLocalFile(candidate as SourceCandidate).then(result => attachPersistedFile(result, persistedFiles[index]));
        }));
        const accessible = results.filter(result => result.status === 'accessible');
        if (accessible.length !== files.length) {
          throw new Error('One or more saved files could not be parsed after reload.');
        }
        const items = files.map((file, index) => ({ file, result: results[index] as SourceInspectionResult }));
        const families = classifyDatasetFamilies(items, 'strict');

        if (restoredDataset.sourceType === 'canonical_multisource') {
          const persistedMemberships = restoredDataset.canonicalMultiSourcePersistence?.memberships ?? [];
          const restoredDrafts = Object.fromEntries(files.map((file, index) => {
            const membership = persistedMemberships.find((item: any) => item?.overlay?.binding?.datasetId === file.name);
            const declarations = Array.isArray(membership?.overlay?.sourceEvidenceDeclarations) ? membership.overlay.sourceEvidenceDeclarations : [];
            const latest = (kind: string) => declarations.filter((item: any) => item?.validationStatus === 'valid' && item?.value?.kind === kind).at(-1)?.value;
            const role = latest('source_role');
            const documentIdentity = latest('document_identity');
            const period = latest('reporting_period');
            const currency = latest('reporting_currency');
            return [`${index}:${file.name}`, {
              selected: Boolean(membership),
              role: role?.role ?? 'unknown_other',
              documentColumn: documentIdentity?.physicalColumn ?? '',
              periodStart: period?.start ?? '',
              periodEnd: period?.end ?? '',
              currency: currency?.currency ?? '',
              monetaryColumns: Array.isArray(currency?.monetaryColumns) ? currency.monetaryColumns.join(', ') : '',
            } satisfies MultiSourceDraftV1];
          }));
          setCurrentDataset(null);
          setMultiSourceDrafts(restoredDrafts);
          setMultiSourceBuildResult({ relationshipState: null, blockers: ['Saved evidence was reloaded. Rebuild the relationship before analysis; prior executable handoffs remain invalid.'] });
          setPendingLocalBatch({ files, status: 'ready', results, families, selectedFamilyId: null, isRestored: true, step: 'family_selection', businessOverview: createBusinessFusionOverview(families) });
          setSessionStatus('Sources reloaded. Review source-bound evidence and rebuild the governed multi-source dataset.');
          return;
        }

        if (restoredDataset.sourceType === 'business_fusion_view') throw new Error('Legacy fused sessions are production-ineligible. Re-import the original sources and build a governed multi-source dataset.');

        {
          const family = families[0];
          const rawSemanticRows = family.files.flatMap(item => {
            if (item.result.status !== 'accessible') return [];
            const md = item.result.metadata;
            if (md?.is_workbook && md.default_sheet && md.sheets) {
              return md.sheets[md.default_sheet]?.semantic_rows || md.sheets[md.default_sheet]?.preview_rows || [];
            }
            return md?.semantic_rows || md?.preview_rows || [];
          });
          const rawAnalysisRows = family.files.flatMap(item => {
            if (item.result.status !== 'accessible') return [];
            const md = item.result.metadata;
            if (md?.is_workbook && md.default_sheet && md.sheets) {
              return md.sheets[md.default_sheet]?.analysis_rows || [];
            }
            return md?.analysis_rows || [];
          });
          const first = family.files.find(item => item.result.status === 'accessible');
          const firstMd = first?.result.status === 'accessible' ? first.result.metadata : null;
          const rawPreviewRows = firstMd?.is_workbook && firstMd.default_sheet && firstMd.sheets
            ? firstMd.sheets[firstMd.default_sheet]?.preview_rows || []
            : firstMd?.preview_rows || [];
          const sourceFiles = family.files.map(item => {
            const md = item.result.status === 'accessible' ? item.result.metadata : null;
            return {
              name: item.file.name,
              rows: md?.is_workbook && md.default_sheet && md.sheets?.[md.default_sheet]
                ? md.sheets[md.default_sheet].rows_count
                : md?.rows_count ?? 0,
              columns: family.columns.length,
              fingerprint: family.schemaFingerprint,
              persistedFile: md?.persisted_file,
              sheetNames: md?.is_workbook && md.default_sheet ? [md.default_sheet] : []
            };
          });
          setCurrentDataset({
            ...restoredDataset,
            status: 'ready',
            file_name: restoredDataset.file_name || family.name,
            rows_count: family.totalRows,
            columns: family.columns,
            profiles: family.profiles,
            sourceType: family.files[0]?.result.status === 'accessible' ? family.files[0].result.sourceType : restoredDataset.sourceType,
            sourceFiles,
            file_reference: null,
            runtimeDatasetSource: undefined,
            semanticSample: {
              strategy: rawSemanticRows.length >= family.totalRows ? 'full' : 'matrix_sample',
              sourceRowCount: family.totalRows,
              sampleRowCount: rawSemanticRows.length
            },
            analysisRowScope: rawAnalysisRows.length >= family.totalRows ? 'full' : 'not_retained',
            semanticRows: rawSemanticRows,
            analysisRows: rawAnalysisRows,
            previewRows: createPreviewRows(rawPreviewRows, family.columns),
            restoredFromSessionId: session.id,
          });
        }
        setWorkspaceState(createWorkspaceUnderstandingState({ type: 'dataset', datasetId: session.id }));
        setDecisionTrustReport(null);
        setPendingLocalBatch(null);
        setSelectedTopic(null);
        setResult(null);
        setPreviewActionId(null);
        setSessionStatus('Session opened from saved source file.');
        return;
      } catch (error) {
        const missingPath = persistedFiles.map(file => file.filePath).join(', ');
        setSessionStatus(`${error instanceof Error ? error.message : 'Could not reload saved source file.'} Missing path: ${missingPath}. Showing saved snapshot.`);
      }
    }
    setCurrentDataset({
      ...restoredDataset,
      status: 'ready',
      file_reference: null,
      runtimeDatasetSource: undefined,
      restoredFromSessionId: session.id,
    });
    setWorkspaceState(createWorkspaceUnderstandingState({ type: 'dataset', datasetId: session.id }));
    setDecisionTrustReport(null);
    setPendingLocalBatch(null);
    setSelectedTopic(null);
    setResult(null);
    setPreviewActionId(null);
    setSessionStatus('Session opened.');
  };

  const handleDeleteWorkspaceSession = async (sessionId: string) => {
    setSessionStatus(null);
    try {
      await deleteWorkspaceSession(sessionId);
      setWorkspaceSessions(current => current.filter(session => session.id !== sessionId));
      if (currentDataset?.restoredFromSessionId === sessionId) {
        setCurrentDataset((dataset: any) => dataset ? { ...dataset, restoredFromSessionId: undefined } : dataset);
      }
      setSessionStatus('Session deleted.');
    } catch (error) {
      setSessionStatus(error instanceof Error ? error.message : 'Could not delete session.');
    }
  };

  const returnSessionRestoredRef = useRef<string | null>(null);
  useEffect(() => {
    const sessionId = (location.state as { restoreWorkspaceSessionId?: string } | null)?.restoreWorkspaceSessionId;
    if (!sessionId || returnSessionRestoredRef.current === sessionId || workspaceSessions.length === 0) return;
    const saved = workspaceSessions.find(item => item.id === sessionId);
    if (!saved) return;
    returnSessionRestoredRef.current = sessionId;
    void handleOpenWorkspaceSession(saved).finally(() => navigate('/', { replace: true, state: null }));
  }, [location.state, navigate, workspaceSessions]);


  const [isAsking, setIsAsking] = useState(false);
  const [result, setResult] = useState<any>(null);
  
  const questionInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [questionPlaceholder, setQuestionPlaceholder] = useState("Ask a question about your data...");
  const [previewActionId, setPreviewActionId] = useState<string | null>(null);
  const [isPlusMenuOpen, setIsPlusMenuOpen] = useState(false);
  const [isReplaceMenuOpen, setIsReplaceMenuOpen] = useState(false);
  const [activeConnection, setActiveConnection] = useState<DataIntakeRequest | null>(null);

  // Debounce input: detect source candidate from URL pattern only.
  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmed = inputValue.trim();
      if (!trimmed) {
        setAnalysisIntent(null);
        return;
      }
      const candidateOrError = createSourceCandidate(trimmed);
      if (!('status' in candidateOrError)) {
        // Valid candidate recognized, open Data Intake Drawer
        setActiveConnection({
          sourceKind: "online_link",
          sourceType: candidateOrError.sourceType,
          label: candidateOrError.label,
          requiresInput: true,
          nextStep: "url_input",
          initialUrl: trimmed
        });
        setInputValue("");
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [inputValue]);

  const openLocalFilePicker = () => {
    setIsPlusMenuOpen(false);
    setIsReplaceMenuOpen(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const openOnlineDataDrawer = () => {
    setIsPlusMenuOpen(false);
    setIsReplaceMenuOpen(false);
    setQuestionPlaceholder("Paste Google Sheet, Microsoft 365, OneDrive, CSV, or Excel URL...");
    setActiveConnection({
      sourceKind: "online_link",
      sourceType: "online_link",
      label: "Online Data",
      requiresInput: true,
      nextStep: "url_input",
    });
  };

  const openDatabaseDrawer = () => {
    setIsPlusMenuOpen(false);
    setIsReplaceMenuOpen(false);
    setActiveConnection({
      sourceKind: "system",
      sourceType: "database",
      label: "Database System",
      requiresInput: true,
      nextStep: "connection_form",
    });
  };

  const { isUploading, uploadError } = useDatasetUpload();
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);

  const handleSelectAnalysisAction = async (action: AnalysisAction) => {
    // Use the typed adapter helper — no `as any` needed
    const intent = createRuntimeIntentFromAnalysisAction(action);
    const plan = createRuntimePlanPreview(intent);
    
    // Attempt to extract rows if available from current dataset state
    const datasetRows = canonicalRows;
    console.log("TRACE [OPPORTUNITY] selectedAction.id:", action.id);

    const multiSourceDataset = currentDataset?.canonicalMultiSourceDataset as CanonicalMultiSourceDatasetV1 | undefined;
    const multiSourceAnalysis = multiSourceDataset?.analyses.find((item) => item.actionCandidateId === action.id && item.state === 'ready');
    const canonicalHandoff = multiSourceDataset && multiSourceAnalysis
      ? prepareCanonicalMultiSourceInvestigationHandoff(multiSourceDataset, multiSourceAnalysis.analysisId) ?? undefined
      : canonicalArtifact
        ? prepareCanonicalInvestigationHandoff(canonicalArtifact, action.id)
        : undefined;
    const aiBriefing = canonicalArtifact
      ? generateCanonicalAIBriefing(canonicalArtifact)
      : undefined;

    let datasetForSession = currentDataset;
    if (currentDataset?.status === 'ready') {
      const saved = await saveCurrentWorkspaceSession(currentDataset, { silent: true });
      if (saved) {
        datasetForSession = { ...currentDataset, restoredFromSessionId: saved.id };
        lastAutoSaveSignatureRef.current = sessionSignature(datasetForSession);
      }
    }

    createInvestigationSession(
      currentDataset?.file_name || 'dataset',
      action,
      intent,
      plan,
      datasetRows,
      aiBriefing,
      currentDataset?.runtimeDatasetSource,
      currentDataset?.runtimeDatasetSource
        ? 'full_file'
        : currentDataset?.analysisRows?.length
          ? 'retained_rows'
          : currentDataset?.semanticRows?.length
            ? 'semantic_sample'
            : 'preview',
      currentDataset?.businessFusionOverview,
      datasetForSession?.status === 'ready' ? createWorkspaceSessionSaveRequest(datasetForSession) : undefined,
      canonicalHandoff,
      multiSourceDataset
    );
    navigate('/investigation');
  };

  const [isInputFocused, setIsInputFocused] = useState(false);
  const [recipePreview, setRecipePreview] = useState<RecipePlan | null>(null);
  const [selectedVirtualPlan, setSelectedVirtualPlan] = useState<VirtualDatasetPlan | null>(null);
  const [runtimePreview, setRuntimePreview] = useState<RuntimePreview | null>(null);
  const [acceptedRuntimePreview, setAcceptedRuntimePreview] = useState<RuntimePreview | null>(null);
  const [executionGuardResult, setExecutionGuardResult] = useState<ExecutionGuardResult | null>(null);
  const [selectedLogicalPlan, setSelectedLogicalPlan] = useState<DuckDBLogicalPlan | null>(null);
  const [expectedResultContract, setExpectedResultContract] = useState<ExpectedResultContract | null>(null);
  const [compiledQueryContract, setCompiledQueryContract] = useState<CompiledQueryContract | null>(null);
  const [sandboxRequest, setSandboxRequest] = useState<SandboxExecutionRequest | null>(null);
  const [sandboxEvaluation, setSandboxEvaluation] = useState<SandboxEvaluationResult | null>(null);
  const [previewResultContract, setPreviewResultContract] = useState<PreviewResultContract | null>(null);

  const datasetHealthResult = React.useMemo(() => {
    if (currentDataset?.status === 'ready' && currentDataset.sourceType !== "virtual_business_view" && currentDataset.profiles) {
      const pseudoFamily: DatasetFamily = {
        id: currentDataset.file_name || 'dataset_1',
        name: currentDataset.file_name || 'Dataset 1',
        schemaFingerprint: "hash",
        files: [],
        columns: Object.keys(currentDataset.profiles),
        profiles: currentDataset.profiles,
        totalRows: 1000
      };
      return calculateDatasetHealth(pseudoFamily);
    }
    return null;
  }, [currentDataset]);

  type AnalysisMode = "explore" | "investigate" | "ask";
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>("explore");
  const [selectedPerspective, setSelectedPerspective] = useState<string | null>(null);
  const [selectedBusinessView, setSelectedBusinessView] = useState<string | null>(null);
  
  const activeAnalysisIntent = analysisIntent || selectedTopic || null;

  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsPlusMenuOpen(false);
        setIsReplaceMenuOpen(false);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && menuRef.current.contains(e.target as Node)) {
        return;
      }
      const target = e.target as HTMLElement;
      if (target.closest('.source-picker-toggle')) {
         return;
      }
      setIsPlusMenuOpen(false);
      setIsReplaceMenuOpen(false);
    };

    if (isPlusMenuOpen || isReplaceMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isPlusMenuOpen, isReplaceMenuOpen]);

  const renderSourcePickerMenu = (isOpen: boolean, positionClass: string) => {
    if (!isOpen) return null;
    return (
      <div ref={menuRef} className={`absolute ${positionClass} w-64 overflow-hidden rounded-lg border border-black/10 bg-white py-2 text-left shadow-lg z-20 animate-in fade-in slide-in-from-top-2 duration-200`}>
        <button
          onClick={openLocalFilePicker}
          className="flex w-full items-center px-4 py-3 text-[14px] font-medium text-[#202123] transition-colors hover:bg-black/[0.035]"
        >
          <Monitor className="mr-3 h-4 w-4 text-black/55" strokeWidth={1.7} />
          My Computer
        </button>
        <button
          onClick={openOnlineDataDrawer}
          className="flex w-full items-center px-4 py-3 text-[14px] font-medium text-[#202123] transition-colors hover:bg-black/[0.035]"
        >
          <Globe className="mr-3 h-4 w-4 text-black/55" strokeWidth={1.7} />
          Online Data
        </button>
        <button
          onClick={openDatabaseDrawer}
          className="flex w-full items-center px-4 py-3 text-[14px] font-medium text-[#202123] transition-colors hover:bg-black/[0.035]"
        >
          <Server className="mr-3 h-4 w-4 text-black/55" strokeWidth={1.7} />
          Database System
        </button>
      </div>
    );
  };

  // Pool selection ONLY uses real dataset columns (status === "ready").
  const selectedPoolKey = React.useMemo(() => {
    if (currentDataset?.status !== 'ready') return 'default';
    const columns = currentDataset?.columns || [];
    return selectHeroSuggestionPool({ dataColumns: columns });
  }, [currentDataset]);

  // Legacy presentation branches remain mounted for compatibility, but no legacy
  // detector or understanding-next orchestrator participates in the selected path.
  const guidedInvestigationResult = unavailableGuidedInvestigation();
  const datasetUnderstanding = unavailableLegacyUnderstanding();

  const canonicalRows = React.useMemo(
    () => selectFirstNonEmptyRows(
      currentDataset?.understandingRows,
      currentDataset?.analysisRows,
      currentDataset?.semanticRows,
      currentDataset?.previewRows,
      currentDataset?.rows
    ) as Record<string, unknown>[],
    [currentDataset]
  );

  const canonicalArtifact = React.useMemo(() => {
    if (currentDataset?.status !== 'ready' || !Array.isArray(currentDataset.columns)) return null;
    const sourceType = String(currentDataset.sourceType || 'unknown');
    const sourceKind = ['postgresql', 'mysql', 'mariadb', 'mongodb_atlas', 'sqlite'].includes(sourceType)
      ? 'database_table'
      : ['google_sheets', 'm365_excel', 'csv_url', 'excel_url'].includes(sourceType)
        ? 'online_file'
        : sourceType === 'local_xlsx' || sourceType === 'local_csv' || sourceType === 'local_json' || sourceType === 'local_file'
          ? 'local_file'
          : sourceType === 'api_response'
            ? 'api_response'
            : 'unknown';
    return getOrBuildCanonicalConsumerArtifact({
      datasetId: currentDataset.file_name || 'dataset',
      sourceLabel: currentDataset.file_name || 'dataset',
      sourceKind,
      columns: currentDataset.understandingColumns ?? currentDataset.columns,
      rows: canonicalRows,
      sourceRowCount: Number(currentDataset.understandingSourceRowCount ?? currentDataset.rows_count ?? canonicalRows.length),
      sheet: currentDataset.selected_sheet ?? undefined,
      sourceBoundary: currentDataset.canonicalSourceBoundary,
      userOverlay: parseCanonicalUserOverlay(currentDataset.canonicalUserOverlay) ?? undefined,
    });
  }, [canonicalRows, currentDataset]);

  const datasetUnderstandingNext = React.useMemo(
    () => canonicalArtifact ? projectCanonicalArtifactToUnderstandingNext(canonicalArtifact) : null,
    [canonicalArtifact]
  );
  const canonicalPresentation = React.useMemo(
    () => canonicalArtifact ? presentCanonicalConsumerArtifact(canonicalArtifact, {
      stale: canonicalOverlayRebuildState === 'pending' || canonicalOverlayRebuildState === 'failed',
    }) : null,
    [canonicalArtifact, canonicalOverlayRebuildState]
  );

  useEffect(() => {
    if (canonicalOverlayRebuildState !== 'pending') return;
    const expected = parseCanonicalUserOverlay(currentDataset?.canonicalUserOverlay)?.overlayId;
    if (!expected || !canonicalArtifact || canonicalArtifact.overlayIdentity !== expected) return;
    setCanonicalOverlayRebuildState(canonicalArtifact.status === 'valid' && canonicalArtifact.overlayValidation.valid ? 'succeeded' : 'failed');
  }, [canonicalArtifact, canonicalOverlayRebuildState, currentDataset?.canonicalUserOverlay]);

  useEffect(() => {
    if (canonicalOverlayRebuildState !== 'succeeded' || !canonicalReviewReturnItem.current) return;
    const itemId = canonicalReviewReturnItem.current;
    canonicalReviewReturnItem.current = null;
    window.requestAnimationFrame(() => document.getElementById(`analysis-item-${itemId}`)?.focus());
  }, [canonicalOverlayRebuildState, canonicalArtifact]);

  const handleCanonicalOverlayChange = useCallback((overlay: CanonicalUserOverlayV1) => {
    setCanonicalOverlayRebuildState('pending');
    setSelectedTopic(null);
    setResult(null);
    setPreviewActionId(null);
    setCurrentDataset((dataset: any) => dataset ? { ...dataset, canonicalUserOverlay: overlay } : dataset);
  }, []);

  const handleCanonicalRemediation = useCallback((operation: CanonicalRemediationOperationV1, itemId: string) => {
    canonicalReviewReturnItem.current = itemId;
    setCanonicalReviewTarget(operation);
  }, []);

  const activeBusinessViews = selectedPerspective && guidedInvestigationResult
    ? guidedInvestigationResult.businessViews.filter(v => v.perspectiveId === selectedPerspective)
    : [];
  const selectedViewData = (currentDataset?.sourceType === "virtual_business_view" && currentDataset.selectedBusinessView) 
    ? currentDataset.selectedBusinessView 
    : (activeBusinessViews.find(v => v.id === selectedBusinessView) || null);

  useEffect(() => {
    if (selectedBusinessView && activeBusinessViews) {
      if (!activeBusinessViews.some(v => v.id === selectedBusinessView)) {
        setSelectedBusinessView(null);
      }
    }
  }, [selectedBusinessView, activeBusinessViews]);

  const visibleQuestionSuggestions = React.useMemo(() => {
    if (currentDataset?.sourceType === 'virtual_business_view' && currentDataset.selectedBusinessView) {
      return currentDataset.selectedBusinessView.suggestedQuestions.map((q: any) => ({
        ...q,
        id: q.id,
        text: q.question,
        evidenceSignals: q.requiredDomains || [],
        confidenceScore: currentDataset.selectedBusinessView.confidence === 'HIGH' ? 95 : 75,
        type: q.intent
      }));
    }

    if (!guidedInvestigationResult || !selectedPerspective || !selectedBusinessView) return [];
    
    return guidedInvestigationResult.questionSuggestions.filter(q => 
      q.perspectiveId === selectedPerspective &&
      q.businessViewId === selectedBusinessView
    );
  }, [guidedInvestigationResult, selectedPerspective, selectedBusinessView]);

  const activePool = React.useMemo(() => getStructuredPool(selectedPoolKey), [selectedPoolKey]);
  
  const [activeChips, setActiveChips] = useState<HeroSuggestionPrompt[]>(() => {
    const defaultPool = getStructuredPool('default');
    const shuffled = [...defaultPool].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 4);
  });

  useEffect(() => {
    if (selectedPerspective && guidedInvestigationResult) {
      if (!guidedInvestigationResult.perspectives.some(p => p.id === selectedPerspective)) {
        setSelectedPerspective(null);
      }
    }
  }, [selectedPerspective, guidedInvestigationResult]);

  useEffect(() => {
    if (currentDataset?.status !== 'ready') return; // Keep default chips if no ready dataset
    const shuffled = [...activePool].sort(() => 0.5 - Math.random());
    setActiveChips(shuffled.slice(0, 4));
  }, [activePool, currentDataset]);

  const API_BASE_URL = getApiBaseUrl();

  useEffect(() => {
    const fetchCurrentSource = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/project/current-source`);
        if (res.ok) {
          const data = await res.json();
          if (data.has_source) {
            setCurrentDataset(data);
          }
        }
      } catch (err) {
        console.error("Failed to fetch current source", err);
      }
    };
    fetchCurrentSource();
    
  }, [API_BASE_URL]);

  useEffect(() => {
    if (isInputFocused) return;

    // Rotate 1 chip every 8 seconds
    const interval = setInterval(() => {
      setActiveChips(current => {
        const candidates = activePool.filter(c => !current.some(ch => ch.text === c.text));
        if (candidates.length === 0) return current;
        
        const indexToReplace = Math.floor(Math.random() * current.length);
        const replacement = candidates[Math.floor(Math.random() * candidates.length)];
        
        const next = [...current];
        next[indexToReplace] = replacement;
        return next;
      });
    }, 8000);

    return () => clearInterval(interval);
  }, [isInputFocused, activePool]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    
    setResult(null);
    setSelectedTopic(null);
    setPreviewActionId(null);
    setCurrentDataset(null);
    setWorkspaceState(null);
    setDecisionTrustReport(null);
    setCanonicalOverlayRebuildState('idle');

    // Close menus if they are open
    setIsPlusMenuOpen(false);
    setIsReplaceMenuOpen(false);

    // Clear any previously stored inspected families because we are starting a new batch.
    setLastInspectedFamilies(null);

    setPendingLocalBatch({
      files,
      status: "reading",
      results: new Array(files.length).fill(null),
      families: [],
      selectedFamilyId: null,
      step: "family_selection"
    });
    
    const inspectionRun = inspectionRuns.current.begin();

    // Persist and inspect files concurrently. Browser file inputs do not expose an absolute
    // local path, so LightBI keeps a project-scoped copy for future session reloads.
    const inspectionPromises = files.map(file => {
      const candidateOrError = createFileSourceCandidate(file);
      if ('status' in candidateOrError) {
        return Promise.resolve(candidateOrError as SourceInspectionResult);
      }
      const persistedFilePromise = uploadProjectSourceFile(file).catch(error => {
        console.warn("Could not persist project source file:", error);
        return null;
      });
      const inspectionPromise = inspectLocalFile(candidateOrError as SourceCandidate, { signal: inspectionRun.signal });
      return Promise.all([inspectionPromise, persistedFilePromise]).then(([result, persistedFile]) => (
        attachPersistedFile(result, persistedFile)
      )).catch(error => {
        if (inspectionRun.signal.aborted) throw error;
        return {
          status: 'not_found', sourceType: candidateOrError.sourceType, label: candidateOrError.label, message: "Error reading file."
        } as SourceInspectionResult;
      });
    });

    let results: SourceInspectionResult[];
    try {
      results = await Promise.all(inspectionPromises);
    } catch (error) {
      if (inspectionRun.signal.aborted) return;
      throw error;
    }
    
    if (!inspectionRuns.current.isCurrent(inspectionRun)) return;
    
    const hasError = results.every(r => r.status !== 'accessible');
    
    setPendingLocalBatch({
      files,
      status: hasError ? "error" : "ready",
      results,
      families: [],
      selectedFamilyId: null,
      step: "family_selection"
    });

    if (!hasError) {
      setMultiSourceDrafts(Object.fromEntries(files.map((file, index) => [`${index}:${file.name}`, {
        selected: true,
        role: 'unknown_other',
        documentColumn: '',
        periodStart: '',
        periodEnd: '',
        currency: '',
        monetaryColumns: '',
      } satisfies MultiSourceDraftV1])));
      setMultiSourceBuildResult({ relationshipState: null, blockers: [] });
      const items = files.map((file, idx) => ({ file, result: results[idx] as SourceInspectionResult }));
      const families = classifyDatasetFamilies(items, 'strict');
      
      let businessOverview: BusinessFusionOverview | null = null;

      try {
        if (families.length > 1) {
          businessOverview = createBusinessFusionOverview(families);
        }
      } catch (e) {
        console.error("Discovery error:", e);
        businessOverview = createBusinessFusionOverview(families);
      }
      
      setPendingLocalBatch({
        files,
        status: "ready",
        results,
        families,
        selectedFamilyId: families.length === 1 ? families[0].id : null,
        step: "family_selection",
        businessOverview
      });
      setLastInspectedFamilies(families);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    inspectionRuns.current.finish(inspectionRun);
  };

  const handleCancelInspection = () => {
    inspectionRuns.current.cancel();
    setPendingLocalBatch(null);
  };

  const multiSourceReviewSources = React.useMemo<MultiSourceReviewSourceV1[]>(() => {
    if (!pendingLocalBatch || pendingLocalBatch.status !== 'ready') return [];
    return pendingLocalBatch.files.flatMap((file, index) => {
      const result = pendingLocalBatch.results[index];
      if (!result || result.status !== 'accessible') return [];
      const metadata = result.metadata;
      const selected = metadata.is_workbook && metadata.default_sheet && metadata.sheets
        ? metadata.sheets[metadata.default_sheet]
        : metadata;
      return [{ key: `${index}:${file.name}`, name: file.name, rowCount: selected.rows_count ?? 0, columns: selected.columns ?? [] }];
    });
  }, [pendingLocalBatch]);

  const handleBuildCanonicalMultiSource = async () => {
    if (!pendingLocalBatch || pendingLocalBatch.status !== 'ready') return;
    setMultiSourceBuilding(true);
    setMultiSourceBuildResult({ relationshipState: null, blockers: [] });
    try {
      const selected = pendingLocalBatch.files.flatMap((file, index) => {
        const key = `${index}:${file.name}`;
        const draft = multiSourceDrafts[key];
        const result = pendingLocalBatch.results[index];
        return draft?.selected && result?.status === 'accessible' ? [{ key, file, draft, result }] : [];
      });
      if (selected.length < 2) throw new Error('Select at least two accessible sources.');
      const members = selected.map(({ file, draft, result }) => {
        const metadata = result.metadata;
        const source = metadata.is_workbook && metadata.default_sheet && metadata.sheets
          ? metadata.sheets[metadata.default_sheet]
          : metadata;
        const boundary = createLocalCanonicalSourceBoundary({
          datasetId: file.name,
          columns: source.columns ?? [],
          semanticRows: source.semantic_rows ?? [],
          semanticSample: source.semantic_sample,
          profile: source.canonical_full_file_profile,
          file,
          sheetName: metadata.is_workbook ? metadata.default_sheet : undefined,
        });
        if (!boundary) throw new Error(`Full-source canonical boundary unavailable for ${file.name}.`);
        let overlay = createCanonicalUserOverlay(boundary);
        overlay = appendCanonicalEvidenceDeclaration(overlay, boundary, { evidenceType: 'source_role', value: { kind: 'source_role', role: draft.role }, scope: { level: 'source_file' } });
        if (draft.documentColumn) overlay = appendCanonicalEvidenceDeclaration(overlay, boundary, { evidenceType: 'document_identity', value: { kind: 'document_identity', physicalColumn: draft.documentColumn }, scope: { level: 'physical_column', physicalColumn: draft.documentColumn } });
        if (draft.periodStart && draft.periodEnd) overlay = appendCanonicalEvidenceDeclaration(overlay, boundary, { evidenceType: 'reporting_period', value: { kind: 'reporting_period', start: draft.periodStart, end: draft.periodEnd }, scope: { level: 'source_file' } });
        const monetaryColumns = draft.monetaryColumns.split(',').map((value) => value.trim()).filter(Boolean);
        if (draft.currency && monetaryColumns.length) overlay = appendCanonicalEvidenceDeclaration(overlay, boundary, { evidenceType: 'reporting_currency', value: { kind: 'reporting_currency', currency: draft.currency, monetaryColumns }, scope: { level: 'source_file' } });
        const built = buildCanonicalMultiSourceMemberArtifact({
          datasetId: boundary.datasetId,
          sourceKind: 'local_file',
          sourceLabel: file.name,
          columns: boundary.semanticSample.columns,
          rows: boundary.semanticSample.rows,
          sourceRowCount: boundary.sourceRowCount,
          sheet: metadata.is_workbook ? metadata.default_sheet : undefined,
          sourceBoundary: boundary,
          userOverlay: overlay,
        });
        if (built.status !== 'valid') throw new Error(`${file.name}: ${built.blockers.join(', ')}`);
        return { file, metadata, source, boundary, overlay, artifact: built, draft };
      });
      const built = await buildCanonicalMultiSourceDataset({
        multiSourceDatasetId: `multisource:${members.map((item) => item.boundary.sourceId).sort().join('|')}`,
        members: members.map((item) => ({ artifact: item.artifact, overlay: item.overlay, required: ['sales', 'accounting'].includes(item.draft.role) })),
      });
      if (built.status !== 'valid') throw new Error(built.blockers.join(', '));
      const analysis = built.dataset.analyses[0];
      const relationshipBlockers = [...new Set([...built.dataset.relationship.refusalReasons, ...analysis.blockers])];
      setMultiSourceBuildResult({ relationshipState: built.dataset.relationship.validationState, blockers: relationshipBlockers });
      const metricMember = built.dataset.orderedSourceMemberships.find((item) => item.sourceRole === 'accounting') ?? built.dataset.orderedSourceMemberships[0];
      const sourceRecord = members.find((item) => item.boundary.sourceId === metricMember.sourceId)!;
      const sourceFiles = members.map((item) => ({
        name: item.file.name,
        rows: item.boundary.sourceRowCount,
        columns: item.boundary.semanticSample.columns.length,
        sourceId: item.boundary.sourceId,
        role: built.dataset.orderedSourceMemberships.find((member) => member.sourceId === item.boundary.sourceId)?.sourceRole,
        persistedFile: item.metadata.persisted_file,
        sheetNames: item.metadata.is_workbook && item.metadata.default_sheet ? [item.metadata.default_sheet] : [],
      }));
      setCurrentDataset({
        status: 'ready',
        file_name: `Governed multi-source dataset (${members.length} sources)`,
        rows_count: built.dataset.orderedSourceMemberships.reduce((sum, item) => sum + item.boundary.sourceRowCount, 0),
        columns: metricMember.boundary.semanticSample.columns,
        profiles: sourceRecord.source.profiles ?? {},
        sourceType: 'canonical_multisource',
        sourceFiles,
        selected_sheet: sourceRecord.metadata.is_workbook ? sourceRecord.metadata.default_sheet : null,
        file_reference: sourceRecord.file,
        runtimeDatasetSource: metricMember.runtimeSource,
        semanticSample: {
          strategy: metricMember.semanticSampleScope.strategy,
          sourceRowCount: metricMember.semanticSampleScope.sourceRowCount,
          sampleRowCount: metricMember.semanticSampleScope.rows.length,
        },
        canonicalSourceBoundary: metricMember.boundary,
        canonicalUserOverlay: metricMember.overlay,
        canonicalMultiSourceDataset: built.dataset,
        analysisRowScope: 'not_retained',
        semanticRows: metricMember.semanticSampleScope.rows,
        analysisRows: [],
        previewRows: metricMember.semanticSampleScope.rows.slice(0, 100),
      });
      setDecisionTrustReport(null);
      setPendingLocalBatch(null);
    } catch (error) {
      setMultiSourceBuildResult({ relationshipState: null, blockers: [error instanceof Error ? error.message : String(error)] });
    } finally {
      setMultiSourceBuilding(false);
    }
  };

  const handleUseLocalDataset = () => {
    if (!pendingLocalBatch || pendingLocalBatch.status !== 'ready') return;
    
    let familyId = pendingLocalBatch.selectedFamilyId;
    if (!familyId && pendingLocalBatch.families.length === 1) {
      familyId = pendingLocalBatch.families[0].id;
    }
    
    if (!familyId) return;

    const family = pendingLocalBatch.families.find(f => f.id === familyId);
    if (!family) return;

    const newState = createWorkspaceUnderstandingState({ type: 'dataset', datasetId: family.id });
    setWorkspaceState(newState);

    // Build sourceFiles lineage with fingerprint
    const sourceFiles = family.files.map(item => {
      const isAccessible = item.result.status === 'accessible';
      const md = isAccessible ? (item.result as any).metadata : null;
      let rows = 0;
      let colsCount = 0;
      if (md) {
        rows = md.rows_count || 0;
        colsCount = (md.columns || []).length;
        if (md.is_workbook && md.default_sheet && md.sheets) {
          const sheet = md.sheets[md.default_sheet];
          if (sheet) {
            rows = sheet.rows_count || 0;
            colsCount = (sheet.columns || []).length;
          }
        }
      }
      return {
        name: item.file.name,
        rows,
        columns: colsCount,
        fingerprint: family.schemaFingerprint,
        persistedFile: md?.persisted_file,
        sheetNames: md?.is_workbook && md.default_sheet ? [md.default_sheet] : []
      };
    });

    const firstAccessible = family.files.find(item => item.result.status === 'accessible');
    const firstMd = firstAccessible ? (firstAccessible.result as any).metadata : null;
    let rawPreviewRows: any[] = [];
    const rawSemanticRows = family.files.flatMap(item => {
      if (item.result.status !== 'accessible') return [];
      const md = (item.result as any).metadata;
      if (md?.is_workbook && md.default_sheet && md.sheets) {
        return md.sheets[md.default_sheet]?.semantic_rows || md.sheets[md.default_sheet]?.preview_rows || [];
      }
      return md?.semantic_rows || md?.preview_rows || [];
    });
    const rawAnalysisRows = family.files.flatMap(item => {
      if (item.result.status !== 'accessible') return [];
      const md = (item.result as any).metadata;
      if (md?.is_workbook && md.default_sheet && md.sheets) {
        return md.sheets[md.default_sheet]?.analysis_rows || [];
      }
      return md?.analysis_rows || [];
    });
    if (firstMd) {
      if (firstMd.is_workbook && firstMd.default_sheet && firstMd.sheets) {
        rawPreviewRows = firstMd.sheets[firstMd.default_sheet]?.preview_rows || [];
      } else {
        rawPreviewRows = firstMd.preview_rows || [];
      }
    }
    const finalPreviewRows = createPreviewRows(rawPreviewRows, family.columns);
    const semanticSample = {
      strategy: rawSemanticRows.length >= family.totalRows ? 'full' : 'matrix_sample',
      sourceRowCount: family.totalRows,
      sampleRowCount: rawSemanticRows.length
    };
    console.log("TRACE [HOME] currentDataset.previewRows.length:", finalPreviewRows.length);

    const sourceName = pendingLocalBatch.families.length > 1 ? family.name : (family.files.length > 1 ? `Combined dataset (${family.files.length} files)` : family.files[0].file.name);
    const onlyItem = family.files.length === 1 && family.files[0].result.status === 'accessible' ? family.files[0] : null;
    const onlyMetadata = onlyItem?.result.status === 'accessible' ? onlyItem.result.metadata : null;
    const onlySheet = onlyMetadata?.is_workbook && onlyMetadata.default_sheet && onlyMetadata.sheets
      ? onlyMetadata.sheets[onlyMetadata.default_sheet]
      : null;
    const canonicalSourceBoundary = createLocalCanonicalSourceBoundary({
      datasetId: sourceName,
      columns: family.columns,
      semanticRows: rawSemanticRows,
      semanticSample: onlySheet?.semantic_sample ?? onlyMetadata?.semantic_sample,
      profile: onlySheet?.canonical_full_file_profile ?? onlyMetadata?.canonical_full_file_profile,
      file: onlyItem?.file,
      sheetName: onlyMetadata?.is_workbook ? onlyMetadata.default_sheet : undefined,
    });
    registerAdvancedSource({
      id: advancedSourceId((family.files[0].result as any).sourceType, sourceName),
      name: sourceName,
      sourceType: (family.files[0].result as any).sourceType,
      sourceKind: 'local_file',
      normalizedUrl: (family.files[0].result as any).normalizedUrl,
      tables: family.files.flatMap((item, fileIndex) => {
        if (item.result.status !== 'accessible') return [];
        const metadata = item.result.metadata;
        if (metadata.is_workbook && metadata.sheets) {
          return Object.entries(metadata.sheets).map(([sheetName, sheet]) => ({
            id: `${fileIndex}:${sheetName}`, name: family.files.length > 1 ? `${item.file.name} · ${sheetName}` : sheetName,
            rowCount: sheet.rows_count, columns: sheet.columns, profiles: sheet.profiles || {}, file: item.file, sheetName,
          }));
        }
        return [{ id: `${fileIndex}:data`, name: family.files.length > 1 ? item.file.name : 'data', rowCount: metadata.rows_count || 0, columns: metadata.columns || [], profiles: metadata.profiles || {}, file: item.file }];
      }),
      semanticSample,
      registeredAt: new Date().toISOString(),
    });

    setCurrentDataset({
      status: 'ready',
      file_name: sourceName,
      rows_count: family.totalRows,
      columns: family.columns,
      profiles: family.profiles,
      sourceType: (family.files[0].result as any).sourceType,
      normalizedUrl: (family.files[0].result as any).normalizedUrl,
      sourceFiles: sourceFiles as any, // Storing extended metadata format here
      selected_sheet: null,
      file_reference: family.files[0]?.file || null,
      runtimeDatasetSource: canonicalSourceBoundary?.runtimeSource ?? {
        kind: 'local_files',
        files: family.files.map(item => {
          const md = item.result.status === 'accessible' ? item.result.metadata : undefined;
          return {
            file: item.file,
            sheetName: md?.is_workbook ? md.default_sheet : undefined
          };
        }),
        sourceRowCount: family.totalRows
      },
      semanticSample,
      canonicalSourceBoundary,
      analysisRowScope: rawAnalysisRows.length >= family.totalRows ? 'full' : 'not_retained',
      semanticRows: rawSemanticRows,
      analysisRows: rawAnalysisRows,
      previewRows: finalPreviewRows
    });
    setDecisionTrustReport(createDecisionTrustReport(family));

    handleCancelInspection();
  };

  const askQuestion = async (q: string) => {
    if (!currentDataset) {
      setSelectedTopic(q);
      return;
    }
    
    setIsAsking(true);
    setResult(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/question/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q })
      });
      const data = await res.json();
      setResult({ ...data, originalQuestion: q });
    } catch (e) {
      console.error(e);
      alert("Failed to ask question.");
    } finally {
      setIsAsking(false);
    }
  };

  const getEChartsOption = (chartData: any) => {
    if (!chartData || !chartData.theme_metadata || !chartData.theme_metadata.data) return {};
    const meta = chartData.theme_metadata;
    const xAxisData = meta.data.map((row: any) => row[meta.xAxis]);
    const seriesData = meta.data.map((row: any) => Number(row[meta.yAxis[0]]));
    return {
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: xAxisData, axisLine: { lineStyle: { color: '#e5e7eb' } }, axisLabel: { color: '#4b5563' } },
      yAxis: { type: 'value', splitLine: { lineStyle: { color: '#f3f4f6' } }, axisLabel: { color: '#4b5563' } },
      series: [{ data: seriesData, type: 'line', smooth: true, areaStyle: { opacity: 0.1 }, itemStyle: { color: '#111827' } }]
    };
  };


  const datasetTrustScore = datasetHealthResult?.overall ?? null;
  const datasetTrustLabel = datasetTrustScore === null
    ? 'Waiting for data'
    : datasetTrustScore >= 85
      ? 'High trust'
      : datasetTrustScore >= 60
        ? 'Review recommended'
        : 'Needs cleaning';
  const datasetTrustClass = datasetTrustScore === null
    ? 'bg-black/[0.04] text-black/55'
    : datasetTrustScore >= 85
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : datasetTrustScore >= 60
        ? 'bg-amber-50 text-amber-700 border-amber-200'
        : 'bg-rose-50 text-rose-700 border-rose-200';

  const renderSessionHistoryPanel = (className = "") => (
    <div className={`bg-white border border-black/10 rounded-xl p-5 shadow-sm ${className}`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="flex items-center text-[12px] font-semibold uppercase tracking-wider text-gray-500">
          <History className="mr-2 h-4 w-4 text-gray-400" /> Session history
        </h3>
        <span className="text-[11px] text-gray-400">{workspaceSessions.length}</span>
      </div>
      {workspaceSessions.length > 0 ? (
        <div className="grid gap-2">
          {workspaceSessions.slice(0, 6).map(session => {
            const isActive = currentDataset?.restoredFromSessionId === session.id;
            return (
              <div key={session.id} className={`rounded-lg border p-3 transition-colors ${isActive ? 'border-emerald-200 bg-emerald-50/70' : 'border-gray-100 bg-white hover:border-gray-200'}`}>
                <div className="flex items-start justify-between gap-2">
                  <button
                    onClick={() => void handleOpenWorkspaceSession(session)}
                    className="min-w-0 flex-1 text-left"
                    title="Open saved session"
                  >
                    <div className="truncate text-[13px] font-semibold text-gray-900">{session.title}</div>
                    <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-[11px] text-gray-500">
                      <span>{formatValue(session.rowCount, 'number', preferences, { compact: true })} rows</span>
                      <span>{formatValue(session.columnCount, 'number', preferences, { compact: true })} columns</span>
                      <span>{session.sourceType}</span>
                    </div>
                  </button>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      onClick={() => void handleOpenWorkspaceSession(session)}
                      className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-blue-50 hover:text-blue-700"
                      title="Open session"
                    >
                      <FolderOpen className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => void handleDeleteWorkspaceSession(session.id)}
                      className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-700"
                      title="Delete session"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-gray-200 px-3 py-5 text-center">
          <div className="text-[13px] font-medium text-gray-700">No saved sessions yet</div>
          <div className="mt-1 text-[12px] text-gray-400">LightBI saves when you start an analysis or preview a chart.</div>
        </div>
      )}
      {sessionStatus && (
        <div className="mt-4 rounded-md bg-gray-50 px-3 py-2 text-[12px] text-gray-500">{sessionStatus}</div>
      )}
    </div>
  );

  return (
    <div className="flex-1 overflow-y-auto bg-[#fbfbfa] text-[#202123] font-sans" onClick={() => isPlusMenuOpen && setIsPlusMenuOpen(false)}>
      
      {/* Global Data Intake Drawer */}
      <DataIntakeDrawer 
        request={activeConnection} 
        onClose={() => setActiveConnection(null)} 
        onSourceInspected={(inspectionResult) => {
          if (inspectionResult.status !== 'accessible') return;
          const md = inspectionResult.metadata;
          let rows = md.rows_count || 0;
          let columns = md.columns || [];
          let profiles = md.profiles || {};
          let rawPreviewRows = md.preview_rows || [];
          let rawSemanticRows = md.semantic_rows || rawPreviewRows;
          let rawAnalysisRows = md.analysis_rows || [];
          const sheetNames: string[] = md.sheet_names || [];

          if (md.is_workbook && md.default_sheet && md.sheets) {
            const sheet = md.sheets[md.default_sheet];
            if (sheet) {
              rows = sheet.rows_count || 0;
              columns = sheet.columns || [];
              profiles = sheet.profiles || {};
              rawPreviewRows = sheet.preview_rows || [];
              rawSemanticRows = sheet.semantic_rows || rawPreviewRows;
              rawAnalysisRows = sheet.analysis_rows || [];
            }
          }

          const previewRows = createPreviewRows(rawPreviewRows, columns);
          const sourceLabel = md.name || inspectionResult.label;
          const selectedSemanticSample = md.is_workbook && md.default_sheet && md.sheets
            ? md.sheets[md.default_sheet]?.semantic_sample
            : md.semantic_sample;
          const selectedCanonicalProfile = md.is_workbook && md.default_sheet && md.sheets
            ? md.sheets[md.default_sheet]?.canonical_full_file_profile
            : md.canonical_full_file_profile;
          const canonicalSourceBoundary = createLocalCanonicalSourceBoundary({
            datasetId: sourceLabel,
            columns,
            semanticRows: rawSemanticRows,
            semanticSample: selectedSemanticSample,
            profile: selectedCanonicalProfile,
            file: inspectionResult.file,
            sheetName: md.default_sheet,
          });

          if (inspectionResult.file) {
            registerAdvancedSource({
              id: advancedSourceId(inspectionResult.sourceType, sourceLabel),
              name: sourceLabel,
              sourceType: inspectionResult.sourceType,
              sourceKind: 'online_link',
              normalizedUrl: inspectionResult.normalizedUrl,
              tables: md.is_workbook && md.sheets
                ? Object.entries(md.sheets).map(([sheetName, sheet]: [string, any]) => ({
                    id: `0:${sheetName}`, name: sheetName, rowCount: sheet.rows_count, columns: sheet.columns,
                    profiles: sheet.profiles || {}, file: inspectionResult.file!, sheetName,
                  }))
                : [{ id: '0:data', name: 'data', rowCount: rows, columns, profiles, file: inspectionResult.file }],
              semanticSample: selectedSemanticSample ? {
                strategy: selectedSemanticSample.strategy,
                sourceRowCount: selectedSemanticSample.source_row_count,
                sampleRowCount: selectedSemanticSample.sample_row_count,
              } : undefined,
              registeredAt: new Date().toISOString(),
            });
          }

          setCurrentDataset({
            status: 'ready',
            file_name: sourceLabel,
            rows_count: rows,
            columns,
            profiles,
            sourceType: inspectionResult.sourceType,
            normalizedUrl: inspectionResult.normalizedUrl,
            sourceFiles: [{
              name: sourceLabel,
              rows,
              columns: columns.length,
              fingerprint: `${inspectionResult.sourceType}:${columns.join('|')}`,
              url: inspectionResult.normalizedUrl,
              sheetNames
            }] as any,
            selected_sheet: md.default_sheet || null,
            file_reference: inspectionResult.file || null,
            runtimeDatasetSource: canonicalSourceBoundary?.runtimeSource ?? (inspectionResult.file ? {
              kind: 'local_files',
              files: [{ file: inspectionResult.file, sheetName: md.default_sheet }],
              sourceRowCount: rows
            } : undefined),
            canonicalSourceBoundary,
            semanticSample: selectedSemanticSample ? {
              strategy: selectedSemanticSample.strategy,
              sourceRowCount: selectedSemanticSample.source_row_count,
              sampleRowCount: selectedSemanticSample.sample_row_count
            } : undefined,
            analysisRowScope: md.is_workbook && md.default_sheet && md.sheets
              ? md.sheets[md.default_sheet]?.analysis_row_scope
              : md.analysis_row_scope,
            semanticRows: rawSemanticRows,
            analysisRows: rawAnalysisRows,
            previewRows
          });
          setWorkspaceState(createWorkspaceUnderstandingState({ type: 'dataset', datasetId: sourceLabel }));
          const trustFamily = familyFromInspectionResult(inspectionResult, sourceLabel);
          setDecisionTrustReport(trustFamily ? createDecisionTrustReport(trustFamily) : null);
          setResult(null);
          setSelectedTopic(null);
          setPreviewActionId(null);
        }}
      />

      <div className="mx-auto flex w-full max-w-[1280px] flex-col px-5 py-8 md:px-8 lg:px-10" onClick={e => e.stopPropagation()}>
        {!result && !isAsking && !selectedTopic && (
          <>
            {currentDataset?.status !== 'ready' && (
              <div className={`flex w-full flex-col items-center justify-center text-center ${pendingLocalBatch ? 'min-h-0 pb-8 pt-10' : 'min-h-[calc(100vh-130px)] pb-12'}`}>
                <div className="mb-4 rounded-full border border-black/10 bg-white/70 px-3 py-1.5 text-[13px] text-black/45 shadow-sm">{getGreeting()}</div>
                <div className="relative mb-8 flex w-full max-w-4xl justify-center">
                  <h1 className="text-[34px] font-medium tracking-normal text-[#202123] md:text-[44px]">
                    What should LightBI understand?
                  </h1>
                </div>

                <div className="relative flex w-full max-w-[820px] flex-col items-center">
                  <div className="relative flex w-full items-center rounded-[24px] border border-black/10 bg-white shadow-[0_22px_65px_rgba(15,23,42,0.10)] transition-shadow duration-300 focus-within:shadow-[0_28px_75px_rgba(15,23,42,0.14)]">
                    <button 
                      onClick={() => setIsPlusMenuOpen(!isPlusMenuOpen)}
                      className="source-picker-toggle absolute left-4 z-10 flex h-10 w-10 items-center justify-center rounded-xl text-black/55 transition-colors hover:bg-black/[0.04] hover:text-[#202123]"
                      title="Add data source"
                    >
                      <Plus className="h-5 w-5" />
                    </button>
                    
                    {renderSourcePickerMenu(isPlusMenuOpen, "top-16 left-0")}

                    <input 
                      ref={questionInputRef}
                      type="text" 
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onFocus={() => setIsInputFocused(true)}
                      onBlur={() => setIsInputFocused(false)}
                      onKeyDown={(e) => {
                          if (e.key === 'Enter' && inputValue.trim()) {
                              askQuestion(activeAnalysisIntent || inputValue.trim());
                              setInputValue("");
                          }
                      }}
                      placeholder={questionPlaceholder === "Ask a question about your data..." ? "Paste a sheet link, import a file, or ask what to analyze" : questionPlaceholder}
                      className="h-[78px] w-full rounded-[24px] border-0 bg-transparent pl-16 pr-6 text-[16px] text-[#202123] outline-none placeholder:text-black/30"
                    />
                  </div>

                  <div className="mt-4 flex min-h-[42px] flex-wrap content-start justify-center gap-2">
                    {activeChips.map((chip, idx) => {
                      const style = homeGuidance.heroChipCategoryStyles[chip.category] || homeGuidance.heroChipCategoryStyles.general;
                      return (
                        <div key={`slot-${idx}`} className="relative flex items-center justify-center">
                          <AnimatePresence mode="wait">
                            <motion.button 
                              key={chip.text} 
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.3 }}
                              onClick={() => {
                                setInputValue(chip.text);
                                setAnalysisIntent(chip.text);
                                askQuestion(chip.text);
                              }} 
                              className={`group flex items-center gap-2 whitespace-nowrap rounded-full border border-black/10 bg-white px-4 py-2 text-[13px] text-black/55 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-black/15 hover:bg-black/[0.025] hover:text-[#202123] hover:shadow-md ${style.hover}`}
                            >
                              <span className={`h-2 w-2 rounded-full flex-shrink-0 ${style.dot}`} />
                              <span>{chip.text}</span>
                            </motion.button>
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-9 grid w-full grid-cols-1 gap-3 md:grid-cols-3">
                    <button
                      onClick={openLocalFilePicker}
                      className="group rounded-[16px] border border-black/10 bg-white p-5 text-left shadow-sm transition-all duration-200 hover:-translate-y-1 hover:bg-white hover:shadow-lg"
                    >
                      <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-[12px] bg-emerald-50 text-emerald-600 shadow-sm transition-transform duration-200 group-hover:scale-105"><FileSpreadsheet className="h-5 w-5" strokeWidth={1.7} /></div>
                      <div className="text-[15px] font-medium text-[#202123]">Import local files</div>
                      <div className="mt-1 text-[13px] leading-5 text-black/45">Excel, CSV, JSON, TSV with matrix sampling and quality score.</div>
                    </button>
                    <button
                      onClick={openOnlineDataDrawer}
                      className="group rounded-[16px] border border-black/10 bg-white p-5 text-left shadow-sm transition-all duration-200 hover:-translate-y-1 hover:bg-white hover:shadow-lg"
                    >
                      <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-[12px] bg-blue-50 text-blue-600 shadow-sm transition-transform duration-200 group-hover:scale-105"><Link className="h-5 w-5" strokeWidth={1.7} /></div>
                      <div className="text-[15px] font-medium text-[#202123]">Connect online sheet</div>
                      <div className="mt-1 text-[13px] leading-5 text-black/45">Short or full links stay online-first, then LightBI builds a BA brief.</div>
                    </button>
                    <button
                      onClick={openDatabaseDrawer}
                      className="group rounded-[16px] border border-black/10 bg-white p-5 text-left shadow-sm transition-all duration-200 hover:-translate-y-1 hover:bg-white hover:shadow-lg"
                    >
                      <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-[12px] bg-violet-50 text-violet-600 shadow-sm transition-transform duration-200 group-hover:scale-105"><Server className="h-5 w-5" strokeWidth={1.7} /></div>
                      <div className="text-[15px] font-medium text-[#202123]">Connect database system</div>
                      <div className="mt-1 text-[13px] leading-5 text-black/45">Postgres, MySQL, MariaDB, MongoDB, SQLite, then LightBI builds a BA brief.</div>
                    </button>
                  </div>

                  {renderSessionHistoryPanel("mt-5 w-full text-left")}
                </div>
              </div>
            )}
          </>
        )}

        <input 
          type="file" 
          ref={fileInputRef} 
          multiple
          accept=".csv,.xlsx,.xls,.txt,.tsv,.json" 
          className="hidden" 
          onChange={handleFileChange} 
        />

        {uploadError && <div className="mb-4 text-[13px] text-red-500 bg-red-50 px-3 py-1.5 rounded-md border border-red-100">{uploadError}</div>}
        {isUploading && <div className="mb-4 flex items-center text-sm text-gray-500"><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading and analyzing data...</div>}

        {!result && !isAsking && !selectedTopic && (
          <div className={`w-full grid grid-cols-1 lg:grid-cols-3 ${pendingLocalBatch && currentDataset?.status !== 'ready' ? 'gap-5' : 'gap-8'} items-start pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500`}>
            {/* Main Column */}
            <div className={`flex flex-col gap-8 ${pendingLocalBatch && currentDataset?.status !== 'ready' ? 'mx-auto w-full max-w-3xl lg:col-span-3' : 'lg:col-span-2'}`}>
              
              {/* Data Status Card – only rendered when currentDataset.status === "ready" */}
              {currentDataset?.status === 'ready' && (
                <div className="w-full rounded-[18px] border border-black/10 bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="mt-0.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-black/[0.04] shadow-sm">
                        <Database className="h-5 w-5 text-black/65" strokeWidth={1.7} />
                      </div>
                      <div className="min-w-0">
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <p className="truncate text-[17px] font-semibold text-[#202123]">
                            {workspaceState ? getActiveAnalysisContextLabel(workspaceState, currentDataset.file_name) : currentDataset.file_name}
                          </p>
                          {(['virtual_business_view', 'business_fusion_view'].includes(currentDataset.sourceType) || workspaceState?.activeContext.type === "business_view") && (
                            <span className="rounded border border-violet-200 bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-700">Business View</span>
                          )}
                          <span className={`rounded border px-2 py-0.5 text-[11px] font-semibold ${datasetTrustClass}`}>
                            {datasetTrustScore === null ? datasetTrustLabel : `${datasetTrustLabel}: ${formatValue(datasetTrustScore, 'number', preferences)} / 100`}
                          </span>
                        </div>
                        {(['virtual_business_view', 'business_fusion_view'].includes(currentDataset.sourceType) || workspaceState?.activeContext.type === "business_view") ? (
                          <p className="text-[13px] text-black/50">Business view · {formatValue(currentDataset.businessFusionOverview?.sources?.length || currentDataset.selectedBusinessView?.datasets?.length || 0, 'number', preferences, { compact: true })} datasets · {formatValue(Array.isArray(currentDataset.columns) ? currentDataset.columns.length : 0, 'number', preferences, { compact: true })} columns</p>
                        ) : (
                          <>
                            <p className="text-[13px] text-black/50">{formatValue(currentDataset.rows_count, 'number', preferences, { compact: true })} rows · {formatValue(Array.isArray(currentDataset.columns) ? currentDataset.columns.length : 0, 'number', preferences, { compact: true })} columns</p>
                            {currentDataset.semanticSample?.strategy === 'matrix_sample' && (
                              <p className="mt-1 text-[12px] text-blue-700">
                                Understanding: {formatValue(currentDataset.semanticSample.sampleRowCount, 'number', preferences)} representative rows · Runtime: {currentDataset.runtimeDatasetSource ? 'full local file' : 'representative sample'}
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 lg:justify-end">
                    <button
                      onClick={handleSaveWorkspaceSession}
                      disabled={isSavingSession}
                      className="flex items-center gap-1.5 rounded-[10px] border border-black/10 bg-white px-3 py-2 text-[12px] font-medium text-black/65 shadow-sm transition-colors hover:bg-black/[0.035] disabled:cursor-not-allowed disabled:opacity-60"
                      title="Save current session"
                    >
                      {isSavingSession ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                      Save session
                    </button>
                    <button onClick={() => setIsDataPreviewOpen(true)} className="rounded-[10px] border border-black/10 bg-white px-3 py-2 text-[12px] font-medium text-black/65 shadow-sm transition-colors hover:bg-black/[0.035]">View Data</button>
                    {currentDataset.sourceType !== 'virtual_business_view' && currentDataset.file_reference && (
                      <button onClick={() => navigate('/advanced')} className="flex items-center gap-1.5 rounded-[10px] bg-[#202123] px-3 py-2 text-[12px] font-medium text-white shadow-sm transition-colors hover:bg-black"><Code className="h-3.5 w-3.5" /> Open Advanced</button>
                    )}
                    {lastInspectedFamilies && lastInspectedFamilies.length > 1 && (
                      <button 
                        onClick={() => {
                          setPendingLocalBatch({
                            files: [],
                            status: "ready",
                            results: [],
                            families: lastInspectedFamilies,
                            selectedFamilyId: null,
                            isRestored: true,
                            step: "family_selection"
                          });
                        }} 
                        className="rounded-[10px] border border-black/10 bg-white px-3 py-2 text-[12px] font-medium text-black/65 shadow-sm transition-colors hover:bg-black/[0.035]"
                      >
                        Change Group
                      </button>
                    )}
                    <div className="relative">
                      <button onClick={() => setIsReplaceMenuOpen(!isReplaceMenuOpen)} className="source-picker-toggle rounded-[10px] border border-black/10 bg-white px-3 py-2 text-[12px] font-medium text-black/65 shadow-sm transition-colors hover:bg-black/[0.035]">Replace Data</button>
                      {renderSourcePickerMenu(isReplaceMenuOpen, "top-10 right-0")}
                    </div>
                    </div>
                  </div>
                  <div className="mt-5 grid grid-cols-2 gap-3 border-t border-black/5 pt-4 md:grid-cols-4">
                    <div className="rounded-[14px] bg-[#f7f7f6] px-4 py-3">
                      <div className="text-[11px] font-medium uppercase tracking-wide text-black/40">Rows</div>
                      <div className="mt-1 text-[20px] font-semibold text-[#202123]">{formatValue(currentDataset.rows_count, 'number', preferences, { compact: true })}</div>
                    </div>
                    <div className="rounded-[14px] bg-[#f7f7f6] px-4 py-3">
                      <div className="text-[11px] font-medium uppercase tracking-wide text-black/40">Columns</div>
                      <div className="mt-1 text-[20px] font-semibold text-[#202123]">{formatValue(Array.isArray(currentDataset.columns) ? currentDataset.columns.length : 0, 'number', preferences, { compact: true })}</div>
                    </div>
                    <div className="rounded-[14px] bg-[#f7f7f6] px-4 py-3">
                      <div className="text-[11px] font-medium uppercase tracking-wide text-black/40">Data trust</div>
                      <div className="mt-1 text-[20px] font-semibold text-[#202123]">{datasetTrustScore === null ? 'Review' : `${formatValue(datasetTrustScore, 'number', preferences)} / 100`}</div>
                    </div>
                    <div className="rounded-[14px] bg-[#f7f7f6] px-4 py-3">
                      <div className="text-[11px] font-medium uppercase tracking-wide text-black/40">Runtime</div>
                      <div className="mt-1 text-[20px] font-semibold text-[#202123]">{currentDataset.runtimeDatasetSource ? 'Full file' : 'Sample'}</div>
                    </div>
                  </div>
                </div>
              )}

              {datasetHealthResult && (
                <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col gap-4">
                  <DataQualityCard health={datasetHealthResult} />
                  {decisionTrustReport && <DecisionTrustReportCard report={decisionTrustReport} />}
                  
                  {/* Dataset Understanding Layer */}
                  {datasetUnderstandingNext ? (
                    <>
                      <UnderstandingNextCard
                        understanding={datasetUnderstandingNext}
                        onSelectAction={handleSelectAnalysisAction}
                        canonicalPresentation={canonicalPresentation ?? undefined}
                        onRemediate={handleCanonicalRemediation}
                      />
                      {canonicalArtifact && (
                        <CanonicalEvidenceReview
                          artifact={canonicalArtifact}
                          overlay={parseCanonicalUserOverlay(currentDataset.canonicalUserOverlay)}
                          rebuildState={canonicalOverlayRebuildState}
                          onChange={handleCanonicalOverlayChange}
                          target={canonicalReviewTarget}
                        />
                      )}
                      {currentDataset?.canonicalMultiSourceDataset && (
                        <section data-testid="active-canonical-multisource" className="rounded-xl border border-black/10 bg-white p-4 shadow-sm">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div><h3 className="text-[14px] font-semibold text-[#202123]">Governed multi-source relationship</h3><p className="mt-1 text-[12px] text-black/55">{currentDataset.canonicalMultiSourceDataset.orderedSourceMemberships.length} independently profiled sources participate.</p></div>
                            <span className="rounded-md border border-black/10 bg-gray-50 px-2 py-1 text-[11px] font-semibold">{currentDataset.canonicalMultiSourceDataset.relationship.validationState}</span>
                          </div>
                          <div className="mt-3 grid gap-2 sm:grid-cols-2">
                            {currentDataset.canonicalMultiSourceDataset.orderedSourceMemberships.map((member: any) => <div key={member.sourceId} className="rounded-lg border border-black/5 bg-[#fbfbfa] p-2"><p className="truncate text-[12px] font-semibold">{member.boundary.datasetId}</p><p className="mt-1 text-[11px] text-black/50">{member.sourceRole} · {member.boundary.sourceRowCount.toLocaleString()} rows</p></div>)}
                          </div>
                          {currentDataset.canonicalMultiSourceDataset.relationship.refusalReasons.length > 0 && <p className="mt-3 break-words text-[12px] text-amber-700">{currentDataset.canonicalMultiSourceDataset.relationship.refusalReasons.join(', ')}</p>}
                        </section>
                      )}
                    </>
                  ) : datasetUnderstanding ? (
                    <DatasetUnderstandingCard 
                      understanding={datasetUnderstanding} 
                      onSelectAction={handleSelectAnalysisAction}
                    />
                  ) : null}

                  {/* Global Perspective Selector */}
                  {!datasetUnderstandingNext && (
                  <>
                  <div className="w-full bg-white border border-gray-200 rounded-xl shadow-sm p-5 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-500 mt-2">
                    <div>
                      <h3 className="text-[16px] font-semibold text-gray-900 mb-1">Optional: Choose a deeper business perspective</h3>
                      <p className="text-[13px] text-gray-500">LightBI already understands the dataset. Choose a perspective only if you want advanced guided analysis.</p>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {!guidedInvestigationResult?.perspectives || guidedInvestigationResult.perspectives.length === 0 ? (
                        <div className="col-span-2 md:col-span-3 p-5 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-center">
                          <p className="text-sm text-gray-500">No reliable business perspectives found for this data yet.</p>
                        </div>
                      ) : (
                        guidedInvestigationResult.perspectives.map(p => (
                          <button
                            key={p.id}
                            onClick={() => {
                              setSelectedPerspective(p.id);
                              setSelectedBusinessView(null);
                            }}
                            className={`p-4 rounded-xl border text-left transition-all flex flex-col ${
                              selectedPerspective === p.id 
                                ? 'bg-blue-50 border-blue-500 shadow-sm ring-1 ring-blue-500' 
                                : 'bg-white border-gray-200 hover:border-blue-300 hover:bg-slate-50'
                            }`}
                          >
                            <div className={`font-semibold text-[14px] mb-1 ${selectedPerspective === p.id ? 'text-blue-900' : 'text-gray-800'}`}>
                              {p.label}
                            </div>
                            <div className={`text-[11px] leading-snug mb-2 ${selectedPerspective === p.id ? 'text-blue-700/80' : 'text-gray-500'}`}>
                              {p.description}
                            </div>
                            <div className="text-[10px] text-gray-400 font-medium border-t border-gray-100 pt-1.5 mt-auto w-full">
                              Detected from: {p.supportingSignals.join(", ")}
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Business View Selector (Dynamic based on Perspective) */}
                  {selectedPerspective && activeBusinessViews.length > 0 && (
                    <div className="w-full bg-white border border-gray-200 rounded-xl shadow-sm p-5 flex flex-col gap-4 animate-in fade-in slide-in-from-top-4 duration-500 mt-2">
                      <div>
                        <h3 className="text-[16px] font-semibold text-gray-900 mb-1">Business Views</h3>
                        <p className="text-[13px] text-gray-500">How should LightBI interpret this business process?</p>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {!activeBusinessViews || activeBusinessViews.length === 0 ? (
                          <div className="col-span-1 md:col-span-2 p-5 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-center">
                            <p className="text-sm text-gray-500">No reliable business views found for this perspective.</p>
                          </div>
                        ) : (
                          activeBusinessViews.map(v => (
                            <button
                              key={v.id}
                              onClick={() => setSelectedBusinessView(v.id)}
                              className={`p-4 rounded-xl border text-left transition-all ${
                                selectedBusinessView === v.id 
                                  ? 'bg-indigo-50 border-indigo-500 shadow-sm ring-1 ring-indigo-500' 
                                  : 'bg-white border-gray-200 hover:border-indigo-300 hover:bg-slate-50'
                              }`}
                            >
                              <div className={`font-semibold text-[14px] mb-1 ${selectedBusinessView === v.id ? 'text-indigo-900' : 'text-gray-800'}`}>
                                {v.label}
                              </div>
                              <div className={`text-[11px] leading-snug mb-2 ${selectedBusinessView === v.id ? 'text-indigo-700/80' : 'text-gray-500'}`}>
                                {v.description}
                              </div>
                              <div className="text-[10px] text-gray-400 font-medium border-t border-gray-100 pt-1.5 mt-auto">
                                Confidence: {v.confidenceScore}% | Reqs met: {v.matchedRequiredSignals.length}
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                  </>
                  )}

                </div>
              )}

              {/* Inline Pending Local Batch Inspection Card */}
              {pendingLocalBatch && (
                <div className="w-full rounded-xl border border-black/10 bg-white p-4 shadow-sm animate-in fade-in zoom-in-95 flex flex-col gap-4 relative overflow-hidden">
                  {pendingLocalBatch.status === "reading" && (
                    <div className="absolute top-0 left-0 h-1 bg-blue-500 w-full animate-pulse" />
                  )}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50">
                        {pendingLocalBatch.status === "reading" ? (
                          <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                        ) : pendingLocalBatch.status === "error" ? (
                          <div className="w-5 h-5 text-red-500 flex items-center justify-center font-bold">!</div>
                        ) : (
                          <FileSpreadsheet className="w-5 h-5 text-emerald-500" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-[13px] font-semibold text-[#202123]">
                          {pendingLocalBatch.isRestored ? "Choose dataset group" : 
                           pendingLocalBatch.status === "reading" ? `Inspecting ${pendingLocalBatch.files.length} files...` : 
                           pendingLocalBatch.status === "error" ? "Inspection failed" : `${pendingLocalBatch.files.length} file${pendingLocalBatch.files.length === 1 ? '' : 's'} ready`}
                        </h3>
                        {!pendingLocalBatch.isRestored && pendingLocalBatch.files.length > 0 && (
                          <p className="truncate text-[12px] text-black/45">
                            {pendingLocalBatch.files.length === 1 ? pendingLocalBatch.files[0].name : `${pendingLocalBatch.files[0].name} and ${pendingLocalBatch.files.length - 1} more`}
                          </p>
                        )}
                      </div>
                    </div>
                    {pendingLocalBatch.status === "reading" && (
                      <button onClick={handleCancelInspection} className="text-[12px] text-gray-500 hover:text-gray-700 font-medium px-3 py-1.5 border border-gray-200 rounded-md transition-colors">
                        Cancel
                      </button>
                    )}
                  </div>

                  {pendingLocalBatch.status === "reading" && (
                    <div className="text-[13px] text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100">
                      <p>Large files may take a moment. You can cancel and keep your current dataset.</p>
                    </div>
                  )}

                  {pendingLocalBatch.status === "error" && (
                    <div className="text-[13px] text-red-600 bg-red-50 p-3 rounded-lg border border-red-100 flex justify-between items-center">
                      <p>Failed to read some files.</p>
                      <button onClick={handleCancelInspection} className="px-3 py-1.5 bg-white text-red-700 border border-red-200 rounded-md shadow-sm font-medium hover:bg-red-50 transition-colors">Dismiss</button>
                    </div>
                  )}

                  {pendingLocalBatch.status === "ready" && pendingLocalBatch.businessOverview && (
                    <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500 mt-4 mb-4">
                      <BusinessFusionOpportunityCard
                        overview={pendingLocalBatch.businessOverview}
                      />
                    </div>
                  )}

                  {pendingLocalBatch.status === "ready" && multiSourceReviewSources.length > 1 && (
                    <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500 mt-4 mb-4">
                      <CanonicalMultiSourceReview
                        sources={multiSourceReviewSources}
                        drafts={multiSourceDrafts}
                        onChange={(key, value) => setMultiSourceDrafts((current) => ({ ...current, [key]: value }))}
                        onBuild={() => { void handleBuildCanonicalMultiSource(); }}
                        building={multiSourceBuilding}
                        relationshipState={multiSourceBuildResult.relationshipState}
                        blockers={multiSourceBuildResult.blockers}
                      />
                    </div>
                  )}

                  {pendingLocalBatch.status === "ready" && pendingLocalBatch.step === "family_selection" && (
                    <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col gap-3 border-t border-gray-100 pt-3">
                      
                      <div className="flex flex-col gap-2">
                        <label className="block text-[10px] font-semibold uppercase tracking-wide text-black/40">
                          {pendingLocalBatch.families.length} dataset group{pendingLocalBatch.families.length === 1 ? '' : 's'} found
                        </label>
                        
                        {pendingLocalBatch.families.length > 1 && !pendingLocalBatch.isRestored && (
                          <div className="text-[13px] text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-200 mb-2">
                            Files use different schemas and will be analyzed separately. Please select a dataset group to use.
                          </div>
                        )}
                        {pendingLocalBatch.isRestored && (
                          <div className="text-[13px] text-blue-700 bg-blue-50 p-3 rounded-lg border border-blue-200 mb-2">
                            These groups come from your last inspected files. No files will be re-read.
                          </div>
                        )}

                        <div className="flex flex-col gap-2">
                          {pendingLocalBatch.families.map((fam) => (
                            <div 
                              key={fam.id}
                              onClick={() => setPendingLocalBatch({ ...pendingLocalBatch, selectedFamilyId: fam.id })}
                              className={`cursor-pointer rounded-lg border p-3 transition-colors ${pendingLocalBatch.selectedFamilyId === fam.id ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${pendingLocalBatch.selectedFamilyId === fam.id ? 'border-blue-500 bg-blue-500' : 'border-gray-300 bg-white'}`}>
                                  {pendingLocalBatch.selectedFamilyId === fam.id && <div className="w-2 h-2 rounded-full bg-white" />}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="mb-1 flex items-center justify-between gap-3">
                                    <h4 className="truncate text-[13px] font-semibold text-[#202123]">{fam.name}</h4>
                                    <span className="shrink-0 text-[11px] text-black/45">{fam.files.length} file{fam.files.length === 1 ? '' : 's'}</span>
                                  </div>
                                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-black/50">
                                    <span>{formatValue(fam.totalRows, 'number', preferences, { compact: true })} rows</span>
                                    <span>{formatValue(fam.columns.length, 'number', preferences, { compact: true })} columns</span>
                                    {fam.files.length > 1 && <span className="text-emerald-600 flex items-center gap-1"><span className="text-emerald-500">✓</span> Compatible for append</span>}
                                  </div>
                                  <div className="mt-1 truncate text-[11px] text-black/35">
                                    {fam.files.map(f => f.file.name).join(', ')}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex justify-end border-t border-gray-100 pt-3">
                        <button 
                          onClick={handleUseLocalDataset}
                          disabled={!pendingLocalBatch.selectedFamilyId && pendingLocalBatch.families.length > 1}
                          className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-[13px] font-medium text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {pendingLocalBatch.families.length === 1 ? 'Use this dataset' : 'Use selected dataset'} <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              )}


              {/* Detected Opportunities – only when currentDataset.status === 'ready' and domains exist */}
              {!datasetUnderstandingNext && currentDataset?.status === 'ready' && currentDataset.columns && currentDataset.columns.length > 0 ? (
                <>
                  <div className="flex flex-col gap-4">
                    <div className="flex bg-gray-100 p-1 rounded-lg self-start">
                      <button 
                        onClick={() => setAnalysisMode("explore")}
                        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${analysisMode === "explore" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                      >
                        Explore
                      </button>
                      <button 
                        onClick={() => setAnalysisMode("investigate")}
                        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${analysisMode === "investigate" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                      >
                        Investigate
                      </button>
                      <button 
                        onClick={() => setAnalysisMode("ask")}
                        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${analysisMode === "ask" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                      >
                        Ask
                      </button>
                    </div>
                    {guidedInvestigationResult && (
                      <div className="text-[11px] text-gray-400 font-mono mt-1 mb-2 border border-gray-100 p-2 rounded-md bg-gray-50 flex gap-4">
                        <span>Understanding Debug:</span>
                        <span>Signals: {guidedInvestigationResult.signals.signals.length}</span>
                        <span>Perspectives: {guidedInvestigationResult.perspectives.length}</span>
                        <span>Advanced Views: {guidedInvestigationResult.businessViews.length}</span>
                        <span>Optional Questions: {guidedInvestigationResult.questionSuggestions.length}</span>
                      </div>
                    )}
                    <div className="text-xs text-gray-500 mb-2">
                      {analysisMode === "explore" && "Dataset First - What is inside this data?"}
                      {analysisMode === "investigate" && "Business View First - What business process is happening?"}
                      {analysisMode === "ask" && "Question First - What do you want to know?"}
                    </div>
                  </div>

                  {analysisMode === "explore" && (
                    (!selectedPerspective && currentDataset?.sourceType !== "virtual_business_view") ? (
                      <div className="w-full p-8 bg-slate-50 border border-dashed border-gray-300 rounded-xl flex items-center justify-center text-center mt-4">
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm text-gray-400">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                          </div>
                          <h3 className="text-sm font-semibold text-gray-900">Questions Hidden</h3>
                          <p className="text-xs text-gray-500 max-w-[250px]">Select a perspective to continue.</p>
                        </div>
                      </div>
                    ) : !selectedViewData ? (
                      <div className="w-full p-8 bg-slate-50 border border-dashed border-gray-300 rounded-xl flex items-center justify-center text-center mt-4 animate-in fade-in zoom-in-95">
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm text-gray-400">
                            <Layers className="w-6 h-6" />
                          </div>
                          <h3 className="text-sm font-semibold text-gray-900">Advanced guided views unavailable</h3>
                          <p className="text-xs text-gray-500 max-w-sm mt-1">LightBI understands this dataset and can suggest basic analysis, but no advanced Business View is available yet because required signals are missing.</p>
                          {datasetUnderstanding && datasetUnderstanding.unavailableAnalysis.length > 0 && (
                            <div className="mt-4 text-left w-full bg-red-50/50 p-3 rounded-md border border-red-100/60">
                              <p className="text-[11px] font-semibold text-red-800 mb-1.5 uppercase tracking-wider">Missing required signals</p>
                              <div className="flex flex-wrap gap-1.5">
                                {Array.from(new Set(datasetUnderstanding.unavailableAnalysis.flatMap(ua => ua.missingSignals))).map(sig => (
                                  <span key={sig} className="text-[11px] font-medium bg-white border border-red-200 shadow-sm text-red-600 px-2 py-0.5 rounded-md">{sig}</span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : visibleQuestionSuggestions.length > 0 ? (
                      <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500 mt-4">
                          {selectedViewData && (
                            <BusinessViewSummaryCard
                              title={selectedViewData.label || selectedViewData.title}
                              purpose={selectedViewData.description}
                              evidence={selectedViewData.evidence.map((e: any) => e.label || e.message)}
                              relationships={[]} // Auto-relationships not extracted from views yet
                              coverage={{ datasets: 1, businessKeys: selectedViewData.matchedRequiredSignals?.length || 0, views: 1 }}
                              belief={`LightBI believes this data supports the ${selectedViewData.label || selectedViewData.title} business view with ${selectedViewData.confidenceScore || 90}% confidence, matching ${selectedViewData.matchedRequiredSignals?.length || 0} required signals.`}
                            />
                          )}
                          
                          <div className="w-full p-5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl shadow-sm flex flex-col gap-5">
                            <div>
                              <h3 className="text-[15px] font-semibold text-blue-900 mb-1 flex items-center">
                                <Code className="w-4 h-4 mr-2 text-blue-600" />
                                What can I learn from this data?
                              </h3>
                              <p className="text-[13px] text-blue-700/80 mb-4">
                                LightBI generated these questions based on the {selectedViewData?.label || selectedViewData?.title || selectedPerspective} context.
                              </p>
                            </div>
                          
                          <div className="flex flex-col gap-3">
                            <h4 className="text-[13px] font-bold text-slate-700 uppercase tracking-wider">{selectedViewData?.label || selectedViewData?.title || selectedPerspective} Questions</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {visibleQuestionSuggestions.map((suggestion: any, idx: number) => (
                                <div key={idx} className="bg-white border border-blue-200 rounded-lg p-4 hover:bg-blue-50 transition-colors flex flex-col justify-between shadow-sm">
                                  {currentDataset?.sourceType === "virtual_business_view" ? (
                                    <div className="mb-3 w-full text-left">
                                      <span className="text-[14px] text-blue-900 font-medium leading-snug">{suggestion.text}</span>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => {
                                        if (workspaceState?.activeContext.type === "business_view" && workspaceState.businessViewState) {
                                          const viewId = (workspaceState.activeContext as any).businessViewId;
                                          const view = workspaceState.businessViewState.confirmedBusinessViews.find(v => v.id === viewId);
                                          if (view && workspaceState.relationshipState?.graph) {
                                            const plan = createVirtualDatasetPlan({
                                              businessView: view,
                                              question: suggestion as any,
                                              graph: workspaceState.relationshipState.graph,
                                              workspaceState
                                            });
                                            setSelectedVirtualPlan(plan);
                                            return;
                                          }
                                        }
                                        setRecipePreview(generateRecipePlan(suggestion.text));
                                      }}
                                      className="w-full text-left flex items-start justify-between group mb-3"
                                    >
                                      <span className="text-[14px] text-blue-900 font-medium leading-snug pr-4">{suggestion.text}</span>
                                      <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-blue-500 mt-0.5 shrink-0" />
                                    </button>
                                  )}
                                  
                                  <div className="flex flex-col gap-2 mt-auto">
                                    <div className="text-[11px] text-slate-500 font-medium flex flex-wrap items-center gap-1">
                                      <span>Detected from:</span>
                                      {suggestion.evidenceSignals.join(", ")}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${
                                        suggestion.confidenceScore >= 80 ? 'bg-emerald-100 text-emerald-700' :
                                        suggestion.confidenceScore >= 50 ? 'bg-amber-100 text-amber-700' :
                                        'bg-slate-100 text-slate-600'
                                      }`}>
                                        Question Match: {suggestion.confidenceScore >= 80 ? 'Strong Signal' : suggestion.confidenceScore >= 50 ? 'Moderate Signal' : 'Weak Signal'}
                                      </span>
                                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 font-semibold border border-indigo-100">
                                        Source: Domain Catalog
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full p-5 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-center mt-4">
                        <p className="text-sm text-gray-500">No reliable questions found for this Business View.</p>
                      </div>
                    )
                  )}

                  {analysisMode === "investigate" && (
                    !selectedViewData ? (
                      <div className="w-full p-8 bg-slate-50 border border-dashed border-gray-300 rounded-xl flex items-center justify-center text-center mt-4">
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm text-gray-400">
                            <Layers className="w-6 h-6" />
                          </div>
                          <h3 className="text-sm font-semibold text-gray-900">Workspace Locked</h3>
                          <p className="text-xs text-gray-500 max-w-[250px]">Select a Perspective and Business View above to inspect relationships.</p>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full p-5 bg-white border border-gray-200 rounded-xl shadow-sm space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center">
                            <Layers className="w-5 h-5 text-indigo-500" />
                          </div>
                          <div>
                            <h3 className="text-[16px] font-semibold text-gray-900">Business View Inspector</h3>
                            <p className="text-[13px] text-gray-500">Inspecting: {selectedViewData.label || selectedViewData.title}</p>
                          </div>
                        </div>
                        
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-4">
                          <div>
                            <h4 className="text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-1">Purpose</h4>
                            <p className="text-[14px] text-slate-800">{selectedViewData.description}</p>
                          </div>
                          
                          <div className="grid grid-cols-1 gap-4">
                            <div>
                              <h4 className="text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-2">Evidence</h4>
                              <ul className="space-y-1">
                                {selectedViewData.evidence.map((ev: any, i: number) => (
                                  <li key={i} className="text-[13px] text-slate-700 flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                                    {ev.label || ev.message}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  )}

                  {analysisMode === "ask" && (
                    <div className="w-full p-5 bg-white border border-gray-200 rounded-xl shadow-sm space-y-4">
                      {selectedPerspective && (
                        <div className="flex gap-2 mb-2">
                          <span className="text-[10px] px-2 py-1 bg-purple-100 text-purple-800 font-semibold uppercase tracking-wider rounded">Detected Perspective: {selectedPerspective}</span>
                          {selectedViewData && (
                            <span className="text-[10px] px-2 py-1 bg-blue-100 text-blue-800 font-semibold uppercase tracking-wider rounded">Detected View: {selectedViewData.label || selectedViewData.title}</span>
                          )}
                        </div>
                      )}
                      
                      <div className="flex items-center gap-3 mb-4">
                        <Sparkles className="w-5 h-5 text-purple-500" />
                        <div>
                          <h3 className="text-sm font-semibold text-gray-900">Ask anything about this dataset</h3>
                          <p className="text-xs text-gray-500">AI will generate an analysis plan based on the chosen perspective.</p>
                        </div>
                      </div>
                      
                      <div className="relative">
                        <textarea 
                          className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm min-h-[100px] resize-none"
                          placeholder="e.g. Can you show me the delivery status trend over time grouped by route?"
                        />
                      </div>
                      
                      <div className="flex justify-end gap-2 pt-2">
                        <button className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-200 transition-colors">
                          Clear
                        </button>
                        <button className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-md shadow-sm hover:bg-purple-700 transition-colors flex items-center gap-2">
                          <Sparkles className="w-4 h-4" />
                          Generate plan
                        </button>
                      </div>
                    </div>
                  )}

                </>
              ) : (
                currentDataset?.status === 'ready' && !datasetUnderstandingNext && (
                  <div className="w-full p-4 bg-amber-50 border border-amber-200 rounded-xl shadow-sm">
                    <p className="text-sm text-amber-800 flex items-center">
                      <Search className="w-4 h-4 mr-2" />
                      No columns detected. Cannot suggest analysis capabilities.
                    </p>
                  </div>
                )
              )}


              {currentDataset?.status !== 'ready' && (
                <div className="hidden">
                  {/* Legacy suggested actions kept dormant until wired to real saved work. */}
                    <h3 className="text-[12px] font-semibold text-gray-500 uppercase tracking-wider mb-4">{homeGuidance.sections.suggestedActions}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {homeGuidance.homeStates.noData.actions.map(a => ({ id: "", label: a })).map((action, idx) => (
                        <button 
                          key={idx} 
                          onClick={() => {
                            if (action.id && homeGuidance.actionPreviews[action.id as keyof typeof homeGuidance.actionPreviews]) {
                              setPreviewActionId(previewActionId === action.id ? null : action.id);
                            } else {
                              askQuestion(action.label);
                            }
                          }} 
                          className={`p-4 bg-white border rounded-xl text-left transition-all group flex items-center justify-between shadow-sm ${previewActionId === action.id ? 'border-emerald-500 ring-1 ring-emerald-500' : 'border-transparent hover:border-gray-200 hover:bg-gray-50'}`}
                        >
                          <span className="text-[14px] font-medium text-gray-800 group-hover:text-emerald-600 transition-colors">{action.label}</span>
                          <ChevronRight className={`w-4 h-4 text-gray-300 transition-all ${previewActionId === action.id ? 'text-emerald-500 translate-x-0 opacity-100' : 'opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0'}`} />
                        </button>
                      ))}
                    </div>

                    {/* Action Preview Panel */}
                    <AnimatePresence>
                      {previewActionId && homeGuidance.actionPreviews[previewActionId as keyof typeof homeGuidance.actionPreviews] && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-4 overflow-hidden"
                        >
                          <div className="p-5 bg-gray-50 border border-gray-200 rounded-xl flex flex-col gap-4">
                            {(() => {
                              const preview = homeGuidance.actionPreviews[previewActionId as keyof typeof homeGuidance.actionPreviews];
                              const actionLabel = "Ask Question";
                              return (
                                <>
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                      <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Question</div>
                                      <div className="text-[13px] text-gray-900 font-medium leading-snug">{preview.question}</div>
                                    </div>
                                    <div>
                                      <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Using</div>
                                      <div className="flex flex-wrap gap-1.5">
                                        {preview.using.map((field, i) => (
                                          <span key={i} className="px-2 py-0.5 bg-white border border-gray-200 text-gray-600 rounded text-[11px]">{field}</span>
                                        ))}
                                      </div>
                                    </div>
                                    <div>
                                      <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Expected Output</div>
                                      <div className="text-[13px] text-gray-600 leading-snug">{preview.expectedOutput}</div>
                                    </div>
                                  </div>
                                  <div className="flex justify-end gap-3 mt-2 pt-4 border-t border-gray-200">
                                    <button 
                                      onClick={() => setPreviewActionId(null)}
                                      className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-[13px] font-medium hover:bg-gray-50 transition-colors"
                                    >
                                      Cancel
                                    </button>
                                    <button 
                                      onClick={() => {
                                        setPreviewActionId(null);
                                        askQuestion(actionLabel);
                                      }}
                                      className="px-4 py-2 bg-gray-900 text-white rounded-lg text-[13px] font-medium hover:bg-gray-800 transition-colors flex items-center shadow-sm"
                                    >
                                      {preview.primaryAction} <ChevronRight className="w-4 h-4 ml-1" />
                                    </button>
                                  </div>
                                </>
                              );
                            })()}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                </div>
              )}
            </div>

            {/* Sidebar */}
            {currentDataset?.status === 'ready' && (
            <div className="lg:col-span-1 flex flex-col gap-6">
              {currentDataset?.status === 'ready' && (
              <div className="bg-white border border-transparent rounded-xl p-6 shadow-sm flex flex-col h-full">
                <h3 className="text-[12px] font-semibold text-gray-500 uppercase tracking-wider mb-5 flex items-center">
                  <Search className="w-4 h-4 mr-2 text-gray-400" /> {homeGuidance.recentInsights.title}
                </h3>
                {homeGuidance.recentInsights.items.length > 0 ? (
                  <>
                    <div className="flex flex-col gap-4">
                      {homeGuidance.recentInsights.items.map((insight) => (
                        <div key={insight.id} className="flex flex-col gap-1 pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                          <div className="flex justify-between items-start">
                            <span className="text-[13px] font-semibold text-gray-900">{insight.title}</span>
                            <span className="text-[11px] text-gray-400 whitespace-nowrap ml-2">{insight.timestamp}</span>
                          </div>
                          <p className="text-[13px] text-gray-500 leading-relaxed">{insight.description}</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-auto pt-4 border-t border-gray-100 text-center">
                      <button className="text-[12px] font-medium text-emerald-600 hover:text-emerald-700 transition-colors">
                        {homeGuidance.recentInsights.viewHistoryAction}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center h-full opacity-60">
                    <p className="text-[13px] font-medium text-gray-900 mb-2">
                      {currentDataset ? homeGuidance.homeStates.dataLoaded.recentInsightsEmpty.title : homeGuidance.homeStates.noData.recentInsightsEmpty.title}
                    </p>
                    <p className="text-[12px] text-gray-500 max-w-[200px] leading-relaxed">
                      {currentDataset ? homeGuidance.homeStates.dataLoaded.recentInsightsEmpty.message : homeGuidance.homeStates.noData.recentInsightsEmpty.message}
                    </p>
                  </div>
                )}
              </div>
              )}
            </div>
            )}

          </div>
        )}

        {isAsking && (
          <div className="mt-16 flex flex-col items-center text-gray-500">
            <Loader2 className="w-6 h-6 animate-spin mb-3" />
            <p className="text-sm">Analyzing data and generating insights...</p>
          </div>
        )}

        {result && !isAsking && (
          <div className="w-full mt-4 animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col gap-6 mb-16">
            
            <div className="flex flex-col bg-white p-4 rounded-md border border-gray-200 shadow-sm w-full relative">
              <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-3">Execution Pipeline</div>
              <div className="flex items-center w-full">
                
                <div className="flex flex-col items-start px-2 w-1/4">
                  <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-1">Question</span>
                  <span className="text-[13px] text-gray-900 font-medium line-clamp-1" title={result.originalQuestion || "Analyzed Query"}>"{result.originalQuestion || "Analyzed Query"}"</span>
                </div>
                
                <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                
                <div className="flex flex-col items-start px-4 w-1/4">
                  <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-1">Template</span>
                  <span className="text-[13px] text-gray-900 font-medium">{result.template.name}</span>
                </div>
                
                <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                
                <div className="flex flex-col items-start px-4 w-1/4">
                  <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-1">Chart</span>
                  <span className="text-[13px] text-gray-900 font-medium capitalize">{result.chart.chart_type}</span>
                </div>
                
                <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                
                <div className="flex flex-col items-start pl-4 w-1/4">
                  <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-1">Insight</span>
                  <span className="text-[13px] text-emerald-600 font-medium">{Math.round(result.insight.confidence * 100)}% Confidence</span>
                </div>
                
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1 bg-white border border-transparent hover:border-gray-300 rounded-md p-5 shadow-sm flex flex-col transition-colors border-gray-200">
                <h3 className="text-[13px] font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Key Insight
                </h3>
                <p className="text-gray-700 text-sm leading-relaxed flex-1">
                  {result.insight.observation_text}
                </p>
                <div className="mt-4 pt-3 border-t border-gray-100 text-[12px] text-gray-500 flex justify-between items-center">
                  <span>Confidence Score</span>
                  <span className="font-medium text-emerald-600">{Math.round(result.insight.confidence * 100)}%</span>
                </div>
              </div>

              <div className="lg:col-span-2 bg-white border border-transparent hover:border-gray-300 rounded-md p-5 shadow-sm flex flex-col transition-colors border-gray-200">
                <h3 className="text-[13px] font-semibold text-gray-500 uppercase tracking-wider mb-4">
                  {result.chart.theme_metadata.title}
                </h3>
                <div className="w-full flex-1 min-h-[300px]">
                  <ReactECharts 
                    option={getEChartsOption(result.chart)} 
                    style={{ height: '100%', width: '100%' }} 
                    notMerge={true}
                  />
                </div>
              </div>
            </div>

            <div className="mt-4 border-t border-gray-100 pt-8 flex flex-col items-center">
              <h3 className="text-xl font-medium text-gray-900 mb-6">{homeGuidance.sections.followUpActions}</h3>
              <div className="flex flex-wrap gap-3 justify-center">
                {homeGuidance.homeStates.analysisReady.actions.map((suggestion, idx) => (
                  <button 
                    key={idx} 
                    onClick={() => {
                      if (suggestion.startsWith("Compare") || suggestion.startsWith("Explain")) askQuestion(suggestion);
                    }} 
                    className="px-5 py-2.5 bg-white border border-gray-200 rounded-md text-[14px] font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors shadow-sm"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
            
          </div>
        )}
      </div>


      {recipePreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm px-4">
          <div className="bg-white border border-gray-200 rounded-xl shadow-2xl p-6 w-full max-w-lg animate-in fade-in zoom-in-95 flex flex-col gap-6">
            <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
              <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center">
                <Code className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Recipe Preview</h3>
                <p className="text-sm text-gray-500">Plan formulation from question</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Question</span>
                <p className="text-sm font-medium text-gray-900 bg-gray-50 p-3 rounded-lg border border-gray-100">
                  {recipePreview.question}
                </p>
              </div>
              
              <div>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Plan (AST)</span>
                <div className="bg-gray-900 rounded-lg p-4 text-[13px] font-mono text-gray-300 overflow-x-auto">
                  <pre>{JSON.stringify(recipePreview.intent, null, 2)}</pre>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs px-3 py-2 rounded-md font-medium">
                Status: Preview only. Execution engine not connected yet.
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button 
                onClick={() => setRecipePreview(null)}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => setRecipePreview(null)}
                className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 rounded-md shadow-sm transition-colors"
              >
                Confirm later
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedVirtualPlan && !runtimePreview && !executionGuardResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm px-4 overflow-y-auto">
          <div className="w-full max-w-2xl my-8 animate-in fade-in zoom-in-95">
            <VirtualDatasetPlanPreview
              plan={selectedVirtualPlan}
              onClose={() => setSelectedVirtualPlan(null)}
              onPrepare={() => {
                const preview = createRuntimePreview(selectedVirtualPlan);
                setRuntimePreview(preview);
              }}
            />
          </div>
        </div>
      )}

      {runtimePreview && !executionGuardResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm px-4 overflow-y-auto">
          <div className="w-full max-w-2xl my-8 animate-in fade-in zoom-in-95">
            <RuntimePreviewCard
              preview={runtimePreview}
              onReviewAgain={() => {
                setRuntimePreview(null);
              }}
              onAcceptPlan={() => {
                setAcceptedRuntimePreview(runtimePreview);
                const guardResult = evaluateExecutionGuard({
                  preview: runtimePreview,
                  previewAccepted: true,
                  plan: selectedVirtualPlan,
                  workspaceState: workspaceState || undefined
                });
                setExecutionGuardResult(guardResult);
                setRuntimePreview(null);
              }}
            />
          </div>
        </div>
      )}

      {executionGuardResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm px-4 overflow-y-auto">
          <div className="w-full max-w-2xl my-8 animate-in fade-in zoom-in-95">
            <ExecutionGuardNotice
              result={executionGuardResult}
              onReviewPlan={() => {
                setExecutionGuardResult(null);
                setAcceptedRuntimePreview(null);
                setSelectedVirtualPlan(null); // Completely reset plan state
              }}
              onContinue={() => {
                if (selectedVirtualPlan && acceptedRuntimePreview && executionGuardResult) {
                  const logicalPlan = createDuckDBLogicalPlan({
                    plan: selectedVirtualPlan,
                    preview: acceptedRuntimePreview,
                    guard: executionGuardResult
                  });
                  setSelectedLogicalPlan(logicalPlan);
                  
                  // Phase M.5 + Phase N: Also generate the boundary artifact and expected result
                  const businessView = workspaceState?.businessViewState?.confirmedBusinessViews.find(v => v.id === selectedVirtualPlan.businessViewId);
                  const question = businessView?.suggestedQuestions.find(q => q.id === selectedVirtualPlan.questionId);
                  
                  if (businessView && question) {
                     const artifact = createRuntimeBoundaryArtifact({
                       businessView,
                       question,
                       virtualPlan: selectedVirtualPlan,
                       runtimePreview: acceptedRuntimePreview,
                       executionGuard: executionGuardResult,
                       logicalPlan,
                       runtimePreviewAccepted: true,
                     });
                     const expectedResult = createExpectedResultContract({
                       question,
                       businessView,
                       logicalPlan
                     });
                     setExpectedResultContract(expectedResult);
                     
                     // Phase O: Compile safe query right after
                     const compiledQuery = compileSafeQuery({
                        artifact,
                        expectedResult
                     });
                     setCompiledQueryContract(compiledQuery);
                     
                     // Phase P: Generate Sandbox policy
                     const request = createSandboxExecutionRequest({
                        compiledQuery,
                        boundaryArtifact: artifact,
                        expectedResult
                     });
                     const evaluation = evaluateSandboxPolicy({
                        request,
                        compiledQuery,
                        boundaryArtifact: artifact,
                        expectedResult
                     });
                     setSandboxRequest(request);
                     setSandboxEvaluation(evaluation);
                  }
                }
                setExecutionGuardResult(null);
                setSelectedVirtualPlan(null); // Handed off, reset ui
              }}
            />
          </div>
        </div>
      )}

      {selectedLogicalPlan && !expectedResultContract && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm px-4 overflow-y-auto">
          <div className="w-full max-w-2xl my-8 animate-in fade-in zoom-in-95">
            <DuckDBLogicalPlanPreview
              plan={selectedLogicalPlan}
              onClose={() => setSelectedLogicalPlan(null)}
            />
          </div>
        </div>
      )}

      {expectedResultContract && !compiledQueryContract && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm px-4 overflow-y-auto">
          <div className="w-full max-w-2xl my-8 animate-in fade-in zoom-in-95">
            <ExpectedResultPreview
              contract={expectedResultContract}
              questionText={workspaceState?.businessViewState?.confirmedBusinessViews.find(v => v.id === expectedResultContract.businessViewId)?.suggestedQuestions.find(q => q.id === expectedResultContract.questionId)?.question || "Target Question"}
              onClose={() => {
                setExpectedResultContract(null);
                setSelectedLogicalPlan(null);
              }}
            />
          </div>
        </div>
      )}

      {compiledQueryContract && !sandboxRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm px-4 overflow-y-auto">
          <div className="w-full max-w-2xl my-8 animate-in fade-in zoom-in-95">
            <CompiledQueryPreview
              contract={compiledQueryContract}
              onClose={() => {
                setCompiledQueryContract(null);
                setExpectedResultContract(null);
                setSelectedLogicalPlan(null);
              }}
            />
          </div>
        </div>
      )}

      {sandboxRequest && sandboxEvaluation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm px-4 overflow-y-auto">
          <div className="w-full max-w-2xl my-8 animate-in fade-in zoom-in-95">
            <SandboxPolicyPreview
              request={sandboxRequest}
              evaluation={sandboxEvaluation}
              onClose={() => {
                setSandboxRequest(null);
                setSandboxEvaluation(null);
                setCompiledQueryContract(null);
                setExpectedResultContract(null);
                setSelectedLogicalPlan(null);
              }}
              onContinue={() => {
                // Phase Q: Prepare the expected preview result contract before runtime
                if (compiledQueryContract && expectedResultContract && sandboxRequest && sandboxEvaluation) {
                   const previewContract = createPreviewResultContract({
                      compiledQuery: compiledQueryContract,
                      expectedResult: expectedResultContract,
                      sandboxRequest,
                      sandboxEvaluation
                   });
                   setPreviewResultContract(previewContract);
                }
              }}
            />
          </div>
        </div>
      )}

      {previewResultContract && expectedResultContract && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm px-4 overflow-y-auto">
          <div className="w-full max-w-4xl my-8 animate-in fade-in zoom-in-95 grid grid-cols-1 gap-6">
            <PreviewResultContractCard
              contract={previewResultContract}
              expectedResult={expectedResultContract}
              onClose={() => {
                setPreviewResultContract(null);
                setSandboxRequest(null);
                setSandboxEvaluation(null);
                setCompiledQueryContract(null);
                setExpectedResultContract(null);
                setSelectedLogicalPlan(null);
              }}
              onContinue={() => {
                // The legacy mock runtime was retired in Phase 6B. Execution is
                // only available through a canonical Investigation handoff.
                setPreviewResultContract(null);
                setSandboxRequest(null);
                setSandboxEvaluation(null);
                setCompiledQueryContract(null);
                setExpectedResultContract(null);
                setSelectedLogicalPlan(null);
              }}
            />
          </div>
        </div>
      )}

      {isDataPreviewOpen && currentDataset?.status === 'ready' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 px-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="dataset-preview-title" data-testid="dataset-preview-dialog">
          <div className="flex max-h-[85vh] w-full max-w-6xl flex-col rounded-xl border border-black/10 bg-white shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b border-black/10 px-5 py-4">
              <div>
                <h2 id="dataset-preview-title" className="text-[16px] font-semibold text-gray-900">Data preview</h2>
                <p className="mt-1 text-[12px] text-gray-500">
                  Showing {Math.min(canonicalRows.length, 100).toLocaleString()} retained representative rows from {Number(currentDataset.rows_count || 0).toLocaleString()} full-source rows. Analysis still runs against the governed full source when available.
                </p>
              </div>
              <button type="button" onClick={() => setIsDataPreviewOpen(false)} className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100" aria-label="Close data preview"><X className="h-4 w-4" /></button>
            </div>
            <div className="overflow-auto p-4">
              {canonicalRows.length > 0 ? <table className="min-w-full divide-y divide-gray-200 text-left text-xs">
                <thead className="sticky top-0 bg-gray-50">
                  <tr>{(currentDataset.understandingColumns ?? currentDataset.columns ?? []).map((column: string) => <th key={column} className="whitespace-nowrap px-3 py-2 font-medium text-gray-600">{column}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {canonicalRows.slice(0, 100).map((row, rowIndex) => <tr key={rowIndex}>
                    {(currentDataset.understandingColumns ?? currentDataset.columns ?? []).map((column: string) => <td key={column} className="max-w-[280px] truncate px-3 py-2 text-gray-700" title={row[column] == null ? '' : String(row[column])}>{row[column] == null ? '—' : String(row[column])}</td>)}
                  </tr>)}
                </tbody>
              </table> : <p className="py-8 text-center text-sm text-gray-500">No representative rows are retained for browser preview.</p>}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
