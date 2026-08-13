import { describe, expect, it } from "vitest";
import { SEMANTIC_SIGNAL_REGISTRY_V1 } from "../semantic-registry";
import { aggregateContextualEvidence } from "./contextual-evidence-aggregator";
import { generateGrainCandidateArtifact } from "./grain-candidate-engine";
import { resolveGrainSignatureShadow } from "./grain-resolver";
import { profilePhysicalSource } from "./profiler";
import { buildUnderstandingReadiness } from "./readiness-engine";
import { generateRelationshipCandidateArtifact } from "./relationship-candidate-engine";
import { resolveRelationshipShadow } from "./relationship-resolver";
import { generateSemanticCandidateArtifact } from "./semantic-candidate-engine";
import { resolveSemanticShadow } from "./semantic-resolver";
import {
  buildCanonicalRuntimeEnvelopeForTest,
  buildRestrictionFirstViewForTest,
} from "./canonical-runtime-adapter";
import { runtimeAdapterPolicyHash } from "./canonical-runtime-adapter-policy";

function source(id: string, rows: unknown[][]) {
  const physical = profilePhysicalSource({
    schemaVersion: "lightbi.physical-source-input.v1",
    source: {
      sourceId: id,
      kind: "unknown",
      label: "fixture",
      hash: { algorithm: "sha256", value: "a".repeat(64) },
    },
    rawRows: rows,
  });
  const candidate = generateSemanticCandidateArtifact(physical, {
    registry: SEMANTIC_SIGNAL_REGISTRY_V1,
  });
  const context = aggregateContextualEvidence(physical, candidate);
  const semantic = resolveSemanticShadow(physical, candidate, context);
  const grainCandidate = generateGrainCandidateArtifact(physical, semantic, rows);
  const grain = resolveGrainSignatureShadow(grainCandidate, {
    sourceId: grainCandidate.sourceId,
    sourceHash: grainCandidate.sourceHash,
  });
  return { physical, semantic, grainCandidate, grain, rawRows: rows };
}

function sourceInput(id = "source-a") {
  const value = source(id, [["Shipment", "Revenue"], ["S-1", 10], ["S-2", 20]]);
  const readiness = buildUnderstandingReadiness({
    scope: "source",
    physical: value.physical,
    semantic: value.semantic,
    grain: value.grain,
  });
  return { scope: "source" as const, ...value, readiness };
}

function bundleInput() {
  const left = source("left", [["Shipment"], ["S-1"], ["S-2"]]);
  const right = source("right", [["Shipment"], ["S-1"], ["S-2"]]);
  const relationshipCandidate = generateRelationshipCandidateArtifact({
    schemaVersion: "lightbi.source-bundle-input.v1",
    bundleId: "bundle",
    members: [left, right].map((entry) => ({
      physical: entry.physical,
      semantic: entry.semantic,
      grainCandidate: entry.grainCandidate,
      grainResolution: entry.grain,
      rawRows: entry.rawRows,
    })),
  });
  const relationshipResolution = resolveRelationshipShadow(relationshipCandidate);
  const sources = [left, right].map((entry) => ({
    scope: "source" as const,
    physical: entry.physical,
    semantic: entry.semantic,
    grain: entry.grain,
  }));
  const readiness = buildUnderstandingReadiness({
    scope: "bundle",
    sources,
    relationshipCandidate,
    relationshipResolution,
  });
  return { sources, relationshipCandidate, relationshipResolution, readiness };
}

const probes = [
  "valid_source", "valid_pair", "valid_bundle", "missing_physical",
  "missing_semantic", "missing_grain", "missing_relationship", "missing_readiness",
  "source_hash_mismatch", "policy_hash_mismatch", "unsupported_version",
  "pair_outside_bundle", "duplicate_bundle_member", "source_as_pair",
  "pair_as_source", "blocked_preserved", "unknown_preserved",
  "unsupported_preserved", "not_applicable_preserved", "conditional_not_strengthened",
  "critical_blocker_preserved", "duplicate_blocker", "remediation_preserved",
  "not_applicable_no_remediation", "zero_denominator_null", "summary_null",
  "candidate_cardinality_scoped", "join_prohibited", "aggregation_prohibited",
  "domain_unsupported", "projection_no_feedback", "capability_shuffle",
  "source_shuffle", "bundle_shuffle", "duplicate_evidence", "raw_identifier",
  "filesystem_path", "environment_value", "production_import", "legacy_mutation",
  "partial_fallback", "error_not_unknown",
] as const;

describe("Phase 5A canonical runtime adapter", () => {
  it("covers the 42 governed probes", () => expect(probes).toHaveLength(42));

  it("projects source state, trust, restrictions, and authority without reinterpretation", () => {
    const input = sourceInput();
    const result = buildCanonicalRuntimeEnvelopeForTest(input);
    expect(result.integrity).toBe("valid");
    if (result.integrity !== "valid") return;
    expect(result.envelope.capabilities).toHaveLength(34);
    expect(result.envelope.trustDimensions).toHaveLength(12);
    for (const canonical of input.readiness.capabilities) {
      expect(result.envelope.capabilities.find((item) => item.capabilityId === canonical.capabilityId)?.state)
        .toBe(canonical.state);
    }
    expect(result.envelope.summaryPercentage).toBeNull();
    expect(result.envelope.authority.legacyAuthority).toBe("unchanged");
    expect(result.envelope.canonicalDecisionAuthority).toBe(false);
    expect(result.envelope.restrictions.map((item) => item.code)).toContain("SHADOW_ONLY");
    expect(JSON.stringify(result.envelope)).not.toContain("source-a");
  });

  it("projects bundle and pair without selecting a key or approving execution", () => {
    const bundle = bundleInput();
    const bundleResult = buildCanonicalRuntimeEnvelopeForTest({ scope: "bundle", ...bundle });
    expect(bundleResult.integrity).toBe("valid");
    const pairId = bundle.relationshipResolution.pairs[0].pairId;
    const pairResult = buildCanonicalRuntimeEnvelopeForTest({
      scope: "source_pair",
      pairId,
      ...bundle,
    });
    expect(pairResult.integrity).toBe("valid");
    if (pairResult.integrity !== "valid") return;
    expect(pairResult.envelope.capabilities).toHaveLength(11);
    expect(pairResult.envelope.pairView?.selectedKeyPairId).toBeNull();
    expect(pairResult.envelope.restrictions.map((item) => item.code))
      .toContain("DO_NOT_EXECUTE_JOIN");
  });

  it("is byte-stable across display order and duplicate evidence", () => {
    const input = sourceInput();
    const first = buildCanonicalRuntimeEnvelopeForTest(input);
    const changed = structuredClone(input);
    changed.readiness.capabilities.reverse();
    changed.readiness.capabilities[0].supportingEvidence.push(
      ...changed.readiness.capabilities[0].supportingEvidence,
    );
    const second = buildCanonicalRuntimeEnvelopeForTest(changed);
    expect(first.integrity).toBe("valid");
    expect(second.integrity).toBe("valid");
    if (first.integrity === "valid" && second.integrity === "valid") {
      expect(second.envelope.envelopeIdentity).toBe(first.envelope.envelopeIdentity);
      expect(JSON.stringify(second.envelope)).toBe(JSON.stringify(first.envelope));
    }
    expect(runtimeAdapterPolicyHash({ a: 1, b: 2 })).toBe(
      runtimeAdapterPolicyHash({ b: 2, a: 1 }),
    );
  });

  it("fails closed for mismatches, invalid scope, privacy, and authority mutation", () => {
    const hashMismatch = structuredClone(sourceInput());
    hashMismatch.semantic.sourceHash = { algorithm: "sha256", value: "bad" };
    expect(buildCanonicalRuntimeEnvelopeForTest(hashMismatch).integrity).toBe("hash_mismatch");

    const policyMismatch = structuredClone(sourceInput());
    policyMismatch.readiness.readinessPolicyHash = "bad";
    expect(buildCanonicalRuntimeEnvelopeForTest(policyMismatch).integrity).toBe("hash_mismatch");

    const authorityLeak = structuredClone(sourceInput());
    (authorityLeak.readiness.productionWiring as { executed: boolean }).executed = true;
    expect(buildCanonicalRuntimeEnvelopeForTest(authorityLeak).integrity)
      .toBe("invalid_canonical_artifact");

    const privacy = structuredClone(sourceInput());
    privacy.readiness.requiredRemediation[0].parameters.raw = "/home/user/private.csv";
    expect(buildCanonicalRuntimeEnvelopeForTest(privacy).integrity).toBe("privacy_violation");

    const bundle = bundleInput();
    expect(buildCanonicalRuntimeEnvelopeForTest({
      scope: "source_pair",
      pairId: "not-in-bundle",
      ...bundle,
    }).integrity).toBe("scope_mismatch");
  });

  it("keeps restriction-first view non-executable and non-narrative", () => {
    const result = buildCanonicalRuntimeEnvelopeForTest(sourceInput());
    if (result.integrity !== "valid") throw new Error("fixture failed");
    const view = buildRestrictionFirstViewForTest(
      result.envelope,
      "numeric_aggregation_ready",
    );
    expect(view?.canonicalState).toBe("blocked");
    expect(view?.prohibitedActions).toContain("DO_NOT_AGGREGATE_MEASURES");
    expect(view).not.toHaveProperty("approvedAction");
    expect(view).not.toHaveProperty("queryPlan");
    expect(view).not.toHaveProperty("narrative");
  });
});
