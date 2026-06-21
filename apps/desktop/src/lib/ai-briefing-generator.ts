import type { DatasetUnderstanding } from './dataset-understanding-contract';
import type { AISafeBriefing, AISemanticField } from './ai-briefing-contract';
import { getSignalType } from './business-signal-detector';
import type { DatasetUnderstandingResult } from './understanding-next/contracts';

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

export function generateAIBriefingFromUnderstandingNext(
  understanding: DatasetUnderstandingResult
): AISafeBriefing {
  const semanticFields: AISemanticField[] = understanding.signals
    .filter(signal => signal.role !== "technical")
    .slice(0, 30)
    .map(signal => ({
      canonicalId: signal.canonicalId,
      label: signal.physicalColumn || signal.label,
      domain: signal.domain,
      role:
        signal.role === "time" || signal.role === "measure" || signal.role === "dimension"
          ? signal.role
          : signal.role === "status" || signal.role === "identifier"
            ? "dimension"
            : "unknown",
      confidence: signal.confidence
    }));

  const caveats = [
    ...understanding.quality.blockedReasons,
    ...understanding.quality.dirtySignals
      .filter(signal => signal.severity !== "info")
      .map(signal => signal.column ? `${signal.message}: ${signal.column}` : signal.message)
  ];

  const hasRunnableActions = understanding.availableActions.some(action => action.executionScope !== "not_supported");
  const tier = understanding.quality.headerStatus === "failed"
    ? "exploratory_only"
    : hasRunnableActions
      ? "caution"
      : "exploratory_only";

  return {
    datasetId: understanding.source.fileNames[0] ?? "local_dataset",
    generatedAt: new Date().toISOString(),
    grain: understanding.profile.grain,
    grainEvidence: [
      `${understanding.profile.documentType.replace(/_/g, " ")}`,
      understanding.profile.detectedDomains.length > 0
        ? `domains: ${understanding.profile.detectedDomains.join(", ")}`
        : "no domain signals"
    ].join(" · "),
    readinessTier: tier,
    readinessScore: tier === "caution" ? 70 : 35,
    semanticFields,
    caveats,
    safeActionHints: understanding.availableActions
      .slice(0, 5)
      .map(action => `Can run ${action.label}`)
  };
}
