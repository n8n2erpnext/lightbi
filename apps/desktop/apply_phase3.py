import re

# 1. Update decision-readiness-engine.ts
engine_code = """import type { DatasetUnderstanding } from './dataset-understanding-contract';
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
"""

with open('src/lib/decision-readiness-engine.ts', 'w', encoding='utf-8') as f:
    f.write(engine_code)


# 2. Update decision-readiness-engine.test.ts
test_code = """import { describe, it, expect } from 'vitest';
import { evaluateDecisionReadiness } from './decision-readiness-engine';
import type { DatasetUnderstanding } from './dataset-understanding-contract';

describe('Decision Readiness Engine (Phase 3)', () => {
  const createMockUnderstanding = (
    confidence: number,
    grain: any,
    concepts: string[],
    signalCount: number,
    colCount: number
  ): DatasetUnderstanding => ({
    id: 'du_1',
    status: 'understood',
    confidenceScore: confidence,
    grain,
    grainEvidence: '',
    summary: { rowCount: 100, columnCount: colCount, signalCount, perspectiveCount: 1, businessViewCount: 1, questionCount: 1 },
    detectedConcepts: concepts.map(c => ({ canonicalConcept: c, signalId: c, label: c, confidenceScore: confidence, evidence: [] })),
    inferredEntities: [],
    workflowHints: [],
    relationshipHints: [],
    capabilities: [],
    opportunities: [],
    availableAnalysis: [],
    unavailableAnalysis: [],
    caveats: [],
    narrative: '',
    sourceTrace: { signalIds: [], perspectiveIds: [], businessViewIds: [], questionSuggestionIds: [] },
    createdAt: ''
  });

  it('full scenario: >=90 score, decision_support, no caveats', () => {
    // 30 + 20 + 20 + 20 + 10 = 100
    const du = createMockUnderstanding(100, 'event', ['revenue', 'segment', 'report_date'], 3, 5);
    const result = evaluateDecisionReadiness(du);
    
    expect(result.score).toBe(100);
    expect(result.tier).toBe('decision_support');
    expect(result.caveats.length).toBe(0);
  });

  it('partial scenario: 85-89 score, caution', () => {
    // No time (-10), confidence 100 (+30), grain (+20), measure (+20), dim (+20) -> 90.
    // Let's make confidence 80 -> 24. 24 + 20 + 20 + 20 = 84 (exploratory).
    // Let's make confidence 85 -> 25.5. 25.5 + 20 + 20 + 20 = 85.5 -> 86 (caution).
    const du = createMockUnderstanding(85, 'entity', ['revenue', 'segment'], 2, 4);
    const result = evaluateDecisionReadiness(du);
    
    expect(result.score).toBeGreaterThanOrEqual(85);
    expect(result.score).toBeLessThan(90);
    expect(result.tier).toBe('caution');
    expect(result.caveats).toContain('No time detected.');
  });

  it('sparse scenario: exploratory_only due to low confidence and low signal ratio', () => {
    // Confidence 50 -> 15. measure (+20), dim (+20), no time (+0), grain unknown (+0) -> 55.
    const du = createMockUnderstanding(50, 'unknown', ['revenue', 'segment'], 2, 10);
    const result = evaluateDecisionReadiness(du);
    
    expect(result.score).toBeLessThan(85);
    expect(result.tier).toBe('exploratory_only');
    expect(result.caveats).toContain('Low signal ratio.');
    expect(result.caveats).toContain('Grain unknown.');
  });

  it('zero scenario: 0 score', () => {
    const du = createMockUnderstanding(0, 'unknown', [], 0, 5);
    const result = evaluateDecisionReadiness(du);
    
    expect(result.score).toBe(0);
    expect(result.tier).toBe('exploratory_only');
    expect(result.caveats).toContain('No measure detected.');
    expect(result.caveats).toContain('No dimension detected.');
  });

  it('measures-only scenario', () => {
    // Confidence 100 -> 30. Measure (+20). No grain (+0), no dim (+0), no time (+0). Score = 50.
    const du = createMockUnderstanding(100, 'unknown', ['revenue', 'cost'], 2, 3);
    const result = evaluateDecisionReadiness(du);
    
    expect(result.score).toBe(50);
    expect(result.tier).toBe('exploratory_only');
    expect(result.caveats).toContain('No dimension detected.');
    expect(result.caveats).toContain('No time detected.');
  });
});
"""

with open('src/lib/decision-readiness-engine.test.ts', 'w', encoding='utf-8') as f:
    f.write(test_code)

# 3. Update dataset-understanding-contract.ts
with open('src/lib/dataset-understanding-contract.ts', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("import type { DecisionReadiness } from './decision-readiness-engine';", "import type { ReadinessGuidance } from './decision-readiness-engine';")
content = content.replace("readiness?: DecisionReadiness;", "readiness?: ReadinessGuidance;")

# Replace evaluateDecisionReadiness call and logic
old_logic = """  const readiness = evaluateDecisionReadiness(baseUnderstanding as any, input.health);

  // Rebuild the readiness evidence coherently for the zero-opportunity case
  if (baseUnderstanding.opportunities.length === 0) {
    readiness.tier = "exploratory_only";
    readiness.reasonSummary = "Dataset lacks structural support to assemble actionable analysis.";
    
    // Modify existing semantic_coverage evidence rather than appending contradictory rows
    readiness.evidence = readiness.evidence.map(e => {
      if (e.factor === "semantic_coverage") {
        return {
          ...e,
          score: 0,
          description: "Zero actionable opportunities generated"
        };
      }
      return e;
    });

    // Mathematically recompute the final score based on updated evidence weights
    const exactScore = readiness.evidence.reduce((sum, e) => sum + (e.score * (e.weight / 100)), 0);
    readiness.score = Math.round(exactScore);

    const msg = "Could not assemble runnable analysis paths from detected signals.";
    if (!readiness.caveats.includes(msg)) {
      readiness.caveats.push(msg);
    }
  }"""

new_logic = """  const readiness = evaluateDecisionReadiness(baseUnderstanding as any);

  // Rebuild the readiness evidence coherently for the zero-opportunity case
  if (baseUnderstanding.opportunities.length === 0) {
    readiness.tier = "exploratory_only";
    readiness.explanation = "Dataset lacks structural support to assemble actionable analysis.";
    const msg = "Could not assemble runnable analysis paths from detected signals.";
    if (!readiness.caveats.includes(msg)) {
      readiness.caveats.push(msg);
    }
    if (readiness.score >= 85) readiness.score = 84;
  }"""

content = content.replace(old_logic, new_logic)

with open('src/lib/dataset-understanding-contract.ts', 'w', encoding='utf-8') as f:
    f.write(content)
