import { describe, it, expect } from 'vitest';
import { generateAnalysisActions } from './analysis-opportunity-actions';
import type { DatasetUnderstanding } from './dataset-understanding-contract';

describe('Analysis Opportunity Actions', () => {
  it('should generate expected actions for delivery performance dataset', () => {
    const mockUnderstanding: DatasetUnderstanding = {
      id: 'du_1',
      status: 'partial',
      confidenceScore: 0.9,
      summary: { signalCount: 5, perspectiveCount: 0, businessViewCount: 0, questionCount: 0 },
      detectedConcepts: [],
      inferredEntities: [],
      workflowHints: [],
      relationshipHints: [],
      caveats: [],
      narrative: 'Test',
      sourceTrace: { signalIds: [], perspectiveIds: [], businessViewIds: [], questionSuggestionIds: [] },
      createdAt: '2026-06-10T00:00:00Z',
      availableAnalysis: [
        { id: 'aa1', label: 'Shipment activity by route', basedOnSignals: ['shipment', 'route'], source: 'signals' },
        { id: 'aa2', label: 'Shipment activity by driver', basedOnSignals: ['shipment', 'driver'], source: 'signals' },
        { id: 'aa3', label: 'Satisfaction by route', basedOnSignals: ['satisfaction', 'route'], source: 'signals' },
        { id: 'aa4', label: 'Satisfaction by driver', basedOnSignals: ['satisfaction', 'driver'], source: 'signals' },
        { id: 'aa5', label: 'Activity over report date', basedOnSignals: ['report_date'], source: 'signals' }
      ],
      unavailableAnalysis: []
    };

    const actions = generateAnalysisActions(mockUnderstanding);

    expect(actions).toHaveLength(5);
    
    // Check specific actions
    const byRoute = actions.find(a => a.label === 'Shipment activity by route');
    expect(byRoute).toBeDefined();
    expect(byRoute?.actionType).toBe('group_by');
    expect(byRoute?.dimensions).toEqual(['route']);
    expect(byRoute?.measures).toEqual(['shipment']);

    const trend = actions.find(a => a.label === 'Activity over report date');
    expect(trend).toBeDefined();
    expect(trend?.actionType).toBe('trend');
    expect(trend?.dimensions).toEqual(['report_date']);
    expect(trend?.measures).toEqual(['shipment']);
  });
});
