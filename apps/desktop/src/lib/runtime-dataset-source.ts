export type LocalRuntimeFileSource = {
  file: File;
  sheetName?: string;
};

export type RuntimeDatasetSource = {
  kind: "local_files";
  files: LocalRuntimeFileSource[];
  sourceRowCount: number;
};

export type RuntimeRowScope = "full_file" | "retained_rows" | "semantic_sample" | "preview";
