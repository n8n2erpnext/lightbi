import { describe, it, expect } from 'vitest';
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
