import type { DatasetUnderstandingArtifactV1 } from "./profiling-contracts";
import type { CandidateArtifactV1, EvidenceV1, SemanticCandidateV1 } from "./semantic-candidate-contracts";
import type { CandidateAbsenceDebtV1, CandidateEvidenceProfileV1, ContextRelationEvidenceV1, ContextRelationTypeV1, ContextualEvidenceArtifactV1, EvidenceFamilyAssessmentV1 } from "./contextual-evidence-contracts";
import { CONTEXTUAL_EVIDENCE_ARTIFACT_VERSION, CONTEXTUAL_EVIDENCE_POLICY_VERSION, SEMANTIC_CONTEXT_RELATION_VERSION } from "./contextual-evidence-contracts";
import { CONTEXT_RELATION_POLICY, EVIDENCE_FAMILY_BY_TYPE, EVIDENCE_FAMILY_ORDER, canonicalJson, deterministicPolicyHash, deterministicPolicySha256 } from "./contextual-evidence-policy";

function comparableEvidence(e: EvidenceV1) { const { evidenceId: _, ...rest } = e; return rest; }
function dedupe(evidence: EvidenceV1[]): { values: EvidenceV1[]; removed: number } {
  const map = new Map<string, EvidenceV1>();
  for (const item of evidence) { const key = canonicalJson(comparableEvidence(item)); if (!map.has(key)) map.set(key, item); }
  return { values: [...map.values()].sort((a, b) => canonicalJson(comparableEvidence(a)).localeCompare(canonicalJson(comparableEvidence(b)))), removed: evidence.length - map.size };
}
function profile(physicalColumn: string, sourceColumnIndex: number, candidateId: string, evidence: EvidenceV1[], limitations: string[], contextRelations: ContextRelationEvidenceV1[]): CandidateEvidenceProfileV1 {
  const unique = dedupe(evidence);
  const assessments: EvidenceFamilyAssessmentV1[] = EVIDENCE_FAMILY_ORDER.map((family) => {
    const members = unique.values.filter((item) => EVIDENCE_FAMILY_BY_TYPE[item.type] === family);
    const support = members.some((item) => item.direction === "support"), conflict = members.some((item) => item.direction === "conflict"), neutral = members.some((item) => item.direction === "neutral");
    const relations = family === "sibling_context" ? contextRelations : [];
    const relationSupport = relations.some((item) => item.direction === "support"), relationConflict = relations.some((item) => item.direction === "conflict");
    const hasSupport = support || relationSupport, hasConflict = conflict || relationConflict;
    const assessment = hasSupport && hasConflict ? "mixed" : hasSupport ? "supports" : hasConflict ? "conflicts" : neutral ? "neutral" : "unavailable";
    return { family, assessment, magnitude: members.length || relations.length ? Math.min(1, Math.max(0, ...members.map((item) => item.strength), ...relations.map((item) => item.magnitude))) : 0,
      explanationCodes: [...new Set([...members.map((item) => item.explanationCode), ...relations.map((item) => item.explanationCode)])].sort(), evidenceReferences: [...members.map((item) => item.evidenceId), ...relations.map((item) => item.relationEvidenceId)].sort(), independentContributionCount: members.length || relations.length ? 1 : 0 };
  });
  const representative = unique.values.filter((item) => item.source === "representative_evidence").length;
  const support = unique.values.filter((item) => item.direction === "support"), conflicts = unique.values.filter((item) => item.direction === "conflict"), neutral = unique.values.filter((item) => item.direction === "neutral");
  return { physicalColumn, sourceColumnIndex, candidateId, originalEvidenceReferences: unique.values.map((item) => item.evidenceId).sort(),
    supportingEvidence: support, conflictingEvidence: conflicts, neutralEvidence: neutral, familyAssessments: assessments,
    independentSupportFamilyCount: assessments.filter((item) => item.assessment === "supports" || item.assessment === "mixed").length,
    provenance: { representativeEvidenceCount: representative, fullFileEvidenceCount: unique.values.length - representative, representativeOnly: representative > 0 && representative === unique.values.length },
    conflictSummary: { unresolvedConflictCodes: [...new Set(conflicts.map((item) => item.explanationCode))].sort(), supportCount: support.length, conflictCount: conflicts.length, neutralCount: neutral.length },
    structuralAndParsingLimitations: [...new Set(limitations)].sort(), contextRelations };
}
function meaningfulTokens(id: string) { return id.split("_").filter((token) => !["id","name","label","status","date","time","amount"].includes(token)); }
function relationType(left: SemanticCandidateV1, right: SemanticCandidateV1): ContextRelationTypeV1 | null {
  if (left.semanticFamily === right.semanticFamily && new Set([left.role, right.role]).has("identifier") && new Set([left.role, right.role]).has("dimension")) return "identifier_label";
  if (left.semanticFamily === "quantity" && right.semanticFamily === "quantity" && (left.candidateId === "uom" || right.candidateId === "uom")) return "quantity_uom";
  if (left.semanticFamily === "money" && right.semanticFamily === "money" && (left.candidateId === "currency" || right.candidateId === "currency")) return "amount_currency";
  if (new Set([left.role, right.role]).has("status") && new Set([left.role, right.role]).has("time") && meaningfulTokens(left.candidateId).some((token) => meaningfulTokens(right.candidateId).includes(token))) return "status_timestamp";
  if (new Set([left.candidateId, right.candidateId]).has("origin_location") && new Set([left.candidateId, right.candidateId]).has("destination_location")) return "origin_destination";
  return null;
}
function contextRelationsFor(candidate: SemanticCandidateV1, physicalColumn: string, observations: CandidateArtifactV1["observations"]): ContextRelationEvidenceV1[] {
  const byClass = new Map<ContextRelationTypeV1, ContextRelationEvidenceV1>();
  for (const sibling of observations) if (sibling.physicalColumn !== physicalColumn) for (const other of sibling.candidateSet.candidates) {
    const type = relationType(candidate, other); if (!type || byClass.has(type)) continue;
    const policy = CONTEXT_RELATION_POLICY.relations.find((item) => item.relationType === type)!;
    byClass.set(type, { schemaVersion: SEMANTIC_CONTEXT_RELATION_VERSION, relationEvidenceId: `${candidate.candidateId}:${type}:${sibling.sourceColumnIndex}:${other.candidateId}`,
      relationId: policy.relationId, relationType: type, direction: "support", candidateId: candidate.candidateId, siblingColumn: sibling.physicalColumn,
      siblingCandidateId: other.candidateId, magnitude: 0.5, explanationCode: policy.explanationCode, provenance: "source_local_candidate_artifact", limitations: policy.provenanceLimitations });
  }
  return [...byClass.values()].sort((a, b) => a.relationEvidenceId.localeCompare(b.relationEvidenceId));
}
export function aggregateContextualEvidence(physical: DatasetUnderstandingArtifactV1, candidate: CandidateArtifactV1, debt: CandidateAbsenceDebtV1[] = []): ContextualEvidenceArtifactV1 {
  const sourceId = physical.sourceProfile.source.sourceId;
  if (candidate.sourceId !== sourceId || canonicalJson(candidate.sourceHash) !== canonicalJson(physical.provenance.sourceHash) || candidate.profileSchemaVersion !== physical.provenance.profileSchemaVersion)
    throw new Error("CONTEXTUAL_EVIDENCE_ARTIFACT_MISMATCH");
  if (candidate.observations.length !== physical.sourceProfile.columns.length) throw new Error("CONTEXTUAL_EVIDENCE_COLUMN_COVERAGE_MISMATCH");
  const observations = candidate.observations.map((observation, index) => {
    const column = physical.sourceProfile.columns[index];
    if (!column || column.sourceColumnIndex !== observation.sourceColumnIndex || column.physicalColumnName !== observation.physicalColumn) throw new Error("CONTEXTUAL_EVIDENCE_COLUMN_IDENTITY_MISMATCH");
    return { sourceColumnIndex: observation.sourceColumnIndex, physicalColumn: observation.physicalColumn, state: observation.state,
      candidateProfiles: observation.candidateSet.candidates.map((item) => profile(observation.physicalColumn, observation.sourceColumnIndex, item.candidateId, [...item.evidence, ...item.conflictEvidence], [...column.limitations, ...column.issues.map((issue) => issue.code), ...item.limitations], contextRelationsFor(item, observation.physicalColumn, candidate.observations))),
      resolution: { contractAvailable: true as const, executed: false as const }, limitations: [...new Set([...observation.limitations, ...column.limitations])].sort() };
  });
  return { schemaVersion: CONTEXTUAL_EVIDENCE_ARTIFACT_VERSION, sourceId, sourceHash: candidate.sourceHash,
    physicalArtifactVersion: physical.schemaVersion, candidateArtifactVersion: candidate.schemaVersion, registryVersion: candidate.registryVersion,
    aggregationPolicyVersion: CONTEXTUAL_EVIDENCE_POLICY_VERSION, aggregationPolicyHash: deterministicPolicySha256(), aggregationPolicyFingerprint: deterministicPolicyHash(), observations,
    coverage: { physicalColumnCount: physical.sourceProfile.columns.length, observationCount: observations.length, candidateProfileCount: observations.reduce((n, item) => n + item.candidateProfiles.length, 0) },
    candidateAbsenceDebt: [...debt].sort((a, b) => `${a.physicalColumn}|${a.candidateId}`.localeCompare(`${b.physicalColumn}|${b.candidateId}`)),
    resolution: { contractAvailable: true, executed: false }, limitations: [{ code: "candidate_only", explanation: "No candidate resolution, ranking, or final mapping has executed." }, { code: "representative_values", explanation: "Representative value evidence is not full-file semantic truth." }] };
}
