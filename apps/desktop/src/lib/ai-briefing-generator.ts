import type { DatasetUnderstanding } from './dataset-understanding-contract';
import type { AISafeBriefing, AISemanticField } from './ai-briefing-contract';
import { getSignalType } from './business-signal-detector';
import type { DatasetUnderstandingResult, DirtySignal } from './understanding-next/contracts';

export function generateAIBriefing(understanding: DatasetUnderstanding): AISafeBriefing {
  const semanticFields: AISemanticField[] = (understanding.detectedConcepts || []).map(concept => {
    let role: "dimension" | "measure" | "time" | "unknown" = "unknown";
    const baseType = getSignalType(concept.canonicalConcept);
    
    if (concept.canonicalConcept === "unrecognized" || concept.canonicalConcept === "unknown") {
      role = "unknown";
    } else if (concept.canonicalConcept.endsWith("_id")) {
      role = "dimension";
    } else if (baseType === "dimension" || baseType === "measure" || baseType === "time") {
      role = baseType;
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

  const readiness = scoreUnderstandingNextReadiness(understanding);

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
    readinessTier: readiness.tier,
    readinessScore: readiness.score,
    semanticFields,
    caveats,
    safeActionHints: understanding.availableActions
      .slice(0, 5)
      .map(action => `Can run ${action.label}`)
  };
}

function scoreUnderstandingNextReadiness(
  understanding: DatasetUnderstandingResult
): { tier: "decision_support" | "caution" | "exploratory_only"; score: number } {
  if (understanding.quality.headerStatus === "failed") {
    return { tier: "exploratory_only", score: 25 };
  }

  let score = 35;

  score += headerScore(understanding.quality.headerStatus);

  if (understanding.profile.grain !== "unknown") score += 10;
  if (understanding.profile.detectedDomains.length > 0) score += 6;

  const usableSignals = understanding.signals.filter(signal => signal.role !== "technical");
  const signalRoles = new Set(usableSignals.map(signal => signal.role));
  if (signalRoles.has("measure")) score += 8;
  if (signalRoles.has("dimension") || signalRoles.has("status") || signalRoles.has("identifier")) score += 8;
  if (signalRoles.has("time")) score += 6;

  const averageSignalConfidence = usableSignals.length
    ? usableSignals.reduce((sum, signal) => sum + signal.confidence, 0) / usableSignals.length
    : 0;
  score += Math.min(10, Math.round((averageSignalConfidence / 100) * 10));
  score += Math.min(8, Math.round(usableSignals.length / 2));

  const executableActions = understanding.availableActions.filter(action => action.executionScope !== "not_supported");
  score += Math.min(10, executableActions.length * 3);
  if (executableActions.some(action => action.executionScope === "full_local_file")) score += 4;

  const bestQuestionFit = Math.max(0, ...understanding.recommendedQuestions.map(question => question.fitScore));
  score += Math.min(5, Math.round(bestQuestionFit / 20));

  score -= dirtySignalPenalty(understanding.quality.dirtySignals);
  score -= Math.min(18, understanding.quality.blockedReasons.length * 6);
  score -= Math.min(12, understanding.unavailableActions.length * 2);

  const boundedScore = Math.max(0, Math.min(100, Math.round(score)));
  const tier = boundedScore >= 85
    ? "decision_support"
    : boundedScore >= 55
      ? "caution"
      : "exploratory_only";

  return { tier, score: boundedScore };
}

function headerScore(status: DatasetUnderstandingResult["quality"]["headerStatus"]): number {
  switch (status) {
    case "clean":
      return 12;
    case "recovered":
      return 8;
    case "ambiguous":
      return 2;
    case "failed":
      return 0;
  }
}

function dirtySignalPenalty(signals: DirtySignal[]): number {
  return Math.min(
    30,
    signals.reduce((sum, signal) => {
      switch (signal.severity) {
        case "blocking":
          return sum + 10;
        case "warning":
          return sum + 5;
        case "info":
          return sum + 1;
      }
    }, 0)
  );
}
