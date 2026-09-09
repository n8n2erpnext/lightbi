import { describe, expect, it } from 'vitest';
import { OFFICIAL_DOMAIN_CHART_SETS_V1, getOfficialDomainChartSet, selectOfficialDomainChartTrio } from './domain-chart-sets';
import { VISUALIZATION_PATTERN_LIBRARY_V1 } from './visualization-ontology';

describe('Gate D official domain chart priors', () => {
  it('defines presentation-only priors for exactly the six official LightBI domains', () => {
    expect(Object.keys(OFFICIAL_DOMAIN_CHART_SETS_V1).sort()).toEqual([
      'customer','finance','inventory','operations','performance','revenue',
    ]);
    for (const set of Object.values(OFFICIAL_DOMAIN_CHART_SETS_V1)) {
      expect(set.governance).toEqual({
        authority: 'presentation_advisory_only', mayAuthorizeMetric: false,
        mayAuthorizeFormula: false, mayAuthorizeJoin: false, mayBypassSuitability: false,
        inferredDomainMayBecomeOfficial: false,
      });
      expect(set.primaryPatternIds.length).toBeGreaterThan(0);
      expect(set.supportingPatternIds.length).toBeGreaterThan(0);
    }
  });

  it('does not promote an inferred/open-world domain into official support', () => {
    expect(getOfficialDomainChartSet('healthcare')).toBeNull();
    expect(getOfficialDomainChartSet('manufacturing')).toBeNull();
  });

  it('selects one primary and no more than two supporting patterns only from already-eligible data shapes', () => {
    const eligible = ['trend_line','ranking_bar','composition_donut','variance_waterfall'] as const;
    expect(selectOfficialDomainChartTrio({ domainId: 'revenue', eligiblePatternIds: eligible })).toEqual([
      'trend_line','ranking_bar','composition_donut',
    ]);
    expect(selectOfficialDomainChartTrio({ domainId: 'healthcare', eligiblePatternIds: eligible })).toEqual([]);
  });

  it('keeps the canonical library independent from official-domain count', () => {
    expect(VISUALIZATION_PATTERN_LIBRARY_V1).toHaveLength(30);
  });
});
