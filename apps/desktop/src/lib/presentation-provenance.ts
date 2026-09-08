import type { DeepBAFinding } from './single-source-ba-overview';
import type { BAAnalysisAuthorityContextV1 } from './understanding-core/ba-analysis-authority-context';
import type { CanonicalAnalysisPresentationV1 } from './understanding-core/canonical-consumer-presentation-contract';

export const PRESENTATION_PROVENANCE_VERSION = 'lightbi.presentation-provenance.v1' as const;
export const EVIDENCE_INSPECTOR_MODEL_VERSION = 'lightbi.evidence-inspector-model.v1' as const;

export type PresentationSubjectKindV1 = 'claim' | 'question' | 'recommendation' | 'domain_context';

// DPR-1 public claim-basis vocabulary. These labels deliberately describe how
// a statement is supported, not how confident a retriever or model felt.
export type PresentationClaimBasisV1 =
  | 'OBSERVED'
  | 'CALCULATED'
  | 'SEMANTICALLY_RESOLVED'
  | 'DOMAIN_CONTEXT'
  | 'INFERRED'
  | 'HYPOTHESIS';

export type PresentationAuthorityClassV1 =
  | 'governed'
  | 'evidence_bound'
  | 'advisory'
  | 'hypothesis_only'
  | 'unresolved';

export type PresentationCausalStatusV1 =
  | 'descriptive'
  | 'association_only'
  | 'hypothesis'
  | 'causal_not_established'
  | 'not_applicable';

export type PresentationEvidenceKindV1 =
  | 'source_row'
  | 'source_field'
  | 'canonical'
  | 'governed'
  | 'user_confirmation'
  | 'domain_inference'
  | 'runtime'
  | 'policy'
  | 'other';

export type PresentationEvidenceReferenceV1 = {
  evidenceId: string;
  kind: PresentationEvidenceKindV1;
  provenance: string;
  references: string[];
};

export type PresentationKnowledgeReferenceV1 = {
  knowledgeId: string;
  kind: 'domain_context' | 'micro_brain_advisory';
  source: 'canonical_domain_inference' | 'micro_brain';
  references: string[];
  authority: 'context_only' | 'advisory_only';
  authorityNotes: string[];
};

export type PresentationDerivationKindV1 =
  | 'direct_observation'
  | 'governed_calculation'
  | 'semantic_resolution'
  | 'domain_context'
  | 'mixed_inference'
  | 'hypothesis'
  | 'question_projection';

export type PresentationDerivationV1 = {
  kind: PresentationDerivationKindV1;
  evidenceIds: string[];
  knowledgeIds: string[];
  policyRefs: string[];
};

export type PresentationRestrictionV1 = {
  code: string;
  reason: string;
  severity?: string;
};

export type PresentationProvenanceV1 = {
  schemaVersion: typeof PRESENTATION_PROVENANCE_VERSION;
  subject: { id: string; kind: PresentationSubjectKindV1; label: string };
  basis: PresentationClaimBasisV1[];
  authorityClass: PresentationAuthorityClassV1;
  causalStatus: PresentationCausalStatusV1;
  evidenceRefs: PresentationEvidenceReferenceV1[];
  knowledgeRefs: PresentationKnowledgeReferenceV1[];
  derivation: PresentationDerivationV1;
  limitations: string[];
  decisionUseRestrictions: PresentationRestrictionV1[];
  sourceFingerprint: string | null;
};

export type EvidenceInspectorModelV1 = {
  schemaVersion: typeof EVIDENCE_INSPECTOR_MODEL_VERSION;
  subject: PresentationProvenanceV1['subject'];
  basis: PresentationClaimBasisV1[];
  authorityClass: PresentationAuthorityClassV1;
  causalStatus: PresentationCausalStatusV1;
  evidenceGroups: Array<{ kind: PresentationEvidenceKindV1; items: PresentationEvidenceReferenceV1[] }>;
  knowledgeRefs: PresentationKnowledgeReferenceV1[];
  derivation: PresentationDerivationV1;
  limitations: string[];
  decisionUseRestrictions: PresentationRestrictionV1[];
};

function unique(values: readonly string[]): string[] {
  return [...new Set(values.map(value => String(value).trim()).filter(Boolean))].sort();
}

function uniqueBasis(values: readonly PresentationClaimBasisV1[]): PresentationClaimBasisV1[] {
  const order: PresentationClaimBasisV1[] = ['OBSERVED', 'CALCULATED', 'SEMANTICALLY_RESOLVED', 'DOMAIN_CONTEXT', 'INFERRED', 'HYPOTHESIS'];
  const present = new Set(values);
  return order.filter(item => present.has(item));
}

function evidenceKind(provenance: string): PresentationEvidenceKindV1 {
  if (provenance === 'canonical_artifact' || provenance === 'canonical_resolution') return 'canonical';
  if (provenance === 'governed_manifest' || provenance === 'governed_metric_catalog' || provenance === 'governed_preflight') return 'governed';
  if (provenance === 'governed_question_policy') return 'policy';
  if (provenance === 'user_confirmed') return 'user_confirmation';
  if (provenance.includes('runtime') || provenance === 'local_duckdb') return 'runtime';
  return 'other';
}

function authorityEvidence(context: BAAnalysisAuthorityContextV1 | null | undefined): PresentationEvidenceReferenceV1[] {
  if (!context) return [];
  const domainItems = context.domain.evidence.map((item, index) => ({
    evidenceId: `domain:${item.domainId}:${index}`,
    kind: 'domain_inference' as const,
    provenance: item.source,
    references: unique([
      ...item.canonicalSignalIds.map(id => `semantic:${id}`),
      ...item.physicalColumns.map(column => `column:${column}`),
      ...item.reasonCodes.map(code => `reason:${code}`),
    ]),
  }));
  const authorityItems = context.evidenceReferences.map((reference, index) => ({
    evidenceId: `authority:${index}`,
    kind: reference.startsWith('domain:') || reference.startsWith('semantic:') || reference.startsWith('column:')
      ? 'domain_inference' as const
      : reference.includes('runtime') || reference.startsWith('duckdb:')
        ? 'runtime' as const
        : 'canonical' as const,
    provenance: 'ba_analysis_authority_context',
    references: [reference],
  }));
  return [...domainItems, ...authorityItems];
}

function knowledgeFromAuthority(
  context: BAAnalysisAuthorityContextV1 | null | undefined,
  includeDomainContext: boolean,
): PresentationKnowledgeReferenceV1[] {
  if (!context || !includeDomainContext) return [];
  const result: PresentationKnowledgeReferenceV1[] = [];
  context.domain.evidence.forEach((item, index) => {
    const references = unique([
      `domain:${item.domainId}`,
      ...item.canonicalSignalIds.map(id => `semantic:${id}`),
      ...item.physicalColumns.map(column => `column:${column}`),
      ...item.reasonCodes.map(code => `reason:${code}`),
    ]);
    if (item.source === 'canonical_resolution' || item.source === 'mixed') {
      result.push({
        knowledgeId: `domain-context:${item.domainId}:${index}`,
        kind: 'domain_context',
        source: 'canonical_domain_inference',
        references,
        authority: 'context_only',
        authorityNotes: ['Domain context can guide interpretation but cannot authorize metrics, formulas, joins, or causal claims.'],
      });
    }
    if (item.source === 'micro_brain_relation' || item.source === 'mixed') {
      result.push({
        knowledgeId: `micro-brain-domain:${item.domainId}:${index}`,
        kind: 'micro_brain_advisory',
        source: 'micro_brain',
        references,
        authority: 'advisory_only',
        authorityNotes: [
          'Micro Brain retrieval/advisory relevance is not semantic confidence.',
          'Micro Brain does not authorize governed metrics, formulas, joins, runtime execution, decision use, or causal claims.',
        ],
      });
    }
  });
  return result;
}

const AUTHORITY_RANK: Record<PresentationAuthorityClassV1, number> = {
  unresolved: 0,
  hypothesis_only: 1,
  advisory: 1,
  evidence_bound: 2,
  governed: 3,
};

// Shared DPR planner invariant: downstream presentation may preserve or reduce
// authority, never strengthen it. Equal-rank but semantically different classes
// also preserve the upstream class rather than silently changing its meaning.
export function capPresentationAuthority(
  upstream: PresentationAuthorityClassV1,
  proposed: PresentationAuthorityClassV1,
): PresentationAuthorityClassV1 {
  if (AUTHORITY_RANK[proposed] >= AUTHORITY_RANK[upstream]) return upstream;
  return proposed;
}

export function projectDeepBAFindingProvenance(
  finding: DeepBAFinding,
  context: BAAnalysisAuthorityContextV1 | null | undefined,
  options: { usesDomainContext?: boolean } = {},
): PresentationProvenanceV1 {
  const usesDomainContext = Boolean(options.usesDomainContext);
  const knowledgeRefs = knowledgeFromAuthority(context, usesDomainContext);
  const evidenceRefs: PresentationEvidenceReferenceV1[] = [
    ...unique(finding.evidenceFields).map(field => ({
      evidenceId: `finding:${finding.id}:field:${field}`,
      kind: 'source_field' as const,
      provenance: 'deep_ba_evidence_field',
      references: [`field:${field}`],
    })),
    ...finding.evidenceRows.map(row => ({
      evidenceId: `finding:${finding.id}:row:${row.rowIndex}`,
      kind: 'source_row' as const,
      provenance: 'deep_ba_source_row',
      references: unique([`row:${row.rowIndex}`, ...Object.keys(row.values).map(field => `field:${field}`)]),
    })),
    ...authorityEvidence(context),
  ];

  const basis: PresentationClaimBasisV1[] = [];
  if (finding.evidenceFields.length || finding.evidenceRows.length) basis.push('OBSERVED');
  if (usesDomainContext && knowledgeRefs.length) basis.push('DOMAIN_CONTEXT');
  if (finding.basis === 'hypothesis' || finding.basis === 'needs_verification') basis.push('HYPOTHESIS');
  if (finding.basis === 'evidence_backed' && basis.length === 0) basis.push('OBSERVED');

  const authorityClass: PresentationAuthorityClassV1 = finding.basis === 'hypothesis' || finding.basis === 'needs_verification'
    ? 'hypothesis_only'
    : 'evidence_bound';
  const causalStatus: PresentationCausalStatusV1 = finding.basis === 'evidence_backed'
    ? 'descriptive'
    : finding.basis === 'hypothesis'
      ? 'hypothesis'
      : 'causal_not_established';
  const derivationKind: PresentationDerivationKindV1 = finding.basis === 'hypothesis' || finding.basis === 'needs_verification'
    ? 'hypothesis'
    : usesDomainContext && knowledgeRefs.length
      ? 'mixed_inference'
      : 'direct_observation';
  const decisionUseRestrictions: PresentationRestrictionV1[] = context?.decisionUseAuthorized === false
    ? [{
        code: 'decision_use_not_authorized',
        reason: 'This presentation context does not itself authorize a business decision.',
        severity: 'material',
      }]
    : [];

  return {
    schemaVersion: PRESENTATION_PROVENANCE_VERSION,
    subject: { id: finding.id, kind: 'claim', label: finding.title },
    basis: uniqueBasis(basis),
    authorityClass,
    causalStatus,
    evidenceRefs,
    knowledgeRefs,
    derivation: {
      kind: derivationKind,
      evidenceIds: unique(evidenceRefs.map(item => item.evidenceId)),
      knowledgeIds: unique(knowledgeRefs.map(item => item.knowledgeId)),
      policyRefs: [],
    },
    limitations: unique(context?.limitations ?? []),
    decisionUseRestrictions,
    sourceFingerprint: context?.sourceFingerprint ?? null,
  };
}

export function projectCanonicalQuestionProvenance(
  analysis: CanonicalAnalysisPresentationV1,
): PresentationProvenanceV1 {
  const evidenceRefs = analysis.evidence.map(item => ({
    evidenceId: item.evidenceId,
    kind: evidenceKind(item.provenance),
    provenance: item.provenance,
    references: unique(item.references),
  }));
  const hasCanonical = evidenceRefs.some(item => item.kind === 'canonical');
  const hasGovernedPolicy = evidenceRefs.some(item => item.kind === 'governed' || item.kind === 'policy');
  const basis = uniqueBasis([
    ...(hasCanonical ? ['SEMANTICALLY_RESOLVED' as const] : []),
    ...(hasGovernedPolicy ? ['INFERRED' as const] : []),
  ]);
  const policyRefs = unique(evidenceRefs
    .filter(item => item.kind === 'policy' || item.kind === 'governed')
    .flatMap(item => [item.evidenceId, ...item.references]));

  return {
    schemaVersion: PRESENTATION_PROVENANCE_VERSION,
    subject: { id: analysis.questionId, kind: 'question', label: analysis.title },
    basis: basis.length ? basis : ['INFERRED'],
    // A governed question policy establishes eligibility/answerability only;
    // it is not result, execution, decision-use, or causal authority.
    authorityClass: evidenceRefs.length ? 'evidence_bound' : 'unresolved',
    causalStatus: 'not_applicable',
    evidenceRefs,
    knowledgeRefs: [],
    derivation: {
      kind: 'question_projection',
      evidenceIds: unique(evidenceRefs.map(item => item.evidenceId)),
      knowledgeIds: [],
      policyRefs,
    },
    limitations: unique(analysis.limitations),
    decisionUseRestrictions: analysis.decisionUseRestrictions.map(item => ({ code: item.code, reason: item.reason, severity: item.severity })),
    sourceFingerprint: analysis.artifactIdentity || null,
  };
}

export function createEvidenceInspectorModel(provenance: PresentationProvenanceV1): EvidenceInspectorModelV1 {
  const order: PresentationEvidenceKindV1[] = ['source_row', 'source_field', 'governed', 'canonical', 'user_confirmation', 'domain_inference', 'runtime', 'policy', 'other'];
  const evidenceGroups = order.flatMap(kind => {
    const items = provenance.evidenceRefs.filter(item => item.kind === kind);
    return items.length ? [{ kind, items }] : [];
  });
  return {
    schemaVersion: EVIDENCE_INSPECTOR_MODEL_VERSION,
    subject: provenance.subject,
    basis: [...provenance.basis],
    authorityClass: provenance.authorityClass,
    causalStatus: provenance.causalStatus,
    evidenceGroups,
    knowledgeRefs: provenance.knowledgeRefs.map(item => ({ ...item, references: [...item.references], authorityNotes: [...item.authorityNotes] })),
    derivation: {
      ...provenance.derivation,
      evidenceIds: [...provenance.derivation.evidenceIds],
      knowledgeIds: [...provenance.derivation.knowledgeIds],
      policyRefs: [...provenance.derivation.policyRefs],
    },
    limitations: [...provenance.limitations],
    decisionUseRestrictions: provenance.decisionUseRestrictions.map(item => ({ ...item })),
  };
}
