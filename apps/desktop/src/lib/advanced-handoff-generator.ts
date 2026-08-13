import type { DatasetUnderstanding } from './dataset-understanding-contract';
import type { AdvancedHandoffArtifact, FieldMapping } from './advanced-handoff-contract';
import { getSignalType, TAXONOMY } from './business-signal-detector';

export function generateAdvancedHandoff(
  understanding: DatasetUnderstanding,
  rawColumns: string[]
): AdvancedHandoffArtifact {
  const fieldMappings: FieldMapping[] = [];

  for (const col of rawColumns) {
    // 1. Find mapping review
    const mapped = understanding.mappingReview?.items?.find(m => m.physicalColumn === col);
    
    let canonicalSignal: string | undefined = undefined;
    let confidence: number = 0;

    if (mapped && mapped.inferredSignal && mapped.issueType !== 'unrecognized') {
      canonicalSignal = mapped.inferredSignal;
      confidence = mapped.confidence;
    } else {
      // 2. Fallback to detectedConcepts
      const concept = understanding.detectedConcepts.find(c => c.evidence.includes(col));
      if (concept) {
        canonicalSignal = concept.canonicalConcept;
        confidence = concept.confidenceScore;
      }
    }

    let domain: string | undefined = undefined;
    let role: "dimension" | "measure" | "time" | "unknown" = "unknown";

    if (canonicalSignal) {
      domain = TAXONOMY[canonicalSignal]?.domain;
      role = getSignalType(canonicalSignal) as "dimension" | "measure" | "time" | "unknown";
    }

    fieldMappings.push({
      physicalColumn: col,
      canonicalSignal,
      domain,
      role,
      confidence
    });
  }

  // Deduplicate caveats
  const caveatsSet = new Set<string>();
  if (understanding.caveats) {
    understanding.caveats.forEach(c => caveatsSet.add(c));
  }
  if (understanding.readiness?.caveats) {
    understanding.readiness.caveats.forEach(c => caveatsSet.add(c));
  }

  return {
    datasetId: understanding.datasetId ?? understanding.id ?? 'unknown_dataset',
    datasetName: understanding.datasetName,
    generatedAt: new Date().toISOString(),
    grain: understanding.grain ?? 'unknown',
    grainEvidence: understanding.grainEvidence ?? '',
    readinessTier: understanding.readiness?.tier || "exploratory_only",
    readinessScore: understanding.readiness?.score || 0,
    fieldMappings,
    caveats: Array.from(caveatsSet)
  };
}
