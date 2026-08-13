import { describe, it, expect } from 'vitest';
import { detectKeyCandidates } from './business-key-detector';
import { scoreRelationship, discoverCollections } from './relationship-discovery';
import type { DatasetFamily } from './batch-inspection';
import type { ColumnProfile } from './column-profiler';

describe('Relationship Discovery Engine', () => {
  const createMockDataset = (id: string, cols: Record<string, Partial<ColumnProfile>>): DatasetFamily => {
    const columns = Object.keys(cols);
    const profiles: Record<string, ColumnProfile> = {};
    for (const [k, v] of Object.entries(cols)) {
      profiles[k] = {
        name: k,
        dataType: 'string',
        distinctCount: 100,
        nullPercent: 0,
        topValues: [],
        isIdentifier: true,
        isCategorical: false,
        ...v
      };
    }
    return {
      id,
      name: `Dataset ${id}`,
      schemaFingerprint: id,
      files: [],
      totalRows: 100,
      columns,
      profiles
    };
  };

  it('identifies strong SKU/Product relationship (Sales + Inventory)', () => {
    const ds1 = createMockDataset('ds1', {
      'SKU': { topValues: ['A1', 'A2', 'A3', 'A4', 'A5'] }
    });
    const ds2 = createMockDataset('ds2', {
      'Product ID': { topValues: ['A1', 'A2', 'A3', 'B1', 'B2'] }
    });

    const c1 = detectKeyCandidates(ds1, { 'SKU': 'product' });
    const c2 = detectKeyCandidates(ds2, { 'Product ID': 'product' });

    const rel = scoreRelationship(c1[0], ds1.profiles['SKU'], c2[0], ds2.profiles['Product ID']);
    
    expect(rel.score).toBeGreaterThanOrEqual(70);
    expect(rel.evidence.find(e => e.type === 'semantic')?.score).toBe(30);
    
    const { collections } = discoverCollections([ds1, ds2], { 'ds1': c1, 'ds2': c2 });
    expect(collections.length).toBe(1);
    expect(collections[0].relationships[0].score).toBeGreaterThanOrEqual(70);
  });

  it('penalizes generic Mã/Code but saves it if overlap is strong', () => {
    const ds1 = createMockDataset('ds1', {
      'Mã': { topValues: ['X100', 'X200', 'X300', 'X400', 'X500'] }
    });
    const ds2 = createMockDataset('ds2', {
      'Code': { topValues: ['X100', 'X200', 'X300', 'X400', 'X500'] }
    });

    const c1 = detectKeyCandidates(ds1, {});
    const c2 = detectKeyCandidates(ds2, {});

    const rel = scoreRelationship(c1[0], ds1.profiles['Mã'], c2[0], ds2.profiles['Code']);
    
    expect(rel.evidence.find(e => e.type === 'overlap')?.score).toBe(25);
    expect(rel.evidence.find(e => e.type === 'name')?.message).toContain('-5');
    
    expect(rel.score).toBeGreaterThanOrEqual(50);
  });

  it('rejects generic ID without overlap', () => {
    const ds1 = createMockDataset('ds1', {
      'ID': { topValues: ['1', '2', '3', '4', '5'] }
    });
    const ds2 = createMockDataset('ds2', {
      'ID': { topValues: ['UUID-A', 'UUID-B', 'UUID-C', 'UUID-D', 'UUID-E'] }
    });

    const c1 = detectKeyCandidates(ds1, {});
    const c2 = detectKeyCandidates(ds2, {});

    const rel = scoreRelationship(c1[0], ds1.profiles['ID'], c2[0], ds2.profiles['ID']);
    
    expect(rel.evidence.find(e => e.type === 'overlap')?.score).toBe(0);
    expect(rel.evidence.find(e => e.type === 'name')?.message).toContain('-15');
    expect(rel.score).toBeLessThan(50);
  });

  it('keeps unrelated datasets separate', () => {
    const ds1 = createMockDataset('ds1', {
      'Employee ID': { topValues: ['E1', 'E2'] }
    });
    const ds2 = createMockDataset('ds2', {
      'Campaign Name': { topValues: ['Summer', 'Winter'] }
    });

    const c1 = detectKeyCandidates(ds1, {});
    const c2 = detectKeyCandidates(ds2, {});

    const { collections } = discoverCollections([ds1, ds2], { 'ds1': c1, 'ds2': c2 });
    expect(collections.length).toBe(0);
  });

  it('identifies many_to_many relationship producing HIGH risk', () => {
    const ds1 = createMockDataset('ds1', {
      'Tag': { topValues: ['A', 'A', 'B', 'C', 'C'], distinctCount: 3 }
    });
    ds1.totalRows = 100;
    const ds2 = createMockDataset('ds2', {
      'Tag': { topValues: ['A', 'B', 'B', 'C', 'C'], distinctCount: 3 }
    });
    ds2.totalRows = 100;

    const c1 = detectKeyCandidates(ds1, { 'Tag': 'tag' });
    const c2 = detectKeyCandidates(ds2, { 'Tag': 'tag' });
    
    const rel = scoreRelationship(c1[0], ds1.profiles['Tag'], c2[0], ds2.profiles['Tag']);
    
    expect(rel.cardinality).toBe('many_to_many');
    expect(rel.risk).toBe('HIGH');
  });

  it('collection candidate is derived from graph, not direct pair matching', () => {
    const ds1 = createMockDataset('ds1', {
      'Order Key': { topValues: ['O1', 'O2'] }
    });
    const ds2 = createMockDataset('ds2', {
      'Order ID': { topValues: ['O1', 'O2'] }
    });
    const ds3 = createMockDataset('ds3', {
      'Order Num': { topValues: ['O2', 'O3'] }
    });

    const c1 = detectKeyCandidates(ds1, { 'Order Key': 'order' });
    const c2 = detectKeyCandidates(ds2, { 'Order ID': 'order' });
    const c3 = detectKeyCandidates(ds3, { 'Order Num': 'order' });

    const { collections } = discoverCollections([ds1, ds2, ds3], { 'ds1': c1, 'ds2': c2, 'ds3': c3 });
    // All three should be connected in a single component
    expect(collections.length).toBe(1);
    expect(collections[0].datasetIds.length).toBe(3);
  });
});
