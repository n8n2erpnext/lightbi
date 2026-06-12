import { describe, it, expect } from 'vitest';
import { detectCapabilities, generateOpportunities } from './dataset-capability-engine';

describe('Dataset Capability Engine', () => {
  const createMockSignals = (ids: string[]) => {
    return ids.map(id => ({ canonicalId: id } as any));
  };

  it('detects capabilities for full dataset', () => {
    const signals = createMockSignals(['shipment', 'route', 'driver', 'report_date', 'revenue']);
    const caps = detectCapabilities(signals);
    const types = caps.map(c => c.type);
    
    expect(types).toContain('trend_over_time');
    expect(types).toContain('group_by_dimension');
    expect(types).toContain('distribution');
    expect(types).toContain('table_preview');
  });

  it('detects capabilities for inventory dataset', () => {
    const signals = createMockSignals(['sku', 'stock_qty', 'warehouse']);
    const caps = detectCapabilities(signals);
    const types = caps.map(c => c.type);
    
    expect(types).toContain('group_by_dimension');
    expect(types).toContain('distribution');
    expect(types).toContain('table_preview');
    expect(types).not.toContain('trend_over_time');
  });

  it('detects capabilities for entity-only dataset', () => {
    const signals = createMockSignals(['customer', 'segment']);
    const caps = detectCapabilities(signals);
    const types = caps.map(c => c.type);
    
    expect(types).toContain('table_preview');
    expect(types).toContain('distribution');
    expect(types).not.toContain('group_by_dimension');
    expect(types).not.toContain('trend_over_time');
  });

  it('detects capabilities for empty dataset', () => {
    const caps = detectCapabilities([]);
    const types = caps.map(c => c.type);
    
    expect(types).toContain('table_preview');
    expect(types.length).toBe(1);
  });

  it('generates event opportunity', () => {
    const caps = detectCapabilities(createMockSignals(['shipment', 'route', 'report_date', 'revenue']));
    const opps = generateOpportunities(caps, 'event');
    expect(opps.length).toBeGreaterThan(0);
    expect(opps.some(o => o.label.includes('activity') || o.label.includes('over time'))).toBe(true);
  });

  it('generates snapshot opportunity', () => {
    const caps = detectCapabilities(createMockSignals(['sku', 'stock_qty']));
    const opps = generateOpportunities(caps, 'snapshot');
    expect(opps.length).toBeGreaterThan(0);
    expect(opps.some(o => o.label.includes('distribution') || o.label.includes('aging'))).toBe(true);
  });

  it('generates unknown opportunity', () => {
    const caps = detectCapabilities([]);
    const opps = generateOpportunities(caps, 'unknown');
    expect(opps.length).toBeGreaterThan(0);
    expect(opps.some(o => o.label.includes('Explore') || o.label.includes('structure'))).toBe(true);
  });
});
