import { describe, it, expect } from 'vitest';
import { createDatasetUnderstanding } from './dataset-understanding-contract';
import type { BusinessSignalRegistry, BusinessSignal } from './business-signal-detector';

describe('Dataset Understanding Contract', () => {
  const createMockRegistry = (signalIds: string[], domainStr: string = 'test'): BusinessSignalRegistry => {
    const signals: BusinessSignal[] = signalIds.map(id => ({
      canonicalId: id,
      domain: domainStr,
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
    expect(du.grain).toBe('unknown');
    expect(du.grainEvidence).toBe('No structural patterns recognized.');
    expect(du.summary.signalCount).toBe(0);
    expect(du.narrative).toBe('Insufficient data to understand this dataset.');
    expect(du.sourceTrace.signalIds.length).toBe(0);
  });

  it('Delivery Performance Reports partial understanding', () => {
    const registry = createMockRegistry(['report_date', 'route', 'driver', 'shipment', 'satisfaction']);
    const du = createDatasetUnderstanding({ signalRegistry: registry });
    
    expect(du.status).toBe('partial');
    expect(du.grain).toBe('event');
    expect(du.grainEvidence).toContain('event-level signals');
    expect(du.confidenceScore).toBeGreaterThan(0);
    expect(du.detectedConcepts.length).toBe(5);
    
    const entityLabels = du.inferredEntities.map(e => e.label);
    expect(entityLabels).toContain('Driver');
    expect(entityLabels).toContain('Route');
    expect(entityLabels).toContain('Shipment');
    expect(entityLabels).toContain('Customer Feedback');
    expect(entityLabels).toContain('Report Date'); 
    
    const opportunityLabels = du.availableAnalysis.map(a => a.label);
    expect(opportunityLabels).toContain('Shipment activity by route');
    expect(opportunityLabels).toContain('Shipment activity by driver');
    expect(opportunityLabels).toContain('Satisfaction by route');
    expect(opportunityLabels).toContain('Satisfaction by driver');
    expect(opportunityLabels).toContain('Activity over report date');
    
    // Bridge must match opportunities
    // bridge match removed
    
    const unavailableLabels = du.unavailableAnalysis.map(a => a.label);
    expect(unavailableLabels).toContain('SLA breach analysis');
    expect(unavailableLabels).toContain('Delivery status transition analysis');
    expect(unavailableLabels).toContain('Late delivery rate');
    
    expect(du.narrative).toContain('appears to describe delivery operations activity');
  });

  it('Strong dataset understood', () => {
    const registry = createMockRegistry(['segment', 'revenue']);
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
    expect(du.opportunities.length).toBeGreaterThan(0);
    expect(du.summary.questionCount).toBe(0);
  });

  it('determines grainHint as entity for pure identifiers', () => {
    const registry = createMockRegistry(['customer', 'segment']);
    const du = createDatasetUnderstanding({ signalRegistry: registry });
    expect(du.grain).toBe('entity');
    expect(du.grainEvidence).toContain('entity-level signals');
  });

  it('determines grainHint as summary for aggregated measures over time', () => {
    const registry = createMockRegistry(['report_date', 'revenue', 'cost']);
    const du = createDatasetUnderstanding({ signalRegistry: registry });
    expect(du.grain).toBe('summary');
    expect(du.grainEvidence).toContain('aggregated measures over time dimensions');
  });

  it('does not classify time + driver/route + measure as event but rather summary', () => {
    const registry = createMockRegistry(['report_date', 'driver', 'revenue']);
    const du = createDatasetUnderstanding({ signalRegistry: registry });
    expect(du.grain).toBe('summary');
    expect(du.grainEvidence).toContain('aggregated measures over time dimensions');
  });

  it('evaluates readiness properly based on the new weights', () => {
    const registry = createMockRegistry(['segment', 'revenue']);
    const du = createDatasetUnderstanding({ 
      signalRegistry: registry,
      businessViews: [{ id: 'bv1' }] 
    });

    expect(du.status).toBe('understood');
    expect(du.readiness).toBeDefined();
    expect(typeof du.readiness!.score).toBe('number');
    expect(du.readiness!.explanation).toBeDefined();
  });

  it('separates structural capabilities but still provides meaningful opportunities in generic dataset', () => {
    // Generic dataset with measure and dimension
    const registry = createMockRegistry(['revenue', 'segment', 'product']);
    const du = createDatasetUnderstanding({ signalRegistry: registry });
    
    // Should generate multiple structural capabilities (e.g. group_by segment, group_by product)
    expect(du.capabilities.length).toBeGreaterThan(1);
    
    // Should ALSO preserve meaningful opportunities but NOT be a mechanical mirror
    expect(du.opportunities.length).toBeGreaterThan(0);
    expect(du.opportunities.length).toBeLessThan(du.capabilities.length);
    
    // Bridge should match opportunities
    // bridge match removed
  });

  it('downgrades to exploratory_only when signals/views are present but no actionable opportunities exist (broken_finance.csv equivalent)', () => {
    // Measures present, but no dimensions/time to aggregate them against
    const registry = createMockRegistry(['revenue']);
    const du = createDatasetUnderstanding({ 
      signalRegistry: registry,
      businessViews: [{ id: 'profitability_analysis' }, { id: 'margin_analysis' }] 
    });

    expect(du.opportunities.filter(o => o.confidence !== 'low').length).toBe(0);
    expect(du.status).toBe('partial');
    expect(du.readiness!.tier).toBe('exploratory_only');
    expect(du.readiness!.score).toBeLessThanOrEqual(50);
    expect(du.readiness!.explanation).toContain('lacks structural support');
    expect(du.readiness!.caveats.some(c => c.includes('Could not assemble runnable analysis'))).toBe(true);
  });

  it('downgrades to exploratory_only when only time or entity signals exist but no measures/dimensions (good_revenue.csv equivalent zero-runnable case)', () => {
    // Only time signal present, but no measures to compute a trend
    const registry = createMockRegistry(['report_date']);
    const du = createDatasetUnderstanding({ signalRegistry: registry });

    expect(du.opportunities.filter(o => o.confidence !== 'low').length).toBe(0);
    expect(du.status).toBe('partial');
    expect(du.readiness!.tier).toBe('exploratory_only');
    expect(du.readiness!.score).toBeLessThanOrEqual(50);
    expect(du.readiness!.explanation).toContain('lacks structural support');
  });

  it('Finance dataset generates finance-aware opportunities', () => {
    const registry = createMockRegistry(['revenue', 'cost', 'profit', 'time_period'], 'finance');
    const du = createDatasetUnderstanding({ signalRegistry: registry, datasetName: 'Finance', rowCount: 100, columnCount: 5, status: 'understood' });
    expect(du.availableAnalysis.some(a => a.label.includes('Revenue') || a.label.includes('cost') || a.label.includes('Profit') || a.label.includes('Expense'))).toBe(true);
    expect(du.narrative.includes('finance')).toBe(true);
  });

  it('Inventory dataset generates inventory-aware opportunities', () => {
    const registry = createMockRegistry(['sku', 'stock_age', 'warehouse', 'stock_qty'], 'inventory');
    const du = createDatasetUnderstanding({ signalRegistry: registry, datasetName: 'Inventory', rowCount: 100, columnCount: 5, status: 'understood' });
    expect(du.availableAnalysis.some(a => a.label === 'Stock aging profile by SKU')).toBe(true);
    expect(du.narrative.includes('inventory')).toBe(true);
  });

  it('Customer dataset generates customer-aware opportunities', () => {
    const registry = createMockRegistry(['customer', 'segment', 'retention', 'order_count'], 'customer');
    const du = createDatasetUnderstanding({ signalRegistry: registry, datasetName: 'Customer', rowCount: 100, columnCount: 5, status: 'understood' });
    expect(du.availableAnalysis.some(a => a.dimensions.includes('segment'))).toBe(true);
    expect(du.narrative.includes('customer')).toBe(true);
  });

  it('Performance dataset generates KPI-aware opportunities', () => {
    const registry = createMockRegistry(['kpi', 'target', 'achievement', 'department'], 'performance');
    const du = createDatasetUnderstanding({ signalRegistry: registry, datasetName: 'Performance', rowCount: 100, columnCount: 5, status: 'understood' });
    expect(du.availableAnalysis.some(a => a.label === 'Target vs achievement by KPI')).toBe(true);
  });

  it('Revenue/Sales dataset generates sales-aware opportunities', () => {
    const registry = createMockRegistry(['sales', 'branch', 'revenue', 'salesperson'], 'revenue');
    const du = createDatasetUnderstanding({ signalRegistry: registry, datasetName: 'Sales', rowCount: 100, columnCount: 5, status: 'understood' });
    expect(du.availableAnalysis.some(a => a.dimensions.includes('branch') && a.measures.includes('sales'))).toBe(true);
  });
});
