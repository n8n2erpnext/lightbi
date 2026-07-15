import { deterministicPolicySha256 } from "./contextual-evidence-policy";
import type {
  CanonicalMetricSourceV1,
  GovernedMetricBlockerV1,
  GovernedMetricDefinitionV1,
  GovernedMetricEvidenceV1,
  GovernedMetricLimitationV1,
  GovernedMetricPreflightInputV1,
  GovernedMetricPreflightItemV1,
  GovernedMetricPreflightV1,
  GovernedMetricRemediationV1,
  GovernedMetricRequirementV1,
  GovernedMetricStateV1,
} from "./governed-domain-metric-contracts";
import { GOVERNED_METRIC_DEFINITIONS_V1, GOVERNED_METRIC_POLICY_V1, governedMetricPolicyHash } from "./governed-metric-policy";

const USABLE_SEMANTIC_STATES = new Set(["confirmed", "probable"]);
const USABLE_GRAIN_STATES = new Set(["confirmed", "probable"]);
const BLOCKED_CAPABILITY_STATES = new Set(["blocked", "unknown", "unsupported"]);

function unique<T>(items: readonly T[]): T[] { return [...new Set(items)]; }
function sourceRef(source: CanonicalMetricSourceV1): string {
  const hash = source.physical.provenance.sourceHash;
  return `source:${hash?.algorithm === "sha256" ? hash.value : deterministicPolicySha256(source.physical.provenance.sourceId)}`;
}
function blocker(code: string, references: string[] = [], severity: GovernedMetricBlockerV1["severity"] = "material"): GovernedMetricBlockerV1 { return { code, severity, references: unique(references).sort() }; }
function limitation(code: string, references: string[] = []): GovernedMetricLimitationV1 { return { code, references: unique(references).sort() }; }
function remediation(code: string): GovernedMetricRemediationV1 { return { code, parameters: {} }; }
function evidence(evidenceId: string, kind: GovernedMetricEvidenceV1["kind"], references: string[], provenance: GovernedMetricEvidenceV1["provenance"]): GovernedMetricEvidenceV1 { return { evidenceId, kind, references: unique(references).sort(), provenance }; }

function dedupeBlockers(items: GovernedMetricBlockerV1[]): GovernedMetricBlockerV1[] {
  const map = new Map<string, GovernedMetricBlockerV1>();
  for (const item of items) {
    const current = map.get(item.code);
    map.set(item.code, { code: item.code, severity: current?.severity === "critical" || item.severity === "critical" ? "critical" : "material", references: unique([...(current?.references ?? []), ...item.references]).sort() });
  }
  return [...map.values()].sort((a, b) => a.code.localeCompare(b.code));
}
function dedupeLimitations(items: GovernedMetricLimitationV1[]): GovernedMetricLimitationV1[] {
  const map = new Map<string, GovernedMetricLimitationV1>();
  for (const item of items) map.set(item.code, { code: item.code, references: unique([...(map.get(item.code)?.references ?? []), ...item.references]).sort() });
  return [...map.values()].sort((a, b) => a.code.localeCompare(b.code));
}

function integrityBlockers(source: CanonicalMetricSourceV1): GovernedMetricBlockerV1[] {
  const ref = sourceRef(source);
  const id = source.physical.provenance.sourceId;
  const result: GovernedMetricBlockerV1[] = [];
  if (source.semantic.sourceId !== id || source.grain.sourceId !== id || !source.readiness.identity.sourceIds.includes(id)) result.push(blocker("canonical_source_identity_mismatch", [ref], "critical"));
  const hash = source.physical.provenance.sourceHash;
  if (hash?.algorithm === "sha256" && (source.semantic.sourceHash?.value !== hash.value || source.grain.sourceHash?.value !== hash.value)) result.push(blocker("canonical_source_hash_mismatch", [ref], "critical"));
  if (source.physical.sourceProfile.profilingScope !== "full" || source.physical.sourceProfile.dataRegion.selectionStatus !== "selected") result.push(blocker("full_file_physical_profile_required", [ref], "critical"));
  if (source.semantic.productionWiring.executed || source.grain.productionWiring.executed || source.readiness.productionWiring.executed) result.push(blocker("unexpected_upstream_production_wiring", [ref], "critical"));
  return result;
}

function matchingColumns(source: CanonicalMetricSourceV1, signals: readonly string[]) {
  return source.semantic.columns.filter((column) => column.selectedCandidateId !== null && signals.includes(column.selectedCandidateId) && USABLE_SEMANTIC_STATES.has(column.finalState));
}

function requirementSources(requirement: GovernedMetricRequirementV1, sources: readonly CanonicalMetricSourceV1[]) {
  return sources.flatMap((source) => {
    const columns = matchingColumns(source, requirement.semanticSignals);
    const satisfied = requirement.semanticMode === "all"
      ? requirement.semanticSignals.every((signal) => columns.some((column) => column.selectedCandidateId === signal))
      : columns.length > 0;
    return satisfied ? [{ source, columns }] : [];
  });
}

function hasAmbiguousUnitOrCurrency(source: CanonicalMetricSourceV1, signal: "currency" | "uom"): boolean {
  return source.semantic.columns.some((column) => column.candidateTraces.some((trace) => trace.candidateId === signal) && ["ambiguous", "unknown"].includes(column.finalState));
}
function explicitSignal(source: CanonicalMetricSourceV1, signal: "currency" | "uom"): boolean { return matchingColumns(source, [signal]).length === 1; }
function signalColumnCount(source: CanonicalMetricSourceV1, signal: "currency" | "uom"): number {
  return source.semantic.columns.filter((column) => column.selectedCandidateId === signal || column.candidateTraces.some((trace) => trace.candidateId === signal)).length;
}

function baseUnavailable(metricId: string, state: GovernedMetricStateV1, code: string, policyHash: string): GovernedMetricPreflightItemV1 {
  return {
    metricId,
    metricVersion: "unknown",
    state,
    metricDefinitionAvailable: false,
    semanticRequirementsSatisfied: false,
    grainCompatible: false,
    operatorValid: false,
    timeCompatible: false,
    unitCompatible: null,
    currencyCompatible: null,
    duplicateHandlingSatisfied: false,
    relationshipRequirementsSatisfied: false,
    evidence: [evidence("policy:metric_catalog", "policy", [policyHash], "governed_policy")],
    blockers: [blocker(code, [], "critical")],
    limitations: [],
    remediation: [remediation("select_supported_metric")],
    metricDefinitionAvailableFlag: true,
    metricPreflightExecuted: true,
    runtimeActionCreated: false,
    runtimeActionAuthorized: false,
    metricExecutionExecuted: false,
    decisionUseAuthorized: false,
    result: null,
    productionWiring: { executed: false },
  };
}

function evaluateMetric(definition: GovernedMetricDefinitionV1, sources: readonly CanonicalMetricSourceV1[], globalBlockers: GovernedMetricBlockerV1[], policyHash: string): GovernedMetricPreflightItemV1 {
  const blockers = [...globalBlockers];
  const limitations: GovernedMetricLimitationV1[] = [];
  const remediations: GovernedMetricRemediationV1[] = [];
  const metricEvidence: GovernedMetricEvidenceV1[] = [evidence("policy:governed_metric_definition", "policy", [definition.metricId, definition.version, policyHash], "governed_policy")];
  const matches = definition.requirements.map((requirement) => ({ requirement, matches: requirementSources(requirement, sources) }));
  const semanticRequirementsSatisfied = matches.every((entry) => entry.matches.length > 0);
  if (!semanticRequirementsSatisfied) {
    for (const entry of matches.filter((item) => item.matches.length === 0)) {
      blockers.push(blocker(`missing_semantic_requirement:${entry.requirement.requirementId}`));
      remediations.push(remediation("confirm_column_meaning"));
    }
  }

  const matchedSources = unique(matches.flatMap((entry) => entry.matches.map((match) => match.source)));
  for (const entry of matches) for (const match of entry.matches) for (const column of match.columns) {
    metricEvidence.push(evidence(`semantic:${column.selectedCandidateId}`, "semantic", [sourceRef(match.source), `column:${column.sourceColumnIndex}`], "canonical_resolution"));
  }

  const grainCompatible = matches.every((entry) => entry.matches.some(({ source }) => entry.requirement.allowedStructuralForms.includes(source.grain.signature.structuralForm.value) && USABLE_GRAIN_STATES.has(source.grain.signature.structuralForm.state)));
  if (semanticRequirementsSatisfied && !grainCompatible) { blockers.push(blocker("metric_grain_incompatible", matchedSources.map(sourceRef))); remediations.push(remediation("confirm_grain")); }

  const timeCompatible = matches.every((entry) => entry.matches.some(({ source }) => entry.requirement.allowedTemporalModes.includes(source.grain.signature.temporalMode.value) && USABLE_GRAIN_STATES.has(source.grain.signature.temporalMode.state)));
  if (semanticRequirementsSatisfied && !timeCompatible) { blockers.push(blocker("metric_time_basis_incompatible_or_missing", matchedSources.map(sourceRef))); remediations.push(remediation("provide_period_semantics")); }

  let duplicateHandlingSatisfied = true;
  if (["sum", "derive_subtraction"].includes(definition.aggregationOperator)) {
    for (const source of matchedSources) {
      const form = source.grain.signature.aggregationForm.value;
      const boundColumns = new Set(matches.flatMap((entry) => entry.matches.filter((match) => match.source === source).flatMap((match) => match.columns.map((column) => column.physicalColumn))));
      const boundMeasureRisks = source.grain.signature.measureSafety.observations
        .filter((observation) => boundColumns.has(observation.physicalColumn))
        .some((observation) => observation.behaviors.some((behavior) => ["non_additive_candidate", "semi_additive_candidate", "repeated_measure_risk", "unresolved_measure_role", "dimension_or_code_candidate"].includes(behavior)));
      const risk = boundMeasureRisks || ["repeated_parent_values", "mixed_aggregation", "unresolved"].includes(form);
      if (risk) {
        duplicateHandlingSatisfied = false;
        blockers.push(blocker("repeated_or_unresolved_measure_aggregation", [sourceRef(source)]));
        remediations.push(remediation("remove_repeated_totals"));
      }
    }
  }

  if (["transaction_count", "delivery_count"].includes(definition.metricId)) {
    const identityReady = matchedSources.some((source) => USABLE_GRAIN_STATES.has(source.grain.signature.identityBasis.state) && source.grain.signature.identityBasis.selectedCandidateIds.length > 0);
    if (!identityReady) { blockers.push(blocker("governed_identity_required_for_count", matchedSources.map(sourceRef))); remediations.push(remediation("select_or_confirm_key")); }
  }

  if (definition.metricId === "inventory_on_hand") {
    const snapshotCompatible = matchedSources.some((source) => source.grain.signature.aggregationForm.value === "snapshot_values" && ["snapshot", "effective_time"].includes(source.grain.signature.temporalMode.value));
    if (!snapshotCompatible) blockers.push(blocker("inventory_snapshot_as_of_basis_required", matchedSources.map(sourceRef)));
  }
  if (definition.metricId === "quantity_sold" && sources.some((source) => source.grain.signature.aggregationForm.value === "snapshot_values" || source.grain.signature.temporalMode.value === "snapshot")) blockers.push(blocker("snapshot_quantity_cannot_be_quantity_sold", sources.map(sourceRef)));

  let currencyCompatible: boolean | null = null;
  let unitCompatible: boolean | null = null;
  const requiresCurrency = ["sales_revenue", "gross_profit"].includes(definition.metricId);
  const requiresUnit = ["quantity_sold", "inventory_on_hand"].includes(definition.metricId);
  if (requiresCurrency) {
    if (matchedSources.some((source) => hasAmbiguousUnitOrCurrency(source, "currency") || signalColumnCount(source, "currency") > 1)) {
      currencyCompatible = false;
      blockers.push(blocker("currency_basis_ambiguous_or_incompatible", matchedSources.map(sourceRef)));
    } else if (matchedSources.length > 0 && matchedSources.every((source) => explicitSignal(source, "currency"))) currencyCompatible = true;
    else { limitations.push(limitation("currency_basis_not_explicit", matchedSources.map(sourceRef))); remediations.push(remediation("confirm_currency")); }
  }
  if (requiresUnit) {
    if (matchedSources.some((source) => hasAmbiguousUnitOrCurrency(source, "uom") || signalColumnCount(source, "uom") > 1)) {
      unitCompatible = false;
      blockers.push(blocker("unit_basis_ambiguous_or_incompatible", matchedSources.map(sourceRef)));
    } else if (matchedSources.length > 0 && matchedSources.every((source) => explicitSignal(source, "uom"))) unitCompatible = true;
    else { limitations.push(limitation("unit_basis_not_explicit", matchedSources.map(sourceRef))); remediations.push(remediation("confirm_unit_of_measure")); }
  }

  let relationshipRequirementsSatisfied = true;
  if (matchedSources.length > 1) {
    relationshipRequirementsSatisfied = false;
    blockers.push(blocker("cross_source_metric_requires_governed_relationship", matchedSources.map(sourceRef), "critical"));
    remediations.push(remediation("provide_relationship_contract"));
  }

  for (const capabilityId of definition.requiredReadinessCapabilities) {
    const relevant = matchedSources.length > 0 ? matchedSources : sources;
    const states = relevant.map((source) => source.readiness.capabilities.find((item) => item.capabilityId === capabilityId)?.state ?? "unknown");
    if (states.length > 0 && states.every((state) => BLOCKED_CAPABILITY_STATES.has(state))) blockers.push(blocker(`required_readiness_unavailable:${capabilityId}`, relevant.map(sourceRef)));
    else if (states.some((state) => state !== "ready")) limitations.push(limitation(`required_readiness_conditional:${capabilityId}`, relevant.map(sourceRef)));
  }

  const finalBlockers = dedupeBlockers(blockers);
  const finalLimitations = dedupeLimitations(limitations);
  const state: GovernedMetricStateV1 = sources.length === 0
    ? "unknown"
    : finalBlockers.length > 0
      ? "blocked"
      : finalLimitations.length > 0
        ? "conditionally_ready"
        : "ready";
  return {
    metricId: definition.metricId,
    metricVersion: definition.version,
    state,
    metricDefinitionAvailable: true,
    semanticRequirementsSatisfied,
    grainCompatible,
    operatorValid: true,
    timeCompatible,
    unitCompatible,
    currencyCompatible,
    duplicateHandlingSatisfied,
    relationshipRequirementsSatisfied,
    evidence: metricEvidence.sort((a, b) => a.evidenceId.localeCompare(b.evidenceId) || a.references.join("|").localeCompare(b.references.join("|"))),
    blockers: finalBlockers,
    limitations: finalLimitations,
    remediation: unique(remediations.map((item) => item.code)).sort().map(remediation),
    metricDefinitionAvailableFlag: true,
    metricPreflightExecuted: true,
    runtimeActionCreated: false,
    runtimeActionAuthorized: false,
    metricExecutionExecuted: false,
    decisionUseAuthorized: false,
    result: null,
    productionWiring: { executed: false },
  };
}

export function preflightGovernedMetrics(input: GovernedMetricPreflightInputV1): GovernedMetricPreflightV1 {
  const policyHash = governedMetricPolicyHash();
  const invalidPolicy = input.expectedPolicyHash !== policyHash;
  const invalidTuning = input.evaluationContext.tuningUse === "allowed" && !["synthetic", "golden"].includes(input.evaluationContext.group);
  const globalBlockers = input.sources.flatMap(integrityBlockers);
  if (input.sources.length === 0) globalBlockers.push(blocker("canonical_source_required", [], "critical"));
  if (invalidPolicy) globalBlockers.push(blocker("governed_metric_policy_hash_mismatch", [input.expectedPolicyHash, policyHash], "critical"));
  if (invalidTuning) globalBlockers.push(blocker("evaluation_only_group_cannot_tune_policy", [], "critical"));

  const requested = new Set(input.metricIds ?? GOVERNED_METRIC_POLICY_V1.metricOrder);
  const knownDefinitions = GOVERNED_METRIC_DEFINITIONS_V1.filter((definition) => requested.has(definition.metricId));
  const unknown = [...requested].filter((metricId) => !GOVERNED_METRIC_DEFINITIONS_V1.some((definition) => definition.metricId === metricId)).sort();
  const metricOrder = new Map<string, number>(GOVERNED_METRIC_POLICY_V1.metricOrder.map((metricId, index) => [metricId, index]));
  const metrics = [
    ...knownDefinitions.map((definition) => evaluateMetric(definition, input.sources, globalBlockers, policyHash)),
    ...unknown.map((metricId) => baseUnavailable(metricId, "unsupported", "metric_definition_unavailable", policyHash)),
  ].sort((a, b) => (metricOrder.get(a.metricId) ?? Number.MAX_SAFE_INTEGER) - (metricOrder.get(b.metricId) ?? Number.MAX_SAFE_INTEGER) || a.metricId.localeCompare(b.metricId));
  const sourceReferences = input.sources.map(sourceRef).sort();
  const tuningAllowed = input.evaluationContext.tuningUse === "allowed" && !invalidTuning;
  const identity = deterministicPolicySha256({ policyHash, sourceReferences, tuningAllowed, metrics });
  return {
    schemaVersion: "lightbi.governed-metric-preflight.v1",
    domainPackId: "commerce_distribution_mvp",
    policyVersion: "lightbi.governed-metric-policy.v1",
    policyHash,
    identity,
    sourceReferences,
    tuningAllowed,
    metrics,
    blockers: dedupeBlockers(metrics.flatMap((metric) => metric.blockers)),
    limitations: dedupeLimitations(metrics.flatMap((metric) => metric.limitations)),
    metricResultsProduced: false,
    runtimeActionCreated: false,
    runtimeActionAuthorized: false,
    metricExecutionExecuted: false,
    decisionUseAuthorized: false,
    productionWiring: { executed: false },
  };
}
