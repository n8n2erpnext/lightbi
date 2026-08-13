import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateAdvancedHandoff } from './advanced-handoff-generator';
import type { DatasetUnderstanding } from './dataset-understanding-contract';

describe('generateAdvancedHandoff', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-13T10:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const mockUnderstanding: DatasetUnderstanding = {
    id: 'test_du',
    datasetId: 'test_dataset',
    datasetName: 'Test Operations',
    status: 'understood',
    confidenceScore: 90,
    grain: 'event',
    grainEvidence: 'Detected event-level signals',
    summary: { rowCount: 100, columnCount: 3, signalCount: 2, perspectiveCount: 1, businessViewCount: 1, questionCount: 1 },
    detectedConcepts: [
      { signalId: 'route', canonicalConcept: 'route', label: 'Route', confidenceScore: 100, evidence: ['zone'] }
    ],
    inferredEntities: [],
    workflowHints: [],
    relationshipHints: [],
    capabilities: [],
    opportunities: [],
    availableAnalysis: [],
    unavailableAnalysis: [],
    caveats: ['Initial caveat'],
    narrative: '',
    mappingReview: {
      items: [
        { physicalColumn: 'zone', inferredSignal: 'route', issueType: 'recognized', confidence: 100, suggestedActions: [] },
        { physicalColumn: 'amount', inferredSignal: 'revenue', issueType: 'recognized', confidence: 90, suggestedActions: [] },
        { physicalColumn: 'unknown_col', issueType: 'unrecognized', confidence: 0, suggestedActions: [] }
      ]
    },
    sourceTrace: { signalIds: [], perspectiveIds: [], businessViewIds: [], questionSuggestionIds: [] },
    createdAt: '2026-06-13T09:00:00Z',
    readiness: {
      tier: 'decision_support',
      score: 95,
      explanation: 'Good dataset',
      caveats: ['Readiness caveat'],
      opportunitiesUnlocked: 1
    }
  };

  it('generates artifact successfully with mapped fields', () => {
    const rawColumns = ['zone', 'amount', 'unknown_col'];
    const artifact = generateAdvancedHandoff(mockUnderstanding, rawColumns);

    expect(artifact.datasetId).toBe('test_dataset');
    expect(artifact.datasetName).toBe('Test Operations');
    expect(artifact.generatedAt).toBe('2026-06-13T10:00:00.000Z');
    expect(artifact.grain).toBe('event');
    expect(artifact.readinessTier).toBe('decision_support');
    expect(artifact.readinessScore).toBe(95);
    
    // Check field mappings
    expect(artifact.fieldMappings).toHaveLength(3);
    
    const zoneField = artifact.fieldMappings.find(f => f.physicalColumn === 'zone');
    expect(zoneField?.canonicalSignal).toBe('route');
    expect(zoneField?.domain).toBe('operations');
    expect(zoneField?.role).toBe('dimension');
    expect(zoneField?.confidence).toBe(100);

    const amountField = artifact.fieldMappings.find(f => f.physicalColumn === 'amount');
    expect(amountField?.canonicalSignal).toBe('revenue');
    expect(amountField?.domain).toBe('revenue');
    expect(amountField?.role).toBe('measure');
    expect(amountField?.confidence).toBe(90);

    const unknownField = artifact.fieldMappings.find(f => f.physicalColumn === 'unknown_col');
    expect(unknownField?.canonicalSignal).toBeUndefined();
    expect(unknownField?.domain).toBeUndefined();
    expect(unknownField?.role).toBe('unknown');
    expect(unknownField?.confidence).toBe(0);

    // Caveats deduplicated
    expect(artifact.caveats).toEqual(['Initial caveat', 'Readiness caveat']);
  });

  it('falls back to detectedConcepts if mappingReview misses inferredSignal but evidence matches', () => {
    const fallbackUnderstanding: DatasetUnderstanding = {
      ...mockUnderstanding,
      mappingReview: undefined // Simulate missing mapping review
    };

    const rawColumns = ['zone']; // Matches evidence for 'route' in detectedConcepts
    const artifact = generateAdvancedHandoff(fallbackUnderstanding, rawColumns);

    expect(artifact.fieldMappings).toHaveLength(1);
    const zoneField = artifact.fieldMappings[0];
    expect(zoneField.canonicalSignal).toBe('route');
    expect(zoneField.domain).toBe('operations');
    expect(zoneField.role).toBe('dimension');
    expect(zoneField.confidence).toBe(100);
  });
});
