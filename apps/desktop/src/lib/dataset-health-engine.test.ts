import { describe, it, expect } from 'vitest';
import { calculateDatasetHealth } from './dataset-health-engine';
import type { DatasetFamily } from './batch-inspection';

describe('Dataset Health Engine', () => {
  const createMockDataset = (overrides: Partial<DatasetFamily>): DatasetFamily => {
    return {
      id: 'ds_1',
      name: 'Test Dataset',
      schemaFingerprint: 'abcd',
      files: [],
      totalRows: 1000,
      columns: ['id', 'name', 'value'],
      profiles: {
        id: { name: 'id', dataType: 'string', distinctCount: 1000, nullPercent: 0, topValues: ['1','2'], isIdentifier: true, isCategorical: false },
        name: { name: 'name', dataType: 'string', distinctCount: 500, nullPercent: 0, topValues: ['A','B'], isIdentifier: false, isCategorical: false },
        value: { name: 'value', dataType: 'number', distinctCount: 900, nullPercent: 0, topValues: ['10','20'], isIdentifier: false, isCategorical: false }
      },
      ...overrides
    };
  };

  it('1. Perfect dataset returns high scores', () => {
    const ds = createMockDataset({});
    // We expect generic key penalty for 'id', let's use 'order_id' instead to avoid penalty
    ds.columns = ['order_id', 'name', 'value'];
    ds.profiles['order_id'] = { name: 'order_id', dataType: 'string', distinctCount: 1000, nullPercent: 0, topValues: ['1','2'], isIdentifier: true, isCategorical: false };
    
    const result = calculateDatasetHealth(ds);
    expect(result.completeness).toBe(100);
    expect(result.consistency).toBe(100);
    expect(result.uniqueness).toBe(100);
    expect(result.keyQuality).toBe(100);
    expect(result.overall).toBe(100);
    expect(result.warnings.length).toBe(0);
  });

  it('2. High null ratio lowers completeness', () => {
    const ds = createMockDataset({});
    ds.profiles['name'].nullPercent = 60; // Average null will be 20% -> completeness 80
    const result = calculateDatasetHealth(ds);
    expect(result.completeness).toBe(80);
  });

  it('3. Duplicate keys lower uniqueness', () => {
    const ds = createMockDataset({});
    ds.profiles['id'].distinctCount = 500; // max distinct ratio = 0.9 (from value)
    const result = calculateDatasetHealth(ds);
    expect(result.uniqueness).toBe(90);
  });

  it('4. Weak key lowers key quality', () => {
    const ds = createMockDataset({});
    ds.profiles['id'].distinctCount = 100;
    ds.profiles['id'].isIdentifier = true; // Keep as identifier so it is emitted
    ds.profiles['value'].distinctCount = 100; // prevent value from being a strong candidate
    const result = calculateDatasetHealth(ds);
    expect(result.keyQuality).toBeLessThan(60);
  });

  it('5. Consistency issues lower consistency', () => {
    const ds = createMockDataset({});
    ds.profiles['name'].dataType = 'unknown';
    const result = calculateDatasetHealth(ds);
    expect(result.consistency).toBe(67); // 1 out of 3 unknown -> 33% unknown -> 67 score
  });

  it('6. Overall score calculation', () => {
    const ds = createMockDataset({});
    ds.profiles['value'].distinctCount = 100; // prevent from being a key
    const result = calculateDatasetHealth(ds);
    // Completeness: 100
    // Consistency: 100
    // Uniqueness: 100 (from 'id')
    // Key Quality: 80 (from 'id' with generic penalty)
    // Overall: 100*0.3 + 100*0.2 + 100*0.25 + 80*0.25 = 30 + 20 + 25 + 20 = 95
    expect(result.overall).toBe(95);
  });

  it('7. High null warning', () => {
    const ds = createMockDataset({});
    ds.profiles['id'].nullPercent = 100;
    ds.profiles['name'].nullPercent = 100;
    ds.profiles['value'].nullPercent = 100;
    const result = calculateDatasetHealth(ds);
    expect(result.warnings.some(w => w.type === 'high_null_ratio')).toBe(true);
  });

  it('8. Duplicate warning', () => {
    const ds = createMockDataset({});
    ds.profiles['id'].distinctCount = 500;
    ds.profiles['value'].distinctCount = 500;
    const result = calculateDatasetHealth(ds);
    expect(result.warnings.some(w => w.type === 'duplicate_keys')).toBe(true);
  });

  it('9. Weak key warning', () => {
    const ds = createMockDataset({});
    ds.profiles['id'].distinctCount = 100;
    ds.profiles['id'].isIdentifier = true; // so it's tested
    ds.profiles['value'].distinctCount = 100; // prevent from taking over
    const result = calculateDatasetHealth(ds);
    expect(result.warnings.some(w => w.type === 'weak_candidate_key')).toBe(true);
  });

  it('10. Deterministic results', () => {
    const ds = createMockDataset({});
    const result1 = calculateDatasetHealth(ds);
    const result2 = calculateDatasetHealth(ds);
    expect(result1.overall).toBe(result2.overall);
  });
});
