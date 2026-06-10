import { describe, it, expect } from 'vitest';
import { generateQuestionPlans, mapIntentToStructure } from './question-plan-generator';
import type { BusinessViewCandidate } from './business-view-candidate-generator';
import type { BusinessSignalRegistry, BusinessSignal } from './business-signal-detector';
import { getDomainCatalog } from './domain-knowledge-catalog';

function createMockRegistry(): BusinessSignalRegistry {
  return {
    datasetId: 'test_ds',
    signals: [],
    hasSignal: () => true,
    getSignal: () => undefined,
    getSignalsByDomain: () => [],
    getOverallConfidence: () => 100
  };
}

function createMockView(id: string, definitionId: string, status: 'candidate' | 'rejected' = 'candidate', confidence: number = 100): BusinessViewCandidate {
  return {
    id,
    definitionId,
    label: id,
    perspectiveId: 'revenue', // Assuming standard domain for tests
    description: '',
    confidenceScore: confidence,
    status,
    matchedRequiredSignals: [],
    missingRequiredSignals: [],
    matchedOptionalSignals: [],
    evidence: [
      { signalId: 'sig_1', canonicalSignal: 'sig_1', label: 'Sig 1', confidenceScore: 100, role: 'required', message: '' },
      { signalId: 'sig_2', canonicalSignal: 'sig_2', label: 'Sig 2', confidenceScore: 100, role: 'optional', message: '' }
    ],
    intentIds: [],
    examples: []
  };
}

describe('Question Plan Generator', () => {

  it('1. Business View with 3 intents creates 3 Question Plans', () => {
    // "revenue_performance" in our catalog has 2 intents: intent_revenue_trend, intent_revenue_ranking
    const view = createMockView('rev_perf_1', 'revenue_performance', 'candidate', 100);
    const plans = generateQuestionPlans([view], createMockRegistry());
    
    expect(plans.length).toBe(2);
    expect(plans[0].intentId).toBe('intent_revenue_trend');
    expect(plans[1].intentId).toBe('intent_revenue_ranking');
  });

  it('2. Confidence inherited as 80% of view confidence', () => {
    const view = createMockView('rev_perf_1', 'revenue_performance', 'candidate', 80);
    const plans = generateQuestionPlans([view], createMockRegistry());
    
    // 80 * 0.8 = 64
    expect(plans[0].confidenceScore).toBe(64);
  });

  it('3. Evidence inherited', () => {
    const view = createMockView('rev_perf_1', 'revenue_performance', 'candidate', 100);
    const plans = generateQuestionPlans([view], createMockRegistry());
    
    expect(plans[0].evidenceSignals).toEqual(['sig_1', 'sig_2']);
  });

  it('4. No Business Views returns []', () => {
    const plans = generateQuestionPlans([], createMockRegistry());
    expect(plans.length).toBe(0);
  });

  it('5. Rejected view does not create plans', () => {
    const view = createMockView('rev_perf_1', 'revenue_performance', 'rejected', 100);
    const plans = generateQuestionPlans([view], createMockRegistry());
    expect(plans.length).toBe(0);
  });

  it('6. Multiple Business Views generate plans independently', () => {
    const view1 = createMockView('v1', 'revenue_performance', 'candidate', 100);
    const view2 = createMockView('v2', 'revenue_trend', 'candidate', 90);
    
    const plans = generateQuestionPlans([view1, view2], createMockRegistry());
    // revenue_performance = 2 intents, revenue_trend = 1 intent -> Total 3
    expect(plans.length).toBe(3);
  });

  it('7. No fallback - unknown view id returns 0 plans', () => {
    const view = createMockView('unknown', 'unknown_def', 'candidate', 100);
    const plans = generateQuestionPlans([view], createMockRegistry());
    expect(plans.length).toBe(0);
  });

  it('8. No text generation - Plan has no textual properties', () => {
    const view = createMockView('rev_perf_1', 'revenue_performance', 'candidate', 100);
    const plans = generateQuestionPlans([view], createMockRegistry());
    
    const p = plans[0];
    expect((p as any).question).toBeUndefined();
    expect((p as any).title).toBeUndefined();
    expect((p as any).prompt).toBeUndefined();
  });

  describe('Generic Dimension/Measure Mapping', () => {
    it('maps trend to time dimension', () => {
      const s = mapIntentToStructure('intent_revenue_trend');
      expect(s.dimensions).toContain('time');
      expect(s.measures).toContain('metric');
    });

    it('maps ranking to entity dimension', () => {
      const s = mapIntentToStructure('intent_revenue_ranking');
      expect(s.dimensions).toContain('entity');
      expect(s.measures).toContain('metric');
    });

    it('maps impact/correlation to multiple measures', () => {
      const s = mapIntentToStructure('intent_discount_impact');
      expect(s.measures).toContain('metric_1');
      expect(s.measures).toContain('metric_2');
    });
  });

});
