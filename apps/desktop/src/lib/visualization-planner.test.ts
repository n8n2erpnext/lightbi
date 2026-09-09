import { describe, expect, it } from 'vitest';
import { createGovernedVisualizationPlan, analyticalIntentFromRuntimeIntentType } from './visualization-planner';
import type { DomainVisualProfileV1 } from './domain-visual-profile';

const domainProfile = (preferredPatternIds: DomainVisualProfileV1['preferredPatternIds']): DomainVisualProfileV1 => ({
  schemaVersion: 'lightbi.domain-visual-profile.v1', domainId: 'test', authority: 'advisory_only',
  analyticalIntents: ['trend','category_comparison'], preferredPatternIds,
  conceptIds: ['concept.test'], evidenceRequirements: [], constraints: [], priorities: [], abstainWhen: [],
  unmappedChartFamilies: [],
  policy: { mayAuthorizeMetric: false, mayAuthorizeFormula: false, mayAuthorizeJoin: false, mayChooseRenderer: false, retrievalRankIsConfidence: false },
});

describe('DPR-6 governed visualization planner', () => {
  it('plans a time trend through pattern suitability before renderer family', () => {
    const plan = createGovernedVisualizationPlan({
      analyticalIntent: 'trend', availableRoles: ['ordered_time','measure'],
      cardinality: { points: 6, series: 1 }, requiredSurfaces: ['preview','persistence','dashboard'],
    });
    expect(plan.status).toBe('planned');
    expect(plan.patternId).toBe('trend_line');
    expect(plan.rendererFamily).toBe('line');
    expect(plan.governance.deterministicSuitabilityFinal).toBe(true);
  });
  it('lets domain advice reorder candidates but never bypass suitability', () => {
    const plan = createGovernedVisualizationPlan({
      analyticalIntent: 'category_comparison', availableRoles: ['category','measure'],
      cardinality: { categories: 30, series: 1 }, domainProfile: domainProfile(['ranking_bar']),
      requiredSurfaces: ['preview','persistence','dashboard'],
    });
    expect(plan.candidates[0]).toMatchObject({ patternId: 'ranking_bar', fromDomainPrior: true, eligible: false });
    expect(plan.patternId).toBe('evidence_table');
    expect(plan.rendererFamily).toBe('table');
  });

  it('uses the histogram renderer when the semantic distribution shape is supported', () => {
    const plan = createGovernedVisualizationPlan({
      analyticalIntent: 'distribution', availableRoles: ['numeric_observation','entity_key'],
      cardinality: { points: 100 }, requiredSurfaces: ['preview','persistence','dashboard'],
    });
    expect(plan.candidates[0]).toMatchObject({ patternId: 'distribution_histogram', eligible: true, rendererAvailable: true });
    expect(plan.patternId).toBe('distribution_histogram');
    expect(plan.rendererFamily).toBe('histogram');
  });
  it('preserves relationship semantics as scatter instead of collapsing to bar', () => {
    const plan = createGovernedVisualizationPlan({
      analyticalIntent: 'relationship', availableRoles: ['entity_key','measure','comparison_measure'],
      cardinality: { points: 120 }, requiredSurfaces: ['preview','persistence','dashboard'],
    });
    expect(plan.patternId).toBe('relationship_scatter');
    expect(plan.rendererFamily).toBe('scatter');
  });

  it('maps existing runtime intents conservatively without reading renderer shape', () => {
    expect(analyticalIntentFromRuntimeIntentType('trend')).toBe('trend');
    expect(analyticalIntentFromRuntimeIntentType('relationship')).toBe('relationship');
    expect(analyticalIntentFromRuntimeIntentType('group_by')).toBe('category_comparison');
    expect(analyticalIntentFromRuntimeIntentType('distribution')).toBe('distribution');
    expect(analyticalIntentFromRuntimeIntentType('table_preview')).toBe('evidence_detail');
  });
});
