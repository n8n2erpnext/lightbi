import type { DatasetGrain } from './dataset-understanding-contract';

export interface AISemanticField {
  canonicalId: string;
  label: string;
  domain: string;
  role: "dimension" | "measure" | "time" | "unknown";
  confidence: number;
}

export interface AISafeBriefing {
  datasetId: string;
  generatedAt: string;
  grain: DatasetGrain;
  grainEvidence: string;
  readinessTier: string;
  readinessScore: number;
  semanticFields: AISemanticField[];
  caveats: string[];
  safeActionHints: string[];
}
