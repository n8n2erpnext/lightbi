import type { DatasetUnderstanding } from './dataset-understanding-contract';
import type { AISafeBriefing, AISemanticField } from './ai-briefing-contract';
import { getSignalType } from './business-signal-detector';

export function generateAIBriefing(understanding: DatasetUnderstanding): AISafeBriefing {
  const semanticFields: AISemanticField[] = (understanding.detectedConcepts || []).map(concept => {
    let role: "dimension" | "measure" | "time" | "unknown" = "unknown";
    const baseType = getSignalType(concept.canonicalConcept);
    
    if (concept.canonicalConcept === "unrecognized" || concept.canonicalConcept === "unknown") {
      role = "unknown";
    } else if (concept.canonicalConcept.endsWith("_id")) {
      role = "dimension";
    } else if (baseType === "dimension" || baseType === "measure" || baseType === "time") {
      role = baseType as any;
    }

    return {
      canonicalId: concept.canonicalConcept,
      label: concept.displayName || concept.canonicalConcept,
      domain: concept.businessDomain || 'general',
      role,
      confidence: concept.confidenceScore
    };
  });

  const caveatsSet = new Set<string>();
  if (understanding.caveats) {
    understanding.caveats.forEach(c => caveatsSet.add(c));
  }
  if (understanding.readiness?.caveats) {
    understanding.readiness.caveats.forEach(c => caveatsSet.add(c));
  }

  const safeActionHints: string[] = [];
  if (understanding.opportunities) {
    for (const opp of understanding.opportunities) {
      if (opp.confidence === 'high' || opp.confidence === 'medium') {
        if (safeActionHints.length < 5) {
          safeActionHints.push(`Can ${opp.label}`);
        }
      }
    }
  }

  return {
    datasetId: understanding.datasetId || 'unknown_dataset',
    generatedAt: new Date().toISOString(),
    grain: understanding.grain || 'unknown',
    grainEvidence: understanding.grainEvidence || '',
    readinessTier: understanding.readiness?.tier || 'exploratory_only',
    readinessScore: understanding.readiness?.score || 0,
    semanticFields,
    caveats: Array.from(caveatsSet),
    safeActionHints
  };
}
