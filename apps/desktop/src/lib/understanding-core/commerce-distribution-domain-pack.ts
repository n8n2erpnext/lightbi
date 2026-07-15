import { deterministicPolicySha256 } from "./contextual-evidence-policy";
import { GOVERNED_DOMAIN_SUPPORT_MANIFEST_V1 } from "./domain-support-manifest";
import type {
  CanonicalMetricSourceV1,
  DomainActivationArtifactV1,
  DomainActivationInputV1,
  DomainConceptActivationV1,
  DomainConceptDefinitionV1,
  DomainConceptSupportStateV1,
  GovernedMetricBlockerV1,
  GovernedMetricEvidenceV1,
  GovernedMetricLimitationV1,
  GovernedMetricRemediationV1,
} from "./governed-domain-metric-contracts";

const MANIFEST = GOVERNED_DOMAIN_SUPPORT_MANIFEST_V1[0];
const SEMANTIC_USABLE = new Set(["confirmed", "probable"]);
const GRAIN_USABLE = new Set(["confirmed", "probable"]);
const STATE_ORDER: Record<DomainConceptSupportStateV1, number> = { unsupported: 0, blocked: 1, detect_only: 2, conditional: 3, active: 4 };

function unique<T>(items: readonly T[]): T[] { return [...new Set(items)]; }
function sourceReference(source: CanonicalMetricSourceV1): string {
  const hash = source.physical.provenance.sourceHash;
  return `source:${hash?.algorithm === "sha256" ? hash.value : deterministicPolicySha256(source.physical.provenance.sourceId)}`;
}
function blocker(code: string, references: string[] = [], severity: GovernedMetricBlockerV1["severity"] = "material"): GovernedMetricBlockerV1 {
  return { code, severity, references: unique(references).sort() };
}
function limitation(code: string, references: string[] = []): GovernedMetricLimitationV1 { return { code, references: unique(references).sort() }; }
function remediation(code: string): GovernedMetricRemediationV1 { return { code, parameters: {} }; }
function evidence(evidenceId: string, kind: GovernedMetricEvidenceV1["kind"], references: string[], provenance: GovernedMetricEvidenceV1["provenance"]): GovernedMetricEvidenceV1 {
  return { evidenceId, kind, references: unique(references).sort(), provenance };
}
function capability(source: CanonicalMetricSourceV1, id: string) { return source.readiness.capabilities.find((item) => item.capabilityId === id); }

function integrityBlockers(source: CanonicalMetricSourceV1): GovernedMetricBlockerV1[] {
  const refs = [sourceReference(source)];
  const sourceId = source.physical.provenance.sourceId;
  const blockers: GovernedMetricBlockerV1[] = [];
  if (source.semantic.sourceId !== sourceId || source.grain.sourceId !== sourceId || !source.readiness.identity.sourceIds.includes(sourceId)) {
    blockers.push(blocker("canonical_source_identity_mismatch", refs, "critical"));
  }
  const hash = source.physical.provenance.sourceHash;
  if (hash?.algorithm === "sha256") {
    const semanticHash = source.semantic.sourceHash;
    const grainHash = source.grain.sourceHash;
    if (semanticHash?.algorithm !== "sha256" || semanticHash.value !== hash.value || grainHash?.algorithm !== "sha256" || grainHash.value !== hash.value) {
      blockers.push(blocker("canonical_source_hash_mismatch", refs, "critical"));
    }
  }
  if (source.physical.sourceProfile.profilingScope !== "full" || source.physical.sourceProfile.dataRegion.selectionStatus !== "selected") {
    blockers.push(blocker("full_file_physical_profile_required", refs, "critical"));
  }
  if (source.semantic.productionWiring.executed || source.grain.productionWiring.executed || source.readiness.productionWiring.executed) {
    blockers.push(blocker("unexpected_upstream_production_wiring", refs, "critical"));
  }
  return blockers;
}

function semanticMatches(source: CanonicalMetricSourceV1, signals: readonly string[]) {
  return source.semantic.columns.filter((column) => column.selectedCandidateId !== null && signals.includes(column.selectedCandidateId) && SEMANTIC_USABLE.has(column.finalState));
}

function evaluateConcept(definition: DomainConceptDefinitionV1, sources: readonly CanonicalMetricSourceV1[], globalBlockers: GovernedMetricBlockerV1[]): DomainConceptActivationV1 {
  const matches = sources.flatMap((source) => semanticMatches(source, definition.requiredSemanticSignals).map((column) => ({ source, column })));
  const conceptEvidence: GovernedMetricEvidenceV1[] = [];
  const blockers: GovernedMetricBlockerV1[] = [...globalBlockers];
  const limitations: GovernedMetricLimitationV1[] = definition.limitations.map((code) => limitation(code));
  const remediations: GovernedMetricRemediationV1[] = definition.remediation.map(remediation);

  for (const match of matches) {
    const ref = sourceReference(match.source);
    conceptEvidence.push(evidence(`semantic:${match.column.selectedCandidateId}`, "semantic", [ref, `column:${match.column.sourceColumnIndex}`], "canonical_resolution"));
  }
  if (matches.length === 0) {
    return { conceptId: definition.conceptId, state: "unsupported", evidence: [], blockers: [blocker("required_canonical_semantic_signal_absent")], limitations, remediation: remediations };
  }

  const matchedSources = unique(matches.map((match) => match.source));
  const compatibleGrain = matchedSources.some((source) => {
    const grain = source.grain.signature;
    return GRAIN_USABLE.has(grain.structuralForm.state) && GRAIN_USABLE.has(grain.aggregationForm.state);
  });
  if (!compatibleGrain) blockers.push(blocker("compatible_canonical_grain_not_proven", matchedSources.map(sourceReference)));

  for (const required of definition.requiredReadinessCapabilities) {
    const states = matchedSources.map((source) => capability(source, required)?.state ?? "unknown");
    if (states.every((state) => ["blocked", "unknown", "unsupported"].includes(state))) blockers.push(blocker(`readiness_${required}_not_available`, matchedSources.map(sourceReference)));
    else if (states.some((state) => state !== "ready")) limitations.push(limitation(`readiness_${required}_conditional`, matchedSources.map(sourceReference)));
  }

  for (const source of matchedSources) {
    conceptEvidence.push(evidence("physical:full_file_profile", "physical", [sourceReference(source)], "full_file"));
    conceptEvidence.push(evidence("grain:canonical_signature", "grain", [sourceReference(source), source.grain.signature.structuralForm.value, source.grain.signature.temporalMode.value], "canonical_resolution"));
  }

  let state: DomainConceptSupportStateV1 = definition.supportState;
  if (blockers.length > 0) state = "blocked";
  else if (state === "active" && limitations.length > 0) state = "conditional";
  return {
    conceptId: definition.conceptId,
    state,
    evidence: conceptEvidence.sort((a, b) => a.evidenceId.localeCompare(b.evidenceId) || a.references.join("|").localeCompare(b.references.join("|"))),
    blockers: dedupeBlockers(blockers),
    limitations: dedupeLimitations(limitations),
    remediation: remediations,
  };
}

function dedupeBlockers(items: GovernedMetricBlockerV1[]): GovernedMetricBlockerV1[] {
  const byCode = new Map<string, GovernedMetricBlockerV1>();
  for (const item of items) {
    const current = byCode.get(item.code);
    byCode.set(item.code, { code: item.code, severity: current?.severity === "critical" || item.severity === "critical" ? "critical" : "material", references: unique([...(current?.references ?? []), ...item.references]).sort() });
  }
  return [...byCode.values()].sort((a, b) => a.code.localeCompare(b.code));
}
function dedupeLimitations(items: GovernedMetricLimitationV1[]): GovernedMetricLimitationV1[] {
  const byCode = new Map<string, GovernedMetricLimitationV1>();
  for (const item of items) byCode.set(item.code, { code: item.code, references: unique([...(byCode.get(item.code)?.references ?? []), ...item.references]).sort() });
  return [...byCode.values()].sort((a, b) => a.code.localeCompare(b.code));
}

export function activateCommerceDistributionDomain(input: DomainActivationInputV1): DomainActivationArtifactV1 {
  const invalidTuning = input.evaluationContext.tuningUse === "allowed" && !["synthetic", "golden"].includes(input.evaluationContext.group);
  const globalBlockers = input.sources.flatMap(integrityBlockers);
  if (input.sources.length === 0) globalBlockers.push(blocker("canonical_source_required", [], "critical"));
  if (invalidTuning) globalBlockers.push(blocker("evaluation_only_group_cannot_tune_policy", [], "critical"));

  const concepts = MANIFEST.concepts
    .map((definition) => evaluateConcept(definition, input.sources, globalBlockers))
    .sort((a, b) => a.conceptId.localeCompare(b.conceptId));
  const supported = concepts.filter((concept) => STATE_ORDER[concept.state] >= STATE_ORDER.detect_only);
  const state: DomainConceptSupportStateV1 = globalBlockers.length > 0
    ? "blocked"
    : supported.length === 0
      ? "unsupported"
      : "conditional";
  const sourceReferences = input.sources.map(sourceReference).sort();
  const identityBody = { packId: MANIFEST.packId, packVersion: MANIFEST.version, state, concepts, sourceReferences, tuningAllowed: input.evaluationContext.tuningUse === "allowed" && !invalidTuning };
  return {
    schemaVersion: "lightbi.domain-activation.v1",
    packId: MANIFEST.packId,
    packVersion: MANIFEST.version,
    manifestPolicyHash: MANIFEST.lastValidatedPolicyIdentity,
    identity: deterministicPolicySha256(identityBody),
    state,
    concepts,
    blockers: dedupeBlockers([...globalBlockers, ...concepts.flatMap((concept) => concept.blockers)]),
    limitations: dedupeLimitations([limitation("pack_is_not_production_active"), ...concepts.flatMap((concept) => concept.limitations)]),
    tuningAllowed: input.evaluationContext.tuningUse === "allowed" && !invalidTuning,
    canonicalArtifactsModified: false,
    questionGeneration: { executed: false },
    actionGeneration: { executed: false },
    productionWiring: { executed: false },
  };
}
