import type { DatasetGrain } from './dataset-understanding-contract';

export interface AISemanticField {
  canonicalId: string;
  label: string;
  domain: string;
  role: "dimension" | "measure" | "time" | "status" | "identifier" | "unknown";
  confidence: number;
  resolutionState?: "confirmed" | "probable";
  semanticSource?: "registry" | "micro_brain";
  registryCoverageStatus?: "supported" | "partial" | "advertised_only";
  coverageStatus?: "recognized" | "partial" | "unknown_business_like" | "technical_or_noise";
  physicalColumn?: string;
  sampleValues?: string[];
  reason?: string;
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
  semanticCoverage?: {
    totalColumns: number;
    nonEmptyColumns: number;
    recognized: number;
    partial: number;
    unknownBusinessLike: number;
    technicalOrNoise: number;
    coverageScore: number;
    unknownBusinessLikeColumns: string[];
    partialColumns: string[];
  };
}
