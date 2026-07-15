import crypto from "node:crypto";
import {
  CANONICAL_RUNTIME_ENVELOPE_VERSION,
  type CanonicalRuntimeAdapterInputV1,
  type CanonicalRuntimeAdapterResultV1,
  type CanonicalRuntimeEnvelopeV1,
  type CanonicalRuntimeSourceInputV1,
  type RuntimeArtifactScopeV1,
  type RuntimeBlockerViewV1,
  type RuntimeCapabilityViewV1,
  type RuntimeIntegrityStateV1,
  type RuntimeRemediationViewV1,
} from "./canonical-runtime-contracts";
import {
  RUNTIME_ADAPTER_POLICY,
  runtimeAdapterPolicyHash,
} from "./canonical-runtime-adapter-policy";
import {
  DATASET_UNDERSTANDING_ARTIFACT_SCHEMA_VERSION,
} from "./profiling-contracts";
import {
  SEMANTIC_RESOLUTION_ARTIFACT_VERSION,
} from "./semantic-resolution-contracts";
import { semanticResolutionPolicyHash } from "./semantic-resolution-policy";
import { GRAIN_RESOLUTION_ARTIFACT_VERSION } from "./grain-resolution-contracts";
import { grainResolutionPolicyHash } from "./grain-resolution-policy";
import { RELATIONSHIP_CANDIDATE_ARTIFACT_VERSION } from "./relationship-candidate-contracts";
import { relationshipPolicyHash } from "./relationship-candidate-policy";
import { RELATIONSHIP_RESOLUTION_ARTIFACT_VERSION } from "./relationship-resolution-contracts";
import { relationshipResolutionPolicyHash } from "./relationship-resolution-policy";
import {
  READINESS_ARTIFACT_VERSION,
  type CapabilityIdV1,
} from "./readiness-contracts";
import { readinessPolicyHash } from "./readiness-policy";
import { CAPABILITY_SCOPE_MATRIX } from "./readiness-validation";

const PAIR_CAPABILITIES = new Set<CapabilityIdV1>([
  "relationship_discovery_ready",
  "key_pair_assessment_ready",
  "extract_cardinality_observation_ready",
  "schema_comparison_ready",
  "temporal_alignment_ready",
  "join_planning_ready",
  "append_planning_ready",
  "comparison_planning_ready",
  "reconciliation_planning_ready",
  "join_execution_ready",
  "append_execution_ready",
]);
const SEVERITY_ORDER = {
  informational: 0,
  caution: 1,
  material: 2,
  critical: 3,
} as const;

function stable(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  return `{${Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`)
    .join(",")}}`;
}
const digest = (value: unknown) =>
  crypto.createHash("sha256").update(stable(value)).digest("hex");
const safeIdentity = (value: string) => `sha256:${digest(value)}`;
const same = (left: unknown, right: unknown) => stable(left) === stable(right);
const uniqStable = <T>(values: T[]): T[] => {
  const seen = new Set<string>();
  return values.filter((value) => {
    const identity = stable(value);
    if (seen.has(identity)) return false;
    seen.add(identity);
    return true;
  });
};
const fail = (
  integrity: Exclude<RuntimeIntegrityStateV1, "valid">,
  code: string,
): CanonicalRuntimeAdapterResultV1 => ({
  integrity,
  envelope: null,
  error: { integrity, code, safeMessage: "Canonical adapter input rejected." },
});

function containsSensitiveProjection(input: CanonicalRuntimeAdapterInputV1): boolean {
  return input.readiness.requiredRemediation.some((entry) =>
    Object.values(entry.parameters).some(
      (value) =>
        typeof value === "string" &&
        (value.length > 128 || /(^|[\\/])(?:home|users?|tmp|var)[\\/]/i.test(value)),
    ),
  );
}

function dedupeBlockers(
  blockers: CanonicalRuntimeAdapterInputV1["readiness"]["blockers"],
): RuntimeBlockerViewV1[] {
  const byIdentity = new Map<string, RuntimeBlockerViewV1>();
  for (const blocker of blockers) {
    const identity = `${blocker.capabilityId}|${blocker.code}`;
    const current = byIdentity.get(identity);
    if (!current || SEVERITY_ORDER[blocker.severity] > SEVERITY_ORDER[current.severity]) {
      byIdentity.set(identity, {
        ...blocker,
        references: [...new Set(blocker.references)].sort(),
      });
    }
  }
  return [...byIdentity.values()].sort((left, right) =>
    `${left.capabilityId}|${left.code}`.localeCompare(`${right.capabilityId}|${right.code}`),
  );
}

function validateSourceChain(
  source: Pick<CanonicalRuntimeSourceInputV1, "physical" | "semantic" | "grain">,
): CanonicalRuntimeAdapterResultV1 | null {
  if (
    source.physical.schemaVersion !== DATASET_UNDERSTANDING_ARTIFACT_SCHEMA_VERSION ||
    source.semantic.schemaVersion !== SEMANTIC_RESOLUTION_ARTIFACT_VERSION ||
    source.grain.schemaVersion !== GRAIN_RESOLUTION_ARTIFACT_VERSION
  ) return fail("version_mismatch", "ADAPTER_UPSTREAM_VERSION_MISMATCH");
  const sourceId = source.physical.sourceProfile.source.sourceId;
  const sourceHash = source.physical.sourceProfile.source.hash ?? null;
  if (source.semantic.sourceId !== sourceId || source.grain.sourceId !== sourceId)
    return fail("scope_mismatch", "ADAPTER_SOURCE_IDENTITY_MISMATCH");
  if (!same(source.semantic.sourceHash, sourceHash) || !same(source.grain.sourceHash, sourceHash))
    return fail("hash_mismatch", "ADAPTER_SOURCE_HASH_MISMATCH");
  if (
    source.semantic.resolutionPolicyHash !== semanticResolutionPolicyHash() ||
    source.grain.resolutionPolicyHash !== grainResolutionPolicyHash()
  ) return fail("hash_mismatch", "ADAPTER_UPSTREAM_POLICY_HASH_MISMATCH");
  if (source.semantic.productionWiring.executed || source.grain.productionWiring.executed)
    return fail("invalid_canonical_artifact", "ADAPTER_UPSTREAM_AUTHORITY_LEAK");
  return null;
}

function validate(input: CanonicalRuntimeAdapterInputV1): CanonicalRuntimeAdapterResultV1 | null {
  if (input.scope === "source" && !input.physical) return fail("incomplete_input", "ADAPTER_PHYSICAL_MISSING");
  if (!input.readiness) return fail("incomplete_input", "ADAPTER_READINESS_MISSING");
  if (input.readiness.schemaVersion !== READINESS_ARTIFACT_VERSION)
    return fail("version_mismatch", "ADAPTER_READINESS_VERSION_MISMATCH");
  if (input.readiness.readinessPolicyHash !== readinessPolicyHash())
    return fail("hash_mismatch", "ADAPTER_READINESS_POLICY_HASH_MISMATCH");
  if (
    input.readiness.operationApproval.executed ||
    input.readiness.operationExecution.executed ||
    input.readiness.productionWiring.executed
  ) return fail("invalid_canonical_artifact", "ADAPTER_READINESS_AUTHORITY_LEAK");
  if (input.readiness.capabilities.length !== 34)
    return fail("preservation_mismatch", "ADAPTER_CAPABILITY_COVERAGE_MISMATCH");
  if (input.readiness.trustDimensions.length !== 12)
    return fail("preservation_mismatch", "ADAPTER_TRUST_COVERAGE_MISMATCH");
  if (containsSensitiveProjection(input)) return fail("privacy_violation", "ADAPTER_SENSITIVE_PARAMETER");

  const sources = input.scope === "source" ? [input] : input.sources;
  if (!sources.length) return fail("incomplete_input", "ADAPTER_SOURCE_CHAIN_MISSING");
  const sourceIds = sources.map((source) => source.physical.sourceProfile.source.sourceId);
  if (new Set(sourceIds).size !== sourceIds.length)
    return fail("scope_mismatch", "ADAPTER_DUPLICATE_BUNDLE_MEMBER");
  for (const source of sources) {
    const error = validateSourceChain(source);
    if (error) return error;
  }
  if (!same([...sourceIds].sort(), [...input.readiness.identity.sourceIds].sort()))
    return fail("scope_mismatch", "ADAPTER_READINESS_SOURCE_CHAIN_MISMATCH");

  if (input.scope === "source") {
    if (input.readiness.scope !== "source" || input.readiness.identity.id !== sourceIds[0])
      return fail("scope_mismatch", "ADAPTER_SOURCE_READINESS_SCOPE_MISMATCH");
  } else {
    if (!input.relationshipCandidate || !input.relationshipResolution)
      return fail("incomplete_input", "ADAPTER_RELATIONSHIP_CHAIN_MISSING");
    if (
      input.relationshipCandidate.schemaVersion !== RELATIONSHIP_CANDIDATE_ARTIFACT_VERSION ||
      input.relationshipResolution.schemaVersion !== RELATIONSHIP_RESOLUTION_ARTIFACT_VERSION
    ) return fail("version_mismatch", "ADAPTER_RELATIONSHIP_VERSION_MISMATCH");
    if (
      input.relationshipCandidate.relationshipPolicyHash !== relationshipPolicyHash() ||
      input.relationshipResolution.resolutionPolicyHash !== relationshipResolutionPolicyHash()
    ) return fail("hash_mismatch", "ADAPTER_RELATIONSHIP_POLICY_HASH_MISMATCH");
    if (input.readiness.scope !== "bundle")
      return fail("scope_mismatch", "ADAPTER_BUNDLE_READINESS_SCOPE_MISMATCH");
    if (!same([...sourceIds].sort(), [...input.relationshipCandidate.bundle.memberSourceIds].sort()))
      return fail("scope_mismatch", "ADAPTER_BUNDLE_MEMBERSHIP_MISMATCH");
    if (input.scope === "source_pair") {
      const pair = input.relationshipResolution.pairs.find((entry) => entry.pairId === input.pairId);
      if (!pair || !sourceIds.includes(pair.leftSourceId) || !sourceIds.includes(pair.rightSourceId))
        return fail("scope_mismatch", "ADAPTER_PAIR_OUTSIDE_BUNDLE");
    }
  }
  return null;
}

export function buildCanonicalRuntimeEnvelopeForTest(
  input: CanonicalRuntimeAdapterInputV1,
): CanonicalRuntimeAdapterResultV1 {
  const invalid = validate(input);
  if (invalid) return invalid;

  const scope: RuntimeArtifactScopeV1 = input.scope;
  const sourceIds = input.scope === "source"
    ? [input.physical.sourceProfile.source.sourceId]
    : input.sources.map((source) => source.physical.sourceProfile.source.sourceId).sort();
  const sourceHashes = input.readiness.identity.sourceHashes
    .map((entry) => ({ sourceIdentity: safeIdentity(entry.sourceId), hash: entry.hash }))
    .sort((left, right) => left.sourceIdentity.localeCompare(right.sourceIdentity));
  const canonicalCapabilities = input.scope === "source_pair"
    ? input.readiness.capabilities.filter((entry) => PAIR_CAPABILITIES.has(entry.capabilityId))
    : input.readiness.capabilities;
  const capabilities: RuntimeCapabilityViewV1[] = canonicalCapabilities
    .map((capability): RuntimeCapabilityViewV1 => {
      const matrix = CAPABILITY_SCOPE_MATRIX.find(
        (entry) => entry.capabilityId === capability.capabilityId,
      )!;
      const validScopes: RuntimeArtifactScopeV1[] = [
        ...(matrix.sourceLocal ? ["source" as const] : []),
        ...(matrix.sourcePair ? ["source_pair" as const] : []),
        ...(matrix.bundle ? ["bundle" as const] : []),
      ];
      return {
        capabilityId: capability.capabilityId,
        validScopes,
        state: capability.state,
        governingRuleIds: [...capability.governingRuleIds].sort(),
        evidence: uniqStable(capability.supportingEvidence).sort((a, b) => a.evidenceId.localeCompare(b.evidenceId)),
        blockers: dedupeBlockers(capability.blockers),
        limitations: uniqStable(capability.limitations),
        debt: uniqStable(capability.debt),
        remediation: uniqStable(capability.requiredRemediation).map((entry): RuntimeRemediationViewV1 => ({
          ...entry,
          capabilityId: capability.capabilityId,
          automaticMutation: false,
          approvalImplied: false,
        })),
        humanConfirmationRequired: capability.humanConfirmationRequired,
        trustDependencies: input.readiness.trustDimensions
          .filter((dimension) => dimension.state === capability.state)
          .map((dimension) => dimension.dimensionId)
          .sort(),
        presentationOnly: true,
      };
    })
    .sort((left, right) => left.capabilityId.localeCompare(right.capabilityId));
  const blockers = dedupeBlockers(canonicalCapabilities.flatMap((entry) => entry.blockers));
  const remediation = capabilities.flatMap((entry) => entry.remediation);
  const pair = input.scope === "source_pair"
    ? input.relationshipResolution.pairs.find((entry) => entry.pairId === input.pairId)!
    : null;
  const envelopeWithoutIdentity = {
    contractVersion: CANONICAL_RUNTIME_ENVELOPE_VERSION,
    artifactScope: scope,
    sourceView: input.scope === "source" ? {
      sourceIdentity: safeIdentity(sourceIds[0]),
      sourceHash: input.readiness.identity.sourceHashes[0]?.hash ?? null,
    } : null,
    pairView: pair ? {
      pairIdentity: safeIdentity(pair.pairId),
      memberSourceIdentities: [safeIdentity(pair.leftSourceId), safeIdentity(pair.rightSourceId)]
        .sort() as [string, string],
      candidateScopedCardinality: true as const,
      selectedKeyPairId: null,
    } : null,
    bundleView: input.scope === "bundle" ? {
      bundleIdentity: safeIdentity(input.relationshipCandidate.bundle.bundleId),
      memberSourceIdentities: sourceIds.map(safeIdentity).sort(),
    } : null,
    provenance: {
      sourceHashes,
      upstreamArtifactVersions: input.readiness.upstream,
      readinessArtifactVersion: input.readiness.schemaVersion,
      readinessPolicyVersion: input.readiness.readinessPolicyVersion,
      readinessPolicyHash: input.readiness.readinessPolicyHash,
      adapterPolicyVersion: RUNTIME_ADAPTER_POLICY.schemaVersion,
      adapterPolicyHash: runtimeAdapterPolicyHash(),
    },
    capabilities,
    trustDimensions: input.readiness.trustDimensions.map((dimension) => ({
      dimensionId: dimension.dimensionId,
      state: dimension.state,
      ratio: dimension.measurableRatio?.ratio ?? null,
      numerator: dimension.measurableRatio?.numerator ?? null,
      denominator: dimension.measurableRatio?.denominator ?? null,
      numeratorDefinition: dimension.measurableRatio?.meaning ?? null,
      denominatorDefinition: dimension.measurableRatio?.meaning ?? null,
      scope,
      provenance: "canonical_shadow" as const,
      exclusions: "canonical_contract" as const,
      unknownHandling: "preserved" as const,
      limitations: [...dimension.limitationCodes],
      debt: [...dimension.debtCodes],
    })).sort((left, right) => left.dimensionId.localeCompare(right.dimensionId)),
    blockers,
    limitations: input.readiness.limitations.map((entry) => ({
      code: entry.code,
      references: [...entry.references],
    })),
    debt: [
      {
        code: "phase_4c2_counterfactual_executable_coverage_incomplete",
        migrationGate: "authority_migration_blocked",
      },
    ],
    remediation,
    restrictions: RUNTIME_ADAPTER_POLICY.restrictions.map((code) => ({
      code,
      absolute: true as const,
      absenceIsPermission: false as const,
    })),
    authority: {
      artifactAuthority: "canonical_shadow" as const,
      runtimeReadAuthority: "none" as const,
      runtimeDecisionAuthority: "none" as const,
      operationPlanningAuthority: "none" as const,
      operationApprovalAuthority: "none" as const,
      operationExecutionAuthority: "none" as const,
      userFacingNarrativeAuthority: "none" as const,
      legacyAuthority: "unchanged" as const,
    },
    privacy: {
      rawValuesPersisted: false as const,
      localPathsPersisted: false as const,
      boundedHashedIdentitiesOnly: true as const,
    },
    canonicalShadowAvailable: true as const,
    canonicalDecisionAuthority: false as const,
    canonicalOperationAuthority: false as const,
    legacyRuntimeAuthorityChanged: false as const,
    summaryPercentage: null,
    productionWiring: { executed: false as const },
  };
  const envelope: CanonicalRuntimeEnvelopeV1 = {
    ...envelopeWithoutIdentity,
    envelopeIdentity: `sha256:${digest(envelopeWithoutIdentity)}`,
  };
  return { integrity: "valid", envelope, error: null };
}

export function buildRestrictionFirstViewForTest(
  envelope: CanonicalRuntimeEnvelopeV1,
  capabilityId: CapabilityIdV1,
) {
  const capability = envelope.capabilities.find((entry) => entry.capabilityId === capabilityId);
  if (!capability) return null;
  return {
    requestedCapability: capabilityId,
    canonicalState: capability.state,
    blockers: capability.blockers.filter((entry) =>
      entry.severity === "critical" || entry.severity === "material"),
    remediation: capability.remediation,
    authority: envelope.authority,
    prohibitedActions: envelope.restrictions.map((entry) => entry.code),
  };
}
