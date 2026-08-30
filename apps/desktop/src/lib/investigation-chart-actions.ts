import type { ChartPreviewModel } from './chart-preview-model';
import type { DecisionVisualizationPlanV1 } from './decision-visualization-plan';
import { claimAnalysisShape } from './dashboard-evidence-dedup';
import type { InvestigationSession } from './investigation-session';
import type { BADecisionBrief } from './ba-decision-engine';
import type { SingleSourceBAOverview } from './single-source-ba-overview';
import type { DuckDBPreviewResult } from './duckdb-preview-sandbox';

export interface InvestigationChartActionsContext {
  session: InvestigationSession;
  analysisAction: InvestigationSession['analysisAction'];
  chartModel: ChartPreviewModel | null;
  previewResult: DuckDBPreviewResult | null;
  primaryDecisionVisualizationPlan: DecisionVisualizationPlanV1 | null;
  singleSourceBAOverview: SingleSourceBAOverview | null;
  baDecisionBrief: BADecisionBrief | null;
  governedResultTotal: number | null;
  supportingCharts: Array<{ actionId: string; label: string; chartModel: ChartPreviewModel }>;
  createChart: (input: any) => string;
  createDashboard: (name: string, metadata: any) => string;
  addChartToDashboard: (dashboardId: string, chartId: string) => void;
  persistWorkspaceSession: () => Promise<any>;
  setSavedChartNotice: (notice: string | null) => void;
  closeDeepAnalysis: () => void;
  navigate: (to: string) => void;
  t: (value: string) => string;
}

export function createInvestigationChartActions(context: InvestigationChartActionsContext) {
  const {
    session, analysisAction, chartModel, previewResult, primaryDecisionVisualizationPlan,
    singleSourceBAOverview, baDecisionBrief, governedResultTotal, supportingCharts,
    createChart, createDashboard, addChartToDashboard, persistWorkspaceSession,
    setSavedChartNotice, closeDeepAnalysis, navigate, t,
  } = context;
const persistChartModel = (model: ChartPreviewModel, name: string, source: string, decisionPlan: DecisionVisualizationPlanV1 | null = null) => {
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
        decisionVisualizationPlan: decisionPlan ? { schemaVersion: decisionPlan.schemaVersion, planId: decisionPlan.planId, governance: decisionPlan.governance } : null,
        savedAt: new Date().toISOString(),
      },
    },
  });
};

const saveChartToLibrary = async () => {
  if (!chartModel || chartModel.status !== 'ready') return;
  await persistWorkspaceSession();
  const chartId = persistChartModel(chartModel, chartModel.title || analysisAction.opportunityName, 'simple_ba_preview', primaryDecisionVisualizationPlan);
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
    decisionVisualizationPlan: primaryDecisionVisualizationPlan ? { schemaVersion: primaryDecisionVisualizationPlan.schemaVersion, planId: primaryDecisionVisualizationPlan.planId, governance: primaryDecisionVisualizationPlan.governance } : null,
    evidenceScope: singleSourceBAOverview?.isRepresentativeSample ? 'governed_primary_with_representative_ba_sample' : 'full_source',
    generatedAt: new Date().toISOString(),
    analysisContract: {
      actionId: analysisAction.id,
      perspective: analysisAction.opportunityName,
      dimensions: analysisAction.dimensions,
      measures: analysisAction.measures,
      measureAggregations: analysisAction.measureAggregations ?? {},
      resolvedBindings: singleSourceBAOverview?.bindings ?? {},
      evidenceScope: singleSourceBAOverview?.isRepresentativeSample ? 'governed_primary_with_representative_ba_sample' : 'full_source',
    },
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
      bindings: singleSourceBAOverview.bindings,
      findings: singleSourceBAOverview.findings,
      recommendedActions: singleSourceBAOverview.recommendedActions,
      limitations: singleSourceBAOverview.limitations,
    } : null,
  });

  if (governedResultTotal !== null) {
    const metricName = session.canonicalExecutionResult?.metricId || chartModel.yField || analysisAction.measures[0] || t('Key result');
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
        formatting: { lightbiData: { source: 'perspective_dashboard_ba_kpi', actionId: analysisAction.id, perspective: analysisAction.opportunityName, valueKind: kpi.kind, yField: 'value', seriesFields: ['value'], rows: [{ value: kpi.value }], rowCount: 1, governed: false, evidenceScope: singleSourceBAOverview.isRepresentativeSample ? 'representative_sample' : 'full_source', savedAt: new Date().toISOString() } },
      });
      addChartToDashboard(dashboardId, kpiChartId);
    });

  const primaryChartId = persistChartModel(chartModel, chartModel.title || analysisAction.opportunityName, 'perspective_dashboard_primary', primaryDecisionVisualizationPlan);
  addChartToDashboard(dashboardId, primaryChartId);
  const persistedShapes = new Set<string>();
  claimAnalysisShape(persistedShapes, chartModel.xField, chartModel.yField ?? analysisAction.measures[0]);
  singleSourceBAOverview?.breakdowns.slice(0, 3).forEach(breakdown => {
    if (breakdown.top.length === 0) return;
    if (!claimAnalysisShape(
      persistedShapes,
      breakdown.physicalColumn,
      singleSourceBAOverview.bindings.selectedMeasure ?? analysisAction.measures[0] ?? 'record_count',
    )) return;
    const rows = breakdown.top.slice(0, 10).map(item => ({ label: item.label, value: item.value, share: item.share, row_count: item.rowCount }));
    const breakdownChartId = createChart({
      projectId: 'proj-1', datasetId: session.datasetId, name: breakdown.label, type: 'Bar',
      xAxis: [{ columnName: 'label' }], yAxis: [{ columnName: 'value', aggregation: 'None' }], filters: {},
      formatting: { lightbiData: { source: 'perspective_dashboard_ba_breakdown', actionId: analysisAction.id, perspective: analysisAction.opportunityName, valueKind: breakdown.valueKind, xField: 'label', yField: 'value', seriesFields: ['value'], rows, rowCount: rows.length, governed: false, evidenceScope: singleSourceBAOverview.isRepresentativeSample ? 'representative_sample' : 'full_source', physicalColumn: breakdown.physicalColumn, savedAt: new Date().toISOString() } },
    });
    addChartToDashboard(dashboardId, breakdownChartId);
  });
  supportingCharts.forEach(item => {
    const supportingAction = session.supportingAnalyses?.find(candidate => candidate.analysisAction.id === item.actionId)?.analysisAction;
    if (!claimAnalysisShape(
      persistedShapes,
      item.chartModel.xField,
      item.chartModel.yField ?? supportingAction?.measures[0] ?? 'record_count',
    )) return;
    const supportingChartId = persistChartModel(item.chartModel, item.label, 'perspective_dashboard_supporting');
    addChartToDashboard(dashboardId, supportingChartId);
  });
  closeDeepAnalysis();
  navigate(`/dashboards/${dashboardId}`);
};

  return { persistChartModel, saveChartToLibrary, createPerspectiveDashboard };
}
