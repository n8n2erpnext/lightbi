import type { CandidateEvidenceProfileV1 } from "./contextual-evidence-contracts";
import type { ColumnObservationState, EvidenceV1 } from "./semantic-candidate-contracts";

export const SEMANTIC_RESOLUTION_ARTIFACT_VERSION = "lightbi.semantic-resolution-shadow.v1" as const;
export const SEMANTIC_RESOLUTION_POLICY_VERSION = "lightbi.semantic-resolution-policy.v2" as const;

export type SemanticResolutionState = "confirmed" | "probable" | "ambiguous" | "unknown" | "technical" | "unsupported_input";
export type CandidateDisposition = "selected" | "viable" | "insufficient_evidence" | "materially_conflicted" | "dominated" | "correlated_evidence_only" | "candidate_absent";
export type LexicalEvidenceClass = "canonical_id_exact" | "canonical_label_exact" | "alias_exact" | "header_alias_exact" | "token_containment" | "value_only" | "none";
export type EvidenceDependencyKind = "independent" | "same_header_surface" | "same_representative_sample" | "lexical_sibling_reuse" | "mutual_sibling_support" | "shared_collision_surface" | "duplicate_physical_fact" | "repeated_relation_class";

export type EvidenceIndependenceAssessmentV1 = {
  independentEvidenceReferences: string[];
  correlatedEvidence: Array<{ evidenceReference: string; dependency: EvidenceDependencyKind; dependsOn: string[] }>;
  independentSupportFamilies: string[];
  independentContextFamilies: string[];
};
export type CandidateDominanceAssessmentV1 = {
  dominatedBy: string | null;
  dominates: string[];
  comparable: boolean;
  ruleIds: string[];
};
export type CandidateResolutionTraceV1 = {
  candidateId: string;
  disposition: CandidateDisposition;
  lexicalClass: LexicalEvidenceClass;
  completeEvidenceProfile: CandidateEvidenceProfileV1;
  independence: EvidenceIndependenceAssessmentV1;
  dominance: CandidateDominanceAssessmentV1;
  materialConflictCodes: string[];
  ruleIds: string[];
  evidenceReferences: string[];
  limitations: string[];
};
export type ResolutionLimitationV1 = { code: string; severity: "info" | "material"; explanation: string; evidenceReferences: string[] };
export type ResolutionDebtV1 = { physicalColumn: string; candidateId: string; reasonCode: string; effect: "forces_unknown" | "blocks_confirmation" | "forces_ambiguity" };
export type ColumnSemanticResolutionV1 = {
  sourceColumnIndex: number;
  physicalColumn: string;
  inputState: ColumnObservationState;
  finalState: SemanticResolutionState;
  selectedCandidateId: string | null;
  candidateTraces: CandidateResolutionTraceV1[];
  columnEvidence: EvidenceV1[];
  ruleIds: string[];
  limitations: ResolutionLimitationV1[];
  debt: ResolutionDebtV1[];
};
export type ResolutionRuleV1 = { ruleId: string; description: string; outcome: SemanticResolutionState | CandidateDisposition | "governance" };
export type ResolutionPolicyV1 = {
  schemaVersion: typeof SEMANTIC_RESOLUTION_POLICY_VERSION;
  rules: ResolutionRuleV1[];
  lexicalOrder: LexicalEvidenceClass[];
  materialStructuralIssues: string[];
  forbiddenInference: string[];
};
export type SemanticResolutionArtifactV1 = {
  schemaVersion: typeof SEMANTIC_RESOLUTION_ARTIFACT_VERSION;
  sourceId: string;
  sourceHash: { algorithm: "sha256" | "unknown"; value: string } | null;
  physicalArtifactVersion: string;
  candidateArtifactVersion: string;
  contextualEvidenceArtifactVersion: string;
  registryVersion: string;
  aggregationPolicyVersion: string;
  aggregationPolicyHash: string;
  resolutionPolicyVersion: typeof SEMANTIC_RESOLUTION_POLICY_VERSION;
  resolutionPolicyHash: string;
  columns: ColumnSemanticResolutionV1[];
  coverage: { physicalColumnCount: number; resolvedColumnCount: number; preservedCandidateCount: number; stateCounts: Record<SemanticResolutionState, number> };
  candidatePreservationProof: { inputCandidateCount: number; outputCandidateTraceCount: number; orderPreserved: true; evidenceProfilesPreserved: true };
  candidateAbsenceDebt: ResolutionDebtV1[];
  limitations: ResolutionLimitationV1[];
  productionWiring: { executed: false };
};
