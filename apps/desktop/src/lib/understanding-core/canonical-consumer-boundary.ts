import { SEMANTIC_SIGNAL_REGISTRY_V1 } from "../semantic-registry";
import { activateCommerceDistributionDomain } from "./commerce-distribution-domain-pack";
import { questionActionPolicyHash } from "./commerce-distribution-question-policy";
import { aggregateContextualEvidence } from "./contextual-evidence-aggregator";
import { deterministicPolicySha256 } from "./contextual-evidence-policy";
import type { CanonicalMetricSourceV1, DomainActivationArtifactV1, GovernedMetricPreflightV1 } from "./governed-domain-metric-contracts";
import { preflightGovernedMetrics } from "./governed-metric-preflight";
import { governedMetricPolicyHash } from "./governed-metric-policy";
import { planGovernedMetricQuery, type GovernedMetricQueryPlanningResultV1 } from "./governed-metric-query-planner";
import type { GovernedActionCandidateV1, QuestionActionGenerationV1 } from "./governed-question-action-contracts";
import { generateGovernedCommerceQuestionsAndActions } from "./governed-question-action-generator";
import type { GovernedRuntimePreflightV1 } from "./governed-runtime-contracts";
import { preflightGovernedRuntimeAction } from "./governed-runtime-preflight";
import { governedRuntimePolicyHash } from "./governed-runtime-policy";
import { generateGrainCandidateArtifact } from "./grain-candidate-engine";
import { resolveGrainSignatureShadow } from "./grain-resolver";
import { profilePhysicalSource } from "./profiler";
import { buildUnderstandingReadiness } from "./readiness-engine";
import { generateSemanticCandidateArtifact } from "./semantic-candidate-engine";
import { resolveSemanticShadow } from "./semantic-resolver";

export const CANONICAL_CONSUMER_ARTIFACT_VERSION = "lightbi.canonical-consumer-artifact.v1" as const;

export type CanonicalDatasetStateInputV1 = {
  datasetId: string;
  sourceKind: "local_file" | "online_file" | "database_table" | "api_response" | "unknown";
  sourceLabel: string;
  columns: string[];
  rows: Record<string, unknown>[];
  sourceRowCount: number;
  stateQualifier?: string;
  path?: string;
  sheet?: string;
};

type BuildProvenanceV1 = {
  datasetStateIdentity: string;
  sourceFingerprint: string;
  buildOrdinal: number;
  cacheStatus: "built";
  legacyDetectorInvoked: false;
};

export type CanonicalConsumerArtifactV1 = {
  schemaVersion: typeof CANONICAL_CONSUMER_ARTIFACT_VERSION;
  status: "valid";
  identity: string;
  datasetStateIdentity: string;
  sourceFingerprint: string;
  canonicalSource: CanonicalMetricSourceV1;
  domainActivation: DomainActivationArtifactV1;
  metricPreflight: GovernedMetricPreflightV1;
  questionGeneration: QuestionActionGenerationV1;
  blockers: string[];
  caveats: string[];
  provenance: BuildProvenanceV1;
  decisionUseAuthorized: false;
};

export type InvalidCanonicalConsumerArtifactV1 = {
  schemaVersion: typeof CANONICAL_CONSUMER_ARTIFACT_VERSION;
  status: "invalid";
  identity: string;
  datasetStateIdentity: string;
  sourceFingerprint: string;
  blockers: string[];
  caveats: string[];
  provenance: BuildProvenanceV1;
  decisionUseAuthorized: false;
};

export type CanonicalConsumerBuildResultV1 = CanonicalConsumerArtifactV1 | InvalidCanonicalConsumerArtifactV1;

export type CanonicalInvestigationHandoffV1 = {
  schemaVersion: "lightbi.canonical-investigation-handoff.v1";
  artifactIdentity: string;
  datasetStateIdentity: string;
  actionCandidate: GovernedActionCandidateV1 | null;
  runtimePreflight: GovernedRuntimePreflightV1;
  queryPlanning: GovernedMetricQueryPlanningResultV1;
  blockers: string[];
  decisionUseAuthorized: false;
};

const cache = new Map<string, CanonicalConsumerBuildResultV1>();
let buildOrdinal = 0;

function normalizeRow(row: Record<string, unknown>, columns: readonly string[]): unknown[] {
  return columns.map((column) => row[column] ?? null);
}

function inputFingerprint(input: CanonicalDatasetStateInputV1): string {
  return deterministicPolicySha256({
    datasetId: input.datasetId,
    sourceKind: input.sourceKind,
    sourceLabel: input.sourceLabel,
    columns: input.columns,
    rows: input.rows,
    sourceRowCount: input.sourceRowCount,
    stateQualifier: input.stateQualifier ?? null,
    path: input.path ?? null,
    sheet: input.sheet ?? null,
  });
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort();
}

function invalidArtifact(input: CanonicalDatasetStateInputV1, fingerprint: string, blockers: string[]): InvalidCanonicalConsumerArtifactV1 {
  const datasetStateIdentity = `dataset-state:${fingerprint}`;
  return {
    schemaVersion: CANONICAL_CONSUMER_ARTIFACT_VERSION,
    status: "invalid",
    identity: `canonical-consumer:${deterministicPolicySha256({ datasetStateIdentity, blockers })}`,
    datasetStateIdentity,
    sourceFingerprint: fingerprint,
    blockers: unique(blockers),
    caveats: ["Canonical consumer build failed closed; no question or execution authority is available."],
    provenance: { datasetStateIdentity, sourceFingerprint: fingerprint, buildOrdinal: ++buildOrdinal, cacheStatus: "built", legacyDetectorInvoked: false },
    decisionUseAuthorized: false,
  };
}

function validateInput(input: CanonicalDatasetStateInputV1): string[] {
  const blockers: string[] = [];
  if (!input.datasetId.trim()) blockers.push("dataset_identity_required");
  if (input.columns.length === 0) blockers.push("physical_columns_required");
  if (new Set(input.columns).size !== input.columns.length) blockers.push("duplicate_physical_columns_not_safe_for_object_rows");
  if (input.rows.length === 0) blockers.push("full_file_rows_required");
  if (input.sourceRowCount !== input.rows.length) blockers.push("full_file_row_coverage_required");
  return blockers;
}

function buildArtifact(input: CanonicalDatasetStateInputV1, fingerprint: string): CanonicalConsumerBuildResultV1 {
  const inputBlockers = validateInput(input);
  if (inputBlockers.length) return invalidArtifact(input, fingerprint, inputBlockers);

  const datasetStateIdentity = `dataset-state:${fingerprint}`;
  try {
    const rawRows = [input.columns, ...input.rows.map((row) => normalizeRow(row, input.columns))];
    const sourceId = `${input.datasetId}:${fingerprint}`;
    const physical = profilePhysicalSource({
      schemaVersion: "lightbi.physical-source-input.v1",
      source: {
        sourceId,
        kind: input.sourceKind,
        label: input.sourceLabel,
        path: input.path,
        sheet: input.sheet,
        hash: { algorithm: "sha256", value: fingerprint },
      },
      rawRows,
    });
    if (physical.sourceProfile.dataRegion.rowCount !== input.sourceRowCount || physical.sourceProfile.header.selectedHeaderRowIndex !== 0) {
      return invalidArtifact(input, fingerprint, ["canonical_physical_profile_does_not_match_dataset_state"]);
    }
    const candidates = generateSemanticCandidateArtifact(physical, { registry: SEMANTIC_SIGNAL_REGISTRY_V1 });
    const semantic = resolveSemanticShadow(physical, candidates, aggregateContextualEvidence(physical, candidates));
    const grainCandidates = generateGrainCandidateArtifact(physical, semantic, rawRows);
    const grain = resolveGrainSignatureShadow(grainCandidates, { sourceId: grainCandidates.sourceId, sourceHash: grainCandidates.sourceHash });
    const readiness = buildUnderstandingReadiness({ scope: "source", physical, semantic, grain });
    const canonicalSource: CanonicalMetricSourceV1 = { physical, semantic, grain, readiness };
    const evaluationContext = { group: "production", tuningUse: "forbidden" } as const;
    const domainActivation = activateCommerceDistributionDomain({ schemaVersion: "lightbi.domain-activation-input.v1", sources: [canonicalSource], evaluationContext });
    const metricPreflight = preflightGovernedMetrics({
      schemaVersion: "lightbi.governed-metric-preflight-input.v1",
      sources: [canonicalSource],
      evaluationContext,
      expectedPolicyHash: governedMetricPolicyHash(),
    });
    const questionGeneration = generateGovernedCommerceQuestionsAndActions({
      schemaVersion: "lightbi.question-action-generation-input.v1",
      canonicalSource,
      domainActivation,
      metricPreflight,
      expectedQuestionPolicyHash: questionActionPolicyHash(),
    });
    const blockers = unique([
      ...domainActivation.blockers.map((item) => item.code),
      ...metricPreflight.blockers.map((item) => item.code),
      ...questionGeneration.blockers.map((item) => item.code),
    ]);
    const caveats = unique([
      ...physical.limitations,
      ...semantic.limitations.map((item) => item.code),
      ...grain.limitations.map((item) => item.code),
      ...readiness.limitations.map((item) => item.code),
      ...domainActivation.limitations.map((item) => item.code),
      ...metricPreflight.limitations.map((item) => item.code),
      ...questionGeneration.limitations.map((item) => item.code),
    ]);
    const identity = `canonical-consumer:${deterministicPolicySha256({ datasetStateIdentity, sourceId, domainActivation: domainActivation.identity, metricPreflight: metricPreflight.identity, questions: questionGeneration.identity })}`;
    return {
      schemaVersion: CANONICAL_CONSUMER_ARTIFACT_VERSION,
      status: "valid",
      identity,
      datasetStateIdentity,
      sourceFingerprint: fingerprint,
      canonicalSource,
      domainActivation,
      metricPreflight,
      questionGeneration,
      blockers,
      caveats,
      provenance: { datasetStateIdentity, sourceFingerprint: fingerprint, buildOrdinal: ++buildOrdinal, cacheStatus: "built", legacyDetectorInvoked: false },
      decisionUseAuthorized: false,
    };
  } catch (error) {
    return invalidArtifact(input, fingerprint, [`canonical_build_error:${error instanceof Error ? error.message : String(error)}`]);
  }
}

export function getOrBuildCanonicalConsumerArtifact(input: CanonicalDatasetStateInputV1): CanonicalConsumerBuildResultV1 {
  const fingerprint = inputFingerprint(input);
  const identity = `dataset-state:${fingerprint}`;
  const retained = cache.get(identity);
  if (retained) return retained;
  const artifact = buildArtifact(input, fingerprint);
  cache.set(identity, artifact);
  return artifact;
}

export function prepareCanonicalInvestigationHandoff(artifact: CanonicalConsumerBuildResultV1, actionCandidateId: string): CanonicalInvestigationHandoffV1 {
  if (artifact.status !== "valid") {
    const runtimePreflight: GovernedRuntimePreflightV1 = {
      schemaVersion: "lightbi.governed-runtime-preflight.v1",
      identity: deterministicPolicySha256({ artifactIdentity: artifact.identity, blockers: artifact.blockers }),
      state: "invalid",
      domainPackId: "commerce_distribution_mvp",
      sourceReference: `invalid:${artifact.sourceFingerprint}`,
      actionCandidateId: null,
      metricId: null,
      metricVersion: null,
      runtimePolicyHash: governedRuntimePolicyHash(),
      metricPolicyHash: governedMetricPolicyHash(),
      questionPolicyHash: questionActionPolicyHash(),
      planningAllowed: false,
      executionAllowed: false,
      action: null,
      blockers: artifact.blockers.map((code) => ({ code, severity: "critical", source: "integrity", references: [artifact.identity] })),
      restrictions: [{ code: "DECISION_USE_PROHIBITED", severity: "critical", reason: "Invalid canonical artifacts cannot authorize execution or decision use.", references: [artifact.identity], decisionUseBlocked: true }],
      evidence: [],
      runtimeActionCreated: false,
      runtimeActionAuthorized: false,
      executionPerformed: false,
      decisionUseAuthorized: false,
      productionWiring: { executed: false },
    };
    return { schemaVersion: "lightbi.canonical-investigation-handoff.v1", artifactIdentity: artifact.identity, datasetStateIdentity: artifact.datasetStateIdentity, actionCandidate: null, runtimePreflight, queryPlanning: { state: "blocked", plan: null, blockers: artifact.blockers }, blockers: artifact.blockers, decisionUseAuthorized: false };
  }
  const actionCandidate = artifact.questionGeneration.actionCandidates.find((item) => item.actionCandidateId === actionCandidateId) ?? null;
  const runtimePreflight = preflightGovernedRuntimeAction({
    schemaVersion: "lightbi.governed-runtime-preflight-input.v1",
    canonicalSource: artifact.canonicalSource,
    metricPreflight: artifact.metricPreflight,
    questionGeneration: artifact.questionGeneration,
    actionCandidate,
    expectedRuntimePolicyHash: governedRuntimePolicyHash(),
  });
  const queryPlanning = planGovernedMetricQuery(runtimePreflight);
  const blockers = unique([...runtimePreflight.blockers.map((item) => item.code), ...(queryPlanning.state === "blocked" ? queryPlanning.blockers : [])]);
  return { schemaVersion: "lightbi.canonical-investigation-handoff.v1", artifactIdentity: artifact.identity, datasetStateIdentity: artifact.datasetStateIdentity, actionCandidate, runtimePreflight, queryPlanning, blockers, decisionUseAuthorized: false };
}

export function canonicalConsumerCacheStats(): { buildCount: number; datasetStateCount: number } {
  return { buildCount: buildOrdinal, datasetStateCount: cache.size };
}

export function resetCanonicalConsumerCacheForTests(): void {
  cache.clear();
  buildOrdinal = 0;
}
