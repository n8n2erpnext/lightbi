import type { AnalysisAction } from './analysis-opportunity-actions';
import type { RuntimeIntent } from './analysis-runtime-contract';
import type { ChartPreviewModel } from './chart-preview-model';
import { createDecisionVisualizationPlan, type DecisionVisualizationPlanV1 } from './decision-visualization-plan';
import { buildDomainVisualProfile } from './domain-visual-profile';
import { analyticalIntentFromRuntimeIntentType } from './visualization-planner';

export type InvestigationVisualizationPlanInput = {
  chartModel: ChartPreviewModel | null;
  runtimeIntent: RuntimeIntent;
  analysisAction: AnalysisAction;
  primaryDomain?: string | null;
};

export function buildInvestigationDecisionVisualizationPlan(
  input: InvestigationVisualizationPlanInput,
): DecisionVisualizationPlanV1 | null {
  const { chartModel, runtimeIntent, analysisAction } = input;
  if (!chartModel || chartModel.status !== 'ready' || chartModel.rows.length === 0) return null;
  const analyticalIntent = analyticalIntentFromRuntimeIntentType(runtimeIntent.type);
  const xFieldRole = analyticalIntent === 'relationship' ? 'measure' as const : 'dimension' as const;
  const xField = chartModel.xField ?? (xFieldRole === 'measure' ? chartModel.seriesFields[0] : null);
  if (!xField) return null;
  const metricIds = [...new Set([...(chartModel.seriesFields ?? []), chartModel.yField]
    .filter((value): value is string => Boolean(value && (xFieldRole === 'measure' || value !== xField))))];
  if (metricIds.length === 0) return null;
  const availableRoles = analyticalIntent === 'trend'
    ? ['ordered_time','measure', ...(metricIds.length > 1 ? ['series' as const] : [])] as const
    : analyticalIntent === 'relationship'
      ? ['entity_key','measure','comparison_measure'] as const
      : analyticalIntent === 'evidence_detail'
        ? ['entity_key'] as const
        : ['category','measure', ...(metricIds.length > 1 ? ['series' as const] : [])] as const;
  const domainProfile = input.primaryDomain ? buildDomainVisualProfile(input.primaryDomain, {
    perspectiveId: analysisAction.id,
    semanticSignals: [analysisAction.opportunityName, ...analysisAction.dimensions, ...analysisAction.measures],
  }) : null;
  try {
    return createDecisionVisualizationPlan({
      perspectiveId: analysisAction.id, rows: chartModel.rows, sourceCount: 1,
      dimensionField: xField, xFieldRole, metricIds, analyticalIntent,
      availableRoles: [...availableRoles],
      cardinality: {
        points: chartModel.rows.length,
        categories: xFieldRole === 'dimension'
          ? new Set(chartModel.rows.map(row => String(row[xField] ?? ''))).size
          : undefined,
        series: metricIds.length,
      },
      requiredSurfaces: ['preview','persistence','dashboard'], domainProfile,
    });
  } catch {
    return null;
  }
}
