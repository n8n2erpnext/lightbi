import { describe, expect, it } from 'vitest';
import { VISUALIZATION_ACCEPTANCE_CASES_V1 } from './visualization-acceptance-cases';
import { evaluateVisualizationSuitability } from './visualization-suitability';
import { VISUALIZATION_PATTERN_BY_ID_V1 } from './visualization-ontology';

describe('DPR-5 semantic visualization acceptance corpus', () => {
  it('keeps representative plan cases unique, semantic and renderer-free', () => {
    expect(VISUALIZATION_ACCEPTANCE_CASES_V1).toHaveLength(8);
    expect(new Set(VISUALIZATION_ACCEPTANCE_CASES_V1.map(item => item.id)).size).toBe(8);
    for (const item of VISUALIZATION_ACCEPTANCE_CASES_V1) {
      expect(item.question.trim().length, item.id).toBeGreaterThan(0);
      expect(item.interpretationRule.trim().length, item.id).toBeGreaterThan(0);
      expect(item.expectations.length, item.id).toBeGreaterThan(0);
    }
    const serialized = JSON.stringify(VISUALIZATION_ACCEPTANCE_CASES_V1);
    expect(serialized).not.toContain('renderer');
    expect(serialized).not.toContain('chartType');
  });
  it('evaluates every expected pattern result through the deterministic suitability gate', () => {
    for (const item of VISUALIZATION_ACCEPTANCE_CASES_V1) {
      for (const expectation of item.expectations) {
        const result = evaluateVisualizationSuitability({
          patternId: expectation.patternId,
          ...item.suitability,
        });
        expect(result.eligible, `${item.id}:${expectation.patternId}`).toBe(expectation.eligible);
        if (expectation.requiredBlockingReason) {
          expect(result.blockingReasons, `${item.id}:${expectation.patternId}`)
            .toContain(expectation.requiredBlockingReason);
        }
      }
    }
  });

  it('keeps relationship and neutral-desirability prohibitions explicit', () => {
    const scatter = VISUALIZATION_PATTERN_BY_ID_V1.get('relationship_scatter');
    expect(scatter?.negativeRules.join(' ')).toMatch(/causation/i);
    const waste = VISUALIZATION_ACCEPTANCE_CASES_V1.find(item => item.id === 'fresh-waste-rate-ranking');
    const inventory = VISUALIZATION_ACCEPTANCE_CASES_V1.find(item => item.id === 'inventory-coverage-context');
    expect(waste?.suitability.desirability).toBe('context_dependent');
    expect(inventory?.suitability.desirability).toBe('context_dependent');
    expect(waste?.suitability.requestedColorSemantics).toBe('neutral');
    expect(inventory?.suitability.requestedColorSemantics).toBe('neutral');
  });
});
