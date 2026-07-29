export type LocalRuntimeFileSource = {
  file: File;
  sheetName?: string;
  headerRowIndex?: number;
};

export type RuntimeSourceBindingV1 = {
  datasetId: string;
  sourceId: string;
  sourceFingerprint: string;
  inspectionGeneration: string;
  profileGeneration: string;
};

export type RuntimeDatasetSource = {
  kind: "local_files";
  files: LocalRuntimeFileSource[];
  sourceRowCount: number;
  binding?: RuntimeSourceBindingV1;
};

export type RuntimeRowScope = "full_file" | "retained_rows" | "semantic_sample" | "preview";
