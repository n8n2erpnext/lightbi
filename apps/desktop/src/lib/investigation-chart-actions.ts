import type { ChartPreviewModel } from './chart-preview-model';
import type { DecisionVisualizationPlanV1 } from './decision-visualization-plan';
import { createDashboardCompositionPlan, type DashboardCompositionCandidateV1 } from './dashboard-composition-plan';
import { adviseDashboardComposition } from './dashboard-composition-advice';
import {
  createDashboardBreakdownVisualizationPlan,
  createExecutiveDashboardInformationBudget,
  materializeDashboardWidgetLayouts,
  dashboardAdvisoryRoles,
  dashboardDecisionVisualizationMetadata,
  persistedDashboardChartType,
} from './dashboard-composition-writer';
import type { InvestigationSession } from './investigation-session';
import type { BADecisionBrief } from './ba-decision-engine';
import type { SingleSourceBAOverview } from './single-source-ba-overview';
import type { DuckDBPreviewResult } from './duckdb-preview-sandbox';
import type { ChartType } from '@lightbi/core-types';
import { rendererCapabilityForPattern } from './visualization-renderer-registry';
import type { VisualNarrativeCompositionPlanV1 } from './visual-narrative-composition';
import { combineVisualNarrativeModels } from './visual-narrative-runtime';
import type { VisualizationRendererFamilyV1 } from './visualization-renderer-registry';

export interface InvestigationChartActionsContext {
  session: InvestigationSession;
  analysisAction: InvestigationSession['analysisAction'];
  chartModel: ChartPreviewModel | null;
  previewResult: DuckDBPreviewResult | null;
  primaryDecisionVisualizationPlan: DecisionVisualizationPlanV1 | null;
  singleSourceBAOverview: SingleSourceBAOverview | null;
  baDecisionBrief: BADecisionBrief | null;
  governedResultTotal: number | null;
  supportingCharts: Array<{ actionId: string; label: string; chartModel: ChartPreviewModel; decisionVisualizationPlan?: DecisionVisualizationPlanV1 | null }>;
  visualNarrativePlan?: VisualNarrativeCompositionPlanV1 | null;
  selectedPerspectiveId?: string | null;
  createChart: (input: any) => string;
  createDashboard: (name: string, metadata: any) => string;
  addChartToDashboard: (dashboardId: string, chartId: string, layout?: { x: number; y: number; w: number; h: number }) => void;
  persistWorkspaceSession: () => Promise<any>;
  setSavedChartNotice: (notice: string | null) => void;
  closeDeepAnalysis: () => void;
  navigate: (to: string) => void;
  t: (value: string) => string;
}

export function resolvePersistedChartType(
  model: ChartPreviewModel,
  decisionPlan: DecisionVisualizationPlanV1 | null = null,
): ChartType {
  const patternId = decisionPlan?.visualizationPlan.patternId;
  if (patternId) {
    const persisted = rendererCapabilityForPattern(patternId).persistedChartType;
    if (!persisted) throw new Error(`VISUALIZATION_PERSISTENCE_UNAVAILABLE:${patternId}`);
    return persisted;
  }
  if (model.chartType === 'line') return 'Line';
  if (model.chartType === 'table') return 'Table';
  if (model.chartType === 'scatter') return 'Scatter';
  return 'Bar';
}

export function createInvestigationChartActions(context: InvestigationChartActionsContext) {
  const {
    session, analysisAction, chartModel, previewResult, primaryDecisionVisualizationPlan,
    singleSourceBAOverview, baDecisionBrief, governedResultTotal, supportingCharts, visualNarrativePlan, selectedPerspectiveId,
    createChart, createDashboard, addChartToDashboard, persistWorkspaceSession,
    setSavedChartNotice, closeDeepAnalysis, navigate, t,
  } = context;
const persistChartModel = (model: ChartPreviewModel, name: string, source: string, decisionPlan: DecisionVisualizationPlanV1 | null = null, rendererFamilyOverride: VisualizationRendererFamilyV1 | null = null) => {
  const chartType = resolvePersistedChartType(model, decisionPlan);
  const scatterFields = chartType === 'Scatter' ? model.seriesFields.slice(0, 2) : [];
  const xAxis = chartType === 'Scatter'
    ? (scatterFields[0] ? [{ columnName: scatterFields[0] }] : [])
    : model.xField ? [{ columnName: model.xField }] : [];
  const yAxisFields = chartType === 'Scatter' ? scatterFields.slice(1) : model.seriesFields;
  return createChart({
    projectId: 'proj-1',
    datasetId: session.datasetId,
    name,
    type: chartType,
    xAxis,
    yAxis: yAxisFields.map(columnName => ({ columnName, aggregation: 'None' })),
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
        decisionVisualizationPlan: dashboardDecisionVisualizationMetadata(decisionPlan),
        visualNarrativeRendererFamily: rendererFamilyOverride,
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
  const effectivePerspectiveId = selectedPerspectiveId?.trim() || analysisAction.opportunityName;
  if (!chartModel || chartModel.status !== 'ready' || previewResult?.status !== 'executed') return;
  await persistWorkspaceSession();

  const candidates: DashboardCompositionCandidateV1[] = [];
  const materializers = new Map<string, () => string>();
  const primaryMeasure = chartModel.yField ?? analysisAction.measures[0] ?? 'record_count';
  const domainId = singleSourceBAOverview?.investigation?.domain ?? singleSourceBAOverview?.mode ?? null;
  const deepBACandidateId = 'narrative:deep_ba';
  const perspectiveBACandidateId = 'narrative:perspective_ba';

  if (governedResultTotal !== null) {
    const metricName = session.canonicalExecutionResult?.metricId || primaryMeasure || t('Key result');
    const candidateId = `metric:governed:${metricName}`;
    candidates.push({
      id: candidateId,
      managementQuestion: `What is the governed key result for ${analysisAction.opportunityName}?`,
      semanticRole: 'hero_metric', artifactKind: 'metric', evidenceBacked: true,
      evidenceRefs: [`governed-result:${session.canonicalExecutionResult?.metricId ?? analysisAction.id}`],
      decisionImportance: 100, advisoryRoles: dashboardAdvisoryRoles('hero_metric', [metricName]),
      placementGroup: 'hero', reasonForInclusion: 'Primary governed result for the selected decision perspective.',
    });
    materializers.set(candidateId, () => createChart({
      projectId: 'proj-1', datasetId: session.datasetId, name: metricName, type: 'Number', xAxis: [],
      yAxis: [{ columnName: 'value', aggregation: 'None' }], filters: {},
      formatting: { lightbiData: { source: 'perspective_dashboard_kpi', actionId: analysisAction.id, perspective: analysisAction.opportunityName, yField: 'value', seriesFields: ['value'], rows: [{ value: governedResultTotal }], rowCount: 1, governed: true, savedAt: new Date().toISOString() } },
    }));
  }

  if (baDecisionBrief) {
    candidates.push({
      id: deepBACandidateId,
      managementQuestion: `What is the evidence-backed decision summary for ${analysisAction.opportunityName}?`,
      semanticRole: 'primary_answer', artifactKind: 'narrative', evidenceBacked: true,
      evidenceRefs: [`ba-decision-brief:${analysisAction.id}`], decisionImportance: 97,
      advisoryRoles: dashboardAdvisoryRoles('primary_answer', [domainId ?? '', analysisAction.opportunityName]),
      placementGroup: 'primary_canvas', reasonForInclusion: 'Keeps the evidence-backed executive answer visible before supporting detail.',
    });
  }
  if (singleSourceBAOverview) {
    candidates.push({
      id: perspectiveBACandidateId,
      managementQuestion: `What supporting findings and actions explain ${analysisAction.opportunityName}?`,
      semanticRole: 'ranked_driver', artifactKind: 'narrative', evidenceBacked: true,
      evidenceRefs: [`ba-overview:${analysisAction.id}`], decisionImportance: 82,
      advisoryRoles: dashboardAdvisoryRoles('ranked_driver', [domainId ?? '', ...Object.keys(singleSourceBAOverview.bindings)]),
      placementGroup: 'supporting', reasonForInclusion: 'Preserves source-bound BA findings, actions and limitations as decision context.',
    });
  }

  singleSourceBAOverview?.kpis
    .filter(kpi => !(kpi.id === 'records' && singleSourceBAOverview.isRepresentativeSample))
    .filter(kpi => governedResultTotal === null || Math.abs(kpi.value - governedResultTotal) > 1e-9)
    .forEach((kpi, index) => {
      const candidateId = `metric:ba:${kpi.id}`;
      candidates.push({
        id: candidateId, managementQuestion: `What is the supporting value of ${kpi.label}?`,
        semanticRole: 'context_metric', artifactKind: 'metric', evidenceBacked: true,
        evidenceRefs: [`ba-overview:${analysisAction.id}:kpi:${kpi.id}`], decisionImportance: 90 - index,
        advisoryRoles: dashboardAdvisoryRoles('context_metric', [kpi.id, kpi.label, domainId ?? '']),
        placementGroup: 'support_band', reasonForInclusion: 'Adds a bounded supporting KPI without changing governed metric authority.',
      });
      materializers.set(candidateId, () => createChart({
        projectId: 'proj-1', datasetId: session.datasetId, name: kpi.label, type: 'Number', xAxis: [],
        yAxis: [{ columnName: 'value', aggregation: 'None' }], filters: {},
        formatting: { lightbiData: { source: 'perspective_dashboard_ba_kpi', actionId: analysisAction.id, perspective: analysisAction.opportunityName, valueKind: kpi.kind, yField: 'value', seriesFields: ['value'], rows: [{ value: kpi.value }], rowCount: 1, governed: false, evidenceScope: singleSourceBAOverview.isRepresentativeSample ? 'representative_sample' : 'full_source', savedAt: new Date().toISOString() } },
      }));
    });

  const supportingByActionId = new Map(supportingCharts.map(item => [item.actionId, item] as const));
  const primaryNarrativeUnit = visualNarrativePlan?.units.find(unit => unit.primaryAnchor) ?? null;
  const rendererOverrideForPresentation = (presentation: string): VisualizationRendererFamilyV1 | null =>
    presentation === 'combo_bar_line' ? 'combo_bar_line' : presentation === 'grouped_compare' ? 'grouped_bar' : null;
  const narrativeUnitModel = (candidateIds: string[]) => {
    const members = candidateIds.flatMap(candidateId => {
      if (candidateId === analysisAction.id) return [{ id: candidateId, label: chartModel.title || analysisAction.opportunityName, chartModel }];
      const support = supportingByActionId.get(candidateId);
      return support ? [{ id: candidateId, label: support.label, chartModel: support.chartModel }] : [];
    });
    if (members.length === 0) return null;
    if (members.length === 1) return members[0].chartModel;
    return combineVisualNarrativeModels(members[0], members[1],
      visualNarrativePlan?.units.find(unit => unit.candidateIds.every(id => candidateIds.includes(id)))?.presentation ?? 'grouped_compare')
      ?? members[0].chartModel;
  };
  const primaryDashboardModel = primaryNarrativeUnit ? narrativeUnitModel(primaryNarrativeUnit.candidateIds) ?? chartModel : chartModel;
  const primaryRendererOverride = primaryNarrativeUnit ? rendererOverrideForPresentation(primaryNarrativeUnit.presentation) : null;

  const primaryCandidateId = 'visual:primary';
  candidates.push({
    id: primaryCandidateId,
    managementQuestion: `How does the governed result vary across ${chartModel.xField ?? 'the selected analytical axis'}?`,
    semanticRole: 'primary_answer', artifactKind: 'visual', evidenceBacked: true,
    evidenceRefs: [primaryDecisionVisualizationPlan ? `decision-visualization:${primaryDecisionVisualizationPlan.planId}` : `preview-result:${analysisAction.id}`],
    decisionImportance: 88, analysisShape: { dimension: primaryDashboardModel.xField, measure: primaryDashboardModel.yField ?? primaryMeasure },
    advisoryRoles: dashboardAdvisoryRoles('primary_answer', [primaryDashboardModel.xField ?? '', primaryDashboardModel.yField ?? primaryMeasure, domainId ?? '']),
    visualizationPlanId: primaryDecisionVisualizationPlan?.visualizationPlan.planId ?? null,
    placementGroup: 'primary_canvas', reasonForInclusion: 'Primary governed visual evidence for the selected decision perspective.',
  });
  materializers.set(primaryCandidateId, () => persistChartModel(primaryDashboardModel, primaryDashboardModel.title || analysisAction.opportunityName, 'perspective_dashboard_primary', primaryDecisionVisualizationPlan, primaryRendererOverride));

  if (!visualNarrativePlan) singleSourceBAOverview?.breakdowns.forEach((breakdown, index) => {
    if (breakdown.top.length === 0) return;
    const rows = breakdown.top.slice(0, 10).map(item => ({ label: item.label, value: item.value, share: item.share, row_count: item.rowCount }));
    const decisionPlan = createDashboardBreakdownVisualizationPlan({ perspectiveId: effectivePerspectiveId, sourceCount: 1, rows });
    const candidateId = `visual:breakdown:${breakdown.id}`;
    candidates.push({
      id: candidateId, managementQuestion: `Which ${breakdown.label} groups have the highest observed ${primaryMeasure}?`,
      semanticRole: 'ranked_driver', artifactKind: 'visual', evidenceBacked: true,
      evidenceRefs: [`ba-overview:${analysisAction.id}:breakdown:${breakdown.id}`], decisionImportance: 72 - index,
      analysisShape: { dimension: breakdown.physicalColumn, measure: singleSourceBAOverview.bindings.selectedMeasure ?? primaryMeasure },
      advisoryRoles: dashboardAdvisoryRoles('ranked_driver', [breakdown.physicalColumn, breakdown.label, domainId ?? '']),
      visualizationPlanId: decisionPlan.visualizationPlan.planId, placementGroup: 'supporting',
      reasonForInclusion: 'Shows a distinct evidence-backed ranked driver using deterministic visualization suitability.',
    });
    materializers.set(candidateId, () => {
      const chartType = persistedDashboardChartType(decisionPlan);
      return createChart({
        projectId: 'proj-1', datasetId: session.datasetId, name: breakdown.label, type: chartType,
        xAxis: [{ columnName: 'label' }], yAxis: [{ columnName: 'value', aggregation: 'None' }], filters: {},
        formatting: { lightbiData: { source: 'perspective_dashboard_ba_breakdown', actionId: analysisAction.id, perspective: analysisAction.opportunityName, valueKind: breakdown.valueKind, xField: 'label', yField: 'value', seriesFields: ['value'], rows, rowCount: rows.length, governed: false, evidenceScope: singleSourceBAOverview.isRepresentativeSample ? 'representative_sample' : 'full_source', physicalColumn: breakdown.physicalColumn, decisionVisualizationPlan: dashboardDecisionVisualizationMetadata(decisionPlan), savedAt: new Date().toISOString() } },
      });
    });
  });

  const primaryConsumedIds = new Set(primaryNarrativeUnit?.candidateIds.filter(id => id !== analysisAction.id) ?? []);
  const narrativeSupportUnits = visualNarrativePlan
    ? visualNarrativePlan.units.filter(unit => !unit.primaryAnchor)
    : null;
  const supportUnits = narrativeSupportUnits ?? supportingCharts.map(item => ({
    id: `legacy:${item.actionId}`,
    candidateIds: [item.actionId],
    presentation: 'single' as const,
    storyRole: 'driver' as const,
  }));

  supportUnits.forEach((unit, index) => {
    const memberIds = unit.candidateIds.filter(id => !primaryConsumedIds.has(id));
    const members = memberIds.map(id => supportingByActionId.get(id)).filter((item): item is NonNullable<typeof item> => Boolean(item));
    if (members.length === 0) return;
    const first = members[0];
    const unitModel = members.length > 1
      ? combineVisualNarrativeModels(
          { id: members[0].actionId, label: members[0].label, chartModel: members[0].chartModel },
          { id: members[1].actionId, label: members[1].label, chartModel: members[1].chartModel },
          unit.presentation,
        ) ?? members[0].chartModel
      : first.chartModel;
    const firstPlan = first.decisionVisualizationPlan ?? null;
    const supportingFamily = firstPlan?.visualizationPlan.rendererFamily;
    const semanticRole = unit.storyRole === 'risk' ? 'risk_exception'
      : unit.storyRole === 'relationship' ? 'relationship_context'
      : unit.storyRole === 'change' ? 'trend_context'
      : unit.storyRole === 'composition' ? 'composition_context'
      : unit.storyRole === 'evidence' ? 'evidence_table'
      : ['scatter','bubble'].includes(String(supportingFamily)) ? 'relationship_context'
      : ['line','area','control_chart'].includes(String(supportingFamily)) ? 'trend_context'
      : supportingFamily === 'table' ? 'evidence_table' : 'ranked_driver';
    const candidateId = visualNarrativePlan ? `visual:narrative:${unit.id}` : `visual:supporting:${first.actionId}`;
    candidates.push({
      id: candidateId,
      managementQuestion: members.length > 1 ? `What combined evidence do ${members.map(item => item.label).join(' and ')} add?` : `What does ${first.label} add to the decision context?`,
      semanticRole, artifactKind: semanticRole === 'evidence_table' ? 'evidence' : 'visual', evidenceBacked: true,
      evidenceRefs: members.map(item => `supporting-analysis:${item.actionId}`), decisionImportance: 62 - index,
      analysisShape: { dimension: unitModel.xField, measure: unitModel.yField ?? 'record_count' },
      advisoryRoles: dashboardAdvisoryRoles(semanticRole, [unitModel.xField ?? '', unitModel.yField ?? '', domainId ?? '']),
      placementGroup: semanticRole === 'evidence_table' ? 'evidence' : 'supporting',
      visualizationPlanId: firstPlan?.visualizationPlan.planId ?? null,
      reasonForInclusion: 'Inherited from the upstream evidence-backed visual narrative composition.',
    });
    materializers.set(candidateId, () => persistChartModel(
      unitModel,
      members.length > 1 ? members.map(item => item.label).join(' + ') : first.label,
      'perspective_dashboard_supporting', firstPlan,
      rendererOverrideForPresentation(unit.presentation),
    ));
  });

  const advice = adviseDashboardComposition({
    domainId, perspectiveId: effectivePerspectiveId,
    userQuestion: analysisAction.description || analysisAction.opportunityName,
    semanticSignals: [...analysisAction.dimensions, ...analysisAction.measures, ...Object.keys(singleSourceBAOverview?.bindings ?? {})],
    availableRoles: candidates.flatMap(candidate => candidate.advisoryRoles ?? []),
  });
  const compositionPlan = createDashboardCompositionPlan({
    candidates,
    informationBudget: createExecutiveDashboardInformationBudget(candidates),
    decisionPerspective: effectivePerspectiveId,
    audience: null,
    domainId,
    advisoryRoleOrder: advice.roleOrder,
  });
  const admitted = new Set(compositionPlan.items.map(item => item.candidateId));

  const dashboardId = createDashboard(`${analysisAction.opportunityName} — ${session.datasetId}`, {
    source: 'easy_mode_perspective',
    datasetId: session.datasetId,
    actionId: analysisAction.id,
    perspective: analysisAction.opportunityName,
    perspectiveId: effectivePerspectiveId,
    governed: true,
    decisionVisualizationPlan: primaryDecisionVisualizationPlan ? { schemaVersion: primaryDecisionVisualizationPlan.schemaVersion, planId: primaryDecisionVisualizationPlan.planId, governance: primaryDecisionVisualizationPlan.governance } : null,
    dashboardCompositionPlan: compositionPlan,
    visualNarrativeCompositionPlan: visualNarrativePlan ?? null,
    dashboardCompositionAdvice: advice,
    evidenceScope: singleSourceBAOverview?.isRepresentativeSample ? 'governed_primary_with_representative_ba_sample' : 'full_source',
    generatedAt: new Date().toISOString(),
    analysisContract: {
      actionId: analysisAction.id,
      perspective: analysisAction.opportunityName,
      perspectiveId: effectivePerspectiveId,
      dimensions: analysisAction.dimensions,
      measures: analysisAction.measures,
      measureAggregations: analysisAction.measureAggregations ?? {},
      resolvedBindings: singleSourceBAOverview?.bindings ?? {},
      evidenceScope: singleSourceBAOverview?.isRepresentativeSample ? 'governed_primary_with_representative_ba_sample' : 'full_source',
    },
    deepBA: baDecisionBrief && admitted.has(deepBACandidateId) ? {
      executiveSummary: baDecisionBrief.executiveSummary,
      dataTrustScore: baDecisionBrief.dataTrustScore,
      decisionReadinessScore: baDecisionBrief.decisionReadinessScore,
      insights: baDecisionBrief.insights.map(insight => ({ id: insight.id, title: insight.title, statement: insight.statement, severity: insight.severity, confidence: insight.confidence, evidence: insight.evidence })),
      decisionSuggestions: baDecisionBrief.decisionSuggestions,
      caveats: baDecisionBrief.caveats,
      recommendedCharts: baDecisionBrief.recommendedCharts,
    } : null,
    perspectiveBA: singleSourceBAOverview && admitted.has(perspectiveBACandidateId) ? {
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

  const materializableItems = compositionPlan.items.filter(item => materializers.has(item.candidateId));
  const widgetLayouts = materializeDashboardWidgetLayouts(materializableItems);
  for (const item of materializableItems) {
    const materialize = materializers.get(item.candidateId)!;
    addChartToDashboard(dashboardId, materialize(), widgetLayouts.get(item.candidateId));
  }
  closeDeepAnalysis();
  navigate(`/dashboards/${dashboardId}`);
};

  return { persistChartModel, saveChartToLibrary, createPerspectiveDashboard };
}
