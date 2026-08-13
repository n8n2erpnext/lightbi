export type ConfidenceSignalCategory =
  | "dataset_health"
  | "relationship_quality"
  | "result_validation"
  | "coverage"
  | "business_view"
  | "future";

export type ConfidenceSignal = {
  id: string;
  category: ConfidenceSignalCategory;
  label: string;
  score: number;
  weight: number;
  enabled: boolean;
  explanation: string;
  sourceContract?: string;
};

export type ConfidenceSignalRegistry = {
  version: string;
  isMultiDataset: boolean;
  signals: ConfidenceSignal[];
};

export type BusinessConfidenceMode = "provisional" | "final";
export type BusinessConfidenceLevel = "LOW" | "MEDIUM" | "HIGH";

export type BusinessConfidenceResult = {
  id: string;
  mode: BusinessConfidenceMode;
  score: number;
  level: BusinessConfidenceLevel;
  signals: ConfidenceSignal[];
  caveats: string[];
  explanation: string[];
};

export function determineConfidenceMode(registry: ConfidenceSignalRegistry): BusinessConfidenceMode {
  const hasResultValidation = registry.signals.some(s => s.category === "result_validation" && s.enabled);
  const hasCoverage = registry.signals.some(s => s.category === "coverage" && s.enabled);
  
  if (hasResultValidation && hasCoverage) {
    return "final";
  }
  return "provisional";
}

export function determineConfidenceLevel(score: number): BusinessConfidenceLevel {
  if (score < 60) return "LOW";
  if (score < 85) return "MEDIUM";
  return "HIGH";
}

export function generateConfidenceExplanation(
  level: BusinessConfidenceLevel, 
  mode: BusinessConfidenceMode, 
  signals: ConfidenceSignal[]
): { caveats: string[]; explanations: string[] } {
  const caveats: string[] = [];
  const explanations: string[] = [];

  if (mode === "provisional") {
    caveats.push("Runtime result has not been validated yet.");
  }

  if (level === "HIGH") {
    explanations.push("High confidence:");
    explanations.push("- Dataset quality is strong.");
    explanations.push("- Relationships are well supported.");
    explanations.push("- Business context matches the question.");
  } else if (level === "MEDIUM") {
    explanations.push("Medium confidence:");
    explanations.push("- Some confidence signals are weaker.");
    explanations.push("- Review relationship evidence.");
  } else {
    explanations.push("Low confidence:");
    explanations.push("- Dataset quality is weak.");
    explanations.push("- Relationship confidence is limited.");
  }

  // Also include explanations from signals that are weak
  for (const sig of signals) {
    if (sig.enabled && sig.score < 60) {
      caveats.push(`Signal '${sig.label}' is weak: ${sig.explanation}`);
    }
  }

  return { caveats, explanations };
}

export function calculateBusinessConfidence(registry: ConfidenceSignalRegistry): BusinessConfidenceResult {
  const enabledSignals = registry.signals.filter(s => s.enabled);
  
  let totalWeight = 0;
  for (const s of enabledSignals) {
    totalWeight += s.weight;
  }

  let finalScore = 0;
  if (totalWeight > 0) {
    for (const s of enabledSignals) {
      const normalizedWeight = s.weight / totalWeight;
      finalScore += s.score * normalizedWeight;
    }
  }

  finalScore = Math.round(finalScore);
  
  let level = determineConfidenceLevel(finalScore);
  const mode = determineConfidenceMode(registry);

  // Validation Rules
  // 1. If multi-dataset analysis and no relationship_quality signal exists: cap at MEDIUM
  if (registry.isMultiDataset) {
    const hasRel = enabledSignals.some(s => s.category === "relationship_quality");
    if (!hasRel && level === "HIGH") {
      level = "MEDIUM";
    }
  }

  // 2. If dataset_health score < 50: cap at MEDIUM
  const healthSignal = enabledSignals.find(s => s.category === "dataset_health");
  if (healthSignal && healthSignal.score < 50 && level === "HIGH") {
    level = "MEDIUM";
  }

  // 3. If all enabled signals > 90: confidence may become HIGH (it naturally will be, but just to be explicit)
  const allHigh = enabledSignals.length > 0 && enabledSignals.every(s => s.score > 90);
  if (allHigh && !registry.isMultiDataset && (!healthSignal || healthSignal.score >= 50)) {
    level = "HIGH";
  }

  const { caveats, explanations } = generateConfidenceExplanation(level, mode, enabledSignals);

  return {
    id: `conf-${Date.now()}`,
    mode,
    score: finalScore,
    level,
    signals: enabledSignals,
    caveats,
    explanation: explanations
  };
}
