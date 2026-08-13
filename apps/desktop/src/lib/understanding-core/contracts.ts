export type SignalFamily =
  | "money"
  | "time"
  | "entity"
  | "item"
  | "location"
  | "document"
  | "status"
  | "quantity"
  | "inventory"
  | "engagement"
  | "indicator"
  | "event"
  | "quality";

export type SignalRole =
  | "measure"
  | "time"
  | "dimension"
  | "identifier"
  | "status"
  | "quality";

export type ActionKind =
  | "trend"
  | "group_by"
  | "distribution"
  | "table_preview"
  | "data_quality_review";

export type ExecutionScope = "sample_preview" | "full_local_file" | "blocked";

export type UnderstandingSourceKind =
  | "local_file"
  | "online_file"
  | "database_table"
  | "api_response"
  | "unknown";

export type UnderstandingCoreInput = {
  sourceKind?: UnderstandingSourceKind;
  sourceLabel?: string;
  fileNames?: string[];
  sheetNames?: string[];
  columns: string[];
  rows: Record<string, unknown>[];
  columnProfiles?: Record<string, InputColumnProfile>;
  sourceRowCount?: number;
};

export type InputColumnProfile = {
  name?: string;
  dataType?: "string" | "number" | "date" | "boolean" | "unknown";
  distinctCount?: number;
  nullPercent?: number;
  topValues?: string[];
  topValueCounts?: Array<{ value: string; count: number }>;
  nonEmptyCount?: number;
  dominanceRatio?: number;
  profiledRowCount?: number;
  profilingScope?: "full" | "sample";
};

export type ColumnHealth = {
  inferredType: "string" | "number" | "date" | "mixed" | "empty";
  nonEmptyCount: number;
  distinctCount: number;
  dominanceRatio?: number;
  topValues: Array<{ value: string; count: number }>;
};

export type UniversalSignal = {
  id: string;
  family: SignalFamily;
  role: SignalRole;
  label: string;
  physicalColumn: string;
  confidence: number;
  evidence: string[];
  health: ColumnHealth;
  usableForDefaultQuestion: boolean;
};

export type IndustryOverlay =
  | "generic_business"
  | "retail"
  | "b2b"
  | "healthcare"
  | "logistics"
  | "inventory"
  | "campaign"
  | "management"
  | "dirty_manual";

export type QuestionCandidate = {
  id: string;
  label: string;
  prompt: string;
  lens: string;
  intent: "trend" | "ranking" | "mix" | "exception_check" | "quality_review" | "lookup";
  requiredFamilies: SignalFamily[];
  requiredSignals: string[];
  optionalSignals: string[];
  fitScore: number;
  evidence: string[];
  action?: CoreAction;
  blockedReasons: string[];
};

export type CoreAction = {
  id: string;
  questionId: string;
  label: string;
  actionKind: ActionKind;
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

export type UnderstandingCoreResult = {
  source: {
    kind: UnderstandingSourceKind;
    label: string;
    fileNames: string[];
    sheetNames: string[];
    sourceRowCount: number;
    sampleRowCount: number;
    columnCount: number;
  };
  overlays: IndustryOverlay[];
  signals: UniversalSignal[];
  questions: QuestionCandidate[];
  actions: CoreAction[];
  blockedReasons: string[];
};
