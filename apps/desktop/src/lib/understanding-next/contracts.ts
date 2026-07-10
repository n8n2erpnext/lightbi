export type DomainId =
  | "operations"
  | "revenue"
  | "inventory"
  | "customer"
  | "performance"
  | "finance";

export type DatasetGrain =
  | "transaction"
  | "event"
  | "snapshot"
  | "master_data"
  | "summary"
  | "unknown";

export type DocumentType =
  | "retail_sales_document"
  | "logistics_intake_report"
  | "logistics_export_report"
  | "inventory_snapshot"
  | "product_master"
  | "management_ranking"
  | "dirty_operational_export"
  | "generic_table";

export type HeaderStatus = "clean" | "recovered" | "ambiguous" | "failed";

export type ExecutionScope = "sample_preview" | "full_local_file" | "not_supported";

export type DirtySignalKind =
  | "formula_error"
  | "technical_column"
  | "excel_serial_date"
  | "mixed_text_number"
  | "money_embedded_in_text"
  | "blank_or_duplicate_header"
  | "empty_schema"
  | "dominant_single_value";

export type DirtySignal = {
  kind: DirtySignalKind;
  column?: string;
  severity: "info" | "warning" | "blocking";
  message: string;
  evidence: string[];
};

export type ColumnTypeHealth = {
  inferredType: "string" | "number" | "date" | "boolean" | "mixed" | "empty";
  nonEmptyCount: number;
  parseSuccessRate: number;
  distinctCount: number;
  dominanceRatio?: number;
  topValues: Array<{ value: string; count: number }>;
};

export type SourceProfile = {
  fileNames: string[];
  sheetNames: string[];
  sourceRowCount: number;
  sourceColumnCount: number;
  parsedRowCount: number;
  sampleRowCount: number;
};

export type DatasetProfile = {
  source: SourceProfile;
  quality: {
    headerStatus: HeaderStatus;
    dirtySignals: DirtySignal[];
    blockedReasons: string[];
  };
  profile: {
    grain: DatasetGrain;
    documentType: DocumentType;
    detectedDomains: DomainId[];
  };
  columns: Array<{
    name: string;
    normalizedName: string;
    health: ColumnTypeHealth;
  }>;
};

export type BusinessSignal = {
  canonicalId: string;
  label: string;
  domain: DomainId;
  physicalColumn: string;
  confidence: number;
  evidence: string[];
  cardinality: number;
  dominanceRatio?: number;
  role: "time" | "measure" | "dimension" | "status" | "identifier" | "technical";
  usableForDefaultQuestion: boolean;
};

export type BusinessPerspective = {
  id: string;
  label: string;
  domain: DomainId;
  reason: string;
  signalIds: string[];
};

export type BusinessStakeholderFit = {
  id: string;
  label: string;
  score: number;
  domains: DomainId[];
  matchedSignals: string[];
  matchedColumns: string[];
  reasons: string[];
};

export type SemanticDomainAffinity = {
  domain: DomainId;
  score: number;
  matchedSignals: string[];
  matchedColumns: string[];
  reasons: string[];
};

export type BusinessQuestion = {
  id: string;
  label: string;
  userPrompt: string;
  domain: DomainId;
  perspectiveId: string;
  requiredSignals: string[];
  optionalSignals: string[];
  dimensions: string[];
  measures: string[];
  measureAggregations?: Record<string, "SUM" | "COUNT" | "AVG">;
  derivedMeasures?: DerivedMeasure[];
  fitScore: number;
  actionKind: "trend" | "group_by" | "distribution" | "relationship" | "table_preview" | "data_quality_review";
  executionScope: ExecutionScope;
  caveats: string[];
};

export type AnalysisAction = {
  id: string;
  questionId: string;
  label: string;
  actionKind: BusinessQuestion["actionKind"];
  dimensions: string[];
  measures: string[];
  measureAggregations?: Record<string, "SUM" | "COUNT" | "AVG">;
  derivedMeasures?: DerivedMeasure[];
  executionScope: ExecutionScope;
};

export type DerivedMeasure = {
  id: string;
  label: string;
  type: "positive_rate";
  sourceColumn: string;
  positiveValues: string[];
  numeratorLabel: string;
  denominatorLabel: string;
};

export type QuestionIntent =
  | "compare"
  | "trend"
  | "mix"
  | "exception_check"
  | "quality_review"
  | "lookup"
  | "ranking";

export type OrientationQuestion = {
  id: string;
  lensId: string;
  label: string;
  userPrompt: string;
  intent: QuestionIntent;
  defaultAction?: AnalysisAction;
  blockedReasons: string[];
};

export type BusinessLens = {
  id: string;
  domain: DomainId;
  label: string;
  description: string;
  priority: number;
  requiredSignals: string[];
  optionalSignals: string[];
  availability: "ready" | "partial" | "blocked" | "not_implemented";
  reasons: string[];
  questions: OrientationQuestion[];
};

export type UnavailableAction = {
  id: string;
  label: string;
  reason: string;
  missingSignals: string[];
  blockedReasons: string[];
};

export type DatasetUnderstandingResult = {
  source: SourceProfile;
  quality: DatasetProfile["quality"];
  profile: DatasetProfile["profile"];
  columns?: DatasetProfile["columns"];
  signals: BusinessSignal[];
  domainAffinities?: SemanticDomainAffinity[];
  stakeholderFits: BusinessStakeholderFit[];
  lenses: BusinessLens[];
  perspectives: BusinessPerspective[];
  recommendedQuestions: BusinessQuestion[];
  availableActions: AnalysisAction[];
  unavailableActions: UnavailableAction[];
};

export type UnderstandingInput = {
  fileNames: string[];
  sheetNames?: string[];
  columns: string[];
  rows: Record<string, unknown>[];
  sourceRowCount?: number;
};
