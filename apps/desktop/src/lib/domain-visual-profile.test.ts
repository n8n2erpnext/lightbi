import { describe, expect, it } from 'vitest';
import {
  MB_CHART_FAMILY_TO_PATTERN_IDS_V1,
  buildDomainVisualProfile,
  projectDomainVisualProfileFromAdvice,
} from './domain-visual-profile';
import { VISUALIZATION_PATTERN_BY_ID_V1, VISUALIZATION_PATTERN_LIBRARY_V1 } from './visualization-ontology';
import { getBuiltInMicroBrainPresentationIndex } from './understanding-core/micro-brain/built-in-index';
import type { MicroBrainPresentationAdviceV1 } from './understanding-core/micro-brain/presentation-advisor';

function advice(chartFamilies: string[]): MicroBrainPresentationAdviceV1 {
  return {
    brainVersion: 'test-brain', indexVersion: 'test-index', authorityNotes: [],
    candidates: [{
      hit: {
        conceptId: 'concept.presentation_domain_sales_revenue', canonicalSignal: null,
        sparseRank: 1, denseRank: 1, fusedRank: 1, rrfScore: 1,
        sparseScore: 1, denseSimilarity: 1, positiveUnitIds: [], negativeUnitIds: [],
      },
      labels: ['sales'], definition: 'test domain profile',
      presentation: {
        schemaVersion: 'lightbi.micro-brain.presentation-advisory.v1',
        advisoryKind: 'domain_profile', authority: 'advisory_only',
        analyticalIntents: ['trend','ranking','target_attainment'], chartFamilies,
        evidenceRequirements: ['governed revenue'], constraints: ['metric authority stays upstream'],
        priorities: ['performance'], abstainWhen: ['missing revenue'],
      },
    }],
  };
}

describe('DPR-5 domain visual profile', () => {
  it('projects MB domain advice into canonical patterns without authority escalation', () => {
    const profile = projectDomainVisualProfileFromAdvice('sales_revenue', advice(['line','bar','bullet']));
    expect(profile.authority).toBe('advisory_only');
    expect(profile.analyticalIntents).toEqual(['trend','ranking','target_attainment']);
    expect(profile.preferredPatternIds).toEqual(['trend_line','ranking_bar','category_compare','target_bullet']);
    expect(profile.policy).toEqual({
      mayAuthorizeMetric: false, mayAuthorizeFormula: false, mayAuthorizeJoin: false,
      mayChooseRenderer: false, retrievalRankIsConfidence: false,
    });
    expect(JSON.stringify(profile)).not.toContain('chartType');
    expect(JSON.stringify(profile)).not.toContain('rendererFamily');
  });

  it('preserves unmapped advisory families as an explicit gap instead of fabricating a pattern', () => {
    const profile = projectDomainVisualProfileFromAdvice('test_domain', advice(['line','imaginary_chart']));
    expect(profile.preferredPatternIds).toEqual(['trend_line']);
    expect(profile.unmappedChartFamilies).toEqual(['imaginary_chart']);
  });

  it('maps every chart family currently published by the built-in MB presentation pack', () => {
    const index = getBuiltInMicroBrainPresentationIndex();
    const publishedFamilies = [...new Set(index.cards.flatMap(card => card.presentation?.chartFamilies ?? []))].sort();
    const mappedFamilies = Object.keys(MB_CHART_FAMILY_TO_PATTERN_IDS_V1).sort();
    expect(publishedFamilies).toEqual(mappedFamilies);
    for (const family of publishedFamilies) {
      const patternIds = MB_CHART_FAMILY_TO_PATTERN_IDS_V1[family];
      expect(patternIds.length, family).toBeGreaterThan(0);
      expect(patternIds.every(patternId => VISUALIZATION_PATTERN_BY_ID_V1.has(patternId)), family).toBe(true);
    }
  });

  it('covers every analytical intent currently published by MB with at least one canonical pattern', () => {
    const index = getBuiltInMicroBrainPresentationIndex();
    const publishedIntents = [...new Set(index.cards.flatMap(card => card.presentation?.analyticalIntents ?? []))].sort();
    const ontologyIntents = new Set<string>(VISUALIZATION_PATTERN_LIBRARY_V1.flatMap(pattern => pattern.intents));
    const uncovered = publishedIntents.filter(intent => !ontologyIntents.has(intent));
    expect(uncovered).toEqual([]);
  });
});
