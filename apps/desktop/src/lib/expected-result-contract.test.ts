import { describe, it, expect } from 'vitest';
import { 
  createExpectedResultContract, 
  summarizeExpectedResultContract, 
  validateExpectedResultContract 
} from './expected-result-contract';
import type { QuestionSuggestion, BusinessViewCandidate } from './business-view-generator';
import type { DuckDBLogicalPlan } from './duckdb-logical-plan';

describe('Expected Result Contract', () => {
  const mockView: BusinessViewCandidate = {
    id: 'view_1',
    title: 'View',
    description: 'Desc',
    confidence: 'HIGH',
    type: 'product_performance',
    status: 'suggested',
    score: 1,
    domains: [],
    supportingRelationshipIds: [],
    evidence: [],
    datasets: ['d1'],
    suggestedQuestions: []
  };

  const mockPlan: DuckDBLogicalPlan = {
    id: 'lp_1',
    sourcePlanId: 'vp_1',
    sourcePreviewId: 'rp_1',
    status: 'ready',
    operations: [],
    datasets: [],
    relationshipIds: [],
    warnings: [],
    guardDecision: 'allow'
  };

  it('1. Logistics ranking question', () => {
    const q: QuestionSuggestion = { id: 'q1', question: 'Which routes have the most delays?', intent: 'rank', requiredDomains: [], explanation: '' };
    const contract = createExpectedResultContract({ question: q, businessView: mockView, logicalPlan: mockPlan });
    expect(contract.shape).toBe('ranking');
    expect(contract.outputType).toBe('table');
    expect(contract.dimensions[0].id).toBe('route');
    expect(contract.measures[0].id).toBe('delayed_orders');
    expect(validateExpectedResultContract(contract).valid).toBe(true);
    expect(summarizeExpectedResultContract(contract)).toBe('LightBI expects to produce a ranking of Route by Delayed Orders.');
  });

  it('2. Product profitability question', () => {
    const q: QuestionSuggestion = { id: 'q2', question: 'Product profitability analysis', intent: 'compare', requiredDomains: [], explanation: '' };
    const contract = createExpectedResultContract({ question: q, businessView: mockView, logicalPlan: mockPlan });
    expect(contract.shape).toBe('comparison');
    expect(contract.dimensions[0].id).toBe('product');
    expect(contract.measures.map(m => m.id)).toContain('revenue');
    expect(validateExpectedResultContract(contract).valid).toBe(true);
  });

  it('3. Trend question', () => {
    const q: QuestionSuggestion = { id: 'q3', question: 'What is the trend of product delays?', intent: 'trend', requiredDomains: [], explanation: '' };
    const contract = createExpectedResultContract({ question: q, businessView: mockView, logicalPlan: mockPlan });
    expect(contract.shape).toBe('trend');
    expect(contract.outputType).toBe('chart');
    expect(validateExpectedResultContract(contract).valid).toBe(true);
  });

  it('4. Summary question', () => {
    const q: QuestionSuggestion = { id: 'q4', question: 'Total profit summary', intent: 'summary', requiredDomains: [], explanation: '' };
    const contract = createExpectedResultContract({ question: q, businessView: mockView, logicalPlan: mockPlan });
    expect(contract.shape).toBe('summary');
    expect(contract.outputType).toBe('metric');
    expect(summarizeExpectedResultContract(contract)).toContain('summary of');
  });

  it('5. Missing dimension warning', () => {
    const q: QuestionSuggestion = { id: 'q5', question: 'What is the missing ranking?', intent: 'rank', requiredDomains: [], explanation: '' };
    const contract = createExpectedResultContract({ question: q, businessView: mockView, logicalPlan: mockPlan });
    const validation = validateExpectedResultContract(contract);
    expect(validation.valid).toBe(false);
    expect(validation.warnings).toContain('Missing dimensions for expected result.');
  });

  it('6. Missing measure warning', () => {
    const q: QuestionSuggestion = { id: 'q6', question: 'What is the missing route info?', intent: 'rank', requiredDomains: [], explanation: '' };
    const contract = createExpectedResultContract({ question: q, businessView: mockView, logicalPlan: mockPlan });
    const validation = validateExpectedResultContract(contract);
    expect(validation.valid).toBe(false);
    expect(validation.warnings).toContain('Missing measures for expected result.');
  });

  it('7. Deterministic contract id', () => {
    const q: QuestionSuggestion = { id: 'q_test', question: 'route delays', intent: 'rank', requiredDomains: [], explanation: '' };
    const contract1 = createExpectedResultContract({ question: q, businessView: mockView, logicalPlan: mockPlan });
    const contract2 = createExpectedResultContract({ question: q, businessView: mockView, logicalPlan: mockPlan });
    expect(contract1.id).toBe(contract2.id);
  });
});
