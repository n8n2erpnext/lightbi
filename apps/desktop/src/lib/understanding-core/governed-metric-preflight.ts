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
  GovernedMetricSelectedBindingV1,
  GovernedMetricStateV1,
} from "./governed-domain-metric-contracts";
import { currencyEvidenceMatchesSource, documentIdentityEvidenceMatchesSource, inventorySnapshotEvidenceMatchesSource, lineMeasureEvidenceMatchesSource } from "./canonical-source-evidence";
import { GOVERNED_METRIC_DEFINITIONS_V1, GOVERNED_METRIC_POLICY_V1, governedMetricPolicyHash } from "./governed-metric-policy";
import { SEMANTIC_SIGNAL_BY_ID } from "../semantic-registry";

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

function exactMetricIdentity(source: CanonicalMetricSourceV1, signals: readonly string[]): { candidateId: string; physicalColumn: string } | null {
  const semantic = matchingColumns(source, signals);
  if (semantic.length !== 1) return null;
  const column = semantic[0];
  const profile = source.physical.sourceProfile.columns.find((item) => item.sourceColumnIndex === column.sourceColumnIndex);
  if (!profile || profile.nullCount !== 0 || profile.cardinality.mode !== "exact" || profile.uniqueness.uniquenessRatio !== 1) return null;
  const candidateId = `key:${column.sourceColumnIndex}`;
  const identity = source.grain.signature.identityBasis;
  const retained = [...identity.selectedCandidateIds, ...identity.alternativeCandidateIds].includes(candidateId);
  const evidenced = identity.supportingEvidenceReferences.includes(`${candidateId}:identity`) && identity.supportingEvidenceReferences.includes(`${candidateId}:unique`);
  return retained && evidenced ? { candidateId, physicalColumn: column.physicalColumn } : null;
}

function metricBoundMeasuresAreAtomic(
  source: CanonicalMetricSourceV1,
  boundColumns: ReadonlySet<string>,
): boolean {
  if (boundColumns.size === 0) return false;
  const observations = source.grain.signature.measureSafety.observations.filter((item) => boundColumns.has(item.physicalColumn));
  if (observations.length !== boundColumns.size || observations.some((item) => item.repeatedWithinParent === true)) return false;
  const unsafe = new Set(["non_additive_candidate", "semi_additive_candidate", "repeated_measure_risk", "unresolved_measure_role", "dimension_or_code_candidate"]);
  return observations.every((item) => item.behaviors.includes("additive_candidate") && !item.behaviors.some((behavior) => unsafe.has(behavior)));
}

function atomicMeasureColumns(source: CanonicalMetricSourceV1, columns: ReturnType<typeof matchingColumns>) {
  const unsafe = new Set(["non_additive_candidate", "semi_additive_candidate", "repeated_measure_risk", "unresolved_measure_role", "dimension_or_code_candidate"]);
  const unitOrRateSignals = new Set(["unit", "uom", "unit_price", "rate", "percentage"]);
  return columns.filter((column) => {
    const observation = source.grain.signature.measureSafety.observations.find((item) => item.physicalColumn === column.physicalColumn);
    const competingUnitOrRateEvidence = column.candidateTraces.some((trace) => unitOrRateSignals.has(trace.candidateId)
      && trace.lexicalClass !== "none"
      && trace.completeEvidenceProfile.familyAssessments.some((family) => family.family === "lexical_identity" && family.assessment === "supports"));
    return observation?.repeatedWithinParent !== true
      && observation?.behaviors.includes("additive_candidate") === true
      && !observation.behaviors.some((behavior) => unsafe.has(behavior))
      && !competingUnitOrRateEvidence;
  });
}

function averageMeasureColumns(source: CanonicalMetricSourceV1, columns: ReturnType<typeof matchingColumns>) {
  const forbiddenBehaviors = new Set(["unresolved_measure_role", "repeated_measure_risk"]);
  return columns.filter((column) => {
    const profile = source.physical.sourceProfile.columns.find((item) => item.sourceColumnIndex === column.sourceColumnIndex);
    const observation = source.grain.signature.measureSafety.observations.find((item) => item.physicalColumn === column.physicalColumn);
    const numericShape = profile?.physicalTypeCandidates.some((item) =>
      ["number", "integer", "float", "double", "decimal", "numeric_string"].includes(item.type)) === true;
    const numericParseFailures = profile?.parseEvidence.find((item) => item.parser === "numeric")?.failureCount ?? 0;
    const governedMeasureSemantic = column.selectedCandidateId !== null
      && SEMANTIC_SIGNAL_BY_ID.get(column.selectedCandidateId)?.role === "measure";
    return numericShape
      && numericParseFailures === 0
      && profile?.technicalColumnEvidence.length === 0
      && observation !== undefined
      && observation?.repeatedWithinParent !== true
      && governedMeasureSemantic
      && !observation?.behaviors.some((behavior) => forbiddenBehaviors.has(behavior));
  });
}

function averageMeasureBindingsAreSafe(
  source: CanonicalMetricSourceV1,
  boundColumns: ReadonlySet<string>,
): boolean {
  if (boundColumns.size === 0) return false;
  const semanticColumns = source.semantic.columns.filter((column) => boundColumns.has(column.physicalColumn));
  return averageMeasureColumns(source, semanticColumns).length === boundColumns.size;
}

function exactSelectedIdentity(source: CanonicalMetricSourceV1): string | null {
  const identity = source.grain.signature.identityBasis;
  if (!USABLE_GRAIN_STATES.has(identity.state) || identity.selectedCandidateIds.length !== 1) return null;
  const candidateId = identity.selectedCandidateIds[0];
  const match = /^key:(\d+)$/.exec(candidateId);
  if (!match) return null;
  const profile = source.physical.sourceProfile.columns.find((item) => item.sourceColumnIndex === Number(match[1]));
  return profile && profile.nullCount === 0 && profile.cardinality.mode === "exact" && profile.uniqueness.uniquenessRatio === 1
    ? candidateId
    : null;
}

function hasAmbiguousUnitOrCurrency(source: CanonicalMetricSourceV1, signal: "currency" | "uom"): boolean {
  return source.semantic.columns.some((column) => column.candidateTraces.some((trace) => trace.candidateId === signal) && ["ambiguous", "unknown"].includes(column.finalState));
}
function explicitSignal(source: CanonicalMetricSourceV1, signal: "currency" | "uom"): boolean { return matchingColumns(source, [signal]).length === 1; }
function signalColumnCount(source: CanonicalMetricSourceV1, signal: "currency" | "uom"): number {
  return source.semantic.columns.filter((column) => column.selectedCandidateId === signal || column.candidateTraces.some((trace) => trace.candidateId === signal)).length;
}

function inventorySnapshotReadiness(source: CanonicalMetricSourceV1) {
  const candidates = source.sourceEvidence?.inventorySnapshots ?? [];
  const valid = candidates.filter((item) => inventorySnapshotEvidenceMatchesSource(item, source));
  if (valid.length !== 1) return { ready: false, candidates, valid, evidence: null, identityCandidateId: null };
  const snapshot = valid[0];
  const expected = [snapshot.quantity, snapshot.itemIdentity, snapshot.warehouseIdentity, snapshot.asOf, snapshot.unit];
  const semanticBindingsValid = expected.every((binding) => source.semantic.columns.some((column) => column.physicalColumn === binding.physicalColumn
    && column.selectedCandidateId === binding.semanticId && USABLE_SEMANTIC_STATES.has(column.finalState)));
  const columns = expected.map((binding) => source.physical.sourceProfile.columns.find((column) => column.physicalColumnName === binding.physicalColumn));
  const sourceColumnsValid = columns.every(Boolean) && columns.every((column) => column!.nullCount === 0 && column!.technicalColumnEvidence.length === 0);
  const singletonColumnsValid = [snapshot.asOf.physicalColumn, snapshot.unit.physicalColumn].every((physicalColumn) => {
    const column = source.physical.sourceProfile.columns.find((item) => item.physicalColumnName === physicalColumn);
    return column?.cardinality.mode === "exact" && column.cardinality.distinctCount === 1;
  });
  const itemIndex = source.physical.sourceProfile.columns.find((column) => column.physicalColumnName === snapshot.itemIdentity.physicalColumn)?.sourceColumnIndex;
  const warehouseIndex = source.physical.sourceProfile.columns.find((column) => column.physicalColumnName === snapshot.warehouseIdentity.physicalColumn)?.sourceColumnIndex;
  const identity = source.grain.signature.identityBasis;
  const identityCandidateId = itemIndex === undefined || warehouseIndex === undefined ? null : [...identity.selectedCandidateIds, ...identity.alternativeCandidateIds].find((candidateId) => {
    const match = /^key:(\d+)\+(\d+)(?:\+(\d+))?$/.exec(candidateId);
    if (!match) return false;
    const indices = match.slice(1).filter(Boolean).map(Number);
    return indices.includes(itemIndex) && indices.includes(warehouseIndex);
  }) ?? null;
  const identityReady = identityCandidateId !== null && USABLE_GRAIN_STATES.has(identity.state) && identity.selectedCandidateIds.includes(identityCandidateId);
  const aggregation = source.grain.signature.aggregationForm;
  const snapshotGrain = source.grain.signature.temporalMode.value === "snapshot" && (aggregation.value === "snapshot_values" || aggregation.alternatives.includes("snapshot_values"));
  return { ready: semanticBindingsValid && sourceColumnsValid && singletonColumnsValid && identityReady && snapshotGrain, candidates, valid, evidence: snapshot, identityCandidateId };
}

function documentIdentityReadiness(source: CanonicalMetricSourceV1, signals: readonly string[]) {
  const candidates = source.sourceEvidence?.documentIdentities ?? [];
  const valid = candidates.filter((item) =>
    signals.includes(item.semanticId)
    && documentIdentityEvidenceMatchesSource(item, source));
  if (valid.length !== 1) return { ready: false, candidates, valid, evidence: null };
  const profile = source.physical.sourceProfile.columns.find((column) => column.physicalColumnName === valid[0].physicalColumn);
  return {
    ready: Boolean(profile && profile.nullCount === 0 && profile.technicalColumnEvidence.length === 0),
    candidates,
    valid,
    evidence: valid[0],
  };
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
    selectedBindings: [],
    selectedIdentityCandidateId: null,
    currencyEvidenceIds: [],
    inventorySnapshotEvidenceIds: [],
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
  const rawMatches = definition.requirements.map((requirement) => ({ requirement, matches: requirementSources(requirement, sources) }));
  const requiresAtomicMeasureBinding = definition.metricId === "gross_profit"
    || definition.aggregationOperator === "average";
  const matches = requiresAtomicMeasureBinding
    ? rawMatches.map((entry) => ({
        requirement: entry.requirement,
        matches: entry.matches.map((match) => {
          const safeColumns = definition.aggregationOperator === "average"
            ? averageMeasureColumns(match.source, match.columns)
            : atomicMeasureColumns(match.source, match.columns);
          if (safeColumns.length !== 1) {
            blockers.push(blocker(
              safeColumns.length === 0 ? `metric_safe_binding_missing:${entry.requirement.requirementId}` : `metric_safe_binding_ambiguous:${entry.requirement.requirementId}`,
              [sourceRef(match.source), ...safeColumns.map((column) => column.physicalColumn)],
              "critical",
            ));
            remediations.push(remediation("confirm_metric_measure_binding"));
          }
          return { source: match.source, columns: safeColumns.length === 1 ? safeColumns : [] };
        }),
      }))
    : rawMatches;
  const semanticRequirementsSatisfied = rawMatches.every((entry) => entry.matches.length > 0);
  if (!semanticRequirementsSatisfied) {
    for (const entry of matches.filter((item) => item.matches.length === 0)) {
      blockers.push(blocker(`missing_semantic_requirement:${entry.requirement.requirementId}`));
      remediations.push(remediation("confirm_column_meaning"));
    }
  }

  const matchedSources = unique(matches.flatMap((entry) => entry.matches.map((match) => match.source)));
  const inventoryReadiness = definition.metricId === "inventory_on_hand" && matchedSources.length === 1 ? inventorySnapshotReadiness(matchedSources[0]) : null;
  const documentIdentityReadinessBySource = definition.aggregationOperator === "count_governed_identity"
    ? new Map(matchedSources.map((source) => [source, documentIdentityReadiness(source, definition.requirements[0].semanticSignals)]))
    : new Map<CanonicalMetricSourceV1, ReturnType<typeof documentIdentityReadiness>>();
  const validLineMeasuresBySource = new Map(matchedSources.map((source) => [
    source,
    (source.sourceEvidence?.lineMeasures ?? []).filter((item) => lineMeasureEvidenceMatchesSource(item, source)),
  ]));
  for (const entry of matches) for (const match of entry.matches) for (const column of match.columns) {
    metricEvidence.push(evidence(`semantic:${column.selectedCandidateId}`, "semantic", [sourceRef(match.source), `column:${column.sourceColumnIndex}`], "canonical_resolution"));
  }

  const grainCompatible = matches.every((entry) => entry.matches.some(({ source }) => {
    const atomicEntityAverage = definition.aggregationOperator === "average"
      && exactSelectedIdentity(source) !== null
      && source.grain.signature.aggregationForm.value === "atomic_rows"
      && USABLE_GRAIN_STATES.has(source.grain.signature.aggregationForm.state);
    const sourceBoundLineMeasure = definition.aggregationOperator === "sum"
      && entry.matches.some((match) => match.source === source
        && match.columns.every((column) => validLineMeasuresBySource.get(source)?.some((item) =>
          item.physicalColumn === column.physicalColumn && item.semanticId === column.selectedCandidateId)));
    return atomicEntityAverage
      || sourceBoundLineMeasure
      || (entry.requirement.allowedStructuralForms.includes(source.grain.signature.structuralForm.value)
        && USABLE_GRAIN_STATES.has(source.grain.signature.structuralForm.state))
      || documentIdentityReadinessBySource.get(source)?.ready === true;
  }));
  if (semanticRequirementsSatisfied && !grainCompatible) { blockers.push(blocker("metric_grain_incompatible", matchedSources.map(sourceRef))); remediations.push(remediation("confirm_grain")); }

  const resolvedTimeCompatible = matches.every((entry) => entry.matches.some(({ source }) =>
    entry.requirement.allowedTemporalModes.includes(source.grain.signature.temporalMode.value)
    && USABLE_GRAIN_STATES.has(source.grain.signature.temporalMode.state)));
  const descriptiveCountWithoutTimeGrouping = definition.additivity === "descriptive_count_only";
  const timeCompatible = descriptiveCountWithoutTimeGrouping || resolvedTimeCompatible;
  if (semanticRequirementsSatisfied && !timeCompatible) { blockers.push(blocker("metric_time_basis_incompatible_or_missing", matchedSources.map(sourceRef))); remediations.push(remediation("provide_period_semantics")); }
  if (semanticRequirementsSatisfied && descriptiveCountWithoutTimeGrouping && !resolvedTimeCompatible) {
    limitations.push(limitation("temporal_basis_unresolved_for_descriptive_count", matchedSources.map(sourceRef)));
  }

  let duplicateHandlingSatisfied = true;
  const metricBoundAtomicSources = new Set<CanonicalMetricSourceV1>();
  if (["sum", "average", "derive_subtraction"].includes(definition.aggregationOperator)) {
    for (const source of matchedSources) {
      const form = source.grain.signature.aggregationForm.value;
      const boundColumns = new Set(matches.flatMap((entry) => entry.matches.filter((match) => match.source === source).flatMap((match) => match.columns.map((column) => column.physicalColumn))));
      const boundMeasureRisks = source.grain.signature.measureSafety.observations
        .filter((observation) => boundColumns.has(observation.physicalColumn))
        .some((observation) => observation.behaviors.some((behavior) => ["non_additive_candidate", "semi_additive_candidate", "repeated_measure_risk", "unresolved_measure_role", "dimension_or_code_candidate"].includes(behavior)));
      const sourceBoundLineMeasures = [...boundColumns].every((physicalColumn) =>
        validLineMeasuresBySource.get(source)?.some((item) => item.physicalColumn === physicalColumn));
      const metricBoundAtomic = sourceBoundLineMeasures || (exactSelectedIdentity(source) !== null
        && (definition.aggregationOperator === "average"
          ? averageMeasureBindingsAreSafe(source, boundColumns)
          : definition.metricId === "gross_profit" && metricBoundMeasuresAreAtomic(source, boundColumns)));
      if (metricBoundAtomic) {
        metricBoundAtomicSources.add(source);
        if (sourceBoundLineMeasures) {
          for (const item of validLineMeasuresBySource.get(source) ?? []) {
            if (boundColumns.has(item.physicalColumn)) metricEvidence.push(evidence(item.evidenceId, "line_measure", [item.physicalColumn, item.rowIdentityPhysicalColumn, sourceRef(source)], "source_bound_contract"));
          }
        } else {
          metricEvidence.push(evidence("grain:metric_bound_atomic_measures", "grain", [sourceRef(source), exactSelectedIdentity(source)!, ...[...boundColumns].sort()], "canonical_resolution"));
        }
      }
      const inventorySnapshotProtected = definition.metricId === "inventory_on_hand" && inventoryReadiness?.ready === true;
      const risk = sourceBoundLineMeasures
        ? false
        : definition.aggregationOperator === "average"
        ? !metricBoundAtomic
        : (!inventorySnapshotProtected && boundMeasureRisks)
          || (!inventorySnapshotProtected && !metricBoundAtomic && ["repeated_parent_values", "mixed_aggregation", "unresolved"].includes(form));
      if (risk) {
        duplicateHandlingSatisfied = false;
        blockers.push(blocker("repeated_or_unresolved_measure_aggregation", [sourceRef(source)]));
        remediations.push(remediation("remove_repeated_totals"));
      }
    }
  }

  if (definition.aggregationOperator === "count_governed_identity") {
    const sourceBoundIdentity = matchedSources.find((source) => documentIdentityReadinessBySource.get(source)?.ready);
    const metricSpecificIdentityReady = matches[0]?.matches.some(({ source }) => {
      const exact = exactMetricIdentity(source, definition.requirements[0].semanticSignals);
      if (exact) {
        metricEvidence.push(evidence(
          `identity:metric_specific:${definition.metricId}`,
          "grain",
          [sourceRef(source), exact.candidateId, exact.physicalColumn],
          "canonical_resolution",
        ));
      }
      return exact !== null;
    }) ?? false;
    const identityReady = sourceBoundIdentity
      ? true
      : metricSpecificIdentityReady;
    if (sourceBoundIdentity) {
      const identityEvidence = documentIdentityReadinessBySource.get(sourceBoundIdentity)!.evidence!;
      metricEvidence.push(evidence(identityEvidence.evidenceId, "document_identity", [sourceRef(sourceBoundIdentity), identityEvidence.physicalColumn, identityEvidence.semanticId], "source_bound_contract"));
    }
    if (!identityReady) {
      blockers.push(blocker("governed_identity_required_for_count", matchedSources.map(sourceRef)));
      remediations.push(remediation(definition.metricId === "trip_count" ? "confirm_document_identity" : "select_or_confirm_key"));
    }
  }

  if (definition.metricId === "inventory_on_hand") {
    if (!inventoryReadiness?.ready) {
      const invalidEvidence = (inventoryReadiness?.candidates.length ?? 0) > 0 && (inventoryReadiness?.valid.length ?? 0) !== 1;
      blockers.push(blocker(invalidEvidence ? "source_bound_inventory_snapshot_evidence_invalid_or_stale" : "inventory_snapshot_as_of_basis_required", matchedSources.map(sourceRef), "critical"));
      remediations.push(remediation("provide_governed_inventory_snapshot_contract"));
    } else {
      metricEvidence.push(evidence(inventoryReadiness.evidence!.evidenceId, "inventory_snapshot", [sourceRef(matchedSources[0]), inventoryReadiness.identityCandidateId!, inventoryReadiness.evidence!.asOf.value, inventoryReadiness.evidence!.unit.value], "source_bound_contract"));
    }
  }
  if (definition.metricId === "quantity_sold" && sources.some((source) => source.grain.signature.aggregationForm.value === "snapshot_values" || source.grain.signature.temporalMode.value === "snapshot")) blockers.push(blocker("snapshot_quantity_cannot_be_quantity_sold", sources.map(sourceRef)));

  const selectedBindings: GovernedMetricSelectedBindingV1[] = matches.flatMap((entry) => entry.matches.flatMap((match) => match.columns.map((column) => ({
    requirementId: entry.requirement.requirementId,
    semanticId: column.selectedCandidateId!,
    sourceReference: sourceRef(match.source),
    sourceColumnIndex: column.sourceColumnIndex,
    physicalColumn: column.physicalColumn,
    semanticState: column.finalState as "confirmed" | "probable",
  }))));
  const selectedIdentityCandidateId = (definition.metricId === "gross_profit" || definition.aggregationOperator === "average") && matchedSources.length === 1
    ? exactSelectedIdentity(matchedSources[0])
    : definition.metricId === "inventory_on_hand"
      ? inventoryReadiness?.identityCandidateId ?? null
      : null;
  let currencyCompatible: boolean | null = null;
  const currencyEvidenceIds: string[] = [];
  const inventorySnapshotEvidenceIds = inventoryReadiness?.ready ? [inventoryReadiness.evidence!.evidenceId] : [];
  let unitCompatible: boolean | null = null;
  const requiresCurrency = ["sales_revenue", "gross_profit"].includes(definition.metricId);
  const requiresUnit = ["quantity_sold", "inventory_on_hand"].includes(definition.metricId);
  if (requiresCurrency) {
    const explicitCurrencyEvidence = matchedSources.length > 0
      ? matchedSources.map((source) => {
          const selectedColumns = selectedBindings.filter((binding) => binding.sourceReference === sourceRef(source)).map((binding) => binding.physicalColumn);
          const candidates = source.sourceEvidence?.currency ?? [];
          const valid = candidates.filter((item) => currencyEvidenceMatchesSource(item, source)
            && (item.scope === "all_money_measures" || selectedColumns.every((column) => item.applicableMonetaryColumns.includes(column))));
          return { source, candidates, valid };
        })
      : [];
    if (explicitCurrencyEvidence.some((item) => item.valid.length > 1)) {
      currencyCompatible = false;
      blockers.push(blocker("currency_basis_conflicting_or_multivalued", explicitCurrencyEvidence.flatMap((item) => item.valid.map((evidenceItem) => evidenceItem.evidenceId)), "critical"));
      remediations.push(remediation("confirm_currency"));
    } else if (explicitCurrencyEvidence.length > 0 && explicitCurrencyEvidence.every((item) => item.valid.length === 1)) {
      const currencies = unique(explicitCurrencyEvidence.map((item) => item.valid[0].currency));
      const periods = unique(explicitCurrencyEvidence.map((item) => item.valid[0].reportingPeriod));
      if (currencies.length === 1 && periods.length === 1) {
        currencyCompatible = true;
        for (const item of explicitCurrencyEvidence) {
          const currencyEvidence = item.valid[0];
          currencyEvidenceIds.push(currencyEvidence.evidenceId);
          metricEvidence.push(evidence(currencyEvidence.evidenceId, "currency", [sourceRef(item.source), currencyEvidence.currency, currencyEvidence.reportingPeriod, currencyEvidence.scope, ...currencyEvidence.applicableMonetaryColumns], "source_bound_contract"));
        }
      } else {
        currencyCompatible = false;
        blockers.push(blocker("currency_basis_conflicting_or_multivalued", explicitCurrencyEvidence.flatMap((item) => item.valid.map((evidenceItem) => evidenceItem.evidenceId)), "critical"));
        remediations.push(remediation("confirm_currency"));
      }
    } else if (explicitCurrencyEvidence.some((item) => item.candidates.length > 0)) {
      currencyCompatible = false;
      blockers.push(blocker("source_bound_currency_evidence_invalid_or_stale", explicitCurrencyEvidence.flatMap((item) => item.candidates.map((evidenceItem) => evidenceItem.evidenceId)), "critical"));
      remediations.push(remediation("confirm_currency"));
    } else if (matchedSources.some((source) => hasAmbiguousUnitOrCurrency(source, "currency") || signalColumnCount(source, "currency") > 1)) {
      currencyCompatible = false;
      blockers.push(blocker("currency_basis_ambiguous_or_incompatible", matchedSources.map(sourceRef)));
      remediations.push(remediation("confirm_currency"));
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
    const metricBoundRepeatedProtection = ["sum", "derive_subtraction"].includes(definition.aggregationOperator)
      && capabilityId === "repeated_measure_protection_ready"
      && relevant.length > 0
      && relevant.every((source) => metricBoundAtomicSources.has(source));
    const metricSpecificGrossProfitProtection = definition.metricId === "gross_profit"
      && relevant.length === 1
      && selectedBindings.length === definition.requirements.length
      && selectedIdentityCandidateId !== null
      && duplicateHandlingSatisfied
      && currencyCompatible === true
      && ["semantic_labeling_ready", "measure_role_assessment_ready"].includes(capabilityId)
      && relevant.every((source) => metricBoundAtomicSources.has(source));
    const sourceBoundDocumentIdentityProtection = definition.aggregationOperator === "count_governed_identity"
      && capabilityId === "row_identity_ready"
      && relevant.length > 0
      && relevant.every((source) => documentIdentityReadinessBySource.get(source)?.ready === true);
    const metricSpecificProtection = metricBoundRepeatedProtection || metricSpecificGrossProfitProtection || sourceBoundDocumentIdentityProtection;
    if (states.length > 0 && states.every((state) => BLOCKED_CAPABILITY_STATES.has(state)) && !metricSpecificProtection) blockers.push(blocker(`required_readiness_unavailable:${capabilityId}`, relevant.map(sourceRef)));
    else if (!metricSpecificProtection && states.some((state) => state !== "ready")) limitations.push(limitation(`required_readiness_conditional:${capabilityId}`, relevant.map(sourceRef)));
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
    selectedBindings: selectedBindings.sort((a, b) => a.requirementId.localeCompare(b.requirementId) || a.sourceColumnIndex - b.sourceColumnIndex),
    selectedIdentityCandidateId,
    currencyEvidenceIds: unique(currencyEvidenceIds),
    inventorySnapshotEvidenceIds: unique(inventorySnapshotEvidenceIds),
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
