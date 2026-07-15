import type { ColumnObservationState, EvidenceV1 } from "./semantic-candidate-contracts";

export const CONTEXTUAL_EVIDENCE_ARTIFACT_VERSION = "lightbi.contextual-evidence.v1" as const;
export const CONTEXTUAL_EVIDENCE_POLICY_VERSION = "lightbi.contextual-evidence-policy.v2" as const;
export const SEMANTIC_CONTEXT_RELATION_VERSION = "lightbi.semantic-context-relation.v1" as const;

export type EvidenceFamily = "lexical_identity" | "physical_compatibility" | "value_semantics" |
  "cardinality_role" | "sibling_context" | "structural_integrity";
export type FamilyAssessment = "supports" | "conflicts" | "mixed" | "neutral" | "unavailable";
export type EvidenceProvenanceSummaryV1 = {
  fullFileEvidenceCount: number;
  representativeEvidenceCount: number;
  representativeOnly: boolean;
};
export type EvidenceFamilyAssessmentV1 = {
  family: EvidenceFamily;
  assessment: FamilyAssessment;
  magnitude: number;
  explanationCodes: string[];
  evidenceReferences: string[];
  independentContributionCount: 0 | 1;
};
export type EvidenceConflictSummaryV1 = {
  unresolvedConflictCodes: string[];
  supportCount: number;
  conflictCount: number;
  neutralCount: number;
};
export type CandidateEvidenceProfileV1 = {
  physicalColumn: string;
  sourceColumnIndex: number;
  candidateId: string;
  originalEvidenceReferences: string[];
  supportingEvidence: EvidenceV1[];
  conflictingEvidence: EvidenceV1[];
  neutralEvidence: EvidenceV1[];
  familyAssessments: EvidenceFamilyAssessmentV1[];
  independentSupportFamilyCount: number;
  provenance: EvidenceProvenanceSummaryV1;
  conflictSummary: EvidenceConflictSummaryV1;
  structuralAndParsingLimitations: string[];
  contextRelations: ContextRelationEvidenceV1[];
};
export type ContextRelationTypeV1 = "identifier_label" | "quantity_uom" | "amount_currency" | "status_timestamp" | "origin_destination";
export type SemanticContextRelationV1 = {
  relationId: string;
  relationType: ContextRelationTypeV1;
  directionality: "bidirectional";
  supportConflictEligibility: "support_only" | "support_or_conflict";
  requiredEvidence: string[];
  forbiddenInference: string[];
  explanationCode: string;
  provenanceLimitations: string[];
};
export type ContextRelationEvidenceV1 = {
  schemaVersion: typeof SEMANTIC_CONTEXT_RELATION_VERSION;
  relationEvidenceId: string;
  relationId: string;
  relationType: ContextRelationTypeV1;
  direction: "support" | "conflict";
  candidateId: string;
  siblingColumn: string;
  siblingCandidateId: string;
  magnitude: number;
  explanationCode: string;
  provenance: "source_local_candidate_artifact";
  limitations: string[];
};
export type ContextRelationPolicyV1 = { schemaVersion: "lightbi.context-relation-policy.v1"; relations: SemanticContextRelationV1[] };
export type AggregationPolicyV1 = {
  schemaVersion: typeof CONTEXTUAL_EVIDENCE_POLICY_VERSION;
  rules: string[];
  familyOrder: EvidenceFamily[];
  withinFamilyMagnitude: "maximum_distinct_rule_strength";
};
export type AggregationLimitationV1 = { code: string; explanation: string };
export type CandidateAbsenceDebtV1 = { physicalColumn: string; candidateId: string; reasonCode: string };
export type ContextualEvidenceObservationV1 = {
  sourceColumnIndex: number;
  physicalColumn: string;
  state: ColumnObservationState;
  candidateProfiles: CandidateEvidenceProfileV1[];
  resolution: { contractAvailable: true; executed: false };
  limitations: string[];
};
export type ContextualEvidenceArtifactV1 = {
  schemaVersion: typeof CONTEXTUAL_EVIDENCE_ARTIFACT_VERSION;
  sourceId: string;
  sourceHash: { algorithm: "sha256" | "unknown"; value: string } | null;
  physicalArtifactVersion: string;
  candidateArtifactVersion: string;
  registryVersion: string;
  aggregationPolicyVersion: typeof CONTEXTUAL_EVIDENCE_POLICY_VERSION;
  aggregationPolicyHash: string;
  aggregationPolicyFingerprint: string;
  observations: ContextualEvidenceObservationV1[];
  coverage: { physicalColumnCount: number; observationCount: number; candidateProfileCount: number };
  candidateAbsenceDebt: CandidateAbsenceDebtV1[];
  resolution: { contractAvailable: true; executed: false };
  limitations: AggregationLimitationV1[];
};
