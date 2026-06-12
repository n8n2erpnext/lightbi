import { describe, it, expect } from 'vitest';
import { generateAdvancedHandoff } from './advanced-handoff-contract';
import type { DatasetUnderstanding } from './dataset-understanding-contract';

describe('Advanced Handoff Contract', () => {
  it('maps raw columns to canonical concepts explicitly', () => {
    const mockUnderstanding: DatasetUnderstanding = {
      id: 'test',
      status: 'understood',
      datasetName: 'Sales Data',
      confidenceScore: 95,
      grainHint: 'event',
      summary: {
        rowCount: 1000,
        columnCount: 5,
        signalCount: 2,
        perspectiveCount: 1,
        businessViewCount: 1,
        questionCount: 0
      },
      detectedConcepts: [
        {
          signalId: 'revenue',
          label: 'Revenue',
          canonicalConcept: 'revenue',
          confidenceScore: 90,
          evidence: ['Revenue 2023', 'Revenue 2024'] // Multiple evidence columns for one concept
        },
        {
          signalId: 'status',
          label: 'Status',
          canonicalConcept: 'status',
          confidenceScore: 85,
          evidence: ['Order Status']
        }
      ],
      inferredEntities: [],
      workflowHints: [],
      relationshipHints: [],
      capabilities: [],
      opportunities: [],
      availableAnalysis: [],
      unavailableAnalysis: [],
      caveats: ['Dataset has missing values'],
      narrative: 'A dataset about sales',
      sourceTrace: { signalIds: [], perspectiveIds: [], businessViewIds: [], questionSuggestionIds: [] },
      createdAt: new Date().toISOString(),
      readiness: {
        score: 90,
        tier: 'decision_support',
        reasonSummary: 'Good to go',
        evidence: [],
        caveats: ['Readiness caveat 1', 'Dataset has missing values'] // Duplicate caveat to test dedupe
      }
    };

    const artifact = generateAdvancedHandoff(mockUnderstanding);

    // 1. Explicit Lineage
    // 'revenue' has 2 evidence columns, 'status' has 1. So 3 mappings total.
    expect(artifact.rawToCanonicalMapping).toHaveLength(3);
    
    const rev23 = artifact.rawToCanonicalMapping.find(m => m.originalColumn === 'Revenue 2023');
    expect(rev23?.canonicalConcept).toBe('revenue');
    expect(rev23?.signalType).toBe('measure'); // honest type from getSignalType
    
    // 2. Honest Roles
    const statusCol = artifact.rawToCanonicalMapping.find(m => m.originalColumn === 'Order Status');
    expect(statusCol?.canonicalConcept).toBe('status');
    expect(statusCol?.signalType).toBe('status'); // specific rule for status

    // 3. Grain Hint
    expect(artifact.grainHint).toBe('event');

    // 4. Caveat Deduplication
    expect(artifact.caveats).toHaveLength(2); // deduped
    expect(artifact.caveats).toContain('Dataset has missing values');
    expect(artifact.caveats).toContain('Readiness caveat 1');
  });

  it('safely falls back for generic/partial datasets without readiness', () => {
    const genericUnderstanding: DatasetUnderstanding = {
      id: 'test_generic',
      status: 'partial',
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
      // Note: readiness is missing
    };

    const artifact = generateAdvancedHandoff(genericUnderstanding);

    expect(artifact.readiness.tier).toBe('exploratory_only');
    expect(artifact.readiness.summary).toContain('Insufficient');
    expect(artifact.rawToCanonicalMapping).toHaveLength(0);
    expect(artifact.datasetName).toBe('Unnamed Dataset');
  });
});
