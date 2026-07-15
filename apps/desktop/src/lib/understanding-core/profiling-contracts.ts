export const PHYSICAL_PROFILE_SCHEMA_VERSION = "lightbi.physical-profile.v1" as const;
export const REPRESENTATIVE_EVIDENCE_SCHEMA_VERSION = "lightbi.representative-evidence.v1" as const;
export const DATASET_UNDERSTANDING_ARTIFACT_SCHEMA_VERSION = "lightbi.dataset-understanding-artifact.v1" as const;

export type PhysicalSourceKind =
  | "local_file"
  | "online_file"
  | "database_table"
  | "api_response"
  | "unknown";

export type PhysicalSourceIdentityV1 = {
  sourceId: string;
  kind: PhysicalSourceKind;
  label: string;
  path?: string;
  sheet?: string;
  hash?: {
    algorithm: "sha256" | "unknown";
    value: string;
  };
};

export type CanonicalPhysicalSourceInputV1 = {
  schemaVersion: "lightbi.physical-source-input.v1";
  source: PhysicalSourceIdentityV1;
  rawRows: readonly (readonly unknown[])[];
  maxHeaderScanRows?: number;
};

export type PhysicalTypeName =
  | "empty"
  | "boolean"
  | "number"
  | "numeric_string"
  | "date"
  | "date_string"
  | "excel_serial_date"
  | "string"
  | "mixed"
  | "unknown";

export type PhysicalTypeCandidateV1 = {
  type: PhysicalTypeName;
  confidence: number;
  evidenceCount: number;
  evidence: string[];
};

export type ParseEvidenceV1 = {
  parser: "numeric" | "date" | "boolean" | "string";
  attemptedCount: number;
  successCount: number;
  failureCount: number;
  representativeFailures: Array<{ sourceRowIndex: number; rawValue: unknown }>;
};

export type CardinalityEvidenceV1 = {
  mode: "exact" | "lower_bound";
  distinctCount: number;
  observationLimit: number;
};

export type UniquenessEvidenceV1 = {
  nonNullCount: number;
  duplicateValueCount: number;
  duplicateRowCount: number;
  uniquenessRatio: number | null;
  isUnique: boolean | null;
};

export type NumericSummaryV1 = {
  parsedCount: number;
  minimum: number;
  maximum: number;
  mean: number;
  standardDeviation: number;
};

export type DateTimeSummaryV1 = {
  parsedCount: number;
  minimumIso: string;
  maximumIso: string;
  excelSerialCount: number;
};

export type StringSummaryV1 = {
  parsedCount: number;
  minimumLength: number;
  maximumLength: number;
  meanLength: number;
  topValues: Array<{ value: string; count: number }>;
  likelyCategorical: boolean;
};

export type StructuralIssueCode =
  | "source_empty"
  | "header_not_found"
  | "header_selection_ambiguous"
  | "header_offset"
  | "title_rows"
  | "merged_header_suspected"
  | "empty_header_column"
  | "empty_trailing_columns"
  | "duplicate_header"
  | "inconsistent_row_width"
  | "empty_data_row"
  | "null_values"
  | "mixed_type"
  | "malformed_value"
  | "formula_error"
  | "technical_column"
  | "ambiguous_date_locale"
  | "cardinality_bounded";

export type StructuralIssueV1 = {
  code: StructuralIssueCode;
  severity: "info" | "warning" | "error";
  physicalColumn: string | null;
  sourceRowIndices: number[];
  evidence: string[];
};

export type HeaderCandidateV1 = {
  sourceRowIndex: number;
  score: number;
  nonEmptyCellCount: number;
  effectiveWidth: number;
  evidence: string[];
};

export type HeaderRegionV1 = {
  selectedHeaderRowIndex: number | null;
  selectionConfidence: number;
  selectionStatus: "selected" | "ambiguous" | "not_found";
  physicalColumnNames: string[];
  skippedRows: Array<{ sourceRowIndex: number; rawValues: unknown[] }>;
  candidates: HeaderCandidateV1[];
};

export type ColumnPhysicalProfileV1 = {
  columnId: string;
  sourceId: string;
  sourceColumnIndex: number;
  physicalColumnName: string;
  rowCount: number;
  nonNullCount: number;
  nullCount: number;
  physicalTypeCandidates: PhysicalTypeCandidateV1[];
  parseEvidence: ParseEvidenceV1[];
  representativeRawValues: unknown[];
  cardinality: CardinalityEvidenceV1;
  uniqueness: UniquenessEvidenceV1;
  numericSummary: NumericSummaryV1 | null;
  dateTimeSummary: DateTimeSummaryV1 | null;
  stringSummary: StringSummaryV1 | null;
  technicalColumnEvidence: string[];
  issues: StructuralIssueV1[];
  limitations: string[];
};

export type SourceProfileV1 = {
  schemaVersion: typeof PHYSICAL_PROFILE_SCHEMA_VERSION;
  source: PhysicalSourceIdentityV1;
  sourceRowCount: number;
  profiledRowCount: number;
  profilingScope: "full";
  header: HeaderRegionV1;
  dataRegion: {
    firstSourceRowIndex: number | null;
    lastSourceRowIndex: number | null;
    rowCount: number;
    emptyRowsExcluded: number;
    selectionStatus: "selected" | "uncertain" | "not_found";
  };
  columns: ColumnPhysicalProfileV1[];
  issues: StructuralIssueV1[];
  limitations: string[];
  confidence: {
    level: "high" | "medium" | "low" | "unknown";
    score: number;
    evidence: string[];
  };
};

export type EvidenceRegion = "full" | "head" | "middle" | "tail" | "deterministic_random" | "supplemental";

export type RepresentativeEvidenceRowV1 = {
  dataRowIndex: number;
  sourceRowIndex: number;
  regions: EvidenceRegion[];
  reasons: string[];
  values: Record<string, unknown>;
};

export type RepresentativeEvidenceV1 = {
  schemaVersion: typeof REPRESENTATIVE_EVIDENCE_SCHEMA_VERSION;
  sourceId: string;
  strategy: "full" | "matrix_with_issue_supplement" | "unavailable";
  fullFileTruth: false;
  sourceDataRowCount: number;
  sampledRowCount: number;
  rows: RepresentativeEvidenceRowV1[];
  coveredRegions: EvidenceRegion[];
  issueSupplementCounts: Record<string, number>;
  limitations: string[];
};

export type DatasetUnderstandingArtifactV1 = {
  schemaVersion: typeof DATASET_UNDERSTANDING_ARTIFACT_SCHEMA_VERSION;
  sourceProfile: SourceProfileV1;
  representativeEvidence: RepresentativeEvidenceV1;
  provenance: {
    sourceId: string;
    sourceHash: PhysicalSourceIdentityV1["hash"] | null;
    profileSchemaVersion: typeof PHYSICAL_PROFILE_SCHEMA_VERSION;
    evidenceSchemaVersion: typeof REPRESENTATIVE_EVIDENCE_SCHEMA_VERSION;
  };
  limitations: string[];
};
