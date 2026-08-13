import type { DatasetUnderstandingArtifactV1 } from "./profiling-contracts";
import type { SemanticResolutionArtifactV1 } from "./semantic-resolution-contracts";
import type { GrainResolutionArtifactV1 } from "./grain-resolution-contracts";
import type { RelationshipCandidateArtifactV1 } from "./relationship-candidate-contracts";
import type { RelationshipResolutionArtifactV1 } from "./relationship-resolution-contracts";
import type {
  BlockerSeverityV1,
  CapabilityIdV1,
  CapabilityReadinessStateV1,
  ReadinessDebtV1,
  ReadinessEvidenceV1,
  ReadinessLimitationV1,
  RequiredRemediationV1,
  TrustDimensionIdV1,
  UnderstandingReadinessArtifactV1,
} from "./readiness-contracts";

export const CANONICAL_RUNTIME_ENVELOPE_VERSION =
  "lightbi.canonical-runtime-envelope.v1" as const;
export const RUNTIME_ADAPTER_POLICY_VERSION =
  "lightbi.canonical-runtime-adapter-policy.v1" as const;

export type RuntimeArtifactScopeV1 = "source" | "source_pair" | "bundle";
export type RuntimeIntegrityStateV1 =
  | "valid"
  | "incomplete_input"
  | "version_mismatch"
  | "hash_mismatch"
  | "scope_mismatch"
  | "preservation_mismatch"
  | "unsupported_contract"
  | "privacy_violation"
  | "invalid_canonical_artifact";

export type RuntimeAuthorityStateV1 = {
  artifactAuthority: "canonical_shadow";
  runtimeReadAuthority: "none";
  runtimeDecisionAuthority: "none";
  operationPlanningAuthority: "none";
  operationApprovalAuthority: "none";
  operationExecutionAuthority: "none";
  userFacingNarrativeAuthority: "none";
  legacyAuthority: "unchanged";
};

export type RuntimeRestrictionCodeV1 =
  | "DO_NOT_EXECUTE_JOIN"
  | "DO_NOT_EXECUTE_APPEND"
  | "DO_NOT_EXECUTE_COMPARE"
  | "DO_NOT_EXECUTE_RECONCILIATION"
  | "DO_NOT_AGGREGATE_MEASURES"
  | "DO_NOT_ACTIVATE_DOMAIN"
  | "DO_NOT_GENERATE_DOMAIN_METRICS"
  | "DO_NOT_OVERRIDE_LEGACY_RUNTIME"
  | "SHADOW_ONLY";

export type RuntimeRestrictionV1 = {
  code: RuntimeRestrictionCodeV1;
  absolute: true;
  absenceIsPermission: false;
};
export type RuntimeBlockerViewV1 = {
  code: string;
  severity: BlockerSeverityV1;
  capabilityId: CapabilityIdV1;
  references: string[];
};
export type RuntimeRemediationViewV1 = RequiredRemediationV1 & {
  capabilityId: CapabilityIdV1;
  automaticMutation: false;
  approvalImplied: false;
};
export type RuntimeCapabilityViewV1 = {
  capabilityId: CapabilityIdV1;
  validScopes: RuntimeArtifactScopeV1[];
  state: CapabilityReadinessStateV1;
  governingRuleIds: string[];
  evidence: ReadinessEvidenceV1[];
  blockers: RuntimeBlockerViewV1[];
  limitations: ReadinessLimitationV1[];
  debt: ReadinessDebtV1[];
  remediation: RuntimeRemediationViewV1[];
  humanConfirmationRequired: boolean;
  trustDependencies: TrustDimensionIdV1[];
  presentationOnly: true;
};
export type RuntimeTrustDimensionViewV1 = {
  dimensionId: TrustDimensionIdV1;
  state: CapabilityReadinessStateV1;
  ratio: number | null;
  numerator: number | null;
  denominator: number | null;
  numeratorDefinition: string | null;
  denominatorDefinition: string | null;
  scope: RuntimeArtifactScopeV1;
  provenance: "canonical_shadow";
  exclusions: "canonical_contract";
  unknownHandling: "preserved";
  limitations: string[];
  debt: string[];
};
export type RuntimeProvenanceV1 = {
  sourceHashes: Array<{ sourceIdentity: string; hash: unknown }>;
  upstreamArtifactVersions: UnderstandingReadinessArtifactV1["upstream"];
  readinessArtifactVersion: string;
  readinessPolicyVersion: string;
  readinessPolicyHash: string;
  adapterPolicyVersion: typeof RUNTIME_ADAPTER_POLICY_VERSION;
  adapterPolicyHash: string;
};
export type CanonicalRuntimeSourceViewV1 = {
  sourceIdentity: string;
  sourceHash: unknown;
};
export type CanonicalRuntimePairViewV1 = {
  pairIdentity: string;
  memberSourceIdentities: [string, string];
  candidateScopedCardinality: true;
  selectedKeyPairId: null;
};
export type CanonicalRuntimeBundleViewV1 = {
  bundleIdentity: string;
  memberSourceIdentities: string[];
};
export type RuntimeAdapterLimitationV1 = { code: string; references: string[] };
export type RuntimeAdapterDebtV1 = { code: string; migrationGate: string };
export type RuntimeAdapterErrorV1 = {
  integrity: Exclude<RuntimeIntegrityStateV1, "valid">;
  code: string;
  safeMessage: string;
};
export type RuntimeAdapterPolicyV1 = {
  schemaVersion: typeof RUNTIME_ADAPTER_POLICY_VERSION;
  restrictions: RuntimeRestrictionCodeV1[];
  forbiddenProjection: string[];
  governanceGates: {
    readinessValidationCoverageCompleteForShadowComparison: boolean;
    readinessValidationCoverageCompleteForAuthorityMigration: boolean;
  };
};
export type CanonicalRuntimeEnvelopeV1 = {
  contractVersion: typeof CANONICAL_RUNTIME_ENVELOPE_VERSION;
  envelopeIdentity: string;
  artifactScope: RuntimeArtifactScopeV1;
  sourceView: CanonicalRuntimeSourceViewV1 | null;
  pairView: CanonicalRuntimePairViewV1 | null;
  bundleView: CanonicalRuntimeBundleViewV1 | null;
  provenance: RuntimeProvenanceV1;
  capabilities: RuntimeCapabilityViewV1[];
  trustDimensions: RuntimeTrustDimensionViewV1[];
  blockers: RuntimeBlockerViewV1[];
  limitations: RuntimeAdapterLimitationV1[];
  debt: RuntimeAdapterDebtV1[];
  remediation: RuntimeRemediationViewV1[];
  restrictions: RuntimeRestrictionV1[];
  authority: RuntimeAuthorityStateV1;
  privacy: {
    rawValuesPersisted: false;
    localPathsPersisted: false;
    boundedHashedIdentitiesOnly: true;
  };
  canonicalShadowAvailable: true;
  canonicalDecisionAuthority: false;
  canonicalOperationAuthority: false;
  legacyRuntimeAuthorityChanged: false;
  summaryPercentage: null;
  productionWiring: { executed: false };
};

export type CanonicalRuntimeSourceInputV1 = {
  scope: "source";
  physical: DatasetUnderstandingArtifactV1;
  semantic: SemanticResolutionArtifactV1;
  grain: GrainResolutionArtifactV1;
  readiness: UnderstandingReadinessArtifactV1;
};
type CanonicalRuntimeBundleBaseV1 = {
  sources: Array<Omit<CanonicalRuntimeSourceInputV1, "scope" | "readiness">>;
  relationshipCandidate: RelationshipCandidateArtifactV1;
  relationshipResolution: RelationshipResolutionArtifactV1;
  readiness: UnderstandingReadinessArtifactV1;
};
export type CanonicalRuntimeBundleInputV1 = CanonicalRuntimeBundleBaseV1 & {
  scope: "bundle";
};
export type CanonicalRuntimePairInputV1 = CanonicalRuntimeBundleBaseV1 & {
  scope: "source_pair";
  pairId: string;
};
export type CanonicalRuntimeAdapterInputV1 =
  | CanonicalRuntimeSourceInputV1
  | CanonicalRuntimeBundleInputV1
  | CanonicalRuntimePairInputV1;
export type CanonicalRuntimeAdapterResultV1 =
  | { integrity: "valid"; envelope: CanonicalRuntimeEnvelopeV1; error: null }
  | { integrity: Exclude<RuntimeIntegrityStateV1, "valid">; envelope: null; error: RuntimeAdapterErrorV1 };
