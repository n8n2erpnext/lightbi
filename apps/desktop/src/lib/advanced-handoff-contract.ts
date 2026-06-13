import type { DatasetGrain } from './dataset-understanding-contract';

export interface FieldMapping {
  physicalColumn: string;
  canonicalSignal?: string;
  domain?: string;
  role: "dimension" | "measure" | "time" | "unknown";
  confidence: number;
}

export interface AdvancedHandoffArtifact {
  datasetId: string;
  datasetName?: string;
  generatedAt: string;
  grain: DatasetGrain;
  grainEvidence: string;
  readinessTier: string;
  readinessScore: number;
  fieldMappings: FieldMapping[];
  caveats: string[];
}
