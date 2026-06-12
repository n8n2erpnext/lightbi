import type { DatasetUnderstanding } from './dataset-understanding-contract';
import type { DecisionReadinessTier } from './decision-readiness-engine';
import { getSignalType } from './business-signal-detector';

export type AISemanticField = {
  canonicalConcept: string;
  label: string;
  signalType: 'measure' | 'dimension' | 'time' | 'status' | 'unknown';
  confidenceScore: number;
  sourceColumns: string[];
};

export type AISafeActionHint = {
  label: string;
  actionType: "group_by" | "trend" | "distribution" | "relationship";
  dimensions: string[];
  measures: string[];
};

export type AIBriefingReadiness = {
  tier: DecisionReadinessTier;
  isTrustworthy: boolean; // Explicit flag for AI: true only if decision_support
  summary: string;
};

export type AIBriefingContract = {
  datasetName: string;
  grain: "event" | "entity" | "snapshot" | "summary" | "unknown";
  readiness: AIBriefingReadiness;
  caveats: string[]; // Critical instructions for AI
  keySemanticFields: AISemanticField[];
  safeActionHints: AISafeActionHint[];
};

export function generateAIBriefing(understanding: DatasetUnderstanding): AIBriefingContract {
  // Extract explicit, AI-friendly semantic fields
  const keySemanticFields: AISemanticField[] = understanding.detectedConcepts.map(concept => {
    let signalType: 'measure' | 'dimension' | 'time' | 'status' | 'unknown' = 'unknown';
    const baseType = getSignalType(concept.canonicalConcept);
    
    // Honest role derivation
    if (['status', 'delivery_status', 'stock_status'].includes(concept.canonicalConcept)) {
      signalType = 'status';
    } else {
      signalType = baseType;
    }

    return {
      canonicalConcept: concept.canonicalConcept,
      label: concept.label,
      signalType,
      confidenceScore: concept.confidenceScore,
      sourceColumns: concept.evidence
    };
  });

  // Extract safe action hints directly from opportunities
  const safeActionHints: AISafeActionHint[] = understanding.opportunities.map(opp => ({
    label: opp.label,
    actionType: opp.actionType,
    dimensions: opp.dimensions,
    measures: opp.measures
  }));

  // Aggregate and deduplicate caveats securely
  const caveatSet = new Set<string>();
  if (understanding.caveats) {
    for (const c of understanding.caveats) caveatSet.add(c);
  }
  if (understanding.readiness?.caveats) {
    for (const c of understanding.readiness.caveats) caveatSet.add(c);
  }

  // Handle readiness prominently
  const tier = understanding.readiness?.tier || "exploratory_only";
  const isTrustworthy = tier === "decision_support";
  
  let summary = understanding.readiness?.reasonSummary || "Insufficient readiness data evaluated. Use for exploration only.";
  // Make weak readiness impossible for AI to miss
  if (!isTrustworthy) {
    summary = `WARNING: ${summary} AI must exercise extreme caution. Data is not fully trusted for decisions.`;
  }

  return {
    datasetName: understanding.datasetName || "Unnamed Dataset",
    grain: understanding.grainHint,
    readiness: {
      tier,
      isTrustworthy,
      summary
    },
    caveats: Array.from(caveatSet),
    keySemanticFields,
    safeActionHints
  };
}
