import { describe, it, expect } from 'vitest';
import { evaluateDecisionReadiness } from './decision-readiness-engine';
import type { DatasetUnderstanding } from './dataset-understanding-contract';

describe('Decision Readiness Engine (Phase 3)', () => {
  const createMockUnderstanding = (
    confidence: number,
    grain: any,
    concepts: string[],
    signalCount: number,
    colCount: number
  ): DatasetUnderstanding => ({
    id: 'du_1',
    status: 'understood',
    confidenceScore: confidence,
    grain,
    grainEvidence: '',
    summary: { rowCount: 100, columnCount: colCount, signalCount, perspectiveCount: 1, businessViewCount: 1, questionCount: 1 },
    detectedConcepts: concepts.map(c => ({ canonicalConcept: c, signalId: c, label: c, confidenceScore: confidence, evidence: [] })),
    inferredEntities: [],
    workflowHints: [],
    relationshipHints: [],
    capabilities: [],
    opportunities: [],
    availableAnalysis: [],
    unavailableAnalysis: [],
    caveats: [],
    narrative: '',
    sourceTrace: { signalIds: [], perspectiveIds: [], businessViewIds: [], questionSuggestionIds: [] },
    createdAt: ''
  });

  it('full scenario: >=90 score, decision_support, no caveats', () => {
    // 30 + 20 + 20 + 20 + 10 = 100
    const du = createMockUnderstanding(100, 'event', ['revenue', 'segment', 'report_date'], 3, 5);
    const result = evaluateDecisionReadiness(du);
    
    expect(result.score).toBe(100);
    expect(result.tier).toBe('decision_support');
    expect(result.caveats.length).toBe(0);
  });

  it('partial scenario: 85-89 score, caution', () => {
    // No time (-10), confidence 100 (+30), grain (+20), measure (+20), dim (+20) -> 90.
    // Let's make confidence 80 -> 24. 24 + 20 + 20 + 20 = 84 (exploratory).
    // Let's make confidence 85 -> 25.5. 25.5 + 20 + 20 + 20 = 85.5 -> 86 (caution).
    const du = createMockUnderstanding(85, 'entity', ['revenue', 'segment'], 2, 4);
    const result = evaluateDecisionReadiness(du);
    
    expect(result.score).toBeGreaterThanOrEqual(85);
    expect(result.score).toBeLessThan(90);
    expect(result.tier).toBe('caution');
    expect(result.caveats).toContain('No time detected.');
  });

  it('sparse scenario: exploratory_only due to low confidence and low signal ratio', () => {
    // Confidence 50 -> 15. measure (+20), dim (+20), no time (+0), grain unknown (+0) -> 55.
    const du = createMockUnderstanding(50, 'unknown', ['revenue', 'segment'], 2, 10);
    const result = evaluateDecisionReadiness(du);
    
    expect(result.score).toBeLessThan(85);
    expect(result.tier).toBe('exploratory_only');
    expect(result.caveats).toContain('Low signal ratio.');
    expect(result.caveats).toContain('Grain unknown.');
  });

  it('zero scenario: 0 score', () => {
    const du = createMockUnderstanding(0, 'unknown', [], 0, 5);
    const result = evaluateDecisionReadiness(du);
    
    expect(result.score).toBe(0);
    expect(result.tier).toBe('exploratory_only');
    expect(result.caveats).toContain('No measure detected.');
    expect(result.caveats).toContain('No dimension detected.');
  });

  it('measures-only scenario', () => {
    // Confidence 100 -> 30. Measure (+20). No grain (+0), no dim (+0), no time (+0). Score = 50.
    const du = createMockUnderstanding(100, 'unknown', ['revenue', 'cost'], 2, 3);
    const result = evaluateDecisionReadiness(du);
    
    expect(result.score).toBe(50);
    expect(result.tier).toBe('exploratory_only');
    expect(result.caveats).toContain('No dimension detected.');
    expect(result.caveats).toContain('No time detected.');
  });
});
