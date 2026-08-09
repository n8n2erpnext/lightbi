import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BarChart3, Activity, AlertTriangle, ClipboardCheck, FileSpreadsheet } from 'lucide-react';
import { getCurrentInvestigationSession } from '../lib/investigation-session';
import type { SafeSqlPreview } from '../lib/safe-sql-preview';
import type { DuckDBPreviewResult } from '../lib/duckdb-preview-sandbox';
import { executeGovernedDescriptiveAnalysis, prepareGovernedDescriptiveAnalysis } from '../lib/governed-descriptive-executor';
import { createChartPreviewModel, type ChartPreviewModel } from '../lib/chart-preview-model';
import { ChartPreviewRenderer } from '../components/analysis/ChartPreviewRenderer';
import { validatePreviewAgainstIntent, type ResultValidationResult } from '../lib/result-validator-contract';
import { useDisplayPreferences } from '../stores/display-preferences-store';
import { Settings2 } from 'lucide-react';
import { DisplayPreferencesModal } from '../components/settings/DisplayPreferencesModal';
import { DatasetInsightSummary } from '../components/analysis/DatasetInsightSummary';
import { createBADecisionBrief } from '../lib/ba-decision-engine';
import { BasicBAAnswerCard } from '../components/investigation/InvestigationBAReadouts';
import { InvestigationDiagnostics } from '../components/investigation/InvestigationDiagnostics';
import { InvestigationDrillThroughPanel } from '../components/investigation/InvestigationDrillThroughPanel';
import { InvestigationDeepAnalysis } from '../components/investigation/InvestigationDeepAnalysis';
import { InvestigationSemanticContext } from '../components/investigation/InvestigationSemanticContext';
import { useAppRuntime } from '@lightbi/runtime';
import { ExecutionRunCoordinator } from '@lightbi/runtime';
import {
  executeDrillThrough,
  type DrillThroughPoint,
  type DrillThroughResult,
} from '../lib/drill-through-export';
import { saveWorkspaceSession, type SaveWorkspaceSessionRequest } from '../lib/workspace-session-api';
import { advancedSourceId, useAdvancedSourceStore } from '../stores/advanced-source-store';
import { profileColumns } from '../lib/column-profiler';
import { executeGovernedMetricRequest } from '../lib/understanding-core/governed-metric-executor';
import type { GovernedMetricExecutionRequestV1 } from '../lib/understanding-core/governed-runtime-contracts';
import { createGovernedLocalDuckDBBoundary } from '../lib/understanding-core/governed-local-duckdb-boundary';
import { sourceBindingsMatch } from '../lib/understanding-core/canonical-source-boundary';
import { getLatestCanonicalConsumerArtifact, validateCanonicalInvestigationHandoff } from '../lib/understanding-core/canonical-consumer-boundary';
import { validateCanonicalMultiSourceInvestigationHandoff, type CanonicalMultiSourceInvestigationHandoffV1 } from '../lib/understanding-core/canonical-multisource-boundary';
import { executeCanonicalMultiSourceMetric } from '../lib/understanding-core/governed-multisource-duckdb-boundary';
import { formatValue } from '../lib/display-formatter';
import { useUiLanguage } from '../lib/ui-language';
import { createSingleSourceBAOverview, sampleSingleSourceBARows } from '../lib/single-source-ba-overview';
const INVESTIGATION_SESSION_ROW_LIMIT = 250;
const SINGLE_SOURCE_BA_OVERVIEW_ROW_LIMIT = 1000;

function limitInvestigationRows(rows: Record<string, unknown>[] | undefined): Record<string, unknown>[] {
  return Array.isArray(rows) ? rows.slice(0, INVESTIGATION_SESSION_ROW_LIMIT) : [];
}

function safeFileStem(value: string): string {
  return value.trim().replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '') || 'lightbi-session';
}

export const Investigation: React.FC = () => {
  const { t } = useUiLanguage();
  const navigate = useNavigate();
  const session = getCurrentInvestigationSession();
  const isUniversalDescriptiveAction = Boolean(session?.analysisAction.id.startsWith('universal:'));
  const canonicalMultiSourceHandoff = session?.canonicalHandoff && 'multiSource' in session.canonicalHandoff
    ? session.canonicalHandoff as CanonicalMultiSourceInvestigationHandoffV1
    : null;
  const currentCanonicalArtifact = session ? getLatestCanonicalConsumerArtifact(session.datasetId) : null;
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
  const [drillResult, setDrillResult] = useState<DrillThroughResult | null>(null);
  const [selectedDrillRows, setSelectedDrillRows] = useState<Set<number>>(new Set());
  const [isDrilling, setIsDrilling] = useState(false);
  const [drillError, setDrillError] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [showAiContext, setShowAiContext] = useState(false);
  const [showDeepAnalysis, setShowDeepAnalysis] = useState(false);
  const [savedChartNotice, setSavedChartNotice] = useState<string | null>(null);
  const [supportingCharts, setSupportingCharts] = useState<Array<{
    actionId: string;
    label: string;
    chartModel: ChartPreviewModel;
  }>>([]);
  const [isLoadingSupportingCharts, setIsLoadingSupportingCharts] = useState(false);
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
    });
  }, [session]);
  const executionRuns = useRef(new ExecutionRunCoordinator('simple-preview'));
  const supportingRuns = useRef(new ExecutionRunCoordinator('supporting-previews'));
  const drillRuns = useRef(new ExecutionRunCoordinator('simple-drill-through'));
  const autoPreviewSessionId = useRef<string | null>(null);
  const workspaceSessionPersisted = useRef(false);
  const createChart = useAppRuntime(state => state.createChart);
  const createDashboard = useAppRuntime(state => state.createDashboard);
  const addChartToDashboard = useAppRuntime(state => state.addChartToDashboard);

  useEffect(() => () => {
    executionRuns.current.cancel();
    supportingRuns.current.cancel();
    drillRuns.current.cancel();
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
    });
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
    if (!session?.supportingAnalyses?.length || !session.runtimeDatasetSource) {
      setSupportingCharts([]);
      return;
    }
    const candidates = session.supportingAnalyses
      // The perspective bundle has already ranked and scoped these actions.
      // Restricting support charts to the old `universal:` prefix silently
      // discarded newer registry-driven actions (shipment backlog, aging,
      // value exposure, etc.) and left Easy Mode with one trivial chart.
      .filter(item => item.analysisAction.id !== session.analysisAction.id)
      .filter(item => item.runtimePlanPreview.status !== 'blocked')
      .slice(0, 3);
    if (candidates.length === 0) {
      setSupportingCharts([]);
      return;
    }
    const run = supportingRuns.current.begin();
    setIsLoadingSupportingCharts(true);
    setSupportingCharts([]);
    void (async () => {
      const results: Array<{ actionId: string; label: string; chartModel: ChartPreviewModel }> = [];
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
          if (model.status === 'ready') results.push({ actionId: item.analysisAction.id, label: item.analysisAction.opportunityName, chartModel: model });
        } catch (error) {
          console.warn('Supporting analysis skipped', item.analysisAction.id, error);
        }
      }
      if (supportingRuns.current.isCurrent(run)) setSupportingCharts(results);
    })().finally(() => {
      if (supportingRuns.current.isCurrent(run)) setIsLoadingSupportingCharts(false);
    });
    return () => supportingRuns.current.cancel();
  }, [session?.id]);

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
  const fallbackWorkspaceSessionPayload = (): SaveWorkspaceSessionRequest => {
    const columns = rows?.[0] ? Object.keys(rows[0]) : [];
    const retainedRows = limitInvestigationRows(rows);
    return {
      title: session.datasetId || analysisAction.opportunityName || 'Untitled session',
      sourceType: businessFusionOverview ? 'business_fusion_view' : 'investigation',
      rowCount: rows?.length ?? 0,
      columnCount: columns.length,
      sourceSummary: [],
      snapshot: {
        version: 1,
        savedAt: new Date().toISOString(),
        currentDataset: {
          status: 'ready',
          file_name: session.datasetId,
          rows_count: rows?.length ?? 0,
          columns,
          profiles: {},
          sourceType: businessFusionOverview ? 'business_fusion_view' : 'investigation',
          sourceFiles: [],
          analysisRows: retainedRows,
          previewRows: retainedRows.slice(0, 100),
          businessFusionOverview,
          analysisRowScope: rows && rows.length > INVESTIGATION_SESSION_ROW_LIMIT ? 'retained_sample' : rowScope,
        },
      },
    };
  };

  const persistWorkspaceSession = async () => {
    const payload = session.workspaceSessionPayload || fallbackWorkspaceSessionPayload();
    try {
      const saved = await saveWorkspaceSession(payload);
      session.workspaceSessionPayload = { ...payload, id: saved.id };
      return saved;
    } catch (error) {
      console.error('Could not save workspace session', error);
      return null;
    }
  };

  const returnToCurrentDataset = async () => {
    const saved = await persistWorkspaceSession();
    navigate('/', { state: saved?.id ? { restoreWorkspaceSessionId: saved.id } : null });
  };

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

  const persistChartModel = (model: ChartPreviewModel, name: string, source: string) => {
    const chartType = model.chartType === 'line'
      ? 'Line'
      : model.chartType === 'table'
        ? 'Table'
        : 'Bar';
    return createChart({
      projectId: 'proj-1',
      datasetId: session.datasetId,
      name,
      type: chartType,
      xAxis: model.xField ? [{ columnName: model.xField }] : [],
      yAxis: model.seriesFields.map(columnName => ({ columnName, aggregation: 'None' })),
      filters: {},
      formatting: {
        lightbiData: {
          source,
          datasetName: session.datasetId,
          actionId: analysisAction.id,
          perspective: analysisAction.opportunityName,
          title: model.title,
          chartType: model.chartType,
          xField: model.xField,
          yField: model.yField,
          seriesFields: model.seriesFields,
          rows: model.rows.slice(0, 500),
          rowCount: model.rows.length,
          governed: true,
          savedAt: new Date().toISOString(),
        },
      },
    });
  };

  const saveChartToLibrary = async () => {
    if (!chartModel || chartModel.status !== 'ready') return;
    await persistWorkspaceSession();
    const chartId = persistChartModel(chartModel, chartModel.title || analysisAction.opportunityName, 'simple_ba_preview');
    setSavedChartNotice(`Saved to Chart Library: ${chartId}`);
  };

  const createPerspectiveDashboard = async () => {
    if (!chartModel || chartModel.status !== 'ready' || previewResult?.status !== 'executed') return;
    await persistWorkspaceSession();
    const dashboardId = createDashboard(`${analysisAction.opportunityName} — ${session.datasetId}`, {
      source: 'easy_mode_perspective',
      datasetId: session.datasetId,
      actionId: analysisAction.id,
      perspective: analysisAction.opportunityName,
      governed: true,
      evidenceScope: singleSourceBAOverview?.isRepresentativeSample ? 'governed_primary_with_representative_ba_sample' : 'full_source',
      generatedAt: new Date().toISOString(),
      deepBA: baDecisionBrief ? {
        executiveSummary: baDecisionBrief.executiveSummary,
        dataTrustScore: baDecisionBrief.dataTrustScore,
        decisionReadinessScore: baDecisionBrief.decisionReadinessScore,
        insights: baDecisionBrief.insights.map(insight => ({
          id: insight.id,
          title: insight.title,
          statement: insight.statement,
          severity: insight.severity,
          confidence: insight.confidence,
          evidence: insight.evidence,
        })),
        decisionSuggestions: baDecisionBrief.decisionSuggestions,
        caveats: baDecisionBrief.caveats,
        recommendedCharts: baDecisionBrief.recommendedCharts,
      } : null,
      perspectiveBA: singleSourceBAOverview ? {
        analysisLabel: singleSourceBAOverview.analysisLabel,
        sourceRowCount: singleSourceBAOverview.sourceRowCount,
        isRepresentativeSample: singleSourceBAOverview.isRepresentativeSample,
        trendChange: singleSourceBAOverview.trendChange,
        findings: singleSourceBAOverview.findings,
        recommendedActions: singleSourceBAOverview.recommendedActions,
        limitations: singleSourceBAOverview.limitations,
      } : null,
    });

    if (governedResultTotal !== null) {
      const metricName = session.canonicalExecutionResult?.metricId || chartModel.yField || analysisAction.measures[0] || t('Key result', 'Kết quả chính');
      const kpiChartId = createChart({
        projectId: 'proj-1', datasetId: session.datasetId, name: metricName, type: 'Number', xAxis: [],
        yAxis: [{ columnName: 'value', aggregation: 'None' }], filters: {},
        formatting: { lightbiData: { source: 'perspective_dashboard_kpi', actionId: analysisAction.id, perspective: analysisAction.opportunityName, yField: 'value', seriesFields: ['value'], rows: [{ value: governedResultTotal }], rowCount: 1, governed: true, savedAt: new Date().toISOString() } },
      });
      addChartToDashboard(dashboardId, kpiChartId);
    }

    singleSourceBAOverview?.kpis
      .filter(kpi => !(kpi.id === 'records' && singleSourceBAOverview.isRepresentativeSample))
      .filter(kpi => governedResultTotal === null || Math.abs(kpi.value - governedResultTotal) > 1e-9)
      .slice(0, 4)
      .forEach(kpi => {
        const kpiChartId = createChart({
          projectId: 'proj-1', datasetId: session.datasetId, name: kpi.label, type: 'Number', xAxis: [],
          yAxis: [{ columnName: 'value', aggregation: 'None' }], filters: {},
          formatting: { lightbiData: { source: 'perspective_dashboard_ba_kpi', actionId: analysisAction.id, perspective: analysisAction.opportunityName, valueKind: kpi.kind, yField: 'value', seriesFields: ['value'], rows: [{ value: kpi.value }], rowCount: 1, governed: true, savedAt: new Date().toISOString() } },
        });
        addChartToDashboard(dashboardId, kpiChartId);
      });

    const primaryChartId = persistChartModel(chartModel, chartModel.title || analysisAction.opportunityName, 'perspective_dashboard_primary');
    addChartToDashboard(dashboardId, primaryChartId);
    singleSourceBAOverview?.breakdowns.slice(0, 3).forEach(breakdown => {
      if (breakdown.top.length === 0) return;
      const rows = breakdown.top.slice(0, 10).map(item => ({ label: item.label, value: item.value, share: item.share, row_count: item.rowCount }));
      const breakdownChartId = createChart({
        projectId: 'proj-1', datasetId: session.datasetId, name: breakdown.label, type: 'Bar',
        xAxis: [{ columnName: 'label' }], yAxis: [{ columnName: 'value', aggregation: 'None' }], filters: {},
        formatting: { lightbiData: { source: 'perspective_dashboard_ba_breakdown', actionId: analysisAction.id, perspective: analysisAction.opportunityName, valueKind: breakdown.valueKind, xField: 'label', yField: 'value', seriesFields: ['value'], rows, rowCount: rows.length, governed: true, physicalColumn: breakdown.physicalColumn, savedAt: new Date().toISOString() } },
      });
      addChartToDashboard(dashboardId, breakdownChartId);
    });
    supportingCharts.forEach(item => {
      const supportingChartId = persistChartModel(item.chartModel, item.label, 'perspective_dashboard_supporting');
      addChartToDashboard(dashboardId, supportingChartId);
    });
    setShowDeepAnalysis(false);
    navigate(`/dashboards/${dashboardId}`);
  };

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
    setDrillResult(null);
    setSelectedDrillRows(new Set());
    setDrillError(null);
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

  const handleDrillThrough = async (point: DrillThroughPoint) => {
    const run = drillRuns.current.begin();
    setIsDrilling(true);
    setDrillError(null);
    setDrillResult(null);
    setSelectedDrillRows(new Set());
    try {
      const result = await executeDrillThrough({
        runtimePlan: runtimePlanPreview,
        point,
        rows: rows || [],
        runtimeDatasetSource,
        rowScope,
        limit: 50_000,
        signal: run.signal,
      });
      if (!drillRuns.current.isCurrent(run)) return;
      if (result.status === 'failed') {
        setDrillError(result.errorMessage || 'Unable to load matching rows.');
        return;
      }
      setDrillResult(result);
      setSelectedDrillRows(new Set(result.rows.map((_, index) => index)));
    } catch (error) {
      if (drillRuns.current.isCurrent(run) && !(error instanceof DOMException && error.name === 'AbortError')) {
        setDrillError(error instanceof Error ? error.message : 'Unable to load matching rows.');
      }
    } finally {
      if (drillRuns.current.finish(run)) {
        setIsDrilling(false);
      }
    }
  };

  const selectedRows = drillResult
    ? drillResult.rows.filter((_, index) => selectedDrillRows.has(index))
    : [];
  const drillExportBaseName = drillResult
    ? `${session.datasetId}_${drillResult.point.dimensionField}_${drillResult.point.label}`
      .replace(/[^a-z0-9_-]+/gi, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 90) || 'lightbi_filtered_rows'
    : 'lightbi_filtered_rows';

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto bg-[#fbfbfa]">
      <header className="sticky top-0 z-10 flex items-center gap-4 border-b border-black/10 bg-[#fbfbfa]/95 px-5 py-3 backdrop-blur">
        <button
          data-testid="investigation-back-to-perspectives"
          onClick={() => { void returnToCurrentDataset(); }}
          className="inline-flex items-center gap-2 rounded-lg border border-black/10 bg-white px-3 py-2 text-xs font-semibold text-black/60 transition-colors hover:bg-black/[0.04] hover:text-[#202123]"
          title={t('Back to perspectives', 'Quay lại chọn góc nhìn')}
        >
          <ArrowLeft className="w-5 h-5" />
          <span>{t('Back to perspectives', 'Quay lại chọn góc nhìn')}</span>
        </button>
        <div className="flex-1">
          <h1 className="text-[15px] font-semibold leading-tight text-[#202123]">
            {analysisAction.opportunityName}
          </h1>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[11px] font-medium text-black/45">{t('Dataset', 'Bộ dữ liệu')}: {session.datasetId}</span>
            <span className="text-black/20">•</span>
            <span className="rounded border border-black/10 bg-white px-1.5 py-0.5 text-[11px] font-medium text-black/60">
              {analysisAction.actionType}
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[1180px] flex-1 flex-col gap-5 p-5 pb-24 md:p-8">
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
        <div className="flex flex-col overflow-hidden rounded-[18px] border border-black/10 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-black/5 bg-white px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="mb-1 text-[16px] font-semibold text-[#202123]">{t('Decision workspace', 'Không gian phân tích quyết định')}</h2>
              <p className="text-[13px] text-black/45">{t('Chart preview, BA brief, and raw evidence stay together for review.', 'Biểu đồ, bản phân tích BA và bằng chứng dữ liệu được trình bày cùng nhau.')}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-[10px] border border-black/10 bg-[#fbfbfa] px-3 py-2 text-xs font-medium text-black/65 shadow-sm">
                <BarChart3 className="w-3.5 h-3.5 text-blue-500" />
                {t('Expected chart', 'Biểu đồ phù hợp')}: {runtimeIntent.expectedShape.replace('_', ' ')}
              </span>
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-[10px] border border-black/10 bg-[#fbfbfa] px-3 py-2 text-xs font-medium text-black/65 shadow-sm transition-colors hover:bg-black/[0.035] hover:text-[#202123]"
                title="Chart display preferences"
              >
                <Settings2 className="h-3.5 w-3.5" strokeWidth={1.7} />
                {t('View', 'Hiển thị')}
              </button>
              <button
                onClick={() => { void persistWorkspaceSession().finally(() => setShowDeepAnalysis(true)); }}
                disabled={isExecuting || previewResult?.status !== 'executed' || !canExecute}
                className="inline-flex items-center gap-1.5 rounded-[10px] border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-medium text-violet-700 shadow-sm transition-colors hover:bg-violet-100 disabled:cursor-not-allowed disabled:border-black/10 disabled:bg-white disabled:text-black/30"
                title="Open a deeper BA explanation for this selected decision angle"
              >
                <ClipboardCheck className="h-3.5 w-3.5" strokeWidth={1.7} />
                {t('Analyze deeper', 'Phân tích sâu')}
              </button>
              <button
                onClick={() => { void saveChartToLibrary(); }}
                disabled={!chartModel || chartModel.status !== 'ready'}
                className="inline-flex items-center gap-1.5 rounded-[10px] border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 shadow-sm transition-colors hover:bg-emerald-100 disabled:cursor-not-allowed disabled:border-black/10 disabled:bg-white disabled:text-black/30"
                title="Save this executed chart as a reusable dashboard card"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" strokeWidth={1.7} />
                {t('Save chart', 'Lưu biểu đồ')}
              </button>
              <button
                data-run-preview="true"
                onClick={handleRunPreview}
                disabled={isExecuting || !canExecute}
                title={!canExecute ? 'Resolve the runtime preflight blockers before running this analysis.' : undefined}
                className="rounded-[10px] bg-[#202123] px-3 py-2 text-xs font-medium text-white shadow-sm transition-colors hover:bg-black disabled:opacity-50"
              >
                {isExecuting ? t('Running...', 'Đang chạy...') : previewResult ? t('Refresh preview', 'Làm mới kết quả') : t('Run preview', 'Chạy phân tích')}
              </button>
            </div>
          </div>
          
          <div className="border-b border-black/5 bg-white p-6">
             <div className="flex flex-wrap gap-4 mb-8">
                 <div className="flex flex-col gap-1.5">
                   <span className="text-[10px] uppercase tracking-wider font-semibold text-gray-400">{t('Dimensions', 'Chiều phân tích')}</span>
                   <div className="flex flex-wrap gap-2">
                     {runtimeIntent.dimensions.map(d => (
                       <span key={d} className="rounded-[9px] border border-blue-100 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                         {d}
                       </span>
                     ))}
                   </div>
                 </div>
                 
                 <div className="flex flex-col gap-1.5">
                   <span className="text-[10px] uppercase tracking-wider font-semibold text-gray-400">{t('Measures', 'Chỉ số')}</span>
                   <div className="flex flex-wrap gap-2">
                     {[...runtimeIntent.measures, ...(runtimeIntent.derivedMeasures ?? []).flatMap(m => [m.numeratorLabel, m.denominatorLabel, m.label])].map(m => (
                       <span key={m} className="rounded-[9px] border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                         {m}
                       </span>
                     ))}
                   </div>
                 </div>
             </div>
             
             {/* Chart Placeholder / Renderer Area */}
             <div className="mt-4 w-full">
               {previewResult?.status === 'blocked' ? (
                 <div className="flex h-64 w-full flex-col items-center justify-center rounded-[18px] border-2 border-dashed border-amber-200 bg-amber-50/50 p-6 text-center text-amber-700">
                   <AlertTriangle className="mb-2 h-8 w-8 text-amber-500" />
                   <span className="text-sm font-medium">Analysis Blocked</span>
                   <span className="mt-1 text-xs text-amber-600">{previewResult.blockedReasons.join(', ') || 'Canonical preflight did not authorize execution.'}</span>
                 </div>
               ) : previewResult?.status === 'failed' ? (
                 <div className="flex h-64 w-full flex-col items-center justify-center rounded-[18px] border-2 border-dashed border-red-200 bg-red-50/50 p-6 text-center text-red-500">
                   <AlertTriangle className="w-8 h-8 text-red-400 mb-2" />
                   <span className="text-sm font-medium">Execution Failed</span>
                   <span className="text-xs text-red-400 mt-1">{previewResult.errorMessage || "Preview could not be rendered."}</span>
                 </div>
               ) : previewResult?.rows && previewResult.rows.length > 0 && runtimeIntent.expectedShape === 'table' ? (
                 <div className="space-y-5">
                   <DatasetInsightSummary columns={previewResult.columns} rows={previewResult.rows} rowCount={previewResult.rowCount} />
                   {chartModel && chartModel.chartType !== 'table' && (
                     <div className="rounded-[18px] border border-black/10 bg-white p-4 shadow-sm">
                       <ChartPreviewRenderer model={chartModel} onDrillThrough={handleDrillThrough} />
                     </div>
                   )}
                 </div>
               ) : chartModel && runtimeIntent.expectedShape !== 'table' ? (
                 <div className="rounded-[18px] border border-black/10 bg-white p-4 shadow-sm">
                   <ChartPreviewRenderer model={chartModel} onDrillThrough={handleDrillThrough} />
                 </div>
               ) : (
                 <div className="flex h-64 w-full flex-col items-center justify-center rounded-[18px] border-2 border-dashed border-slate-200 bg-slate-50 text-slate-400">
                   <Activity className={`mb-2 h-8 w-8 text-slate-300 ${isExecuting ? 'animate-pulse' : ''}`} />
                   <span className="text-sm font-medium">{isExecuting ? 'Preparing preview...' : 'Ready to preview'}</span>
                   {!isExecuting && (
                     <button
                       onClick={handleRunPreview}
                      disabled={!canExecute}
                      title={!canExecute ? 'Resolve the runtime preflight blockers before running this analysis.' : undefined}
                       className="mt-4 rounded-md border border-black/10 bg-white px-3 py-1.5 text-xs font-medium text-black/65 shadow-sm transition-colors hover:bg-black/[0.035]"
                     >
                       Preview chart
                     </button>
                   )}
                 </div>
               )}
             </div>

             {savedChartNotice && (
               <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
                 {savedChartNotice}
               </div>
             )}

             {(isLoadingSupportingCharts || supportingCharts.length > 0) && (
               <section data-testid="perspective-analysis-bundle" className="mt-5 rounded-[16px] border border-blue-100 bg-blue-50/35 p-4">
                 <div className="flex items-start justify-between gap-3">
                   <div>
                     <h3 className="text-[14px] font-semibold text-[#202123]">{t('Supporting analyses for this perspective', 'Các phân tích hỗ trợ cho góc nhìn này')}</h3>
                     <p className="mt-1 text-[12px] text-black/50">{t('LightBI checks the same governed source from complementary dimensions.', 'LightBI kiểm tra cùng nguồn dữ liệu theo các chiều bổ sung để câu trả lời không phụ thuộc vào một biểu đồ duy nhất.')}</p>
                   </div>
                   <span className="rounded-full border border-blue-100 bg-white px-2.5 py-1 text-[11px] font-semibold text-blue-700">
                     {isLoadingSupportingCharts ? t('Preparing...', 'Đang chuẩn bị...') : `${supportingCharts.length} ${t('supporting charts', 'biểu đồ hỗ trợ')}`}
                   </span>
                 </div>
                 {isLoadingSupportingCharts && supportingCharts.length === 0 ? (
                   <div className="mt-4 h-28 animate-pulse rounded-xl border border-blue-100 bg-white/70" />
                 ) : (
                   <div className="mt-4 grid gap-4 lg:grid-cols-2">
                     {supportingCharts.map(item => (
                       <article key={item.actionId} data-testid="supporting-analysis-chart" className="rounded-xl border border-black/10 bg-white p-3 shadow-sm">
                         <h4 className="mb-2 text-[12px] font-semibold text-[#202123]">{item.label}</h4>
                         <ChartPreviewRenderer model={item.chartModel} />
                       </article>
                     ))}
                   </div>
                 )}
               </section>
             )}

             {governedResultTotal !== null && session.canonicalExecutionResult && (
               <div data-testid="governed-result-summary" className="mt-4 rounded-[14px] border border-emerald-200 bg-emerald-50 p-4 text-emerald-950">
                 <p className="text-[11px] font-semibold uppercase tracking-wide">{t('Governed result total', 'Tổng kết quả đã quản trị')}</p>
                 <p className="mt-1 text-2xl font-semibold">{governedResultTotalLabel}</p>
                 <p className="mt-1 text-xs text-emerald-900/70">
                   {session.canonicalExecutionResult.metricId} across {governedResultValues.length.toLocaleString()} governed result group{governedResultValues.length === 1 ? '' : 's'}.
                 </p>
               </div>
             )}

             {previewResult?.status === 'executed' && session.canonicalExecutionResult && canonicalHandoff && (
               <details className="mt-4 rounded-[14px] border border-black/10 bg-[#fbfbfa] p-4 text-xs text-black/60" data-testid="governed-result-context">
                 <summary className="cursor-pointer font-semibold text-[#202123]">{t('Governed result context', 'Bối cảnh và bằng chứng kết quả')}</summary>
                 <div className="mt-3 grid gap-3 md:grid-cols-2">
                   <div>
                     <p><span className="font-medium text-black/75">Metric:</span> {session.canonicalExecutionResult.metricId}</p>
                     <p><span className="font-medium text-black/75">Action:</span> {session.canonicalExecutionResult.actionId}</p>
                     <p className="break-all"><span className="font-medium text-black/75">Query plan:</span> {session.canonicalExecutionResult.queryPlanIdentity}</p>
                     <p><span className="font-medium text-black/75">Result rows:</span> {session.canonicalExecutionResult.rowCount.toLocaleString()}</p>
                   </div>
                   <div>
                     <p><span className="font-medium text-black/75">Execution scope:</span> {session.canonicalExecutionResult.fullFileExecution?.executionScope ?? previewResult.executionScope ?? 'unknown'}</p>
                     <p><span className="font-medium text-black/75">Full-source rows:</span> {session.canonicalExecutionResult.fullFileExecution?.actualMaterializedRowCount.toLocaleString() ?? 'not verified'}</p>
                     <p className="break-all"><span className="font-medium text-black/75">Artifact:</span> {canonicalHandoff.artifactIdentity}</p>
                     <p className="break-all"><span className="font-medium text-black/75">Overlay:</span> {canonicalHandoff.overlayIdentity ?? 'none'}</p>
                     <p className="break-all"><span className="font-medium text-black/75">Source fingerprint:</span> {session.canonicalExecutionResult.fullFileExecution?.sourceFingerprint ?? canonicalHandoff.sourceFingerprint ?? 'unavailable'}</p>
                   </div>
                 </div>
                 <div className="mt-3 border-t border-black/5 pt-3">
                   {session.canonicalMultiSourceExecutionResult?.evidence && <div data-testid="multisource-result-lineage" className="mb-3 rounded-lg border border-black/5 bg-white p-3">
                     <p><span className="font-medium text-black/75">Multi-source artifact:</span> {session.canonicalMultiSourceExecutionResult.evidence.multiSourceArtifactId}</p>
                     <p className="break-all"><span className="font-medium text-black/75">Relationship:</span> {session.canonicalMultiSourceExecutionResult.evidence.relationshipArtifactId}</p>
                     <p><span className="font-medium text-black/75">Period / currency:</span> {session.canonicalMultiSourceExecutionResult.evidence.reportingPeriod ?? 'unavailable'} · {session.canonicalMultiSourceExecutionResult.evidence.currency ?? 'unavailable'}</p>
                     <div className="mt-2 grid gap-1">{session.canonicalMultiSourceExecutionResult.evidence.rowCounts.map((row) => {
                       const role = session.canonicalMultiSourceExecutionResult!.evidence!.sourceRoles.find((item) => item.sourceId === row.sourceId)?.role ?? 'unknown';
                       return <p key={row.sourceId} className="break-all"><span className="font-medium text-black/75">{role}:</span> {row.actual.toLocaleString()} / {row.expected.toLocaleString()} rows · {row.sourceId}</p>;
                     })}</div>
                   </div>}
                   <p><span className="font-medium text-black/75">Evidence:</span> {session.canonicalExecutionResult.evidence.map(item => `${item.evidenceId} (${item.provenance})`).join(', ') || 'none recorded'}</p>
                   <p className="mt-1"><span className="font-medium text-black/75">Limitations:</span> {session.canonicalExecutionResult.limitations.join(', ') || 'none recorded'}</p>
                   <p className="mt-1"><span className="font-medium text-black/75">Restrictions:</span> {session.canonicalExecutionResult.restrictions.map(item => item.reason).join(', ') || 'none recorded'}</p>
                 </div>
               </details>
             )}

             {baDecisionBrief && (
               <BasicBAAnswerCard
                 brief={baDecisionBrief}
                canAnalyzeDeeper={previewResult?.status === 'executed' && canExecute}
                 onAnalyzeDeeper={() => { void persistWorkspaceSession().finally(() => setShowDeepAnalysis(true)); }}
               />
             )}

             <InvestigationDrillThroughPanel
               drillError={drillError}
               drillExportBaseName={drillExportBaseName}
               drillResult={drillResult}
               isDrilling={isDrilling}
               preferences={preferences}
               selectedDrillRows={selectedDrillRows}
               selectedRows={selectedRows}
               setSelectedDrillRows={setSelectedDrillRows}
               onClose={() => {
                 drillRuns.current.cancel();
                 setIsDrilling(false);
                 setDrillError(null);
                 setDrillResult(null);
                 setSelectedDrillRows(new Set());
               }}
             />
          </div>
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
        </div>

      </main>
      {showDeepAnalysis && <InvestigationDeepAnalysis
        action={analysisAction}
        brief={baDecisionBrief}
        businessFusionOverview={businessFusionOverview}
        singleSourceBAOverview={singleSourceBAOverview}
        chartModel={chartModel}
        onClose={() => setShowDeepAnalysis(false)}
        onCreateDashboard={() => { void createPerspectiveDashboard(); }}
        canCreateDashboard={previewResult?.status === 'executed' && chartModel?.status === 'ready'}
        preferences={preferences}
      />}
      <DisplayPreferencesModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
};
