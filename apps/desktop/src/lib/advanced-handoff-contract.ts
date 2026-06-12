import type { DatasetUnderstanding } from './dataset-understanding-contract';
import type { DecisionReadinessTier } from './decision-readiness-engine';
import { getSignalType } from './business-signal-detector';

export type FieldLineage = {
  originalColumn: string;
  canonicalConcept: string | null;
  signalType: 'measure' | 'dimension' | 'time' | 'status' | 'unknown';
  confidenceScore: number;
  derivationNote?: string;
};

export type AdvancedHandoffArtifact = {
  datasetName: string;
  summary: {
    rowCount?: number;
    columnCount?: number;
  };
  grainHint: "event" | "entity" | "snapshot" | "summary" | "unknown";
  rawToCanonicalMapping: FieldLineage[];
  caveats: string[];
  readiness: {
    tier: DecisionReadinessTier;
    summary: string;
  };
};

export function generateAdvancedHandoff(understanding: DatasetUnderstanding): AdvancedHandoffArtifact {
  const rawToCanonicalMapping: FieldLineage[] = [];

  for (const concept of understanding.detectedConcepts) {
    for (const originalColumn of concept.evidence) {
      let signalType: 'measure' | 'dimension' | 'time' | 'status' | 'unknown' = 'unknown';
      const baseType = getSignalType(concept.canonicalConcept);
      
      if (['status', 'delivery_status', 'stock_status'].includes(concept.canonicalConcept)) {
        signalType = 'status';
      } else {
        signalType = baseType;
      }

      rawToCanonicalMapping.push({
        originalColumn,
        canonicalConcept: concept.canonicalConcept,
        signalType,
        confidenceScore: concept.confidenceScore,
        derivationNote: "Derived from semantic understanding core"
      });
    }
  }

  // Deduplicate caveats securely
  const caveatSet = new Set<string>();
  if (understanding.caveats) {
    for (const c of understanding.caveats) caveatSet.add(c);
  }
  if (understanding.readiness?.caveats) {
    for (const c of understanding.readiness.caveats) caveatSet.add(c);
  }

  const tier = understanding.readiness?.tier || "exploratory_only";
  const summary = understanding.readiness?.reasonSummary || "Insufficient readiness data evaluated. Use for exploration only.";

  return {
    datasetName: understanding.datasetName || "Unnamed Dataset",
    summary: {
      rowCount: understanding.summary.rowCount,
      columnCount: understanding.summary.columnCount
    },
    grainHint: understanding.grainHint,
    rawToCanonicalMapping,
    caveats: Array.from(caveatSet),
    readiness: {
      tier,
      summary
    }
  };
}
