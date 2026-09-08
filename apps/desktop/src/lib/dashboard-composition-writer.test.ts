import { describe, expect, it } from 'vitest';
import { rendererCapabilityForPattern } from './visualization-renderer-registry';
import {
  createDashboardBreakdownVisualizationPlan,
  createExecutiveDashboardInformationBudget,
  dashboardAdvisoryRoles,
} from './dashboard-composition-writer';
import type { DashboardCompositionCandidateV1 } from './dashboard-composition-plan';

const candidate = (id: string, artifactKind: DashboardCompositionCandidateV1['artifactKind']): DashboardCompositionCandidateV1 => ({
  id, managementQuestion: `Question ${id}`, semanticRole: artifactKind === 'metric' ? 'context_metric' : 'ranked_driver',
  artifactKind, evidenceBacked: true, evidenceRefs: [`evidence:${id}`], decisionImportance: 50,
  reasonForInclusion: 'test',
});

describe('Dashboard composition writer support', () => {
  it('uses an executive relevance band without imposing an extra global card quota', () => {
    const candidates = [
      ...Array.from({ length: 7 }, (_, index) => candidate(`metric-${index}`, 'metric')),
      ...Array.from({ length: 6 }, (_, index) => candidate(`visual-${index}`, 'visual')),
    ];
    expect(createExecutiveDashboardInformationBudget(candidates)).toEqual({
      maxItems: candidates.length, maxMetrics: 4, maxVisuals: 4,
    });
  });
  it('creates a governed ranking visualization plan for a BA breakdown instead of choosing Bar directly', () => {
    const plan = createDashboardBreakdownVisualizationPlan({
      perspectiveId: 'sales', sourceCount: 1,
      rows: [{ label: 'A', value: 120 }, { label: 'B', value: 80 }],
    });
    expect(plan.schemaVersion).toBe('lightbi.decision-visualization-plan.v2');
    expect(plan.visualizationPlan.analyticalIntent).toBe('ranking');
    expect(plan.visualizationPlan.patternId).toBe('ranking_bar');
    const capability = rendererCapabilityForPattern(plan.visualizationPlan.patternId);
    expect(capability.persistedChartType).toBeTruthy();
    expect(capability.surfaces.persistence).toBe(true);
    expect(capability.surfaces.dashboard).toBe(true);
  });

  it('keeps generic story roles plus real semantic signals as MB-matchable advisory roles', () => {
    expect(dashboardAdvisoryRoles('risk_exception', ['Stock health', 'Warehouse'])).toEqual([
      'risk', 'exceptions', 'Stock health', 'Warehouse',
    ]);
    expect(dashboardAdvisoryRoles('relationship_context', ['Cost', 'Revenue'])).toEqual([
      'drivers', 'relationship', 'Cost', 'Revenue',
    ]);
  });
});