import { describe, it, expect } from 'vitest';
import { createDatasetUnderstanding } from './dataset-understanding-contract';
import type { BusinessSignalRegistry, BusinessSignal } from './business-signal-detector';

describe('Dataset Understanding Contract', () => {
  const createMockRegistry = (signalIds: string[]): BusinessSignalRegistry => {
    const signals: BusinessSignal[] = signalIds.map(id => ({
      canonicalId: id,
      domain: 'test',
      label: id.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
      confidenceScore: 80,
      supportingEvidence: [{ columnName: `col_${id}`, matchReason: 'test', breakdown: {} as any }]
    }));
    return {
      datasetId: 'ds1',
      signals,
      hasSignal: (id) => signalIds.includes(id),
      getSignal: (id) => signals.find(s => s.canonicalId === id),
      getSignalsByDomain: () => signals,
      getOverallConfidence: () => 80
    };
  };

  it('Unknown dataset is insufficient', () => {
    const registry = createMockRegistry([]);
    const du = createDatasetUnderstanding({ signalRegistry: registry });
    expect(du.status).toBe('insufficient');
    expect(du.summary.signalCount).toBe(0);
    expect(du.narrative).toBe('Insufficient data to understand this dataset.');
    expect(du.sourceTrace.signalIds.length).toBe(0);
  });

  it('Delivery Performance Reports partial understanding', () => {
    const registry = createMockRegistry(['report_date', 'route', 'driver', 'shipment', 'satisfaction']);
    const du = createDatasetUnderstanding({ signalRegistry: registry });
    
    expect(du.status).toBe('partial');
    expect(du.confidenceScore).toBeGreaterThan(0);
    expect(du.detectedConcepts.length).toBe(5);
    
    const entityLabels = du.inferredEntities.map(e => e.label);
    expect(entityLabels).toContain('Driver');
    expect(entityLabels).toContain('Route');
    expect(entityLabels).toContain('Shipment');
    expect(entityLabels).toContain('Customer Feedback');
    expect(entityLabels).toContain('Report Date'); 
    
    const availableLabels = du.availableAnalysis.map(a => a.label);
    expect(availableLabels).toContain('Shipment activity by route');
    expect(availableLabels).toContain('Shipment activity by driver');
    expect(availableLabels).toContain('Satisfaction by route');
    expect(availableLabels).toContain('Satisfaction by driver');
    expect(availableLabels).toContain('Activity over report date');
    
    const unavailableLabels = du.unavailableAnalysis.map(a => a.label);
    expect(unavailableLabels).toContain('SLA breach analysis');
    expect(unavailableLabels).toContain('Delivery status transition analysis');
    expect(unavailableLabels).toContain('Late delivery rate');
    
    expect(du.narrative).toContain('appears to describe delivery operations activity');
  });

  it('Strong dataset understood', () => {
    const registry = createMockRegistry(['order', 'revenue']);
    const du = createDatasetUnderstanding({ 
      signalRegistry: registry,
      businessViews: [{ id: 'bv1' }] 
    });
    expect(du.status).toBe('understood');
    expect(du.summary.businessViewCount).toBe(1);
    expect(du.sourceTrace.businessViewIds).toContain('bv1');
  });

  it('Available analysis exists without questions', () => {
    const registry = createMockRegistry(['report_date', 'route', 'driver', 'shipment', 'satisfaction']);
    const du = createDatasetUnderstanding({ signalRegistry: registry, questionSuggestions: [] });
    
    expect(du.status).toBe('partial');
    expect(du.availableAnalysis.length).toBeGreaterThan(0);
    expect(du.summary.questionCount).toBe(0);
  });
});
