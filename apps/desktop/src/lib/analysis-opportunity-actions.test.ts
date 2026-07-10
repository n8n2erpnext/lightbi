import { describe, it, expect } from 'vitest';
import { generateAnalysisActions } from './analysis-opportunity-actions';
import type { DatasetUnderstanding } from './dataset-understanding-contract';

describe('Analysis Opportunity Actions', () => {
  it('should generate expected actions for delivery performance dataset', () => {
    const mockUnderstanding: DatasetUnderstanding = {
      id: 'du_1',
      status: 'partial',
      confidenceScore: 0.9,
      grain: 'event',
      grainHint: 'event',
      grainEvidence: 'test grain',
      summary: { signalCount: 5, perspectiveCount: 0, businessViewCount: 0, questionCount: 0 },
      detectedConcepts: [],
      inferredEntities: [],
      workflowHints: [],
      relationshipHints: [],
      caveats: [],
      narrative: 'Test',
      sourceTrace: { signalIds: [], perspectiveIds: [], businessViewIds: [], questionSuggestionIds: [] },
      createdAt: '2026-06-10T00:00:00Z',
      capabilities: [],
      opportunities: [
        { id: 'aa1', label: 'Shipment activity by route', basedOnSignals: ['shipment', 'route'], source: 'heuristic', actionType: 'group_by', dimensions: ['route'], measures: ['shipment'] },
        { id: 'aa2', label: 'Shipment activity by driver', basedOnSignals: ['shipment', 'driver'], source: 'heuristic', actionType: 'group_by', dimensions: ['driver'], measures: ['shipment'] },
        { id: 'aa3', label: 'Satisfaction by route', basedOnSignals: ['satisfaction', 'route'], source: 'heuristic', actionType: 'group_by', dimensions: ['route'], measures: ['satisfaction'] },
        { id: 'aa4', label: 'Satisfaction by driver', basedOnSignals: ['satisfaction', 'driver'], source: 'heuristic', actionType: 'group_by', dimensions: ['driver'], measures: ['satisfaction'] },
        { id: 'aa5', label: 'Activity over report date', basedOnSignals: ['report_date'], source: 'heuristic', actionType: 'trend', dimensions: ['report_date'], measures: ['shipment'] }
      ],
      availableAnalysis: [
        { id: 'aa1', label: 'Shipment activity by route', basedOnSignals: ['shipment', 'route'], source: 'signals', actionType: 'group_by', dimensions: ['route'], measures: ['shipment'] },
        { id: 'aa2', label: 'Shipment activity by driver', basedOnSignals: ['shipment', 'driver'], source: 'signals', actionType: 'group_by', dimensions: ['driver'], measures: ['shipment'] },
        { id: 'aa3', label: 'Satisfaction by route', basedOnSignals: ['satisfaction', 'route'], source: 'signals', actionType: 'group_by', dimensions: ['route'], measures: ['satisfaction'] },
        { id: 'aa4', label: 'Satisfaction by driver', basedOnSignals: ['satisfaction', 'driver'], source: 'signals', actionType: 'group_by', dimensions: ['driver'], measures: ['satisfaction'] },
        { id: 'aa5', label: 'Activity over report date', basedOnSignals: ['report_date'], source: 'signals', actionType: 'trend', dimensions: ['report_date'], measures: ['shipment'] }
      ],
      unavailableAnalysis: []
    };

    const actions = generateAnalysisActions(mockUnderstanding);

    expect(actions.length).toBeGreaterThanOrEqual(5);
    
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

  it('should generate table_preview action when capability is present', () => {
    const mockUnderstanding: DatasetUnderstanding = {
      id: 'du_2',
      status: 'partial',
      confidenceScore: 0.9,
      grain: 'event',
      grainHint: 'event',
      grainEvidence: 'test grain',
      summary: { signalCount: 0, perspectiveCount: 0, businessViewCount: 0, questionCount: 0 },
      detectedConcepts: [],
      inferredEntities: [],
      workflowHints: [],
      relationshipHints: [],
      caveats: [],
      narrative: 'Test',
      sourceTrace: { signalIds: [], perspectiveIds: [], businessViewIds: [], questionSuggestionIds: [] },
      createdAt: '2026-06-10T00:00:00Z',
      capabilities: [],
      opportunities: [
        { 
          id: 'preview', 
          label: 'Explore dataset structure', 
          description: 'Preview',
          requiredCapabilities: ['table_preview'],
          confidence: 'high',
          recommendedVisual: 'table',
          complexity: 'low',
          requiredConcepts: []
        }
      ],
      availableAnalysis: [],
      unavailableAnalysis: []
    };

    const actions = generateAnalysisActions(mockUnderstanding);
    expect(actions.length).toBe(2); // preview + fallback
    expect(actions[0].actionType).toBe('table_preview');
    expect(actions[0].dimensions).toEqual([]);
    expect(actions[0].measures).toEqual([]);
  });

  it('legacy opportunity with trend_over_time but no dimensions/measures does not produce blocked trend', () => {
    const mockUnderstanding: DatasetUnderstanding = {
      id: 'du_3',
      status: 'partial',
      confidenceScore: 0.9,
      grain: 'event',
      grainHint: 'event',
      grainEvidence: 'test grain',
      summary: { signalCount: 0, perspectiveCount: 0, businessViewCount: 0, questionCount: 0 },
      detectedConcepts: [],
      inferredEntities: [],
      workflowHints: [],
      relationshipHints: [],
      caveats: [],
      narrative: 'Test',
      sourceTrace: { signalIds: [], perspectiveIds: [], businessViewIds: [], questionSuggestionIds: [] },
      createdAt: '2026-06-10T00:00:00Z',
      capabilities: [],
      opportunities: [
        { 
          id: 'trend_invalid', 
          label: 'Trend without dimensions', 
          description: 'Trend',
          requiredCapabilities: ['trend_over_time'],
          confidence: 'high',
          recommendedVisual: 'line_chart',
          complexity: 'low',
          requiredConcepts: []
        }
      ],
      availableAnalysis: [],
      unavailableAnalysis: []
    };

    const actions = generateAnalysisActions(mockUnderstanding);
    // Should downgrade to table_preview instead of generating a blocked trend
    expect(actions[0].actionType).toBe('table_preview');
  });

  it('legacy opportunity with distribution but no dimensions does not produce blocked distribution', () => {
    const mockUnderstanding: DatasetUnderstanding = {
      id: 'du_4',
      status: 'partial',
      confidenceScore: 0.9,
      grain: 'event',
      grainHint: 'event',
      grainEvidence: 'test grain',
      summary: { signalCount: 0, perspectiveCount: 0, businessViewCount: 0, questionCount: 0 },
      detectedConcepts: [],
      inferredEntities: [],
      workflowHints: [],
      relationshipHints: [],
      caveats: [],
      narrative: 'Test',
      sourceTrace: { signalIds: [], perspectiveIds: [], businessViewIds: [], questionSuggestionIds: [] },
      createdAt: '2026-06-10T00:00:00Z',
      capabilities: [],
      opportunities: [
        { 
          id: 'dist_invalid', 
          label: 'Distribution without dimensions', 
          description: 'Dist',
          requiredCapabilities: ['distribution'],
          confidence: 'high',
          recommendedVisual: 'bar_chart',
          complexity: 'low',
          requiredConcepts: []
        }
      ],
      availableAnalysis: [],
      unavailableAnalysis: []
    };

    const actions = generateAnalysisActions(mockUnderstanding);
    // Should downgrade to table_preview instead of generating a blocked distribution
    expect(actions[0].actionType).toBe('table_preview');
  });

  it('legacy opportunity with relationship but only 1 measure does not produce blocked relationship', () => {
    const mockUnderstanding: DatasetUnderstanding = {
      id: 'du_rel_1',
      status: 'partial',
      confidenceScore: 0.9,
      grain: 'event',
      grainHint: 'event',
      grainEvidence: 'test grain',
      summary: { signalCount: 0, perspectiveCount: 0, businessViewCount: 0, questionCount: 0 },
      detectedConcepts: [],
      inferredEntities: [],
      workflowHints: [],
      relationshipHints: [],
      caveats: [],
      narrative: 'Test',
      sourceTrace: { signalIds: [], perspectiveIds: [], businessViewIds: [], questionSuggestionIds: [] },
      createdAt: '2026-06-10T00:00:00Z',
      capabilities: [],
      opportunities: [
        { 
          id: 'rel_invalid', 
          label: 'Relationship with 1 measure', 
          description: 'Rel',
          requiredCapabilities: ['relationship'],
          confidence: 'high',
          recommendedVisual: 'scatter',
          complexity: 'low',
          requiredConcepts: [],
          measures: ['meas1'] as any
        } as any
      ],
      availableAnalysis: [],
      unavailableAnalysis: []
    };

    const actions = generateAnalysisActions(mockUnderstanding);
    // Should downgrade to table_preview instead of generating a blocked relationship
    expect(actions[0].actionType).toBe('table_preview');
  });

  it('fallback table preview remains available', () => {
    const mockUnderstanding: DatasetUnderstanding = {
      id: 'du_5',
      status: 'partial',
      confidenceScore: 0.9,
      grain: 'event',
      grainHint: 'event',
      grainEvidence: 'test grain',
      summary: { signalCount: 0, perspectiveCount: 0, businessViewCount: 0, questionCount: 0 },
      detectedConcepts: [],
      inferredEntities: [],
      workflowHints: [],
      relationshipHints: [],
      caveats: [],
      narrative: 'Test',
      sourceTrace: { signalIds: [], perspectiveIds: [], businessViewIds: [], questionSuggestionIds: [] },
      createdAt: '2026-06-10T00:00:00Z',
      capabilities: [],
      opportunities: [],
      availableAnalysis: [],
      unavailableAnalysis: []
    };

    const actions = generateAnalysisActions(mockUnderstanding);
    expect(actions.length).toBe(1);
    expect(actions[0].id).toBe('fallback_analyze');
    expect(actions[0].actionType).toBe('table_preview');
  });
});
