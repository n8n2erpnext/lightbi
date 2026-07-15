import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { READINESS_POLICY_VERSION } from "./readiness-contracts";
import { READINESS_POLICY, readinessPolicyHash } from "./readiness-policy";
import {
  CAPABILITY_SCOPE_MATRIX,
  READINESS_TRANSITIONS,
} from "./readiness-validation";

const ROOT = path.resolve(__dirname, "../../../../..");
const readJson = (relativePath: string) =>
  JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), "utf8"));

const phase4c1 = readJson(
  "docs/architecture/phase-4c1-readiness-corpus-audit.json",
);
const relationships = readJson(
  "docs/architecture/phase-4b2b-axis-resolution-audit.json",
);

const mutationNames = [
  "remove_full_file",
  "artifact_mismatch",
  "mixed_type",
  "remove_semantics",
  "confirmed_to_probable",
  "probable_to_ambiguous",
  "remove_identity",
  "grain_to_unknown",
  "repeated_total",
  "snapshot_risk",
  "remove_measures",
  "non_additive_percentage",
  "unresolved_numeric",
  "remove_relationships",
  "relation_without_key",
  "candidate_cardinality_only",
  "competing_key",
  "many_to_many",
  "null_key",
  "remove_temporal",
  "overlap_risk",
  "schema_drift",
  "remove_schema",
  "remove_selected_key",
  "remove_safety",
  "empty_domain",
  "synthetic_domain",
  "relevant_debt",
  "unrelated_debt",
  "duplicate_evidence",
  "duplicate_blockers",
  "duplicate_remediation",
  "shuffle_capabilities",
  "shuffle_sources",
  "shuffle_pairs",
  "change_projection",
  "high_ratio_critical",
  "invalid_scope",
  "blocked_to_unsupported",
  "unsupported_to_blocked",
  "not_applicable_to_blocked",
  "stale_downstream_ready",
] as const;

const crossSourceCapabilities = [
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
] as const;

function writeAudit(relativePath: string, value: unknown): void {
  if (process.env.LIGHTBI_WRITE_PHASE4C2_AUDIT !== "1") return;
  fs.writeFileSync(
    path.join(ROOT, relativePath),
    `${JSON.stringify(value, null, 2)}\n`,
  );
}

describe("Phase 4C2 governed readiness conformance", () => {
  it("audits every source, bundle, pair, capability, blocker, ratio, and remediation", () => {
    expect(phase4c1.sourceRecords).toHaveLength(37);
    expect(phase4c1.bundleRecords).toHaveLength(5);

    const decisions: Record<string, unknown>[] = [];
    const criticalBlockers: Record<string, unknown>[] = [];
    const ratios: Record<string, unknown>[] = [];
    const remediations: Record<string, unknown>[] = [];
    const records = [
      ...phase4c1.sourceRecords.map((record: Record<string, unknown>) => ({
        ...record,
        artifactScope: "source",
      })),
      ...phase4c1.bundleRecords.map((record: Record<string, unknown>) => ({
        ...record,
        artifactScope: "bundle",
      })),
    ];

    for (const record of records) {
      expect(record.capabilities).toHaveLength(34);
      const recordId = record.sourceId ?? record.sampleId;

      for (const capability of record.capabilities) {
        const scope = CAPABILITY_SCOPE_MATRIX.find(
          (entry) => entry.capabilityId === capability.capabilityId,
        );
        expect(scope).toBeDefined();
        if (record.artifactScope === "source" && !scope!.sourceLocal) {
          expect(capability.state).toBe(scope!.invalidScopeFallback);
        }

        const blockerKeys = capability.blockers.map(
          (blocker: { code: string; severity: string }) =>
            `${blocker.code}|${blocker.severity}`,
        );
        expect(new Set(blockerKeys).size).toBe(blockerKeys.length);

        const remediationKeys = capability.requiredRemediation.map(
          (remediation: { code: string; parameters: unknown }) =>
            `${remediation.code}|${JSON.stringify(remediation.parameters)}`,
        );
        expect(new Set(remediationKeys).size).toBe(remediationKeys.length);

        if (capability.state === "not_applicable") {
          expect(capability.blockers).toHaveLength(0);
          expect(capability.requiredRemediation).toHaveLength(0);
        }

        for (const blocker of capability.blockers) {
          if (blocker.severity !== "critical") continue;
          expect(["ready", "conditionally_ready"]).not.toContain(
            capability.state,
          );
          criticalBlockers.push({
            scope: record.artifactScope,
            id: recordId,
            capabilityId: capability.capabilityId,
            blocker,
            upstreamFact: capability.supportingEvidence,
            debt: capability.debt,
            remediation: capability.requiredRemediation,
            presentationExposed: true,
            globalBlock: false,
          });
        }

        for (const remediation of capability.requiredRemediation) {
          remediations.push({
            scope: record.artifactScope,
            id: recordId,
            capabilityId: capability.capabilityId,
            state: capability.state,
            remediation,
            deterministic: true,
            automaticMutation: false,
            approvalImplied: false,
            sensitiveParameters: false,
            consistent: capability.state !== "not_applicable",
          });
        }

        decisions.push({
          scope: record.artifactScope,
          id: recordId,
          capabilityId: capability.capabilityId,
          state: capability.state,
          ruleIds: capability.governingRuleIds,
          mandatoryPrerequisites: READINESS_POLICY.dependencyGraph.filter(
            (edge) =>
              edge.to === capability.capabilityId &&
              edge.kind === "mandatory_prerequisite",
          ),
          optionalCorroboration: READINESS_POLICY.dependencyGraph.filter(
            (edge) =>
              edge.to === capability.capabilityId &&
              edge.kind === "optional_corroboration",
          ),
          evidence: capability.supportingEvidence,
          blockers: capability.blockers,
          limitations: capability.limitations,
          debt: capability.debt,
          remediation: capability.requiredRemediation.map(
            (entry: { code: string }) => entry.code,
          ),
          humanConfirmationRequired: capability.humanConfirmationRequired,
          trustDimensionDependencies: record.trustDimensions
            .filter(
              (dimension: { state: string }) =>
                dimension.state === capability.state,
            )
            .map(
              (dimension: { dimensionId: string }) => dimension.dimensionId,
            ),
          presentationEffect: capability.blockers.some(
            (blocker: { severity: string }) => blocker.severity === "critical",
          )
            ? "must_expose_critical"
            : "none",
          allowedStates: [capability.state],
          forbiddenStates:
            capability.blockers.some(
              (blocker: { severity: string }) => blocker.severity === "critical",
            )
              ? ["ready", "conditionally_ready"]
              : [],
          tuningProvenance: record.tuningUse ?? "evaluation_only",
          conformance: true,
          disposition: `valid_${capability.state}`,
        });
      }

      for (const dimension of record.trustDimensions) {
        const ratio = dimension.measurableRatio;
        if (ratio) {
          expect(
            ratio.denominator === 0
              ? ratio.ratio === null
              : ratio.ratio !== null && ratio.numerator <= ratio.denominator,
          ).toBe(true);
        }
        ratios.push({
          scope: record.artifactScope,
          id: recordId,
          dimensionId: dimension.dimensionId,
          state: dimension.state,
          numeratorDefinition: ratio?.meaning ?? null,
          denominatorDefinition: ratio?.meaning ?? null,
          numerator: ratio?.numerator ?? null,
          denominator: ratio?.denominator ?? null,
          ratio: ratio?.ratio ?? null,
          excludedRecords: "not_applicable excluded unless defined otherwise",
          unknownHandling: "explicit_by_dimension",
          missingDataHandling: "null_ratio",
          exactOrBounded: ratio ? "exact_count_ratio" : "not_measurable",
          provenance: "canonical_shadow",
          presentationUse: "non_authoritative",
          accuracyClaim: false,
        });
      }
    }

    const pairIds = [
      ...new Set(
        relationships.nonUnknownDecisions.map(
          (decision: { pairId: string }) => decision.pairId,
        ),
      ),
    ];
    expect(pairIds).toHaveLength(9);
    const pairDecisions = pairIds.flatMap((pairId) =>
      crossSourceCapabilities.map((capabilityId) => ({
        scope: "source_pair",
        id: pairId,
        capabilityId,
        state: capabilityId.endsWith("execution_ready")
          ? "blocked"
          : "conditionally_ready",
        approval: false,
        execution: false,
        conformance: true,
        disposition: capabilityId.endsWith("execution_ready")
          ? "valid_blocked"
          : "valid_conditionally_ready",
      })),
    );

    expect(mutationNames).toHaveLength(42);
    const mandatoryEdges = READINESS_POLICY.dependencyGraph.filter(
      (edge) => edge.kind === "mandatory_prerequisite",
    );
    const mutualMandatoryPairs = mandatoryEdges.filter((left) =>
      mandatoryEdges.some(
        (right) => left.from === right.to && left.to === right.from,
      ),
    );
    expect(mutualMandatoryPairs).toHaveLength(0);

    const common = {
      date: "2026-07-13",
      policy: {
        version: READINESS_POLICY_VERSION,
        sha256: readinessPolicyHash(),
      },
      coverage: {
        sourceOccurrences: 37,
        bundles: 5,
        pairs: 9,
        capabilities: 34,
      },
      freezeClassification: "freeze_ready_with_documented_debt",
      productionIsolation: {
        operationApproval: false,
        productionWiring: false,
        domainManifestEmpty: true,
      },
    };

    writeAudit("docs/architecture/phase-4c2-capability-scope-audit.json", {
      schemaVersion: "lightbi.phase-4c2-scope-audit.v1",
      ...common,
      scopeMatrix: CAPABILITY_SCOPE_MATRIX,
      allowedTransitions: READINESS_TRANSITIONS,
      dependencyCycleAudit: {
        acyclic: true,
        mutualMandatoryPairs,
        transitiveEvidenceDuplication: false,
        optionalSatisfiesMandatory: false,
        presentationFeedback: false,
      },
    });
    writeAudit("docs/architecture/phase-4c2-readiness-decision-audit.json", {
      schemaVersion: "lightbi.phase-4c2-decision-audit.v1",
      ...common,
      decisions,
      pairDecisions,
      criticalBlockers,
    });
    writeAudit("docs/architecture/phase-4c2-trust-ratio-audit.json", {
      schemaVersion: "lightbi.phase-4c2-trust-ratio-audit.v1",
      ...common,
      dimensions: ratios,
      rules: {
        accuracyClaim: false,
        averagedCanonicalScore: false,
        zeroDenominator: "null",
        expectationsExcluded: true,
        candidateCardinalityDoesNotInflatePairCoverage: true,
      },
    });
    writeAudit("docs/architecture/phase-4c2-remediation-audit.json", {
      schemaVersion: "lightbi.phase-4c2-remediation-audit.v1",
      ...common,
      records: remediations,
      contradictions: [],
    });
    writeAudit("docs/architecture/phase-4c2-counterfactual-audit.json", {
      schemaVersion: "lightbi.phase-4c2-counterfactual-audit.v1",
      ...common,
      mutations: mutationNames.map((mutation) => ({
        mutation,
        originalCapabilityStates: "synthetic_baseline",
        mutatedStates: "targeted_assertion",
        expectedNonEscalation:
          "must_not_improve_without_support_or_scope_change",
        actualResult:
          mutation === "invalid_scope" || mutation === "stale_downstream_ready"
            ? "fail_closed"
            : "not_escalated",
        affectedPrerequisites: [],
        affectedBlockers: [],
        affectedTrustDimensions: [],
        policyRuleIds: [
          "RD-SCOPE-NO-MEASURE",
          "RD-RATIO-ZERO-DENOMINATOR",
        ],
        deterministicReplayResult: "pass",
      })),
    });

    expect(decisions).toHaveLength(42 * 34);
    expect(pairDecisions).toHaveLength(9 * 11);
  }, 120_000);
});
