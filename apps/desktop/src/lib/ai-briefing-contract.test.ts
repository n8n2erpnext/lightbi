import { describe, it, expect } from 'vitest';
import { generateAIBriefing } from './ai-briefing-contract';
import type { DatasetUnderstanding } from './dataset-understanding-contract';

describe('AI Briefing Contract', () => {
  it('extracts semantic fields correctly and surfaces weak readiness clearly', () => {
    const mockUnderstanding: DatasetUnderstanding = {
      id: 'test',
      status: 'understood',
      datasetName: 'AI Test Data',
      confidenceScore: 90,
      grainHint: 'summary',
      summary: {
        rowCount: 500,
        columnCount: 4,
        signalCount: 2,
        perspectiveCount: 1,
        businessViewCount: 0,
        questionCount: 0
      },
      detectedConcepts: [
        {
          signalId: 'revenue',
          label: 'Revenue',
          canonicalConcept: 'revenue',
          confidenceScore: 90,
          evidence: ['Revenue 2024']
        },
        {
          signalId: 'status',
          label: 'Status',
          canonicalConcept: 'status',
          confidenceScore: 85,
          evidence: ['Current Status']
        }
      ],
      inferredEntities: [],
      workflowHints: [],
      relationshipHints: [],
      capabilities: [
        { id: 'c1', actionType: 'group_by', dimensions: ['status'], measures: ['revenue'] },
        { id: 'c2', actionType: 'trend', dimensions: ['time'], measures: ['revenue'] }
      ],
      opportunities: [
        {
          id: 'opp1',
          label: 'Revenue by Status',
          actionType: 'group_by',
          dimensions: ['status'],
          measures: ['revenue'],
          source: 'signals',
          basedOnSignals: ['status', 'revenue']
        }
      ],
      availableAnalysis: [],
      unavailableAnalysis: [],
      caveats: ['Has missing records'],
      narrative: '',
      sourceTrace: { signalIds: [], perspectiveIds: [], businessViewIds: [], questionSuggestionIds: [] },
      createdAt: new Date().toISOString(),
      readiness: {
        score: 75,
        tier: 'exploratory_only',
        reasonSummary: 'Low volume',
        evidence: [],
        caveats: ['Low volume']
      }
    };

    const briefing = generateAIBriefing(mockUnderstanding);

    // 1. Semantic fields extracted correctly
    expect(briefing.keySemanticFields).toHaveLength(2);
    expect(briefing.keySemanticFields[0].canonicalConcept).toBe('revenue');
    expect(briefing.keySemanticFields[0].signalType).toBe('measure');
    expect(briefing.keySemanticFields[0].sourceColumns).toContain('Revenue 2024');

    expect(briefing.keySemanticFields[1].canonicalConcept).toBe('status');
    expect(briefing.keySemanticFields[1].signalType).toBe('status');

    // 2. Grain is carried through exactly
    expect(briefing.grain).toBe('summary');

    // 3. Safe action hints derive from opportunities, NOT raw capability spam
    expect(briefing.safeActionHints).toHaveLength(1);
    expect(briefing.safeActionHints[0].label).toBe('Revenue by Status');

    // 4. Weak readiness is surfaced clearly
    expect(briefing.readiness.isTrustworthy).toBe(false);
    expect(briefing.readiness.summary).toContain('WARNING:');
    expect(briefing.readiness.summary).toContain('extreme caution');
    
    // 5. Caveats are deduplicated
    expect(briefing.caveats).toHaveLength(2);
    expect(briefing.caveats).toContain('Has missing records');
  });

  it('handles generic datasets without readiness gracefully', () => {
    const genericUnderstanding: DatasetUnderstanding = {
      id: 'test_generic',
      status: 'partial',
      datasetName: undefined,
      confidenceScore: 50,
      grainHint: 'unknown',
      summary: {
        signalCount: 0,
        perspectiveCount: 0,
        businessViewCount: 0,
        questionCount: 0
      },
      detectedConcepts: [],
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
      createdAt: new Date().toISOString()
      // missing readiness
    };

    const briefing = generateAIBriefing(genericUnderstanding);

    expect(briefing.datasetName).toBe('Unnamed Dataset');
    expect(briefing.grain).toBe('unknown');
    expect(briefing.readiness.tier).toBe('exploratory_only');
    expect(briefing.readiness.isTrustworthy).toBe(false);
    expect(briefing.readiness.summary).toContain('WARNING:');
    expect(briefing.readiness.summary).toContain('Insufficient readiness data');
    expect(briefing.keySemanticFields).toHaveLength(0);
    expect(briefing.safeActionHints).toHaveLength(0);
  });
});
