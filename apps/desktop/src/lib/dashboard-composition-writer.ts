import type { ChartType } from '@lightbi/core-types';
import { createDecisionVisualizationPlan, type DecisionVisualizationPlanV1 } from './decision-visualization-plan';
import { rendererCapabilityForPattern } from './visualization-renderer-registry';
import type {
  DashboardCompositionCandidateV1,
  DashboardInformationBudgetV1,
  DashboardSemanticRoleV1,
} from './dashboard-composition-plan';

export function createExecutiveDashboardInformationBudget(
  candidates: readonly DashboardCompositionCandidateV1[],
): DashboardInformationBudgetV1 {
  return {
    maxItems: Math.max(1, candidates.length),
    maxMetrics: 4,
    maxVisuals: 4,
  };
}

const GENERIC_ROLE_PRIORS: Readonly<Record<DashboardSemanticRoleV1, string[]>> = {
  hero_metric: ['overview'],
  context_metric: ['overview'],
  primary_answer: ['overview'],
  trend_context: ['drivers'],
  ranked_driver: ['drivers'],
  composition_context: ['drivers'],
  target_progress: ['drivers'],
  relationship_context: ['drivers', 'relationship'],
  risk_exception: ['risk', 'exceptions'],
  evidence_table: ['evidence'],
};
export function dashboardAdvisoryRoles(
  semanticRole: DashboardSemanticRoleV1,
  semanticSignals: readonly string[] = [],
): string[] {
  return [...new Set([
    ...GENERIC_ROLE_PRIORS[semanticRole],
    ...semanticSignals.map(value => String(value).trim()).filter(Boolean),
  ])];
}

export function createDashboardBreakdownVisualizationPlan(input: {
  perspectiveId: string;
  sourceCount: number;
  rows: Array<{ label: string; value: number } & Record<string, unknown>>;
}): DecisionVisualizationPlanV1 {
  return createDecisionVisualizationPlan({
    perspectiveId: input.perspectiveId,
    sourceCount: input.sourceCount,
    rows: input.rows,
    dimensionField: 'label',
    metricIds: ['value'],
    analyticalIntent: 'ranking',
    availableRoles: ['category', 'measure'],
    cardinality: { points: input.rows.length, categories: input.rows.length, series: 1 },
    requiredSurfaces: ['persistence', 'dashboard'],
  });
}
export function dashboardDecisionVisualizationMetadata(decisionPlan: DecisionVisualizationPlanV1 | null) {
  return decisionPlan ? {
    schemaVersion: decisionPlan.schemaVersion,
    planId: decisionPlan.planId,
    governance: decisionPlan.governance,
    visualizationPlan: {
      schemaVersion: decisionPlan.visualizationPlan.schemaVersion,
      planId: decisionPlan.visualizationPlan.planId,
      analyticalIntent: decisionPlan.visualizationPlan.analyticalIntent,
      patternId: decisionPlan.visualizationPlan.patternId,
      rendererFamily: decisionPlan.visualizationPlan.rendererFamily,
      patternRules: decisionPlan.visualizationPlan.patternRules,
      governance: decisionPlan.visualizationPlan.governance,
    },
  } : null;
}
export function persistedDashboardChartType(decisionPlan: DecisionVisualizationPlanV1): ChartType {
  const patternId = decisionPlan.visualizationPlan.patternId;
  if (!patternId) throw new Error('DASHBOARD_VISUALIZATION_PATTERN_REQUIRED');
  const chartType = rendererCapabilityForPattern(patternId).persistedChartType;
  if (!chartType) throw new Error(`VISUALIZATION_PERSISTENCE_UNAVAILABLE:${patternId}`);
  return chartType;
}
