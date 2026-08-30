export const DECISION_VISUALIZATION_PLAN_VERSION = 'lightbi.decision-visualization-plan.v1' as const;

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
    metricIds: string[];
    rows: Record<string, unknown>[];
  };
  primaryVisualization: {
    type: 'line' | 'bar';
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
  sourceRefs?: DecisionVisualizationSourceRefV1[];
  selectedScope?: DecisionVisualizationScopeV1;
};

function stableId(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `decision-visualization:${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

export function createDecisionVisualizationPlan(input: CreateDecisionVisualizationPlanInputV1): DecisionVisualizationPlanV1 {
  if (!input.perspectiveId.trim()) throw new Error('DECISION_VISUALIZATION_PERSPECTIVE_REQUIRED');
  if (!input.dimensionField.trim()) throw new Error('DECISION_VISUALIZATION_DIMENSION_REQUIRED');
  if (input.rows.length === 0) throw new Error('DECISION_VISUALIZATION_ROWS_REQUIRED');
  const selectedScope = input.selectedScope ?? null;
  if (selectedScope && selectedScope.dimensionField !== input.dimensionField) throw new Error('DECISION_VISUALIZATION_SCOPE_DIMENSION_MISMATCH');
  const scopedRows = selectedScope
    ? input.rows
      .filter(row => String(row[input.dimensionField] ?? '') === selectedScope.dimensionValue)
      .map(row => ({ [input.dimensionField]: row[input.dimensionField], [selectedScope.metricId]: row[selectedScope.metricId] }))
    : input.rows.map(row => ({ ...row }));
  if (scopedRows.length === 0) throw new Error('DECISION_VISUALIZATION_SCOPE_EMPTY');
  const metricIds = selectedScope
    ? [selectedScope.metricId]
    : [...new Set(scopedRows.flatMap(row => Object.keys(row).filter(key => key !== input.dimensionField)))];
  if (metricIds.length === 0) throw new Error('DECISION_VISUALIZATION_METRIC_REQUIRED');
  const sourceRefs = (input.sourceRefs ?? []).map(source => ({ ...source }));
  const seed = JSON.stringify({ perspectiveId: input.perspectiveId, dimensionField: input.dimensionField, selectedScope, sourceCount: input.sourceCount, sourceRefs, rows: scopedRows, metricIds });
  return {
    schemaVersion: DECISION_VISUALIZATION_PLAN_VERSION,
    planId: stableId(seed),
    perspectiveId: input.perspectiveId,
    selectedScope,
    sourceCount: input.sourceCount,
    sourceRefs,
    result: { dimensionField: input.dimensionField, metricIds, rows: scopedRows },
    primaryVisualization: { type: scopedRows.length >= 2 ? 'line' : 'bar', xField: input.dimensionField, seriesFields: metricIds },
    governance: { resultAuthority: 'governed_metric_results', evidencePolicy: 'source_bound', rawMultiSourceJoinAllowed: false },
  };
}
