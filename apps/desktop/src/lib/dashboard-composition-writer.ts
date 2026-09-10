import type { ChartType } from '@lightbi/core-types';
import { createDecisionVisualizationPlan, type DecisionVisualizationPlanV1 } from './decision-visualization-plan';
import { rendererCapabilityForPattern } from './visualization-renderer-registry';
import type {
  DashboardCompositionCandidateV1,
  DashboardInformationBudgetV1,
  DashboardSemanticRoleV1,
  DashboardCompositionPlanItemV1,
} from './dashboard-composition-plan';

export function createExecutiveDashboardInformationBudget(
  candidates: readonly DashboardCompositionCandidateV1[],
): DashboardInformationBudgetV1 {
  return {
    maxItems: Math.max(1, candidates.length),
    maxMetrics: 4,
    maxVisuals: 5,
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


export type DashboardWidgetLayoutV1 = { x: number; y: number; w: number; h: number };

function dashboardHeightUnits(item: DashboardCompositionPlanItemV1): number {
  if (item.heightIntent === 'compact') return 3;
  if (item.heightIntent === 'tall') return 11;
  return 8;
}

function packedWidths(count: number, kind: 'compact' | 'half'): number[] {
  if (count <= 0) return [];
  if (kind === 'half') return count === 1 ? [20] : [10, 10];
  if (count === 1) return [20];
  if (count === 2) return [10, 10];
  if (count === 3) return [7, 7, 6];
  return [5, 5, 5, 5];
}

/**
 * Materialize composition width/height intent onto the runtime 20-column grid.
 * Incomplete compact/half rows stretch to consume the row instead of leaving
 * an orphan blank region. Story order remains deterministic and unchanged.
 */
export function materializeDashboardWidgetLayouts(
  items: readonly DashboardCompositionPlanItemV1[],
): Map<string, DashboardWidgetLayoutV1> {
  const layouts = new Map<string, DashboardWidgetLayoutV1>();
  let y = 0;
  for (let index = 0; index < items.length;) {
    const item = items[index];
    if (item.widthIntent === 'full' || item.widthIntent === 'wide') {
      const h = dashboardHeightUnits(item);
      layouts.set(item.candidateId, { x: 0, y, w: 20, h });
      y += h;
      index += 1;
      continue;
    }
    const kind = item.widthIntent === 'compact' ? 'compact' : 'half';
    const rowLimit = kind === 'compact' ? 4 : 2;
    const row: DashboardCompositionPlanItemV1[] = [];
    while (index < items.length && row.length < rowLimit) {
      const candidate = items[index];
      const candidateKind = candidate.widthIntent === 'compact' ? 'compact'
        : candidate.widthIntent === 'half' ? 'half' : null;
      if (candidateKind !== kind) break;
      row.push(candidate);
      index += 1;
    }
    const widths = packedWidths(row.length, kind);
    const rowHeight = Math.max(...row.map(dashboardHeightUnits));
    let x = 0;
    row.forEach((candidate, rowIndex) => {
      const w = widths[rowIndex];
      layouts.set(candidate.candidateId, { x, y, w, h: dashboardHeightUnits(candidate) });
      x += w;
    });
    y += rowHeight;
  }
  return layouts;
}
