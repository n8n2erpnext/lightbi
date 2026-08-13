import type { CanonicalRuntimeEnvelopeV1, RuntimeArtifactScopeV1 } from "./canonical-runtime-contracts";
import type { CapabilityIdV1 } from "./readiness-contracts";

export const LEGACY_CANONICAL_COMPARISON_VERSION = "lightbi.legacy-canonical-comparison.v1" as const;
export const LEGACY_CANONICAL_COMPARISON_POLICY_VERSION = "lightbi.legacy-canonical-comparison-policy.v2" as const;
export type ComparisonSeverityV1 = "informational" | "caution" | "material" | "critical";
export type ComparisonDivergenceClassV1 =
  | "agreement_same_restriction" | "agreement_same_availability" | "agreement_same_uncertainty"
  | "canonical_more_conservative" | "legacy_more_conservative" | "legacy_overstates_readiness"
  | "canonical_possible_under_generation" | "legacy_missing_capability_dimension"
  | "canonical_missing_legacy_concept" | "scope_semantics_mismatch"
  | "numeric_score_not_comparable" | "authority_conflict" | "safety_conflict"
  | "blocker_mismatch" | "remediation_mismatch" | "provenance_mismatch"
  | "unsupported_comparison" | "inconclusive";
export type ComparisonDispositionV1 =
  | "no_action_information_only" | "candidate_for_future_projection_migration"
  | "candidate_for_future_authority_review" | "requires_legacy_contract_review"
  | "requires_canonical_upstream_review" | "requires_scope_review"
  | "blocked_by_missing_legacy_observation" | "blocked_by_invalid_canonical_envelope"
  | "critical_safety_migration_gate" | "inconclusive";
export type LegacyObservationV1 = {
  observationId: string;
  moduleId: string;
  outputField: string;
  available: boolean;
  deterministic: boolean;
  raw: unknown;
  numericScore: number | null;
  category: string | null;
  warnings: string[];
  blockers: string[];
  decisions: Record<string, boolean | string | number | null>;
  authority: "information" | "recommendation" | "planning" | "approval" | "execution";
  provenance: string[];
};
export type CanonicalObservationV1 = {
  envelopeIdentity: string;
  capabilities: CanonicalRuntimeEnvelopeV1["capabilities"];
  trustDimensions: CanonicalRuntimeEnvelopeV1["trustDimensions"];
  restrictions: CanonicalRuntimeEnvelopeV1["restrictions"];
  authority: CanonicalRuntimeEnvelopeV1["authority"];
};
export type ComparisonSubjectV1 = { scope: RuntimeArtifactScopeV1; sourceHashes: unknown[]; subjectIdentity: string };
export type ComparisonMappingV1 = {
  mappingId: string;
  legacyModuleId: string;
  legacyField: string;
  canonicalCapabilities: CapabilityIdV1[];
  validScopes: RuntimeArtifactScopeV1[];
  comparisonType: "directly_comparable" | "partially_comparable" | "structurally_incomparable" | "authority_only_comparable" | "unrelated";
  prerequisites: string[];
  authorityMeaning: string;
  safetyMeaning: string;
  allowedDivergences: ComparisonDivergenceClassV1[];
  prohibitedInterpretations: string[];
  rationale: string;
  version: 1;
};
export type ComparisonDivergenceV1 = { class: ComparisonDivergenceClassV1; severity: ComparisonSeverityV1; mappingId: string; evidence: string[] };
export type ComparisonResultV1 = {
  mappingIds: string[];
  comparableDimensions: string[];
  incomparableDimensions: string[];
  agreements: ComparisonDivergenceV1[];
  divergences: ComparisonDivergenceV1[];
  severity: ComparisonSeverityV1;
  limitations: string[];
  migrationImplications: string[];
  disposition: ComparisonDispositionV1;
};
export type ComparisonAuthorityBoundaryV1 = {
  legacyAuthority: LegacyObservationV1["authority"];
  canonicalAuthority: "none";
  legacyAuthorityChanged: false;
  canonicalAuthorityChanged: false;
};
export type ComparisonPolicyV1 = { schemaVersion: typeof LEGACY_CANONICAL_COMPARISON_POLICY_VERSION; mappings: ComparisonMappingV1[]; severityRules: Array<{ ruleId: string; severity: ComparisonSeverityV1 }>; forbiddenInterpretations: string[] };
export type ComparisonLimitationV1 = { code: string; references: string[] };
export type ComparisonDebtV1 = { code: string; blocksPhase5C: boolean };
export type LegacyCanonicalComparisonArtifactV1 = {
  contractVersion: typeof LEGACY_CANONICAL_COMPARISON_VERSION;
  comparisonIdentity: string;
  subject: ComparisonSubjectV1;
  legacy: LegacyObservationV1;
  canonical: CanonicalObservationV1;
  comparisonPolicyVersion: typeof LEGACY_CANONICAL_COMPARISON_POLICY_VERSION;
  comparisonPolicyHash: string;
  mappingRationale: string[];
  result: ComparisonResultV1;
  authority: ComparisonAuthorityBoundaryV1;
  limitations: ComparisonLimitationV1[];
  debt: ComparisonDebtV1[];
  comparisonExecuted: true;
  legacyAuthorityChanged: false;
  canonicalAuthorityChanged: false;
  operationApproval: { executed: false };
  productionWiring: { executed: false };
};
