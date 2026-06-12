import { describe, it, expect } from 'vitest';
import { evaluateDecisionReadiness } from './decision-readiness-engine';
import type { DatasetUnderstanding } from './dataset-understanding-contract';
import type { DatasetHealthResult } from './dataset-health-engine';

describe('Decision Readiness Engine', () => {
  const createMockUnderstanding = (status: 'understood' | 'partial' | 'insufficient', confidence: number): DatasetUnderstanding => ({
    id: 'du_1',
    status,
    confidenceScore: confidence,
    grainHint: 'unknown',
    summary: { rowCount: 100, columnCount: 10, signalCount: 5, perspectiveCount: 1, businessViewCount: 1, questionCount: 1 },
    detectedConcepts: [],
    inferredEntities: [],
    workflowHints: [],
    relationshipHints: [],
    capabilities: [],
    opportunities: status === 'insufficient' ? [] : [{ id: 'o1', label: 'L', basedOnSignals: [], source: 'heuristic', actionType: 'group_by', dimensions: [], measures: [] }],
    availableAnalysis: status === 'insufficient' ? [] : [{ id: 'a1', label: 'L', basedOnSignals: [], source: 'signals', actionType: 'group_by', dimensions: [], measures: [] }],
    unavailableAnalysis: [],
    caveats: [],
    narrative: '',
    sourceTrace: { signalIds: [], perspectiveIds: [], businessViewIds: [], questionSuggestionIds: [] },
    createdAt: ''
  });

  it('strong understanding + no health input => capped below decision-support', () => {
    const understanding = createMockUnderstanding('understood', 100);
    const result = evaluateDecisionReadiness(understanding);
    
    expect(result.score).toBe(89);
    expect(result.tier).toBe('reference_only');
    expect(result.caveats.some(c => c.includes('downgraded to 89'))).toBe(true);
    expect(result.reasonSummary).toContain('unverified data health limits trust');
  });

  it('strong understanding + strong health => can reach decision-support', () => {
    const understanding = createMockUnderstanding('understood', 100);
    const health: DatasetHealthResult = {
      datasetId: 'ds_1',
      completeness: 100,
      consistency: 100,
      uniqueness: 100,
      keyQuality: 100,
      overall: 100,
      warnings: []
    };
    
    const result = evaluateDecisionReadiness(understanding, health);
    
    expect(result.score).toBeGreaterThanOrEqual(90);
    expect(result.tier).toBe('decision_support');
    expect(result.caveats.some(c => c.includes('downgraded to 89'))).toBe(false);
    expect(result.reasonSummary).toContain('Suitable for decision support');
  });

  it('middling evidence => reference-only', () => {
    const understanding = createMockUnderstanding('partial', 80);
    const health: DatasetHealthResult = {
      datasetId: 'ds_1',
      completeness: 80,
      consistency: 80,
      uniqueness: 80,
      keyQuality: 80,
      overall: 80, // Score: 80*0.35 + 80*0.35 + 80*0.30 = 28 + 28 + 24 = 80 -> wait, 80*0.35 = 28. (80+80)*0.35 + 80*0.3 = 56 + 24 = 80.
      warnings: []
    };
    
    // With confidence 80, coverage (70+10)=80, health 80 -> total 80.
    // That would be exploratory_only because 80 < 85.
    // Let's tweak to make it reference-only (85-89).
    const betterUnderstanding = createMockUnderstanding('partial', 90);
    // coverage = 80
    // health = 90
    // Score: 90*0.35 + 80*0.35 + 90*0.3 = 31.5 + 28 + 27 = 86.5 => 87 (reference-only)
    const betterHealth: DatasetHealthResult = {
      datasetId: 'ds_1', completeness: 90, consistency: 90, uniqueness: 90, keyQuality: 90, overall: 90, warnings: []
    };
    
    const result = evaluateDecisionReadiness(betterUnderstanding, betterHealth);
    
    expect(result.score).toBeGreaterThanOrEqual(85);
    expect(result.score).toBeLessThan(90);
    expect(result.tier).toBe('reference_only');
    expect(result.reasonSummary).toContain('Minor gaps in health or semantic coverage');
  });

  it('weak evidence => exploratory-only', () => {
    const understanding = createMockUnderstanding('insufficient', 40);
    const health: DatasetHealthResult = {
      datasetId: 'ds_1', completeness: 50, consistency: 50, uniqueness: 50, keyQuality: 50, overall: 50, warnings: []
    };
    // coverage: 30
    // score: 40*0.35 + 30*0.35 + 50*0.3 = 14 + 10.5 + 15 = 39.5 => 40
    
    const result = evaluateDecisionReadiness(understanding, health);
    
    expect(result.score).toBeLessThan(85);
    expect(result.tier).toBe('exploratory_only');
    expect(result.reasonSummary).toContain('Significant gaps');
  });

  it('weak understanding + no health => exploratory-only', () => {
    const understanding = createMockUnderstanding('insufficient', 40);
    // coverage: 30
    // score: 40*0.5 + 30*0.5 = 20 + 15 = 35
    const result = evaluateDecisionReadiness(understanding);
    
    expect(result.score).toBeLessThan(85);
    expect(result.tier).toBe('exploratory_only');
    expect(result.reasonSummary).toContain('Weak semantic understanding');
  });
});
