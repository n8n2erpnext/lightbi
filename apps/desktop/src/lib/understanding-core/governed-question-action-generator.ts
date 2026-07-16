import { COMMERCE_DISTRIBUTION_QUESTION_POLICY_V1, questionActionPolicyHash } from "./commerce-distribution-question-policy";
import { canonicalJson, deterministicPolicySha256 } from "./contextual-evidence-policy";
import { GOVERNED_DOMAIN_SUPPORT_MANIFEST_V1 } from "./domain-support-manifest";
import type { CanonicalMetricSourceV1, GovernedMetricPreflightItemV1, GovernedMetricStateV1 } from "./governed-domain-metric-contracts";
import type {
  GovernedActionCandidateV1,
  GovernedDimensionBindingV1,
  GovernedQuestionCandidateV1,
  GovernedTimeBasisV1,
  QuestionActionBlockerV1,
  QuestionActionEvidenceV1,
  QuestionActionGenerationInputV1,
  QuestionActionGenerationV1,
  QuestionActionLimitationV1,
  QuestionFamilyPolicyV1,
} from "./governed-question-action-contracts";
import { GOVERNED_METRIC_DEFINITIONS_V1, governedMetricPolicyHash } from "./governed-metric-policy";
import type { GovernedRuntimePreflightInputV1 } from "./governed-runtime-contracts";
import { preflightGovernedRuntimeAction } from "./governed-runtime-preflight";
import { governedRuntimePolicyHash } from "./governed-runtime-policy";
import { inventorySnapshotEvidenceMatchesSource } from "./canonical-source-evidence";

const MANIFEST = GOVERNED_DOMAIN_SUPPORT_MANIFEST_V1[0];
const USABLE_SEMANTIC_STATES = new Set(["confirmed", "probable"]);
const ADVERTISABLE_STATES = new Set<GovernedMetricStateV1>(["ready", "conditionally_ready"]);
const STATE_ORDER: Record<GovernedMetricStateV1, number> = {
  ready: 0,
  conditionally_ready: 1,
  blocked: 2,
  unknown: 3,
  unsupported: 4,
  not_applicable: 5,
};

function unique(items: readonly string[]): string[] { return [...new Set(items)].sort(); }
function sourceReference(source: CanonicalMetricSourceV1): string {
  const hash = source.physical.provenance.sourceHash;
  return `source:${hash?.algorithm === "sha256" ? hash.value : deterministicPolicySha256(source.physical.provenance.sourceId)}`;
}
function blocker(code: string, source: QuestionActionBlockerV1["source"], references: string[] = [], severity: QuestionActionBlockerV1["severity"] = "material"): QuestionActionBlockerV1 {
  return { code, severity, source, references: unique(references) };
}
function limitation(code: string, references: string[] = []): QuestionActionLimitationV1 { return { code, references: unique(references) }; }
function evidence(evidenceId: string, kind: QuestionActionEvidenceV1["kind"], references: string[], provenance: QuestionActionEvidenceV1["provenance"]): QuestionActionEvidenceV1 {
  return { evidenceId, kind, references: unique(references), provenance };
}
function dedupeBlockers(items: readonly QuestionActionBlockerV1[]): QuestionActionBlockerV1[] {
  const map = new Map<string, QuestionActionBlockerV1>();
  for (const item of items) {
    const key = `${item.source}:${item.code}`;
    const current = map.get(key);
    map.set(key, { ...item, severity: current?.severity === "critical" || item.severity === "critical" ? "critical" : "material", references: unique([...(current?.references ?? []), ...item.references]) });
  }
  return [...map.values()].sort((a, b) => a.source.localeCompare(b.source) || a.code.localeCompare(b.code));
}
function dedupeLimitations(items: readonly QuestionActionLimitationV1[]): QuestionActionLimitationV1[] {
  const map = new Map<string, QuestionActionLimitationV1>();
  for (const item of items) map.set(item.code, { code: item.code, references: unique([...(map.get(item.code)?.references ?? []), ...item.references]) });
  return [...map.values()].sort((a, b) => a.code.localeCompare(b.code));
}
function dedupeEvidence(items: readonly QuestionActionEvidenceV1[]): QuestionActionEvidenceV1[] {
  const map = new Map<string, QuestionActionEvidenceV1>();
  for (const item of items) {
    const key = `${item.kind}:${item.evidenceId}:${item.provenance}`;
    map.set(key, { ...item, references: unique([...(map.get(key)?.references ?? []), ...item.references]) });
  }
  return [...map.values()].sort((a, b) => a.kind.localeCompare(b.kind) || a.evidenceId.localeCompare(b.evidenceId));
}
function weakenState(metricState: GovernedMetricStateV1, additional: GovernedMetricStateV1): GovernedMetricStateV1 {
  return STATE_ORDER[metricState] >= STATE_ORDER[additional] ? metricState : additional;
}

function selectedDimensions(source: CanonicalMetricSourceV1): Map<string, GovernedDimensionBindingV1[]> {
  const result = new Map<string, GovernedDimensionBindingV1[]>();
  for (const column of source.semantic.columns) {
    if (!column.selectedCandidateId || !USABLE_SEMANTIC_STATES.has(column.finalState)) continue;
    const binding: GovernedDimensionBindingV1 = {
      semanticId: column.selectedCandidateId,
      sourceColumnIndex: column.sourceColumnIndex,
      semanticState: column.finalState as GovernedDimensionBindingV1["semanticState"],
    };
    result.set(binding.semanticId, [...(result.get(binding.semanticId) ?? []), binding]);
  }
  for (const [key, values] of result) result.set(key, values.sort((a, b) => a.sourceColumnIndex - b.sourceColumnIndex));
  return result;
}

function resolveRequiredDimensions(policy: QuestionFamilyPolicyV1, dimensions: Map<string, GovernedDimensionBindingV1[]>): { bindings: GovernedDimensionBindingV1[]; blockers: QuestionActionBlockerV1[] } {
  const bindings: GovernedDimensionBindingV1[] = [];
  const blockers: QuestionActionBlockerV1[] = [];
  for (const alternatives of policy.requiredDimensionGroups) {
    const selected = alternatives.flatMap((semanticId) => dimensions.get(semanticId) ?? []).sort((a, b) => alternatives.indexOf(a.semanticId) - alternatives.indexOf(b.semanticId) || a.sourceColumnIndex - b.sourceColumnIndex)[0];
    if (selected) bindings.push(selected);
    else blockers.push(blocker(`missing_required_dimension:${alternatives.join("|")}`, "dimension", [...alternatives]));
  }
  return { bindings: bindings.sort((a, b) => a.semanticId.localeCompare(b.semanticId) || a.sourceColumnIndex - b.sourceColumnIndex), blockers };
}

function resolveTimeBasis(policy: QuestionFamilyPolicyV1, source: CanonicalMetricSourceV1, dimensions: Map<string, GovernedDimensionBindingV1[]>): { value: GovernedTimeBasisV1; blockers: QuestionActionBlockerV1[] } {
  const definition = GOVERNED_METRIC_DEFINITIONS_V1.find((metric) => metric.metricId === policy.metricId);
  const time = ["report_date", "time_period"].flatMap((id) => dimensions.get(id) ?? []).sort((a, b) => a.semanticId.localeCompare(b.semanticId) || a.sourceColumnIndex - b.sourceColumnIndex)[0] ?? null;
  const temporalMode = source.grain.signature.temporalMode;
  const blockers: QuestionActionBlockerV1[] = [];
  if (["event_or_period", "compatible_period"].includes(policy.timeRequirement) && !time) blockers.push(blocker("missing_compatible_time_dimension", "time_basis", [policy.metricId]));
  if (policy.timeRequirement === "point_in_time_as_of" && (!["snapshot", "effective_time"].includes(temporalMode.value) || !USABLE_SEMANTIC_STATES.has(temporalMode.state))) {
    blockers.push(blocker("missing_point_in_time_as_of_basis", "time_basis", [temporalMode.value, temporalMode.state]));
  }
  return {
    value: {
      requirement: policy.timeRequirement,
      metricTimeBehavior: definition?.timeBehavior ?? "unknown",
      resolvedSemanticId: time?.semanticId ?? null,
      sourceColumnIndex: time?.sourceColumnIndex ?? null,
      canonicalTemporalMode: `${temporalMode.value}:${temporalMode.state}`,
    },
    blockers,
  };
}

function chooseMetricItems(items: readonly GovernedMetricPreflightItemV1[]): Map<string, GovernedMetricPreflightItemV1> {
  const grouped = new Map<string, GovernedMetricPreflightItemV1[]>();
  for (const item of items) grouped.set(item.metricId, [...(grouped.get(item.metricId) ?? []), item]);
  const selected = new Map<string, GovernedMetricPreflightItemV1>();
  for (const [metricId, candidates] of grouped) {
    candidates.sort((a, b) => STATE_ORDER[b.state] - STATE_ORDER[a.state] || canonicalJson(a).localeCompare(canonicalJson(b)));
    selected.set(metricId, candidates[0]);
  }
  return selected;
}

function integrityBlockers(input: QuestionActionGenerationInputV1, policyHash: string, sourceRef: string): QuestionActionBlockerV1[] {
  const result: QuestionActionBlockerV1[] = [];
  if (input.expectedQuestionPolicyHash !== policyHash) result.push(blocker("question_policy_hash_mismatch", "integrity", [input.expectedQuestionPolicyHash, policyHash], "critical"));
  if (input.domainActivation.packId !== MANIFEST.packId || input.metricPreflight.domainPackId !== MANIFEST.packId) result.push(blocker("unsupported_domain_pack", "integrity", [input.domainActivation.packId, input.metricPreflight.domainPackId], "critical"));
  if (input.domainActivation.packVersion !== MANIFEST.version || input.domainActivation.manifestPolicyHash !== MANIFEST.lastValidatedPolicyIdentity) result.push(blocker("domain_manifest_identity_mismatch", "integrity", [input.domainActivation.packVersion, input.domainActivation.manifestPolicyHash], "critical"));
  if (input.metricPreflight.policyHash !== governedMetricPolicyHash()) result.push(blocker("metric_policy_identity_mismatch", "integrity", [input.metricPreflight.policyHash], "critical"));
  if (input.metricPreflight.sourceReferences.length !== 1 || input.metricPreflight.sourceReferences[0] !== sourceRef) result.push(blocker("canonical_source_preflight_mismatch", "integrity", [...input.metricPreflight.sourceReferences, sourceRef], "critical"));
  if ([input.canonicalSource.semantic.productionWiring.executed, input.canonicalSource.grain.productionWiring.executed, input.canonicalSource.readiness.productionWiring.executed, input.domainActivation.productionWiring.executed, input.metricPreflight.productionWiring.executed].some(Boolean)) result.push(blocker("unexpected_production_wiring", "integrity", [], "critical"));
  if (input.metricPreflight.runtimeActionCreated || input.metricPreflight.runtimeActionAuthorized || input.metricPreflight.metricExecutionExecuted || input.metricPreflight.metricResultsProduced) result.push(blocker("upstream_runtime_or_execution_authority_detected", "integrity", [], "critical"));
  if (!["active", "conditional"].includes(input.domainActivation.state)) result.push(blocker(`domain_pack_not_usable:${input.domainActivation.state}`, "domain_activation", [input.domainActivation.identity], "critical"));
  return dedupeBlockers(result);
}

function createQuestion(policy: QuestionFamilyPolicyV1, input: QuestionActionGenerationInputV1, metric: GovernedMetricPreflightItemV1 | undefined, globalBlockers: QuestionActionBlockerV1[], dimensions: Map<string, GovernedDimensionBindingV1[]>, policyHash: string, sourceRef: string): GovernedQuestionCandidateV1 {
  const dimension = resolveRequiredDimensions(policy, dimensions);
  const time = resolveTimeBasis(policy, input.canonicalSource, dimensions);
  const metricState: GovernedMetricStateV1 = metric?.state ?? "unsupported";
  const metricBlockers = metric
    ? metric.blockers.map((item) => blocker(item.code, "metric_preflight", item.references, item.severity))
    : [blocker("metric_preflight_result_missing", "metric_preflight", [policy.metricId], "critical")];
  const questionBlockers = dedupeBlockers([...globalBlockers, ...metricBlockers, ...dimension.blockers, ...time.blockers]);
  const questionState = questionBlockers.length > 0 ? weakenState(metricState, "blocked") : metricState;
  const metricLimitations = (metric?.limitations ?? []).map((item) => limitation(item.code, item.references));
  const limitations = dedupeLimitations([
    ...metricLimitations,
    ...(questionState === "conditionally_ready" ? [limitation("metric_preflight_is_conditional", [policy.metricId])] : []),
    limitation("phase_5m2_candidate_only_no_runtime_authority"),
  ]);
  const questionEvidence = dedupeEvidence([
    evidence("canonical:source", "canonical_source", [sourceRef], "canonical_artifact"),
    evidence("manifest:commerce_distribution_mvp", "domain_manifest", [MANIFEST.lastValidatedPolicyIdentity], "governed_manifest"),
    evidence("activation:commerce_distribution_mvp", "domain_activation", [input.domainActivation.identity, input.domainActivation.state], "canonical_artifact"),
    evidence(`metric:${policy.metricId}`, "metric_definition", [policy.metricId, metric?.metricVersion ?? "unavailable", input.metricPreflight.policyHash], "governed_metric_catalog"),
    evidence(`preflight:${policy.metricId}`, "metric_preflight", [input.metricPreflight.identity, metricState], "governed_preflight"),
    evidence(`question-policy:${policy.questionId}`, "question_policy", [policyHash, policy.version], "governed_question_policy"),
    evidence(`grain-time:${policy.metricId}`, "grain_time", [time.value.canonicalTemporalMode, time.value.metricTimeBehavior], "canonical_artifact"),
    ...dimension.bindings.map((binding) => evidence(`dimension:${binding.semanticId}:${binding.sourceColumnIndex}`, "semantic_dimension", [binding.semanticId, String(binding.sourceColumnIndex), binding.semanticState], "canonical_artifact")),
  ]);
  const governedIdentity = deterministicPolicySha256({ questionId: policy.questionId, version: policy.version, domainPackId: policy.domainPackId, metricId: policy.metricId, sourceRef, metricPreflightReference: input.metricPreflight.identity, resolvedDimensions: dimension.bindings, timeBasis: time.value, questionState, policyHash });
  return {
    contractVersion: "lightbi.governed-question-action-contract.v1",
    version: policy.version,
    domainPackId: policy.domainPackId,
    metricId: policy.metricId,
    title: policy.title,
    businessPurpose: policy.businessPurpose,
    requiredDimensions: policy.requiredDimensionGroups.flatMap((group) => [...group]),
    resolvedDimensions: dimension.bindings,
    timeBasis: time.value,
    metricPreflightState: metricState,
    blockers: questionBlockers,
    limitations,
    remediation: unique([...(metric?.remediation.map((item) => item.code) ?? []), ...dimension.blockers.map((item) => `resolve_${item.code}`), ...time.blockers.map((item) => `resolve_${item.code}`)]),
    evidence: questionEvidence,
    prohibitedUses: unique(policy.prohibitedUses),
    runtimeActionCreated: false,
    runtimeActionAuthorized: false,
    executionPerformed: false,
    productionWiring: { executed: false },
    questionId: policy.questionId,
    governedIdentity,
    intent: policy.intent,
    questionState,
    metricDefinitionAvailable: GOVERNED_METRIC_DEFINITIONS_V1.some((definition) => definition.metricId === policy.metricId) && metric?.metricDefinitionAvailable !== false,
    meaningfulBusinessLens: true,
    actionCandidateId: null,
    advertisedAsDefault: false,
    rank: null,
  };
}

function actionFor(question: GovernedQuestionCandidateV1, policy: QuestionFamilyPolicyV1): GovernedActionCandidateV1 | null {
  if (!ADVERTISABLE_STATES.has(question.questionState) || question.blockers.length > 0 || !question.metricDefinitionAvailable) return null;
  const actionCandidateId = `action-candidate:${question.questionId}:v1`;
  return {
    contractVersion: question.contractVersion,
    version: question.version,
    domainPackId: question.domainPackId,
    metricId: question.metricId,
    title: question.title,
    businessPurpose: question.businessPurpose,
    requiredDimensions: [...question.requiredDimensions],
    resolvedDimensions: question.resolvedDimensions.map((item) => ({ ...item })),
    timeBasis: { ...question.timeBasis },
    metricPreflightState: question.metricPreflightState,
    blockers: [],
    limitations: question.limitations.map((item) => ({ ...item, references: [...item.references] })),
    remediation: [...question.remediation],
    evidence: question.evidence.map((item) => ({ ...item, references: [...item.references] })),
    prohibitedUses: [...question.prohibitedUses],
    runtimeActionCreated: false,
    runtimeActionAuthorized: false,
    executionPerformed: false,
    productionWiring: { executed: false },
    actionCandidateId,
    questionId: question.questionId,
    actionKind: policy.actionKind,
    actionCandidateState: question.questionState === "ready" ? "available" : "conditional",
    preflightRequirementsSatisfied: true,
    executable: false,
  };
}

function inferredAsOfBasis(source: CanonicalMetricSourceV1, action: GovernedActionCandidateV1): GovernedRuntimePreflightInputV1["asOfBasis"] {
  if (action.metricId !== "inventory_on_hand") return null;
  const evidence = (source.sourceEvidence?.inventorySnapshots ?? []).filter((item) => inventorySnapshotEvidenceMatchesSource(item, source));
  if (evidence.length !== 1) return null;
  const asOf = evidence[0].asOf;
  const column = source.semantic.columns.find((item) => item.physicalColumn === asOf.physicalColumn && item.selectedCandidateId === asOf.semanticId && USABLE_SEMANTIC_STATES.has(item.finalState));
  return column ? { kind: "column_value", sourceColumnIndex: column.sourceColumnIndex, semanticId: asOf.semanticId, value: asOf.value } : null;
}

function generationIdentityBody(generation: QuestionActionGenerationV1) {
  return {
    sourceRef: generation.canonicalSourceReference,
    domainActivationReference: generation.domainActivationReference,
    metricPreflightReference: generation.metricPreflightReference,
    policyHash: generation.questionPolicyHash,
    defaultQuestions: generation.defaultQuestions,
    candidateQuestions: generation.candidateQuestions,
    actionCandidates: generation.actionCandidates,
    blockers: generation.blockers,
  };
}

function alignWithRuntimePreflight(
  generation: QuestionActionGenerationV1,
  input: QuestionActionGenerationInputV1,
): QuestionActionGenerationV1 {
  const runtimeByQuestion = new Map(generation.actionCandidates.map((action) => [
    action.questionId,
    preflightGovernedRuntimeAction({
      schemaVersion: "lightbi.governed-runtime-preflight-input.v1",
      canonicalSource: input.canonicalSource,
      metricPreflight: input.metricPreflight,
      questionGeneration: generation,
      actionCandidate: action,
      expectedRuntimePolicyHash: governedRuntimePolicyHash(),
      asOfBasis: inferredAsOfBasis(input.canonicalSource, action),
    }),
  ]));
  const runnableStates = new Set(["executable", "conditionally_executable"]);
  const retainedActions = generation.actionCandidates.filter((action) => runnableStates.has(runtimeByQuestion.get(action.questionId)?.state ?? "unavailable"));
  const retainedQuestionIds = new Set(retainedActions.map((action) => action.questionId));
  const alignedQuestions = generation.candidateQuestions.map((question): GovernedQuestionCandidateV1 => {
    if (!question.actionCandidateId || retainedQuestionIds.has(question.questionId)) {
      return { ...question, advertisedAsDefault: false, rank: null };
    }
    const runtime = runtimeByQuestion.get(question.questionId);
    const runtimeBlockers = runtime?.blockers.map((item) => blocker(item.code, "runtime_preflight", item.references, item.severity))
      ?? [blocker("runtime_preflight_state_unavailable", "runtime_preflight", [question.questionId], "critical")];
    return {
      ...question,
      questionState: "blocked",
      actionCandidateId: null,
      advertisedAsDefault: false,
      rank: null,
      blockers: dedupeBlockers([...question.blockers, ...runtimeBlockers]),
      limitations: dedupeLimitations([
        ...question.limitations,
        limitation("runtime_preflight_blocked_explanation_only", runtimeBlockers.map((item) => item.code)),
      ]),
      remediation: unique([
        ...question.remediation,
        ...runtimeBlockers.map((item) => `satisfy_runtime_preflight:${item.code}`),
      ]),
    };
  });
  const defaultIds = new Set(alignedQuestions
    .filter((question) => retainedQuestionIds.has(question.questionId) && ADVERTISABLE_STATES.has(question.questionState) && question.blockers.length === 0)
    .slice(0, COMMERCE_DISTRIBUTION_QUESTION_POLICY_V1.maxDefaultQuestions)
    .map((question) => question.questionId));
  let rank = 0;
  const rankedQuestions = alignedQuestions.map((question) => defaultIds.has(question.questionId)
    ? { ...question, advertisedAsDefault: true, rank: ++rank }
    : question);
  const aligned: QuestionActionGenerationV1 = {
    ...generation,
    defaultQuestions: rankedQuestions.filter((question) => question.advertisedAsDefault),
    candidateQuestions: rankedQuestions,
    blockedQuestions: rankedQuestions.filter((question) => !ADVERTISABLE_STATES.has(question.questionState) || question.blockers.length > 0),
    actionCandidates: retainedActions,
  };
  aligned.identity = deterministicPolicySha256(generationIdentityBody(aligned));
  return aligned;
}

export function generateGovernedCommerceQuestionsAndActions(input: QuestionActionGenerationInputV1): QuestionActionGenerationV1 {
  const policyHash = questionActionPolicyHash();
  const sourceRef = sourceReference(input.canonicalSource);
  const globalBlockers = integrityBlockers(input, policyHash, sourceRef);
  const dimensions = selectedDimensions(input.canonicalSource);
  const metrics = chooseMetricItems(input.metricPreflight.metrics);
  const policyByQuestion = new Map<string, QuestionFamilyPolicyV1>(COMMERCE_DISTRIBUTION_QUESTION_POLICY_V1.questionFamilies.map((item) => [item.questionId, item]));
  const deduped = new Map<string, GovernedQuestionCandidateV1>();
  for (const family of COMMERCE_DISTRIBUTION_QUESTION_POLICY_V1.questionFamilies) {
    const candidate = createQuestion(family, input, metrics.get(family.metricId), globalBlockers, dimensions, policyHash, sourceRef);
    const current = deduped.get(candidate.governedIdentity);
    if (!current || canonicalJson(candidate).localeCompare(canonicalJson(current)) < 0) deduped.set(candidate.governedIdentity, candidate);
  }
  const candidates = [...deduped.values()].sort((a, b) => {
    const policyA = policyByQuestion.get(a.questionId)!;
    const policyB = policyByQuestion.get(b.questionId)!;
    return STATE_ORDER[a.questionState] - STATE_ORDER[b.questionState]
      || (policyA.sourceComplexity === "source_local" ? 0 : 1) - (policyB.sourceComplexity === "source_local" ? 0 : 1)
      || policyA.priority - policyB.priority
      || a.governedIdentity.localeCompare(b.governedIdentity);
  });
  const defaultIdentities = new Set(candidates.filter((item) => ADVERTISABLE_STATES.has(item.questionState) && item.blockers.length === 0 && item.metricDefinitionAvailable).slice(0, COMMERCE_DISTRIBUTION_QUESTION_POLICY_V1.maxDefaultQuestions).map((item) => item.governedIdentity));
  let rank = 0;
  const finalCandidates = candidates.map((item) => defaultIdentities.has(item.governedIdentity) ? { ...item, advertisedAsDefault: true, rank: ++rank } : item);
  const actionCandidates = finalCandidates.flatMap((question) => {
    const action = actionFor(question, policyByQuestion.get(question.questionId)!);
    if (!action) return [];
    question.actionCandidateId = action.actionCandidateId;
    return [action];
  });
  const defaultQuestions = finalCandidates.filter((item) => item.advertisedAsDefault);
  const blockedQuestions = finalCandidates.filter((item) => !ADVERTISABLE_STATES.has(item.questionState) || item.blockers.length > 0);
  const artifactEvidence = dedupeEvidence([
    evidence("canonical:source", "canonical_source", [sourceRef], "canonical_artifact"),
    evidence("manifest:commerce_distribution_mvp", "domain_manifest", [MANIFEST.lastValidatedPolicyIdentity], "governed_manifest"),
    evidence("generation:question-policy", "question_policy", [policyHash], "governed_question_policy"),
  ]);
  const identityBody = { sourceRef, domainActivationReference: input.domainActivation.identity, metricPreflightReference: input.metricPreflight.identity, policyHash, defaultQuestions, candidateQuestions: finalCandidates, actionCandidates, blockers: globalBlockers };
  const generation: QuestionActionGenerationV1 = {
    schemaVersion: "lightbi.question-action-generation.v1",
    contractVersion: "lightbi.governed-question-action-contract.v1",
    domainPackId: MANIFEST.packId,
    domainPackVersion: MANIFEST.version,
    manifestPolicyHash: MANIFEST.lastValidatedPolicyIdentity,
    metricPolicyHash: input.metricPreflight.policyHash,
    questionPolicyVersion: "lightbi.question-action-policy.v1",
    questionPolicyHash: policyHash,
    identity: deterministicPolicySha256(identityBody),
    canonicalSourceReference: sourceRef,
    domainActivationReference: input.domainActivation.identity,
    metricPreflightReference: input.metricPreflight.identity,
    defaultQuestions,
    candidateQuestions: finalCandidates,
    blockedQuestions,
    actionCandidates,
    blockers: globalBlockers,
    limitations: dedupeLimitations([limitation("phase_5m2_shadow_generation_only"), ...(input.metricPreflight.limitations.map((item) => limitation(item.code, item.references)))]),
    evidence: artifactEvidence,
    defaultQuestionLimit: 5,
    deterministicRanking: true,
    metricResultsProduced: false,
    runtimeActionCreated: false,
    runtimeActionAuthorized: false,
    executionPerformed: false,
    decisionUseAuthorized: false,
    productionWiring: { executed: false },
  };
  return alignWithRuntimePreflight(generation, input);
}
