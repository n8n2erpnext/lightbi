import { getApiBaseUrl } from '../lib/api-base';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useDatasetUpload } from '../hooks/useDatasetUpload';
import { selectHeroSuggestionPool, getStructuredPool } from '../lib/home-persona';
import type { HeroSuggestionPrompt } from '../lib/home-persona';
import type { SourceInspectionResult } from '../lib/source-preflight';
import { createPreviewRows } from '../lib/data-intake-preview-rows';
import { classifyDatasetFamilies } from '../lib/batch-inspection';
import type { DatasetFamily } from '../lib/batch-inspection';
import { generateRecipePlan } from '../lib/recipe-planner';
import type { WorkspaceUnderstandingState } from '../lib/workspace-understanding-state';
import { createWorkspaceUnderstandingState } from '../lib/workspace-understanding-state';
import type { MultiSourceDraftV1 } from '../components/analysis/CanonicalMultiSourceReview';
import {
  prepareCanonicalInvestigationHandoff,
} from '../lib/understanding-core/canonical-consumer-boundary';
import { buildCanonicalMultiSourceDataset, buildCanonicalMultiSourceMemberArtifact, prepareCanonicalMultiSourceInvestigationHandoff, type CanonicalMultiSourceDatasetV1 } from '../lib/understanding-core/canonical-multisource-boundary';
import { buildCanonicalPeriodPartitionWorkspace, executeCanonicalPeriodPartitionWorkspace } from '../lib/understanding-core/canonical-period-partition-boundary';
import { executeCanonicalMultiSourceMetric } from '../lib/understanding-core/governed-multisource-duckdb-boundary';
import { GOVERNED_FULL_SCOPE_TOTAL_COLUMN } from '../lib/understanding-core/governed-metric-query-planner';
import {
  suggestedDeclarationsForPerspective,
  type ReportingPeriodScopeV1,
} from '../lib/understanding-core/collection-understanding';
import { projectCanonicalCapabilityLadder } from '../lib/canonical-capability-ladder';
import { presentCanonicalConsumerArtifact, presentCanonicalMultiSourceRelationship, type CanonicalRemediationOperationV1 } from '../lib/understanding-core/canonical-consumer-presentation-contract';
import type { AnalysisAction } from '../lib/analysis-opportunity-actions';
import { createRuntimeIntentFromAnalysisAction } from '../lib/analysis-runtime-contract';
import { createRuntimePlanPreview } from '../lib/runtime-planner-preview';
import { createInvestigationSession, getCurrentInvestigationSession } from '../lib/investigation-session';
import { createPerspectiveAnalysisBundle } from '../lib/perspective-analysis-bundle';
import { adaptNextActionsToLegacy } from '../lib/understanding-next/action-adapter';
import { generateCanonicalAIBriefing } from '../lib/canonical-ai-briefing';
import { useNavigate } from 'react-router-dom';
import { createVirtualDatasetPlan } from '../lib/virtual-dataset-planner';
import { selectFirstNonEmptyRows } from '../lib/row-surface';
import { useDisplayPreferences } from '../stores/display-preferences-store';
import { ExecutionRunCoordinator } from '@lightbi/runtime';
import { advancedSourceId, useAdvancedSourceStore } from '../stores/advanced-source-store';
import { createDecisionTrustReport, type DecisionTrustReport } from '../lib/decision-trust-report';
import { createBusinessFusionOverview, type BusinessFusionOverview } from '../lib/business-fusion-overview';
import type { GuidedInvestigationResult } from '../lib/guided-investigation-pipeline';
import type { DatasetUnderstanding } from '../lib/dataset-understanding-contract';
import { createLocalCanonicalSourceBoundary } from '../lib/home-source-boundary';
import { appendCanonicalEvidenceDeclaration, createCanonicalUserOverlay, parseCanonicalUserOverlay, type CanonicalUserOverlayV1 } from '../lib/understanding-core/canonical-user-overlay';
import { useHomeWorkspaceSessions } from '../hooks/useHomeWorkspaceSessions';
import { useHomePlanningWorkflow } from '../hooks/useHomePlanningWorkflow';
import { useHomeOnlineSourceIntake } from '../hooks/useHomeOnlineSourceIntake';
import { HomeWorkspaceView } from '../components/home/HomeWorkspaceView';
import { useHomeSourcePicker } from '../hooks/useHomeSourcePicker';
import { HomeSourcePickerMenu } from '../components/home/HomeSourcePickerMenu';
import { createHomeChartOption, getHomeGreeting, unavailableLegacyPresentation } from '../lib/home-presentation';
import { useHomeQuestionApi } from '../hooks/useHomeQuestionApi';
import { evaluateRuntimeSourceContinuity } from '../lib/runtime-source-continuity';
import { projectCanonicalDomainPerspectives, projectGovernedBundleCandidates, type CanonicalBusinessPerspectiveCandidateV1, type GovernedBundleCandidateV1 } from '../lib/canonical-source-candidate-projection';
import { findPendingSourceFamily, mapCollectionPerspectiveToDatasetPerspective, projectPendingMultiSourceReviewSources, selectGovernedBundleDrafts, type PendingLocalFileBatch } from '../lib/home-multisource-candidate-review';
import { createDomainComparisonBrief, type BAComparisonPeriodInput } from '../lib/ba-comparison-engine';
import { buildHomeCanonicalArtifact } from '../lib/home-canonical-artifact';
import { createWorkbookSheetSelectionBatch, expandWorkbookSheetSelection, inspectLocalFileBatch, toggleWorkbookSheet } from '../lib/workbook-sheet-intake';
import type { WorkspaceSessionRecord } from '../lib/workspace-session-api';
export const Home: React.FC = () => {
  const { preferences } = useDisplayPreferences();
  const navigate = useNavigate();
  const [currentDataset, setCurrentDataset] = useState<any>(() => {
    const transientDataset = getCurrentInvestigationSession()?.workspaceDataset as any;
    return transientDataset?.status === 'ready' ? transientDataset : null;
  });
  const [isDataPreviewOpen, setIsDataPreviewOpen] = useState(false);
  const registerAdvancedSource = useAdvancedSourceStore(state => state.registerSource);
  const [workspaceState, setWorkspaceState] = useState<WorkspaceUnderstandingState | null>(null);
  const {
    inputValue, setInputValue, analysisIntent, setAnalysisIntent, questionInputRef, fileInputRef, menuRef,
    questionPlaceholder, isPlusMenuOpen, setIsPlusMenuOpen, isReplaceMenuOpen, setIsReplaceMenuOpen,
    activeConnection, setActiveConnection, isInputFocused, setIsInputFocused,
    openLocalFilePicker, openOnlineDataDrawer, openDatabaseDrawer,
  } = useHomeSourcePicker();
  const [pendingLocalBatch, setPendingLocalBatch] = useState<PendingLocalFileBatch | null>(null);
  const [multiSourceDrafts, setMultiSourceDrafts] = useState<Record<string, MultiSourceDraftV1>>({});
  const [multiSourceBuilding, setMultiSourceBuilding] = useState(false);
  const [multiSourceBuildResult, setMultiSourceBuildResult] = useState<{ relationshipState: CanonicalMultiSourceDatasetV1["relationship"]["validationState"] | null; blockers: string[] }>({ relationshipState: null, blockers: [] });
  const [lastInspectedFamilies, setLastInspectedFamilies] = useState<DatasetFamily[] | null>(null);
  const [lastInspectedBatch, setLastInspectedBatch] = useState<PendingLocalFileBatch | null>(null);
  const [, setDecisionTrustReport] = useState<DecisionTrustReport | null>(null);
  const [canonicalOverlayRebuildState, setCanonicalOverlayRebuildState] = useState<"idle" | "pending" | "succeeded" | "failed">("idle");
  const [canonicalReviewTarget, setCanonicalReviewTarget] = useState<CanonicalRemediationOperationV1 | null>(null);
  const [isAsking, setIsAsking] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [previewActionId, setPreviewActionId] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const canonicalReviewReturnItem = useRef<string | null>(null);
  const inspectionRuns = useRef(new ExecutionRunCoordinator("simple-inspection"));
  const pendingSessionReselectionRef = useRef<WorkspaceSessionRecord | null>(null);
  const {
    workspaceSessions, sessionStatus, isSavingSession, lastAutoSaveSignatureRef, sessionSignature,
    createWorkspaceSessionSaveRequest,
    saveCurrentWorkspaceSession, handleSaveWorkspaceSession, handleOpenWorkspaceSession, handleDeleteWorkspaceSession,
  } = useHomeWorkspaceSessions({
    currentDataset, registerAdvancedSource, setCurrentDataset, setWorkspaceState, setDecisionTrustReport, setPendingLocalBatch,
    setMultiSourceDrafts, setMultiSourceBuildResult, setSelectedTopic, setResult, setPreviewActionId,
    requestLocalFileReselection: session => {
      pendingSessionReselectionRef.current = session;
      openLocalFilePicker();
    },
  });

  useEffect(() => {
    const pending = pendingSessionReselectionRef.current;
    if (!pending || currentDataset?.status !== 'ready') return;
    const expectedNames = new Set([
      pending.title,
      ...(Array.isArray(pending.sourceSummary) ? pending.sourceSummary.map((source: any) => source?.name).filter(Boolean) : []),
    ]);
    const selectedNames = Array.isArray(currentDataset.sourceFiles)
      ? currentDataset.sourceFiles.map((source: any) => source?.name).filter(Boolean)
      : [currentDataset.file_name].filter(Boolean);
    if (!selectedNames.some((name: string) => expectedNames.has(name))) {
      pendingSessionReselectionRef.current = null;
      return;
    }
    pendingSessionReselectionRef.current = null;
    const rebound = { ...currentDataset, restoredFromSessionId: pending.id };
    setCurrentDataset(rebound);
    void saveCurrentWorkspaceSession(rebound, { silent: true });
  }, [currentDataset, saveCurrentWorkspaceSession]);

  useEffect(() => () => inspectionRuns.current.cancel(), []);
  const { isUploading, uploadError } = useDatasetUpload();
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
    const isUniversalDescriptiveAction = action.id.startsWith('universal:');
    const runtimeContinuity = evaluateRuntimeSourceContinuity({
      artifact: canonicalArtifact,
      runtimeSource: currentDataset?.runtimeDatasetSource,
      multiSourceDataset,
      actionCandidateId: action.id,
    });
    if ((!canonicalHandoff && !isUniversalDescriptiveAction) || !runtimeContinuity.available || !runtimeContinuity.runtimeSource) {
      setResult({ status: 'blocked', blockedReasons: runtimeContinuity.blockers, message: 'The complete source is no longer available. Reselect the source before running this analysis.' });
      return;
    }
    const aiBriefing = canonicalArtifact
      ? generateCanonicalAIBriefing(canonicalArtifact)
      : undefined;
    const analysisBundle = datasetUnderstandingNext
      ? createPerspectiveAnalysisBundle(datasetUnderstandingNext, action.id, selectedPerspective)
      : null;
    const supportingAnalyses = analysisBundle
      ? adaptNextActionsToLegacy(analysisBundle.supportingActions).map(supportingAction => {
          const supportingIntent = createRuntimeIntentFromAnalysisAction(supportingAction);
          return {
            analysisAction: supportingAction,
            runtimeIntent: supportingIntent,
            runtimePlanPreview: createRuntimePlanPreview(supportingIntent),
          };
        })
      : [];

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
      runtimeContinuity.runtimeSource,
      runtimeContinuity.runtimeSource && datasetRows.length >= runtimeContinuity.runtimeSource.sourceRowCount
        ? 'full_file'
        : currentDataset?.analysisRows?.length
          ? 'retained_rows'
          : currentDataset?.semanticRows?.length
            ? 'semantic_sample'
            : 'preview',
      currentDataset?.businessFusionOverview,
      datasetForSession?.status === 'ready' ? createWorkspaceSessionSaveRequest(datasetForSession) : undefined,
      canonicalHandoff,
      multiSourceDataset,
      supportingAnalyses,
      datasetForSession ? { ...datasetForSession, selectedPerspective } : datasetForSession
    );
    navigate('/investigation');
  };

  const planningWorkflow = useHomePlanningWorkflow(workspaceState);
  type AnalysisMode = "explore" | "investigate" | "ask";
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>("explore");
  const [selectedPerspective, setSelectedPerspective] = useState<string | null>(null);
  const [selectedBusinessView, setSelectedBusinessView] = useState<string | null>(null);
  const activeAnalysisIntent = analysisIntent || selectedTopic || null;

  const renderSourcePickerMenu = (isOpen: boolean, positionClass: string) => {
    return (
      <HomeSourcePickerMenu open={isOpen} positionClass={positionClass} menuRef={menuRef} onLocalFile={openLocalFilePicker} onOnlineData={openOnlineDataDrawer} onDatabase={openDatabaseDrawer} />
    );
  };

  const selectedPoolKey = React.useMemo(() => {
    if (currentDataset?.status !== 'ready') return 'default';
    const columns = currentDataset?.columns || [];
    return selectHeroSuggestionPool({ dataColumns: columns });
  }, [currentDataset]);

  const guidedInvestigationResult = unavailableLegacyPresentation<GuidedInvestigationResult>();
  const datasetUnderstanding = unavailableLegacyPresentation<DatasetUnderstanding>();
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

  const canonicalArtifact = React.useMemo(
    () => buildHomeCanonicalArtifact(currentDataset, canonicalRows),
    [canonicalRows, currentDataset],
  );

  const canonicalPresentation = React.useMemo(() => canonicalArtifact ? presentCanonicalConsumerArtifact(canonicalArtifact, {
    stale: canonicalOverlayRebuildState === 'pending' || canonicalOverlayRebuildState === 'failed' || !evaluateRuntimeSourceContinuity({
      artifact: canonicalArtifact, runtimeSource: currentDataset?.runtimeDatasetSource, multiSourceDataset: currentDataset?.canonicalMultiSourceDataset,
    }).available,
  }) : null,
    [canonicalArtifact, canonicalOverlayRebuildState, currentDataset?.runtimeDatasetSource, currentDataset?.canonicalMultiSourceDataset]
  );
  const canonicalCapabilityLadder = React.useMemo(
    () => canonicalArtifact ? projectCanonicalCapabilityLadder(
      canonicalArtifact,
      projectCanonicalDomainPerspectives(canonicalArtifact),
      {
        sourceKind: canonicalArtifact.status === 'valid' ? canonicalArtifact.canonicalSource.physical.sourceProfile.source.kind : 'unknown',
        sourceLabel: currentDataset?.file_name || 'dataset',
        fileNames: currentDataset?.file_name ? [currentDataset.file_name] : [],
        sheetNames: currentDataset?.selected_sheet ? [currentDataset.selected_sheet] : [],
        columns: (currentDataset?.understandingColumns ?? currentDataset?.columns ?? []).map((column: unknown) => String(column)),
        rows: canonicalRows,
        sourceRowCount: Number(currentDataset?.understandingSourceRowCount ?? currentDataset?.rows_count ?? canonicalRows.length),
      },
    ) : null,
    [canonicalArtifact, canonicalRows, currentDataset],
  );
  const datasetUnderstandingNext = canonicalCapabilityLadder?.understanding ?? null;
  const canonicalDomainPerspectives = canonicalCapabilityLadder?.perspectives ?? [];
  const runtimeSourceContinuity = React.useMemo(() => evaluateRuntimeSourceContinuity({
    artifact: canonicalArtifact, runtimeSource: currentDataset?.runtimeDatasetSource, multiSourceDataset: currentDataset?.canonicalMultiSourceDataset,
  }), [canonicalArtifact, currentDataset?.runtimeDatasetSource, currentDataset?.canonicalMultiSourceDataset]);
  const canonicalMultiSourcePresentation = React.useMemo(
    () => currentDataset?.canonicalMultiSourceDataset
      ? presentCanonicalMultiSourceRelationship(currentDataset.canonicalMultiSourceDataset)
      : null,
    [currentDataset?.canonicalMultiSourceDataset]
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

  const finalizeInspectedLocalBatch = (files: File[], results: SourceInspectionResult[]) => {
    const hasError = results.every(result => result.status !== 'accessible');
    if (hasError) {
      setPendingLocalBatch({ files, status: 'error', results, families: [], selectedFamilyId: null, step: 'family_selection' });
      return;
    }

    setMultiSourceDrafts(Object.fromEntries(files.map((file, index) => [`${index}:${file.name}`, {
      selected: false,
      role: '',
      documentColumn: '',
      periodStart: '',
      periodEnd: '',
      currency: '',
      monetaryColumns: '',
    } satisfies MultiSourceDraftV1])));
    setMultiSourceBuildResult({ relationshipState: null, blockers: [] });
    const items = files.map((file, index) => ({ file, result: results[index] }));
    const families = classifyDatasetFamilies(items, 'strict');
    let businessOverview: BusinessFusionOverview | null = null;
    try {
      if (families.length > 1) businessOverview = createBusinessFusionOverview(families);
    } catch (error) {
      console.error('Discovery error:', error);
      businessOverview = createBusinessFusionOverview(families);
    }
    const completed: PendingLocalFileBatch = {
      files,
      status: 'ready',
      results,
      families,
      selectedFamilyId: families.length === 1 ? families[0].id : null,
      step: 'family_selection',
      businessOverview,
    };
    setPendingLocalBatch(completed);
    setLastInspectedFamilies(families);
    setLastInspectedBatch(completed);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    
    setResult(null);
    setSelectedTopic(null);
    setSelectedPerspective(null);
    setSelectedBusinessView(null);
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
    setLastInspectedBatch(null);

    setPendingLocalBatch({
      files,
      status: "reading",
      results: new Array(files.length).fill(null),
      families: [],
      selectedFamilyId: null,
      step: "family_selection"
    });
    
    const inspectionRun = inspectionRuns.current.begin();

    let results: SourceInspectionResult[];
    try {
      results = await inspectLocalFileBatch(files, inspectionRun.signal);
    } catch (error) {
      if (inspectionRun.signal.aborted) return;
      throw error;
    }
    
    if (!inspectionRuns.current.isCurrent(inspectionRun)) return;
    
    const sheetSelectionBatch = createWorkbookSheetSelectionBatch(files, results);
    if (sheetSelectionBatch) setPendingLocalBatch(sheetSelectionBatch);
    else finalizeInspectedLocalBatch(files, results);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    inspectionRuns.current.finish(inspectionRun);
  };

  const handleCancelInspection = () => {
    inspectionRuns.current.cancel();
    setPendingLocalBatch(null);
  };

  const handleToggleWorkbookSheet = (fileIndex: number, sheetName: string) => {
    setPendingLocalBatch(current => {
      if (!current || current.step !== 'sheet_selection') return current;
      return toggleWorkbookSheet(current, fileIndex, sheetName);
    });
  };

  const inspectWorkbookSelection = async (selectAll: boolean) => {
    const current = pendingLocalBatch;
    if (!current || current.status !== 'ready' || current.step !== 'sheet_selection') return;
    const run = inspectionRuns.current.begin();
    setPendingLocalBatch({ ...current, status: 'reading' });
    try {
      const expanded = await expandWorkbookSheetSelection(current, selectAll, run.signal);
      if (!inspectionRuns.current.isCurrent(run)) return;
      finalizeInspectedLocalBatch(expanded.files, expanded.results);
    } catch (error) {
      if (run.signal.aborted) return;
      setPendingLocalBatch({
        ...current,
        status: 'error',
        results: [{ status: 'invalid_format', message: error instanceof Error ? error.message : String(error) }],
      });
    } finally {
      inspectionRuns.current.finish(run);
    }
  };

  const handleAnalyzeSelectedWorkbookSheets = () => { void inspectWorkbookSelection(false); };
  const handleAnalyzeFullWorkbook = () => { void inspectWorkbookSelection(true); };

  const multiSourceReviewSources = React.useMemo(
    () => projectPendingMultiSourceReviewSources(pendingLocalBatch),
    [pendingLocalBatch],
  );

  const multiSourceBundles = React.useMemo(
    () => projectGovernedBundleCandidates(multiSourceReviewSources.map((source) => ({ key: source.key, candidates: source.candidates ?? null }))),
    [multiSourceReviewSources],
  );

  const handleReviewMultiSourceBundle = (bundle: GovernedBundleCandidateV1) => {
    setMultiSourceDrafts((current) => selectGovernedBundleDrafts(current, bundle));
    setMultiSourceBuildResult({ relationshipState: null, blockers: [] });
  };

  const handleUseMultiSourceReviewSource = (key: string, draftOverride?: MultiSourceDraftV1) => {
    const source = multiSourceReviewSources.find((item) => item.key === key);
    if (!source || !pendingLocalBatch) return;
    const family = findPendingSourceFamily(pendingLocalBatch, source.name);
    if (family) handleUseLocalDataset(family.id, source.name, draftOverride);
  };

  const handleBuildCanonicalMultiSource = async (
    draftsOverride?: Record<string, MultiSourceDraftV1>,
    perspectiveId?: CanonicalBusinessPerspectiveCandidateV1["perspectiveId"],
  ) => {
    if (!pendingLocalBatch || pendingLocalBatch.status !== 'ready') return;
    setMultiSourceBuilding(true);
    setMultiSourceBuildResult({ relationshipState: null, blockers: [] });
    try {
      const activeDrafts = draftsOverride ?? multiSourceDrafts;
      const selected = pendingLocalBatch.files.flatMap((file, index) => {
        const key = `${index}:${file.name}`;
        const draft = activeDrafts[key];
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
        if (draft.role) overlay = appendCanonicalEvidenceDeclaration(overlay, boundary, { evidenceType: 'source_role', value: { kind: 'source_role', role: draft.role }, scope: { level: 'source_file' } });
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

      if (perspectiveId && perspectiveId !== "data_trust") {
        const periodExecutions: Array<{
          workspace: NonNullable<ReturnType<typeof buildCanonicalPeriodPartitionWorkspace>["workspace"]>;
          result: Awaited<ReturnType<typeof executeCanonicalPeriodPartitionWorkspace>>;
        }> = [];
        const multiSourceExecutions: Array<{
          period: string;
          dataset: CanonicalMultiSourceDatasetV1;
          result: Awaited<ReturnType<typeof executeCanonicalMultiSourceMetric>>;
        }> = [];
        const requestedCapabilities = {
          sales: ["executive_overview", "sales_performance", "period_comparison"].includes(perspectiveId),
          logistics: ["executive_overview", "fulfillment_operations", "period_comparison"].includes(perspectiveId),
          profitability: ["executive_overview", "profitability", "finance_accounting"].includes(perspectiveId),
        };

        const executeRolePeriods = async (role: "sales" | "logistics", metricId: "sales_revenue" | "delivery_count") => {
          const roleMembers = members.filter((item) => item.draft.role === role);
          if (roleMembers.length === 0) return;
          const built = buildCanonicalPeriodPartitionWorkspace({
            workspaceId: `perspective:${perspectiveId}:${role}:${roleMembers.map((item) => item.boundary.sourceId).sort().join('|')}`,
            metricId,
            members: roleMembers.map((item) => ({ artifact: item.artifact, overlay: item.overlay })),
          });
          if (built.status !== "valid") throw new Error(built.blockers.join(", "));
          const result = await executeCanonicalPeriodPartitionWorkspace(built.workspace);
          if (result.status !== "executed") throw new Error(result.blockers.join(", "));
          periodExecutions.push({ workspace: built.workspace, result });
        };

        if (requestedCapabilities.sales) await executeRolePeriods("sales", "sales_revenue");
        if (requestedCapabilities.logistics) await executeRolePeriods("logistics", "delivery_count");

        if (requestedCapabilities.profitability) {
          const periods = [...new Set(members.flatMap((item) =>
            item.draft.periodStart ? [item.draft.periodStart.slice(0, 7)] : []))].sort();
          for (const period of periods) {
            const pair = members.filter((item) =>
              item.draft.periodStart?.slice(0, 7) === period
              && (item.draft.role === "sales" || item.draft.role === "accounting"));
            if (pair.length !== 2 || !pair.some((item) => item.draft.role === "sales") || !pair.some((item) => item.draft.role === "accounting")) continue;
            const built = await buildCanonicalMultiSourceDataset({
              multiSourceDatasetId: `perspective:${perspectiveId}:gross-profit:${period}`,
              members: pair.map((item) => ({ artifact: item.artifact, overlay: item.overlay, required: true })),
            });
            if (built.status !== "valid") throw new Error(built.blockers.join(", "));
            const analysis = built.dataset.analyses.find((item) => item.metricId === "gross_profit" && item.state === "ready");
            if (!analysis) throw new Error(built.dataset.analyses.flatMap((item) => item.blockers).join(", ") || "Gross profit is not ready.");
            const handoff = prepareCanonicalMultiSourceInvestigationHandoff(built.dataset, analysis.analysisId);
            if (!handoff || handoff.queryPlanning.state !== "planned" || !handoff.sourceBoundary) throw new Error("Gross-profit execution plan is unavailable.");
            const result = await executeCanonicalMultiSourceMetric({
              dataset: built.dataset,
              handoff,
              request: {
                schemaVersion: "lightbi.governed-metric-execution-request.v1",
                requestId: `easy-perspective:${perspectiveId}:${period}`,
                plan: handoff.queryPlanning.plan,
                rows: [],
                runtimeSource: handoff.sourceBoundary.runtimeSource,
                expectedRuntimeBinding: handoff.sourceBoundary.runtimeSource.binding,
                artifactIdentity: handoff.artifactIdentity,
                expectedSourceRowCount: handoff.sourceBoundary.sourceRowCount,
                groundTruth: {
                  state: "unavailable",
                  value: null,
                  tolerance: null,
                  provenance: "easy_mode_no_external_ground_truth",
                },
              },
            });
            if (result.status !== "executed") throw new Error(result.blockers.join(", "));
            multiSourceExecutions.push({ period, dataset: built.dataset, result });
          }
        }

        if (periodExecutions.length === 0 && multiSourceExecutions.length === 0) {
          throw new Error("This perspective needs evidence that is not executable yet.");
        }
        const primary = members[0];
        const combinedRows = new Map<string, Record<string, string | number>>();
        periodExecutions.forEach(({ workspace, result }) => result.rows.forEach((row) => {
          const period = String(row.reporting_period);
          combinedRows.set(period, { ...(combinedRows.get(period) ?? { reporting_period: period }), [workspace.metricId]: Number(row[workspace.metricId]) });
        }));
        multiSourceExecutions.forEach(({ period, result }) => {
          const governedActual = result.metricResult.groundTruthComparison.actual;
          const fullScopeTotals = result.metricResult.rows
            .map((row) => Number(row[GOVERNED_FULL_SCOPE_TOTAL_COLUMN]))
            .filter(Number.isFinite);
          const values = result.metricResult.rows.map((row) => Number(row.gross_profit)).filter(Number.isFinite);
          const total = governedActual !== null && Number.isFinite(Number(governedActual))
            ? Number(governedActual)
            : fullScopeTotals.length
              ? fullScopeTotals[0]
              : values.reduce((sum, value) => sum + value, 0);
          combinedRows.set(period, { ...(combinedRows.get(period) ?? { reporting_period: period }), gross_profit: total });
        });
        const analysisRows = [...combinedRows.values()].sort((left, right) =>
          String(left.reporting_period).localeCompare(String(right.reporting_period)));
        const deepDiveRole = ["profitability", "finance_accounting", "executive_overview"].includes(perspectiveId)
          ? "accounting"
          : perspectiveId === "fulfillment_operations"
            ? "logistics"
            : "sales";
        const deepDivePeriods: BAComparisonPeriodInput[] = members
          .filter((item) => item.draft.role === deepDiveRole)
          .map((item) => ({
            id: item.boundary.sourceId,
            label: item.draft.periodStart.slice(0, 7),
            sourceName: item.file.name,
            rows: (item.source.analysis_rows ?? item.boundary.semanticSample.rows) as Record<string, unknown>[],
            labelConfidence: "high" as const,
            labelReason: "Observed in the source and selected in this governed analysis.",
            sortableKey: item.draft.periodStart.slice(0, 7),
          }))
          .filter((item) => item.rows.length > 0);
        const canonicalPerspectiveBrief = deepDivePeriods.length >= 2
          ? createDomainComparisonBrief({
            datasetName: `${perspectiveId.replaceAll("_", " ")} analysis`,
            periods: deepDivePeriods,
            preferredDomain: deepDiveRole === "accounting"
              ? "finance"
              : deepDiveRole === "logistics"
                ? "operations"
                : "revenue",
          })
          : null;
        const canonicalPerspectiveEvidenceSources = members.map((item) => ({
          period: item.draft.periodStart?.slice(0, 7) ?? 'unavailable',
          role: item.draft.role ?? 'source',
          sourceName: item.file.name,
          sourceRowCount: item.boundary.sourceRowCount,
          rows: (item.source.analysis_rows ?? item.boundary.semanticSample.rows) as Record<string, unknown>[],
          semanticFields: generateCanonicalAIBriefing(item.artifact).semanticFields,
        }));
        registerAdvancedSource({
          id: advancedSourceId("canonical_perspective_collection", perspectiveId),
          name: `${perspectiveId.replaceAll("_", " ")} · ${members.length} governed sources`,
          sourceType: "canonical_perspective_collection",
          sourceKind: "local_file",
          tables: members.map((item, index) => ({
            id: `${index}:${item.draft.role}:${item.draft.periodStart.slice(0, 7)}`,
            name: `${item.draft.role || "source"}_${item.draft.periodStart.slice(0, 7) || index + 1}`,
            rowCount: item.boundary.sourceRowCount,
            columns: item.boundary.semanticSample.columns,
            profiles: item.source.profiles ?? {},
            file: item.file,
            sheetName: item.metadata.is_workbook ? item.metadata.default_sheet : undefined,
          })),
          semanticSample: {
            strategy: "governed_collection",
            sourceRowCount: members.reduce((sum, item) => sum + item.boundary.sourceRowCount, 0),
            sampleRowCount: members.reduce((sum, item) => sum + item.boundary.semanticSample.rows.length, 0),
          },
          registeredAt: new Date().toISOString(),
        });
        setCurrentDataset({
          status: 'ready',
          file_name: `${perspectiveId.replaceAll("_", " ")} analysis`,
          rows_count: members.reduce((sum, item) => sum + item.boundary.sourceRowCount, 0),
          columns: ["reporting_period", ...new Set(analysisRows.flatMap((row) => Object.keys(row).filter((key) => key !== "reporting_period")))],
          profiles: primary.source.profiles ?? {},
          sourceType: 'canonical_perspective_collection',
          sourceFiles: members.map((item) => ({
            name: item.file.name,
            rows: item.boundary.sourceRowCount,
            columns: item.boundary.semanticSample.columns.length,
            sourceId: item.boundary.sourceId,
            role: item.draft.role,
            reportingPeriod: item.draft.periodStart && item.draft.periodEnd ? `${item.draft.periodStart}/${item.draft.periodEnd}` : null,
            persistedFile: item.metadata.persisted_file,
            sheetNames: item.metadata.is_workbook && item.metadata.default_sheet ? [item.metadata.default_sheet] : [],
          })),
          selected_sheet: null,
          file_reference: primary.file,
          runtimeFileReferences: members.map(item => item.file),
          runtimeDatasetSource: primary.boundary.runtimeSource,
          semanticSample: {
            strategy: primary.boundary.semanticSample.strategy,
            sourceRowCount: primary.boundary.semanticSample.sourceRowCount,
            sampleRowCount: primary.boundary.semanticSample.rows.length,
          },
          canonicalSourceBoundary: primary.boundary,
          canonicalUserOverlay: primary.overlay,
          canonicalPerspectiveId: perspectiveId,
          canonicalPerspectiveBrief,
          canonicalPerspectiveEvidenceSources,
          canonicalPerspectiveExecutions: periodExecutions,
          canonicalPerspectiveMultiSourceExecutions: multiSourceExecutions,
          analysisRowScope: 'full_file_governed_collection',
          semanticRows: primary.boundary.semanticSample.rows,
          analysisRows,
          previewRows: analysisRows,
        });
        setMultiSourceBuildResult({ relationshipState: null, blockers: [] });
        setDecisionTrustReport(null);
        setPendingLocalBatch(null);
        return;
      }

      const selectedRoles = [...new Set(members.map((item) => item.draft.role).filter(Boolean))];
      const periodPartitionMetric = selectedRoles.length === 1 && selectedRoles[0] === 'sales'
        ? 'sales_revenue'
        : selectedRoles.length === 1 && selectedRoles[0] === 'logistics'
          ? 'delivery_count'
          : null;
      if (periodPartitionMetric && members.length >= 2) {
        const periodWorkspace = buildCanonicalPeriodPartitionWorkspace({
          workspaceId: `period-partition:${members.map((item) => item.boundary.sourceId).sort().join('|')}`,
          metricId: periodPartitionMetric,
          members: members.map((item) => ({ artifact: item.artifact, overlay: item.overlay })),
        });
        if (periodWorkspace.status !== 'valid') throw new Error(periodWorkspace.blockers.join(', '));
        const periodExecution = await executeCanonicalPeriodPartitionWorkspace(periodWorkspace.workspace);
        if (periodExecution.status !== 'executed') throw new Error(periodExecution.blockers.join(', '));
        const primary = members[0];
        const sourceFiles = members.map((item) => ({
          name: item.file.name,
          rows: item.boundary.sourceRowCount,
          columns: item.boundary.semanticSample.columns.length,
          sourceId: item.boundary.sourceId,
          role: item.draft.role,
          reportingPeriod: item.draft.periodStart && item.draft.periodEnd
            ? `${item.draft.periodStart}/${item.draft.periodEnd}`
            : null,
          persistedFile: item.metadata.persisted_file,
          sheetNames: item.metadata.is_workbook && item.metadata.default_sheet ? [item.metadata.default_sheet] : [],
        }));
        setCurrentDataset({
          status: 'ready',
          file_name: `Governed ${selectedRoles[0]} period comparison`,
          rows_count: members.reduce((sum, item) => sum + item.boundary.sourceRowCount, 0),
          columns: primary.boundary.semanticSample.columns,
          profiles: primary.source.profiles ?? {},
          sourceType: 'canonical_period_partition',
          sourceFiles,
          selected_sheet: primary.metadata.is_workbook ? primary.metadata.default_sheet : null,
          file_reference: primary.file,
          runtimeFileReferences: members.map(item => item.file),
          runtimeDatasetSource: primary.boundary.runtimeSource,
          semanticSample: {
            strategy: primary.boundary.semanticSample.strategy,
            sourceRowCount: primary.boundary.semanticSample.sourceRowCount,
            sampleRowCount: primary.boundary.semanticSample.rows.length,
          },
          canonicalSourceBoundary: primary.boundary,
          canonicalUserOverlay: primary.overlay,
          canonicalPeriodPartitionWorkspace: periodWorkspace.workspace,
          canonicalPeriodPartitionExecution: periodExecution,
          analysisRowScope: 'full_file_period_partitions',
          semanticRows: primary.boundary.semanticSample.rows,
          analysisRows: periodExecution.rows,
          previewRows: periodExecution.rows,
        });
        setMultiSourceBuildResult({ relationshipState: null, blockers: [] });
        setDecisionTrustReport(null);
        setPendingLocalBatch(null);
        return;
      }
      const built = await buildCanonicalMultiSourceDataset({
        multiSourceDatasetId: `multisource:${members.map((item) => item.boundary.sourceId).sort().join('|')}`,
        members: members.map((item) => ({ artifact: item.artifact, overlay: item.overlay, required: item.draft.role === 'sales' || item.draft.role === 'accounting' })),
      });
      if (built.status !== 'valid') throw new Error(built.blockers.join(', '));
      const analysis = built.dataset.analyses[0];
      const relationshipBlockers = [...new Set([...built.dataset.relationship.refusalReasons, ...analysis.blockers])];
      setMultiSourceBuildResult({ relationshipState: built.dataset.relationship.validationState, blockers: relationshipBlockers });
      if (analysis.state !== 'ready' || relationshipBlockers.length > 0) return;
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
        runtimeFileReferences: members.map(item => item.file),
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

  const handleAnalyzeMultiSourcePerspective = (
    perspective: CanonicalBusinessPerspectiveCandidateV1,
    periodScope: ReportingPeriodScopeV1 | null,
    options: { currency: string | null },
  ) => {
    const collectionSources = multiSourceReviewSources.map((source) => ({
      key: source.key,
      name: source.name,
      rowCount: source.rowCount,
      columns: source.columns,
      candidates: source.candidates ?? null,
    }));
    const suggested = suggestedDeclarationsForPerspective(collectionSources, perspective);
    const selectedPeriods = new Set(
      periodScope?.mode === "single"
        ? [periodScope.periodId]
        : periodScope?.mode === "compare"
          ? [periodScope.baselinePeriodId, periodScope.comparisonPeriodId]
          : periodScope?.mode === "trend"
            ? periodScope.periodIds
            : [],
    );
    const selectedKeys = new Set(perspective.sourceKeys);
    if (perspective.perspectiveId === "finance_accounting") {
      multiSourceReviewSources.forEach((source) => {
        if (source.candidates?.roleCandidates[0]?.value === "sales") selectedKeys.add(source.key);
      });
    }
    const nextDrafts = Object.fromEntries(multiSourceReviewSources.map((source) => {
      const suggestion = suggested[source.key] ?? {
        selected: false,
        role: "",
        documentColumn: "",
        periodStart: "",
        periodEnd: "",
        currency: "",
        monetaryColumns: "",
      };
      const period = source.candidates?.reportingPeriodCandidates[0]?.value;
      const periodId = period
        ? (period.start.slice(0, 7) === period.end.slice(0, 7)
          ? period.start.slice(0, 7)
          : `${period.start}/${period.end}`)
        : null;
      const inScope = selectedPeriods.size === 0 || (periodId !== null && selectedPeriods.has(periodId));
      const monetaryColumns = suggestion.monetaryColumns
        || (source.candidates?.monetaryColumnCandidates ?? []).map((candidate) => candidate.value.physicalColumn).join(", ");
      return [source.key, {
        ...suggestion,
        selected: selectedKeys.has(source.key) && inScope,
        currency: monetaryColumns ? (suggestion.currency || options.currency || "") : "",
        monetaryColumns,
      } satisfies MultiSourceDraftV1];
    }));
    setMultiSourceDrafts(nextDrafts);
    setMultiSourceBuildResult({ relationshipState: null, blockers: [] });
    if (perspective.perspectiveId === "data_trust") {
      setMultiSourceBuildResult({
        relationshipState: null,
        blockers: ["Technical evidence is available below. LightBI has not changed or joined any source."],
      });
      return;
    }
    const selectedSourceKeys = Object.entries(nextDrafts)
      .filter(([, draft]) => draft.selected)
      .map(([key]) => key);
    if (selectedSourceKeys.length === 1) {
      setSelectedPerspective(mapCollectionPerspectiveToDatasetPerspective(perspective.perspectiveId));
      handleUseMultiSourceReviewSource(selectedSourceKeys[0], nextDrafts[selectedSourceKeys[0]]);
      return;
    }
    setSelectedPerspective(mapCollectionPerspectiveToDatasetPerspective(perspective.perspectiveId));
    void handleBuildCanonicalMultiSource(nextDrafts, perspective.perspectiveId);
  };

  const handleBackToImportedPerspectives = () => {
    setResult(null);
    setSelectedTopic(null);
    setSelectedPerspective(null);
    setSelectedBusinessView(null);
    setPreviewActionId(null);
    setCurrentDataset(null);
    setWorkspaceState(null);
    setDecisionTrustReport(null);
    setCanonicalOverlayRebuildState('idle');
    setMultiSourceBuildResult({ relationshipState: null, blockers: [] });
    if (lastInspectedBatch) setPendingLocalBatch(lastInspectedBatch);
  };

  const handleUseLocalDataset = (familyIdOverride?: string, sourceNameOverride?: string, draftOverride?: MultiSourceDraftV1) => {
    if (!pendingLocalBatch || pendingLocalBatch.status !== 'ready') return;
    
    let familyId = familyIdOverride ?? pendingLocalBatch.selectedFamilyId;
    if (!familyId && pendingLocalBatch.families.length === 1) {
      familyId = pendingLocalBatch.families[0].id;
    }
    
    if (!familyId) return;

    const selectedFamily = pendingLocalBatch.families.find(f => f.id === familyId);
    if (!selectedFamily) return;
    const selectedSource = sourceNameOverride
      ? selectedFamily.files.find((item) => item.file.name === sourceNameOverride)
      : selectedFamily.files.length === 1
        ? selectedFamily.files[0]
        : null;
    if (!selectedSource || selectedSource.result.status !== 'accessible') return;
    const selectedMetadata = selectedSource.result.metadata;
    const selectedData = selectedMetadata.is_workbook && selectedMetadata.default_sheet && selectedMetadata.sheets
      ? selectedMetadata.sheets[selectedMetadata.default_sheet]
      : selectedMetadata;
    const family: DatasetFamily = {
      ...selectedFamily,
      id: `${selectedFamily.id}:${selectedSource.file.name}`,
      name: selectedSource.file.name,
      files: [selectedSource],
      columns: selectedData.columns ?? selectedFamily.columns,
      profiles: selectedData.profiles ?? selectedFamily.profiles,
      totalRows: selectedData.rows_count ?? 0,
    };

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
      const profiledSource = md?.is_workbook && md.default_sheet && md.sheets
        ? md.sheets[md.default_sheet]
        : md;
      return {
        name: item.file.name,
        rows,
        columns: colsCount,
        fingerprint: profiledSource?.canonical_full_file_profile?.sourceFingerprint ?? null,
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

    const sourceName = family.files[0].file.name;
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
    let canonicalUserOverlay: CanonicalUserOverlayV1 | undefined;
    if (canonicalSourceBoundary && draftOverride) {
      let overlay = createCanonicalUserOverlay(canonicalSourceBoundary);
      if (draftOverride.role) overlay = appendCanonicalEvidenceDeclaration(overlay, canonicalSourceBoundary, {
        evidenceType: 'source_role', value: { kind: 'source_role', role: draftOverride.role }, scope: { level: 'source_file' },
      });
      if (draftOverride.documentColumn) overlay = appendCanonicalEvidenceDeclaration(overlay, canonicalSourceBoundary, {
        evidenceType: 'document_identity', value: { kind: 'document_identity', physicalColumn: draftOverride.documentColumn }, scope: { level: 'physical_column', physicalColumn: draftOverride.documentColumn },
      });
      if (draftOverride.periodStart && draftOverride.periodEnd) overlay = appendCanonicalEvidenceDeclaration(overlay, canonicalSourceBoundary, {
        evidenceType: 'reporting_period', value: { kind: 'reporting_period', start: draftOverride.periodStart, end: draftOverride.periodEnd }, scope: { level: 'source_file' },
      });
      const monetaryColumns = draftOverride.monetaryColumns.split(',').map((value) => value.trim()).filter(Boolean);
      if (draftOverride.currency && monetaryColumns.length) overlay = appendCanonicalEvidenceDeclaration(overlay, canonicalSourceBoundary, {
        evidenceType: 'reporting_currency', value: { kind: 'reporting_currency', currency: draftOverride.currency, monetaryColumns }, scope: { level: 'source_file' },
      });
      canonicalUserOverlay = overlay;
    }
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
      canonicalSourceBoundary,
      canonicalUserOverlay,
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
      runtimeFileReferences: family.files.map(item => item.file),
      runtimeDatasetSource: canonicalSourceBoundary?.runtimeSource,
      semanticSample,
      canonicalSourceBoundary,
      canonicalUserOverlay,
      analysisRowScope: rawAnalysisRows.length >= family.totalRows ? 'full' : 'not_retained',
      semanticRows: rawSemanticRows,
      analysisRows: rawAnalysisRows,
      previewRows: finalPreviewRows
    });
    setDecisionTrustReport(createDecisionTrustReport(family));

    handleCancelInspection();
  };

  const askQuestion = useHomeQuestionApi({ apiBaseUrl: API_BASE_URL, currentDataset, setSelectedTopic, setIsAsking, setResult });
  const handleOnlineSourceInspected = useHomeOnlineSourceIntake({
    registerAdvancedSource, setCurrentDataset, setWorkspaceState, setDecisionTrustReport,
    resetAnalysis: () => { setResult(null); setSelectedTopic(null); setPreviewActionId(null); },
  });

  const handleLegacyQuestionSuggestion = (suggestion: any) => {
    if (workspaceState?.activeContext.type === 'business_view' && workspaceState.businessViewState) {
      const viewId = (workspaceState.activeContext as any).businessViewId;
      const view = workspaceState.businessViewState.confirmedBusinessViews.find(item => item.id === viewId);
      if (view && workspaceState.relationshipState?.graph) {
        planningWorkflow.setSelectedVirtualPlan(createVirtualDatasetPlan({
          businessView: view,
          question: suggestion,
          graph: workspaceState.relationshipState.graph,
          workspaceState,
        }));
        return;
      }
    }
    planningWorkflow.setRecipePreview(generateRecipePlan(suggestion.text));
  };

  return <HomeWorkspaceView model={{
    activeConnection, setActiveConnection, handleOnlineSourceInspected, result, isAsking, selectedTopic, currentDataset, pendingLocalBatch,
    isPlusMenuOpen, setIsPlusMenuOpen, isReplaceMenuOpen, setIsReplaceMenuOpen, setPendingLocalBatch, greeting: getHomeGreeting(), navigate, questionInputRef, inputValue, setInputValue, setIsInputFocused, askQuestion,
    activeAnalysisIntent, questionPlaceholder, renderSourcePickerMenu, activeChips, setAnalysisIntent, openLocalFilePicker, openOnlineDataDrawer,
    openDatabaseDrawer, workspaceSessions, sessionStatus, preferences, handleOpenWorkspaceSession, handleDeleteWorkspaceSession, fileInputRef,
    handleFileChange, uploadError, isUploading, workspaceState, isSavingSession,
    handleSaveWorkspaceSession, isDataPreviewOpen, setIsDataPreviewOpen, datasetUnderstandingNext,
    canonicalArtifact, canonicalPresentation, canonicalDomainPerspectives, handleCanonicalOverlayChange, handleCanonicalRemediation, canonicalOverlayRebuildState,
    runtimeSourceContinuity,
    canonicalMultiSourcePresentation,
    canonicalReviewTarget, multiSourceBuildResult, multiSourceReviewSources, multiSourceBundles, multiSourceDrafts, setMultiSourceDrafts, multiSourceBuilding,
    handleReviewMultiSourceBundle, handleUseMultiSourceReviewSource, handleBuildCanonicalMultiSource, handleAnalyzeMultiSourcePerspective, handleBackToImportedPerspectives, handleCancelInspection,
    handleToggleWorkbookSheet, handleAnalyzeSelectedWorkbookSheets, handleAnalyzeFullWorkbook, handleUseLocalDataset, guidedInvestigationResult, datasetUnderstanding,
    activeBusinessViews, selectedPerspective, setSelectedPerspective, analysisMode, setAnalysisMode, selectedBusinessView, setSelectedBusinessView,
    visibleQuestionSuggestions, selectedViewData, previewActionId, setPreviewActionId, handleSelectAnalysisAction, handleLegacyQuestionSuggestion,
    lastInspectedFamilies, getEChartsOption: createHomeChartOption, planningWorkflow, canonicalRows,
  }} />;
};
