import type { DomainVisualProfileV1 } from './domain-visual-profile';
import type { MetricDesirabilityV1, VisualizationAnalyticalIntentV1, VisualizationColorSemanticsV1, VisualizationEvidenceRoleV1 } from './visualization-ontology';
import { createGovernedVisualizationPlan, type GovernedVisualizationPlanV1 } from './visualization-planner';
import type { VisualizationRendererSurfaceV1 } from './visualization-renderer-registry';
import type { VisualizationSuitabilityInputV1 } from './visualization-suitability';

export const DECISION_VISUALIZATION_PLAN_VERSION = 'lightbi.decision-visualization-plan.v2' as const;

export type DecisionVisualizationScopeV1 = {
  dimensionField: string;
  dimensionValue: string;
  metricId: string;
} | null;

export type DecisionVisualizationSourceRefV1 = {
  sourceId: string | null;
  sourceName: string;
  role: string;
  period: string;
  sourceRowCount: number;
};

export type DecisionVisualizationPlanV1 = {
  schemaVersion: typeof DECISION_VISUALIZATION_PLAN_VERSION;
  planId: string;
  perspectiveId: string;
  selectedScope: DecisionVisualizationScopeV1;
  sourceCount: number;
  sourceRefs: DecisionVisualizationSourceRefV1[];
  result: {
    dimensionField: string;
    xFieldRole: 'dimension' | 'measure';
    metricIds: string[];
    rows: Record<string, unknown>[];
  };
  visualizationPlan: GovernedVisualizationPlanV1;
  primaryVisualization: {
    type: 'line' | 'bar' | 'scatter' | 'table';
    xField: string;
    seriesFields: string[];
  };
  governance: {
    resultAuthority: 'governed_metric_results';
    evidencePolicy: 'source_bound';
    rawMultiSourceJoinAllowed: false;
  };
};

export type CreateDecisionVisualizationPlanInputV1 = {
  perspectiveId: string;
  rows: Record<string, unknown>[];
  sourceCount: number;
  dimensionField: string;
  xFieldRole?: 'dimension' | 'measure';
  metricIds?: string[];
  sourceRefs?: DecisionVisualizationSourceRefV1[];
  selectedScope?: DecisionVisualizationScopeV1;
  analyticalIntent: VisualizationAnalyticalIntentV1;
  availableRoles: VisualizationEvidenceRoleV1[];
  cardinality?: VisualizationSuitabilityInputV1['cardinality'];
  units?: VisualizationSuitabilityInputV1['units'];
  requestedColorSemantics?: VisualizationColorSemanticsV1;
  desirability?: MetricDesirabilityV1;
  requiredSurfaces?: VisualizationRendererSurfaceV1[];
  domainProfile?: DomainVisualProfileV1 | null;
};

function stableId(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `decision-visualization:${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function previewTypeForRendererFamily(family: GovernedVisualizationPlanV1['rendererFamily']): DecisionVisualizationPlanV1['primaryVisualization']['type'] {
  if (family === 'line') return 'line';
  if (family === 'scatter') return 'scatter';
  if (family === 'table') return 'table';
  if (family === 'bar' || family === 'column' || family === 'row') return 'bar';
  throw new Error(`DECISION_VISUALIZATION_RENDERER_UNSUPPORTED:${family ?? 'none'}`);
}

export function createDecisionVisualizationPlan(input: CreateDecisionVisualizationPlanInputV1): DecisionVisualizationPlanV1 {
  if (!input.perspectiveId.trim()) throw new Error('DECISION_VISUALIZATION_PERSPECTIVE_REQUIRED');
  if (!input.dimensionField.trim()) throw new Error('DECISION_VISUALIZATION_DIMENSION_REQUIRED');
  if (input.rows.length === 0) throw new Error('DECISION_VISUALIZATION_ROWS_REQUIRED');
  const selectedScope = input.selectedScope ?? null;
  const xFieldRole = input.xFieldRole ?? 'dimension';
  if (selectedScope && xFieldRole !== 'dimension') throw new Error('DECISION_VISUALIZATION_SELECTED_SCOPE_REQUIRES_DIMENSION');
  if (selectedScope && selectedScope.dimensionField !== input.dimensionField) throw new Error('DECISION_VISUALIZATION_SCOPE_DIMENSION_MISMATCH');
  const scopedRows = selectedScope
    ? input.rows
      .filter(row => String(row[input.dimensionField] ?? '') === selectedScope.dimensionValue)
      .map(row => ({ [input.dimensionField]: row[input.dimensionField], [selectedScope.metricId]: row[selectedScope.metricId] }))
    : input.rows.map(row => ({ ...row }));
  if (scopedRows.length === 0) throw new Error('DECISION_VISUALIZATION_SCOPE_EMPTY');
  const inferredMetricIds = [...new Set(scopedRows.flatMap(row => Object.keys(row).filter(key => xFieldRole === 'measure' || key !== input.dimensionField)))];
  const requestedMetricIds = [...new Set((input.metricIds ?? []).filter(metricId => xFieldRole === 'measure' || metricId !== input.dimensionField))];
  const metricIds = selectedScope
    ? [selectedScope.metricId]
    : requestedMetricIds.length > 0 ? requestedMetricIds : inferredMetricIds;
  if (metricIds.some(metricId => !scopedRows.some(row => Object.prototype.hasOwnProperty.call(row, metricId)))) {
    throw new Error('DECISION_VISUALIZATION_METRIC_NOT_IN_RESULT');
  }
  if (metricIds.length === 0) throw new Error('DECISION_VISUALIZATION_METRIC_REQUIRED');
  const sourceRefs = (input.sourceRefs ?? []).map(source => ({ ...source }));
  const visualizationPlan = createGovernedVisualizationPlan({
    analyticalIntent: input.analyticalIntent,
    availableRoles: input.availableRoles,
    cardinality: input.cardinality,
    units: input.units,
    requestedColorSemantics: input.requestedColorSemantics,
    desirability: input.desirability,
    requiredSurfaces: input.requiredSurfaces,
    domainProfile: input.domainProfile,
  });
  if (visualizationPlan.status !== 'planned') throw new Error('DECISION_VISUALIZATION_NO_SAFE_PLAN');
  const seed = JSON.stringify({ perspectiveId: input.perspectiveId, dimensionField: input.dimensionField, xFieldRole, selectedScope, sourceCount: input.sourceCount, sourceRefs, rows: scopedRows, metricIds, visualizationPlanId: visualizationPlan.planId });
  return {
    schemaVersion: DECISION_VISUALIZATION_PLAN_VERSION,
    planId: stableId(seed),
    perspectiveId: input.perspectiveId,
    selectedScope,
    sourceCount: input.sourceCount,
    sourceRefs,
    result: { dimensionField: input.dimensionField, xFieldRole, metricIds, rows: scopedRows },
    visualizationPlan,
    primaryVisualization: { type: previewTypeForRendererFamily(visualizationPlan.rendererFamily), xField: input.dimensionField, seriesFields: metricIds },
    governance: { resultAuthority: 'governed_metric_results', evidencePolicy: 'source_bound', rawMultiSourceJoinAllowed: false },
  };
}
