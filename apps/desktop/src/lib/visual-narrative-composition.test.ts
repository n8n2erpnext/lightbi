import { describe, expect, it } from 'vitest';
import {
  createVisualNarrativeCompositionPlan,
  type VisualNarrativeCandidateV1,
} from './visual-narrative-composition';

const candidate = (overrides: Partial<VisualNarrativeCandidateV1> = {}): VisualNarrativeCandidateV1 => ({
  id: 'primary',
  isPrimary: true,
  managementQuestion: 'How is revenue changing?',
  storyRole: 'answer',
  analyticalIntent: 'trend',
  dimensionField: 'month',
  metricIds: ['sales_revenue'],
  unitFamily: 'currency',
  grainId: 'month',
  sourceScopeKey: 'dataset:one',
  evidenceBacked: true,
  evidenceRefs: ['result:primary'],
  decisionImportance: 100,
  visualizationPlanId: 'plan:primary',
  rendererFamily: 'line',
  pointCount: 12,
  ...overrides,
});
describe('Visual Narrative Composition V1', () => {
  it('keeps one strong primary visual without inventing supporting charts', () => {
    const plan = createVisualNarrativeCompositionPlan({ candidates: [candidate()] });
    expect(plan.layoutCount).toBe(1);
    expect(plan.layoutMode).toBe('single');
    expect(plan.units).toHaveLength(1);
    expect(plan.units[0]).toMatchObject({ primaryAnchor: true, widthIntent: 'full' });
  });

  it('rejects a technically executable but semantically unrelated support visual', () => {
    const plan = createVisualNarrativeCompositionPlan({ candidates: [
      candidate({ managementQuestion: 'How many governed deliveries are present?', metricIds: ['delivery_count'], unitFamily: 'count' }),
      candidate({ id: 'carrier-cost', isPrimary: false, managementQuestion: 'Carrier cost impact', storyRole: 'driver', dimensionField: 'carrier', metricIds: ['delivery_fee'], unitFamily: 'currency', decisionImportance: 80 }),
    ] });
    expect(plan.layoutCount).toBe(1);
    expect(plan.rejected).toContainEqual({ candidateId: 'carrier-cost', reason: 'not_complementary' });
  });

  it('rejects duplicate semantic visuals even when their labels differ', () => {
    const plan = createVisualNarrativeCompositionPlan({ candidates: [
      candidate(),
      candidate({ id: 'same-story', isPrimary: false, managementQuestion: 'Revenue trend context', decisionImportance: 90 }),
    ] });
    expect(plan.rejected).toContainEqual({ candidateId: 'same-story', reason: 'duplicate_story' });
  });
  it('combines compatible governed layers into one primary visual instead of rendering two charts', () => {
    const plan = createVisualNarrativeCompositionPlan({ candidates: [
      candidate({ combination: { groupId: 'finance:revenue-cost', mark: 'bar', explicitUnitLabel: true } }),
      candidate({
        id: 'cost', isPrimary: false, managementQuestion: 'How does cost move with revenue?', storyRole: 'comparison',
        metricIds: ['cost'], rendererFamily: 'line', decisionImportance: 95,
        combination: { groupId: 'finance:revenue-cost', mark: 'line', explicitUnitLabel: true },
      }),
    ] });
    expect(plan.layoutCount).toBe(1);
    expect(plan.units[0]).toMatchObject({ primaryAnchor: true, presentation: 'combo_bar_line' });
    expect(plan.units[0].candidateIds).toEqual(['primary', 'cost']);
  });

  it('normalizes one primary plus one non-combinable complement back to one visual', () => {
    const plan = createVisualNarrativeCompositionPlan({ candidates: [
      candidate(),
      candidate({ id: 'driver', isPrimary: false, managementQuestion: 'Which product drives revenue?', storyRole: 'driver', dimensionField: 'product', decisionImportance: 90 }),
    ] });
    expect(plan.layoutCount).toBe(1);
    expect(plan.rejected).toContainEqual({ candidateId: 'driver', reason: 'layout_normalization' });
  });
  it('uses a balanced three-visual story when two distinct complements are evidence-backed', () => {
    const plan = createVisualNarrativeCompositionPlan({ candidates: [
      candidate(),
      candidate({ id: 'driver', isPrimary: false, managementQuestion: 'Which product drives revenue?', storyRole: 'driver', dimensionField: 'product', decisionImportance: 90 }),
      candidate({ id: 'mix', isPrimary: false, managementQuestion: 'How is revenue composed by channel?', storyRole: 'composition', analyticalIntent: 'composition', dimensionField: 'channel', decisionImportance: 80 }),
    ] });
    expect(plan.layoutCount).toBe(3);
    expect(plan.layoutMode).toBe('hero_plus_two');
    expect(plan.units.map(unit => unit.widthIntent)).toEqual(['full', 'half', 'half']);
  });

  it('normalizes four visuals to three rather than leaving an orphan grid cell', () => {
    const plan = createVisualNarrativeCompositionPlan({ candidates: [
      candidate(),
      candidate({ id: 'a', isPrimary: false, managementQuestion: 'Revenue by product?', storyRole: 'driver', dimensionField: 'product', decisionImportance: 90 }),
      candidate({ id: 'b', isPrimary: false, managementQuestion: 'Revenue by channel?', storyRole: 'composition', analyticalIntent: 'composition', dimensionField: 'channel', decisionImportance: 80 }),
      candidate({ id: 'c', isPrimary: false, managementQuestion: 'Revenue by branch?', storyRole: 'risk', dimensionField: 'branch', decisionImportance: 70 }),
    ] });
    expect(plan.layoutCount).toBe(3);
    expect(plan.rejected).toContainEqual({ candidateId: 'c', reason: 'layout_normalization' });
  });
  it('admits five distinct visuals as hero plus four without changing the primary anchor', () => {
    const plan = createVisualNarrativeCompositionPlan({ candidates: [
      candidate(),
      candidate({ id: 'a', isPrimary: false, managementQuestion: 'Revenue by product?', storyRole: 'driver', dimensionField: 'product', decisionImportance: 94 }),
      candidate({ id: 'b', isPrimary: false, managementQuestion: 'Revenue by channel?', storyRole: 'composition', analyticalIntent: 'composition', dimensionField: 'channel', decisionImportance: 93 }),
      candidate({ id: 'c', isPrimary: false, managementQuestion: 'Revenue by branch?', storyRole: 'risk', dimensionField: 'branch', decisionImportance: 92 }),
      candidate({ id: 'd', isPrimary: false, managementQuestion: 'Revenue by customer?', storyRole: 'relationship', dimensionField: 'customer', decisionImportance: 91 }),
    ] });
    expect(plan.layoutCount).toBe(5);
    expect(plan.layoutMode).toBe('hero_plus_four');
    expect(plan.units[0].candidateIds).toContain('primary');
    expect(plan.units[0].primaryAnchor).toBe(true);
  });

  it('keeps domain and Micro Brain advisory-only in membership governance', () => {
    const plan = createVisualNarrativeCompositionPlan({ candidates: [candidate()] });
    expect(plan.governance).toEqual(expect.objectContaining({
      deterministicMembershipFinal: true,
      domainAuthority: 'advisory_only',
      mbAuthority: 'advisory_only',
      rawJoinAllowed: false,
      allowedVisualCounts: [1, 3, 5],
    }));
  });
});
