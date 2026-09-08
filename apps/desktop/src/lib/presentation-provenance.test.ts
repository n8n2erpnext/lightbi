import { describe, expect, it } from 'vitest';
import {
  capPresentationAuthority,
  createEvidenceInspectorModel,
  projectCanonicalQuestionProvenance,
  projectDeepBAFindingProvenance,
} from './presentation-provenance';

const inferredDomainAuthority = {
  schemaVersion: 'lightbi.ba-analysis-authority-context.v1', artifactIdentity: 'artifact:1', datasetStateIdentity: 'state:1', sourceFingerprint: 'source:sha',
  domain: { primaryDomain: 'retail', primaryDomainSource: 'micro_brain_relation', officialSupport: { packId: 'commerce_distribution_mvp', state: 'unsupported', productionActive: false }, analysisMode: 'evidence_bound_inferred_domain', semanticConcepts: { confirmed: 0, probable: 2, microBrainRecovered: 2, ambiguous: 0, unknown: 0, unresolved: 0 }, evidenceConflicts: 0, evidence: [{ domainId: 'retail', source: 'micro_brain_relation', canonicalSignalIds: ['revenue'], physicalColumns: ['Revenue'], reasonCodes: ['mb_relation'] }] },
  authorization: { metric: null, formula: { state: 'not_independently_authorized', decisionUseAuthorized: false, reason: 'No independent formula authority.' } },
  limitations: ['Official domain support is not active.'], evidenceReferences: ['artifact:1', 'domain:retail'], decisionUseAuthorized: false,
} as const;

describe('DPR-1 presentation provenance', () => {
  it('keeps an observed Deep BA claim descriptive and does not attach unused MB context', () => {
    const provenance = projectDeepBAFindingProvenance({
      id: 'where_0', title: 'Largest contribution', statement: 'A leads the observed group.', confidence: 'medium', basis: 'evidence_backed',
      evidenceFields: ['Store', 'Revenue'], evidenceRows: [{ rowIndex: 4, label: 'Row 5', values: { Store: 'A', Revenue: 100 } }],
    }, inferredDomainAuthority);
    expect(provenance.authorityClass).toBe('evidence_bound');
    expect(provenance.causalStatus).toBe('descriptive');
    expect(provenance.basis).toEqual(['OBSERVED']);
    expect(provenance.knowledgeRefs).toEqual([]);
    expect(provenance.derivation.kind).toBe('direct_observation');
    expect(provenance.evidenceRefs.find(item => item.kind === 'source_row')?.references).not.toContain('100');
  });

  it('discloses MB domain knowledge only when the claim derivation actually uses domain context', () => {
    const provenance = projectDeepBAFindingProvenance({
      id: 'why_0', title: 'Margin bridge', statement: 'Compare components before attributing cause.', confidence: 'high', basis: 'hypothesis',
      evidenceFields: ['Revenue', 'Cost'], evidenceRows: [{ rowIndex: 0, label: 'Row 1', values: { Revenue: 100, Cost: 70 } }],
    }, inferredDomainAuthority, { usesDomainContext: true });
    expect(provenance.authorityClass).toBe('hypothesis_only');
    expect(provenance.causalStatus).toBe('hypothesis');
    expect(provenance.basis).toEqual(['OBSERVED', 'DOMAIN_CONTEXT', 'HYPOTHESIS']);
    expect(provenance.knowledgeRefs).toHaveLength(1);
    expect(provenance.knowledgeRefs[0]?.kind).toBe('micro_brain_advisory');
    expect(provenance.knowledgeRefs[0]).not.toHaveProperty('score');
    expect(provenance.knowledgeRefs[0]?.authorityNotes.join(' ')).toContain('does not authorize');
    expect(provenance.derivation.kind).toBe('hypothesis');
    expect(provenance.decisionUseRestrictions.map(item => item.code)).toContain('decision_use_not_authorized');
  });

  it('projects governed question evidence without converting question policy into result authority', () => {
    const provenance = projectCanonicalQuestionProvenance({
      itemId: 'q:1', questionId: 'q:1', actionCandidateId: 'a:1', metricId: 'sales_revenue', title: 'Which products contribute the most sales revenue?', description: 'Rank governed revenue by product.',
      state: 'ready', m1State: 'ready', m2State: 'ready', m3State: 'ready', executionReadiness: 'executable', primaryBlocker: null, secondaryBlockers: [], limitations: ['No causal inference.'], remediationOperations: [], physicalColumns: ['Product', 'Revenue'], canonicalSignals: ['product', 'revenue'], sourceId: 'source:1', sheetOrTable: 'Sales',
      evidence: [{ evidenceId: 'metric:sales_revenue', references: ['metric:sales_revenue:v1'], provenance: 'governed_metric_catalog' }, { evidenceId: 'question:q:1', references: ['policy:q:1'], provenance: 'governed_question_policy' }],
      decisionUseRestrictions: [{ code: 'causality_claim', reason: 'Ranking does not establish causality.', severity: 'material' }], artifactIdentity: 'artifact:1', overlayIdentity: null, advertisedAsDefault: true, rank: 1,
    });
    expect(provenance.subject.kind).toBe('question');
    expect(provenance.authorityClass).toBe('evidence_bound');
    expect(provenance.causalStatus).toBe('not_applicable');
    expect(provenance.basis).toContain('INFERRED');
    expect(provenance.derivation.kind).toBe('question_projection');
    expect(provenance.derivation.policyRefs).toEqual(expect.arrayContaining(['metric:sales_revenue', 'policy:q:1']));
    expect(provenance.decisionUseRestrictions).toEqual([{ code: 'causality_claim', reason: 'Ranking does not establish causality.', severity: 'material' }]);
    expect(provenance.limitations).toContain('No causal inference.');
  });

  it('caps downstream presentation authority so planners can preserve or reduce but never strengthen it', () => {
    expect(capPresentationAuthority('evidence_bound', 'governed')).toBe('evidence_bound');
    expect(capPresentationAuthority('hypothesis_only', 'evidence_bound')).toBe('hypothesis_only');
    expect(capPresentationAuthority('evidence_bound', 'advisory')).toBe('advisory');
    expect(capPresentationAuthority('advisory', 'hypothesis_only')).toBe('advisory');
  });

  it('groups evidence deterministically and preserves derivation and knowledge references', () => {
    const provenance = projectDeepBAFindingProvenance({
      id: 'finding', title: 'Observed result', statement: 'Observed.', confidence: 'high', basis: 'evidence_backed', evidenceFields: ['Revenue'], evidenceRows: [],
    }, null);
    const model = createEvidenceInspectorModel(provenance);
    expect(model.evidenceGroups.map(group => group.kind)).toEqual(['source_field']);
    expect(model.subject.id).toBe('finding');
    expect(model.causalStatus).toBe('descriptive');
    expect(model.derivation.kind).toBe('direct_observation');
    expect(model.knowledgeRefs).toEqual([]);
  });
});
