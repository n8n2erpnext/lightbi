import type { DatasetUnderstanding } from './dataset-understanding-contract';
import type { DatasetHealthResult } from './dataset-health-engine';

export type DecisionReadinessTier = "decision_support" | "reference_only" | "exploratory_only";

export type ReadinessEvidence = {
  factor: "dataset_health" | "understanding_confidence" | "semantic_coverage" | "execution_reliability";
  score: number;
  weight: number;
  description: string;
};

export type DecisionReadiness = {
  score: number;
  tier: DecisionReadinessTier;
  reasonSummary: string;
  evidence: ReadinessEvidence[];
  caveats: string[];
};

export function evaluateDecisionReadiness(
  understanding: DatasetUnderstanding,
  health?: DatasetHealthResult
): DecisionReadiness {
  const evidence: ReadinessEvidence[] = [];
  const caveats: string[] = [];

  const confidenceScore = understanding.confidenceScore || 0;
  
  let coverageScore = 0;
  if (understanding.status === "understood") coverageScore = 100;
  else if (understanding.status === "partial") coverageScore = 70;
  else coverageScore = 30;

  if ((understanding.opportunities && understanding.opportunities.length > 0) || 
      (understanding.availableAnalysis && understanding.availableAnalysis.length > 0)) {
    coverageScore = Math.min(100, coverageScore + 10);
  }

  const hasHealthEvidence = !!health;
  const healthScore = health ? health.overall : 0;

  if (hasHealthEvidence) {
    evidence.push({
      factor: "understanding_confidence",
      score: Math.round(confidenceScore),
      weight: 35,
      description: `Semantic confidence from signals`
    });
    evidence.push({
      factor: "semantic_coverage",
      score: Math.round(coverageScore),
      weight: 35,
      description: `Domain coverage and analytical action availability`
    });
    evidence.push({
      factor: "dataset_health",
      score: Math.round(healthScore),
      weight: 30,
      description: `Data completeness, consistency, and uniqueness`
    });
    
    if (health.warnings && health.warnings.length > 0) {
      caveats.push(`Health issues detected: ${health.warnings.map(w => w.message).join('; ')}`);
    }
  } else {
    evidence.push({
      factor: "understanding_confidence",
      score: Math.round(confidenceScore),
      weight: 50,
      description: `Semantic confidence from signals`
    });
    evidence.push({
      factor: "semantic_coverage",
      score: Math.round(coverageScore),
      weight: 50,
      description: `Domain coverage and analytical action availability`
    });
    evidence.push({
      factor: "dataset_health",
      score: 0,
      weight: 0,
      description: `No health profile available`
    });
    caveats.push("Missing dataset health evidence. Trust cannot be fully verified.");
  }

  let finalScore = 0;
  if (hasHealthEvidence) {
    finalScore = (confidenceScore * 0.35) + (coverageScore * 0.35) + (healthScore * 0.30);
  } else {
    finalScore = (confidenceScore * 0.50) + (coverageScore * 0.50);
  }
  
  finalScore = Math.round(finalScore);

  let reasonSummary = "";

  if (!hasHealthEvidence && finalScore >= 90) {
    finalScore = 89;
    caveats.push("Score downgraded to 89 (reference_only) because actual health evidence is missing.");
  }

  let tier: DecisionReadinessTier;
  if (finalScore >= 90) {
    tier = "decision_support";
    reasonSummary = "High semantic clarity and verified data health. Suitable for decision support.";
  } else if (finalScore >= 85) {
    tier = "reference_only";
    if (!hasHealthEvidence) {
      reasonSummary = "Strong semantic understanding, but unverified data health limits trust. Reference only.";
    } else {
      reasonSummary = "Minor gaps in health or semantic coverage. Use for reference.";
    }
  } else {
    tier = "exploratory_only";
    if (!hasHealthEvidence) {
      reasonSummary = "Weak semantic understanding and unverified data health. Exploratory use only.";
    } else {
      reasonSummary = "Significant gaps in data health or semantic understanding. Exploratory use only.";
    }
  }

  return {
    score: finalScore,
    tier,
    reasonSummary,
    evidence,
    caveats
  };
}
