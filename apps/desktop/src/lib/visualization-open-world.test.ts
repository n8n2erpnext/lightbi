import { describe, expect, it } from 'vitest';
import { projectDomainVisualProfileFromAdvice } from './domain-visual-profile';
import { createGovernedVisualizationPlan } from './visualization-planner';
import type { MicroBrainPresentationAdviceV1 } from './understanding-core/micro-brain/presentation-advisor';

const advice = (families: string[]): MicroBrainPresentationAdviceV1 => ({
  brainVersion: 'test', indexVersion: 'test', authorityNotes: [],
  candidates: [{
    hit: { conceptId: 'concept.presentation_domain_healthcare', canonicalSignal: null, sparseRank: 1, denseRank: 1, fusedRank: 1, rrfScore: 1, sparseScore: 1, denseSimilarity: 1, positiveUnitIds: [], negativeUnitIds: [] },
    labels: ['healthcare'], definition: 'open-world presentation advice',
    presentation: {
      schemaVersion: 'lightbi.micro-brain.presentation-advisory.v1', advisoryKind: 'domain_profile', authority: 'advisory_only',
      analyticalIntents: ['trend','distribution'], chartFamilies: families,
      evidenceRequirements: ['source-bound observations'], constraints: ['no metric authorization'], priorities: ['trend'], abstainWhen: ['missing evidence'],
    },
  }],
});

describe('Gate D official / inferred / shape-only selection contract', () => {
  it('uses MB advice for an inferred domain without applying official-domain priors', () => {
    const profile = projectDomainVisualProfileFromAdvice('healthcare', advice(['area','box_plot']));
    expect(profile.selectionSource).toBe('inferred_domain_advice');
    expect(profile.candidateLibraryScope).toBe('canonical_30_patterns');
    expect(profile.preferredPatternIds).toEqual(['trend_area','distribution_box']);
    expect(profile.policy.mayAuthorizeMetric).toBe(false);
    expect(profile.policy.mayAuthorizeFormula).toBe(false);
    expect(profile.policy.mayAuthorizeJoin).toBe(false);
  });

  it('uses official priors only for an official domain while MB remains advisory', () => {
    const profile = projectDomainVisualProfileFromAdvice('revenue', advice(['line']));
    expect(profile.selectionSource).toBe('official_domain_prior');
    expect(profile.preferredPatternIds[0]).toBe('trend_line');
    expect(profile.policy.mayChooseRenderer).toBe(false);
  });

  it('falls back to data-shape/intent planning when no domain is available', () => {
    const plan = createGovernedVisualizationPlan({
      analyticalIntent: 'trend', availableRoles: ['ordered_time','measure'],
      cardinality: { points: 12, series: 1 }, requiredSurfaces: ['preview','persistence','dashboard'],
      domainProfile: null,
    });
    expect(plan.status).toBe('planned');
    expect(['trend_line','trend_area']).toContain(plan.patternId);
    expect(plan.governance.deterministicSuitabilityFinal).toBe(true);
  });

  it('lets inferred-domain advice rank the full library while deterministic suitability and renderer capability stay final', () => {
    const profile = projectDomainVisualProfileFromAdvice('healthcare', advice(['box_plot','histogram']));
    const plan = createGovernedVisualizationPlan({
      analyticalIntent: 'distribution', availableRoles: ['numeric_observation'],
      cardinality: { points: 200 }, requiredSurfaces: ['preview','persistence','dashboard'], domainProfile: profile,
    });
    expect(plan.status).toBe('planned');
    expect(plan.patternId).toBe('distribution_box');
    expect(plan.candidates[0]).toMatchObject({ patternId: 'distribution_box', fromDomainPrior: true, eligible: true, rendererAvailable: true });
    expect(plan.governance).toMatchObject({ mbAuthority: 'presentation_vote_within_legal_set', deterministicSuitabilityFinal: true });
  });
});
