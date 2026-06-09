export interface DatasetLineage {
  id: string;
  datasetId: string;
  sourceIds: string[];
  recipeIds: string[];
  parentDatasetIds: string[];
  generatedDatasetIds: string[];
  transformationSummary: string;
  lastEvaluatedAt?: string;
  materializationStatus?: 'Pending' | 'Materialized' | 'Failed';
  createdAt: string;
}
