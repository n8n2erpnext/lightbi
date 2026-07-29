import { COMMERCE_DISTRIBUTION_QUESTION_POLICY_V1, questionActionPolicyHash } from "./commerce-distribution-question-policy";
import { canonicalJson, deterministicPolicySha256 } from "./contextual-evidence-policy";
import type { CanonicalMetricSourceV1, CanonicalSourceDocumentIdentityEvidenceV1, GovernedMetricDefinitionV1, GovernedMetricPreflightItemV1 } from "./governed-domain-metric-contracts";
import { GOVERNED_METRIC_DEFINITIONS_V1, governedMetricPolicyHash } from "./governed-metric-policy";
import type {
  GovernedColumnBindingV1,
  GovernedExecutionEvidenceV1,
  GovernedExecutionRestrictionV1,
  GovernedRuntimeActionV1,
  GovernedRuntimeBlockerV1,
  GovernedRuntimePreflightInputV1,
  GovernedRuntimePreflightV1,
  GovernedRuntimeStateV1,
} from "./governed-runtime-contracts";
import { GOVERNED_RUNTIME_POLICY_V1, governedRuntimePolicyHash } from "./governed-runtime-policy";
import { currencyEvidenceMatchesSource, documentIdentityEvidenceMatchesSource, inventorySnapshotEvidenceMatchesSource } from "./canonical-source-evidence";

const USABLE_STATES = new Set(["confirmed", "probable"]);

export function governedRuntimePreflightIdentity(state: "executable" | "conditionally_executable", action: GovernedRuntimeActionV1, runtimePolicyHash: string): string {
  return deterministicPolicySha256({ state, action, runtimePolicyHash });
}

function unique(values: readonly string[]): string[] { return [...new Set(values)].sort(); }
function sourceReference(source: CanonicalMetricSourceV1): string {
  const hash = source.physical.provenance.sourceHash;
  return `source:${hash?.algorithm === "sha256" ? hash.value : deterministicPolicySha256(source.physical.provenance.sourceId)}`;
}
function blocker(code: string, source: GovernedRuntimeBlockerV1["source"], references: string[] = [], severity: GovernedRuntimeBlockerV1["severity"] = "material"): GovernedRuntimeBlockerV1 {
  return { code, severity, source, references: unique(references) };
}
function restriction(code: string, reason: string, references: string[] = [], severity: GovernedExecutionRestrictionV1["severity"] = "material"): GovernedExecutionRestrictionV1 {
  return { code, severity, reason, references: unique(references), decisionUseBlocked: true };
}
function evidence(evidenceId: string, kind: GovernedExecutionEvidenceV1["kind"], references: string[], provenance: GovernedExecutionEvidenceV1["provenance"]): GovernedExecutionEvidenceV1 {
  return { evidenceId, kind, references: unique(references), provenance };
}
function dedupeBlockers(values: GovernedRuntimeBlockerV1[]): GovernedRuntimeBlockerV1[] {
  const map = new Map<string, GovernedRuntimeBlockerV1>();
  for (const item of values) {
    const key = `${item.source}:${item.code}`;
    const previous = map.get(key);
    map.set(key, { ...item, severity: previous?.severity === "critical" || item.severity === "critical" ? "critical" : "material", references: unique([...(previous?.references ?? []), ...item.references]) });
  }
  return [...map.values()].sort((a, b) => a.source.localeCompare(b.source) || a.code.localeCompare(b.code));
}
function dedupeRestrictions(values: GovernedExecutionRestrictionV1[]): GovernedExecutionRestrictionV1[] {
  const map = new Map<string, GovernedExecutionRestrictionV1>();
  for (const item of values) {
    const previous = map.get(item.code);
    map.set(item.code, { ...item, severity: previous?.severity === "critical" || item.severity === "critical" ? "critical" : previous?.severity === "material" || item.severity === "material" ? "material" : "caution", references: unique([...(previous?.references ?? []), ...item.references]) });
  }
  return [...map.values()].sort((a, b) => a.code.localeCompare(b.code));
}

function metricItem(input: GovernedRuntimePreflightInputV1): GovernedMetricPreflightItemV1 | null {
  if (!input.actionCandidate) return null;
  const matches = input.metricPreflight.metrics.filter((item) => item.metricId === input.actionCandidate!.metricId);
  return matches.length === 1 ? matches[0] : null;
}

function physicalName(source: CanonicalMetricSourceV1, index: number): string | null {
  return source.physical.sourceProfile.columns.find((column) => column.sourceColumnIndex === index)?.physicalColumnName ?? null;
}

function semanticBinding(source: CanonicalMetricSourceV1, semanticId: string, role: GovernedColumnBindingV1["role"], requirementId: string): GovernedColumnBindingV1[] {
  return source.semantic.columns.flatMap((column) => {
    if (column.selectedCandidateId !== semanticId || !USABLE_STATES.has(column.finalState)) return [];
    const physicalColumn = column.physicalColumn || physicalName(source, column.sourceColumnIndex);
    if (!physicalColumn) return [];
    const profile = source.physical.sourceProfile.columns.find((item) => item.sourceColumnIndex === column.sourceColumnIndex);
    const physicalType = profile?.physicalTypeCandidates?.[0]?.type ?? null;
    return [{ requirementId, role, semanticId, sourceColumnIndex: column.sourceColumnIndex, physicalColumn, physicalType, semanticState: column.finalState as "confirmed" | "probable" }];
  });
}

function exactMetricIdentity(source: CanonicalMetricSourceV1, binding: GovernedColumnBindingV1): string | null {
  const identity = source.grain.signature.identityBasis;
  if (USABLE_STATES.has(identity.state) && identity.selectedCandidateIds.includes(binding.semanticId)) return binding.semanticId;
  const profile = source.physical.sourceProfile.columns.find((item) => item.sourceColumnIndex === binding.sourceColumnIndex);
  if (!profile || profile.nullCount !== 0 || profile.cardinality?.mode !== "exact" || profile.uniqueness?.uniquenessRatio !== 1) return null;
  const candidateId = `key:${binding.sourceColumnIndex}`;
  const retained = [...identity.selectedCandidateIds, ...identity.alternativeCandidateIds].includes(candidateId);
  const evidenced = identity.supportingEvidenceReferences.includes(`${candidateId}:identity`) && identity.supportingEvidenceReferences.includes(`${candidateId}:unique`);
  return retained && evidenced ? candidateId : null;
}

function sourceBoundDocumentIdentity(
  source: CanonicalMetricSourceV1,
  binding: GovernedColumnBindingV1,
): CanonicalSourceDocumentIdentityEvidenceV1 | null {
  const matches = (source.sourceEvidence?.documentIdentities ?? []).filter((item) =>
    item.semanticId === binding.semanticId
    && item.physicalColumn === binding.physicalColumn
    && documentIdentityEvidenceMatchesSource(item, source));
  if (matches.length !== 1) return null;
  const profile = source.physical.sourceProfile.columns.find((item) =>
    item.sourceColumnIndex === binding.sourceColumnIndex
    && item.physicalColumnName === binding.physicalColumn);
  return profile && profile.nullCount === 0 && profile.technicalColumnEvidence.length === 0
    ? matches[0]
    : null;
}

function requirementBinding(source: CanonicalMetricSourceV1, definition: GovernedMetricDefinitionV1, requirementIndex: number, metric: GovernedMetricPreflightItemV1): { binding: GovernedColumnBindingV1 | null; blockers: GovernedRuntimeBlockerV1[] } {
  const requirement = definition.requirements[requirementIndex];
  const role: GovernedColumnBindingV1["role"] = definition.aggregationOperator === "count_governed_identity" ? "identity" : "measure";
  const matches = definition.metricId === "gross_profit" || definition.aggregationOperator === "average"
    ? metric.selectedBindings.filter((item) => item.requirementId === requirement.requirementId && item.sourceReference === sourceReference(source)).flatMap((selected) => {
        const exact = semanticBinding(source, selected.semanticId, role, requirement.requirementId).find((item) => item.sourceColumnIndex === selected.sourceColumnIndex && item.physicalColumn === selected.physicalColumn);
        return exact ? [exact] : [];
      })
    : requirement.semanticSignals.flatMap((semanticId) => semanticBinding(source, semanticId, role, requirement.requirementId));
  if (matches.length === 0) return { binding: null, blockers: [blocker(`runtime_binding_missing:${requirement.requirementId}`, "binding", [...requirement.semanticSignals], "critical")] };
  if (matches.length > 1) return { binding: null, blockers: [blocker(`runtime_binding_ambiguous:${requirement.requirementId}`, "binding", matches.map((item) => `${item.semanticId}:${item.sourceColumnIndex}`), "critical")] };
  const binding = matches[0];
  const profile = source.physical.sourceProfile.columns.find((column) => column.sourceColumnIndex === binding.sourceColumnIndex);
  const blockers: GovernedRuntimeBlockerV1[] = [];
  if (!profile) blockers.push(blocker(`physical_profile_missing:${requirement.requirementId}`, "binding", [String(binding.sourceColumnIndex)], "critical"));
  if (role === "measure" && (profile?.parseEvidence.find((item) => item.parser === "numeric")?.failureCount ?? 0) > 0) blockers.push(blocker(`numeric_parse_failures:${requirement.requirementId}`, "binding", [binding.physicalColumn]));
  if (role === "identity" && (profile?.nullCount ?? 0) > 0) blockers.push(blocker(`null_governed_identity:${requirement.requirementId}`, "binding", [binding.physicalColumn], "critical"));
  if (profile?.technicalColumnEvidence.length) blockers.push(blocker(`technical_column_cannot_bind_metric:${requirement.requirementId}`, "binding", [binding.physicalColumn], "critical"));
  return { binding, blockers };
}

function validateDimensionBindings(input: GovernedRuntimePreflightInputV1): { bindings: GovernedColumnBindingV1[]; blockers: GovernedRuntimeBlockerV1[] } {
  const action = input.actionCandidate;
  if (!action) return { bindings: [], blockers: [] };
  const family = COMMERCE_DISTRIBUTION_QUESTION_POLICY_V1.questionFamilies.find((item) => item.questionId === action.questionId && item.metricId === action.metricId);
  if (!family) return { bindings: [], blockers: [blocker("question_family_policy_missing", "action", [action.questionId], "critical")] };
  const allowed = new Set<string>(family.requiredDimensionGroups.flatMap((group) => [...group]));
  const bindings: GovernedColumnBindingV1[] = [];
  const blockers: GovernedRuntimeBlockerV1[] = [];
  for (const candidate of action.resolvedDimensions) {
    if (!allowed.has(candidate.semanticId)) {
      blockers.push(blocker("unsupported_grouping_dimension", "dimension", [candidate.semanticId], "critical"));
      continue;
    }
    const exact = semanticBinding(input.canonicalSource, candidate.semanticId, "dimension", `dimension:${candidate.semanticId}`).find((item) => item.sourceColumnIndex === candidate.sourceColumnIndex);
    if (!exact) blockers.push(blocker("canonical_dimension_binding_mismatch", "dimension", [candidate.semanticId, String(candidate.sourceColumnIndex)], "critical"));
    else bindings.push(exact);
  }
  for (const group of family.requiredDimensionGroups) if (!bindings.some((item) => (group as readonly string[]).includes(item.semanticId))) blockers.push(blocker(`required_grouping_dimension_missing:${group.join("|")}`, "dimension", [...group], "critical"));
  return { bindings: bindings.sort((a, b) => a.semanticId.localeCompare(b.semanticId) || a.sourceColumnIndex - b.sourceColumnIndex), blockers };
}

function validateTimeBinding(input: GovernedRuntimePreflightInputV1): { binding: GovernedColumnBindingV1 | null; blockers: GovernedRuntimeBlockerV1[] } {
  const action = input.actionCandidate;
  if (!action || action.timeBasis.requirement === "not_required") return { binding: null, blockers: [] };
  if (action.timeBasis.requirement === "point_in_time_as_of") {
    const basis = input.asOfBasis;
    if (!basis || basis.kind !== "column_value" || basis.sourceColumnIndex === null || !basis.semanticId) return { binding: null, blockers: [blocker("governed_snapshot_time_binding_required", "time", [], "critical")] };
    const binding = semanticBinding(input.canonicalSource, basis.semanticId, "time", "inventory_as_of").find((item) => item.sourceColumnIndex === basis.sourceColumnIndex) ?? null;
    return binding ? { binding, blockers: [] } : { binding: null, blockers: [blocker("canonical_snapshot_time_binding_mismatch", "time", [basis.semanticId, String(basis.sourceColumnIndex)], "critical")] };
  }
  if (action.timeBasis.sourceColumnIndex === null || action.timeBasis.resolvedSemanticId === null) return { binding: null, blockers: [blocker("governed_time_binding_required", "time", [action.timeBasis.requirement], "critical")] };
  const binding = semanticBinding(input.canonicalSource, action.timeBasis.resolvedSemanticId, "time", `time:${action.timeBasis.requirement}`).find((item) => item.sourceColumnIndex === action.timeBasis.sourceColumnIndex) ?? null;
  return binding ? { binding, blockers: [] } : { binding: null, blockers: [blocker("canonical_time_binding_mismatch", "time", [action.timeBasis.resolvedSemanticId, String(action.timeBasis.sourceColumnIndex)], "critical")] };
}

function validateInventorySnapshotEvidence(input: GovernedRuntimePreflightInputV1, metric: GovernedMetricPreflightItemV1): { blockers: GovernedRuntimeBlockerV1[]; evidence: NonNullable<CanonicalMetricSourceV1["sourceEvidence"]>["inventorySnapshots"] } {
  if (metric.metricId !== "inventory_on_hand") return { blockers: [], evidence: [] };
  const current = (input.canonicalSource.sourceEvidence?.inventorySnapshots ?? []).filter((item) => inventorySnapshotEvidenceMatchesSource(item, input.canonicalSource));
  const expectedIds = unique(metric.inventorySnapshotEvidenceIds);
  const currentIds = unique(current.map((item) => item.evidenceId));
  const basis = input.asOfBasis;
  const identity = input.canonicalSource.grain.signature.identityBasis;
  const exactBasis = current.length === 1 && basis?.kind === "column_value" && basis.semanticId === current[0].asOf.semanticId && basis.value === current[0].asOf.value
    && input.canonicalSource.semantic.columns.some((column) => column.sourceColumnIndex === basis.sourceColumnIndex && column.physicalColumn === current[0].asOf.physicalColumn);
  const identityPreserved = metric.selectedIdentityCandidateId !== null && identity.selectedCandidateIds.includes(metric.selectedIdentityCandidateId);
  const valid = expectedIds.length === 1 && currentIds.length === 1 && canonicalJson(expectedIds) === canonicalJson(currentIds) && exactBasis && identityPreserved && metric.unitCompatible === true;
  return valid ? { blockers: [], evidence: current } : { blockers: [blocker("inventory_source_bound_snapshot_evidence_mismatch", "grain", [...expectedIds, ...currentIds, metric.selectedIdentityCandidateId ?? "missing_identity"], "critical")], evidence: current };
}

function validateAsOf(input: GovernedRuntimePreflightInputV1, metricId: string): GovernedRuntimeBlockerV1[] {
  if (metricId !== "inventory_on_hand") return [];
  const basis = input.asOfBasis;
  if (!basis) return [blocker("inventory_as_of_basis_required", "time", [], "critical")];
  const temporalMode = input.canonicalSource.grain.signature.temporalMode;
  if (basis.kind === "source_snapshot") {
    if (basis.sourceColumnIndex !== null || basis.semanticId !== null || !["snapshot", "effective_time"].includes(temporalMode.value) || !USABLE_STATES.has(temporalMode.state)) return [blocker("invalid_source_snapshot_as_of_basis", "time", [temporalMode.value, temporalMode.state], "critical")];
    return [];
  }
  if (basis.sourceColumnIndex === null || !basis.semanticId || !basis.value) return [blocker("invalid_column_as_of_basis", "time", [], "critical")];
  const match = semanticBinding(input.canonicalSource, basis.semanticId, "time", "inventory_as_of").some((item) => item.sourceColumnIndex === basis.sourceColumnIndex);
  return match ? [] : [blocker("canonical_as_of_binding_mismatch", "time", [basis.semanticId, String(basis.sourceColumnIndex)], "critical")];
}

function invalidOutput(input: GovernedRuntimePreflightInputV1, state: GovernedRuntimeStateV1, blockers: GovernedRuntimeBlockerV1[], sourceRef: string): GovernedRuntimePreflightV1 {
  const runtimePolicyHash = governedRuntimePolicyHash();
  const finalBlockers = dedupeBlockers(blockers);
  return {
    schemaVersion: "lightbi.governed-runtime-preflight.v1", identity: deterministicPolicySha256({ state, sourceRef, actionCandidateId: input.actionCandidate?.actionCandidateId ?? null, blockers: finalBlockers, runtimePolicyHash }), state,
    domainPackId: "commerce_distribution_mvp", sourceReference: sourceRef, actionCandidateId: input.actionCandidate?.actionCandidateId ?? null, metricId: input.actionCandidate?.metricId ?? null, metricVersion: null,
    runtimePolicyHash, metricPolicyHash: governedMetricPolicyHash(), questionPolicyHash: questionActionPolicyHash(), planningAllowed: false, executionAllowed: false, action: null,
    blockers: finalBlockers, restrictions: [restriction("DECISION_USE_PROHIBITED", "Runtime preflight or execution does not authorize BA or decision use.")], evidence: [], runtimeActionCreated: false, runtimeActionAuthorized: false,
    executionPerformed: false, decisionUseAuthorized: false, productionWiring: { executed: false },
  };
}

export function preflightGovernedRuntimeAction(input: GovernedRuntimePreflightInputV1): GovernedRuntimePreflightV1 {
  const runtimePolicyHash = governedRuntimePolicyHash();
  const sourceRef = sourceReference(input.canonicalSource);
  if (!input.actionCandidate) return invalidOutput(input, "unavailable", [blocker("explanation_only_or_action_candidate_unavailable", "action")], sourceRef);
  const actionCandidate = input.actionCandidate;
  const integrity: GovernedRuntimeBlockerV1[] = [];
  if (input.expectedRuntimePolicyHash !== runtimePolicyHash) integrity.push(blocker("runtime_policy_hash_mismatch", "integrity", [input.expectedRuntimePolicyHash, runtimePolicyHash], "critical"));
  if (input.metricPreflight.policyHash !== governedMetricPolicyHash() || input.questionGeneration.metricPolicyHash !== governedMetricPolicyHash()) integrity.push(blocker("metric_policy_hash_mismatch", "integrity", [input.metricPreflight.policyHash, input.questionGeneration.metricPolicyHash], "critical"));
  if (input.questionGeneration.questionPolicyHash !== questionActionPolicyHash()) integrity.push(blocker("question_policy_hash_mismatch", "integrity", [input.questionGeneration.questionPolicyHash], "critical"));
  if (input.questionGeneration.canonicalSourceReference !== sourceRef || input.metricPreflight.sourceReferences.length !== 1 || input.metricPreflight.sourceReferences[0] !== sourceRef) integrity.push(blocker("invalid_canonical_source_binding", "integrity", [sourceRef, input.questionGeneration.canonicalSourceReference, ...input.metricPreflight.sourceReferences], "critical"));
  if (input.questionGeneration.domainPackId !== "commerce_distribution_mvp" || input.metricPreflight.domainPackId !== "commerce_distribution_mvp" || actionCandidate.domainPackId !== "commerce_distribution_mvp") integrity.push(blocker("unsupported_domain_pack", "integrity", [], "critical"));
  const expectedMetricPreflightIdentity = deterministicPolicySha256({ policyHash: input.metricPreflight.policyHash, sourceReferences: input.metricPreflight.sourceReferences, tuningAllowed: input.metricPreflight.tuningAllowed, metrics: input.metricPreflight.metrics });
  if (input.metricPreflight.identity !== expectedMetricPreflightIdentity) integrity.push(blocker("metric_preflight_identity_mismatch", "integrity", [input.metricPreflight.identity, expectedMetricPreflightIdentity], "critical"));
  const expectedGenerationIdentity = deterministicPolicySha256({ sourceRef, domainActivationReference: input.questionGeneration.domainActivationReference, metricPreflightReference: input.questionGeneration.metricPreflightReference, policyHash: input.questionGeneration.questionPolicyHash, defaultQuestions: input.questionGeneration.defaultQuestions, candidateQuestions: input.questionGeneration.candidateQuestions, actionCandidates: input.questionGeneration.actionCandidates, blockers: input.questionGeneration.blockers });
  if (input.questionGeneration.identity !== expectedGenerationIdentity) integrity.push(blocker("question_generation_identity_mismatch", "integrity", [input.questionGeneration.identity, expectedGenerationIdentity], "critical"));
  const retained = input.questionGeneration.actionCandidates.find((item) => item.actionCandidateId === actionCandidate.actionCandidateId);
  if (!retained || canonicalJson(retained) !== canonicalJson(actionCandidate)) integrity.push(blocker("action_candidate_not_in_governed_generation", "action", [actionCandidate.actionCandidateId], "critical"));
  const governedFamily = COMMERCE_DISTRIBUTION_QUESTION_POLICY_V1.questionFamilies.find((item) => item.questionId === actionCandidate.questionId);
  if (!governedFamily || governedFamily.metricId !== actionCandidate.metricId || governedFamily.title !== actionCandidate.title || governedFamily.businessPurpose !== actionCandidate.businessPurpose || governedFamily.actionKind !== actionCandidate.actionKind) integrity.push(blocker("action_candidate_differs_from_question_policy", "action", [actionCandidate.questionId], "critical"));
  if (actionCandidate.executable !== false || actionCandidate.runtimeActionCreated || actionCandidate.runtimeActionAuthorized || actionCandidate.executionPerformed || actionCandidate.productionWiring.executed) integrity.push(blocker("upstream_action_authority_or_production_mutation", "integrity", [actionCandidate.actionCandidateId], "critical"));
  if (integrity.length) return invalidOutput(input, "invalid", integrity, sourceRef);

  const definition = GOVERNED_METRIC_DEFINITIONS_V1.find((item) => item.metricId === actionCandidate.metricId);
  const metric = metricItem(input);
  if (!definition || !metric) return invalidOutput(input, "unavailable", [blocker("metric_definition_or_unique_preflight_unavailable", "metric", [actionCandidate.metricId], "critical")], sourceRef);
  const blockers: GovernedRuntimeBlockerV1[] = metric.blockers.map((item) => blocker(item.code, "metric", item.references, item.severity));
  if (!["ready", "conditionally_ready"].includes(metric.state)) blockers.push(blocker(`metric_preflight_not_executable:${metric.state}`, "metric", [metric.metricId], "critical"));
  if (metric.state === "conditionally_ready" && !(GOVERNED_RUNTIME_POLICY_V1.conditionallyExecutableMetricIds as readonly string[]).includes(metric.metricId)) blockers.push(blocker("conditional_metric_not_permitted_for_runtime", "metric", [metric.metricId], "critical"));
  if (!metric.semanticRequirementsSatisfied || !metric.grainCompatible || !metric.operatorValid || !metric.timeCompatible) blockers.push(blocker("metric_preflight_compatibility_incomplete", "metric", [metric.metricId], "critical"));
  if (!metric.duplicateHandlingSatisfied) blockers.push(blocker("duplicate_or_repeated_total_handling_unproved", "duplicate", [metric.metricId], "critical"));
  if (!metric.relationshipRequirementsSatisfied) blockers.push(blocker("relationship_requirements_unproved", "relationship", [metric.metricId], "critical"));
  if (metric.unitCompatible === false) blockers.push(blocker("unit_incompatible", "unit_currency", [metric.metricId], "critical"));
  if (metric.currencyCompatible === false) blockers.push(blocker("currency_incompatible", "unit_currency", [metric.metricId], "critical"));
  if (metric.metricId === "gross_profit" && metric.currencyCompatible !== true) blockers.push(blocker("gross_profit_currency_compatibility_not_proved", "unit_currency", [metric.metricId], "critical"));
  if (definition.executionAuthorization !== false || definition.approvalState !== "governed_definition") blockers.push(blocker("invalid_metric_definition_authority", "metric", [definition.metricId], "critical"));

  const metricBindings: GovernedColumnBindingV1[] = [];
  definition.requirements.forEach((_, index) => {
    const result = requirementBinding(input.canonicalSource, definition, index, metric);
    blockers.push(...result.blockers);
    if (result.binding) metricBindings.push(result.binding);
  });
  let grossProfitCurrencyEvidence: NonNullable<CanonicalMetricSourceV1["sourceEvidence"]>["currency"] = [];
  if (metric.metricId === "gross_profit") {
    const expectedIds = unique(metric.currencyEvidenceIds);
    const current = (input.canonicalSource.sourceEvidence?.currency ?? []).filter((item) => currencyEvidenceMatchesSource(item, input.canonicalSource));
    const currentIds = unique(current.map((item) => item.evidenceId));
    const selectedColumns = metricBindings.map((binding) => binding.physicalColumn);
    const scopeValid = current.every((item) => item.scope === "all_money_measures" || selectedColumns.every((column) => item.applicableMonetaryColumns.includes(column)));
    const currencyValues = unique(current.map((item) => item.currency));
    const periods = unique(current.map((item) => item.reportingPeriod));
    if (expectedIds.length !== 1 || currentIds.length !== 1 || canonicalJson(expectedIds) !== canonicalJson(currentIds) || !scopeValid || currencyValues.length !== 1 || periods.length !== 1) {
      blockers.push(blocker("gross_profit_source_bound_currency_evidence_mismatch", "unit_currency", [...expectedIds, ...currentIds], "critical"));
    } else {
      grossProfitCurrencyEvidence = current;
    }
    const identity = input.canonicalSource.grain.signature.identityBasis;
    if (!metric.selectedIdentityCandidateId || !identity.selectedCandidateIds.includes(metric.selectedIdentityCandidateId)) blockers.push(blocker("gross_profit_selected_identity_not_preserved", "grain", [metric.selectedIdentityCandidateId ?? "missing"], "critical"));
  }
  const inventorySnapshot = validateInventorySnapshotEvidence(input, metric);
  blockers.push(...inventorySnapshot.blockers);
  let governedCountIdentityEvidence: CanonicalSourceDocumentIdentityEvidenceV1[] = [];
  if (metric.metricId === "delivery_count") {
    const binding = metricBindings.find((item) => item.role === "identity" && item.semanticId === "shipment");
    const sourceBoundIdentity = binding ? sourceBoundDocumentIdentity(input.canonicalSource, binding) : null;
    const identityCandidateId = binding ? exactMetricIdentity(input.canonicalSource, binding) : null;
    if (!identityCandidateId && !sourceBoundIdentity) blockers.push(blocker("governed_delivery_identity_not_proved", "grain", binding ? [binding.semanticId, String(binding.sourceColumnIndex)] : [], "critical"));
    if (sourceBoundIdentity) governedCountIdentityEvidence = [sourceBoundIdentity];
  } else if (metric.metricId === "transaction_count") {
    const identityIds = input.canonicalSource.grain.signature.identityBasis.selectedCandidateIds;
    const sourceBoundIdentities = metricBindings.flatMap((binding) => {
      const item = sourceBoundDocumentIdentity(input.canonicalSource, binding);
      return item ? [item] : [];
    });
    const grainIdentityReady = metricBindings.some((binding) => identityIds.includes(binding.semanticId))
      && USABLE_STATES.has(input.canonicalSource.grain.signature.identityBasis.state);
    if (!grainIdentityReady && sourceBoundIdentities.length !== 1) blockers.push(blocker("governed_identity_semantics_not_bound_to_grain", "grain", identityIds, "critical"));
    if (sourceBoundIdentities.length === 1) governedCountIdentityEvidence = sourceBoundIdentities;
  }
  const dimensions = validateDimensionBindings(input); blockers.push(...dimensions.blockers);
  const time = validateTimeBinding(input); blockers.push(...time.blockers);
  blockers.push(...validateAsOf(input, metric.metricId));
  if (metric.metricId === "inventory_on_hand" && dimensions.bindings.some((item) => ["report_date", "time_period"].includes(item.semanticId))) blockers.push(blocker("snapshot_grouping_across_time_prohibited", "time", dimensions.bindings.map((item) => item.semanticId), "critical"));
  if (input.filters?.some((filter) => !semanticBinding(input.canonicalSource, filter.semanticId, "dimension", `filter:${filter.semanticId}`).some((item) => item.sourceColumnIndex === filter.sourceColumnIndex))) blockers.push(blocker("invalid_structured_filter_binding", "dimension", [], "critical"));

  const finalBlockers = dedupeBlockers(blockers);
  if (finalBlockers.length) return invalidOutput(input, "blocked", finalBlockers, sourceRef);
  const state: GovernedRuntimeStateV1 = metric.state === "conditionally_ready" ? "conditionally_executable" : "executable";
  const restrictions = dedupeRestrictions([
    restriction("DECISION_USE_PROHIBITED", "Successful metric execution is evidence only and cannot authorize a business decision."),
    restriction("PRODUCTION_WIRING_PROHIBITED", "Phase 5M3 remains isolated from production consumers."),
    ...metric.limitations.map((item) => restriction(`METRIC_LIMITATION:${item.code}`, "The metric preflight limitation remains active.", item.references)),
    ...actionCandidate.limitations.map((item) => restriction(`ACTION_LIMITATION:${item.code}`, "The action-candidate limitation remains active.", item.references)),
    ...(state === "conditionally_executable" ? [restriction("CONDITIONAL_EXECUTION_ONLY", "Execution is permitted only with all upstream limitations retained.", [metric.metricId], "critical")] : []),
  ]);
  const runtimeEvidence = [
    evidence(`metric:${definition.metricId}:${definition.version}`, "metric_definition", [governedMetricPolicyHash(), definition.aggregationOperator], "governed_policy"),
    evidence(`preflight:${input.metricPreflight.identity}`, "metric_preflight", [metric.state, metric.metricId], "governed_preflight"),
    evidence(`runtime-policy:${runtimePolicyHash}`, "runtime_policy", [runtimePolicyHash], "governed_policy"),
    evidence(`grain:${metric.metricId}`, "grain", [input.canonicalSource.grain.signature.structuralForm.value, input.canonicalSource.grain.signature.temporalMode.value], "canonical_artifact"),
    ...metricBindings.map((binding) => evidence(`binding:${binding.requirementId}`, "canonical_binding", [binding.semanticId, String(binding.sourceColumnIndex), binding.physicalColumn], "canonical_artifact")),
    ...governedCountIdentityEvidence.map((item) => evidence(item.evidenceId, "document_identity", [item.semanticId, item.physicalColumn, item.provenance.kind, item.provenance.reference], "source_bound_contract")),
    ...grossProfitCurrencyEvidence.map((item) => evidence(item.evidenceId, "currency", [item.currency, item.reportingPeriod, item.scope, item.provenance.kind, item.provenance.reference, ...item.applicableMonetaryColumns], "source_bound_contract")),
    ...(inventorySnapshot.evidence ?? []).map((item) => evidence(item.evidenceId, "inventory_snapshot", [item.asOf.value, item.unit.value, item.itemIdentity.physicalColumn, item.warehouseIdentity.physicalColumn, item.quantity.physicalColumn], "source_bound_contract")),
    ...dimensions.bindings.map((binding) => evidence(`group:${binding.semanticId}`, "canonical_binding", [String(binding.sourceColumnIndex), binding.physicalColumn], "canonical_artifact")),
  ];
  const operator = (GOVERNED_RUNTIME_POLICY_V1.operators as Readonly<Record<string, GovernedRuntimeActionV1["operator"]>>)[metric.metricId];
  const actionIdentity = deterministicPolicySha256({ actionCandidateId: actionCandidate.actionCandidateId, metricId: metric.metricId, metricVersion: metric.metricVersion, sourceRef, operator, metricBindings, groupingBindings: dimensions.bindings, timeBinding: time.binding, asOfBasis: input.asOfBasis ?? null, filters: input.filters ?? [], restrictions, runtimePolicyHash });
  const action: GovernedRuntimeActionV1 = {
    schemaVersion: "lightbi.governed-runtime-contract.v1", actionId: `runtime-action:${actionIdentity}`, sourceActionCandidateId: actionCandidate.actionCandidateId, questionId: actionCandidate.questionId,
    domainPackId: "commerce_distribution_mvp", metricId: metric.metricId, metricVersion: metric.metricVersion, sourceReference: sourceRef, operator, metricBindings,
    groupingBindings: dimensions.bindings, timeBinding: time.binding, asOfBasis: input.asOfBasis ?? null, filters: [...(input.filters ?? [])], restrictions, evidence: runtimeEvidence,
    runtimeActionCreated: true, runtimeActionAuthorized: true, executionPerformed: false, decisionUseAuthorized: false, productionWiring: { executed: false },
  };
  const identity = governedRuntimePreflightIdentity(state, action, runtimePolicyHash);
  return {
    schemaVersion: "lightbi.governed-runtime-preflight.v1", identity, state, domainPackId: "commerce_distribution_mvp", sourceReference: sourceRef, actionCandidateId: actionCandidate.actionCandidateId,
    metricId: metric.metricId, metricVersion: metric.metricVersion, runtimePolicyHash, metricPolicyHash: governedMetricPolicyHash(), questionPolicyHash: questionActionPolicyHash(), planningAllowed: true, executionAllowed: true,
    action, blockers: [], restrictions, evidence: runtimeEvidence, runtimeActionCreated: true, runtimeActionAuthorized: true, executionPerformed: false, decisionUseAuthorized: false, productionWiring: { executed: false },
  };
}
