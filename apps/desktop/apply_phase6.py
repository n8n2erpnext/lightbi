import os

contract_code = """import type { DatasetUnderstanding, DatasetGrain } from './dataset-understanding-contract';
import type { DecisionReadinessTier } from './decision-readiness-engine';
import { getSignalType } from './business-signal-detector';

export type FieldRole = "dimension" | "measure" | "time" | "identifier" | "unknown";
export type AITrustLevel = "high" | "moderate" | "low";

export interface SemanticKeyEntry {
  canonicalId: string;
  role: FieldRole;
  safeForFilter: boolean;
  safeForGroup: boolean;
  safeForAggregate: boolean;
  note: string;
}

export interface AISemanticBriefing {
  briefingVersion: "1.0";
  generatedAt: string;
  datasetLabel: string;
  semanticKeys: SemanticKeyEntry[];
  grain: DatasetGrain;
  grainNote: string;
  trustLevel: AITrustLevel;
  trustRationale: string;
  safeActions: string[];
  caveats: string[];
}

export function generateAIBriefing(understanding: DatasetUnderstanding): AISemanticBriefing {
  const semanticKeys: SemanticKeyEntry[] = [];
  let hasDimension = false;
  let hasMeasure = false;
  let hasTime = false;
  let dimensionIds: string[] = [];
  let measureIds: string[] = [];

  for (const concept of understanding.detectedConcepts || []) {
    let role: FieldRole = "unknown";
    const baseType = getSignalType(concept.canonicalConcept);
    
    if (concept.canonicalConcept === "unrecognized" || concept.canonicalConcept === "unknown") {
      role = "unknown";
    } else if (concept.canonicalConcept.endsWith("_id")) {
      role = "identifier";
    } else if (baseType === "dimension") {
      role = "dimension";
    } else if (baseType === "measure") {
      role = "measure";
    } else if (baseType === "time") {
      role = "time";
    }

    const isDimensionOrId = role === "dimension" || role === "identifier";
    const isMeasure = role === "measure";
    const isTime = role === "time";
    const isUnknown = role === "unknown";

    if (isDimensionOrId) { hasDimension = true; dimensionIds.push(concept.canonicalConcept); }
    if (isMeasure) { hasMeasure = true; measureIds.push(concept.canonicalConcept); }
    if (isTime) hasTime = true;

    semanticKeys.push({
      canonicalId: concept.canonicalConcept,
      role,
      safeForFilter: !isUnknown,
      safeForGroup: isDimensionOrId,
      safeForAggregate: isMeasure,
      note: `Detected as ${role}`
    });
  }

  const safeActions: string[] = ["preview sample rows"];
  
  if (hasDimension && hasMeasure) {
    safeActions.push(`group by ${dimensionIds[0]} and sum ${measureIds[0]}`);
  }
  if (hasTime && hasMeasure) {
    safeActions.push(`trend ${measureIds[0]} over time`);
  }
  if (!hasMeasure && hasDimension) {
    safeActions.push(`count rows by ${dimensionIds[0]}`);
  }

  const caveatSet = new Set<string>();
  if (understanding.caveats) {
    for (const c of understanding.caveats) caveatSet.add(c);
  }
  if (understanding.readiness?.caveats) {
    for (const c of understanding.readiness.caveats) caveatSet.add(c);
  }

  const unknownCount = semanticKeys.filter(k => k.role === "unknown").length;
  if (unknownCount > 0) {
    const pct = Math.round((unknownCount / Math.max(semanticKeys.length, 1)) * 100);
    caveatSet.add(`${pct}% of recognized concepts have unknown roles`);
  }

  const tier = understanding.readiness?.tier || "exploratory_only";
  let trustLevel: AITrustLevel = "low";
  if (tier === "decision_support") trustLevel = "high";
  else if (tier === "caution") trustLevel = "moderate";

  const grain = understanding.grain || "unknown";
  let grainNote = "Row granularity could not be determined — verify before aggregation";
  const entityStr = understanding.inferredEntities?.length ? understanding.inferredEntities.join('/') : "record";

  if (grain === "event") grainNote = `Each row appears to be a ${entityStr} event`;
  else if (grain === "snapshot") grainNote = `Each row appears to be a point-in-time snapshot of ${entityStr}`;
  else if (grain === "entity") grainNote = `Each row appears to represent a single ${entityStr} record`;
  else if (grain === "summary") grainNote = "Each row appears to be a aggregated summary over a time period";

  return {
    briefingVersion: "1.0",
    generatedAt: new Date().toISOString(),
    datasetLabel: understanding.datasetName || "Unnamed Dataset",
    semanticKeys,
    grain,
    grainNote,
    trustLevel,
    trustRationale: understanding.readiness?.reasonSummary || "Unknown",
    safeActions,
    caveats: Array.from(caveatSet)
  };
}
"""

with open('src/lib/ai-briefing-contract.ts', 'w', encoding='utf-8') as f:
    f.write(contract_code)


test_code = """import { describe, it, expect } from 'vitest';
import { generateAIBriefing } from './ai-briefing-contract';
import type { DatasetUnderstanding } from './dataset-understanding-contract';

describe('AI Semantic Briefing Contract Phase 6', () => {
  it('Scenario 1: Dataset giao hàng đầy đủ (grain=event, tier=decision_support)', () => {
    const mockUnderstanding: DatasetUnderstanding = {
      id: 'test',
      status: 'understood',
      datasetName: 'Delivery Data',
      confidenceScore: 95,
      grain: 'event',
      grainEvidence: '',
      summary: {} as any,
      detectedConcepts: [
        { signalId: 'route', label: 'Route', canonicalConcept: 'route', confidenceScore: 90, evidence: [] },
        { signalId: 'report_date', label: 'Report Date', canonicalConcept: 'report_date', confidenceScore: 95, evidence: [] },
        { signalId: 'revenue', label: 'Revenue', canonicalConcept: 'revenue', confidenceScore: 80, evidence: [] }
      ],
      inferredEntities: ['delivery'],
      workflowHints: [],
      relationshipHints: [],
      capabilities: [],
      opportunities: [],
      availableAnalysis: [],
      unavailableAnalysis: [],
      caveats: [],
      narrative: '',
      sourceTrace: {} as any,
      createdAt: new Date().toISOString(),
      readiness: {
        score: 95,
        tier: 'decision_support',
        reasonSummary: 'Good to go',
        explanation: '',
        evidence: [],
        caveats: []
      }
    };

    const briefing = generateAIBriefing(mockUnderstanding);

    expect(briefing.trustLevel).toBe('high');
    expect(briefing.safeActions.length).toBeGreaterThanOrEqual(2);
    const keys = briefing.semanticKeys.map(k => k.canonicalId);
    expect(keys).toContain('route');
    expect(keys).toContain('revenue');
    expect(keys).toContain('report_date');
    expect(briefing.grainNote).toContain('event');
  });

  it('Scenario 2: Dataset tồn kho (grain=snapshot, tier=caution)', () => {
    const mockUnderstanding: DatasetUnderstanding = {
      id: 'test2',
      status: 'partial',
      datasetName: 'Inventory Data',
      confidenceScore: 80,
      grain: 'snapshot',
      grainEvidence: '',
      summary: {} as any,
      detectedConcepts: [
        { signalId: 'sku', label: 'SKU', canonicalConcept: 'sku', confidenceScore: 90, evidence: [] }
      ],
      inferredEntities: ['stock'],
      workflowHints: [],
      relationshipHints: [],
      capabilities: [],
      opportunities: [],
      availableAnalysis: [],
      unavailableAnalysis: [],
      caveats: [],
      narrative: '',
      sourceTrace: {} as any,
      createdAt: new Date().toISOString(),
      readiness: {
        score: 86,
        tier: 'caution',
        reasonSummary: '',
        explanation: '',
        evidence: [],
        caveats: []
      }
    };

    const briefing = generateAIBriefing(mockUnderstanding);
    
    expect(briefing.trustLevel).toBe('moderate');
    expect(briefing.grainNote).toContain('snapshot');
  });

  it('Scenario 3: Dataset sparse (grain=unknown, tier=exploratory_only)', () => {
    const mockUnderstanding: DatasetUnderstanding = {
      id: 'test3',
      status: 'insufficient',
      datasetName: 'Empty Data',
      confidenceScore: 0,
      grain: 'unknown',
      grainEvidence: '',
      summary: {} as any,
      detectedConcepts: [
        { signalId: 'unrecognized', label: 'Unrecognized', canonicalConcept: 'unrecognized', confidenceScore: 50, evidence: [] }
      ],
      inferredEntities: [],
      workflowHints: [],
      relationshipHints: [],
      capabilities: [],
      opportunities: [],
      availableAnalysis: [],
      unavailableAnalysis: [],
      caveats: [],
      narrative: '',
      sourceTrace: {} as any,
      createdAt: new Date().toISOString(),
      readiness: {
        score: 40,
        tier: 'exploratory_only',
        reasonSummary: '',
        explanation: '',
        evidence: [],
        caveats: []
      }
    };

    const briefing = generateAIBriefing(mockUnderstanding);
    
    expect(briefing.trustLevel).toBe('low');
    expect(briefing.caveats.length).toBeGreaterThan(0);
    expect(briefing.safeActions).toContain('preview sample rows');
  });

  it('Scenario 4: SemanticKey safeForGroup chỉ true với dimension/identifier', () => {
    const mockUnderstanding: DatasetUnderstanding = {
      id: 'test4',
      status: 'understood',
      datasetName: 'Test',
      confidenceScore: 0,
      grain: 'unknown',
      grainEvidence: '',
      summary: {} as any,
      detectedConcepts: [
        { signalId: 'route', label: 'Route', canonicalConcept: 'route', confidenceScore: 90, evidence: [] }, // dimension
        { signalId: 'revenue', label: 'Revenue', canonicalConcept: 'revenue', confidenceScore: 80, evidence: [] }, // measure
        { signalId: 'user_id', label: 'User ID', canonicalConcept: 'user_id', confidenceScore: 80, evidence: [] } // identifier
      ],
      inferredEntities: [],
      workflowHints: [],
      relationshipHints: [],
      capabilities: [],
      opportunities: [],
      availableAnalysis: [],
      unavailableAnalysis: [],
      caveats: [],
      narrative: '',
      sourceTrace: {} as any,
      createdAt: new Date().toISOString(),
      readiness: { score: 40, tier: 'exploratory_only', reasonSummary: '', explanation: '', evidence: [], caveats: [] }
    };

    const briefing = generateAIBriefing(mockUnderstanding);
    
    const route = briefing.semanticKeys.find(k => k.canonicalId === 'route');
    const revenue = briefing.semanticKeys.find(k => k.canonicalId === 'revenue');
    const userId = briefing.semanticKeys.find(k => k.canonicalId === 'user_id');

    expect(route?.safeForGroup).toBe(true);
    expect(userId?.safeForGroup).toBe(true);
    expect(revenue?.safeForGroup).toBe(false); // không cho phép measure safeForGroup=true
  });

  it('Scenario 5: SemanticKey safeForAggregate chỉ true với measure', () => {
    const mockUnderstanding: DatasetUnderstanding = {
      id: 'test5',
      status: 'understood',
      datasetName: 'Test',
      confidenceScore: 0,
      grain: 'unknown',
      grainEvidence: '',
      summary: {} as any,
      detectedConcepts: [
        { signalId: 'route', label: 'Route', canonicalConcept: 'route', confidenceScore: 90, evidence: [] }, // dimension
        { signalId: 'revenue', label: 'Revenue', canonicalConcept: 'revenue', confidenceScore: 80, evidence: [] } // measure
      ],
      inferredEntities: [],
      workflowHints: [],
      relationshipHints: [],
      capabilities: [],
      opportunities: [],
      availableAnalysis: [],
      unavailableAnalysis: [],
      caveats: [],
      narrative: '',
      sourceTrace: {} as any,
      createdAt: new Date().toISOString(),
      readiness: { score: 40, tier: 'exploratory_only', reasonSummary: '', explanation: '', evidence: [], caveats: [] }
    };

    const briefing = generateAIBriefing(mockUnderstanding);
    
    const route = briefing.semanticKeys.find(k => k.canonicalId === 'route');
    const revenue = briefing.semanticKeys.find(k => k.canonicalId === 'revenue');

    expect(revenue?.safeForAggregate).toBe(true);
    expect(route?.safeForAggregate).toBe(false); // không cho phép dimension safeForAggregate=true
  });
});
"""

with open('src/lib/ai-briefing-contract.test.ts', 'w', encoding='utf-8') as f:
    f.write(test_code)
