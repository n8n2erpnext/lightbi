import { describe, it, expect } from 'vitest';
import { runGuidedInvestigationPipeline } from './guided-investigation-pipeline';
import type { DetectorInput } from './business-signal-detector';

// Helper to create basic detector input from column names
function createMockInput(columns: string[]): DetectorInput {
  return {
    columns: columns.map(c => ({ name: c, type: 'string' }))
  };
}

describe('Guided Investigation Pipeline - Cross-Domain Validation', () => {

  it('Dataset 1: Operations', () => {
    const input = createMockInput(['driver', 'route', 'shipment', 'delivery_status', 'sla', 'warehouse']);
    const result = runGuidedInvestigationPipeline(input);

    const detectedSignals = result.signals.signals.map(s => s.canonicalId);
    expect(detectedSignals).toEqual(expect.arrayContaining(['driver', 'route', 'shipment', 'delivery_status', 'sla', 'warehouse']));

    const perspectives = result.perspectives.map(p => p.id);
    expect(perspectives).toContain('operations');

    const businessViews = result.businessViews.map(v => v.id);
    expect(businessViews).toEqual(expect.arrayContaining(['logistics_journey', 'delivery_sla', 'driver_performance']));
    
    // Negative checks
    expect(businessViews).not.toContain('revenue');
    expect(businessViews).not.toContain('customer');
    expect(businessViews).not.toContain('finance');
  });

  it('Dataset 2: Revenue', () => {
    const input = createMockInput(['order_id', 'revenue', 'discount', 'salesperson', 'branch', 'order_date']);
    const result = runGuidedInvestigationPipeline(input);

    const perspectives = result.perspectives.map(p => p.id);
    expect(perspectives).toContain('revenue');

    const businessViews = result.businessViews.map(v => v.id);
    expect(businessViews).not.toContain('logistics_journey');
    expect(businessViews).not.toContain('inventory_health');
    expect(businessViews).not.toContain('customer_segmentation');
  });

  it('Dataset 3: Inventory', () => {
    const input = createMockInput(['sku', 'product', 'inventory', 'stock_movement', 'supplier', 'warehouse']);
    const result = runGuidedInvestigationPipeline(input);

    const perspectives = result.perspectives.map(p => p.id);
    expect(perspectives).toContain('inventory');

    const businessViews = result.businessViews.map(v => v.id);
    expect(businessViews).toEqual(expect.arrayContaining(['inventory_health', 'supplier_inventory_analysis']));
    expect(businessViews).not.toContain('revenue');
    expect(businessViews).not.toContain('revenue_performance');
  });

  it('Dataset 4: Customer', () => {
    const input = createMockInput(['customer', 'segment', 'retention', 'satisfaction']);
    const result = runGuidedInvestigationPipeline(input);

    const perspectives = result.perspectives.map(p => p.id);
    expect(perspectives).toContain('customer');

    const businessViews = result.businessViews.map(v => v.id);
    expect(businessViews).toContain('customer_segmentation');
  });

  it('Dataset 5: Performance', () => {
    const input = createMockInput(['target', 'achievement', 'productivity', 'utilization']);
    const result = runGuidedInvestigationPipeline(input);

    const perspectives = result.perspectives.map(p => p.id);
    expect(perspectives).toContain('performance');

    const businessViews = result.businessViews.map(v => v.id);
    expect(businessViews).toContain('target_achievement');
  });

  it('Dataset 6: Finance', () => {
    const input = createMockInput(['expense', 'cost', 'budget', 'profit']);
    const result = runGuidedInvestigationPipeline(input);

    const perspectives = result.perspectives.map(p => p.id);
    expect(perspectives).toContain('finance');

    const domainIds = result.businessViews.map(v => v.perspectiveId);
    // All views must belong to finance domain
    domainIds.forEach(d => {
      expect(d).toEqual('finance');
    });
  });

  it('Dataset 7: Mixed Dataset', () => {
    const input = createMockInput(['revenue', 'order', 'driver', 'route', 'sku', 'inventory']);
    const result = runGuidedInvestigationPipeline(input);

    const perspectives = result.perspectives.map(p => p.id);
    expect(perspectives).toEqual(expect.arrayContaining(['revenue', 'operations', 'inventory']));
    
    // Sort order check: Highest confidence first
    const confidences = result.perspectives.map(p => p.confidenceScore);
    const sortedConfidences = [...confidences].sort((a, b) => b - a);
    expect(confidences).toEqual(sortedConfidences);

    // No duplicate perspectives
    const uniquePerspectives = new Set(perspectives);
    expect(uniquePerspectives.size).toBe(perspectives.length);
  });

  it('Dataset 8: Garbage Dataset', () => {
    const input = createMockInput(['abc', 'xyz', 'foo', 'bar']);
    const result = runGuidedInvestigationPipeline(input);

    expect(result.signals.signals.length).toBe(0);
    expect(result.perspectives.length).toBe(0);
    expect(result.businessViews.length).toBe(0);
    expect(result.questionPlans.length).toBe(0);
    expect(result.questionSuggestions.length).toBe(0);
  });
});
