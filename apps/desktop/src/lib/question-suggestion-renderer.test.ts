import { describe, it, expect } from 'vitest';
import { renderQuestionSuggestions } from './question-suggestion-renderer';
import type { QuestionPlan } from './question-plan-generator';
import { getDomainCatalog } from './domain-knowledge-catalog';

function createMockPlan(id: string, viewId: string, intentId: string, confidenceScore: number): QuestionPlan {
  return {
    id,
    businessViewId: viewId,
    perspectiveId: 'revenue', // Example perspective
    intentId: intentId,
    confidenceScore,
    status: 'candidate',
    evidenceSignals: ['sig_1', 'sig_2'],
    dimensions: ['entity'],
    measures: ['metric']
  };
}

describe('Question Suggestion Renderer', () => {
  it('1. Plan for a valid Business View + intent renders suggestions', () => {
    // "revenue_performance" has intent "intent_revenue_trend" which has template "How has revenue changed over time?"
    const plan = createMockPlan('p1', 'revenue_performance', 'intent_revenue_trend', 80);
    const suggestions = renderQuestionSuggestions({ plans: [plan] });
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions[0].text).toBe('How has revenue changed over time?');
  });

  it('2. Suggestion text comes from DOMAIN_KNOWLEDGE_CATALOG_V1', () => {
    const catalog = getDomainCatalog('revenue');
    const intent = catalog?.intentFamilies.find(i => i.id === 'intent_revenue_trend');
    const template = intent?.questionTemplates[0];

    const plan = createMockPlan('p1', 'revenue_performance', 'intent_revenue_trend', 80);
    const suggestions = renderQuestionSuggestions({ plans: [plan] });
    expect(suggestions[0].text).toBe(template);
  });

  it('3. Missing intent returns no suggestions', () => {
    const plan = createMockPlan('p1', 'revenue_performance', 'intent_missing', 80);
    const suggestions = renderQuestionSuggestions({ plans: [plan] });
    expect(suggestions.length).toBe(0);
  });

  it('4. Missing Business View returns no suggestions', () => {
    const plan = createMockPlan('p1', 'missing_view', 'intent_revenue_trend', 80);
    const suggestions = renderQuestionSuggestions({ plans: [plan] });
    expect(suggestions.length).toBe(0);
  });

  it('5. No plans returns []', () => {
    const suggestions = renderQuestionSuggestions({ plans: [] });
    expect(suggestions.length).toBe(0);
  });

  it('6. No placeholder leakage: Rendered text does not contain raw planning placeholders', () => {
    const plan = createMockPlan('p1', 'revenue_performance', 'intent_revenue_trend', 80);
    plan.dimensions = ['time', 'category'];
    plan.measures = ['metric', 'metric_1'];
    
    const suggestions = renderQuestionSuggestions({ plans: [plan] });
    const text = suggestions[0].text.toLowerCase();
    
    // Only standard text from templates.
    // If the template doesn't explicitly have the word "time", "metric", it shouldn't leak.
    // Actually the string "How has revenue changed over time?" has "time". But it's part of the template.
    // "metric", "metric_1", "category" are not in the template.
    expect(text).not.toContain('metric');
    expect(text).not.toContain('metric_1');
    expect(text).not.toContain('category');
  });

  it('7. Confidence inherited', () => {
    const plan = createMockPlan('p1', 'revenue_performance', 'intent_revenue_trend', 85);
    const suggestions = renderQuestionSuggestions({ plans: [plan] });
    expect(suggestions[0].confidenceScore).toBe(85);
  });

  it('8. Evidence signals inherited', () => {
    const plan = createMockPlan('p1', 'revenue_performance', 'intent_revenue_trend', 80);
    const suggestions = renderQuestionSuggestions({ plans: [plan] });
    expect(suggestions[0].evidenceSignals).toEqual(['sig_1', 'sig_2']);
  });

  it('9. source is always domain_catalog', () => {
    const plan = createMockPlan('p1', 'revenue_performance', 'intent_revenue_trend', 80);
    const suggestions = renderQuestionSuggestions({ plans: [plan] });
    expect(suggestions[0].source).toBe('domain_catalog');
  });

  it('10. No fallback to old templates - missing templates mean empty result', () => {
    // intent_operational_performance in performance domain has empty questionTemplates []
    const plan = createMockPlan('p1', 'operational_performance', 'intent_operational_performance', 80);
    const suggestions = renderQuestionSuggestions({ plans: [plan] });
    // It should yield exactly 0 suggestions, instead of falling back to a raw question
    expect(suggestions.length).toBe(0);
  });

});
