import type { DatasetUnderstanding } from './dataset-understanding-contract';
import { getSignalType } from './business-signal-detector';

export type ReadinessTier = "decision_support" | "caution" | "exploratory_only";

export type ReadinessGuidance = {
  score: number;
  tier: ReadinessTier;
  explanation: string;
  caveats: string[];
};

export function evaluateDecisionReadiness(
  understanding: DatasetUnderstanding
): ReadinessGuidance {
  let score = 0;
  const caveats: string[] = [];

  const signalIds = understanding.detectedConcepts.map(c => c.canonicalConcept);
  
  const hasMeasure = signalIds.some(id => getSignalType(id) === 'measure');
  const hasDimension = signalIds.some(id => getSignalType(id) === 'dimension');
  const hasTime = signalIds.some(id => getSignalType(id) === 'time');
  
  const hasGrain = understanding.grain !== "unknown";

  // 1. signals +30 (weighted by confidence)
  const signalConfidence = understanding.confidenceScore || 0;
  const signalsScore = (signalConfidence / 100) * 30;
  score += signalsScore;

  if (hasGrain) score += 20;
  if (hasMeasure) score += 20;
  if (hasDimension) score += 20;
  if (hasTime) score += 10;

  // low signal ratio condition:
  const signalCount = understanding.summary?.signalCount || 0;
  const colCount = understanding.summary?.columnCount || 1;
  const isLowSignalRatio = (colCount > 0) ? (signalCount / colCount < 0.5) : false;

  if (!hasMeasure) caveats.push("No measure detected.");
  if (!hasDimension) caveats.push("No dimension detected.");
  if (!hasTime) caveats.push("No time detected.");
  if (!hasGrain) caveats.push("Grain unknown.");
  if (isLowSignalRatio) caveats.push("Low signal ratio.");

  const roundedScore = Math.round(score);

  let tier: ReadinessTier;
  let explanation: string;

  if (roundedScore >= 90) {
    tier = "decision_support";
    explanation = "Dataset is highly structured and ready for reliable analysis.";
  } else if (roundedScore >= 85) {
    tier = "caution";
    explanation = "Dataset has good structure but contains minor gaps. Interpret results with caution.";
  } else {
    tier = "exploratory_only";
    explanation = "Dataset lacks sufficient structure. Use for exploratory purposes only.";
  }

  return {
    score: roundedScore,
    tier,
    explanation,
    caveats
  };
}
