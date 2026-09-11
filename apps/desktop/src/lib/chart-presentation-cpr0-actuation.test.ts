import { describe, expect, it } from 'vitest';
import { createGovernedVisualizationPlan } from './visualization-planner';
import {
  createVisualNarrativeCompositionPlan,
  type VisualNarrativeCandidateV1,
} from './visual-narrative-composition';

function candidate(overrides: Partial<VisualNarrativeCandidateV1> = {}): VisualNarrativeCandidateV1 {
  return {
    id: 'primary', isPrimary: true,
    managementQuestion: 'How is revenue changing?', storyRole: 'answer', analyticalIntent: 'trend',
    dimensionField: 'month', metricIds: ['sales_revenue'], unitFamily: 'currency', grainId: 'month',
    sourceScopeKey: 'dataset:revenue', evidenceBacked: true, evidenceRefs: ['governed:revenue'],
    decisionImportance: 100, visualizationPlanId: 'plan:revenue', rendererFamily: 'line', pointCount: 12,
    ...overrides,
  };
}

describe('CPR-0 chart-presentation actuation diagnostics', () => {
  it('actuates the official domain chart-set policy inside deterministic runtime planning', () => {
    const common = {
      analyticalIntent: 'period_comparison' as const,
      availableRoles: ['category', 'signed_measure'] as const,
      cardinality: { categories: 4, series: 1 },
      requiredSurfaces: ['preview', 'persistence', 'dashboard'] as const,
    };
    const generic = createGovernedVisualizationPlan(common);
    const finance = createGovernedVisualizationPlan({ ...common, officialDomainId: 'finance' });
    expect(generic.candidates[0]?.patternId).toBe('category_compare');
    expect(finance.candidates[0]?.patternId).toBe('variance_diverging');
    expect(finance.patternId).toBe('variance_diverging');
  });

  it.fails('lets official domain complements materially actuate a three-visual story when evidence is legal', () => {
    const plan = createVisualNarrativeCompositionPlan({ candidates: [
      candidate(),
      candidate({ id: 'driver', isPrimary: false, managementQuestion: 'Which products drive order volume?',
        storyRole: 'driver', analyticalIntent: 'ranking', dimensionField: 'product', metricIds: ['order_count'],
        unitFamily: 'count', decisionImportance: 90, officialComplementToPrimary: true, rendererFamily: 'row' }),
      candidate({ id: 'mix', isPrimary: false, managementQuestion: 'How is payment mix composed?',
        storyRole: 'composition', analyticalIntent: 'composition', dimensionField: 'payment_method', metricIds: ['payment_count'],
        unitFamily: 'count', decisionImportance: 80, officialComplementToPrimary: true, rendererFamily: 'donut' }),
    ] });
    expect(plan.layoutCount).toBe(3);
    expect(plan.units.flatMap(unit => unit.candidateIds)).toEqual(expect.arrayContaining(['primary', 'driver', 'mix']));
  });

  it('uses official domain story order after admission without changing deterministic membership', () => {
    const candidates = [
      candidate(),
      candidate({ id: 'driver', isPrimary: false, managementQuestion: 'Which products drive revenue?',
        storyRole: 'driver', analyticalIntent: 'ranking', dimensionField: 'product',
        decisionImportance: 40, advisoryRankPrior: 0, rendererFamily: 'row' }),
      candidate({ id: 'mix', isPrimary: false, managementQuestion: 'How is revenue composed by channel?',
        storyRole: 'composition', analyticalIntent: 'composition', dimensionField: 'channel',
        decisionImportance: 95, advisoryRankPrior: 999, rendererFamily: 'donut' }),
    ];
    const generic = createVisualNarrativeCompositionPlan({ candidates: candidates.map(item => ({ ...item })) });
    const revenue = createVisualNarrativeCompositionPlan({
      candidates: candidates.map(item => ({ ...item })),
      officialDomainId: 'revenue',
    });
    expect(generic.units.flatMap(unit => unit.candidateIds)).toEqual(['primary', 'mix', 'driver']);
    expect(revenue.units.flatMap(unit => unit.candidateIds)).toEqual(['primary', 'driver', 'mix']);
    expect(revenue.layoutCount).toBe(generic.layoutCount);
    expect(revenue.rejected).toEqual(generic.rejected);
  });
});
