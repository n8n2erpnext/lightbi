import { describe, it, expect } from 'vitest';
import { runGuidedInvestigationPipeline } from './guided-investigation-pipeline';

describe('Guided Investigation Pipeline Orchestrator', () => {

  it('Executes the entire end-to-end pipeline deterministically', () => {
    // Provide an input that hits the "revenue_performance" business view
    const result = runGuidedInvestigationPipeline({
      columns: [
        { name: 'revenue', type: 'number' },
        { name: 'order', type: 'string' }
      ]
    });

    // 1. Signals detected
    expect(result.signals.hasSignal('revenue')).toBe(true);
    expect(result.signals.hasSignal('order')).toBe(true);

    // 2. Perspectives generated
    expect(result.perspectives.length).toBeGreaterThan(0);
    expect(result.perspectives.some(p => p.id === 'revenue')).toBe(true);

    // 3. Business Views generated (Revenue Performance requires revenue + order)
    expect(result.businessViews.length).toBeGreaterThan(0);
    const revenuePerf = result.businessViews.find(v => v.id === 'revenue_performance');
    expect(revenuePerf).toBeDefined();

    // 4. Question Plans generated
    // revenue_performance maps to intent_revenue_trend and intent_revenue_ranking
    expect(result.questionPlans.length).toBeGreaterThan(0);
    expect(result.questionPlans.some(p => p.intentId === 'intent_revenue_trend')).toBe(true);

    // 5. Question Suggestions rendered
    expect(result.questionSuggestions.length).toBeGreaterThan(0);
    expect(result.questionSuggestions.some(s => s.text === 'How has revenue changed over time?')).toBe(true);
    expect(result.questionSuggestions[0].source).toBe('domain_catalog');
  });

  it('Returns empty arrays down the chain if no signals found', () => {
    const result = runGuidedInvestigationPipeline({
      columns: [
        { name: 'unknown_column_1' },
        { name: 'unknown_column_2' }
      ]
    });

    expect(result.signals.signals.length).toBe(0);
    expect(result.perspectives.length).toBe(0);
    expect(result.businessViews.length).toBe(0);
    expect(result.questionPlans.length).toBe(0);
    expect(result.questionSuggestions.length).toBe(0);
  });

});
