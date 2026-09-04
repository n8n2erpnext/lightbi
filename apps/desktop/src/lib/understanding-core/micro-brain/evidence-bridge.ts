import { SEMANTIC_SIGNAL_BY_ID, type SemanticSignalDefinition } from "../../semantic-registry";
import type { ColumnPhysicalProfileV1, DatasetUnderstandingArtifactV1, PhysicalTypeName } from "../profiling-contracts";
import {
  CANDIDATE_ARTIFACT_SCHEMA_VERSION,
  SEMANTIC_CANDIDATE_SCHEMA_VERSION,
  type CandidateArtifactV1,
  type ColumnObservationState,
  type EvidenceV1,
  type SemanticCandidateV1,
} from "../semantic-candidate-contracts";
import type { CompiledMicroBrainIndexV1 } from "./contracts";
import { buildMicroBrainQuerySignature, microBrainShadowInvocationReason } from "./query-signature";
import { retrieveMicroBrainConcepts } from "./retrieval";

export const MICRO_BRAIN_CANDIDATE_BRIDGE_VERSION = "lightbi.micro-brain.candidate-bridge.v1" as const;

export type MicroBrainCandidateBridgeOptionsV1 = {
  mode?: "selective" | "all";
  maxCandidatesPerColumn?: number;
};

const MICRO_BRAIN_RETRIEVAL_EVIDENCE_STRENGTH = 0.2;

function unique(values: string[]): string[] {
  return [...new Set(values)].sort();
}
function createBridgeEvidence(args: {
  sourceId: string;
  sourceColumnIndex: number;
  physicalColumn: string;
  candidateId: string;
  conceptId: string;
  fusedRank: number;
  sparseRank: number | null;
  denseRank: number | null;
  rrfScore: number;
  denseSimilarity: number | null;
  indexVersion: string;
}): EvidenceV1 {
  return {
    schemaVersion: SEMANTIC_CANDIDATE_SCHEMA_VERSION,
    evidenceId: `${args.sourceId}:${args.sourceColumnIndex}:${args.candidateId}:micro_brain_retrieval:${args.indexVersion}:${args.fusedRank}`,
    type: "micro_brain_retrieval",
    source: "micro_brain",
    sourceId: args.sourceId,
    physicalColumn: args.physicalColumn,
    candidateId: args.candidateId,
    direction: "support",
    strength: MICRO_BRAIN_RETRIEVAL_EVIDENCE_STRENGTH,
    explanationCode: args.fusedRank === 1 && args.sparseRank === 1 && args.denseRank === 1
      ? "micro_brain_dual_retrieval_consensus"
      : "micro_brain_retrieval_candidate",
    witnesses: [{
      normalizedValue: args.physicalColumn,
      registrySurface: args.conceptId,
      rawValue: {
        fusedRank: args.fusedRank,
        sparseRank: args.sparseRank,
        denseRank: args.denseRank,
        rrfScore: args.rrfScore,
        denseSimilarity: args.denseSimilarity,
      },
    }],
    limitations: [
      "Micro Brain retrieval is candidate-recall provenance only.",
      "Retrieval rank, RRF score, and dense similarity are not semantic confidence.",
      "This evidence cannot independently authorize probable or confirmed resolution.",
    ],
  };
}

function registryTypeMatches(compatibleTypes: readonly string[], physicalType: PhysicalTypeName): boolean {
  const normalized = new Set(compatibleTypes.map((type) => type.toLowerCase()));
  if (physicalType === "excel_serial_date") return ["date", "datetime", "timestamp"].some((type) => normalized.has(type));
  if (physicalType === "number" || physicalType === "numeric_string") {
    return ["number", "integer", "float", "double", "decimal", "currency"].some((type) => normalized.has(type));
  }
  if (physicalType === "date" || physicalType === "date_string") {
    return ["date", "datetime", "timestamp", "string", "varchar", "text"].some((type) => normalized.has(type));
  }
  if (physicalType === "boolean") return normalized.has("boolean") || normalized.has("bool");
  if (physicalType === "string") return ["string", "varchar", "text"].some((type) => normalized.has(type));
  return false;
}

function bridgeProfileEvidence(
  definition: SemanticSignalDefinition,
  column: ColumnPhysicalProfileV1,
  sourceId: string,
): EvidenceV1[] {
  const evidence: EvidenceV1[] = [];
  const types = column.physicalTypeCandidates.filter((candidate) => candidate.confidence >= 0.2).map((candidate) => candidate.type);
  const compatible = types.filter((type) => registryTypeMatches(definition.compatibleTypes, type));
  const make = (type: EvidenceV1["type"], direction: EvidenceV1["direction"], strength: number, code: string, rawValue?: unknown): EvidenceV1 => ({
    schemaVersion: SEMANTIC_CANDIDATE_SCHEMA_VERSION,
    evidenceId: `${sourceId}:${column.sourceColumnIndex}:${definition.canonicalId}:micro_brain_profile:${type}`,
    type, source: "source_profile", sourceId, physicalColumn: column.physicalColumnName, candidateId: definition.canonicalId,
    direction, strength, explanationCode: code, witnesses: rawValue === undefined ? [] : [{ rawValue }],
    limitations: ["Physical evidence validates registry compatibility independently of Micro Brain retrieval."],
  });
  if (compatible.length) evidence.push(make("physical_type_compatible", "support", 0.45, "micro_brain_candidate_profile_type_compatible", compatible));
  else if (types.some((type) => !["empty", "unknown", "mixed"].includes(type))) evidence.push(make("physical_type_conflict", "conflict", 0.7, "micro_brain_candidate_profile_type_conflict", types));
  if (definition.type === "time" && column.dateTimeSummary) evidence.push(make("date_shape", "support", 0.3, "micro_brain_candidate_full_file_date_shape", { minimumIso: column.dateTimeSummary.minimumIso, maximumIso: column.dateTimeSummary.maximumIso }));
  if (definition.type === "measure" && column.numericSummary) evidence.push(make("numeric_shape", "support", 0.3, "micro_brain_candidate_full_file_numeric_shape", { minimum: column.numericSummary.minimum, maximum: column.numericSummary.maximum }));
  if (definition.role === "identifier" && (column.uniqueness.uniquenessRatio ?? 0) >= 0.9) evidence.push(make("identifier_shape", "support", 0.38, "micro_brain_candidate_identifier_shape", column.uniqueness.uniquenessRatio));
  if (definition.role === "status" && column.stringSummary?.likelyCategorical) evidence.push(make("status_shape", "support", 0.36, "micro_brain_candidate_status_shape"));
  return evidence;
}

function createCandidate(candidateId: string, evidence: EvidenceV1, column: ColumnPhysicalProfileV1): SemanticCandidateV1 | null {
  const definition = SEMANTIC_SIGNAL_BY_ID.get(candidateId);
  if (!definition) return null;
  return {
    schemaVersion: SEMANTIC_CANDIDATE_SCHEMA_VERSION,
    candidateId: definition.canonicalId,
    label: definition.label,
    domain: definition.domain,
    domains: [...definition.domains],
    semanticFamily: definition.semanticFamily,
    signalType: definition.type,
    role: definition.role,
    registryCoverage: definition.coverageStatus,
    evidence: [evidence, ...bridgeProfileEvidence(definition, column, column.sourceId)].filter((item) => item.direction !== "conflict"),
    conflictEvidence: bridgeProfileEvidence(definition, column, column.sourceId).filter((item) => item.direction === "conflict"),
    limitations: [
      "Candidate was recovered by Micro Brain retrieval and remains unresolved.",
      "Canonical identity comes from the semantic registry; Micro Brain does not create canonical IDs.",
    ],
  };
}

function mayCreateNewCandidate(
  observation: CandidateArtifactV1["observations"][number],
  candidateId: string,
  hit: { fusedRank: number; sparseRank: number | null; denseRank: number | null },
): boolean {
  if (observation.state === "no_candidate") return true;
  const definition = SEMANTIC_SIGNAL_BY_ID.get(candidateId);
  if (!definition || definition.type !== "time" || definition.role !== "time") return false;
  return hit.fusedRank === 1 && hit.sparseRank === 1 && hit.denseRank === 1;
}

function nextState(original: ColumnObservationState, candidateCount: number): ColumnObservationState {
  if (original === "technical_candidate" || original === "unsupported_input") return original;
  return candidateCount > 0 ? "candidates_present" : "no_candidate";
}

function stateCounts(observations: CandidateArtifactV1["observations"]): CandidateArtifactV1["coverage"]["stateCounts"] {
  const counts: CandidateArtifactV1["coverage"]["stateCounts"] = {
    candidates_present: 0,
    no_candidate: 0,
    technical_candidate: 0,
    unsupported_input: 0,
  };
  for (const observation of observations) counts[observation.state] += 1;
  return counts;
}
export function augmentCandidateArtifactWithMicroBrain(
  physicalArtifact: DatasetUnderstandingArtifactV1,
  candidateArtifact: CandidateArtifactV1,
  index: CompiledMicroBrainIndexV1,
  options: MicroBrainCandidateBridgeOptionsV1 = {},
): CandidateArtifactV1 {
  if (candidateArtifact.schemaVersion !== CANDIDATE_ARTIFACT_SCHEMA_VERSION) {
    throw new Error("MICRO_BRAIN_CANDIDATE_ARTIFACT_VERSION_MISMATCH");
  }
  if (candidateArtifact.sourceId !== physicalArtifact.sourceProfile.source.sourceId) {
    throw new Error("MICRO_BRAIN_SOURCE_IDENTITY_MISMATCH");
  }
  const mode = options.mode ?? "selective";
  const maxCandidates = Math.min(Math.max(options.maxCandidatesPerColumn ?? 8, 1), 16);
  let queryCount = 0;
  let bridgedCandidateCount = 0;
  let openConceptHitCount = 0;

  const observations = candidateArtifact.observations.map((observation, observationIndex) => {
    const column = physicalArtifact.sourceProfile.columns[observationIndex];
    if (!column || column.physicalColumnName !== observation.physicalColumn) {
      throw new Error("MICRO_BRAIN_COLUMN_IDENTITY_MISMATCH");
    }
    const reason = mode === "all" ? "all_columns_benchmark" : microBrainShadowInvocationReason(observation);
    if (!reason) return observation;

    queryCount += 1;
    const signature = buildMicroBrainQuerySignature(physicalArtifact.sourceProfile, column, { limit: maxCandidates });
    const retrieval = retrieveMicroBrainConcepts(index, signature.query);
    const candidates = observation.candidateSet.candidates.map((candidate) => ({
      ...candidate,
      evidence: [...candidate.evidence],
      conflictEvidence: [...candidate.conflictEvidence],
      limitations: [...candidate.limitations],
    }));
    const candidateById = new Map(candidates.map((candidate) => [candidate.candidateId, candidate]));
    for (const hit of retrieval.hits) {
      if (!hit.canonicalSignal) {
        openConceptHitCount += 1;
        continue;
      }
      const evidence = createBridgeEvidence({
        sourceId: observation.sourceId,
        sourceColumnIndex: observation.sourceColumnIndex,
        physicalColumn: observation.physicalColumn,
        candidateId: hit.canonicalSignal,
        conceptId: hit.conceptId,
        fusedRank: hit.fusedRank,
        sparseRank: hit.sparseRank,
        denseRank: hit.denseRank,
        rrfScore: hit.rrfScore,
        denseSimilarity: hit.denseSimilarity,
        indexVersion: index.manifest.indexVersion,
      });
      const existing = candidateById.get(hit.canonicalSignal);
      if (existing) {
        if (!existing.evidence.some((item) => item.evidenceId === evidence.evidenceId)) {
          existing.evidence.push(evidence);
          existing.limitations = unique([...existing.limitations, ...evidence.limitations]);
          bridgedCandidateCount += 1;
        }
        continue;
      }
      if (!mayCreateNewCandidate(observation, hit.canonicalSignal, hit)) continue;
      const created = createCandidate(hit.canonicalSignal, evidence, column);
      if (!created) {
        openConceptHitCount += 1;
        continue;
      }
      candidates.push(created);
      candidateById.set(created.candidateId, created);
      bridgedCandidateCount += 1;
    }

    candidates.sort((left, right) => left.candidateId.localeCompare(right.candidateId));
    const state = nextState(observation.state, candidates.length);
    return {
      ...observation,
      state,
      candidateSet: {
        ...observation.candidateSet,
        candidates,
        limitations: unique([
          ...observation.candidateSet.limitations,
          `Micro Brain ${reason} retrieval executed in candidate-only mode.`,
          "Micro Brain retrieval does not alter official domain support or authorize metrics.",
        ]),
      },
      limitations: unique([...observation.limitations, `micro_brain_bridge:${reason}`]),
    };
  });
  return {
    ...candidateArtifact,
    observations,
    microBrainBridge: {
      schemaVersion: MICRO_BRAIN_CANDIDATE_BRIDGE_VERSION,
      mode,
      corpusVersion: index.manifest.corpusVersion,
      indexVersion: index.manifest.indexVersion,
      indexIdentity: index.manifest.logicalIndexSha256 ?? index.manifest.corpusSha256,
      queryCount,
      bridgedCandidateCount,
      openConceptHitCount,
      retrievalOnly: true,
    },
    coverage: {
      ...candidateArtifact.coverage,
      stateCounts: stateCounts(observations),
    },
    limitations: unique([
      ...candidateArtifact.limitations,
      "Micro Brain candidate bridge is active.",
      "Micro Brain retrieval remains lexical-family candidate evidence and cannot self-confirm semantics.",
    ]),
  };
}
