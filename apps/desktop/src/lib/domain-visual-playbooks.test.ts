import { describe, expect, it } from 'vitest';
import {
  OFFICIAL_DOMAIN_VISUAL_PLAYBOOKS_V2,
  getOfficialDomainVisualPlaybook,
  matchOfficialDomainCombinationRecipe,
  officialDomainVisualPatternOrder,
} from './domain-visual-playbooks';

describe('Official domain visual playbooks V2', () => {
  it('covers exactly the six official domains without promoting inferred domains', () => {
    expect(Object.keys(OFFICIAL_DOMAIN_VISUAL_PLAYBOOKS_V2).sort()).toEqual([
      'customer','finance','inventory','operations','performance','revenue',
    ]);
    expect(getOfficialDomainVisualPlaybook('healthcare')).toBeNull();
    expect(getOfficialDomainVisualPlaybook('manufacturing')).toBeNull();
  });

  it('keeps every domain playbook presentation-advisory only', () => {
    for (const playbook of Object.values(OFFICIAL_DOMAIN_VISUAL_PLAYBOOKS_V2)) {
      expect(playbook.governance).toEqual(expect.objectContaining({
        authority: 'presentation_advisory_only',
        mayAuthorizeMetric: false, mayAuthorizeFormula: false, mayAuthorizeJoin: false,
        mayBypassSuitability: false, mayForceAdditionalVisuals: false,
      }));
    }
  });
  it('encodes domain-characteristic pattern priorities instead of a generic chart trio', () => {
    expect(officialDomainVisualPatternOrder('inventory', 'aging').slice(0, 3)).toEqual([
      'distribution_histogram','distribution_box','composition_stack',
    ]);
    expect(officialDomainVisualPatternOrder('performance', 'target_attainment').slice(0, 3)).toEqual([
      'target_combo','target_bullet','kpi_summary',
    ]);
    expect(officialDomainVisualPatternOrder('operations', 'quality_control').slice(0, 3)).toEqual([
      'process_control','matrix_heatmap','distribution_box',
    ]);
  });

  it('recognizes researched same-grain combination opportunities without granting execution authority', () => {
    expect(matchOfficialDomainCombinationRecipe({
      domainId: 'operations', primaryText: 'delivery count by carrier', companionText: 'downtime minutes by carrier',
    })?.id).toBe('operations-volume-delay-shared-grain');
    expect(matchOfficialDomainCombinationRecipe({
      domainId: 'finance', primaryText: 'revenue by month', companionText: 'COGS by month',
    })?.id).toBe('finance-revenue-cost-shared-grain');
    expect(matchOfficialDomainCombinationRecipe({
      domainId: 'customer', primaryText: 'revenue by customer', companionText: 'stock quantity by warehouse',
    })).toBeNull();
  });
});
