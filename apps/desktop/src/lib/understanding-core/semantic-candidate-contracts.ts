import type { SemanticCoverageSupport, SemanticRole, SignalType } from "../semantic-registry";

export const SEMANTIC_CANDIDATE_SCHEMA_VERSION = "lightbi.semantic-candidate.v1" as const;
export const SEMANTIC_CANDIDATE_SET_SCHEMA_VERSION = "lightbi.semantic-candidate-set.v1" as const;
export const COLUMN_OBSERVATION_SCHEMA_VERSION = "lightbi.column-observation.v1" as const;
export const CANDIDATE_ARTIFACT_SCHEMA_VERSION = "lightbi.candidate-artifact.v1" as const;

export type EvidenceDirection = "support" | "conflict" | "neutral";

export type EvidenceSource =
  | "semantic_registry"
  | "source_profile"
  | "representative_evidence"
  | "structural_profile"
  | "candidate_generator";

export type SemanticEvidenceType =
  | "canonical_header_exact"
  | "header_alias_exact"
  | "alias_exact"
  | "alias_token_containment"
  | "alias_collision"
  | "value_alias"
  | "value_pattern"
  | "physical_type_compatible"
  | "physical_type_conflict"
  | "numeric_shape"
  | "date_shape"
  | "string_shape"
  | "identifier_shape"
  | "categorical_shape"
  | "status_shape"
  | "sibling_header_context"
  | "technical_column"
  | "structural_issue"
  | "parse_failure"
  | "mixed_type"
  | "unsupported_value";

export type EvidenceWitnessV1 = {
  sourceRowIndex?: number;
  dataRowIndex?: number;
  rawValue?: unknown;
  normalizedValue?: string;
  registrySurface?: string;
};

export type EvidenceV1 = {
  schemaVersion: typeof SEMANTIC_CANDIDATE_SCHEMA_VERSION;
  evidenceId: string;
  type: SemanticEvidenceType;
  source: EvidenceSource;
  sourceId: string;
  physicalColumn: string;
  candidateId: string | null;
  direction: EvidenceDirection;
  strength: number;
  explanationCode: string;
  witnesses: EvidenceWitnessV1[];
  limitations: string[];
};

export type ConflictEvidenceV1 = EvidenceV1 & {
  direction: "conflict";
};

export type SemanticCandidateV1 = {
  schemaVersion: typeof SEMANTIC_CANDIDATE_SCHEMA_VERSION;
  candidateId: string;
  label: string;
  domain: string;
  domains: string[];
  semanticFamily: string;
  signalType: SignalType;
  role: SemanticRole;
  registryCoverage: SemanticCoverageSupport;
  evidence: EvidenceV1[];
  conflictEvidence: ConflictEvidenceV1[];
  limitations: string[];
};

export type CandidateSetV1 = {
  schemaVersion: typeof SEMANTIC_CANDIDATE_SET_SCHEMA_VERSION;
  sourceId: string;
  physicalColumn: string;
  candidates: SemanticCandidateV1[];
  hasAliasCollision: boolean;
  candidateOnly: true;
  contextualResolution: {
    contractAvailable: true;
    executed: false;
    requiredEvidence: string[];
  };
  limitations: string[];
};

export type ColumnObservationState =
  | "candidates_present"
  | "no_candidate"
  | "technical_candidate"
  | "unsupported_input";

export type ColumnObservationV1 = {
  schemaVersion: typeof COLUMN_OBSERVATION_SCHEMA_VERSION;
  sourceId: string;
  columnId: string;
  sourceColumnIndex: number;
  physicalColumn: string;
  state: ColumnObservationState;
  candidateSet: CandidateSetV1;
  columnEvidence: EvidenceV1[];
  limitations: string[];
};

export type CandidateArtifactV1 = {
  schemaVersion: typeof CANDIDATE_ARTIFACT_SCHEMA_VERSION;
  sourceId: string;
  sourceHash: { algorithm: "sha256" | "unknown"; value: string } | null;
  profileSchemaVersion: string;
  registryVersion: "semantic-signal-registry.v1";
  observations: ColumnObservationV1[];
  coverage: {
    physicalColumnCount: number;
    observedColumnCount: number;
    stateCounts: Record<ColumnObservationState, number>;
  };
  limitations: string[];
};
