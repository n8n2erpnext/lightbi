export type QueryCellValue = string | number | boolean | null;

export type QueryResultColumn = {
  id: string;
  name: string;
  logicalType: "string" | "number" | "boolean" | "date" | "unknown";
  nativeType?: string;
};

export type QueryResultPage = {
  offset: number;
  limit: number;
  hasMore: boolean;
  estimatedTotal?: number;
};

export type QueryResultBuffer = {
  runId: string;
  columns: QueryResultColumn[];
  rows: QueryCellValue[][];
  rowIds?: string[];
  page: QueryResultPage;
  truncated: boolean;
};

export type QueryRunStatus =
  | "idle"
  | "running"
  | "partial"
  | "complete"
  | "cancelled"
  | "failed";

export type QueryRunState = {
  runId?: string;
  generation: number;
  status: QueryRunStatus;
  resultRef?: string;
  metadataStatus: "idle" | "loading" | "ready" | "failed";
};
