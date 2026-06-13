import { describe, it, expect } from 'vitest';
import { generateAIBriefing } from './ai-briefing-generator';
import type { DatasetUnderstanding } from './dataset-understanding-contract';

describe('AI Briefing Generator', () => {
  it('generates briefing with semantic fields from detected concepts', () => {
    const understanding: DatasetUnderstanding = {
      datasetId: 'ds-123',
      datasetName: 'Delivery',
      grain: 'event',
      grainEvidence: 'Contains order_id',
      detectedConcepts: [
        { canonicalConcept: 'driver', displayName: 'Driver', businessDomain: 'logistics', confidenceScore: 0.9, evidence: ['driver_name'] },
        { canonicalConcept: 'route', displayName: 'Route', businessDomain: 'logistics', confidenceScore: 0.8, evidence: ['route_id'] },
        { canonicalConcept: 'shipment', displayName: 'Shipment', businessDomain: 'logistics', confidenceScore: 0.95, evidence: ['shipment_date'] }
      ],
      readiness: { tier: 'decision_support', score: 90, caveats: [], issues: [], reasonSummary: 'Good' },
      opportunities: [
        { id: '1', label: 'analyze driver performance', type: 'trend', confidence: 'high', recommendedVisual: 'line', complexity: 'low', requiredConcepts: [] }
      ],
      mappingReview: { items: [], completionScore: 100 },
      inferredEntities: [],
      caveats: [],
      status: 'understood',
      confidenceScore: 90,
      narrative: ''
    };

    const briefing = generateAIBriefing(understanding);
    expect(briefing.grain).toBe('event');
    expect(briefing.semanticFields.length).toBe(3);
    expect(briefing.semanticFields[0].canonicalId).toBe('driver');
    expect(briefing.safeActionHints.length).toBe(1);
    expect(briefing.safeActionHints[0]).toBe('Can analyze driver performance');
  });

  it('handles empty understanding gracefully', () => {
    const understanding: DatasetUnderstanding = {
      datasetId: 'unknown',
      grain: 'unknown',
      detectedConcepts: [],
      inferredEntities: [],
      caveats: [],
      status: 'insufficient',
      confidenceScore: 0,
      narrative: ''
    };
    const briefing = generateAIBriefing(understanding);
    expect(briefing.semanticFields).toHaveLength(0);
    expect(briefing.grain).toBe('unknown');
    expect(briefing.safeActionHints).toHaveLength(0);
  });

  it('deduplicates caveats from understanding and readiness', () => {
    const understandingWithDupCaveats: DatasetUnderstanding = {
      datasetId: 'ds-dup',
      grain: 'unknown',
      detectedConcepts: [],
      inferredEntities: [],
      caveats: ['No time detected.'],
      readiness: { tier: 'caution', score: 50, caveats: ['No time detected.', 'Missing primary key'], issues: [], reasonSummary: 'Caution' },
      status: 'partial',
      confidenceScore: 50,
      narrative: ''
    };
    const briefing = generateAIBriefing(understandingWithDupCaveats);
    expect(briefing.caveats.filter(c => c === 'No time detected.').length).toBe(1);
    expect(briefing.caveats.length).toBe(2);
  });
});
