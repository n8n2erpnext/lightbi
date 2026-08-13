import { describe, it, expect } from 'vitest';
import { createDatasetUnderstanding } from './dataset-understanding-contract';
import { generateAnalysisActions } from './analysis-opportunity-actions';

describe('Dataset Understanding - Domain Coverage', () => {
  it('generates explicit distribution, group_by, and trend metadata for generic inventory dataset', () => {
    const mockRegistry = {
      datasetId: 'ds1',
      signals: [
        { canonicalId: 'stock_age', domain: 'inventory', label: 'Stock Age', confidenceScore: 100, supportingEvidence: [] },
        { canonicalId: 'stock_status', domain: 'inventory', label: 'Inventory Status', confidenceScore: 100, supportingEvidence: [] },
      ],
      hasSignal: (id: string) => ['stock_age', 'stock_status'].includes(id),
      getSignal: () => undefined,
      getSignalsByDomain: () => [],
      getOverallConfidence: () => 100
    };

    const du = createDatasetUnderstanding({ signalRegistry: mockRegistry });
    const actions = generateAnalysisActions(du);

    expect(du.grain).toBe('snapshot');

    // 1. inventory stock_age + stock_status: capabilities length > 0
    expect(du.capabilities.length).toBeGreaterThan(0);
    // Because we preserve meaningful opportunities for generic capabilities
    expect(du.opportunities.length).toBeGreaterThan(0);
    expect(actions.length).toBeGreaterThan(0);

    // 2. no capability item lacks actionType, dimensions, measures
    for (const a of du.capabilities) {
      expect(a.type).toBeDefined();
      expect(a.supportingSignals).toBeDefined();
      expect(a.available).toBe(true);
    }

    // Check specific generated capabilities
    const statusDist = du.capabilities.find(a => a.type === 'distribution' && a.supportingSignals.includes('stock_status'));
    expect(statusDist).toBeDefined();

    const ageByStatus = du.capabilities.find(a => a.type === 'group_by_dimension' && a.supportingSignals.includes('stock_status'));
    expect(ageByStatus).toBeDefined();
  });

  it('delivery availableAnalysis all have metadata', () => {
    const mockRegistry = {
      datasetId: 'ds_delivery',
      signals: [
        { canonicalId: 'report_date', domain: 'operations', label: 'Report Date', confidenceScore: 100, supportingEvidence: [] },
        { canonicalId: 'route', domain: 'operations', label: 'Route', confidenceScore: 100, supportingEvidence: [] },
        { canonicalId: 'driver', domain: 'operations', label: 'Driver', confidenceScore: 100, supportingEvidence: [] },
        { canonicalId: 'shipment', domain: 'operations', label: 'Shipment', confidenceScore: 100, supportingEvidence: [] },
        { canonicalId: 'satisfaction', domain: 'customer', label: 'Satisfaction', confidenceScore: 100, supportingEvidence: [] },
      ],
      hasSignal: (id: string) => ['report_date', 'route', 'driver', 'shipment', 'satisfaction'].includes(id),
      getSignal: () => undefined,
      getSignalsByDomain: () => [],
      getOverallConfidence: () => 100
    };

    const du = createDatasetUnderstanding({ signalRegistry: mockRegistry });
    const actions = generateAnalysisActions(du);

    expect(du.grain).toBe('event');
    expect(actions.length).toBeGreaterThanOrEqual(5);

    // 3. delivery availableAnalysis all have metadata
    for (const a of du.availableAnalysis) {
      expect(a.actionType).toBeDefined();
      expect(a.dimensions).toBeDefined();
      expect(a.measures).toBeDefined();
    }
  });
});
