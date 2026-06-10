import { describe, it, expect } from 'vitest';
import { createDatasetUnderstanding } from './dataset-understanding-contract';
import { generateAnalysisActions } from './analysis-opportunity-actions';
import { createRuntimeIntentFromAnalysisAction } from './analysis-runtime-contract';
import { createRuntimePlanPreview } from './runtime-planner-preview';

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

    // 1. inventory stock_age + stock_status: availableAnalysis length > 0
    expect(du.availableAnalysis.length).toBeGreaterThan(0);
    expect(actions.length).toBeGreaterThan(0);

    // 2. no availableAnalysis item lacks actionType, dimensions, measures
    for (const a of du.availableAnalysis) {
      expect(a.actionType).toBeDefined();
      expect(a.dimensions).toBeDefined();
      expect(a.measures).toBeDefined();
    }

    // Check specific generated ones
    const statusDist = actions.find(a => a.actionType === 'distribution' && a.dimensions.includes('stock_status'));
    expect(statusDist).toBeDefined();

    const ageByStatus = actions.find(a => a.actionType === 'group_by' && a.measures.includes('stock_age') && a.dimensions.includes('stock_status'));
    expect(ageByStatus).toBeDefined();

    // 6. generated analysis actions from inventory understanding are not empty
    expect(actions.length).toBeGreaterThan(0);

    // 7. analysis actions from inventory have valid RuntimeIntent and RuntimePlanPreview
    for (const action of actions) {
      const intent = createRuntimeIntentFromAnalysisAction(action);
      expect(intent.status).toBe('ready');

      const plan = createRuntimePlanPreview(intent);
      expect(plan.status).toBe('ready');
      expect(plan.logicalOperations.length).toBeGreaterThan(0);
    }
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

    expect(actions).toHaveLength(5);

    // 3. delivery availableAnalysis all have metadata
    for (const a of du.availableAnalysis) {
      expect(a.actionType).toBeDefined();
      expect(a.dimensions).toBeDefined();
      expect(a.measures).toBeDefined();
    }
  });
});
