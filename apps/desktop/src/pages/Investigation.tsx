import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Activity, AlertTriangle, ClipboardCheck, FileSpreadsheet } from 'lucide-react';
import { getCurrentInvestigationSession, type InvestigationSession } from '../lib/investigation-session';
import type { SafeSqlPreview } from '../lib/safe-sql-preview';
import type { DuckDBPreviewResult } from '../lib/duckdb-preview-sandbox';
import { executeGovernedDescriptiveAnalysis, prepareGovernedDescriptiveAnalysis } from '../lib/governed-descriptive-executor';
import { createChartPreviewModel, type ChartPreviewModel } from '../lib/chart-preview-model';
import { ChartPreviewRenderer } from '../components/analysis/ChartPreviewRenderer';
import { VisualNarrativeCanvas } from '../components/analysis/VisualNarrativeCanvas';
import { validatePreviewAgainstIntent, type ResultValidationResult } from '../lib/result-validator-contract';
import { useDisplayPreferences } from '../stores/display-preferences-store';
import { Settings2 } from 'lucide-react';
import { DisplayPreferencesModal } from '../components/settings/DisplayPreferencesModal';
import { DatasetInsightSummary } from '../components/analysis/DatasetInsightSummary';
import { createBADecisionBrief } from '../lib/ba-decision-engine';
import { BasicBAAnswerCard, BasicBAExplanation, BasicBANextAction } from '../components/investigation/InvestigationBAReadouts';
import { InvestigationDiagnostics } from '../components/investigation/InvestigationDiagnostics';
import { InvestigationDrillThroughPanel, type FilteredDeepAnalysisScope } from '../components/investigation/InvestigationDrillThroughPanel';
import { InvestigationDeepAnalysis } from '../components/investigation/InvestigationDeepAnalysis';
import { InvestigationSemanticContext } from '../components/investigation/InvestigationSemanticContext';
import { useAppRuntime } from '@lightbi/runtime';
import { ExecutionRunCoordinator } from '@lightbi/runtime';
import { advancedSourceId, useAdvancedSourceStore } from '../stores/advanced-source-store';
import { profileColumns } from '../lib/column-profiler';
import { executeGovernedMetricRequest } from '../lib/understanding-core/governed-metric-executor';
import type { GovernedMetricExecutionRequestV1 } from '../lib/understanding-core/governed-runtime-contracts';
import { createGovernedLocalDuckDBBoundary } from '../lib/understanding-core/governed-local-duckdb-boundary';
import { sourceBindingsMatch } from '../lib/understanding-core/canonical-source-boundary';
import { getLatestCanonicalConsumerArtifact, validateCanonicalInvestigationHandoff } from '../lib/understanding-core/canonical-consumer-boundary';
import { createBAAnalysisAuthorityContext } from '../lib/understanding-core/ba-analysis-authority-context';
import { validateCanonicalMultiSourceInvestigationHandoff, type CanonicalMultiSourceInvestigationHandoffV1 } from '../lib/understanding-core/canonical-multisource-boundary';
import { executeCanonicalMultiSourceMetric } from '../lib/understanding-core/governed-multisource-duckdb-boundary';
import { formatValue } from '../lib/display-formatter';
import { useUiLanguage } from '../lib/ui-language';
import { createSingleSourceBAOverview, sampleSingleSourceBARows } from '../lib/single-source-ba-overview';
import type { DecisionVisualizationPlanV1 } from '../lib/decision-visualization-plan';
import { buildInvestigationDecisionVisualizationPlan } from '../lib/investigation-visualization-plan';
import { buildInvestigationVisualNarrativePlan } from '../lib/investigation-visual-narrative';
import { buildPresentationCapabilityInventory, planPresentationStoryRequests, resolveRequestedSupportingAnalyses } from '../lib/presentation-capability-inventory';
import { createSingleSourceDeepAnalysisWorkbookPlan } from '../lib/analysis-workbook';
import { createInvestigationPersistenceActions } from '../lib/investigation-persistence-actions';
import { createInvestigationChartActions } from '../lib/investigation-chart-actions';
import { useInvestigationDrillThrough, type InvestigationDrillOrigin } from '../hooks/useInvestigationDrillThrough';
import { useFocusSubjectComparison } from '../hooks/useFocusSubjectComparison';
import { FocusSubjectComparisonCard } from '../components/investigation/FocusSubjectComparisonCard';
import { FocusSubjectBAAnswerCard, FocusSubjectBANextAction, FocusSubjectContextBundle } from '../components/investigation/FocusSubjectContextBundle';
import { buildFocusSubjectComparison } from '../lib/focus-subject-analysis';
import type { AnalysisPresentationMode } from '../lib/analysis-presentation-mode';
const SINGLE_SOURCE_BA_OVERVIEW_ROW_LIMIT = 1000;

function safeFileStem(value: string): string {
  return value.trim().replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '') || 'lightbi-session';
}

export const Investigation: React.FC = () => {
  const { t } = useUiLanguage();
  const navigate = useNavigate();
  const session = getCurrentInvestigationSession();
  const selectedPerspectiveId = session?.workspaceDataset && typeof session.workspaceDataset === 'object' && 'selectedPerspective' in session.workspaceDataset
    ? String((session.workspaceDataset as { selectedPerspective?: unknown }).selectedPerspective ?? '') || null
    : null;
  const isUniversalDescriptiveAction = Boolean(session?.analysisAction.id.startsWith('universal:'));
  const canonicalMultiSourceHandoff = session?.canonicalHandoff && 'multiSource' in session.canonicalHandoff
    ? session.canonicalHandoff as CanonicalMultiSourceInvestigationHandoffV1
    : null;
  const currentCanonicalArtifact = session ? getLatestCanonicalConsumerArtifact(session.datasetId) : null;
  const primaryAnalysisAuthority = useMemo(() => createBAAnalysisAuthorityContext(currentCanonicalArtifact, {
    actionCandidateId: session?.analysisAction.id ?? null,
    runtimePreflight: session?.canonicalHandoff?.runtimePreflight ?? null,
  }), [currentCanonicalArtifact?.identity, session?.analysisAction.id, session?.canonicalHandoff?.runtimePreflight.identity]);
  const focusComparison = useFocusSubjectComparison(session, primaryAnalysisAuthority);
  const staleHandoffBlockers = canonicalMultiSourceHandoff && session?.canonicalMultiSourceDataset
    ? validateCanonicalMultiSourceInvestigationHandoff(canonicalMultiSourceHandoff, session.canonicalMultiSourceDataset)
    : session?.canonicalHandoff && currentCanonicalArtifact
      ? validateCanonicalInvestigationHandoff(session.canonicalHandoff, currentCanonicalArtifact)
      : canonicalMultiSourceHandoff
        ? ['canonical_multisource_dataset_state_required']
        : [];
  const handoffCanExecute = Boolean(
    session?.canonicalHandoff
    && staleHandoffBlockers.length === 0
    && session.canonicalHandoff.runtimePreflight.executionAllowed
    && session.canonicalHandoff.queryPlanning.state === 'planned'
  );
  const universalCanExecute = Boolean(
    isUniversalDescriptiveAction
    && session?.runtimeDatasetSource
    && session.runtimePlanPreview.status !== 'blocked'
  );
  const canExecute = handoffCanExecute || universalCanExecute;
  const { preferences } = useDisplayPreferences();
  const registerAdvancedSource = useAdvancedSourceStore(state => state.registerSource);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [previewResult, setPreviewResult] = useState<DuckDBPreviewResult | null>(null);
  const [chartModel, setChartModel] = useState<ChartPreviewModel | null>(null);
  const [validationResult, setValidationResult] = useState<ResultValidationResult | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [showAiContext, setShowAiContext] = useState(false);
  const [deepAnalysisView, setDeepAnalysisView] = useState<
    { kind: 'perspective' } | { kind: 'selected_data'; scope: FilteredDeepAnalysisScope; origin: InvestigationDrillOrigin } | null
  >(null);
  const [analysisPresentationMode, setAnalysisPresentationMode] = useState<AnalysisPresentationMode>('primary');
  const openDeepAnalysis = (view: NonNullable<typeof deepAnalysisView>) => {
    setAnalysisPresentationMode('primary');
    setDeepAnalysisView(view);
  };
  const closeDeepAnalysis = () => {
    setDeepAnalysisView(null);
    setAnalysisPresentationMode('primary');
  };
  const filteredDeepAnalysisScope = deepAnalysisView?.kind === 'selected_data' ? deepAnalysisView.scope : null;
  const filteredDeepAnalysisOrigin = deepAnalysisView?.kind === 'selected_data' ? deepAnalysisView.origin : null;
  const filteredAnalysisAuthority = useMemo(() => {
    if (!session || !filteredDeepAnalysisScope) return null;
    const action = filteredDeepAnalysisOrigin?.analysisAction ?? session.analysisAction;
    return createBAAnalysisAuthorityContext(currentCanonicalArtifact, {
      actionCandidateId: action.id,
      runtimePreflight: action.id === session.analysisAction.id ? session.canonicalHandoff?.runtimePreflight ?? null : null,
    });
  }, [currentCanonicalArtifact?.identity, filteredDeepAnalysisOrigin?.analysisAction.id, filteredDeepAnalysisScope, session?.analysisAction.id, session?.canonicalHandoff?.runtimePreflight.identity]);
  const [savedChartNotice, setSavedChartNotice] = useState<string | null>(null);
  const [supportingCharts, setSupportingCharts] = useState<Array<InvestigationDrillOrigin & {
    actionId: string;
    label: string;
    runtimeIntent: InvestigationSession['runtimeIntent'];
    decisionVisualizationPlan?: DecisionVisualizationPlanV1 | null;
  }>>([]);
  const [isLoadingSupportingCharts, setIsLoadingSupportingCharts] = useState(false);
  const presentationStoryRequestPlan = useMemo(() => {
    if (!session?.supportingAnalyses?.length || session.focusSubject) return null;
    const capabilityInventory = buildPresentationCapabilityInventory({
      primaryAction: session.analysisAction,
      primaryRuntimeIntent: session.runtimeIntent,
      supportingAnalyses: session.supportingAnalyses,
    });
    return planPresentationStoryRequests({
      inventory: capabilityInventory,
      primaryDomain: primaryAnalysisAuthority?.domain.primaryDomain ?? null,
      perspectiveId: selectedPerspectiveId,
      budget: 6,
    });
  }, [session?.id, session?.supportingAnalyses, session?.analysisAction, session?.runtimeIntent, session?.focusSubject, primaryAnalysisAuthority?.domain.primaryDomain, selectedPerspectiveId]);
  // The overview is descriptive context beside a full-source governed result.
  // Build it once from a bounded representative sample so wide operational
  // files cannot block navigation by rescanning and sorting every row on each
  // React render. sourceRowCount keeps that sampling boundary explicit in BA.
  const singleSourceBAOverview = useMemo(() => {
    if (!session || session.businessFusionOverview) return null;
    return createSingleSourceBAOverview(sampleSingleSourceBARows(session.rows, SINGLE_SOURCE_BA_OVERVIEW_ROW_LIMIT), {
      sourceRowCount: session.runtimeDatasetSource?.sourceRowCount ?? session.rows?.length,
      analysisAction: session.analysisAction,
      semanticFields: session.aiBriefing?.semanticFields ?? [],
      analysisAuthority: primaryAnalysisAuthority,
      selectedPerspective: selectedPerspectiveId,
    });
  }, [session, primaryAnalysisAuthority?.artifactIdentity, primaryAnalysisAuthority?.authorization.metric?.metricId, primaryAnalysisAuthority?.authorization.metric?.runtimeState]);
  const filteredSingleSourceBAOverview = useMemo(() => {
    if (!session || !filteredDeepAnalysisScope || session.businessFusionOverview) return null;
    return createSingleSourceBAOverview(
      sampleSingleSourceBARows(filteredDeepAnalysisScope.rows, SINGLE_SOURCE_BA_OVERVIEW_ROW_LIMIT),
      {
        sourceRowCount: filteredDeepAnalysisScope.selectedRowCount,
        analysisAction: filteredDeepAnalysisOrigin?.analysisAction ?? session.analysisAction,
        semanticFields: session.aiBriefing?.semanticFields ?? [],
        analysisAuthority: filteredAnalysisAuthority,
        selectedPerspective: session.workspaceDataset && typeof session.workspaceDataset === 'object' && 'selectedPerspective' in session.workspaceDataset
          ? String((session.workspaceDataset as { selectedPerspective?: unknown }).selectedPerspective ?? '') || null
          : null,
      },
    );
  }, [session, filteredDeepAnalysisOrigin, filteredDeepAnalysisScope, filteredAnalysisAuthority?.artifactIdentity, filteredAnalysisAuthority?.authorization.metric?.metricId, filteredAnalysisAuthority?.authorization.metric?.runtimeState]);
  const filteredFocusComparison = useMemo(() => {
    if (!session?.focusSubject || !filteredDeepAnalysisScope) return null;
    return buildFocusSubjectComparison(
      filteredDeepAnalysisScope.rows, session.focusSubject,
      filteredDeepAnalysisOrigin?.analysisAction ?? session.analysisAction, 10,
      { kind: 'selected_rows', isTruncated: filteredDeepAnalysisScope.isTruncated },
      filteredAnalysisAuthority,
    );
  }, [session, filteredDeepAnalysisOrigin, filteredDeepAnalysisScope, filteredAnalysisAuthority?.artifactIdentity, filteredAnalysisAuthority?.authorization.metric?.metricId, filteredAnalysisAuthority?.authorization.metric?.runtimeState]);
  const executionRuns = useRef(new ExecutionRunCoordinator('simple-preview'));
  const supportingRuns = useRef(new ExecutionRunCoordinator('supporting-previews'));
  const autoPreviewSessionId = useRef<string | null>(null);
  const workspaceSessionPersisted = useRef(false);
  const {
    closeDrillThrough, drillError, drillExportBaseName, drillOrigin, drillResult, isDrilling,
    runDrillThrough, selectedDrillRows, selectedRows, setSelectedDrillRows,
  } = useInvestigationDrillThrough({
    datasetId: session?.datasetId ?? 'lightbi', rows: session?.rows ?? [],
    runtimeDatasetSource: session?.runtimeDatasetSource, rowScope: session?.rowScope,
    fieldBindings: session?.aiBriefing?.semanticFields,
  });
  const createChart = useAppRuntime(state => state.createChart);
  const createDashboard = useAppRuntime(state => state.createDashboard);
  const addChartToDashboard = useAppRuntime(state => state.addChartToDashboard);

  useEffect(() => () => {
    executionRuns.current.cancel();
    supportingRuns.current.cancel();
  }, []);

  useEffect(() => {
    if (!session || workspaceSessionPersisted.current) return;
    workspaceSessionPersisted.current = true;
    void persistWorkspaceSession();
  }, [session]);

  useEffect(() => {
    if (!session?.rows?.length) return;
    const columns = Object.keys(session.rows[0] || {});
    if (columns.length === 0) return;
    const rows = session.rows;
    const sourceName = session.datasetId || session.analysisAction.opportunityName || 'Investigation dataset';
    const tableName = sourceName.length > 80 ? 'analysis_rows' : sourceName;
    const file = new File([JSON.stringify(rows)], `${safeFileStem(sourceName)}.json`, { type: 'application/json' });
    registerAdvancedSource({
      id: advancedSourceId('investigation', sourceName),
      name: sourceName,
      sourceType: 'investigation',
      sourceKind: 'local_file',
      tables: [{
        id: '0:analysis_rows',
        name: tableName,
        rowCount: rows.length,
        columns,
        profiles: profileColumns(columns, rows, rows.length),
        file,
      }],
      semanticSample: {
        strategy: 'investigation_rows',
        sourceRowCount: rows.length,
        sampleRowCount: rows.length,
      },
      registeredAt: new Date().toISOString(),
    }, { activate: false });
  }, [registerAdvancedSource, session]);

  useEffect(() => {
    if (!session || !canExecute || autoPreviewSessionId.current === session.id) return;
    const timer = window.setTimeout(() => {
      if (autoPreviewSessionId.current === session.id) return;
      autoPreviewSessionId.current = session.id;
      void handleRunPreview();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [session, canExecute]);

  useEffect(() => {
    if (session?.focusSubject) {
      setSupportingCharts([]);
      setIsLoadingSupportingCharts(false);
      return;
    }
    if (!session?.supportingAnalyses?.length || !session.runtimeDatasetSource) {
      setSupportingCharts([]);
      return;
    }
    const storyRequestPlan = presentationStoryRequestPlan;
    if (!storyRequestPlan) {
      setSupportingCharts([]);
      return;
    }
    // Execute a bounded role-aware request plan over capabilities that already
    // exist in the governed workspace. Presentation planning may choose a
    // companion beyond the old first-six order, but cannot create metrics,
    // formulas, joins, or mutate Understanding.
    const candidates = resolveRequestedSupportingAnalyses({
      supportingAnalyses: session.supportingAnalyses,
      requestPlan: storyRequestPlan,
    });
    if (candidates.length === 0) {
      setSupportingCharts([]);
      return;
    }
    const run = supportingRuns.current.begin();
    setIsLoadingSupportingCharts(true);
    setSupportingCharts([]);
    void (async () => {
      const results: Array<InvestigationDrillOrigin & { actionId: string; label: string; runtimeIntent: InvestigationSession['runtimeIntent']; decisionVisualizationPlan?: DecisionVisualizationPlanV1 | null }> = [];
      for (const item of candidates) {
        if (!supportingRuns.current.isCurrent(run)) return;
        const preparation = prepareGovernedDescriptiveAnalysis(item.runtimePlanPreview, session.rows || []);
        try {
          const result = await executeGovernedDescriptiveAnalysis({
            preparation,
            rows: session.rows || [],
            runtimeDatasetSource: session.runtimeDatasetSource,
            sourceBoundary: currentCanonicalArtifact?.sourceBoundary,
            artifactIdentity: currentCanonicalArtifact?.identity,
            signal: run.signal,
          });
          const validation = validatePreviewAgainstIntent(item.runtimeIntent, result);
          if (result.status !== 'executed' || result.rows.length === 0 || validation.status === 'failed') continue;
          const model = createChartPreviewModel({
            previewResult: result,
            runtimePlan: preparation.runtimePlan,
            analysisLabel: item.analysisAction.opportunityName,
          });
          if (model.status === 'ready') {
            const decisionVisualizationPlan = buildInvestigationDecisionVisualizationPlan({
              chartModel: model, runtimeIntent: item.runtimeIntent, analysisAction: item.analysisAction,
              primaryDomain: primaryAnalysisAuthority?.domain.primaryDomain ?? null,
              selectedPerspectiveId,
            });
            results.push({
              actionId: item.analysisAction.id, label: item.analysisAction.opportunityName,
              analysisAction: item.analysisAction, runtimeIntent: item.runtimeIntent,
              runtimePlan: preparation.runtimePlan, chartModel: model, decisionVisualizationPlan,
            });
          }
        } catch (error) {
          console.warn('Supporting analysis skipped', item.analysisAction.id, error);
        }
      }
      if (supportingRuns.current.isCurrent(run)) setSupportingCharts(results);
    })().finally(() => {
      if (supportingRuns.current.isCurrent(run)) setIsLoadingSupportingCharts(false);
    });
    return () => supportingRuns.current.cancel();
  }, [session?.id, presentationStoryRequestPlan]);

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm text-center max-w-md w-full">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">No Active Session</h2>
          <p className="text-sm text-gray-500 mb-4">Please select an analysis from the Home page.</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  const { analysisAction, runtimeIntent, runtimePlanPreview, rows, aiBriefing, runtimeDatasetSource, rowScope, businessFusionOverview, canonicalHandoff } = session;
  const canonicalSourceBoundary = canonicalHandoff?.sourceBoundary;
  const fullFileSourceReady = canonicalMultiSourceHandoff
    ? canonicalMultiSourceHandoff.multiSource.requiredSourceIds.every((sourceId) => canonicalMultiSourceHandoff.multiSource.sourceMemberships.some((member) => member.sourceId === sourceId && member.runtimeSource.files.length > 0))
    : Boolean(
      canonicalSourceBoundary
      && sourceBindingsMatch(canonicalSourceBoundary, runtimeDatasetSource)
      && canonicalHandoff?.sourceFingerprint === canonicalSourceBoundary.sourceFingerprint
    );

  const readinessTier = staleHandoffBlockers.length > 0
    ? 'stale'
    : canExecute
      ? 'runtime_preflight_ready'
      : 'runtime_preflight_blocked';
  const readinessClass = canExecute ? 'text-emerald-600' : 'text-amber-600';
  const briefingRationale = staleHandoffBlockers.length > 0
    ? 'The source or overlay identity changed after this handoff was created.'
    : canExecute
      ? isUniversalDescriptiveAction
        ? 'This descriptive action passed the safe universal runtime boundary.'
        : 'The exact selected action passed the governed M3 runtime preflight.'
      : `Runtime preflight blockers: ${canonicalHandoff?.blockers.join(', ') || 'canonical_handoff_required'}.`;
  const safeActionHints = canExecute ? [analysisAction.opportunityName] : [];
  const descriptivePreparation = prepareGovernedDescriptiveAnalysis(runtimePlanPreview, rows || []);
  const enhancedRuntimePlan = descriptivePreparation.runtimePlan;
  const universalSafeSqlPreview = descriptivePreparation.sqlPreview;
  const safeSqlPreview: SafeSqlPreview = isUniversalDescriptiveAction
    ? universalSafeSqlPreview
    : canonicalHandoff?.queryPlanning.state === 'planned'
    ? {
      id: `sql_${canonicalHandoff.queryPlanning.plan.planId}`,
      sourcePlanId: canonicalHandoff.queryPlanning.plan.planId,
      status: 'ready',
      dialect: 'duckdb',
      sql: canonicalHandoff.queryPlanning.plan.sql,
      parameters: Object.fromEntries(canonicalHandoff.queryPlanning.plan.parameters.map((value, index) => [`parameter_${index + 1}`, value])),
      referencedColumns: [...new Set([
        ...canonicalHandoff.queryPlanning.plan.metricBindings.map(binding => binding.physicalColumn),
        ...canonicalHandoff.queryPlanning.plan.groupingBindings.map(binding => binding.physicalColumn),
        ...(canonicalHandoff.queryPlanning.plan.timeBinding ? [canonicalHandoff.queryPlanning.plan.timeBinding.physicalColumn] : []),
      ])],
      warnings: canonicalHandoff.queryPlanning.plan.restrictions.map(item => item.code),
      blockedReasons: [],
      source: 'runtime_plan_preview',
    }
    : {
      id: `sql_blocked_${canonicalHandoff?.artifactIdentity ?? 'canonical_handoff_required'}`,
      sourcePlanId: canonicalHandoff?.artifactIdentity ?? 'canonical_handoff_required',
      status: 'blocked',
      dialect: 'duckdb',
      sql: null,
      parameters: {},
      referencedColumns: [],
      warnings: [],
      blockedReasons: canonicalHandoff?.blockers.length ? [...canonicalHandoff.blockers] : ['canonical_handoff_required'],
      source: 'runtime_plan_preview',
    };
  const baDecisionBrief = previewResult?.status === 'executed'
    ? createBADecisionBrief({
      datasetId: session.datasetId,
      previewResult,
      chartModel,
      aiBriefing,
      runtimeIntent,
      governedContext: session.canonicalExecutionResult && canonicalHandoff ? {
        metricId: session.canonicalExecutionResult.metricId,
        businessPerspectiveIds: canonicalHandoff.actionCandidate?.businessPerspectiveIds ?? [],
        evidenceIds: session.canonicalExecutionResult.evidence.map(item => item.evidenceId),
        limitations: session.canonicalExecutionResult.limitations,
        restrictions: session.canonicalExecutionResult.restrictions.map(item => item.reason),
        fullFileRowCount: session.canonicalExecutionResult.fullFileExecution?.actualMaterializedRowCount ?? null,
        decisionUseAuthorized: canonicalHandoff.decisionUseAuthorized,
      } : undefined,
    })
    : null;
  const governedResultValues = previewResult?.status === 'executed' && session.canonicalExecutionResult
    ? session.canonicalExecutionResult.rows.map((row) => Number(row[session.canonicalExecutionResult!.metricId]))
    : [];
  const canonicalFullScopeTotal = session.canonicalExecutionResult?.groundTruthComparison.actual;
  const governedResultTotal = previewResult?.status === 'executed' && typeof canonicalFullScopeTotal === 'number' && Number.isFinite(canonicalFullScopeTotal)
    ? canonicalFullScopeTotal
    : governedResultValues.length > 0 && governedResultValues.every(Number.isFinite)
      ? governedResultValues.reduce((sum, value) => sum + value, 0) : null;
  const governedResultCurrency = session.canonicalMultiSourceExecutionResult?.evidence?.currency ?? null;
  const governedResultTotalLabel = governedResultTotal === null
    ? null
    : governedResultCurrency
      ? new Intl.NumberFormat(preferences.locale, {
        style: 'currency',
        currency: governedResultCurrency,
        maximumFractionDigits: 2,
      }).format(governedResultTotal)
      : formatValue(governedResultTotal, 'number', preferences, { compact: false });

  const primaryDecisionVisualizationPlan = useMemo<DecisionVisualizationPlanV1 | null>(() =>
    buildInvestigationDecisionVisualizationPlan({
      chartModel, runtimeIntent, analysisAction,
      primaryDomain: primaryAnalysisAuthority?.domain.primaryDomain ?? null,
      selectedPerspectiveId,
    }),
  [analysisAction, chartModel, primaryAnalysisAuthority?.domain.primaryDomain, runtimeIntent, selectedPerspectiveId]);

  const visualNarrative = useMemo(() => {
    if (!chartModel || chartModel.status !== 'ready' || !primaryDecisionVisualizationPlan || focusComparison.status === 'ready') return null;
    const sourceScopeKey = session.canonicalHandoff?.artifactIdentity ?? currentCanonicalArtifact?.identity ?? session.datasetId;
    try {
      return buildInvestigationVisualNarrativePlan({
        primaryDomain: primaryAnalysisAuthority?.domain.primaryDomain ?? null,
        selectedPerspectiveId,
        storyTarget: presentationStoryRequestPlan ? {
          layoutCount: presentationStoryRequestPlan.targetLayoutCount,
          companionRoles: [...presentationStoryRequestPlan.targetCompanionRoles],
          source: 'pre_execution_story_plan',
        } : null,
        items: [
          {
            id: analysisAction.id, isPrimary: true,
            managementQuestion: analysisAction.description || analysisAction.opportunityName,
            analysisAction, runtimeIntent, chartModel,
            decisionVisualizationPlan: primaryDecisionVisualizationPlan,
            sourceScopeKey,
          },
          ...supportingCharts.map(item => ({
            id: item.actionId, isPrimary: false,
            managementQuestion: item.analysisAction.description || item.label,
            analysisAction: item.analysisAction, runtimeIntent: item.runtimeIntent,
            chartModel: item.chartModel,
            decisionVisualizationPlan: item.decisionVisualizationPlan ?? null,
            sourceScopeKey,
          })),
        ],
      });
    } catch (error) {
      console.warn('Visual narrative composition skipped', error);
      return null;
    }
  }, [analysisAction, chartModel, currentCanonicalArtifact?.identity, focusComparison.status, primaryAnalysisAuthority?.domain.primaryDomain, primaryDecisionVisualizationPlan, runtimeIntent, selectedPerspectiveId, session.canonicalHandoff?.artifactIdentity, session.datasetId, supportingCharts, presentationStoryRequestPlan]);

  const visualNarrativeCanvasItems = visualNarrative && chartModel ? [
    {
      id: analysisAction.id, label: analysisAction.opportunityName, chartModel,
      visualizationPlan: primaryDecisionVisualizationPlan?.visualizationPlan ?? null,
      onDrillThrough: (point: Parameters<typeof runDrillThrough>[0]) => { void runDrillThrough(point, { analysisAction, runtimePlan: isUniversalDescriptiveAction ? enhancedRuntimePlan : runtimePlanPreview, chartModel }); },
    },
    ...supportingCharts.map(item => ({
      id: item.actionId, label: item.label, chartModel: item.chartModel,
      visualizationPlan: item.decisionVisualizationPlan?.visualizationPlan ?? null,
      onDrillThrough: (point: Parameters<typeof runDrillThrough>[0]) => { void runDrillThrough(point, item); },
    })),
  ] : [];


  const durableAnalysisWorkbookPlan = useMemo(() => {
    if (businessFusionOverview || !primaryDecisionVisualizationPlan || !chartModel || chartModel.status !== 'ready') return null;
    const unique = (values: Array<string | null | undefined>) => [...new Set(values.filter((value): value is string => Boolean(value?.trim())))];
    try {
      return createSingleSourceDeepAnalysisWorkbookPlan({
        title: analysisAction.opportunityName || chartModel.title || analysisAction.id,
        perspectiveId: primaryDecisionVisualizationPlan.perspectiveId,
        resultId: chartModel.sourceResultId ?? session.canonicalExecutionResult?.resultId ?? analysisAction.id,
        chartRows: chartModel.rows,
        kpis: singleSourceBAOverview?.kpis.map(kpi => ({ id: kpi.id, value: kpi.value })) ?? [],
        findings: unique([
          ...(singleSourceBAOverview?.findings ?? []),
          ...(baDecisionBrief?.insights.map(insight => insight.statement) ?? []),
        ]),
        recommendedActions: unique([
          ...(singleSourceBAOverview?.recommendedActions ?? []),
          ...(baDecisionBrief?.decisionSuggestions.map(item => item.action) ?? []),
        ]),
        caveats: unique([
          ...(singleSourceBAOverview?.limitations ?? []),
          ...(baDecisionBrief?.caveats ?? []),
        ]),
        decisionVisualizationPlan: primaryDecisionVisualizationPlan,
      });
    } catch {
      return null;
    }
  }, [analysisAction.id, analysisAction.opportunityName, baDecisionBrief, businessFusionOverview, chartModel, primaryDecisionVisualizationPlan, session.canonicalExecutionResult?.resultId, singleSourceBAOverview]);

  const { persistWorkspaceSession, returnToCurrentDataset } = createInvestigationPersistenceActions({
    session,
    durableAnalysisWorkbookPlan,
    navigate,
  });

  const { saveChartToLibrary, createPerspectiveDashboard } = createInvestigationChartActions({
    session,
    analysisAction,
    chartModel,
    previewResult,
    primaryDecisionVisualizationPlan,
    singleSourceBAOverview,
    baDecisionBrief,
    governedResultTotal,
    supportingCharts,
    visualNarrativePlan: visualNarrative?.plan ?? null,
    selectedPerspectiveId,
    createChart,
    createDashboard,
    addChartToDashboard,
    persistWorkspaceSession,
    setSavedChartNotice,
    closeDeepAnalysis,
    navigate,
    t,
  });

  async function handleRunPreview() {
      if (!session) return;
      if (staleHandoffBlockers.length > 0) {
        setPreviewResult({
          id: `canonical-stale:${canonicalHandoff?.artifactIdentity ?? 'unknown'}`,
          sourceSqlPreviewId: canonicalHandoff?.artifactIdentity ?? 'unknown',
          status: 'blocked',
          columns: [], rows: [], rowCount: 0, maxRows: 100,
          warnings: [],
          blockedReasons: staleHandoffBlockers,
          errorMessage: 'This analysis handoff has been superseded. Return to the current dataset review.',
          source: 'governed_duckdb_execution',
        });
        return;
      }
    await persistWorkspaceSession();
    const run = executionRuns.current.begin();
    setIsExecuting(true);
    setPreviewResult(null);
    setChartModel(null);
    setValidationResult(null);
    closeDrillThrough();
    try {
      if (isUniversalDescriptiveAction) {
        let result = await executeGovernedDescriptiveAnalysis({
          preparation: descriptivePreparation,
          rows: rows || [],
          runtimeDatasetSource,
          sourceBoundary: currentCanonicalArtifact?.sourceBoundary,
          artifactIdentity: currentCanonicalArtifact?.identity,
          signal: run.signal,
        });
        if (!executionRuns.current.isCurrent(run)) return;

        const validation = validatePreviewAgainstIntent(runtimeIntent, result);
        if (validation.status === 'failed' && result.status !== 'failed') {
          result = {
            ...result,
            status: 'failed',
            errorMessage: 'Validation boundary rejected the preview result due to insufficient quality or missing required data.',
          };
        }
        if (result.status === 'executed' && result.rows.length === 0) {
          result = {
            ...result,
            status: 'failed',
            errorMessage: 'Execution completed but returned an empty dataset. Analysis unavailable.',
          };
        }
        setPreviewResult(result);
        setValidationResult(validation);
        setChartModel(result.status === 'executed'
          ? createChartPreviewModel({ previewResult: result, runtimePlan: enhancedRuntimePlan, analysisLabel: analysisAction.opportunityName })
          : null);
        return;
      }
      if (!canonicalHandoff || canonicalHandoff.queryPlanning.state !== 'planned') {
          const planningBlockers = canonicalHandoff?.queryPlanning.state === 'blocked'
            ? canonicalHandoff.queryPlanning.blockers
            : [];
          const blockedReasons = [...new Set([
            ...(canonicalHandoff?.blockers ?? []),
            ...planningBlockers,
            ...(!canonicalHandoff ? ['canonical_handoff_required'] : []),
            ...(!fullFileSourceReady ? ['canonical_full_file_runtime_source_required'] : []),
          ])];
          const blocked: DuckDBPreviewResult = {
            id: `canonical-blocked:${canonicalHandoff?.artifactIdentity ?? 'canonical_handoff_required'}`,
            sourceSqlPreviewId: 'canonical-governed-preflight',
            status: 'blocked',
            columns: [], rows: [], rowCount: 0, maxRows: 100,
            warnings: [
              ...(canonicalHandoff?.runtimePreflight.restrictions.map(item => item.code) ?? []),
              ...(canonicalHandoff?.runtimePreflight.evidence.map(item => item.evidenceId) ?? []),
            ],
            blockedReasons,
            errorMessage: blockedReasons.join(', '),
            source: 'governed_duckdb_execution',
          };
          setPreviewResult(blocked);
          setValidationResult(validatePreviewAgainstIntent(runtimeIntent, blocked));
          setChartModel(null);
          return;
      }
      if ((!canonicalMultiSourceHandoff && (!canonicalSourceBoundary || !runtimeDatasetSource)) || !fullFileSourceReady) {
          const blocked: DuckDBPreviewResult = {
            id: `canonical-blocked:${canonicalHandoff.artifactIdentity}`,
            sourceSqlPreviewId: 'canonical-governed-preflight',
            status: 'blocked',
            columns: [], rows: [], rowCount: 0, maxRows: 100,
            warnings: [
              ...canonicalHandoff.runtimePreflight.restrictions.map(item => item.code),
              ...canonicalHandoff.runtimePreflight.evidence.map(item => item.evidenceId),
            ],
            blockedReasons: ['canonical_full_file_runtime_source_required'],
            errorMessage: 'canonical_full_file_runtime_source_required',
            source: 'governed_duckdb_execution',
          };
          setPreviewResult(blocked);
          setValidationResult(validatePreviewAgainstIntent(runtimeIntent, blocked));
          setChartModel(null);
          return;
      }
      const governedRequest: GovernedMetricExecutionRequestV1 = {
          schemaVersion: 'lightbi.governed-metric-execution-request.v1',
          requestId: `consumer:${canonicalHandoff.queryPlanning.plan.planId}`,
          plan: canonicalHandoff.queryPlanning.plan,
          rows: [],
          runtimeSource: runtimeDatasetSource!,
          expectedRuntimeBinding: runtimeDatasetSource!.binding,
          artifactIdentity: canonicalHandoff.artifactIdentity,
          expectedSourceRowCount: runtimeDatasetSource!.sourceRowCount,
          groundTruth: { state: 'unavailable', value: null, tolerance: null, provenance: 'production_consumer_no_ground_truth' },
        };
        const multiSourceExecution = canonicalMultiSourceHandoff && session.canonicalMultiSourceDataset
          ? await executeCanonicalMultiSourceMetric({
              dataset: session.canonicalMultiSourceDataset,
              handoff: canonicalMultiSourceHandoff,
              request: governedRequest,
              signal: run.signal,
            })
          : null;
        if (multiSourceExecution) session.canonicalMultiSourceExecutionResult = multiSourceExecution;
        const governed = multiSourceExecution?.metricResult ?? await executeGovernedMetricRequest(governedRequest, createGovernedLocalDuckDBBoundary({
              runtimeSource: runtimeDatasetSource!,
              expectedRuntimeBinding: runtimeDatasetSource!.binding,
            }));
        session.canonicalExecutionResult = governed;
        const canonicalResult: DuckDBPreviewResult = {
          id: governed.resultId,
          sourceSqlPreviewId: governed.queryPlanIdentity,
          status: governed.status,
          columns: governed.columns,
          rows: governed.rows,
          rowCount: governed.rowCount,
          maxRows: 100,
          warnings: [
            ...governed.limitations,
            ...governed.restrictions.map(item => item.code),
            ...governed.evidence.map(item => item.evidenceId),
          ],
          blockedReasons: governed.status === 'blocked' ? governed.limitations : [],
          errorMessage: governed.error ?? undefined,
          executionScope: governed.fullFileExecution?.executionScope ?? rowScope,
          source: 'governed_duckdb_execution',
        };
        if (!executionRuns.current.isCurrent(run)) return;
        const validation = validatePreviewAgainstIntent(runtimeIntent, canonicalResult);
        const result = canonicalResult.status === 'executed' && canonicalResult.rowCount === 0
          ? {
              ...canonicalResult,
              status: 'failed' as const,
              errorMessage: 'Execution completed but returned an empty dataset. Analysis unavailable.',
            }
          : canonicalResult.status === 'executed' && validation.status === 'failed'
            ? {
                ...canonicalResult,
                status: 'failed' as const,
                warnings: [...new Set([...canonicalResult.warnings, ...validation.warnings])],
                errorMessage: 'Validation boundary rejected the preview result due to insufficient quality or missing required data.',
              }
            : canonicalResult;
        setPreviewResult(result);
        setValidationResult(validation);
        setChartModel(result.status === 'executed'
          ? createChartPreviewModel({ previewResult: result, runtimePlan: runtimePlanPreview, analysisLabel: analysisAction.opportunityName })
          : null);
      return;
    } catch (error) {
      if (executionRuns.current.isCurrent(run) && !(error instanceof DOMException && error.name === 'AbortError')) {
        console.error('Preview execution failed', error);
        const failed: DuckDBPreviewResult = {
          id: `canonical-failed:${canonicalHandoff?.artifactIdentity ?? 'canonical_handoff_required'}`,
          sourceSqlPreviewId: canonicalHandoff?.queryPlanning.state === 'planned'
            ? canonicalHandoff.queryPlanning.plan.planId
            : 'canonical-governed-preflight',
          status: 'failed',
          columns: [],
          rows: [],
          rowCount: 0,
          maxRows: 100,
          warnings: [
            ...(canonicalHandoff?.runtimePreflight.restrictions.map(item => item.code) ?? []),
            ...(canonicalHandoff?.runtimePreflight.evidence.map(item => item.evidenceId) ?? []),
          ],
          blockedReasons: [],
          errorMessage: error instanceof Error ? error.message : 'Canonical preview execution failed.',
          executionScope: rowScope,
          source: 'governed_duckdb_execution',
        };
        setPreviewResult(failed);
        setValidationResult(validatePreviewAgainstIntent(runtimeIntent, failed));
        setChartModel(null);
      }
    } finally {
      if (executionRuns.current.finish(run)) {
        setIsExecuting(false);
      }
    }
  }

  return (
    <div className="flex h-full min-h-0 overflow-hidden bg-[#fbfbfa]">
      <div data-testid="investigation-primary-pane" className="flex min-w-0 flex-1 flex-col overflow-y-auto">
      <header className="sticky top-0 z-10 flex items-center gap-4 border-b border-black/10 bg-[#fbfbfa]/95 px-5 py-3 backdrop-blur">
        <button
          data-testid="investigation-back-to-perspectives"
          onClick={() => { void returnToCurrentDataset(); }}
          className="inline-flex items-center gap-2 rounded-lg border border-black/10 bg-white px-3 py-2 text-xs font-semibold text-black/60 transition-colors hover:bg-black/[0.04] hover:text-[#202123]"
          title={t('Back to perspectives')}
        >
          <ArrowLeft className="w-5 h-5" />
          <span>{t('Back to perspectives')}</span>
        </button>
        <div className="flex-1">
          <h1 className="text-[15px] font-semibold leading-tight text-[#202123]">
            {analysisAction.opportunityName}
          </h1>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[11px] font-medium text-black/45">{t('Dataset')}: {session.datasetId}</span>
            <span className="text-black/20">•</span>
            <span className="rounded border border-black/10 bg-white px-1.5 py-0.5 text-[11px] font-medium text-black/60">
              {analysisAction.actionType}
            </span>
            {session.focusSubject && <span className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[11px] font-medium text-slate-700">Focus: {session.focusSubject.displayLabel}</span>}
          </div>
        </div>
      </header>

      <main className="lb-page-gutter flex flex-1 flex-col gap-5 !pb-24 !pt-5">
        {aiBriefing && <InvestigationSemanticContext
          briefing={aiBriefing}
          briefingRationale={briefingRationale}
          readinessClass={readinessClass}
          readinessTier={readinessTier}
          safeActionHints={safeActionHints}
          show={showAiContext}
          onToggle={() => setShowAiContext(!showAiContext)}
        />}

        {staleHandoffBlockers.length > 0 && <div role="alert" data-testid="investigation-stale-handoff" className="rounded-[14px] border border-amber-200 bg-amber-50 p-4 text-amber-900">
          <div className="text-sm font-semibold">This analysis is stale</div>
          <p className="mt-1 text-xs">The dataset or source evidence changed after this analysis was created. The old action will not run.</p>
          <button type="button" onClick={() => { void returnToCurrentDataset(); }} className="mt-3 rounded border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold">Return to current dataset</button>
        </div>}
        {!canExecute && staleHandoffBlockers.length === 0 && <div role="status" data-testid="investigation-preflight-blocked" className="rounded-[14px] border border-amber-200 bg-amber-50 p-4 text-amber-900">
          <div className="text-sm font-semibold">Analysis Blocked</div>
          <p className="mt-1 text-xs">The governed runtime preflight did not authorize this action. ({canonicalHandoff?.blockers.join(', ') || 'canonical_handoff_required'})</p>
          <button type="button" onClick={() => { void returnToCurrentDataset(); }} className="mt-3 rounded border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold">Return to mappings and evidence</button>
        </div>}

        {/* Primary Analysis Surface */}
        <section data-testid="single-decision-workspace" data-layout="answer-first-canvas" className="flex flex-col bg-white">
          <div className="flex flex-col gap-4 border-y border-[var(--lb-divider)] px-1 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="mb-1 text-[16px] font-semibold text-[#202123]">{session.focusSubject ? 'Focused decision workspace' : t('Decision workspace')}</h2>
              <p className="text-[13px] text-black/45">{session.focusSubject ? 'The selected entity is the primary readout; full-population evidence remains available below.' : t('Chart preview, BA brief, and raw evidence stay together for review.')}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setIsSettingsOpen(true)} className="inline-flex items-center gap-1.5 rounded-[10px] border border-black/10 bg-[#fbfbfa] px-3 py-2 text-xs font-medium text-black/65 transition-colors hover:bg-black/[0.035] hover:text-[#202123]" title="Chart display preferences"><Settings2 className="h-3.5 w-3.5" strokeWidth={1.7} />{t('View')}</button>
              <button data-testid="perspective-deep-analysis-button" onClick={() => { void persistWorkspaceSession().finally(() => openDeepAnalysis({ kind: 'perspective' })); }} disabled={isExecuting || previewResult?.status !== 'executed' || !canExecute} className="inline-flex items-center gap-1.5 rounded-[10px] border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-medium text-violet-700 transition-colors hover:bg-violet-100 disabled:cursor-not-allowed disabled:border-black/10 disabled:bg-white disabled:text-black/30" title="Open a deeper BA explanation for this selected decision angle"><ClipboardCheck className="h-3.5 w-3.5" strokeWidth={1.7} />{t('Analyze deeper')}</button>
              <button onClick={() => { void saveChartToLibrary(); }} disabled={!chartModel || chartModel.status !== 'ready'} className="inline-flex items-center gap-1.5 rounded-[10px] border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100 disabled:cursor-not-allowed disabled:border-black/10 disabled:bg-white disabled:text-black/30" title="Save this executed chart as a reusable dashboard card"><FileSpreadsheet className="h-3.5 w-3.5" strokeWidth={1.7} />{t('Save chart')}</button>
              <button data-run-preview="true" onClick={handleRunPreview} disabled={isExecuting || !canExecute} title={!canExecute ? 'Resolve the runtime preflight blockers before running this analysis.' : undefined} className="rounded-[10px] bg-[#202123] px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-black disabled:opacity-50">{isExecuting ? t('Running...') : previewResult ? t('Refresh preview') : t('Run preview')}</button>
            </div>
          </div>

          <div className="space-y-5 py-5">
            <div data-testid="decision-main-answer-region">
              {focusComparison.status === 'ready' ? <FocusSubjectBAAnswerCard comparison={focusComparison.comparison} /> : baDecisionBrief ? <BasicBAAnswerCard brief={baDecisionBrief} /> : null}
            </div>

            {focusComparison.status !== 'ready' && governedResultTotal !== null && session.canonicalExecutionResult && (
              <section data-testid="decision-key-number" className="border-b border-[var(--lb-divider)] pb-4">
                <div data-testid="governed-result-summary" className="flex flex-col gap-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">{t('Governed result total')}</p>
                  <p className="text-2xl font-semibold text-slate-950">{governedResultTotalLabel}</p>
                  <p className="text-xs text-slate-500">{session.canonicalExecutionResult.metricId} across {governedResultValues.length.toLocaleString()} governed result group{governedResultValues.length === 1 ? '' : 's'}.</p>
                </div>
              </section>
            )}

            <section data-testid="decision-primary-visual" className="min-w-0">
              {session.focusSubject ? (
                <div className="space-y-4" data-testid="focused-primary-analysis">
                  <FocusSubjectComparisonCard state={focusComparison} />
                  {chartModel && <details data-testid="focus-population-context" className="border-t border-[var(--lb-divider)] pt-3">
                    <summary className="cursor-pointer text-xs font-semibold text-slate-600">View full-population governed chart</summary>
                    <p className="mt-2 text-[11px] leading-5 text-slate-400">This chart remains the governed population evidence. It is supporting context; the focused benchmark above is the primary readout.</p>
                    <div className="mt-4 rounded-[14px] border border-black/10 bg-white p-4"><ChartPreviewRenderer model={chartModel} visualizationPlan={primaryDecisionVisualizationPlan?.visualizationPlan ?? null} onDrillThrough={(point) => { void runDrillThrough(point, { analysisAction, runtimePlan: isUniversalDescriptiveAction ? enhancedRuntimePlan : runtimePlanPreview, chartModel }); }} /></div>
                  </details>}
                </div>
              ) : previewResult?.status === 'blocked' ? (
                <div className="flex h-64 w-full flex-col items-center justify-center border-y border-amber-200 bg-amber-50/50 p-6 text-center text-amber-700"><AlertTriangle className="mb-2 h-8 w-8 text-amber-500" /><span className="text-sm font-medium">Analysis Blocked</span><span className="mt-1 text-xs text-amber-600">{previewResult.blockedReasons.join(', ') || 'Canonical preflight did not authorize execution.'}</span></div>
              ) : previewResult?.status === 'failed' ? (
                <div className="flex h-64 w-full flex-col items-center justify-center border-y border-red-200 bg-red-50/50 p-6 text-center text-red-500"><AlertTriangle className="mb-2 h-8 w-8 text-red-400" /><span className="text-sm font-medium">Execution Failed</span><span className="mt-1 text-xs text-red-400">{previewResult.errorMessage || 'Preview could not be rendered.'}</span></div>
              ) : previewResult?.rows && previewResult.rows.length > 0 && runtimeIntent.expectedShape === 'table' ? (
                <div className="space-y-5">
                  <DatasetInsightSummary columns={previewResult.columns} rows={previewResult.rows} rowCount={previewResult.rowCount} />
                  {visualNarrative ? <VisualNarrativeCanvas plan={visualNarrative.plan} items={visualNarrativeCanvasItems} /> : chartModel && chartModel.chartType !== 'table' ? <div className="rounded-[14px] border border-black/10 bg-white p-4"><ChartPreviewRenderer model={chartModel} visualizationPlan={primaryDecisionVisualizationPlan?.visualizationPlan ?? null} onDrillThrough={(point) => { void runDrillThrough(point, { analysisAction, runtimePlan: isUniversalDescriptiveAction ? enhancedRuntimePlan : runtimePlanPreview, chartModel }); }} /></div> : null}
                </div>
              ) : visualNarrative ? (
                <VisualNarrativeCanvas plan={visualNarrative.plan} items={visualNarrativeCanvasItems} />
              ) : chartModel && runtimeIntent.expectedShape !== 'table' ? (
                <div className="rounded-[14px] border border-black/10 bg-white p-4"><ChartPreviewRenderer model={chartModel} visualizationPlan={primaryDecisionVisualizationPlan?.visualizationPlan ?? null} onDrillThrough={(point) => { void runDrillThrough(point, { analysisAction, runtimePlan: isUniversalDescriptiveAction ? enhancedRuntimePlan : runtimePlanPreview, chartModel }); }} /></div>
              ) : (
                <div className="flex h-64 w-full flex-col items-center justify-center border-y border-slate-200 bg-slate-50 text-slate-400"><Activity className={`mb-2 h-8 w-8 text-slate-300 ${isExecuting ? 'animate-pulse' : ''}`} /><span className="text-sm font-medium">{isExecuting ? 'Preparing preview...' : 'Ready to preview'}</span>{!isExecuting && <button onClick={handleRunPreview} disabled={!canExecute} title={!canExecute ? 'Resolve the runtime preflight blockers before running this analysis.' : undefined} className="mt-4 rounded-md border border-black/10 bg-white px-3 py-1.5 text-xs font-medium text-black/65 transition-colors hover:bg-black/[0.035]">Preview chart</button>}</div>
              )}
            </section>

            {savedChartNotice && <div className="border-y border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">{savedChartNotice}</div>}

            {focusComparison.status === 'ready' ? <FocusSubjectContextBundle comparison={focusComparison.comparison} /> : baDecisionBrief ? <BasicBAExplanation brief={baDecisionBrief} /> : null}

            {focusComparison.status !== 'ready' && isLoadingSupportingCharts && visualNarrative?.plan.layoutCount === 1 && (
              <div data-testid="visual-narrative-loading" className="border-t border-[var(--lb-divider)] pt-3 text-[11px] text-black/40">
                {t('Checking complementary evidence for this perspective...')}
              </div>
            )}


            {focusComparison.status === 'ready' ? <FocusSubjectBANextAction canAnalyzeDeeper={previewResult?.status === 'executed' && canExecute} onAnalyzeDeeper={() => { void persistWorkspaceSession().finally(() => openDeepAnalysis({ kind: 'perspective' })); }} /> : baDecisionBrief ? <BasicBANextAction brief={baDecisionBrief} canAnalyzeDeeper={previewResult?.status === 'executed' && canExecute} onAnalyzeDeeper={() => { void persistWorkspaceSession().finally(() => openDeepAnalysis({ kind: 'perspective' })); }} /> : null}

            {(runtimeIntent.dimensions.length > 0 || runtimeIntent.measures.length > 0 || (runtimeIntent.derivedMeasures?.length ?? 0) > 0 || (previewResult?.status === 'executed' && session.canonicalExecutionResult && canonicalHandoff)) && (
              <div data-testid="decision-evidence-details">
                <details data-testid="governed-result-context" className="border-t border-[var(--lb-divider)] pt-4 text-xs text-black/60">
                <summary className="cursor-pointer font-semibold text-[#202123]">{t('Governed result context')}</summary>
                <div className="mt-3 flex flex-wrap gap-4">
                  {runtimeIntent.dimensions.length > 0 && <div><span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{t('Dimensions')}</span><div className="mt-1 flex flex-wrap gap-2">{runtimeIntent.dimensions.map(d => <span key={d} className="rounded-md border border-blue-100 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">{d}</span>)}</div></div>}
                  {(runtimeIntent.measures.length > 0 || (runtimeIntent.derivedMeasures?.length ?? 0) > 0) && <div><span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{t('Measures')}</span><div className="mt-1 flex flex-wrap gap-2">{[...runtimeIntent.measures, ...(runtimeIntent.derivedMeasures ?? []).flatMap(m => [m.numeratorLabel, m.denominatorLabel, m.label])].map(m => <span key={m} className="rounded-md border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">{m}</span>)}</div></div>}
                </div>
                {previewResult?.status === 'executed' && session.canonicalExecutionResult && canonicalHandoff && <div className="mt-4 grid gap-3 border-t border-black/5 pt-3 md:grid-cols-2"><div><p><span className="font-medium text-black/75">Metric:</span> {session.canonicalExecutionResult.metricId}</p><p><span className="font-medium text-black/75">Action:</span> {session.canonicalExecutionResult.actionId}</p><p className="break-all"><span className="font-medium text-black/75">Query plan:</span> {session.canonicalExecutionResult.queryPlanIdentity}</p><p><span className="font-medium text-black/75">Result rows:</span> {session.canonicalExecutionResult.rowCount.toLocaleString()}</p></div><div><p><span className="font-medium text-black/75">Execution scope:</span> {session.canonicalExecutionResult.fullFileExecution?.executionScope ?? previewResult.executionScope ?? 'unknown'}</p><p><span className="font-medium text-black/75">{t('Full-source rows')}:</span> {session.canonicalExecutionResult.fullFileExecution?.actualMaterializedRowCount.toLocaleString() ?? t('not verified')}</p><p className="break-all"><span className="font-medium text-black/75">Artifact:</span> {canonicalHandoff.artifactIdentity}</p><p className="break-all"><span className="font-medium text-black/75">Overlay:</span> {canonicalHandoff.overlayIdentity ?? 'none'}</p><p className="break-all"><span className="font-medium text-black/75">Source fingerprint:</span> {session.canonicalExecutionResult.fullFileExecution?.sourceFingerprint ?? canonicalHandoff.sourceFingerprint ?? 'unavailable'}</p></div></div>}
                {session.canonicalMultiSourceExecutionResult?.evidence && <div data-testid="multisource-result-lineage" className="mt-3 border-t border-black/5 pt-3"><p><span className="font-medium text-black/75">Multi-source artifact:</span> {session.canonicalMultiSourceExecutionResult.evidence.multiSourceArtifactId}</p><p className="break-all"><span className="font-medium text-black/75">Relationship:</span> {session.canonicalMultiSourceExecutionResult.evidence.relationshipArtifactId}</p><p><span className="font-medium text-black/75">Period / currency:</span> {session.canonicalMultiSourceExecutionResult.evidence.reportingPeriod ?? 'unavailable'} · {session.canonicalMultiSourceExecutionResult.evidence.currency ?? 'unavailable'}</p><div className="mt-2 grid gap-1">{session.canonicalMultiSourceExecutionResult.evidence.rowCounts.map(row => { const role = session.canonicalMultiSourceExecutionResult!.evidence!.sourceRoles.find(item => item.sourceId === row.sourceId)?.role ?? 'unknown'; return <p key={row.sourceId} className="break-all"><span className="font-medium text-black/75">{role}:</span> {row.actual.toLocaleString()} / {row.expected.toLocaleString()} rows · {row.sourceId}</p>; })}</div></div>}
                {previewResult?.status === 'executed' && session.canonicalExecutionResult && <div className="mt-3 border-t border-black/5 pt-3"><p><span className="font-medium text-black/75">Evidence:</span> {session.canonicalExecutionResult.evidence.map(item => `${item.evidenceId} (${item.provenance})`).join(', ') || 'none recorded'}</p><p className="mt-1"><span className="font-medium text-black/75">Limitations:</span> {session.canonicalExecutionResult.limitations.join(', ') || 'none recorded'}</p><p className="mt-1"><span className="font-medium text-black/75">Restrictions:</span> {session.canonicalExecutionResult.restrictions.map(item => item.reason).join(', ') || 'none recorded'}</p></div>}
                </details>
              </div>
            )}

            <InvestigationDrillThroughPanel drillError={drillError} drillExportBaseName={drillExportBaseName} drillResult={drillResult} isDrilling={isDrilling} onAnalyzeSelection={(scope) => { if (drillOrigin) openDeepAnalysis({ kind: 'selected_data', scope, origin: drillOrigin }); }} preferences={preferences} selectedDrillRows={selectedDrillRows} selectedRows={selectedRows} setSelectedDrillRows={setSelectedDrillRows} onClose={closeDrillThrough} />
          </div>
        </section>
        <InvestigationDiagnostics
          handoffCanExecute={canExecute}
          isExecuting={isExecuting}
          onRunPreview={handleRunPreview}
          preferences={preferences}
          previewResult={previewResult}
          runtimeIntent={runtimeIntent}
          runtimePlanPreview={runtimePlanPreview}
          safeSqlPreview={safeSqlPreview}
          showDiagnostics={showDiagnostics}
          validationResult={validationResult}
          onToggleDiagnostics={() => setShowDiagnostics(!showDiagnostics)}
        />

      </main>
      </div>
      {deepAnalysisView && <InvestigationDeepAnalysis
        action={filteredDeepAnalysisOrigin?.analysisAction ?? analysisAction}
        brief={filteredDeepAnalysisScope ? null : baDecisionBrief}
        businessFusionOverview={businessFusionOverview}
        singleSourceBAOverview={filteredDeepAnalysisScope ? filteredSingleSourceBAOverview : singleSourceBAOverview}
        chartModel={filteredDeepAnalysisOrigin?.chartModel ?? chartModel}
        decisionVisualizationPlan={filteredDeepAnalysisOrigin ? null : primaryDecisionVisualizationPlan}
        canonicalSourceBoundary={canonicalSourceBoundary}
        sourceName={session.datasetId}
        filteredScope={filteredDeepAnalysisScope}
        focusComparison={focusComparison.status === 'ready' ? focusComparison.comparison : null}
        filteredFocusComparison={filteredFocusComparison}
        analysisAuthority={filteredDeepAnalysisScope ? filteredAnalysisAuthority : primaryAnalysisAuthority}
        onClose={closeDeepAnalysis}
        onCreateDashboard={filteredDeepAnalysisScope ? undefined : () => { void createPerspectiveDashboard(); }}
        canCreateDashboard={!filteredDeepAnalysisScope && previewResult?.status === 'executed' && chartModel?.status === 'ready'}
        presentationMode={analysisPresentationMode}
        onPresentationModeChange={setAnalysisPresentationMode}
        preferences={preferences}
      />}
      <DisplayPreferencesModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
};
